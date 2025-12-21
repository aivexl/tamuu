<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, nextTick, provide, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTemplateStore } from '@/stores/template';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';
import AnimatedElement from '@/components/AnimatedElement.vue';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-vue-next';
import { iconPaths } from '@/lib/icon-paths';
import { shapePaths } from '@/lib/shape-paths';
import { getProxiedImageUrl } from "@/lib/image-utils";
import ParticleOverlay from '@/components/effects/ParticleOverlay.vue';
import LottieElement from '@/components/elements/LottieElement.vue';

// Library Imports
import Lenis from 'lenis';

const route = useRoute();
const router = useRouter();
const store = useTemplateStore();

const templateId = computed(() => route.params.id as string);
const isFullscreen = ref(false);
const mainViewport = ref<HTMLElement | null>(null);
const scrollContainer = ref<HTMLElement | null>(null);

const currentTemplate = computed(() => store.templates.find(t => t.id === templateId.value));

const orderedSections = computed((): (any)[] => {
    if (!currentTemplate.value) return [];
    const sectionsObj = currentTemplate.value.sections || {};
    return Object.entries(sectionsObj)
        .map(([key, data]) => ({ key, ...data }))
        .filter(s => s.isVisible !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
});

// Filter out buttons from Section 1 when invitation is opened
const filteredSections = computed((): (any)[] => {
    return orderedSections.value.map((section, index) => {
        // Standardize zIndex sorting: Ascending (last drawn = topmost)
        const sortedElements = [...(section.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        if (index === 0 && isOpened.value) {
            // Remove button elements from Section 1 after "Open" is clicked
            return {
                ...section,
                elements: sortedElements.filter((el: any) => 
                    el.type !== 'button' && el.type !== 'open_invitation_button'
                )
            };
        }
        return {
            ...section,
            elements: sortedElements
        };
    });
});

// State
const isOpened = ref(false); 
const isRevealing = ref(false); // Mid-transition state
const shutterVisible = ref(false);
const openBtnTriggered = ref(false);
const flowMode = ref(false); 

const windowWidth = ref(0);
const windowHeight = ref(0);

const sectionRefs = ref<HTMLElement[]>([]);

const setSectionRef = (el: any, index: number) => {
    if (el) {
        sectionRefs.value[index] = el;
        if (observer) observer.observe(el);
    }
};



const visibleSections = ref<number[]>([]);
// Track which sections have been clicked (for click trigger)
const clickedSections = ref<number[]>([]);

// Helper: Determine if zoom animation should be active based on trigger
const shouldZoom = (section: any, index: number): boolean => {
    const config = section?.zoomConfig;
    if (!config || !config.enabled) {
        return false;
    }

    const trigger = config.trigger || 'scroll';
    let active = false;

    switch (trigger) {
        case 'scroll':
            active = visibleSections.value.includes(index);
            break;
        case 'click':
            active = clickedSections.value.includes(index);
            break;
        case 'open_btn':
            active = isOpened.value;
            break;
        default:
            active = visibleSections.value.includes(index);
    }
    
    return active;
};

// Handler for click-triggered zoom on sections
const handleSectionClick = (index: number, section: any) => {
    console.log(`[Zoom] handleSectionClick called for section ${index}, trigger:`, section.zoomConfig?.trigger);
    if (section.zoomConfig?.enabled && section.zoomConfig?.trigger === 'click') {
        if (!clickedSections.value.includes(index)) {
            clickedSections.value.push(index);
            console.log(`[Zoom] Section ${index} added to clickedSections:`, clickedSections.value);
        }
    }
};

// Helper: Get the appropriate zoom animation class based on config
// FOR MULTI-POINT ANIMATION: Disable keyframe classes and use transition-based approach
const getZoomClass = (section: any, index: number): Record<string, boolean> => {
    if (!shouldZoom(section, index)) {
        return {};
    }
    
    const zoomConfig = section.zoomConfig;
    const points = zoomConfig?.points || [];
    
    // IMPORTANT: For multi-point animation, we DON'T use CSS keyframe classes
    // because they override our transition-based smooth animation.
    // Instead, the animation is handled by getZoomStyle with transform transitions.
    if (points.length > 1) {
        return {}; // No keyframe classes for multi-point mode
    }
    
    // Legacy single-point or no-points mode: use keyframe animations
    const direction = zoomConfig?.direction || 'in';
    const behavior = zoomConfig?.behavior || 'stay';
    
    if (behavior === 'reset') {
        return {
            'animate-section-zoom-in-reset': direction === 'in',
            'animate-section-zoom-out-reset': direction === 'out'
        };
    } else {
        return {
            'animate-section-zoom-in': direction === 'in',
            'animate-section-zoom-out': direction === 'out'
        };
    }
};

// Helper: Get zoom style object with DIRECT transform property for smooth animation
// This is the key function for multi-point smooth transitions
const getZoomStyle = (section: any, sectionIndex: number): Record<string, string> => {
    const zoomConfig = section.zoomConfig;
    
    // Base style
    const style: Record<string, string> = {
        transformOrigin: 'center center'
    };
    
    // If zoom is not active for this section, return identity transform
    if (!shouldZoom(section, sectionIndex)) {
        style.transform = 'scale(1) translate(0%, 0%)';
        return style;
    }
    
    // Get transform values
    const transform = getZoomTransform(section, sectionIndex);
    const points = zoomConfig?.points || [];
    
    // Apply direct transform (this is what enables smooth transitions!)
    style.transform = `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)`;
    
    // Apply transition for multi-point animation
    if (points.length > 1) {
        const transitionDuration = zoomConfig?.transitionDuration || 1000;
        // Use cubic-bezier for ultra-smooth, premium feel
        style.transition = `transform ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    } else {
        // Single point: no transition needed, animation handled by CSS keyframes
        style.transition = 'none';
    }
    
    return style;
};

// Helper: Calculate zoom transform (scale + translate) from box dimensions
// The transform should make the virtual box fill the viewport exactly
const getZoomTransform = (section: any, sectionIndex: number): { scale: number; translateX: number; translateY: number; originX: number; originY: number } => {
    const zoomConfig = section.zoomConfig;
    if (!zoomConfig) {
        return { scale: 1.3, translateX: 0, translateY: 0, originX: 50, originY: 50 };
    }
    
    // Get target region - use animation index for multi-point, fallback to legacy targetRegion
    let targetRegion = null;
    const points = zoomConfig.points || [];
    
    if (points.length > 0) {
        // Use current animation point index (cycles through points)
        const animIdx = currentZoomPointIndex.value[sectionIndex] ?? 0;
        const point = points[Math.min(animIdx, points.length - 1)];
        targetRegion = point?.targetRegion;
    } else if (zoomConfig.targetRegion) {
        // Fallback to legacy targetRegion
        targetRegion = zoomConfig.targetRegion;
    }
    
    if (!targetRegion) {
        return { 
            scale: zoomConfig.scale || 1.3, 
            translateX: 0, 
            translateY: 0,
            originX: 50,
            originY: 50
        };
    }
    
    // Box dimensions are in percentages (e.g., width: 50 means 50% of canvas)
    const boxWidthPercent = targetRegion.width || 50;
    const boxHeightPercent = targetRegion.height || 50;
    const boxCenterX = targetRegion.x ?? 50;
    const boxCenterY = targetRegion.y ?? 50;
    
    // Calculate scale: to make a 50% box fill 100%, we need 2x scale
    const scaleByWidth = 100 / boxWidthPercent;
    const scaleByHeight = 100 / boxHeightPercent;
    const calculatedScale = Math.min(scaleByWidth, scaleByHeight);
    
    // Clamp the scale to reasonable values (1.1x to 5x)
    const scale = Math.max(1.1, Math.min(5, calculatedScale));
    
    // Calculate translate to center the box after scaling
    // Since we use transform: scale(S) translate(T), the translation T is applied
    // in the scaled coordinate system. To move a point P that has been scaled around 50%
    // back to the center (50%), we need to translate by (50 - P).
    // Screen position P' = 50 + (P - 50) * S. 
    // We want P' + T_screen = 50. 
    // In scaled space, T_screen = T_local * S.
    // 50 + (P - 50) * S + T_local * S = 50
    // (P - 50) * S + T_local * S = 0
    // T_local = 50 - P
    const translateX = 50 - boxCenterX;
    const translateY = 50 - boxCenterY;
    
    return { scale, translateX, translateY, originX: 50, originY: 50 };
};

// ========================================
// MULTI-POINT ZOOM ANIMATION ENGINE
// ========================================

// Current zoom point index per section (for sequential animation)
const currentZoomPointIndex = ref<Record<number, number>>({});

// Active interval timers per section
const zoomAnimationTimers = ref<Record<number, number>>({});

// Start sequential zoom animation for a section when it becomes visible
const startZoomAnimation = (sectionIndex: number, section: any) => {
    const zoomConfig = section.zoomConfig;
    if (!zoomConfig?.enabled) return;
    
    const points = zoomConfig.points || [];
    if (points.length <= 1) {
        // Single point or legacy - no cycling needed
        currentZoomPointIndex.value[sectionIndex] = 0;
        return;
    }
    
    // Clear any existing timer
    if (zoomAnimationTimers.value[sectionIndex]) {
        clearTimeout(zoomAnimationTimers.value[sectionIndex]);
    }

    let currentIndex = 0;
    currentZoomPointIndex.value[sectionIndex] = currentIndex;
    
    const loop = !!zoomConfig.loop; // Default to false
    
    const runNext = () => {
        const currentPoint = points[currentIndex];
        // Time to stay at THIS point + transition duration
        const stayDuration = currentPoint?.duration || zoomConfig.duration || 3000;
        const transitionDuration = zoomConfig.transitionDuration || 1000;
        const totalPointTime = stayDuration + transitionDuration;

        console.log(`[Zoom] Section ${sectionIndex} at point ${currentIndex}, staying for ${stayDuration}ms + ${transitionDuration}ms transition`);

        zoomAnimationTimers.value[sectionIndex] = setTimeout(() => {
            const nextIdx = currentIndex + 1;
            
            if (nextIdx >= points.length) {
                if (loop) {
                    currentIndex = 0;
                    currentZoomPointIndex.value[sectionIndex] = currentIndex;
                    console.log(`[Zoom] Section ${sectionIndex}: looping back to point 0`);
                    runNext();
                } else {
                    delete zoomAnimationTimers.value[sectionIndex];
                    console.log(`[Zoom] Section ${sectionIndex}: animation complete`);
                }
            } else {
                currentIndex = nextIdx;
                currentZoomPointIndex.value[sectionIndex] = currentIndex;
                console.log(`[Zoom] Section ${sectionIndex}: moved to point ${currentIndex}`);
                runNext();
            }
        }, totalPointTime) as any;
    };

    runNext();
};

// Stop zoom animation when section is no longer visible
const stopZoomAnimation = (sectionIndex: number) => {
    if (zoomAnimationTimers.value[sectionIndex]) {
        clearTimeout(zoomAnimationTimers.value[sectionIndex]);
        delete zoomAnimationTimers.value[sectionIndex];
        console.log(`[Zoom] Stopped animation for section ${sectionIndex}`);
    }
};


let observer: IntersectionObserver | null = null;
let lenis: Lenis | null = null;

const updateDimensions = () => {
    if (typeof window !== 'undefined') {
        windowWidth.value = window.innerWidth;
        windowHeight.value = window.innerHeight;
    }
};

// Mouse position for parallax (normalized -0.5 to 0.5)
const mousePosition = reactive({ x: 0, y: 0 });
provide('mousePosition', mousePosition);

const handleMouseMove = (event: MouseEvent) => {
    // Normalize to -0.5 to 0.5 range
    mousePosition.x = (event.clientX / windowWidth.value) - 0.5;
    mousePosition.y = (event.clientY / windowHeight.value) - 0.5;
};

onMounted(async () => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    if (templateId.value && !currentTemplate.value) {
        await store.fetchTemplate(templateId.value);
    }
    
    // Observer for scroll-based animations
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const index = parseInt((entry.target as HTMLElement).dataset.index || '-1');
            if (entry.isIntersecting && index !== -1) {
                // Only add if not already present (for reactivity)
                if (!visibleSections.value.includes(index)) {
                    visibleSections.value.push(index);
                    
                    // Start multi-point zoom animation for this section
                    const section = filteredSections.value[index];
                    if (section) {
                        startZoomAnimation(index, section);
                    }
                }
            }
        });
    }, { threshold: 0.1, root: scrollContainer.value });
    
    // Auto-trigger Section 0 visibility and zoom animation (it's already in view on mount)
    setTimeout(() => {
        if (!visibleSections.value.includes(0)) {
            visibleSections.value.push(0);
        }
        // Start zoom animation for section 0
        const section0 = filteredSections.value[0];
        if (section0) {
            startZoomAnimation(0, section0);
        }
    }, 100);

    // Initialize Lenis
    if (scrollContainer.value) {
        lenis = new Lenis({
            wrapper: scrollContainer.value,
            content: scrollContainer.value.firstElementChild as HTMLElement,
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            touchMultiplier: 2,
        });

        // Lock scroll initially
        lenis.stop();

        const scrollLoop = (time: number) => {
            lenis?.raf(time);
            requestAnimationFrame(scrollLoop);
        };
        requestAnimationFrame(scrollLoop);
    }

    // Add mouse move listener for parallax
    window.addEventListener('mousemove', handleMouseMove);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
    if (observer) observer.disconnect();
    if (lenis) lenis.destroy();
    window.removeEventListener('resize', updateDimensions);
    window.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    
    // Clean up all zoom animation timers
    Object.keys(zoomAnimationTimers.value).forEach(key => {
        clearTimeout(zoomAnimationTimers.value[parseInt(key)]);
    });
    zoomAnimationTimers.value = {};
});

/**
 * SIMPLE REVEAL - No animations, just switch to Flow Mode
 */
const handleOpenInvitation = async () => {
    if (openBtnTriggered.value) return;
    openBtnTriggered.value = true;
    
    // Step 1: Trigger any elements in Section 1 set to 'Open' animation
    isOpened.value = true; 
    
    // Step 1.5: Add Section 1 to visibleSections to trigger its scroll-based zoom
    if (!visibleSections.value.includes(1)) {
        visibleSections.value.push(1);
    } 
    
    // Step 2: Brief elegant delay (let the button click/S1 anims breathe)
    setTimeout(() => {
        flowMode.value = true;
        isRevealing.value = false;
        
        nextTick(() => {
            if (scrollContainer.value) {
                if (lenis) lenis.stop();
                
                // Land exactly at the top of Section 2
                // Scroll offset must account for the CSS scale transform
                const scrollOffset = coverHeightComputed.value * scaleFactor.value;
                scrollContainer.value.scrollTop = scrollOffset;
                
                // Setup scroll listener to detect visible sections
                const handleScroll = () => {
                    if (!scrollContainer.value) return;
                    const containerRect = scrollContainer.value.getBoundingClientRect();
                    const containerTop = containerRect.top;
                    const containerBottom = containerRect.bottom;
                    
                    sectionRefs.value.forEach((sectionEl, index) => {
                        if (!sectionEl) return;
                        const rect = sectionEl.getBoundingClientRect();
                        // Check if section is at least 10% visible in the container
                        const sectionTop = rect.top;
                        const sectionBottom = rect.bottom;
                        const sectionHeight = rect.height;
                        const visibleHeight = Math.min(sectionBottom, containerBottom) - Math.max(sectionTop, containerTop);
                        const isVisible = visibleHeight >= sectionHeight * 0.1;
                        
                        if (isVisible && !visibleSections.value.includes(index)) {
                            visibleSections.value.push(index);
                        }
                    });
                };
                
                // Add scroll listener
                scrollContainer.value.addEventListener('scroll', handleScroll);
                
                // Run once to catch initially visible sections
                setTimeout(handleScroll, 100);
                
                setTimeout(() => {
                    if (lenis) {
                        lenis.resize();
                        lenis.start();
                    }
                }, 50);
            }
        });
    }, 400); // Quick transition for a "Direct" feel
};

// Dimensions & Scaling


const scaleFactor = computed(() => {
    if (!windowWidth.value || !windowHeight.value) return 1;
    
    if (isPortrait.value) {
        // In portrait, we always scale to fit the width perfectly (edge-to-edge)
        return windowWidth.value / CANVAS_WIDTH;
    }
    
    // In landscape, we scale to fit the height
    return windowHeight.value / CANVAS_HEIGHT;
});

const isPortrait = computed(() => {
    return windowHeight.value >= windowWidth.value;
});

const coverHeightComputed = computed(() => {
    if (typeof scaleFactor.value !== 'number') return CANVAS_HEIGHT; 
    // Height needed to fill the viewport at current scale
    return windowHeight.value / scaleFactor.value;
});

// Total scaled height of all sections
const scaledTotalHeight = computed(() => {
    if (!orderedSections.value.length) return 0;
    // First section uses coverHeightComputed in portrait, CANVAS_HEIGHT in landscape
    const firstSectionHeight = isPortrait.value ? coverHeightComputed.value : CANVAS_HEIGHT;
    const totalContentHeight = firstSectionHeight + (orderedSections.value.length - 1) * CANVAS_HEIGHT;
    return totalContentHeight * scaleFactor.value;
});


const getElementStyle = (el: any, sectionIndex: number) => {
    const baseStyle: any = {
        left: `${el.position.x}px`,
        top: `${el.position.y}px`,
        width: `${el.size.width}px`,
        height: `${el.size.height}px`,
        zIndex: el.zIndex || 1,
        position: 'absolute',
        transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})`,
        opacity: el.opacity ?? 1
    };

    if (sectionIndex === 0 && windowHeight.value > windowWidth.value) {
         const currentCoverHeight = coverHeightComputed.value;
         if (currentCoverHeight > CANVAS_HEIGHT) {
              const extraHeight = currentCoverHeight - CANVAS_HEIGHT;
              const elementHeight = Number(el.size?.height || 0);
              const maxTop = CANVAS_HEIGHT - elementHeight;
              let progress = maxTop > 0 ? el.position.y / maxTop : 0;
              progress = Math.max(0, Math.min(1, progress));
              baseStyle.top = `${el.position.y + (extraHeight * progress)}px`;
         }
    }
    return baseStyle;
};

const getTextStyle = (el: any) => {
    const baseStyle: any = {
        fontSize: el.textStyle?.fontSize+'px', 
        fontFamily: el.textStyle?.fontFamily, 
        color: el.textStyle?.color, 
        textAlign: el.textStyle?.textAlign,
        display: 'flex',
        alignItems: 'center',
        justifyContent: el.textStyle?.textAlign === 'center' ? 'center' : el.textStyle?.textAlign === 'right' ? 'flex-end' : 'flex-start',
        width: '100%',
        height: '100%',
        opacity: el.opacity ?? 1
    };
    return baseStyle;
};

const getButtonStyle = (el: any) => {
    const config = el.openInvitationConfig || {};
    const base: any = {
        backgroundColor: config.buttonColor || '#000000',
        color: config.textColor || '#ffffff',
        fontSize: `${config.fontSize || 16}px`,
        fontFamily: config.fontFamily || 'Inter',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: 'none',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        opacity: el.opacity ?? 1
    };

    // Style Specifics
    const style = config.buttonStyle || 'classic';
    const shape = config.buttonShape || 'pill';

    // Shape Overrides
    if (shape === 'pill' || shape === 'stadium') {
        base.borderRadius = '9999px';
    } else if (shape === 'rounded') {
        base.borderRadius = '12px';
    } else {
        base.borderRadius = '0px';
    }

    // Style Overrides
    switch (style) {
        case 'classic':
            // Classic in editor uses buttonColor with white border
            base.backgroundColor = config.buttonColor || '#ffffff';
            base.border = '1px solid #e2e8f0';
            break;
        case 'outline':
            base.backgroundColor = 'transparent';
            base.border = `2px solid ${config.buttonColor || '#000000'}`;
            base.color = config.buttonColor || '#000000';
            break;
        case 'minimal':
            base.backgroundColor = 'transparent';
            base.color = config.buttonColor || '#000000';
            break;
        case 'glass':
            base.backgroundColor = 'rgba(255,255,255,0.2)';
            base.backdropFilter = 'blur(10px)';
            base.border = '1px solid rgba(255,255,255,0.3)';
            break;
        case 'bold':
            base.boxShadow = '6px 6px 0px 0px #000000';
            base.border = '2px solid #000000';
            break;
        case 'luxury':
            base.border = `2px solid #ffd700`;
            base.boxShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
            break;
        case 'neon':
            base.boxShadow = `0 0 20px ${config.buttonColor || '#00ff9d'}`;
            base.border = `2px solid ${config.buttonColor || '#00ff9d'}`;
            break;
        case 'brutalist':
            base.boxShadow = '8px 8px 0px 0px #000000';
            base.border = '3px solid #000000';
            break;
    }

    return base;
};

const viewportBackgroundStyle = computed(() => {
    // Portrait: use section 1 background (top of invitation)
    // Landscape: use neutral dark background so invitation stands out
    if (!isPortrait.value) {
        return { backgroundColor: '#1a1a1a' }; // Dark neutral for landscape
    }
    
    const section = filteredSections.value[0];
    if (!section) return { backgroundColor: '#ffffff' };
    
    const style: any = {
        backgroundColor: section.backgroundColor || '#ffffff'
    };

    if (section.backgroundUrl) {
        style.backgroundImage = `url(${getProxiedImageUrl(section.backgroundUrl)})`;
        style.backgroundSize = 'cover';
        style.backgroundPosition = 'center';
    }

    return style;
});


const toggleFullscreen = () => {
    if (!mainViewport.value) return;
    if (!document.fullscreenElement) {
        mainViewport.value.requestFullscreen().catch(e => console.error(e));
    } else {
        document.exitFullscreen().catch(e => console.error(e));
    }
};

const handleFullscreenChange = () => { 
    isFullscreen.value = !!document.fullscreenElement; 
    nextTick(() => {
        updateDimensions();
        if (lenis) lenis.resize();
    });
};
const goBack = () => router.push(`/editor/${templateId.value}`);
</script>

<template>
    <div ref="mainViewport" class="h-[100dvh] w-screen flex flex-col items-center overflow-hidden transition-colors duration-500" :style="viewportBackgroundStyle">
        
        <!-- MAIN SCROLL ENGINE -->
        <div 
            ref="scrollContainer" 
            class="scroll-container" 
            :class="flowMode ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'" 
            :style="{
                height: !flowMode ? '100%' : isPortrait ? '100%' : `${scaledTotalHeight}px`,
                maxHeight: !isPortrait && flowMode ? `${scaledTotalHeight}px` : 'none',
                width: '100%',
                display: 'flex',
                justifyContent: isPortrait ? 'flex-start' : 'center',
                alignItems: isPortrait ? 'flex-start' : 'flex-start'
            }"
        >
            <!-- Wrapper to limit scroll height exactly to content -->
            <div :style="{ height: flowMode ? `${scaledTotalHeight}px` : '100%', width: isPortrait ? '100%' : 'auto' }">
                <div 
                    class="invitation-parent relative" 
                    :style="{ 
                        width: `${CANVAS_WIDTH}px`, 
                        height: flowMode ? 'auto' : `${coverHeightComputed}px`,
                        transform: `scale(${scaleFactor})`, 
                        transformOrigin: isPortrait ? 'top left' : 'top center',
                        marginLeft: isPortrait ? '0' : 'auto',
                        marginRight: isPortrait ? '0' : 'auto'
                    }"
                >

                <!-- Controls -->
                <div v-if="!isFullscreen" class="absolute top-6 left-0 w-full px-6 flex justify-between z-[500] pointer-events-none" :style="{ transform: `scale(${1/scaleFactor})`, transformOrigin: 'top center' }">
                    <button class="p-4 bg-black/50 text-white rounded-full backdrop-blur-3xl pointer-events-auto border border-white/20 shadow-2xl" @click="goBack"><ArrowLeft class="w-7 h-7" /></button>
                    <button class="p-4 bg-black/50 text-white rounded-full backdrop-blur-3xl pointer-events-auto border border-white/20 shadow-2xl" @click="toggleFullscreen"><Maximize2 class="w-7 h-7" /></button>
                </div>

                <!-- 
                    THE UNIFIED ATOMIC CONTAINER
                -->
                <div class="relative w-full overflow-hidden" :style="{ width: `${CANVAS_WIDTH}px`, height: flowMode ? 'auto' : `${coverHeightComputed}px` }">
                    
                    <!-- NATURAL FLOW MODE (Active after Reveal) -->
                    <div v-if="flowMode" class="flex flex-col w-full relative h-auto">
                        <div 
                            v-for="(section, index) in filteredSections" 
                            :key="section.key"
                            :ref="(el) => setSectionRef(el, index)" :data-index="index"
                            class="relative w-full flex-shrink-0 page-section overflow-hidden"
                            :style="{ 
                                height: index === 0 ? `${coverHeightComputed}px` : `${CANVAS_HEIGHT}px`,
                                backgroundColor: section.backgroundColor || 'transparent'
                            }"
                            @click="handleSectionClick(index, section)"
                        >
                            <!-- ZOOM CONTAINER: Wraps ALL section content for unified zoom effect -->
                            <div
                                class="absolute inset-0 w-full h-full"
                                :class="getZoomClass(section, index)"
                                :style="getZoomStyle(section, index)"
                            >
                                <!-- Background Image -->
                                <div
                                    v-if="section.backgroundUrl"
                                    class="absolute inset-0 bg-cover bg-center"
                                    :class="{ 'animate-ken-burns': section.kenBurnsEnabled && !section.zoomConfig?.enabled }"
                                    :style="{ backgroundImage: `url(${getProxiedImageUrl(section.backgroundUrl)})` }"
                                ></div>

                                <!-- Overlay -->
                                <div v-if="section.overlayOpacity && section.overlayOpacity > 0" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                                
                                <!-- Particle Overlay -->
                                <ParticleOverlay 
                                    v-if="section.particleType && section.particleType !== 'none'" 
                                    :type="section.particleType" 
                                />

                                <!-- Elements Container -->
                                <div class="relative w-full h-full">
                                    <template v-for="el in section.elements" :key="el.id">
                                    <AnimatedElement 
                                        :animation="el.animation" 
                                        :loop-animation="el.loopAnimation" 
                                        :delay="el.animationDelay" 
                                        :duration="el.animationDuration" 
                                         :style="getElementStyle(el, index)"
                                         :immediate="index === 0"
                                         :trigger-mode="el.animationTrigger || 'scroll'"
                                         :force-trigger="el.animationTrigger === 'open_btn' ? isOpened : (index === 0)"
                                        :element-id="el.id"
                                        :image-url="el.imageUrl"
                                        :motion-path-config="el.motionPathConfig"
                                    >
                                        <img v-if="el.type === 'image' || el.type === 'gif'" :src="getProxiedImageUrl(el.imageUrl)" class="w-full h-full pointer-events-none select-none" :style="{ objectFit: el.objectFit || 'contain', background: 'transparent' }" />
                                        <div v-else-if="el.type === 'text'" :style="getTextStyle(el)" class="w-full h-full">{{ el.content }}</div>
                                        <button 
                                            v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" 
                                            :style="getButtonStyle(el)" 
                                            class="w-full h-full hover:scale-105 active:scale-95 transition-all shadow-xl font-bold" 
                                            :class="{ 'opacity-0 pointer-events-none': isOpened }"
                                            @click="handleOpenInvitation()"
                                        >
                                            {{ el.openInvitationConfig?.buttonText || el.content || 'Buka Undangan' }}
                                        </button>
                                        <div v-else-if="el.type === 'icon'" :style="{ color: el.iconStyle?.iconColor }" class="w-full h-full flex items-center justify-center opacity-100">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" /></svg>
                                        </div>
                                        <div v-else-if="el.type === 'shape' && el.shapeConfig" class="w-full h-full">
                                            <svg v-if="['rectangle', 'square', 'rounded-rectangle'].includes(el.shapeConfig.shapeType)" width="100%" height="100%" :viewBox="`0 0 ${el.size.width} ${el.size.height}`" preserveAspectRatio="none">
                                               <rect x="0" y="0" :width="el.size.width" :height="el.size.height" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" :rx="el.shapeConfig.shapeType === 'rounded-rectangle' ? (el.shapeConfig.cornerRadius || 20) : 0" />
                                            </svg>
                                            <svg v-else-if="el.shapeConfig.shapeType === 'circle'" width="100%" height="100%" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                            <svg v-else-if="el.shapeConfig.shapeType === 'ellipse'" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="48" ry="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                            <svg v-else width="100%" height="100%" viewBox="0 0 100 100" :preserveAspectRatio="['line', 'zigzag', 'wave'].includes(el.shapeConfig.shapeType) ? 'none' : 'xMidYMid meet'">
                                               <path :d="shapePaths[el.shapeConfig.shapeType] || el.shapeConfig.pathData || ''" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </div>
                                        <div v-else-if="el.type === 'countdown'" class="w-full h-full flex justify-center items-center gap-2">
                                            <div v-for="unit in ['Days', 'Hours', 'Min', 'Sec']" :key="unit" class="flex flex-col items-center">
                                                <div class="text-2xl font-bold" :style="{ color: el.countdownConfig?.digitColor || '#000' }">00</div>
                                                <div class="text-[10px] uppercase" :style="{ color: el.countdownConfig?.labelColor || '#666' }">{{ unit }}</div>
                                            </div>
                                        </div>
                                        <div v-else-if="el.type === 'rsvp_form' || el.type === 'rsvp-form'" class="w-full h-full p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl flex flex-col gap-2 pointer-events-none">
                                            <div class="h-8 bg-black/5 rounded w-full"></div>
                                            <div class="h-10 bg-black rounded w-full mt-2"></div>
                                        </div>
                                        <div v-else-if="el.type === 'guest_wishes'" class="w-full h-full p-4 bg-white/30 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg h-full overflow-hidden flex flex-col gap-3">
                                            <div v-for="i in 2" :key="i" class="flex flex-col gap-1"><div class="h-3 bg-black/10 rounded w-1/3"></div><div class="h-4 bg-black/5 rounded w-full"></div></div>
                                        </div>
                                        <LottieElement
                                            v-else-if="el.type === 'lottie'"
                                            :animation-url="el.lottieConfig?.url || ''"
                                            :direction="el.lottieConfig?.direction || 'left'"
                                            :speed="el.lottieConfig?.speed || 1"
                                            :loop="el.lottieConfig?.loop !== false"
                                            :auto-play="el.lottieConfig?.autoplay !== false"
                                            class="w-full h-full"
                                        />
                                    </AnimatedElement>
                                </template>
                            </div>
                            </div> <!-- Close Zoom Container -->
                        </div>
                    </div>

                    <!-- ATOMIC STACK MODE (Initial Reveal Physics) -->
                    <div v-else class="relative w-full h-full overflow-hidden">
                        <!-- BOTTOM LAYER: Section 2 (visible behind Section 1) -->
                        <div 
                            v-if="filteredSections[1]" 
                            class="absolute inset-0 z-[1] overflow-hidden" 
                            :style="{ backgroundColor: filteredSections[1].backgroundColor || '#ffffff' }"
                            @click="handleSectionClick(1, filteredSections[1])"
                        >
                            <!-- ZOOM CONTAINER: Wraps ALL section content for unified zoom effect -->
                            <div
                                class="absolute inset-0 w-full h-full"
                                :class="getZoomClass(filteredSections[1], 1)"
                                :style="getZoomStyle(filteredSections[1], 1)"
                            >
                                <!-- Background Image -->
                                <div
                                    v-if="filteredSections[1].backgroundUrl"
                                    class="absolute inset-0 bg-cover bg-center"
                                    :class="{ 'animate-ken-burns': filteredSections[1].kenBurnsEnabled && !filteredSections[1].zoomConfig?.enabled }"
                                    :style="{ backgroundImage: `url(${getProxiedImageUrl(filteredSections[1].backgroundUrl)})` }"
                                ></div>

                                <!-- Overlay -->
                                <div v-if="filteredSections[1].overlayOpacity && filteredSections[1].overlayOpacity > 0" class="absolute inset-0 bg-black" :style="{ opacity: filteredSections[1].overlayOpacity }" />
                                
                                <!-- Particle Overlay -->
                                <ParticleOverlay 
                                    v-if="filteredSections[1].particleType && filteredSections[1].particleType !== 'none'" 
                                    :type="filteredSections[1].particleType" 
                                />

                                <!-- Elements Container -->
                                <div class="relative w-full h-full">
                                    <template v-for="el in filteredSections[1].elements" :key="el.id">
                                        <!-- Elements in Atomic Mode use manual trigger, animate when isOpened -->
                                        <AnimatedElement 
                                            :animation="el.animation" 
                                            :loop-animation="el.loopAnimation" 
                                            :delay="el.animationDelay" 
                                             :duration="el.animationDuration" 
                                             :style="getElementStyle(el, 1)"
                                             :trigger-mode="el.animationTrigger || 'scroll'" 
                                             :force-trigger="isOpened"
                                            :element-id="el.id"
                                            :image-url="el.imageUrl"
                                            :motion-path-config="el.motionPathConfig"
                                            :parallax-factor="el.parallaxFactor"
                                        >
                                            <img v-if="el.type === 'image' || el.type === 'gif'" :src="getProxiedImageUrl(el.imageUrl)" class="w-full h-full pointer-events-none select-none" :style="{ objectFit: el.objectFit || 'contain', background: 'transparent' }" />
                                            <div v-else-if="el.type === 'text'" :style="getTextStyle(el)" class="w-full h-full">{{ el.content }}</div>
                                            <div v-else-if="el.type === 'icon'" :style="{ color: el.iconStyle?.iconColor }" class="w-full h-full flex items-center justify-center">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" /></svg>
                                            </div>
                                            <div v-else-if="el.type === 'shape' && el.shapeConfig" class="w-full h-full">
                                                <svg v-if="['rectangle', 'square', 'rounded-rectangle'].includes(el.shapeConfig.shapeType)" width="100%" height="100%" :viewBox="`0 0 ${el.size.width} ${el.size.height}`" preserveAspectRatio="none">
                                                   <rect x="0" y="0" :width="el.size.width" :height="el.size.height" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" :rx="el.shapeConfig.shapeType === 'rounded-rectangle' ? (el.shapeConfig.cornerRadius || 20) : 0" />
                                                </svg>
                                                <svg v-else-if="el.shapeConfig.shapeType === 'circle'" width="100%" height="100%" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                                <svg v-else-if="el.shapeConfig.shapeType === 'ellipse'" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="48" ry="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                                <svg v-else width="100%" height="100%" viewBox="0 0 100 100" :preserveAspectRatio="['line', 'zigzag', 'wave'].includes(el.shapeConfig.shapeType) ? 'none' : 'xMidYMid meet'">
                                                   <path :d="shapePaths[el.shapeConfig.shapeType] || el.shapeConfig.pathData || ''" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" stroke-linecap="round" stroke-linejoin="round" />
                                                </svg>
                                            </div>
                                            <div v-else-if="el.type === 'countdown'" class="w-full h-full flex justify-center items-center gap-2">
                                                <div v-for="unit in ['Days', 'Hours', 'Min', 'Sec']" :key="unit" class="flex flex-col items-center">
                                                    <div class="text-2xl font-bold" :style="{ color: el.countdownConfig?.digitColor || '#000' }">00</div>
                                                    <div class="text-[10px] uppercase" :style="{ color: el.countdownConfig?.labelColor || '#666' }">{{ unit }}</div>
                                                </div>
                                            </div>
                                            <button v-else-if="(el.type === 'button' || el.type === 'open_invitation_button') && !isOpened" :style="getButtonStyle(el)" class="w-full h-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all" @click="handleOpenInvitation()">
                                                {{ el.openInvitationConfig?.buttonText || el.content || 'Buka Undangan' }}
                                            </button>
                                            <div v-else-if="el.type === 'rsvp_form' || el.type === 'rsvp-form'" class="w-full h-full p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl flex flex-col gap-2 pointer-events-none">
                                                <div class="h-8 bg-black/5 rounded w-full"></div>
                                                <div class="h-10 bg-black rounded w-full mt-2"></div>
                                            </div>
                                            <div v-else-if="el.type === 'guest_wishes'" class="w-full h-full p-4 bg-white/30 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg h-full overflow-hidden flex flex-col gap-3">
                                                <div v-for="i in 2" :key="i" class="flex flex-col gap-1"><div class="h-3 bg-black/10 rounded w-1/3"></div><div class="h-4 bg-black/5 rounded w-full"></div></div>
                                            </div>
                                            <LottieElement
                                                v-else-if="el.type === 'lottie'"
                                                :animation-url="el.lottieConfig?.url || ''"
                                                :direction="el.lottieConfig?.direction || 'left'"
                                                :speed="el.lottieConfig?.speed || 1"
                                                :loop="el.lottieConfig?.loop !== false"
                                                :auto-play="el.lottieConfig?.autoplay !== false"
                                                class="w-full h-full"
                                            />
                                        </AnimatedElement>
                                    </template>
                                </div>
                            </div> <!-- Close Zoom Container -->
                        </div>

                        <!-- TOP LAYER: Section 1 (Cover) -->
                        <div 
                            v-if="filteredSections[0]" 
                            class="absolute inset-0 z-[2] atomic-cover-layer overflow-hidden" 
                            :style="{ backgroundColor: filteredSections[0].backgroundColor || '#cccccc' }"
                            @click="handleSectionClick(0, filteredSections[0])"
                        >
                            <!-- ZOOM CONTAINER: Wraps ALL section content for unified zoom effect -->
                            <div
                                class="absolute inset-0 w-full h-full"
                                :class="getZoomClass(filteredSections[0], 0)"
                                :style="getZoomStyle(filteredSections[0], 0)"
                            >
                                <!-- Background Image -->
                                <div
                                    v-if="filteredSections[0].backgroundUrl"
                                    class="absolute inset-0 bg-cover bg-center"
                                    :class="{ 'animate-ken-burns': filteredSections[0].kenBurnsEnabled && !filteredSections[0].zoomConfig?.enabled }"
                                    :style="{ backgroundImage: `url(${getProxiedImageUrl(filteredSections[0].backgroundUrl)})` }"
                                ></div>

                                <!-- Overlay -->
                                <div v-if="filteredSections[0].overlayOpacity && filteredSections[0].overlayOpacity > 0" class="absolute inset-0 bg-black" :style="{ opacity: filteredSections[0].overlayOpacity }" />
                                
                                <!-- Particle Overlay -->
                                <ParticleOverlay 
                                    v-if="filteredSections[0].particleType && filteredSections[0].particleType !== 'none'" 
                                    :type="filteredSections[0].particleType" 
                                />

                                <!-- Elements Container -->
                                <div class="relative w-full h-full">
                                    <template v-for="el in filteredSections[0].elements" :key="el.id">
                                        <AnimatedElement 
                                            :animation="el.animation" 
                                            :loop-animation="el.loopAnimation" 
                                            :delay="el.animationDelay" 
                                            :duration="el.animationDuration" 
                                             :style="getElementStyle(el, 0)"
                                             :immediate="el.animationTrigger !== 'open_btn' && el.animationTrigger !== 'click'" 
                                             :trigger-mode="el.animationTrigger || 'scroll'"
                                             :force-trigger="el.animationTrigger === 'open_btn' ? isOpened : true"
                                            :element-id="el.id"
                                            :image-url="el.imageUrl"
                                            :motion-path-config="el.motionPathConfig"
                                            :parallax-factor="el.parallaxFactor"
                                        >
                                            <img v-if="el.type === 'image' || el.type === 'gif'" :src="getProxiedImageUrl(el.imageUrl)" class="w-full h-full pointer-events-none select-none" :style="{ objectFit: el.objectFit || 'contain', background: 'transparent' }" />
                                            <div v-else-if="el.type === 'text'" :style="getTextStyle(el)" class="w-full h-full">{{ el.content }}</div>
                                            <button 
                                                v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" 
                                                :style="getButtonStyle(el)" 
                                                class="w-full h-full hover:scale-105 active:scale-95 transition-all shadow-xl font-bold" 
                                                :class="{ 'opacity-0 pointer-events-none': isOpened }"
                                                @click="handleOpenInvitation()"
                                            >
                                                {{ el.openInvitationConfig?.buttonText || el.content || 'Buka Undangan' }}
                                            </button>
                                            <div v-else-if="el.type === 'icon'" :style="{ color: el.iconStyle?.iconColor }" class="w-full h-full flex items-center justify-center">
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" /></svg>
                                            </div>
                                            <div v-else-if="el.type === 'shape' && el.shapeConfig" class="w-full h-full">
                                                <svg v-if="['rectangle', 'square', 'rounded-rectangle'].includes(el.shapeConfig.shapeType)" width="100%" height="100%" :viewBox="`0 0 ${el.size.width} ${el.size.height}`" preserveAspectRatio="none">
                                                   <rect x="0" y="0" :width="el.size.width" :height="el.size.height" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" :rx="el.shapeConfig.shapeType === 'rounded-rectangle' ? (el.shapeConfig.cornerRadius || 20) : 0" />
                                                </svg>
                                                <svg v-else-if="el.shapeConfig.shapeType === 'circle'" width="100%" height="100%" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                                <svg v-else-if="el.shapeConfig.shapeType === 'ellipse'" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="48" ry="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                                <svg v-else width="100%" height="100%" viewBox="0 0 100 100" :preserveAspectRatio="['line', 'zigzag', 'wave'].includes(el.shapeConfig.shapeType) ? 'none' : 'xMidYMid meet'">
                                                   <path :d="shapePaths[el.shapeConfig.shapeType] || el.shapeConfig.pathData || ''" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" stroke-linecap="round" stroke-linejoin="round" />
                                                </svg>
                                            </div>
                                            <LottieElement
                                                v-else-if="el.type === 'lottie'"
                                                :animation-url="el.lottieConfig?.url || ''"
                                                :direction="el.lottieConfig?.direction || 'left'"
                                                :speed="el.lottieConfig?.speed || 1"
                                                :loop="el.lottieConfig?.loop !== false"
                                                :auto-play="el.lottieConfig?.autoplay !== false"
                                                class="w-full h-full"
                                            />
                                        </AnimatedElement>
                                    </template>
                                </div>
                            </div> <!-- Close Zoom Container -->
                        </div>
                    </div>

                    <!-- MIRROR SHUTTERS -->
                    <div v-if="shutterVisible" class="absolute inset-0 z-[100] flex overflow-hidden pointer-events-none">
                        <div class="mirror-shutter-left w-1/2 h-full bg-white/20 backdrop-blur-md"></div>
                        <div class="mirror-shutter-right w-1/2 h-full bg-white/20 backdrop-blur-md"></div>
                    </div>
                </div>
            </div>
            </div>
        </div>


        <button v-if="isFullscreen" class="fixed top-8 right-8 z-[600] p-4 bg-black/50 text-white rounded-full border border-white/20 shadow-2xl hover:bg-black/80 transition-all font-bold" @click="toggleFullscreen"><Minimize2 class="w-7 h-7" /></button>
    </div>
</template>

<style scoped>
.scroll-container::-webkit-scrollbar { width: 0; height: 0; }
.scroll-container { scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; }
.page-section { backface-visibility: hidden; transform: translateZ(0); }
.will-change-transform { will-change: transform; }
</style>

<style>
/* Ken Burns Effect */
.animate-ken-burns {
    animation: ken-burns 20s ease-in-out infinite alternate;
}

@keyframes ken-burns {
    0% { transform: scale(1); }
    100% { transform: scale(1.15); }
}

/* Section-Level Zoom Animations (uses CSS custom properties) */
.animate-section-zoom-in {
    animation: section-zoom-in var(--zoom-duration, 5000ms) cubic-bezier(0.4, 0, 0.2, 1) var(--zoom-fill-mode, forwards);
    will-change: transform;
}

.animate-section-zoom-out {
    animation: section-zoom-out var(--zoom-duration, 5000ms) cubic-bezier(0.4, 0, 0.2, 1) var(--zoom-fill-mode, forwards);
    will-change: transform;
}

/* Reset animations - zoom in then smoothly zoom back out */
.animate-section-zoom-in-reset {
    animation: section-zoom-in-reset calc(var(--zoom-duration, 5000ms) * 2) cubic-bezier(0.4, 0, 0.2, 1) forwards;
    will-change: transform;
}

.animate-section-zoom-out-reset {
    animation: section-zoom-out-reset calc(var(--zoom-duration, 5000ms) * 2) cubic-bezier(0.4, 0, 0.2, 1) forwards;
    will-change: transform;
}

@keyframes section-zoom-in {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
}

@keyframes section-zoom-out {
    0% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
    100% { transform: translate(0, 0) scale(1); }
}

/* Smooth reset: zoom in, hold briefly, then smoothly zoom back */
@keyframes section-zoom-in-reset {
    0% { transform: translate(0, 0) scale(1); }
    45% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
    55% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
    100% { transform: translate(0, 0) scale(1); }
}

/* Smooth reset: zoom out, hold briefly, then smoothly zoom back */
@keyframes section-zoom-out-reset {
    0% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
    45% { transform: translate(0, 0) scale(1); }
    55% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
}
</style>
