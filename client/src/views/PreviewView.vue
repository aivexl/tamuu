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
import * as _anime from 'animejs';
const anime: any = (_anime as any).default || _anime;
import Lenis from 'lenis';

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

// State
const isOpened = ref(false); 
const isRevealing = ref(false); 
const shutterVisible = ref(false);
const openBtnTriggered = ref(false);

const sectionRefs = ref<HTMLElement[]>([]);
const sectionClicked = ref<boolean[]>([]);

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
    }, { threshold: 0.1 });

    // Initialize Lenis
    if (scrollContainer.value) {
        lenis = new Lenis({
            wrapper: scrollContainer.value,
            content: scrollContainer.value.firstElementChild as HTMLElement,
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });

        // Initially lock Lenis until opened
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
 * TRUE OVERLAY REVEAL
 * Section 1 is an absolute overlay on top of Section 2.
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
        isRevealing.value = true;
        shutterVisible.value = true;
        
        await nextTick();
        
        const coverEl = sectionRefs.value[0];
        const effect = coverSection?.transitionEffect || 'split-screen';
        const duration = (coverSection?.transitionDuration || 1500) / 1000;

        if (!coverEl) {
            finalizeAndUnlock();
            return;
        }

        const tl = gsap.timeline({
            onComplete: finalizeAndUnlock,
            defaults: { duration, ease: "expo.inOut" }
        });

        const leftShutter = sectionRefs.value[1000]; // Reusing refs for shutters
        const rightShutter = sectionRefs.value[1001];

        if (effect === 'split-screen' && leftShutter && rightShutter) {
            // Hide real Section 1
            gsap.set(coverEl, { opacity: 0 });
            
            // Split Mirror Shutters
            tl.to(leftShutter, { xPercent: -100.5, force3D: true }, 0);
            tl.to(rightShutter, { xPercent: 100.5, force3D: true }, 0);
        } else {
            tl.to(coverEl, { opacity: 0, scale: 1.1, duration: 1 });
        }

        function finalizeAndUnlock() {
            shutterVisible.value = false;
            isRevealing.value = false;
            isOpened.value = true; 
            if (lenis) {
                lenis.start();
                lenis.resize();
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
        return {
            fontFamily: config.fontFamily || 'Inter', fontSize: `${config.fontSize || 16}px`,
            color: config.textColor || '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%', transition: 'all 0.4s ease', cursor: 'pointer', border: 'none',
            borderRadius: config.buttonShape === 'pill' ? '200px' : config.buttonShape === 'rounded' ? '12px' : '0px',
            backgroundColor: config.buttonStyle === 'outline' ? 'transparent' : color,
            border: config.buttonStyle === 'outline' ? `2px solid ${color}` : 'none'
        };
    } 
    return { backgroundColor: '#000000', color: '#ffffff', borderRadius: '8px', border: 'none', width: '100%', height: '100%' };
};

const toggleFullscreen = () => {
    if (!mainViewport.value) return;
    if (!document.fullscreenElement) mainViewport.value.requestFullscreen();
    else document.exitFullscreen();
};

const handleFullscreenChange = () => { isFullscreen.value = !!document.fullscreenElement; updateDimensions(); };
const goBack = () => router.push(`/editor/${templateId.value}`);
</script>

<template>
    <div ref="mainViewport" class="h-screen w-screen bg-black flex flex-col items-center justify-center overflow-hidden">
        
        <!-- SCROLL CONTAINER -->
        <div ref="scrollContainer" class="scroll-container flex-1 w-full h-full overflow-y-auto overflow-x-hidden">
            <div 
                class="invitation-wrapper flex flex-col flex-shrink-0 relative mx-auto" 
                :style="{ width: `${CANVAS_WIDTH}px`, transform: `scale(${scaleFactor})`, transformOrigin: 'top center' }"
            >
                <!-- Floating Controls -->
                <div v-if="!isFullscreen" class="absolute top-6 left-0 w-full px-6 flex justify-between z-[500] pointer-events-none">
                    <button class="p-3 bg-black/40 text-white rounded-full backdrop-blur-xl pointer-events-auto border border-white/10 shadow-xl" @click="goBack"><ArrowLeft class="w-6 h-6" /></button>
                    <button class="p-3 bg-black/40 text-white rounded-full backdrop-blur-xl pointer-events-auto border border-white/10 shadow-xl" @click="toggleFullscreen"><Maximize2 class="w-6 h-6" /></button>
                </div>

                <!-- MAIN VERTICAL FLOW -->
                <div class="main-flow flex flex-col w-full relative">
                    
                    <!-- THE TRUE OVERLAY (Section 1 / Cover) -->
                    <!-- Positioned absolute at the top of the flow -->
                    <div 
                        v-if="orderedSections[0]" 
                        class="absolute top-0 left-0 w-full z-[100] overflow-hidden" 
                        :style="{ height: `${coverHeight}px`, opacity: isOpened ? 0 : 1, pointerEvents: isOpened ? 'none' : 'auto' }"
                    >
                        <div 
                            :ref="(el) => setSectionRef(el, 0)" :data-index="0"
                            class="w-full h-full relative overflow-hidden shadow-2xl"
                            :style="{ backgroundColor: orderedSections[0].backgroundColor || '#fff', backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
                        >
                            <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                            <div v-for="el in orderedSections[0].elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, 0)">
                                <!-- IMMEDIATE MODE FOR COVER ELEMENTS (Guarantee Visibility) -->
                                <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" :immediate="true" :element-id="el.id">
                                    <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                        <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                        <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color, textAlign: el.textStyle?.textAlign }">{{ el.content }}</div>
                                        <button v-else-if="el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:scale-105 active:scale-95 transition-all shadow-lg" @click="handleOpenInvitation(el)">{{ el.openInvitationConfig?.buttonText || 'Buka Undangan' }}</button>
                                    </div>
                                </AnimatedElement>
                            </div>
                        </div>

                        <!-- Hardware Mirror Shutters inside the Absolute Overlay -->
                        <div v-if="shutterVisible" class="absolute inset-0 z-30 pointer-events-none overflow-hidden h-full w-full">
                             <div :ref="(el) => sectionRefs[1000] = (el as any)" class="absolute inset-0 will-change-transform" :style="{ clipPath: 'inset(0 50% 0 0)', backgroundColor: orderedSections[0].backgroundColor, backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }">
                                 <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                                 <div v-for="el in orderedSections[0].elements || []" :key="'sh-l-'+el.id" class="absolute" :style="getElementStyle(el, 0)">
                                     <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                        <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                        <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color, textAlign: el.textStyle?.textAlign }">{{ el.content }}</div>
                                     </div>
                                 </div>
                             </div>
                             <div :ref="(el) => sectionRefs[1001] = (el as any)" class="absolute inset-0 will-change-transform" :style="{ clipPath: 'inset(0 0 0 50%)', backgroundColor: orderedSections[0].backgroundColor, backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }">
                                 <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                                 <div v-for="el in orderedSections[0].elements || []" :key="'sh-r-'+el.id" class="absolute" :style="getElementStyle(el, 0)">
                                     <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                        <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                        <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color, textAlign: el.textStyle?.textAlign }">{{ el.content }}</div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <!-- THE VERTICAL FLOW (Section 2 to N) -->
                    <!-- Section 2 starts at top:0 visually, hiding behind S1 -->
                    <div 
                        v-for="(section, index) in orderedSections.slice(1)" :key="section.key" 
                        :ref="(el) => setSectionRef(el, index + 1)" :data-index="index + 1" 
                        class="relative overflow-hidden flex-shrink-0 page-section w-full" 
                        :style="{ height: `${index === 0 ? coverHeight : CANVAS_HEIGHT}px`, backgroundColor: section.backgroundColor || '#fff', backgroundImage: `url(${section.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 1 }"
                    >
                        <div v-if="section.overlayOpacity" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                        <div v-for="el in section.elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, index + 1)">
                            <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" :trigger-mode="index === 0 ? 'manual' : 'auto'" :force-trigger="index === 0 ? (isOpened || isRevealing) : false" :element-id="el.id">
                                <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                    <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                    <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color, textAlign: el.textStyle?.textAlign }">{{ el.content }}</div>
                                    <div v-else-if="el.type === 'icon'" class="w-full h-full flex items-center justify-center" :style="{ color: el.iconStyle?.iconColor }"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="iconPaths[el.iconStyle?.iconName] || ''" /></svg></div>
                                </div>
                            </AnimatedElement>
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
.scroll-container { scrollbar-width: none; -ms-overflow-style: none; }
.page-section { backface-visibility: hidden; transform: translateZ(0); }
.will-change-transform { will-change: transform; transition: none; }
</style>
