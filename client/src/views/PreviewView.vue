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

// Unicorn State
const isOpened = ref(false); 
const openBtnTriggered = ref(false);
const sectionRefs = ref<HTMLElement[]>([]);
const sectionClicked = ref<boolean[]>([]);
const isRevealing = ref(false); 

// Shutter Mirror Refs (GPU Masking)
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
    
    // Observer for scroll-based animations
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const index = parseInt((entry.target as HTMLElement).dataset.index || '-1');
            if (entry.isIntersecting && index !== -1) {
                visibleSections.value.add(index);
            }
        });
    }, { 
        threshold: 0.1,
        rootMargin: '20% 0px 20% 0px' 
    });

    // Initialize Lenis - UNICORN STANDARD CONFIG
    if (scrollContainer.value) {
        lenis = new Lenis({
            wrapper: scrollContainer.value,
            content: scrollContainer.value.firstElementChild as HTMLElement,
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            touchMultiplier: 2,
        });

        // Hard lock until opened
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
 * PURE ATOMIC Z-STACK REVEAL
 * Section 1 = Cover. Section 2 revealed immediately behind.
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

        if (effect === 'split-screen' && leftShutter.value && rightShutter.value) {
            // Frame 0: Real Section 1 hidden, mirrored shutters take over
            gsap.set(coverEl, { opacity: 0 });
            
            // Frame 1 to N: SHUTTER SPLIT (Section 2 is already there, no scroll needed)
            tl.to(leftShutter.value, { xPercent: -100.5, force3D: true }, 0);
            tl.to(rightShutter.value, { xPercent: 100.5, force3D: true }, 0);
        } else {
            // General Fade Reveal
            tl.to(coverEl, { opacity: 0, scale: 1.1, filter: 'blur(20px)', duration: 1 });
        }

        function finalizeAndUnlock() {
            shutterVisible.value = false;
            isRevealing.value = false;
            isOpened.value = true; 
            
            // Allow scroll-up to see opened Section 1
            gsap.set(coverEl, { opacity: 0.1 }); // Keep ghost of cover or 0
            
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

    // Responsive element redistribution for Page 1 Tall Displays
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
    if (!document.fullscreenElement) {
        mainViewport.value.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen().catch(err => console.error(err));
    }
};

const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
    updateDimensions();
};

const goBack = () => router.push(`/editor/${templateId.value}`);
</script>

<template>
    <div ref="mainViewport" class="h-screen w-screen bg-black flex flex-col items-center justify-center overflow-hidden">
        
        <!-- UNICORN SCROLL CONTAINER -->
        <div ref="scrollContainer" class="scroll-container flex-1 w-full h-full overflow-y-auto overflow-x-hidden">
            <div 
                class="invitation-wrapper flex flex-col flex-shrink-0 relative mx-auto" 
                :style="{ width: `${CANVAS_WIDTH}px`, transform: `scale(${scaleFactor})`, transformOrigin: 'top center' }"
            >
                <!-- Floating Logic Controls -->
                <div v-if="!isFullscreen" class="absolute top-6 left-0 w-full px-6 flex justify-between z-[500] pointer-events-none">
                    <button class="p-3 bg-black/40 text-white rounded-full backdrop-blur-xl pointer-events-auto border border-white/10 shadow-xl" @click="goBack"><ArrowLeft class="w-6 h-6" /></button>
                    <button class="p-3 bg-black/40 text-white rounded-full backdrop-blur-xl pointer-events-auto border border-white/10 shadow-xl" @click="toggleFullscreen"><Maximize2 class="w-6 h-6" /></button>
                </div>

                <!-- ATOMIC STACKED FLOW -->
                <div class="atomic-flow flex flex-col w-full">
                    
                    <!-- THE Z-STACK BLOCK (Section 1 and 2 Share Top-Space) -->
                    <div class="relative w-full overflow-hidden flex-shrink-0 z-stack-block" :style="{ height: `${coverHeight}px` }">
                        
                        <!-- Layer 0: Section 2 (Isi Pertama) - Directly Behind -->
                        <div v-if="orderedSections[1]" class="absolute inset-0 z-10">
                            <div 
                                :ref="(el) => setSectionRef(el, 1)" :data-index="1"
                                class="w-full h-full relative overflow-hidden"
                                :style="{ backgroundColor: orderedSections[1].backgroundColor || '#fff', backgroundImage: `url(${orderedSections[1].backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
                            >
                                <div v-if="orderedSections[1].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[1].overlayOpacity }" />
                                <div v-for="el in orderedSections[1].elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, 1)">
                                    <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" :trigger-mode="(!el.animationTrigger || el.animationTrigger === 'scroll') ? 'auto' : 'manual'" :force-trigger="isOpened || isRevealing" :element-id="el.id">
                                        <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                            <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                            <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color, textAlign: el.textStyle?.textAlign }">{{ el.content }}</div>
                                            <div v-else-if="el.type === 'icon'" class="w-full h-full flex items-center justify-center" :style="{ color: el.iconStyle?.iconColor }"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="iconPaths[el.iconStyle?.iconName] || ''" /></svg></div>
                                        </div>
                                    </AnimatedElement>
                                </div>
                            </div>
                        </div>

                        <!-- Layer 1: Section 1 (Cover) - The Shutter Cover -->
                        <div v-if="orderedSections[0]" class="absolute inset-0 z-20" :style="{ opacity: isOpened ? 0 : 1 }">
                            <div 
                                :ref="(el) => setSectionRef(el, 0)" :data-index="0"
                                class="w-full h-full relative overflow-hidden shadow-2xl"
                                :style="{ backgroundColor: orderedSections[0].backgroundColor || '#fff', backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
                            >
                                <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                                <div v-for="el in orderedSections[0].elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, 0)">
                                    <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" trigger-mode="auto" :element-id="el.id">
                                        <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                            <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                            <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color, textAlign: el.textStyle?.textAlign }">{{ el.content }}</div>
                                            <button v-else-if="el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:scale-105 active:scale-95 transition-all shadow-lg" @click="handleOpenInvitation(el)">{{ el.openInvitationConfig?.buttonText || 'Buka Undangan' }}</button>
                                        </div>
                                    </AnimatedElement>
                                </div>
                            </div>
                        </div>

                        <!-- Hardware-Accelerated Twin Shutters (Mirror of Section 1) -->
                        <div v-if="shutterVisible" class="absolute inset-0 z-30 pointer-events-none overflow-hidden h-full w-full">
                             <!-- Left Half -->
                             <div ref="leftShutter" class="absolute inset-0 will-change-transform" :style="{ clipPath: 'inset(0 50% 0 0)', backgroundColor: orderedSections[0].backgroundColor, backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }">
                                 <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                                 <div v-for="el in orderedSections[0].elements || []" :key="'sh-l-'+el.id" class="absolute" :style="getElementStyle(el, 0)">
                                     <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                        <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                        <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color, textAlign: el.textStyle?.textAlign }">{{ el.content }}</div>
                                     </div>
                                 </div>
                             </div>
                             <!-- Right Half -->
                             <div ref="rightShutter" class="absolute inset-0 will-change-transform" :style="{ clipPath: 'inset(0 0 0 50%)', backgroundColor: orderedSections[0].backgroundColor, backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }">
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

                    <!-- Continuous Flow (Section 3 to N) -->
                    <div 
                        v-for="(section, index) in orderedSections.slice(2)" :key="section.key" 
                        :ref="(el) => setSectionRef(el, index + 2)" :data-index="index + 2" 
                        class="relative overflow-hidden flex-shrink-0 page-section w-full" 
                        :style="{ height: `${CANVAS_HEIGHT}px`, backgroundColor: section.backgroundColor || '#fff', backgroundImage: `url(${section.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
                    >
                        <div v-if="section.overlayOpacity" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                        <div v-for="el in section.elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, index + 2)">
                            <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" trigger-mode="auto" :element-id="el.id">
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

        <button v-if="isFullscreen" class="fixed top-8 right-8 z-[600] p-4 bg-black/50 text-white rounded-full border border-white/20 shadow-2xl hover:bg-black/80 transition-all" @click="toggleFullscreen"><Minimize2 class="w-7 h-7" /></button>
    </div>
</template>

<style scoped>
.scroll-container::-webkit-scrollbar { width: 0; height: 0; }
.scroll-container { scrollbar-width: none; -ms-overflow-style: none; }
.z-stack-block { backface-visibility: hidden; transform: translateZ(0); }
.will-change-transform { will-change: transform; transition: none; }
</style>
