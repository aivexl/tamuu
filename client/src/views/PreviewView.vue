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

        if (index === 0 && isTransitionComplete.value) {
            // Remove button elements from Section 1 AFTER transition is 100% DONE
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

// State Machine for robust transition logic
type TransitionStage = 'IDLE' | 'ZOOMING' | 'REVEALING' | 'HANDOFF' | 'DONE';
const transitionStage = ref<TransitionStage>('IDLE');

const isOpened = ref(false); // Track if "Open" button was clicked
const shutterVisible = ref(false);
const openBtnTriggered = ref(false);

// Computed helpers for backward compatibility and template logic
// Lifecycle activation index: Controls when elements inside a card are allowed to wake up
const activeSectionIndex = ref(0);
const isHandoffActive = computed(() => transitionStage.value === 'HANDOFF');
const flowMode = computed(() => ['HANDOFF', 'DONE'].includes(transitionStage.value));
const isTransitionComplete = computed(() => transitionStage.value === 'DONE');

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
    const config = section.zoomConfig;
    if (!config || !config.enabled) return false;

    // SECTION 0 (COVER): Zoom is active if opened or scrolled into view
    if (index === 0) {
        if (config.trigger === 'open_btn') return isOpened.value;
        if (config.trigger === 'scroll') return visibleSections.value.includes(0);
        return isOpened.value; // Default for cover
    }

    // SECTION 1+ (CONTENT): Zoom only activates when the section is being revealed or is done
    // This creates the "living feel" where background starts moving as it slides up
    const isRevealingOrDone = ['REVEALING', 'HANDOFF', 'DONE'].includes(transitionStage.value);
    
    if (config.trigger === 'open_btn') return isRevealingOrDone;
    if (config.trigger === 'scroll') return isRevealingOrDone && visibleSections.value.includes(index);
    
    return isRevealingOrDone;
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
    if (!zoomConfig || !zoomConfig.enabled) return {};
    
    const points = zoomConfig.points || [];
    const isZoomActive = shouldZoom(section, sectionIndex);

    // Case A: Multi-point engine (Direct transform)
    if (points.length > 1) {
        const style: Record<string, string> = {
            transformOrigin: 'center center',
            willChange: 'transform'
        };
        
        if (!isZoomActive) {
            style.transform = 'scale(1) translate(0%, 0%)';
            return style;
        }
        
        const transform = getZoomTransform(section, sectionIndex);
        style.transform = `scale(${transform.scale}) translate(${transform.translateX}%, ${transform.translateY}%)`;
        
        const transitionDuration = zoomConfig.transitionDuration || 1000;
        style.transition = `transform ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        
        return style;
    }
    
    // Case B: Legacy single point (CSS Variables for keyframes)
    if (!isZoomActive) return {};

    const scale = zoomConfig.scale || 1.3;
    const target = zoomConfig.targetRegion || { x: 50, y: 50, width: 50, height: 50 };
    
    // Calculate translate for centering
    const translateX = 50 - target.x;
    const translateY = 50 - target.y;
    
    return {
        '--zoom-scale': scale.toString(),
        '--zoom-translate-x': `${translateX}%`,
        '--zoom-translate-y': `${translateY}%`,
        '--zoom-duration': `${zoomConfig.duration || 3000}ms`
    };
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

// Start sequential zoom animation for a section (Returns Promise for cinematic synchronization)
const startZoomAnimation = (sectionIndex: number, section: any) => {
    return new Promise<void>((resolve) => {
        const zoomConfig = section.zoomConfig;
        if (!zoomConfig?.enabled) {
            resolve();
            return;
        }
        
        // Check trigger
        if (zoomConfig.trigger === 'click' && !clickedSections.value.includes(sectionIndex)) {
            resolve();
            return;
        }
        if (zoomConfig.trigger === 'open_btn' && !isOpened.value) {
            resolve();
            return;
        }
        if (zoomConfig.trigger === 'scroll' && !visibleSections.value.includes(sectionIndex)) {
            resolve();
            return;
        }

        const points = zoomConfig.points || [];
        
        // Case A: Single point or legacy
        if (points.length <= 1) {
            currentZoomPointIndex.value[sectionIndex] = 0;
            // Resolve after a small buffer to let the transition start
            setTimeout(resolve, 100);
            return;
        }
        
        // Case B: Multi-point engine
        if (zoomAnimationTimers.value[sectionIndex]) {
            clearTimeout(zoomAnimationTimers.value[sectionIndex]);
        }

        currentZoomPointIndex.value[sectionIndex] = -1;
        let currentIndex = 0;
        const loop = !!zoomConfig.loop;

        const runNext = () => {
            if (currentIndex < 0 || currentIndex >= points.length) {
                delete zoomAnimationTimers.value[sectionIndex];
                resolve();
                return;
            }

            const currentPoint = points[currentIndex];
            const stayDuration = Number(currentPoint?.duration || zoomConfig.duration || 3000);
            const transitionDuration = Number(zoomConfig.transitionDuration || 1000);
            
            // Wait for both the transition to reach this point AND the requested stay duration
            const totalPointTime = stayDuration + transitionDuration;

            console.log(`[Zoom] Section ${sectionIndex} AT POINT ${currentIndex}, waiting ${totalPointTime}ms`);

            zoomAnimationTimers.value[sectionIndex] = setTimeout(() => {
                const nextIdx = currentIndex + 1;
                
                if (nextIdx >= points.length) {
                    if (loop) {
                        currentIndex = 0;
                        currentZoomPointIndex.value[sectionIndex] = currentIndex;
                        runNext();
                    } else if (zoomConfig.behavior === 'reset') {
                        // CRITICAL FOR SECTION 1: Return to normal (Index -1)
                        currentIndex = -1;
                        currentZoomPointIndex.value[sectionIndex] = currentIndex;
                        console.log(`[Zoom] Section ${sectionIndex}: Final RESET to normal. Resolving in ${transitionDuration + 200}ms`);
                        
                        // We must wait for the final reset transition to finish before the slide-up reveal
                        setTimeout(() => {
                            delete zoomAnimationTimers.value[sectionIndex];
                            resolve();
                        }, transitionDuration + 200);
                    } else {
                        delete zoomAnimationTimers.value[sectionIndex];
                        console.log(`[Zoom] Section ${sectionIndex}: SEQUENCE COMPLETE (stay mode). Resolving.`);
                        resolve();
                    }
                } else {
                    currentIndex = nextIdx;
                    currentZoomPointIndex.value[sectionIndex] = currentIndex;
                    runNext();
                }
            }, totalPointTime) as any;
        };

        // ENHANCED RESET: Always ensure we start clean from scale 1 (Index -1)
        currentZoomPointIndex.value[sectionIndex] = -1;
        
        // Initial 100ms startup to ensure -1 state is rendered by browser
        zoomAnimationTimers.value[sectionIndex] = setTimeout(() => {
            currentZoomPointIndex.value[sectionIndex] = 0;
            runNext();
        }, 100) as any;
    });
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

// 1. Core Scroll Handler (Shared)
const handleScroll = () => {
    if (!scrollContainer.value) return;
    const containerRect = scrollContainer.value.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerBottom = containerRect.bottom;
    
    sectionRefs.value.forEach((sectionEl, index) => {
        if (!sectionEl) return;
        const rect = sectionEl.getBoundingClientRect();
        // 10% visibility threshold
        const isVisible = Math.min(rect.bottom, containerBottom) - Math.max(rect.top, containerTop) >= rect.height * 0.1;
        
        if (isVisible && !visibleSections.value.includes(index)) {
            visibleSections.value.push(index);
        }
    });
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
    // Watch for transition reveal to trigger Section 1+ animations (Zoom, etc.)
    // We start them on REVEALING so they are already moving when the user sees them
    watch(() => transitionStage.value === 'REVEALING', (revealing) => {
        if (revealing) {
            filteredSections.value.forEach((section, index) => {
                if (index > 0 && section.zoomConfig?.enabled && (section.zoomConfig.trigger === 'open_btn' || section.zoomConfig.trigger === 'scroll')) {
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

        if (scrollContainer.value) {
            scrollContainer.value.addEventListener('scroll', handleScroll);
        }
        
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
    if (scrollContainer.value) {
        scrollContainer.value.removeEventListener('scroll', handleScroll);
    }
    
    // Clean up all zoom animation timers
    Object.keys(zoomAnimationTimers.value).forEach(key => {
        clearTimeout(zoomAnimationTimers.value[parseInt(key)]);
    });
    zoomAnimationTimers.value = {};
});

/**
 * REFINED TRANSITION - Support for Enterprise Grade Luxury Effects
 * Wait for Section 1 (Cover) animations before revealing Section 2 (Content)
 */
const handleOpenInvitation = async () => {
    if (openBtnTriggered.value) return;
    openBtnTriggered.value = true;
    
    // Step 1: Start Zoom Phase
    transitionStage.value = 'ZOOMING';
    isOpened.value = true; 
    
    // Get Section 0 and start its cinematic zoom sequence
    const section0 = filteredSections.value[0];
    if (section0) {
        console.log('[Transition] Awaiting Section 0 Cinematic Sequence...');
        await startZoomAnimation(0, section0);
        console.log('[Transition] Section 0 Sequence COMPLETE. Starting Reveal.');
    }

    // Prepare Section 1 for rendering so it's ready for transition
    if (!visibleSections.value.includes(1)) {
        visibleSections.value.push(1);
    } 
    
    const transition = filteredSections.value[0]?.pageTransition || {
        enabled: false,
        effect: 'none',
        duration: 1000,
        trigger: 'open_btn'
    };

    // Step 2: Reveal Phase Preparation
    const effect = transition.enabled ? transition.effect : 'none';
    const rawDuration = transition.duration || 1000;
    const duration = Math.max(1.5, rawDuration / 1000);
    
    console.log(`[Transition] Effect: ${effect}, Duration: ${duration}s`);
        
    const finishTransition = () => {
            // ENTERPRISE-GRADE: Delay mode switch to let GSAP animation fully settle
            setTimeout(() => {
                // Step 3: Handoff Phase (Snap scroll, keep z-index)
                transitionStage.value = 'HANDOFF';
                
                // CRITICAL: We use requestAnimationFrame to ensure the 'HANDOFF' state 
                // (which preserves z-index) is rendered by the browser BEFORE we snap the scroll.
                requestAnimationFrame(() => {
                    if (scrollContainer.value) {
                        if (lenis) lenis.stop();
                        
                        // MATHEMATICAL CORRECTION:
                        const scrollOffset = coverHeightComputed.value * scaleFactor.value;
                        
                        // SNAP!
                        scrollContainer.value.scrollTop = scrollOffset;
                        
                        // Execute immediate scroll check to activate Section 1
                        handleScroll();
                        
                        // ENTERPRISE HANDOFF: 
                        // We wait a bit in HANDOFF mode before moving to DONE
                        // This ensures the browser has fully processed the scroll snap
                        // and layout reconciliation before we release the z-index.
                        setTimeout(() => {
                            if (lenis) {
                                lenis.resize();
                                lenis.start();
                            }
                            transitionStage.value = 'DONE';
                            activeSectionIndex.value = 1;
                        }, 250); // Increased buffer for stability
                    } else {
                        transitionStage.value = 'DONE';
                    }
                });
            }, 50); // Small delay to let GSAP's final frame render
        };

        const coverSection = sectionRefs.value[0];
        const nextSection = sectionRefs.value[1];
        
        console.log(`[Transition] Executing Luxury Reveal: ${effect}, Sections:`, !!coverSection, !!nextSection);
        
        if (effect === 'none') {
            finishTransition();
            return;
        }

        // Step 2: Start Reveal Phase
        // This triggers the CSS transitions defined in getSectionSlotStyle
        transitionStage.value = 'REVEALING';
        
        // Step 3: Wait for animation + buffer, then handoff
        const totalDurationMs = (duration * 1000) + 100;
        setTimeout(finishTransition, totalDurationMs);
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


function toggleFullscreen() {
    if (!mainViewport.value) return;
    if (!document.fullscreenElement) {
        mainViewport.value.requestFullscreen().catch(e => console.error(e));
    } else {
        document.exitFullscreen().catch(e => console.error(e));
    }
}

function handleFullscreenChange() { 
    isFullscreen.value = !!document.fullscreenElement; 
    nextTick(() => {
        updateDimensions();
        if (lenis) lenis.resize();
    });
}
/**
 * SLOT-BASED ARCHITECTURE: Section Positioning
 * - In Atomic Mode: Sections 0 and 1 are at top:0 with z-index stacking
 * - In Flow Mode: Sections are positioned vertically with calculated top values
 * - Key: NO remounting, only position pivoting
 */
const getSectionSlotStyle = (index: number): any => {
    const section = filteredSections.value[index];
    const currentCoverHeight = coverHeightComputed.value;
    const isFirst = index === 0;
    const isSecond = index === 1;
    
    // Base styles for all sections
    const base: any = {
        position: 'absolute',
        left: '0',
        width: `${CANVAS_WIDTH}px`,
        height: isFirst ? `${currentCoverHeight}px` : `${CANVAS_HEIGHT}px`,
        overflow: 'hidden',
        backgroundColor: section?.backgroundColor || 'transparent',
        backfaceVisibility: 'hidden',
        willChange: 'transform, opacity',
        clipPath: 'inset(0)',
        ['-webkit-clip-path' as any]: 'inset(0)'
    };

    const transitionConfig = filteredSections.value[0]?.pageTransition;
    const effect = transitionConfig?.effect || 'none';
    const duration = transitionConfig?.duration || 1000;
    // CRITICAL: Keep isReveal active during HANDOFF to prevent transform jump
    const isReveal = transitionStage.value === 'REVEALING' || transitionStage.value === 'HANDOFF';

    if (!flowMode.value) {
        // === ATOMIC MODE (Before transition) ===
        if (isFirst) {
            const firstStyle: any = {
                ...base,
                top: '0',
                zIndex: 20,
            };

            if (isReveal) {
                const luxuryEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
                // LUXURY EASING for fade/door/slide-down/zoom-reveal/stack-reveal/parallax-reveal/split-door; preserve original for slide-up
                const easing = (effect === 'fade' || effect === 'door-reveal' || effect === 'slide-down' || effect === 'zoom-reveal' || effect === 'stack-reveal' || effect === 'parallax-reveal' || effect === 'split-door') ? luxuryEasing : 'cubic-bezier(0.4, 0, 0.2, 1)';
                firstStyle.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ease-in-out, clip-path ${duration}ms ${easing}`;
                
                if (effect === 'slide-up') firstStyle.transform = 'translateY(-100%)';
                else if (effect === 'slide-down') {
                    firstStyle.transform = 'translateY(100%)';
                    firstStyle.opacity = 0; // Prevent overlapping Section 1 during/after slide
                }
                else if (effect === 'fade') firstStyle.opacity = 0;
                else if (effect === 'zoom-reveal') {
                    firstStyle.transform = 'scale(1.3) translateZ(0)'; // Dramatic cinematic zoom-out
                    firstStyle.opacity = 0;
                } else if (effect === 'stack-reveal') {
                    firstStyle.transform = 'translateY(-100%) scale(0.9) translateZ(0)';
                    firstStyle.opacity = 0;
                } else if (effect === 'parallax-reveal') {
                    // TRUE PARALLAX: Cover moves faster with partial fade
                    firstStyle.transform = 'translateY(-120%) translateZ(0)';
                    firstStyle.opacity = 0.3;
                } else if (effect === 'door-reveal') {
                    // 3D DOOR EFFECT: Cover rotates like a door opening from the left
                    firstStyle.transform = 'perspective(1500px) rotateY(-90deg) translateZ(0)';
                    firstStyle.opacity = 0;
                    firstStyle.transformOrigin = 'left center';
                } else if (effect === 'split-door') {
                    // SPLIT DOOR: Cover splits from center using clip-path
                    firstStyle.clipPath = 'inset(0 50% 0 50%)';
                    firstStyle.opacity = 0;
                }
            }

            return firstStyle;
        }
        
        if (isSecond) {
            const overlayEnabled = transitionConfig?.overlayEnabled || isReveal;
            const secondStyle: any = {
                ...base,
                top: '0',
                zIndex: 10,
                opacity: overlayEnabled ? 1 : 0
            };

            // INITIAL STATES vs ANIMATING STATES
            if (!isReveal) {
                if (effect === 'zoom-reveal') {
                    secondStyle.transform = 'scale(0.85) translateZ(0)';
                    secondStyle.opacity = 0;
                }
                else if (effect === 'stack-reveal') {
                    secondStyle.transform = 'translateY(100%) scale(0.9) translateZ(0)';
                    secondStyle.opacity = 0;
                }
                else if (effect === 'parallax-reveal') {
                    // TRUE PARALLAX: Content starts further and moves slower
                    secondStyle.transform = 'translateY(60%) scale(0.95) translateZ(0)';
                    secondStyle.opacity = 0;
                }
                else if (effect === 'fade' || effect === 'slide-down') { 
                    secondStyle.opacity = 0;
                    secondStyle.transform = 'scale(0.95) translateZ(0)'; // Subtle depth Scale
                }
                else if (effect === 'door-reveal') {
                    // Door reveal: Content starts slightly scaled
                    secondStyle.transform = 'scale(0.95) translateZ(0)';
                    secondStyle.opacity = 0;
                }
                else if (effect === 'split-door') {
                    // Split door: Content starts slightly scaled behind
                    secondStyle.transform = 'scale(0.95) translateZ(0)';
                    secondStyle.opacity = 0;
                }
            } else {
                const luxuryEasing = 'cubic-bezier(0.22, 1, 0.36, 1)';
                const easing = (effect === 'fade' || effect === 'slide-down' || effect === 'zoom-reveal' || effect === 'stack-reveal' || effect === 'parallax-reveal' || effect === 'door-reveal' || effect === 'split-door') ? luxuryEasing : 'cubic-bezier(0.4, 0, 0.2, 1)';
                secondStyle.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ease-in-out`;
                secondStyle.transform = 'scale(1) translateY(0) translateZ(0)';
                secondStyle.opacity = 1;
            }

            return secondStyle;
        }
        
        // Sections 2+: Hidden in atomic mode
        return {
            ...base,
            top: '0',
            zIndex: 1,
            display: 'none'
        };
    } else {
        // === FLOW MODE (After transition) ===
        // All sections are positioned vertically with calculated top values
        // Section 0: top = 0
        // Section 1: top = coverHeight
        // Section 2: top = coverHeight + CANVAS_HEIGHT
        // etc.
        
        let calculatedTop = 0;
        if (index > 0) {
            calculatedTop = currentCoverHeight + (index - 1) * CANVAS_HEIGHT;
        }
        
        // CRITICAL: Keep Section 0's high z-index during handoff to prevent
        // Section 1 from appearing on top while GSAP animation is still visible
        const zIndex = (isFirst && isHandoffActive.value) ? 20 : 1;
        
        const flowStyle: any = {
            ...base,
            top: `${calculatedTop}px`,
            zIndex: zIndex,
            opacity: 1,
            display: 'block',
            clipPath: 'inset(0)',
            ['-webkit-clip-path' as any]: 'inset(0)',
            willChange: 'transform, opacity, scroll-position'
        };

        // CRITICAL HANDOFF LOCK: 
        // Maintain the transition's final state during the frame-swap to HANDOFF
        if (isHandoffActive.value) {
            flowStyle.transition = 'none';
            if (isFirst) {
                if (effect === 'slide-up') flowStyle.transform = 'translateY(-100%)';
                else if (effect === 'slide-down') { 
                    flowStyle.transform = 'translateY(100%)'; 
                    flowStyle.opacity = 0; // Lock transparency during handoff
                }
                else if (effect === 'fade') flowStyle.opacity = 0;
                else if (effect === 'zoom-reveal') { flowStyle.transform = 'scale(1.5)'; flowStyle.opacity = 0; }
                else if (effect === 'stack-reveal' || effect === 'parallax-reveal') { flowStyle.transform = 'translateY(-100%)'; flowStyle.opacity = effect === 'stack-reveal' ? 0 : 1; }
            } else if (isSecond) {
                flowStyle.transform = 'scale(1) translateY(0) translateZ(0)';
                flowStyle.opacity = 1;
            }
        }

        return flowStyle;
    }
};

// Provide activation status to all children (AnimatedElement.vue)
const checkSectionActive = (index: number) => {
    // Section 0 (Cover) is active if the door isn't open yet OR we are in Atomic mode
    if (index === 0) return !isTransitionComplete.value;
    
    // CONTENT SECTIONS (index 1+) 
    // They become "Active" as soon as the transition starts (REVEALING)
    // This allows their animations (Slide down flowers, Zoom) to start playing
    // while the cover is sliding up, creating a living, layered feel.
    return ['REVEALING', 'HANDOFF', 'DONE'].includes(transitionStage.value);
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
                        marginRight: isPortrait ? '0' : 'auto',
                        overflow: 'hidden',
                        clipPath: 'inset(0)',
                        ['-webkit-clip-path' as any]: 'inset(0)'
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
                    
                    <!-- SLOT-BASED UNIFIED RENDER (Zero Remounting Architecture) -->
                    <div 
                        v-for="(section, index) in filteredSections" 
                        :key="section.key"
                        :id="index === 0 ? 'atomic-cover-section' : undefined"
                        :ref="(el) => setSectionRef(el, index)" 
                        :data-index="index"
                        class="page-section"
                        :class="{ 
                            'atomic-cover-layer': index === 0, 
                            'atomic-next-layer': index === 1 
                        }"
                        :style="getSectionSlotStyle(index)"
                        @click="handleSectionClick(index, section)"
                    >
                        <!-- Zoom Animation Wrapper -->
                        <div
                            class="absolute inset-0 w-full h-full transform-gpu"
                            :class="getZoomClass(section, index)"
                            :style="getZoomStyle(section, index)"
                        >
                            <!-- Background Image -->
                            <div 
                                v-if="section.backgroundUrl" 
                                class="absolute inset-0 bg-cover bg-center" 
                                :class="{ 'animate-ken-burns': section.kenBurnsEnabled && !section.zoomConfig?.enabled && checkSectionActive(index) }" 
                                :style="{ backgroundImage: `url(${getProxiedImageUrl(section.backgroundUrl)})` }" 
                            />
                            
                            <!-- Overlay -->
                            <div 
                                v-if="section.overlayOpacity && section.overlayOpacity > 0" 
                                class="absolute inset-0 bg-black pointer-events-none" 
                                :style="{ opacity: section.overlayOpacity }" 
                            />
                            
                            <!-- Particle Effects -->
                            <ParticleOverlay 
                                v-if="section.particleType && section.particleType !== 'none'" 
                                :type="section.particleType" 
                            />

                            <!-- Element Layer -->
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
                                        :force-trigger="index === 0 ? (el.animationTrigger === 'open_btn' ? isOpened : true) : isTransitionComplete"
                                        :element-id="el.id"
                                        :image-url="el.imageUrl"
                                        :motion-path-config="el.motionPathConfig"
                                        :parallax-factor="el.parallaxFactor"
                                        :is-section-active="checkSectionActive(index)"
                                    >
                                        <!-- Image/GIF -->
                                        <img 
                                            v-if="el.type === 'image' || el.type === 'gif'" 
                                            :src="getProxiedImageUrl(el.imageUrl)" 
                                            class="w-full h-full pointer-events-none select-none" 
                                            :style="{ objectFit: el.objectFit || 'contain' }" 
                                        />
                                        
                                        <!-- Text -->
                                        <div v-else-if="el.type === 'text'" :style="getTextStyle(el)" class="w-full h-full">
                                            {{ el.content }}
                                        </div>
                                        
                                        <!-- Button -->
                                        <button 
                                            v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" 
                                            :style="getButtonStyle(el)" 
                                            class="w-full h-full hover:scale-105 active:scale-95 transition-all shadow-xl font-bold" 
                                            @click="handleOpenInvitation()"
                                        >
                                            {{ el.openInvitationConfig?.buttonText || el.content || 'Buka Undangan' }}
                                        </button>
                                        
                                        <!-- Icon -->
                                        <div v-else-if="el.type === 'icon'" :style="{ color: el.iconStyle?.iconColor }" class="w-full h-full flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                                                <path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" />
                                            </svg>
                                        </div>
                                        
                                        <!-- Shape -->
                                        <div v-else-if="el.type === 'shape' && el.shapeConfig" class="w-full h-full">
                                            <svg v-if="el.shapeConfig.shapeType.includes('rectangle')" width="100%" height="100%" :viewBox="`0 0 ${el.size.width} ${el.size.height}`" preserveAspectRatio="none">
                                                <rect x="0" y="0" :width="el.size.width" :height="el.size.height" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" :rx="el.shapeConfig.shapeType === 'rounded-rectangle' ? (el.shapeConfig.cornerRadius || 20) : 0" />
                                            </svg>
                                            <svg v-else-if="el.shapeConfig.shapeType === 'circle'" width="100%" height="100%" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" />
                                            </svg>
                                            <svg v-else-if="el.shapeConfig.shapeType === 'ellipse'" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                <ellipse cx="50" cy="50" rx="48" ry="48" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" />
                                            </svg>
                                            <svg v-else width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                                                <path :d="shapePaths[el.shapeConfig.shapeType] || el.shapeConfig.pathData || ''" :fill="el.shapeConfig.fill || 'transparent'" :stroke="el.shapeConfig.stroke || 'transparent'" :stroke-width="el.shapeConfig.strokeWidth || 0" />
                                            </svg>
                                        </div>
                                        
                                        <!-- Lottie -->
                                        <LottieElement 
                                            v-else-if="el.type === 'lottie'" 
                                            :animation-url="el.lottieConfig?.url || ''" 
                                            :direction="el.lottieConfig?.direction || 'left'" 
                                            :speed="el.lottieConfig?.speed || 1" 
                                            :loop="el.lottieConfig?.loop !== false" 
                                            :auto-play="el.lottieConfig?.autoplay !== false" 
                                            class="w-full h-full" 
                                        />
                                        
                                        <!-- Countdown -->
                                        <div v-else-if="el.type === 'countdown'" class="w-full h-full flex justify-center items-center gap-2">
                                            <div v-for="unit in ['Days', 'Hours', 'Min', 'Sec']" :key="unit" class="flex flex-col items-center">
                                                <div class="text-2xl font-bold" :style="{ color: el.countdownConfig?.digitColor || '#000' }">00</div>
                                                <div class="text-[10px] uppercase" :style="{ color: el.countdownConfig?.labelColor || '#666' }">{{ unit }}</div>
                                            </div>
                                        </div>
                                        
                                        <!-- RSVP Form -->
                                        <div v-else-if="el.type === 'rsvp_form'" class="w-full h-full p-4 bg-white/50 backdrop-blur-sm rounded-xl" />
                                        
                                        <!-- Guest Wishes -->
                                        <div v-else-if="el.type === 'guest_wishes'" class="w-full h-full p-4 bg-white/30 backdrop-blur-sm rounded-xl" />
                                    </AnimatedElement>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- MIRROR SHUTTERS (Optional Transition Effect) -->
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
.page-section { 
    backface-visibility: hidden; 
    transform: translate3d(0, 0, 0); 
    -webkit-backface-visibility: hidden;
    -webkit-transform: translate3d(0, 0, 0);
}
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
