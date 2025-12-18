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

// Atomic State
const isOpened = ref(false); // Controls reveal state
const openBtnTriggered = ref(false);
const sectionRefs = ref<HTMLElement[]>([]);
const sectionClicked = ref<boolean[]>([]);
const isRevealing = ref(false); 

// Shutter Mirror Refs (GPU Mask)
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
 * ATOMIC Z-STACK REVEAL
 * Section 2 is physically behind Section 1. No scroll motion occurs.
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

        // UNICORN REVEAL: Mirror Split (No Scroll Move)
        const tl = gsap.timeline({
            onComplete: finalizeAndUnlock,
            defaults: { duration, ease: "expo.inOut" }
        });

        if (effect === 'split-screen' && leftShutter.value && rightShutter.value) {
            // Hide the real Section 1 immediately so shutters take over
            gsap.set(coverEl, { opacity: 0 });
            
            // Split the mirrors - Section 2 is revealed INSTANTLY underneath
            tl.to(leftShutter.value, { xPercent: -101, force3D: true }, 0);
            tl.to(rightShutter.value, { xPercent: 101, force3D: true }, 0);
        } 
        else if (effect === 'cards' || effect === 'reveal') {
            tl.to(coverEl, { y: -windowHeight.value, opacity: 0, scale: 0.95, duration: 1.2 }, 0);
        }
        else {
            tl.to(coverEl, { opacity: 0, duration: 0.8 });
        }

        function finalizeAndUnlock() {
            shutterVisible.value = false;
            isRevealing.value = false;
            isOpened.value = true; // Permanent reveal state
            
            // Allow scroll-up by making original Section 1 interactable but open
            gsap.set(coverEl, { 
                opacity: 1, 
                pointerEvents: 'none' // Elements in Section 1 shouldn't block Section 2 anymore
            }); 
            
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
        
        <!-- UNICORN SCROLL ENGINE -->
        <div ref="scrollContainer" class="scroll-container flex-1 w-full h-full overflow-y-auto overflow-x-hidden">
            <div class="invitation-wrapper flex flex-col flex-shrink-0 relative mx-auto" :style="{ width: `${CANVAS_WIDTH}px`, transform: `scale(${scaleFactor})`, transformOrigin: 'top center' }">
                
                <!-- Floating Controls -->
                <div v-if="!isFullscreen" class="absolute top-6 left-0 w-full px-6 flex justify-between z-[500] pointer-events-none">
                    <button class="p-3 bg-black/40 text-white rounded-full backdrop-blur-xl pointer-events-auto shadow-2xl" @click="goBack"><ArrowLeft class="w-6 h-6" /></button>
                    <button class="p-3 bg-black/40 text-white rounded-full backdrop-blur-xl pointer-events-auto shadow-2xl" @click="toggleFullscreen"><Maximize2 class="w-6 h-6" /></button>
                </div>

                <!-- UNIFIED STACK FLOW -->
                <div class="atomic-flow-container flex flex-col w-full">
                    
                    <!-- THE ATOMIC Z-STACK BLOCK (Section 1 & 2) -->
                    <div class="relative w-full overflow-hidden" :style="{ height: `${coverHeight}px` }">
                        
                        <!-- Physical Base: Section 2 (Isi Pertama) -->
                        <div v-if="orderedSections[1]" class="absolute inset-0 z-10">
                            <div 
                                :ref="(el) => setSectionRef(el, 1)" :data-index="1"
                                class="w-full h-full relative overflow-hidden"
                                :style="{ backgroundColor: orderedSections[1].backgroundColor || '#fff', backgroundImage: `url(${orderedSections[1].backgroundUrl})`, backgroundSize: 'cover' }"
                            >
                                <div v-if="orderedSections[1].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[1].overlayOpacity }" />
                                <div v-for="el in orderedSections[1].elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, 1)">
                                    <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" :trigger-mode="(!el.animationTrigger || el.animationTrigger === 'scroll') ? 'auto' : 'manual'" :force-trigger="isRevealing || isOpened" :element-id="el.id">
                                        <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                            <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                            <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color }">{{ el.content }}</div>
                                            <div v-else-if="el.type === 'icon'" class="w-full h-full flex items-center justify-center" :style="{ color: el.iconStyle?.iconColor }"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="iconPaths[el.iconStyle?.iconName] || ''" /></svg></div>
                                        </div>
                                    </AnimatedElement>
                                </div>
                            </div>
                        </div>

                        <!-- Protective Layer: Section 1 (Cover) -->
                        <div v-if="orderedSections[0]" class="absolute inset-0 z-20" :style="{ opacity: isOpened ? 0 : 1 }">
                            <div 
                                :ref="(el) => setSectionRef(el, 0)" :data-index="0"
                                class="w-full h-full relative overflow-hidden shadow-2xl"
                                :style="{ backgroundColor: orderedSections[0].backgroundColor || '#fff', backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover' }"
                            >
                                <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                                <div v-for="el in orderedSections[0].elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, 0)">
                                    <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" trigger-mode="manual" :force-trigger="openBtnTriggered" :element-id="el.id">
                                        <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                            <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                            <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color }">{{ el.content }}</div>
                                            <button v-else-if="el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:scale-105 active:scale-95 transition-all" @click="handleOpenInvitation(el)">{{ el.openInvitationConfig?.buttonText || 'Open' }}</button>
                                        </div>
                                    </AnimatedElement>
                                </div>
                            </div>
                        </div>

                        <!-- GPU Mirror Shutters (Active Transition Only) -->
                        <div v-if="shutterVisible" class="absolute inset-0 z-30 pointer-events-none overflow-hidden">
                             <!-- Left Half Mirror of Section 1 -->
                             <div ref="leftShutter" class="absolute inset-0" :style="{ clipPath: 'inset(0 50% 0 0)', backgroundColor: orderedSections[0].backgroundColor, backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover' }">
                                 <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                                 <div v-for="el in orderedSections[0].elements || []" :key="'sl-'+el.id" class="absolute" :style="getElementStyle(el, 0)">
                                     <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                        <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                        <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color }">{{ el.content }}</div>
                                     </div>
                                 </div>
                             </div>
                             <!-- Right Half Mirror of Section 1 -->
                             <div ref="rightShutter" class="absolute inset-0" :style="{ clipPath: 'inset(0 0 0 50%)', backgroundColor: orderedSections[0].backgroundColor, backgroundImage: `url(${orderedSections[0].backgroundUrl})`, backgroundSize: 'cover' }">
                                 <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                                 <div v-for="el in orderedSections[0].elements || []" :key="'sr-'+el.id" class="absolute" :style="getElementStyle(el, 0)">
                                     <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                        <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                        <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color }">{{ el.content }}</div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <!-- Subsequent Content (Section 3 to N) -->
                    <div v-for="(section, index) in orderedSections.slice(2)" :key="section.key" :ref="(el) => setSectionRef(el, index + 2)" :data-index="index + 2" class="relative overflow-hidden flex-shrink-0 page-section w-full" :style="{ height: `${CANVAS_HEIGHT}px`, backgroundColor: section.backgroundColor || '#fff', backgroundImage: `url(${section.backgroundUrl})`, backgroundSize: 'cover' }">
                        <div v-if="section.overlayOpacity" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                        <div v-for="el in section.elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, index + 2)">
                            <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="w-full h-full" trigger-mode="auto" :element-id="el.id">
                                <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                    <img v-if="el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity }" />
                                    <div v-else-if="el.type === 'text'" class="w-full h-full flex items-center" :style="{ fontSize: el.textStyle?.fontSize+'px', fontFamily: el.textStyle?.fontFamily, color: el.textStyle?.color }">{{ el.content }}</div>
                                    <div v-else-if="el.type === 'icon'" class="w-full h-full flex items-center justify-center" :style="{ color: el.iconStyle?.iconColor }"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="iconPaths[el.iconStyle?.iconName] || ''" /></svg></div>
                                </div>
                            </AnimatedElement>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <button v-if="isFullscreen" class="fixed top-8 right-8 z-[600] p-4 bg-black/50 text-white rounded-full border border-white/20 shadow-2xl hover:bg-black/80" @click="toggleFullscreen"><Minimize2 class="w-7 h-7" /></button>
    </div>
</template>

<style scoped>
.scroll-container::-webkit-scrollbar { width: 0; height: 0; }
.scroll-container { scrollbar-width: none; -ms-overflow-style: none; }
.page-section, .absolute { backface-visibility: hidden; transform: translateZ(0); }
</style>
