<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { useIntersectionObserver } from "@vueuse/core";
import { type AnimationType, type MotionPathConfig } from "@/lib/types";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

/**
 * SHARED PERSISTENT STATE
 * Used to track animation status for ALL elements by their ID.
 * This ensures that when the component is remounted (e.g., during mode switch),
 * the animation state is preserved, preventing unwanted 're-fire' or 'hidden' states.
 */
const globalAnimatedState = new Map<string, boolean>();

interface Props {
  animation?: AnimationType;
  loopAnimation?: AnimationType;
  delay?: number;
  duration?: number;
  class?: string;
  style?: any;
  forceTrigger?: boolean;
  triggerMode?: 'scroll' | 'click' | 'open_btn';
  elementId?: string;
  immediate?: boolean;
  imageUrl?: string;
  motionPathConfig?: MotionPathConfig;
  isContentProtected?: boolean;
  showCopyButton?: boolean;
  elementContent?: string;
  parallaxFactor?: number; // -1 to 1, for mouse-tracking 3D depth
  zoomConfig?: import("@/lib/types").ZoomAnimationConfig;
}

const props = withDefaults(defineProps<Props>(), {
  animation: "none",
  delay: 0,
  duration: 800,
  class: "",
  style: {},
  forceTrigger: false,
  triggerMode: 'scroll',
  elementId: '',
  immediate: false,
  imageUrl: '',
  motionPathConfig: undefined,
  isContentProtected: false,
  showCopyButton: false,
  elementContent: '',
  parallaxFactor: 0,
  zoomConfig: undefined,
});

import { Copy, Check } from 'lucide-vue-next';
import { inject } from 'vue';

const isCopied = ref(false);

const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.elementContent) {
        navigator.clipboard.writeText(props.elementContent);
        isCopied.value = true;
        setTimeout(() => isCopied.value = false, 2000);
    }
};

const elementRef = ref<HTMLElement | null>(null);

// Track animation state - Check global cache first
const shouldAnimate = ref(props.elementId ? (globalAnimatedState.get(props.elementId) || false) : false);

// Track if an open_btn trigger is pending because the element wasn't visible
const pendingOpenTrigger = ref(false);

const isVisible = ref(false);

const tryTriggerAnimation = () => {
    if (!shouldAnimate.value) {
        requestAnimationFrame(() => {
            shouldAnimate.value = true;
            if (props.elementId) globalAnimatedState.set(props.elementId, true);
            
            // Trigger GSAP motion path if enabled
            if (props.motionPathConfig?.enabled && props.motionPathConfig.points?.length > 0) {
                initMotionPath();
            }
        });
    }
};

const handleClick = () => {
    if (props.triggerMode === 'click') {
        tryTriggerAnimation();
    }
};

const motionPathTween = ref<gsap.core.Tween | null>(null);

const initMotionPath = () => {
    if (!elementRef.value || !props.motionPathConfig || !props.motionPathConfig.points.length) return;
    
    const config = props.motionPathConfig;
    const points = config.points;
    
    // We need to calculate points relative to the element's START position
    // because GSAP works on transform, and the element is already at props.style.left/top.
    // However, our path points are absolute canvas coordinates.
    // So we subtract the start position to get relative movement.
    const startX = parseFloat(props.style.left || '0');
    const startY = parseFloat(props.style.top || '0');
    
    const relativePoints = points.map(p => ({
        x: p.x - startX,
        y: p.y - startY
    }));

    if (motionPathTween.value) motionPathTween.value.kill();

    motionPathTween.value = gsap.to(elementRef.value, {
        duration: (config.duration || 3000) / 1000,
        repeat: config.loop !== false ? -1 : 0,
        ease: "none",
        motionPath: {
            path: relativePoints,
            curviness: 1.2,
            autoRotate: false
        },
        paused: false
    });
};

const resetAnimation = () => {
    // Only reset if it's currently animated AND NOT immediate 
    // AND NOT a GIF (GIFs should stay visible once they start)
    const isGif = props.imageUrl?.toLowerCase().endsWith('.gif');
    
    if (shouldAnimate.value && !props.immediate && !isGif) {
        shouldAnimate.value = false;
        if (props.elementId) globalAnimatedState.set(props.elementId, false);
        if (motionPathTween.value) {
            motionPathTween.value.pause(0);
        }
    }
};

// Re-init path if config changes (important for editor live updates)
watch(() => props.motionPathConfig, (newVal) => {
    if (shouldAnimate.value && newVal?.enabled && newVal.points?.length > 0) {
        initMotionPath();
    } else if (motionPathTween.value) {
        motionPathTween.value.kill();
        motionPathTween.value = null;
    }
}, { deep: true });

// INITIAL TRIGGER (Immediate)
onMounted(() => {
    if (props.immediate || shouldAnimate.value) {
        tryTriggerAnimation();
    }
});

onUnmounted(() => {
    if (motionPathTween.value) {
        motionPathTween.value.kill();
    }
});

// DIRECTIONAL VISIBILITY LOGIC (Pro Standard)
useIntersectionObserver(
    elementRef,
    (entries) => {
        const entry = entries[0];
        if (!entry) return;
        
        const { isIntersecting, boundingClientRect, rootBounds } = entry;
        isVisible.value = isIntersecting;
        
        if (isIntersecting) {
            if (props.triggerMode === 'scroll') {
                // Element entered viewport (from any direction)
                tryTriggerAnimation();
            } else if (pendingOpenTrigger.value) {
                // Was waiting for visibility to trigger open_btn animation
                console.log(`[Animation] ${props.elementId} became visible, firing pending open trigger`);
                pendingOpenTrigger.value = false;
                tryTriggerAnimation();
            }
        } else if (rootBounds && props.triggerMode === 'scroll' && !props.immediate) {
            // Only reset if NOT immediate - immediate elements should always stay visible
            /**
             * DIRECTIONAL RESET: 
             * 'Pro' standard means we only reset an animation if the element is currently 
             * BELOW the viewport (it hasn't been reached yet or we scrolled back up away from it).
             * If the element is ABOVE the viewport (we scrolled past it), it MUST stay visible.
             */
            const isBelowViewport = boundingClientRect.top > rootBounds.bottom;
            
            if (isBelowViewport) {
                // We scrolled UP, the element is now below the screen. 
                // We can reset it to allow it to 're-animate' when we scroll back DOWN.
                resetAnimation();
            }
        }
    },
    { 
        threshold: 0.1, 
        rootMargin: '10px 0px 10px 0px' 
    }
);

// MANUAL TRIGGER WATCHER - Triggers animation when forceTrigger becomes true
watch(() => props.forceTrigger, (force, oldForce) => {
    // CRITICAL: Only trigger on positive edge (false -> true)
    // Guard against initial mount where oldForce is undefined
    if (force && oldForce === false) {
        // For click/open_btn modes, use existing logic
        if (props.triggerMode === 'click' || props.triggerMode === 'open_btn') {
            if (isVisible.value || props.immediate) {
                tryTriggerAnimation();
            } else {
                console.log(`[Animation] ${props.elementId} received open trigger but is not visible. Postponing.`);
                pendingOpenTrigger.value = true;
            }
        } else {
            // For scroll and other modes, trigger immediately when forceTrigger becomes true
            // This handles Section 2+ elements when transition completes
            console.log(`[Animation] ${props.elementId} forceTrigger fired for mode: ${props.triggerMode}`);
            tryTriggerAnimation();
        }
    }
}, { immediate: false }); // Don't run on mount - wait for actual changes

// --- ZOOM ANIMATION LOGIC ---
const isZoomActive = ref(false);
const zoomTimeout = ref<number | null>(null);

const zoomStyle = computed(() => {
    if (!props.zoomConfig?.enabled) return { width: '100%', height: '100%' };
    
    const config = props.zoomConfig;
    const originX = config.targetRegion?.x ?? 50;
    const originY = config.targetRegion?.y ?? 50;
    
    // Zoom In: Scale > 1, Zoom Out: Scale < 1 initially or reversed
    // For "Zoom In", we start at 1, go to Config.Scale
    // For "Zoom Out", technically we should start at Config.Scale and go to 1, 
    // but usually "Zoom Out" means starting from a zoomed state.
    // Let's implement Zoom In as 1 -> Scale, and Zoom Out as Scale -> 1 (resetting).
    // Or simpler: Direction 'in' means scale is Scale, Direction 'out' could mean start at Scale.
    // User requested "zoom in dan zoom out".
    
    const scale = isZoomActive.value 
        ? (config.direction === 'in' ? config.scale : 1)
        : (config.direction === 'in' ? 1 : config.scale);

    return {
        width: '100%',
        height: '100%',
        transition: `transform ${config.duration}ms ease-in-out`,
        transformOrigin: `${originX}% ${originY}%`,
        transform: `scale(${scale})`,
    };
});

const startZoomAnimation = () => {
    if (!props.zoomConfig?.enabled) return;
    
    // Clear any existing reset timeout
    if (zoomTimeout.value) {
        clearTimeout(zoomTimeout.value);
        zoomTimeout.value = null;
    }

    requestAnimationFrame(() => {
        isZoomActive.value = true;

        if (props.zoomConfig!.behavior === 'reset') {
            zoomTimeout.value = window.setTimeout(() => {
                isZoomActive.value = false;
                zoomTimeout.value = null;
            }, (props.zoomConfig!.duration || 2000) + (props.zoomConfig!.resetDelay || 1000));
        }
    });
};

// Hook into the trigger logic
watch(shouldAnimate, (active) => {
    if (active && props.zoomConfig?.enabled) {
        startZoomAnimation();
    } else if (!active) {
        isZoomActive.value = false;
        if (zoomTimeout.value) {
            clearTimeout(zoomTimeout.value);
            zoomTimeout.value = null;
        }
    }
});

const LOOPING_ANIMATIONS: AnimationType[] = [
  "sway",
  "float",
  "pulse",
  "sparkle",
  "spin",
  "shake",
  "swing",
  "heartbeat",
  "glow",
  "bird-flap",
  "butterfly-flap",
  // Combined flight animations
  "flap-bob",
  "float-flap",
  "fly-left",
  "fly-right",
  "fly-up",
  "fly-down",
  "fly-random",
];

const ENTRANCE_ANIMATIONS: AnimationType[] = [
  "fade-in",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "zoom-in",
  "zoom-out",
  "flip-x",
  "flip-y",
  "bounce",
  "slide-out-left",
  "slide-out-right",
  "slide-in-left",
  "slide-in-right",
  "blur-in",
  "draw-border",
  "pop-in",
  // Advanced 3D entrance animations
  "rotate-in-down-left",
  "rotate-in-down-right",
  "zoom-in-down",
  "zoom-in-up",
];

// Determine the actual entrance animation
const entranceAnim = computed(() =>
  ENTRANCE_ANIMATIONS.includes(props.animation) ? props.animation : "none"
);

// Determine the actual loop animation
const loopAnim = computed(() =>
  props.loopAnimation && LOOPING_ANIMATIONS.includes(props.loopAnimation)
    ? props.loopAnimation
    : LOOPING_ANIMATIONS.includes(props.animation)
    ? props.animation
    : undefined
);

// Determine if the element is a bird or butterfly for auto-flapping logic
const isButterfly = computed(() => 
    props.class?.toLowerCase().includes('butterfly') || 
    props.style?.id?.toLowerCase().includes('butterfly') || 
    props.elementId?.toLowerCase().includes('butterfly') ||
    props.imageUrl?.toLowerCase().includes('butterfly')
);

const getLoopingAnimationStyle = (anim: AnimationType) => {
  const baseStyle: any = {
    animationDelay: `${props.delay}ms`,
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  };

  // Define Path animations (Movement)
  const pathAnims: Record<string, any> = {
    "sway": { animationName: "sway", animationDuration: `${props.duration * 2}ms`, transformOrigin: "bottom center" },
    "float": { animationName: "float", animationDuration: `${props.duration * 3}ms` },
    "pulse": { animationName: "pulse", animationDuration: `${props.duration * 2}ms` },
    "sparkle": { animationName: "sparkle", animationDuration: `${props.duration * 1.5}ms` },
    "spin": { animationName: "spin", animationDuration: `${props.duration * 4}ms`, animationTimingFunction: "linear" },
    "shake": { animationName: "shake", animationDuration: `${props.duration}ms` },
    "swing": { animationName: "swing", animationDuration: `${props.duration * 2}ms`, transformOrigin: "top center" },
    "heartbeat": { animationName: "heartbeat", animationDuration: `${props.duration * 1.5}ms` },
    "glow": { animationName: "glow", animationDuration: `${props.duration * 2}ms` },
    "fly-left": { animationName: "fly-left", animationDuration: `${props.duration * 10}ms`, animationTimingFunction: "linear" },
    "fly-right": { animationName: "fly-right", animationDuration: `${props.duration * 10}ms`, animationTimingFunction: "linear" },
    "fly-up": { animationName: "fly-up", animationDuration: `${props.duration * 8}ms`, animationTimingFunction: "linear" },
    "fly-down": { animationName: "fly-down", animationDuration: `${props.duration * 8}ms`, animationTimingFunction: "linear" },
    "fly-random": { animationName: "fly-random", animationDuration: `${props.duration * 6}ms` },
    "flap-bob": { animationName: "flap-bob", animationDuration: `${props.duration * 1.5}ms` },
    "float-flap": { animationName: "float", animationDuration: `${props.duration * 3}ms` },
  };

  // Determine which path to use
  let pathStyle = {};
  if (pathAnims[anim]) {
    pathStyle = { ...baseStyle, ...pathAnims[anim] };
  } else if (anim === "bird-flap" || anim === "butterfly-flap") {
    // These are purely wing flaps, no path
  }

  // Define Wing animations (Flapping)
  let wingStyle = {};
  
  // Asset-specific animation mapping based on R2 file keys
  const assetAnimations: Record<string, string> = {
    '1766118233945-5hn7z': 'bird-warm-flight',   // Bird Warm
    '1766118287972-657f6o': 'bird-cool-flight',  // Bird Cool
    '1766118295218-q7dx3c': 'butterfly-gold-flight', // Butterfly Gold
    '1766118302329-grvg9g': 'butterfly-blue-flight', // Butterfly Blue
  };
  
  // Extract asset ID from imageUrl
  const getAssetAnimation = (): string => {
    const url = props.imageUrl || '';
    for (const [key, animName] of Object.entries(assetAnimations)) {
      if (url.includes(key)) {
        return animName;
      }
    }
    // Check for improved versions
    if (url.includes('1766118302329')) {
      return 'butterfly-blue-flight-improved'; // Butterfly Blue
    }
    if (url.includes('1766118287972')) {
      return 'bird-cool-flight-improved'; // Bird Cool
    }
    // Fallback to generic animations
    return isButterfly.value ? 'butterfly-flap' : 'bird-flap';
  };
  
  const wingAnimName = getAssetAnimation();
  // Butterflies flutter very slowly (4000ms) for graceful motion, birds flap faster (~400ms)
  const wingDuration = isButterfly.value ? 4000 : props.duration * 0.4;



  // Decide if flapping should be active
  const shouldFlap = [
    "bird-flap", "butterfly-flap", "flap-bob", "float-flap", 
    "fly-left", "fly-right", "fly-up", "fly-down", "fly-random"
  ].includes(anim);

  if (shouldFlap) {
    wingStyle = {
      ...baseStyle,
      animationName: wingAnimName,
      animationDuration: `${wingDuration}ms`,
      transformOrigin: "center"
    };
  }

  return { pathStyle, wingStyle };
};

// Initial style (before animation) - INCLUDING TRANSITION FOR SMOOTH EXIT
const getEntranceInitialStyle = () => {
  const baseExitStyle: any = {
    opacity: 0,
    transition: `opacity ${props.duration}ms ease-out, transform ${props.duration}ms ease-out`,
    pointerEvents: "none"
  };

  switch (entranceAnim.value) {
    case "fade-in":
      return { ...baseExitStyle };
    case "slide-up":
      return { ...baseExitStyle, transform: "translateY(50px)" };
    case "slide-down":
      return { ...baseExitStyle, transform: "translateY(-50px)" };
    case "slide-left":
      return { ...baseExitStyle, transform: "translateX(50px)" };
    case "slide-right":
      return { ...baseExitStyle, transform: "translateX(-50px)" };
    case "zoom-in":
      return { ...baseExitStyle, transform: "scale(0.8)" };
    case "zoom-out":
      return { ...baseExitStyle, transform: "scale(1.2)" };
    case "flip-x":
      return { ...baseExitStyle, transform: "rotateX(90deg)" };
    case "flip-y":
      return { ...baseExitStyle, transform: "rotateY(90deg)" };
    case "slide-out-right":
      return { ...baseExitStyle, opacity: 1, transform: "translate(0, 0)", pointerEvents: "auto" };
    case "slide-in-left":
      return { ...baseExitStyle, transform: "translateX(-100%)" };
    case "slide-in-right":
      return { ...baseExitStyle, transform: "translateX(100%)" };
    case "blur-in":
      return { ...baseExitStyle, filter: "blur(10px)" };
    case "pop-in":
      return { ...baseExitStyle, transform: "scale(0.5)" };
    case "draw-border":
      return { ...baseExitStyle };
    default:
      return {};
  }
};


// Animated style (after entrance animation completes)
const getEntranceAnimatedStyle = () => {
  if (entranceAnim.value === "none" || !shouldAnimate.value) return {};

  const baseStyle: any = {
    opacity: 1,
    transition: `opacity ${props.duration}ms ease-out, transform ${props.duration}ms ease-out`,
    transitionDelay: `${props.delay}ms`,
    transitionTimingFunction:
      entranceAnim.value === "bounce"
        ? "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
        : "ease-out",
  };

  // Set the final transform for each animation type
  switch (entranceAnim.value) {
    case "fade-in":
      break;
    case "slide-up":
    case "slide-down":
    case "bounce":
      baseStyle.transform = "translateY(0)";
      baseStyle.opacity = 1;
      break;
    case "slide-out-left":
      baseStyle.transform = "translateX(-150vw)";
      baseStyle.opacity = 0;
      break;
    case "slide-out-right":
      baseStyle.transform = "translateX(150vw)";
      baseStyle.opacity = 0;
      break;
    case "slide-left":
    case "slide-right":
      baseStyle.transform = "translateX(0)";
      break;
    case "zoom-in":
    case "zoom-out":
      baseStyle.transform = "scale(1)";
      break;
    case "flip-x":
      baseStyle.transform = "rotateX(0deg)";
      break;
    case "slide-in-left":
    case "slide-in-right":
      baseStyle.transform = "translateX(0)";
      break;
    case "blur-in":
      baseStyle.filter = "blur(0)";
      break;
    case "pop-in":
      baseStyle.transform = "scale(1)";
      baseStyle.transitionTimingFunction = "cubic-bezier(0.34, 1.56, 0.64, 1)"; // Bounce
      break;
    case "draw-border":
      baseStyle.opacity = 1;
      break;
    case "flip-y":
      baseStyle.transform = "rotateY(0deg)";
      break;
  }

  return baseStyle;
};

// --- STYLE SPLITTING LOGIC ---

// 1. Layout Styles (Positional & Box bounds)
const rootStyle = computed(() => {
  const s = props.style || {};
  return {
    position: s.position || 'absolute',
    top: s.top,
    left: s.left,
    bottom: s.bottom,
    right: s.right,
    width: s.width,
    height: s.height,
    zIndex: s.zIndex,
    // Add display: block if width/height are set
    display: (s.width || s.height) ? 'block' : undefined
  };
});

// 2. Entrance Animation Style
const entranceStyle = computed(() => {
  if (entranceAnim.value === 'none') return { width: '100%', height: '100%' };
  
  const animS = shouldAnimate.value 
    ? getEntranceAnimatedStyle() 
    : getEntranceInitialStyle();
    
  return {
    ...animS,
    width: '100%',
    height: '100%'
  };
});

// 3. Path & Wing Animation Styles
const loopStyles = computed(() => {
  if (!loopAnim.value || !shouldAnimate.value) return { pathStyle: {}, wingStyle: {} };
  return getLoopingAnimationStyle(loopAnim.value!);
});

// 4. Static/Content Styles (Rotate, Flip, Opacity, etc.)
const staticContentStyle = computed(() => {
  const s = { ...props.style };
  // Remove layout keys so they aren't applied twice
  const layoutKeys = ['position', 'top', 'left', 'bottom', 'right', 'width', 'height', 'zIndex'];
  layoutKeys.forEach(k => delete (s as any)[k]);
  
  return {
      ...s,
      width: '100%',
      height: '100%'
  };
});

// 5. Parallax Transform (Mouse-tracking 3D depth)
const mousePosition = inject<{ x: number; y: number }>('mousePosition', { x: 0, y: 0 });

const parallaxStyle = computed(() => {
  if (!props.parallaxFactor || props.parallaxFactor === 0) return {};
  
  // Normalize mouse position from provide (already -0.5 to 0.5)
  const offsetX = mousePosition.x * props.parallaxFactor * 30; // Max 30px offset
  const offsetY = mousePosition.y * props.parallaxFactor * 30;
  
  return {
    transform: `translate(${offsetX}px, ${offsetY}px)`,
    transition: 'transform 0.3s ease-out',
  };
});

</script>

<template>
  <!-- ROOT: The 'Box' that browser sees for visibility -->
  <div ref="elementRef" :class="class" :style="rootStyle" @click="handleClick">
    <!-- 1. Entrance Layer -->
    <div :style="entranceStyle" class="relative">
      <!-- 2. Zoom Layer -->
      <div :style="zoomStyle" class="relative">
        <!-- 3. Path Layer (Float, Fly, Sway) -->
        <div :style="loopStyles.pathStyle" class="relative w-full h-full">
          <!-- 4. Wing Layer (Flap) -->
          <div :style="loopStyles.wingStyle" class="relative w-full h-full">
            <!-- 5. Parallax Layer (Mouse 3D) -->
            <div :style="parallaxStyle" class="relative w-full h-full">
              <!-- 6. Content Layer (Static transforms) -->
              <div 
                :style="staticContentStyle" 
              class="relative w-full h-full"
              :class="{ 'select-none pointer-events-none': isContentProtected && !showCopyButton }"
            >
            <slot />
            
            <!-- Copy Button -->
            <button 
                v-if="showCopyButton"
                @click="handleCopy"
                class="absolute -right-2 -top-2 p-1.5 rounded-full bg-white text-slate-600 shadow-md border border-slate-100 hover:bg-slate-50 transition-all z-50 pointer-events-auto"
                :title="isCopied ? 'Copied!' : 'Copy text'"
            >
                <Check v-if="isCopied" class="w-3 h-3 text-green-500" />
                <Copy v-else class="w-3 h-3" />
            </button>
            
            <!-- Border Drawing Lines -->
            <template v-if="animation === 'draw-border'">
              <span 
                class="absolute top-0 left-0 h-[2px] transition-all duration-[1000ms] ease-out"
                :style="{ 
                    width: shouldAnimate ? '100%' : '0%', 
                    backgroundColor: style?.borderColor || style?.color || '#000',
                    transitionDelay: `${delay}ms` 
                }"
              />
              <span 
                class="absolute top-0 right-0 w-[2px] transition-all duration-[1000ms] ease-out"
                :style="{ 
                    height: shouldAnimate ? '100%' : '0%', 
                    backgroundColor: style?.borderColor || style?.color || '#000',
                    transitionDelay: `${delay + 200}ms` 
                }"
              />
              <span 
                class="absolute bottom-0 right-0 h-[2px] transition-all duration-[1000ms] ease-out"
                :style="{ 
                    width: shouldAnimate ? '100%' : '0%', 
                    backgroundColor: style?.borderColor || style?.color || '#000',
                    transitionDelay: `${delay + 400}ms` 
                }"
              />
              <span 
                class="absolute bottom-0 left-0 w-[2px] transition-all duration-[1000ms] ease-out"
                :style="{ 
                    height: shouldAnimate ? '100%' : '0%', 
                    backgroundColor: style?.borderColor || style?.color || '#000',
                    transitionDelay: `${delay + 600}ms` 
                }"
              />
            </template>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
/* Animations moved to global animations.css to allow dynamic application */
</style>
