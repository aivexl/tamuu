<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, nextTick, provide, reactive, watch } from 'vue';
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
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

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
const isOpened = ref(false); // Track if "Open" button was clicked
const isRevealing = ref(false); // Track if middle-of-reveal animation is active
const isHandoffActive = ref(false); // New: Track the split-second handoff between modes
const handoffOpacity = ref(1); // CTO Level: Granular control over handoff visibility
const shutterVisible = ref(false);
const openBtnTriggered = ref(false);
const flowMode = ref(false); // Binary mode: Reveal (Atomic) vs Scroll (Flow)

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
            
            // Start multi-point zoom animation explicitly on click
            startZoomAnimation(index, section);
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
        
        // Special case: -1 means reset to normal (scale 1, translate 0)
        if (animIdx === -1) {
            return { 
                scale: 1, 
                translateX: 0, 
                translateY: 0,
                originX: 50,
                originY: 50
            };
        }
        
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
    
    // Check trigger: don't start engine until trigger condition is met
    if (zoomConfig.trigger === 'click' && !clickedSections.value.includes(sectionIndex)) return;
    if (zoomConfig.trigger === 'open_btn' && !isOpened.value) return;
    if (zoomConfig.trigger === 'scroll' && !visibleSections.value.includes(sectionIndex)) return;

    const points = zoomConfig.points || [];
    if (points.length <= 1) {
        // Single point or legacy - no cycling needed
        currentZoomPointIndex.value[sectionIndex] = 0;
        return;
    }
    
    // START ENHANCEMENT: Clear existing timers and start from Normal state (-1)
    if (zoomAnimationTimers.value[sectionIndex]) {
        clearTimeout(zoomAnimationTimers.value[sectionIndex]);
    }

    // Set to Normal state first
    currentZoomPointIndex.value[sectionIndex] = -1;
    let currentIndex = 0;
    const loop = !!zoomConfig.loop;

    const runNext = () => {
        if (currentIndex < 0 || currentIndex >= points.length) {
            delete zoomAnimationTimers.value[sectionIndex];
            return;
        }

        const currentPoint = points[currentIndex];
        const stayDuration = currentPoint?.duration || zoomConfig.duration || 3000;
        const transitionDuration = zoomConfig.transitionDuration || 1000;
        const totalPointTime = stayDuration + transitionDuration;

        console.log(`[Zoom] Section ${sectionIndex} at point ${currentIndex} of ${points.length}, staying for ${stayDuration}ms + ${transitionDuration}ms transition`);

        zoomAnimationTimers.value[sectionIndex] = setTimeout(() => {
            const nextIdx = currentIndex + 1;
            
            if (nextIdx >= points.length) {
                if (loop) {
                    currentIndex = 0;
                    currentZoomPointIndex.value[sectionIndex] = currentIndex;
                    console.log(`[Zoom] Section ${sectionIndex}: looping back to point 0`);
                    runNext();
                } else if (zoomConfig.behavior === 'reset') {
                    currentIndex = -1;
                    currentZoomPointIndex.value[sectionIndex] = currentIndex;
                    console.log(`[Zoom] Section ${sectionIndex}: returning to normal`);
                    delete zoomAnimationTimers.value[sectionIndex];
                } else {
                    delete zoomAnimationTimers.value[sectionIndex];
                    console.log(`[Zoom] Section ${sectionIndex}: animation complete (stay mode)`);
                }
            } else {
                currentIndex = nextIdx;
                currentZoomPointIndex.value[sectionIndex] = currentIndex;
                console.log(`[Zoom] Section ${sectionIndex}: moved to point ${currentIndex}`);
                runNext();
            }
        }, totalPointTime) as any;
    };

    // Store the init timer as well to prevent overlapping starts
    zoomAnimationTimers.value[sectionIndex] = setTimeout(() => {
        currentZoomPointIndex.value[sectionIndex] = 0;
        runNext();
    }, 50) as any;
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
    
    // Watch for template to be fully loaded before starting observer/initial zoom
    watch(currentTemplate, (template) => {
        if (!template || observer) return;

        console.log('[Zoom] Template loaded, initializing IntersectionObserver');
        
        // Observer for scroll-based animations
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const index = parseInt((entry.target as HTMLElement).dataset.index || '-1');
                if (entry.isIntersecting && index !== -1) {
                    if (!visibleSections.value.includes(index)) {
                        visibleSections.value.push(index);
                        const section = filteredSections.value[index];
                        if (section) startZoomAnimation(index, section);
                    }
                }
            });
        }, { threshold: 0.1, root: scrollContainer.value });

        // Auto-trigger Section 0 if needed
        setTimeout(() => {
            if (!visibleSections.value.includes(0)) visibleSections.value.push(0);
            const section0 = filteredSections.value[0];
            if (section0 && (!section0.zoomConfig?.trigger || section0.zoomConfig.trigger === 'scroll')) {
                startZoomAnimation(0, section0);
            }
        }, 100);
    }, { immediate: true });

    // Watch for isOpened (other logic unchanged)
    watch(isOpened, (opened) => {
        if (opened) {
            filteredSections.value.forEach((section, index) => {
                if (section.zoomConfig?.enabled && section.zoomConfig.trigger === 'open_btn') {
                    startZoomAnimation(index, section);
                }
            });
        }
    });

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
 * Calculate the total duration of animations in the Cover section 
 * that are triggered by the "Open" button.
 */
const getOpenTransitionDuration = () => {
    const section = filteredSections.value[0];
    if (!section) return 400;

    let maxDuration = 400; // Standard minimum breathing room

    // 1. Check elements with 'open_btn' trigger
    (section.elements || []).forEach((el: any) => {
        if (el.animationTrigger === 'open_btn') {
            const delay = Number(el.animationDelay) || 0;
            let duration = Number(el.animationDuration) || 800;
            
            // Elements might have their own zoom config which can take longer
            if (el.zoomConfig?.enabled) {
                const zoomDur = Number(el.zoomConfig.duration) || 2000;
                if (zoomDur > duration) duration = zoomDur;
            }

            const total = delay + duration;
            if (total > maxDuration) maxDuration = total;
        }
    });

    // 2. Check Zoom Animation if triggered by 'open_btn'
    if (section.zoomConfig?.enabled && section.zoomConfig.trigger === 'open_btn') {
        let zoomTotal = 0;
        const points = section.zoomConfig.points || [];
        const transitionDuration = Number(section.zoomConfig.transitionDuration) || 1000;
        const defaultStayDuration = Number(section.zoomConfig.duration) || 3000;

        if (points.length > 0) {
            // Formula: SUM(transition + stay) for each point
            zoomTotal = points.reduce((acc: number, p: any) => 
                acc + (Number(p.duration) || defaultStayDuration) + transitionDuration, 0
            );
        } else {
            // Single zoom: transition to target + stay
            zoomTotal = transitionDuration + defaultStayDuration;
        }

        // IMPORTANT: If behavior is 'reset', we must wait for the final transition back to normal (-1)
        if (section.zoomConfig.behavior === 'reset') {
            zoomTotal += transitionDuration;
            console.log(`[Reveal] Adding ${transitionDuration}ms for zoom reset transition`);
        }
        
        if (zoomTotal > maxDuration) maxDuration = zoomTotal;
    }

    console.log(`[Reveal] Calculated transition wait: ${maxDuration}ms`);
    return maxDuration + 800; // Luxury Standard: Add deliberate breathing room for "settle" effect
};

/**
 * SIMPLE REVEAL - No animations, just switch to Flow Mode
 */
/**
 * REFINED TRANSITION - Support for Enterprise Grade Luxury Effects
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
    
    // Get transition config from Section 1
    const transition = filteredSections.value[0]?.pageTransition || {
        enabled: false,
        effect: 'none',
        duration: 1000,
        trigger: 'open_btn'
    };

    // Step 2: Dynamic delay based on Cover section animations (minimum breathing room)
    const animWait = getOpenTransitionDuration();
    
    // Start the transition orchestration
    isRevealing.value = true;
    
    // CTO LEVEL: Pre-trigger Section 2 zoom for perfect mirroring
    if (filteredSections.value[1]) {
        visibleSections.value = [...visibleSections.value, 1];
        startZoomAnimation(1, filteredSections.value[1]);
    }

    // Use GSAP for precision timing
    gsap.delayedCall(animWait / 1000, () => {
        const effect = transition.enabled ? transition.effect : 'none';
        const duration = (transition.duration || 1000) / 1000;
        
        const finishTransition = () => {
            // CTO-LEVEL HANDOFF: Buffer the state change to prevent layout snapshots
            isHandoffActive.value = true;
            handoffOpacity.value = 1;
            flowMode.value = true;
            
            nextTick(() => {
                if (scrollContainer.value) {
                    if (lenis) {
                        lenis.stop();
                        const scrollOffset = coverHeightComputed.value * scaleFactor.value;
                        lenis.scrollTo(scrollOffset, { immediate: true });
                        scrollContainer.value.scrollTop = scrollOffset;
                    } else {
                        const scrollOffset = coverHeightComputed.value * scaleFactor.value;
                        scrollContainer.value.scrollTop = scrollOffset;
                    }
                    
                    // LUXURY CROSS-FADE: Animate the overlay out smoothly
                    gsap.to(handoffOpacity, {
                        value: 0,
                        duration: 0.4,
                        ease: "power2.out",
                        onComplete: () => {
                            isRevealing.value = false;
                            isHandoffActive.value = false;
                            
                            if (lenis) {
                                lenis.resize();
                                lenis.start();
                            }
                        }
                    });

                    // Force a re-layout check for visibility triggers
                    const handleScroll = () => {
                        if (!scrollContainer.value) return;
                        const containerRect = scrollContainer.value.getBoundingClientRect();
                        const containerTop = containerRect.top;
                        const containerBottom = containerRect.bottom;
                        
                        sectionRefs.value.forEach((sectionEl, index) => {
                            if (!sectionEl) return;
                            const rect = sectionEl.getBoundingClientRect();
                            const isVisible = Math.min(rect.bottom, containerBottom) - Math.max(rect.top, containerTop) >= rect.height * 0.1;
                            
                            if (isVisible && !visibleSections.value.includes(index)) {
                                visibleSections.value.push(index);
                            }
                        });
                    };
                    
                    scrollContainer.value.addEventListener('scroll', handleScroll);
                    setTimeout(handleScroll, 100);
                } else {
                    isRevealing.value = false;
                    isHandoffActive.value = false;
                }
            });
        };

        // EXECUTE LUXURY EFFECTS
        if (effect === 'none') {
            finishTransition();
        } else if (effect === 'fade') {
            gsap.to('.atomic-cover-layer', {
                opacity: 0,
                duration: duration,
                ease: 'power2.inOut',
                onComplete: finishTransition
            });
        } else if (effect === 'slide-up') {
            gsap.to('.atomic-cover-layer', {
                y: '-100%',
                duration: duration,
                ease: 'expo.inOut',
                onComplete: finishTransition
            });
        } else if (effect === 'slide-down') {
            gsap.to('.atomic-cover-layer', {
                y: '100%',
                duration: duration,
                ease: 'expo.inOut',
                onComplete: finishTransition
            });
        } else if (effect === 'zoom-reveal') {
            // Top layer scales out and fades
            gsap.to('.atomic-cover-layer', {
                scale: 1.5,
                opacity: 0,
                duration: duration,
                ease: 'power3.inOut',
                onComplete: finishTransition
            });
            // Bottom layer scales in from 0.8
            gsap.fromTo('.atomic-next-layer', 
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: duration, ease: 'power2.out' }
            );
        } else if (effect === 'stack-reveal') {
            // Section 1 slides up to reveal Section 2 which is already behind
            gsap.to('.atomic-cover-layer', {
                y: '-100%',
                duration: duration,
                ease: 'power4.inOut',
                onComplete: finishTransition
            });
            // Sublte parallax on section 2
            gsap.fromTo('.atomic-next-layer',
                { y: 100 },
                { y: 0, duration: duration, ease: 'power4.out' }
            );
        } else if (effect === 'parallax-reveal') {
            gsap.to('.atomic-cover-layer', {
                y: '-100%',
                duration: duration,
                ease: 'none',
                onComplete: finishTransition
            });
            gsap.fromTo('.atomic-next-layer',
                { y: '30%' },
                { y: '0%', duration: duration, ease: 'none' }
            );
        } else if (effect === 'door-reveal') {
            // Split transition using scaleX = 0 on two halves or similar
            // For now, let's use a simple scaleY: 0 or clip-path if we had it
            // Better: Slide left and right if we split the container (complex)
            // Let's use a luxury "Scale toward edges" for now
            gsap.to('.atomic-cover-layer', {
                scaleX: 0,
                opacity: 0,
                duration: duration,
                ease: 'power4.inOut',
                transformOrigin: 'center center',
                onComplete: finishTransition
            });
        } else {
            finishTransition();
        }
    }); 
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
const getSectionWrapperStyle = (index: number) => {
    const isFirst = index === 0;
    const isSecond = index === 1;
    const currentCoverHeight = coverHeightComputed.value;
    const section = filteredSections.value[index];
    
    const base: any = {
        width: `${CANVAS_WIDTH}px`,
        position: 'absolute',
        left: '0',
        overflow: 'hidden',
        backgroundColor: section?.backgroundColor || 'transparent'
    };

    if (!flowMode.value) {
        // --- ATOMIC MODE (Reveal Preparation) ---
        // During reveal, GSAP controls the transform/opacity of Section 0
        // We only set layout properties here
        if (isFirst) {
            return {
                ...base,
                height: `${currentCoverHeight}px`,
                zIndex: 20,
                top: '0px',
                // Let GSAP handle transform and opacity during reveal
                willChange: isRevealing.value ? 'transform, opacity' : 'auto'
            };
        }
        if (isSecond) {
            const transition = filteredSections.value[0]?.pageTransition;
            const overlayEnabled = transition?.overlayEnabled || isRevealing.value;
            return {
                ...base,
                height: `${CANVAS_HEIGHT}px`,
                zIndex: 10,
                top: '0px',
                opacity: overlayEnabled ? 1 : 0,
                willChange: isRevealing.value ? 'transform, opacity' : 'auto'
            };
        }
        // Hide other sections in atomic mode
        return { 
            ...base,
            display: 'none',
            height: `${CANVAS_HEIGHT}px`,
            top: '0px'
        };
    } else {
        // --- FLOW MODE (Direct Scroll Layout) ---
        let top = 0;
        if (index > 0) {
            top = currentCoverHeight + (index - 1) * CANVAS_HEIGHT;
        }

        const style: any = {
            ...base,
            height: isFirst ? `${currentCoverHeight}px` : `${CANVAS_HEIGHT}px`,
            top: `${top}px`,
            zIndex: 1,
            display: 'block',
            opacity: 1,
            transform: 'none' // Reset any GSAP transforms
        };

        return style;
    }
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
                        // CTO LEVEL: Immediately use full height in Flow Mode to prevent clipping
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
                <!-- 
                    THE UNIFIED ATOMIC CONTAINER
                    Refined for Luxury Transitions (Zero-Error Architecture)
                -->
                <div class="relative w-full" :style="{ width: `${CANVAS_WIDTH}px`, height: flowMode ? `${coverHeightComputed + (filteredSections.length - 1) * CANVAS_HEIGHT}px` : `${coverHeightComputed}px` }">
                    
                <!-- THE SINGULAR RENDER STACK (CTO Level: Unified DOM Management) -->
                <div class="relative w-full" :style="{ height: flowMode ? `${coverHeightComputed + (filteredSections.length - 1) * CANVAS_HEIGHT}px` : `${coverHeightComputed}px` }">
                    <div 
                        v-for="(section, index) in filteredSections" 
                        :key="section.key"
                        :id="index === 0 ? 'atomic-cover-section' : undefined"
                        :ref="(el) => setSectionRef(el, index)" :data-index="index"
                        class="page-section"
                        :class="{ 'atomic-cover-layer': index === 0, 'atomic-next-layer': index === 1 }"
                        :style="getSectionWrapperStyle(index)"
                        @click="handleSectionClick(index, section)"
                    >
                        <div
                            class="absolute inset-0 w-full h-full"
                            :class="getZoomClass(section, index)"
                            :style="getZoomStyle(section, index)"
                        >
                            <!-- Background & Effects -->
                            <div v-if="section.backgroundUrl" class="absolute inset-0 bg-cover bg-center" :class="{ 'animate-ken-burns': section.kenBurnsEnabled && !section.zoomConfig?.enabled }" :style="{ backgroundImage: `url(${getProxiedImageUrl(section.backgroundUrl)})` }" />
                            <div v-if="section.overlayOpacity && section.overlayOpacity > 0" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                            <ParticleOverlay v-if="section.particleType && section.particleType !== 'none'" :type="section.particleType" />

                            <!-- Elements -->
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
                                        :force-trigger="el.animationTrigger === 'open_btn' ? isOpened : true"
                                        :element-id="el.id"
                                        :image-url="el.imageUrl"
                                        :motion-path-config="el.motionPathConfig"
                                        :parallax-factor="el.parallaxFactor"
                                    >
                                        <img v-if="el.type === 'image' || el.type === 'gif'" :src="getProxiedImageUrl(el.imageUrl)" class="w-full h-full pointer-events-none select-none" :style="{ objectFit: el.objectFit || 'contain' }" />
                                        <div v-else-if="el.type === 'text'" :style="getTextStyle(el)" class="w-full h-full">{{ el.content }}</div>
                                        <button v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="w-full h-full hover:scale-105 active:scale-95 transition-all shadow-xl font-bold" @click="handleOpenInvitation()">{{ el.openInvitationConfig?.buttonText || el.content || 'Buka Undangan' }}</button>
                                        <div v-else-if="el.type === 'icon'" :style="{ color: el.iconStyle?.iconColor }" class="w-full h-full flex items-center justify-center"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" /></svg></div>
                                        <div v-else-if="el.type === 'shape' && el.shapeConfig" class="w-full h-full">
                                            <svg v-if="el.shapeConfig.shapeType.includes('rectangle')" width="100%" height="100%" :viewBox="`0 0 ${el.size.width} ${el.size.height}`" preserveAspectRatio="none"><rect x="0" y="0" :width="el.size.width" :height="el.size.height" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" :rx="el.shapeConfig.shapeType === 'rounded-rectangle' ? (el.shapeConfig.cornerRadius || 20) : 0" /></svg>
                                            <svg v-else-if="el.shapeConfig.shapeType === 'circle'" width="100%" height="100%" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                            <svg v-else-if="el.shapeConfig.shapeType === 'ellipse'" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><ellipse cx="50" cy="50" rx="48" ry="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                            <svg v-else width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><path :d="shapePaths[el.shapeConfig.shapeType] || el.shapeConfig.pathData || ''" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" /></svg>
                                        </div>
                                        <LottieElement v-else-if="el.type === 'lottie'" :animation-url="el.lottieConfig?.url || ''" :direction="el.lottieConfig?.direction || 'left'" :speed="el.lottieConfig?.speed || 1" :loop="el.lottieConfig?.loop !== false" :auto-play="el.lottieConfig?.autoplay !== false" class="w-full h-full" />
                                        <div v-else-if="el.type === 'countdown'" class="w-full h-full flex justify-center items-center gap-2"><div v-for="unit in ['Days', 'Hours', 'Min', 'Sec']" :key="unit" class="flex flex-col items-center"><div class="text-2xl font-bold" :style="{ color: el.countdownConfig?.digitColor || '#000' }">00</div><div class="text-[10px] uppercase" :style="{ color: el.countdownConfig?.labelColor || '#666' }">{{ unit }}</div></div></div>
                                        <div v-else-if="el.type === 'rsvp_form'" class="w-full h-full p-4 bg-white/50 backdrop-blur-sm rounded-xl" />
                                        <div v-else-if="el.type === 'guest_wishes'" class="w-full h-full p-4 bg-white/30 backdrop-blur-sm rounded-xl" />
                                    </AnimatedElement>
                                </template>
                            </div>
                        </div>
                    </div>
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

/* Professional Transition Layer Styles */
.atomic-cover-layer {
    backface-visibility: hidden;
    will-change: transform, opacity;
    box-shadow: 0 0 50px rgba(0,0,0,0.3);
}

.atomic-next-layer {
    pointer-events: none;
    backface-visibility: hidden;
    will-change: transform, opacity;
}

.flow-mode .atomic-next-layer {
    display: none;
}

/* Smooth reset: zoom out, hold briefly, then smoothly zoom back */
@keyframes section-zoom-out-reset {
    0% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
    45% { transform: translate(0, 0) scale(1); }
    55% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(var(--zoom-translate-x, 0), var(--zoom-translate-y, 0)) scale(var(--zoom-scale, 1.3)); }
}
</style>
