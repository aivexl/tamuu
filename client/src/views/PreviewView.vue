<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTemplateStore } from '@/stores/template';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';
import AnimatedElement from '@/components/AnimatedElement.vue';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-vue-next';
import { iconPaths } from '@/lib/icon-paths';

// Library Imports
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import * as _anime from 'animejs';
const anime: any = (_anime as any).default || _anime;
import Lenis from 'lenis';

gsap.registerPlugin(ScrollToPlugin);

const route = useRoute();
const router = useRouter();
const store = useTemplateStore();

const templateId = computed(() => route.params.id as string);
const isFullscreen = ref(false);
const mainViewport = ref<HTMLElement | null>(null);
const scrollContainer = ref<HTMLElement | null>(null);

const currentTemplate = computed(() => store.templates.find(t => t.id === templateId.value));

const orderedSections = computed(() => {
    if (!currentTemplate.value) return [];
    const sectionsObj = currentTemplate.value.sections || {};
    return Object.entries(sectionsObj)
        .map(([key, data]) => ({ key, ...data }))
        .filter(s => s.isVisible !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
});

// Enterprise State
const isOpened = ref(false);
const openBtnTriggered = ref(false);
const sectionRefs = ref<HTMLElement[]>([]);
const sectionClicked = ref<boolean[]>([]);
const isRevealing = ref(false); 

// Shutter Mirror Refs
const leftShutter = ref<HTMLElement | null>(null);
const rightShutter = ref<HTMLElement | null>(null);
const shutterVisible = ref(false);

const setSectionRef = (el: any, index: number) => {
    if (el) {
        sectionRefs.value[index] = el;
        if (observer) observer.observe(el);
    }
};

const handleSectionClick = (index: number) => {
    if (!sectionClicked.value[index]) {
        sectionClicked.value[index] = true;
    }
};

const visibleSections = ref<Set<number>>(new Set());
let observer: IntersectionObserver | null = null;
let lenis: Lenis | null = null;

const updateDimensions = () => {
    if (typeof window !== 'undefined') {
        windowWidth.value = window.innerWidth;
        windowHeight.value = window.innerHeight;
    }
};

onMounted(async () => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    if (templateId.value && !currentTemplate.value) {
        await store.fetchTemplate(templateId.value);
    }
    
    // Observer for scroll-based entrance animations
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const index = parseInt((entry.target as HTMLElement).dataset.index || '-1');
            if (entry.isIntersecting && index !== -1) {
                visibleSections.value.add(index);
            }
        });
    }, { 
        threshold: 0.15,
        rootMargin: '10% 0px 10% 0px' 
    });

    // Initialize Lenis - UNICORN STANDARD CONFIG
    if (scrollContainer.value) {
        lenis = new Lenis({
            wrapper: scrollContainer.value,
            content: scrollContainer.value.firstElementChild as HTMLElement,
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            touchMultiplier: 2,
            infinite: false,
        });

        // Initially lock Lenis
        lenis.stop();

        const scrollLoop = (time: number) => {
            lenis?.raf(time);
            requestAnimationFrame(scrollLoop);
        };
        requestAnimationFrame(scrollLoop);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
    if (observer) observer.disconnect();
    if (lenis) lenis.destroy();
    window.removeEventListener('resize', updateDimensions);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

/**
 * TRUE Z-STACK REVEAL (Unicorn Standard)
 * Mirrors Section 1 while concurrently scrolling to Section 2.
 */
const handleOpenInvitation = async (clickedElement: any) => {
    if (openBtnTriggered.value) return;
    openBtnTriggered.value = true;
    
    const coverSection = orderedSections.value[0];
    const elements = coverSection?.elements || [];
    let triggerDelay = 0;

    elements.forEach((el: any) => {
        if (el.animationTrigger === 'open_btn') {
            const total = (el.animationDuration || 1000) + (el.animationDelay || 0);
            if (total > triggerDelay) triggerDelay = total;
        }
    });
    
    setTimeout(async () => {
        isOpened.value = true;
        isRevealing.value = true;
        shutterVisible.value = true;
        
        await nextTick();
        
        const coverEl = sectionRefs.value[0];
        const nextEl = sectionRefs.value[1]; // Section 2 (Content)
        const effect = coverSection?.transitionEffect || 'split-screen';
        const duration = (coverSection?.transitionDuration || 1500) / 1000;

        if (!coverEl) {
            finalizeAndUnlock();
            return;
        }

        // UNICORN TIMELINE: Synchronized Reveal + Scroll
        const tl = gsap.timeline({
            onComplete: finalizeAndUnlock,
            defaults: { duration, ease: "expo.inOut" }
        });

        if (effect === 'split-screen' && leftShutter.value && rightShutter.value) {
            // Frame 0: Hide real Section 1 to reveal the twinning shutters
            gsap.set(coverEl, { opacity: 0 });
            
            // Frame 1 to N: Concurrent Motion
            tl.to(leftShutter.value, { xPercent: -100.5, force3D: true }, 0);
            tl.to(rightShutter.value, { xPercent: 100.5, force3D: true }, 0);
            
            // DETERMINISTIC LANDING: Scroll to Section 2 Offset
            if (lenis && scrollContainer.value) {
                lenis.start();
                tl.to(scrollContainer.value, { 
                    scrollTo: { y: coverHeight.value, autoKill: false },
                    onUpdate: () => lenis?.notify() 
                }, 0);
            }
        } 
        else if (effect === 'cards' || effect === 'reveal') {
            gsap.set(coverEl, { opacity: index === 0 ? 1 : 1 }); // Prep
            tl.to(coverEl, { y: -windowHeight.value, opacity: 0, scale: 0.9, duration: 1.2 }, 0);
            if (lenis) {
                lenis.start();
                tl.to(scrollContainer.value, { scrollTo: coverHeight.value }, 0);
            }
        }
        else {
            // General Case
            tl.to(coverEl, { opacity: 0, duration: 0.8 });
            if (lenis) {
                lenis.start();
                tl.to(scrollContainer.value, { scrollTo: coverHeight.value }, 0);
            }
        }

        function finalizeAndUnlock() {
            shutterVisible.value = false;
            isRevealing.value = false;
            // Real Section 1 remains in the DOM flow at opacity 0 or visible for scroll-back
            gsap.set(coverEl, { opacity: 1 }); 
            if (lenis) {
                lenis.start();
                lenis.resize();
                // Ensure interaction is back
                scrollContainer.value?.classList.remove('pointer-events-none');
            }
        }
    }, triggerDelay);
};

// Dimensions & Scaling Engineering
const windowWidth = ref(0);
const windowHeight = ref(0);

const scaleFactor = computed(() => {
    if (!windowWidth.value) return 1;
    const widthRatio = windowWidth.value / CANVAS_WIDTH;
    const heightRatio = windowHeight.value / CANVAS_HEIGHT;
    const isPortrait = windowHeight.value > windowWidth.value;
    if (isPortrait) return widthRatio;
    return Math.min(isFullscreen.value ? Math.min(heightRatio, widthRatio) : 1, heightRatio);
});

const coverHeight = computed(() => {
    if (typeof scaleFactor.value !== 'number') return CANVAS_HEIGHT; 
    const isPortrait = windowHeight.value > windowWidth.value;
    if (!isPortrait && !isFullscreen.value) return CANVAS_HEIGHT;
    const targetHeight = windowHeight.value / scaleFactor.value;
    return Math.max(CANVAS_HEIGHT, targetHeight);
});

const getElementStyle = (el: any, sectionIndex: number) => {
    const baseStyle = {
        left: `${el.position.x}px`,
        top: `${el.position.y}px`,
        width: `${el.size.width}px`,
        height: `${el.size.height}px`,
        zIndex: el.zIndex || 1,
    };

    // Special handling for Page 1 Tall Displays
    if (sectionIndex === 0 && windowHeight.value > windowWidth.value) {
         const currentCoverHeight = coverHeight.value;
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

const getButtonStyle = (element: any) => {
    if (element.openInvitationConfig) {
        const config = element.openInvitationConfig;
        const color = config.buttonColor || '#000000';
        
        let css: any = {
            fontFamily: config.fontFamily || 'Inter',
            fontSize: `${config.fontSize || 16}px`,
            color: config.textColor || '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
            cursor: 'pointer', border: 'none'
        };

        const shape = config.buttonShape || 'pill';
        if (shape === 'pill' || shape === 'stadium') css.borderRadius = '200px';
        else if (shape === 'rounded') css.borderRadius = '16px';
        else css.borderRadius = '0px';

        if (config.buttonStyle === 'outline') {
            css.backgroundColor = 'transparent';
            css.border = `2px solid ${color}`;
            css.color = color;
        } else if (config.buttonStyle === 'glass') {
            css.backgroundColor = 'rgba(255,255,255,0.1)';
            css.backdropFilter = 'blur(20px)';
            css.border = '1px solid rgba(255,255,255,0.2)';
        } else {
            css.backgroundColor = color;
        }
        return css;
    } 
    return {
        backgroundColor: '#000000', color: '#ffffff', borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', border: 'none'
    };
};

const toggleFullscreen = () => {
    if (!mainViewport.value) return;
    if (!document.fullscreenElement) {
        mainViewport.value.requestFullscreen().catch(console.error);
    } else {
        document.exitFullscreen().catch(console.error);
    }
};

const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
    updateDimensions();
};

const goBack = () => router.push(`/editor/${templateId.value}`);
</script>

<template>
    <div 
        ref="mainViewport" 
        class="h-screen w-screen bg-black flex flex-col items-center justify-center overflow-hidden"
    >
        <!-- UNICORN SCROLL ARCHITECTURE (TRUE Z-STACK) -->
        <div 
            ref="scrollContainer"
            class="scroll-container flex-1 w-full h-full overflow-y-auto overflow-x-hidden"
        >
            <div 
                class="invitation-wrapper flex flex-col flex-shrink-0 relative mx-auto"
                :style="{
                    width: `${CANVAS_WIDTH}px`,
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: 'top center',
                }"
            >
                <!-- Controls (Floating UI) -->
                <div v-if="!isFullscreen" class="absolute top-6 left-0 w-full px-6 flex justify-between z-[500] pointer-events-none">
                    <button class="p-3 text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-xl transition-all pointer-events-auto border border-white/20 shadow-2xl" @click="goBack"><ArrowLeft class="w-6 h-6" /></button>
                    <button class="p-3 text-white bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-xl transition-all pointer-events-auto border border-white/20 shadow-2xl" @click="toggleFullscreen"><Maximize2 class="w-6 h-6" /></button>
                </div>

                <!-- UNIFIED DOM STACK (Section 1 to N) -->
                <div 
                    v-for="(section, index) in orderedSections" :key="section.key"
                    :ref="(el) => setSectionRef(el, index)" :data-index="index"
                    class="relative overflow-hidden flex-shrink-0 page-section w-full"
                    :style="{
                        height: `${index === 0 ? coverHeight : CANVAS_HEIGHT}px`,
                        backgroundColor: section.backgroundColor || '#ffffff',
                        backgroundImage: section.backgroundUrl ? `url(${section.backgroundUrl})` : 'none',
                        backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 10,
                    }"
                >
                    <div v-if="section.overlayOpacity" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                    
                    <div v-for="el in section.elements || []" :key="el.id" class="absolute pointer-events-auto" :style="getElementStyle(el, index)">
                        <AnimatedElement
                            :animation="el.animation || 'none'" :loop-animation="el.loopAnimation"
                            :delay="el.animationDelay || 0" :duration="el.animationDuration || 800"
                            class="w-full h-full"
                            :trigger-mode="(!el.animationTrigger || el.animationTrigger === 'scroll') ? 'auto' : 'manual'"
                            :force-trigger="el.animationTrigger === 'click' ? (sectionClicked[index] || false) : el.animationTrigger === 'open_btn' ? openBtnTriggered : false"
                            :element-id="el.id"
                        >
                            <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                <img v-if="el.type === 'image' && el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity ?? 1 }" draggable="false" />
                                <div v-else-if="el.type === 'text' && el.textStyle" class="w-full h-full flex items-center" :style="{ fontSize: `${el.textStyle.fontSize}px`, fontFamily: el.textStyle.fontFamily, fontStyle: el.textStyle.fontStyle, color: el.textStyle.color, textAlign: el.textStyle.textAlign }">{{ el.content }}</div>
                                <div v-else-if="el.type === 'icon' && el.iconStyle" class="w-full h-full flex items-center justify-center" :style="{ color: el.iconStyle.iconColor }"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="iconPaths[el.iconStyle.iconName] || iconPaths['heart']" /></svg></div>
                                <button v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:scale-105 active:scale-95 transition-all" @click="handleOpenInvitation(el)">{{ el.openInvitationConfig?.buttonText || el.content || 'Open Invitation' }}</button>
                            </div>
                        </AnimatedElement>
                    </div>
                </div>

                <!-- HARDWARE-ACCELERATED SHUTTER TWINS (Mirror of Section 1) -->
                <div v-if="shutterVisible" class="absolute top-0 left-0 w-full z-[400] pointer-events-none overflow-hidden" :style="{ height: `${coverHeight}px` }">
                    <!-- Left Shutter -->
                    <div ref="leftShutter" class="absolute top-0 left-0 w-full h-full will-change-transform" :style="{ clipPath: 'inset(0 50% 0 0)', backgroundColor: orderedSections[0]?.backgroundColor || '#fff', backgroundImage: orderedSections[0]?.backgroundUrl ? `url(${orderedSections[0].backgroundUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }">
                        <div v-if="orderedSections[0]?.overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                        <div v-for="el in orderedSections[0]?.elements || []" :key="'shutter-l-'+el.id" class="absolute" :style="getElementStyle(el, 0)">
                             <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                 <img v-if="el.type === 'image' && el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity ?? 1 }" />
                                 <div v-else-if="el.type === 'text' && el.textStyle" class="w-full h-full flex items-center" :style="{ fontSize: `${el.textStyle.fontSize}px`, fontFamily: el.textStyle.fontFamily, color: el.textStyle.color, textAlign: el.textStyle.textAlign }">{{ el.content }}</div>
                             </div>
                        </div>
                    </div>
                    <!-- Right Shutter -->
                    <div ref="rightShutter" class="absolute top-0 left-0 w-full h-full will-change-transform" :style="{ clipPath: 'inset(0 0 0 50%)', backgroundColor: orderedSections[0]?.backgroundColor || '#fff', backgroundImage: orderedSections[0]?.backgroundUrl ? `url(${orderedSections[0].backgroundUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }">
                        <div v-if="orderedSections[0]?.overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                        <div v-for="el in orderedSections[0]?.elements || []" :key="'shutter-r-'+el.id" class="absolute" :style="getElementStyle(el, 0)">
                             <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                 <img v-if="el.type === 'image' && el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity ?? 1 }" />
                                 <div v-else-if="el.type === 'text' && el.textStyle" class="w-full h-full flex items-center" :style="{ fontSize: `${el.textStyle.fontSize}px`, fontFamily: el.textStyle.fontFamily, color: el.textStyle.color, textAlign: el.textStyle.textAlign }">{{ el.content }}</div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <button v-if="isFullscreen" class="fixed top-8 right-8 z-[600] p-4 bg-black/50 text-white rounded-full transition-all border border-white/20 hover:bg-black/80" @click="toggleFullscreen"><Minimize2 class="w-7 h-7" /></button>
    </div>
</template>

<style scoped>
.scroll-container::-webkit-scrollbar { width: 0; height: 0; }
.scroll-container { scrollbar-width: none; -ms-overflow-style: none; }
/* Hardware Acceleration Base */
.page-section, .will-change-transform {
    backface-visibility: hidden;
    transform: translateZ(0); 
    perspective: 1000px;
}
</style>
