<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTemplateStore } from '@/stores/template';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';
import AnimatedElement from '@/components/AnimatedElement.vue';
import { ArrowLeft, Maximize2 } from 'lucide-vue-next';
import { iconPaths } from '@/lib/icon-paths';

// Library Imports
import gsap from 'gsap';
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
    }, { threshold: 0.1 });

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

    document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
    if (observer) observer.disconnect();
    if (lenis) lenis.destroy();
    window.removeEventListener('resize', updateDimensions);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
});

/**
 * DEFINITIVE ATOMIC Z-STACK REVEAL
 */
const handleOpenInvitation = async () => {
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
        // STAGE 1: Start split animation
        isRevealing.value = true;
        shutterVisible.value = true;

        await nextTick();
        
        // GSAP Timeline
        const tl = gsap.timeline({
            onComplete: finalizeAndUnlock
        });

        const leftShutter = document.querySelector('.mirror-shutter-left');
        const rightShutter = document.querySelector('.mirror-shutter-right');
        const coverEl = document.querySelector('.atomic-cover-layer');

        if (leftShutter && rightShutter) {
            // Splitting doors
            tl.to(leftShutter, { xPercent: -101, duration: 1.5, ease: "power2.inOut" }, 0);
            tl.to(rightShutter, { xPercent: 101, duration: 1.5, ease: "power2.inOut" }, 0);
            
            // Hide only the cover content, keep the red section behind visible
            if (coverEl) {
                tl.to(coverEl, { opacity: 0, duration: 0.8, ease: "power2.out" }, 0.2);
            }
        } else {
            // Fallback
            tl.to(coverEl || {}, { opacity: 0, duration: 1 });
        }

        function finalizeAndUnlock() {
            // STAGE 2: Switch to Natural Flow
            isOpened.value = true;
            flowMode.value = true;
            isRevealing.value = false;
            shutterVisible.value = false;

            flowMode.value = true; // Switch to Natural Flow
            
            // Calculate exact scroll position (Section 1 visual height)
            const scrollAmount = coverHeightComputed.value * scaleFactor.value;

            nextTick(() => {
                if (scrollContainer.value) {
                    // Force jump to Section 2
                    scrollContainer.value.scrollTop = scrollAmount;
                }
                if (lenis) {
                    lenis.start();
                    lenis.resize();
                    lenis.scrollTo(scrollAmount, { immediate: true });
                }
            });
        };
    }, triggerDelay);
};

// Dimensions & Scaling


const scaleFactor = computed(() => {
    if (!windowWidth.value) return 1;
    const widthRatio = windowWidth.value / CANVAS_WIDTH;
    const heightRatio = windowHeight.value / CANVAS_HEIGHT;
    const isPortrait = windowHeight.value > windowWidth.value;
    if (isPortrait) return widthRatio;
    return Math.min(isFullscreen.value ? Math.min(heightRatio, widthRatio) : 1, heightRatio);
});

const coverHeightComputed = computed(() => {
    if (typeof scaleFactor.value !== 'number') return CANVAS_HEIGHT; 
    const isPortrait = windowHeight.value > windowWidth.value;
    if (!isPortrait && !isFullscreen.value) return CANVAS_HEIGHT;
    const targetHeight = windowHeight.value / scaleFactor.value;
    return Math.max(CANVAS_HEIGHT, targetHeight);
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
        position: 'absolute',
        left: `${el.position.x}px`,
        top: `${el.position.y}px`,
        width: `${el.size.width}px`,
        height: `${el.size.height}px`,
        zIndex: el.zIndex || 1,
        backgroundColor: config.buttonColor || '#000000',
        color: config.textColor || '#ffffff',
        fontSize: `${config.fontSize || 16}px`,
        fontFamily: config.fontFamily || 'Inter',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: 'none',
        overflow: 'hidden'
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

const toggleFullscreen = () => {
    if (!mainViewport.value) return;
    if (!document.fullscreenElement) mainViewport.value.requestFullscreen().catch(e => console.error(e));
    else document.exitFullscreen().catch(e => console.error(e));
};

const handleFullscreenChange = () => { isFullscreen.value = !!document.fullscreenElement; updateDimensions(); };
const goBack = () => router.push(`/editor/${templateId.value}`);
</script>

<template>
    <div ref="mainViewport" class="h-screen w-screen bg-black flex flex-col items-center overflow-hidden" :class="flowMode ? 'justify-start' : 'justify-center'">
        
        <!-- MAIN SCROLL ENGINE -->
        <div ref="scrollContainer" class="scroll-container w-full" :class="flowMode ? 'flex-1 h-full overflow-y-auto overflow-x-hidden' : 'h-auto overflow-hidden'" :style="!flowMode ? { maxHeight: `${coverHeightComputed * scaleFactor}px` } : {}">
                <div 
                    class="invitation-parent relative mx-auto" 
                    :style="{ 
                        width: `${CANVAS_WIDTH}px`, 
                        height: flowMode ? 'auto' : `${coverHeightComputed}px`,
                        transform: `scale(${scaleFactor})`, 
                        transformOrigin: 'top center' 
                    }"
                >
                <!-- Controls -->
                <div v-if="!isFullscreen" class="absolute top-6 left-0 w-full px-6 flex justify-between z-[500] pointer-events-none">
                    <button class="p-4 bg-black/50 text-white rounded-full backdrop-blur-3xl pointer-events-auto border border-white/20 shadow-2xl" @click="goBack"><ArrowLeft class="w-7 h-7" /></button>
                    <button class="p-4 bg-black/50 text-white rounded-full backdrop-blur-3xl pointer-events-auto border border-white/20 shadow-2xl" @click="toggleFullscreen"><Maximize2 class="w-7 h-7" /></button>
                </div>

                <!-- 
                    THE UNIFIED ATOMIC CONTAINER
                -->
                <div class="relative w-full mx-auto shadow-2xl overflow-hidden bg-white" :style="{ width: `${CANVAS_WIDTH}px`, height: flowMode ? 'auto' : `${coverHeightComputed}px` }">
                    
                    <!-- NATURAL FLOW MODE (Active after Reveal) -->
                    <div v-if="flowMode" class="flex flex-col w-full relative h-auto">
                        <div 
                            v-for="(section, index) in orderedSections" 
                            :key="section.key"
                            :ref="(el) => setSectionRef(el, index)" :data-index="index"
                            class="relative w-full flex-shrink-0 page-section"
                            :style="{ 
                                height: (index === 0 || index === 1) ? `${coverHeightComputed}px` : `${CANVAS_HEIGHT}px`,
                                backgroundColor: section.backgroundColor || '#ffffff',
                                backgroundImage: section.backgroundUrl ? `url(${section.backgroundUrl})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }"
                        >
                            <div class="relative w-full h-full">
                                <div v-if="section.overlayOpacity" class="absolute inset-0 bg-black pointer-events-none" :style="{ opacity: section.overlayOpacity }" />
                                <template v-for="el in section.elements" :key="el.id">
                                    <AnimatedElement 
                                        :animation="el.animation" 
                                        :loop-animation="el.loopAnimation" 
                                        :delay="el.animationDelay" 
                                        :duration="el.animationDuration" 
                                        class="absolute inset-0" 
                                        :immediate="index === 0"
                                        :trigger-mode="'auto'"
                                        :element-id="el.id"
                                    >
                                        <img v-if="el.type === 'image'" :src="el.imageUrl" :style="getElementStyle(el, index)" class="pointer-events-none select-none" />
                                        <div v-else-if="el.type === 'text'" :style="[getElementStyle(el, index), getTextStyle(el)]">{{ el.content }}</div>
                                        <button v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:scale-105 active:scale-95 transition-all shadow-xl font-bold" @click="handleOpenInvitation()">
                                            {{ el.openInvitationConfig?.buttonText || el.content || 'Buka Undangan' }}
                                        </button>
                                        <div v-else-if="el.type === 'icon'" :style="[getElementStyle(el, index), { color: el.iconStyle?.iconColor }]" class="w-full h-full flex items-center justify-center opacity-100">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" /></svg>
                                        </div>
                                        <div v-else-if="el.type === 'countdown'" :style="getElementStyle(el, index)" class="flex justify-center items-center gap-2">
                                            <div v-for="unit in ['Days', 'Hours', 'Min', 'Sec']" :key="unit" class="flex flex-col items-center">
                                                <div class="text-2xl font-bold" :style="{ color: el.countdownConfig?.digitColor || '#000' }">00</div>
                                                <div class="text-[10px] uppercase" :style="{ color: el.countdownConfig?.labelColor || '#666' }">{{ unit }}</div>
                                            </div>
                                        </div>
                                        <div v-else-if="el.type === 'rsvp_form' || el.type === 'rsvp-form'" :style="getElementStyle(el, index)" class="p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl flex flex-col gap-2 pointer-events-none">
                                            <div class="h-8 bg-black/5 rounded w-full"></div>
                                            <div class="h-10 bg-black rounded w-full mt-2"></div>
                                        </div>
                                        <div v-else-if="el.type === 'guest_wishes'" :style="getElementStyle(el, index)" class="p-4 bg-white/30 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg h-full overflow-hidden flex flex-col gap-3">
                                            <div v-for="i in 2" :key="i" class="flex flex-col gap-1"><div class="h-3 bg-black/10 rounded w-1/3"></div><div class="h-4 bg-black/5 rounded w-full"></div></div>
                                        </div>
                                    </AnimatedElement>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- ATOMIC STACK MODE (Initial Reveal Physics) -->
                    <div v-else class="relative w-full h-full overflow-hidden">
                        <!-- BOTTOM LAYER: Section 2 -->
                        <div v-if="orderedSections[1]" class="absolute inset-0 z-[1]" :style="{ backgroundColor: orderedSections[1].backgroundColor || '#ffffff', backgroundImage: orderedSections[1].backgroundUrl ? `url(${orderedSections[1].backgroundUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }">
                            <div v-if="orderedSections[1].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[1].overlayOpacity }" />
                            <div class="relative w-full h-full">
                                <template v-for="el in orderedSections[1].elements" :key="el.id">
                                    <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="absolute inset-0" :trigger-mode="'manual'" :force-trigger="isRevealing || isOpened" :element-id="el.id">
                                        <img v-if="el.type === 'image'" :src="el.imageUrl" :style="getElementStyle(el, 1)" class="pointer-events-none select-none" />
                                        <div v-else-if="el.type === 'text'" :style="[getElementStyle(el, 1), getTextStyle(el)]">{{ el.content }}</div>
                                        <div v-else-if="el.type === 'icon'" :style="[getElementStyle(el, 1), { color: el.iconStyle?.iconColor }]" class="w-full h-full flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" /></svg>
                                        </div>
                                        <div v-else-if="el.type === 'countdown'" :style="getElementStyle(el, 1)" class="flex justify-center items-center gap-2">
                                            <div v-for="unit in ['Days', 'Hours', 'Min', 'Sec']" :key="unit" class="flex flex-col items-center">
                                                <div class="text-2xl font-bold" :style="{ color: el.countdownConfig?.digitColor || '#000' }">00</div>
                                                <div class="text-[10px] uppercase" :style="{ color: el.countdownConfig?.labelColor || '#666' }">{{ unit }}</div>
                                            </div>
                                        </div>
                                    </AnimatedElement>
                                </template>
                            </div>
                        </div>

                        <!-- TOP LAYER: Section 1 -->
                        <div v-if="orderedSections[0]" class="absolute inset-0 z-[2] atomic-cover-layer" :style="{ backgroundColor: orderedSections[0].backgroundColor || '#cccccc', backgroundImage: orderedSections[0].backgroundUrl ? `url(${orderedSections[0].backgroundUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }">
                            <div v-if="orderedSections[0].overlayOpacity" class="absolute inset-0 bg-black" :style="{ opacity: orderedSections[0].overlayOpacity }" />
                            <div class="relative w-full h-full">
                                <template v-for="el in orderedSections[0].elements" :key="el.id">
                                    <AnimatedElement :animation="el.animation" :loop-animation="el.loopAnimation" :delay="el.animationDelay" :duration="el.animationDuration" class="absolute inset-0" :immediate="true" :element-id="el.id">
                                        <img v-if="el.type === 'image'" :src="el.imageUrl" :style="getElementStyle(el, 0)" class="pointer-events-none select-none" />
                                        <div v-else-if="el.type === 'text'" :style="[getElementStyle(el, 0), getTextStyle(el)]">{{ el.content }}</div>
                                        <button v-else-if="el.type === 'button' || el.type === 'open_invitation_button'" :style="getButtonStyle(el)" class="hover:scale-105 active:scale-95 transition-all shadow-xl font-bold" @click="handleOpenInvitation()">
                                            {{ el.openInvitationConfig?.buttonText || el.content || 'Buka Undangan' }}
                                        </button>
                                         <div v-else-if="el.type === 'icon'" :style="[getElementStyle(el, 0), { color: el.iconStyle?.iconColor }]" class="w-full h-full flex items-center justify-center">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path :d="(iconPaths as any)[el.iconStyle?.iconName || 'star'] || ''" /></svg>
                                        </div>
                                    </AnimatedElement>
                                </template>
                            </div>
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

        <button v-if="isFullscreen" class="fixed top-8 right-8 z-[600] p-4 bg-black/50 text-white rounded-full border border-white/20 shadow-2xl hover:bg-black/80 transition-all font-bold" @click="toggleFullscreen"><Minimize2 class="w-7 h-7" /></button>
    </div>
</template>

<style scoped>
.scroll-container::-webkit-scrollbar { width: 0; height: 0; }
.scroll-container { scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; }
.page-section { backface-visibility: hidden; transform: translateZ(0); }
.will-change-transform { will-change: transform; transition: none; }
</style>
