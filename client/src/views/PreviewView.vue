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

// High-Precision State
const isOpened = ref(false);
const openBtnTriggered = ref(false);
const sectionRefs = ref<HTMLElement[]>([]);
const sectionClicked = ref<boolean[]>([]);
const isCoverVisible = ref(true); 
const coverTransitionDone = ref(false); 
const isRevealing = ref(false); 

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
    
    observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const index = parseInt((entry.target as HTMLElement).dataset.index || '-1');
            if (entry.isIntersecting && index !== -1) {
                visibleSections.value.add(index);
            }
        });
    }, { threshold: 0.1 });

    // Initialize Lenis TARGETING THE INTERNAL SCROLL CONTAINER
    if (scrollContainer.value) {
        lenis = new Lenis({
            wrapper: scrollContainer.value,
            content: scrollContainer.value.firstElementChild as HTMLElement,
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });

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

// Handle Open Invitation Click (Premium Sequencing)
const handleOpenInvitation = async (clickedElement: any) => {
    openBtnTriggered.value = true;
    
    // 1. Calculate and wait for element animations
    let triggerDelay = 0;
    const coverSection = orderedSections.value[0];
    const elements = coverSection?.elements || [];

    elements.forEach((el: any) => {
        if (el.animationTrigger === 'open_btn') {
            const total = (el.animationDuration || 1000) + (el.animationDelay || 0);
            if (total > triggerDelay) triggerDelay = total;
        }
    });
    
    setTimeout(async () => {
        isOpened.value = true;
        isRevealing.value = true;
        
        // Let Vue render the content layer at opacity 0 first
        await nextTick();
        
        const coverEl = sectionRefs.value[0];
        const effect = coverSection?.transitionEffect || 'none';
        const duration = (coverSection?.transitionDuration || 1000) / 1000;

        if (!coverEl) {
            isOpened.value = true;
            coverTransitionDone.value = true;
            isCoverVisible.value = false;
            return;
        }

        const finalize = () => {
            coverTransitionDone.value = true;
            isCoverVisible.value = false;
            isRevealing.value = false;
            // Force re-calc for Lenis
            lenis?.resize();
        };

        // --- DEFINITIVE PREMIUM TRANSITIONS ---
        
        if (effect === 'split-screen') {
            const parent = coverEl.parentElement;
            if (!parent) return finalize();

            const leftHalf = coverEl.cloneNode(true) as HTMLElement;
            const rightHalf = coverEl.cloneNode(true) as HTMLElement;
            
            const setupHalf = (el: HTMLElement, clip: string) => {
                el.style.position = 'absolute';
                el.style.top = '0';
                el.style.left = '0';
                el.style.width = '100%';
                el.style.height = `${coverHeight.value}px`;
                el.style.clipPath = clip;
                el.style.zIndex = '100';
                el.style.pointerEvents = 'none';
                el.style.transformOrigin = 'center center';
                parent.appendChild(el);
            };

            setupHalf(leftHalf, 'inset(0 50% 0 0)');
            setupHalf(rightHalf, 'inset(0 0 0 50%)');
            
            // Flicker-free hide
            gsap.set(coverEl, { opacity: 0 });

            const tl = gsap.timeline({ onComplete: () => { leftHalf.remove(); rightHalf.remove(); finalize(); } });
            tl.to(leftHalf, { xPercent: -100, duration, ease: "expo.inOut" });
            tl.to(rightHalf, { xPercent: 100, duration, ease: "expo.inOut" }, 0);
        } 
        else if (effect === 'cube' && sectionRefs.value[1]) {
            const nextEl = sectionRefs.value[1];
            gsap.set(mainViewport.value, { perspective: 2000 });
            const tl = gsap.timeline({ onComplete: () => { gsap.set([coverEl, nextEl], { clearProps: "all" }); finalize(); } });
            tl.to(coverEl, { rotationY: -90, x: -CANVAS_WIDTH/2, z: -CANVAS_WIDTH/2, opacity: 0, duration, ease: "power3.inOut" });
            tl.from(nextEl, { rotationY: 90, x: CANVAS_WIDTH/2, z: -CANVAS_WIDTH/2, opacity: 0, duration, ease: "power3.inOut" }, 0);
        }
        else if (effect === 'cards') {
            gsap.to(coverEl, { y: -window.innerHeight, rotate: -5, scale: 0.9, opacity: 0, duration, ease: "power4.in", onComplete: finalize });
        }
        else if (effect === 'curtain-reveal' || effect === 'curtain') {
            gsap.to(coverEl, { yPercent: -100, duration, ease: "expo.inOut", onComplete: finalize });
        }
        else if (effect === 'reveal') {
            gsap.to(coverEl, { opacity: 0, scale: 1.2, filter: 'blur(20px)', duration: duration * 1.5, ease: "sine.inOut", onComplete: finalize });
        }
        else if (effect === 'smooth-reveal') {
            gsap.to(coverEl, { opacity: 0, y: -100, duration, ease: "expo.out", onComplete: () => { finalize(); lenis?.scrollTo(0, { immediate: true }); } });
        }
        else if (effect === 'split-transition' || effect === 'slide-split') {
            anime({ targets: coverEl, translateX: '-100%', opacity: 0, duration: duration * 1000, easing: 'easeInOutExpo', complete: finalize });
        }
        else {
            finalize();
        }
    }, triggerDelay);
};

// Dimensions Handling
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
        const style = config.buttonStyle || 'elegant';
        const color = config.buttonColor || '#000000';
        const textColor = config.textColor || '#ffffff';
        
        let css: any = {
            fontFamily: config.fontFamily || 'Inter',
            fontSize: `${config.fontSize || 16}px`,
            color: textColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            border: 'none'
        };

        const shape = config.buttonShape || 'pill';
        if (shape === 'pill' || shape === 'stadium') css.borderRadius = '9999px';
        else if (shape === 'rounded') css.borderRadius = '8px';
        else css.borderRadius = '0px';

        if (style === 'outline' || style === 'minimal') {
            css.backgroundColor = 'transparent';
            css.border = `2px solid ${color}`;
            css.color = config.textColor || color; 
        } else if (style === 'glass') {
            css.backgroundColor = 'rgba(255,255,255,0.2)';
            css.backdropFilter = 'blur(10px)';
            css.border = `1px solid ${color}`;
        } else {
            css.backgroundColor = color;
        }
        return css;
    } 
    return {
        backgroundColor: element.textStyle?.color || '#000000', color: '#ffffff',
        borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', border: 'none',
        fontSize: `${element.textStyle?.fontSize || 14}px`, fontFamily: element.textStyle?.fontFamily || 'Inter'
    };
};

const toggleFullscreen = async () => {
    if (!mainViewport.value) return;
    if (!document.fullscreenElement) {
        try { await mainViewport.value.requestFullscreen(); isFullscreen.value = true; }
        catch (err) { console.error(err); }
    } else {
        await document.exitFullscreen(); isFullscreen.value = false;
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
        <!-- SCROLLABLE CONTAINER -->
        <div 
            ref="scrollContainer"
            class="scroll-container flex-1 flex justify-center w-full h-full"
            :class="coverTransitionDone ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'"
        >
            <div 
                class="invitation-wrapper flex flex-col flex-shrink-0 relative"
                :style="{
                    width: `${CANVAS_WIDTH}px`,
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: 'top center',
                }"
            >
                <!-- Controls -->
                <div v-if="!isFullscreen" class="absolute top-3 left-0 w-full px-3 flex items-start justify-between z-[120] pointer-events-none">
                    <button class="p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all pointer-events-auto" @click="goBack"><ArrowLeft class="w-5 h-5" /></button>
                    <button class="p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all pointer-events-auto" @click="toggleFullscreen"><Maximize2 class="w-5 h-5" /></button>
                </div>

                <div class="page-transition-wrapper relative w-full" :style="{ minHeight: isOpened ? '100dvh' : 'auto' }">
                    <!-- Layer 1: CONTENT (Sections 1+) -->
                    <div 
                        class="content-layer flex flex-col items-center w-full transition-opacity duration-1000 ease-in-out"
                        :class="isOpened ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
                    >
                        <div 
                            v-for="(section, index) in orderedSections.slice(1)" :key="section.key"
                            :ref="(el) => setSectionRef(el, index + 1)" :data-index="index + 1"
                            class="relative overflow-hidden flex-shrink-0 page-section w-full"
                            :style="{
                                height: `${index === 0 ? coverHeight : CANVAS_HEIGHT}px`,
                                backgroundColor: section.backgroundColor || '#ffffff',
                                backgroundImage: section.backgroundUrl ? `url(${section.backgroundUrl})` : 'none',
                                backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 10,
                            }"
                        >
                            <div v-if="section.overlayOpacity" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                            
                            <div v-for="el in section.elements || []" :key="el.id" class="absolute pointer-events-auto" :style="getElementStyle(el, index + 1)">
                                <AnimatedElement
                                    :animation="el.animation || 'none'" :loop-animation="el.loopAnimation"
                                    :delay="el.animationDelay || 0" :duration="el.animationDuration || 800"
                                    class="w-full h-full"
                                    :trigger-mode="(!el.animationTrigger || el.animationTrigger === 'scroll') ? 'auto' : 'manual'"
                                    :force-trigger="el.animationTrigger === 'click' ? (sectionClicked[index + 1] || false) : el.animationTrigger === 'open_btn' ? openBtnTriggered : false"
                                    :element-id="el.id"
                                >
                                    <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                        <img v-if="el.type === 'image' && el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity ?? 1 }" draggable="false" />
                                        <div v-else-if="el.type === 'text' && el.textStyle" class="w-full h-full flex items-center" :style="{ fontSize: `${el.textStyle.fontSize}px`, fontFamily: el.textStyle.fontFamily, fontStyle: el.textStyle.fontStyle, color: el.textStyle.color, textAlign: el.textStyle.textAlign }">{{ el.content }}</div>
                                        <div v-else-if="el.type === 'icon' && el.iconStyle" class="w-full h-full flex items-center justify-center" :style="{ color: el.iconStyle.iconColor }"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="iconPaths[el.iconStyle.iconName] || iconPaths['heart']" /></svg></div>
                                        <button v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:opacity-90 active:scale-95 transition-all duration-700" :class="{ 'opacity-0 pointer-events-none': isOpened && (el.type === 'open_invitation_button' || el.openInvitationConfig) }" @click="handleOpenInvitation(el)">{{ el.openInvitationConfig?.buttonText || el.content || 'Open Invitation' }}</button>
                                    </div>
                                </AnimatedElement>
                            </div>
                        </div>
                    </div>

                    <!-- Layer 2: COVER (Section 0) -->
                    <div 
                        v-if="isCoverVisible && orderedSections[0]"
                        :ref="(el) => setSectionRef(el, 0)" :data-index="0"
                        class="absolute top-0 left-0 overflow-hidden flex-shrink-0 page-section w-full"
                        :style="{
                            height: `${coverHeight}px`,
                            backgroundColor: orderedSections[0].backgroundColor || '#ffffff',
                            backgroundImage: orderedSections[0].backgroundUrl ? `url(${orderedSections[0].backgroundUrl})` : 'none',
                            backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 110,
                        }"
                    >
                        <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                        <div v-for="el in orderedSections[0].elements || []" :key="el.id" class="absolute" :style="getElementStyle(el, 0)">
                            <AnimatedElement
                                :animation="el.animation || 'none'" :loop-animation="el.loopAnimation"
                                :delay="el.animationDelay || 0" :duration="el.animationDuration || 800"
                                class="w-full h-full"
                                :trigger-mode="(!el.animationTrigger || el.animationTrigger === 'scroll') ? 'auto' : 'manual'"
                                :force-trigger="el.animationTrigger === 'click' ? (sectionClicked[0] || false) : el.animationTrigger === 'open_btn' ? openBtnTriggered : false"
                                :element-id="el.id"
                            >
                                <div class="w-full h-full" :style="{ transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})` }">
                                    <img v-if="el.type === 'image' && el.imageUrl" :src="el.imageUrl" class="w-full h-full object-fill" :style="{ opacity: el.opacity ?? 1 }" draggable="false" />
                                    <div v-else-if="el.type === 'text' && el.textStyle" class="w-full h-full flex items-center" :style="{ fontSize: `${el.textStyle.fontSize}px`, fontFamily: el.textStyle.fontFamily, fontStyle: el.textStyle.fontStyle, color: el.textStyle.color, textAlign: el.textStyle.textAlign }">{{ el.content }}</div>
                                    <div v-else-if="el.type === 'icon' && el.iconStyle" class="w-full h-full flex items-center justify-center" :style="{ color: el.iconStyle.iconColor }"><svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="iconPaths[el.iconStyle.iconName] || iconPaths['heart']" /></svg></div>
                                    <button v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:opacity-90 active:scale-95 transition-all duration-700" :class="{ 'opacity-0 pointer-events-none': isOpened && (el.type === 'open_invitation_button' || el.openInvitationConfig) }" @click="handleOpenInvitation(el)">{{ el.openInvitationConfig?.buttonText || el.content || 'Open Invitation' }}</button>
                                </div>
                            </AnimatedElement>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <button v-if="isFullscreen" class="fixed top-4 right-4 z-[130] p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all" @click="toggleFullscreen"><Minimize2 class="w-5 h-5" /></button>
    </div>
</template>

<style scoped>
.scroll-container::-webkit-scrollbar { width: 0; height: 0; }
.scroll-container { scrollbar-width: none; -ms-overflow-style: none; }
</style>



