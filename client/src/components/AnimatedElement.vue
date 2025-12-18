<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useIntersectionObserver } from "@vueuse/core";
import { type AnimationType } from "@/lib/types";

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
  triggerMode?: 'auto' | 'manual';
  elementId?: string;
  immediate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  animation: "none",
  delay: 0,
  duration: 800,
  class: "",
  style: {},
  forceTrigger: false,
  triggerMode: 'auto',
  elementId: '',
  immediate: false,
});

const elementRef = ref<HTMLElement | null>(null);

// Track animation state - Check global cache first
const shouldAnimate = ref(props.elementId ? (globalAnimatedState.get(props.elementId) || false) : false);

const tryTriggerAnimation = () => {
    if (!shouldAnimate.value) {
        requestAnimationFrame(() => {
            shouldAnimate.value = true;
            if (props.elementId) globalAnimatedState.set(props.elementId, true);
        });
    }
};

const resetAnimation = () => {
    if (shouldAnimate.value && !props.immediate) {
        shouldAnimate.value = false;
        if (props.elementId) globalAnimatedState.set(props.elementId, false);
    }
};

// INITIAL TRIGGER (Immediate)
onMounted(() => {
    if (props.immediate) {
        tryTriggerAnimation();
    }
});

// DIRECTIONAL VISIBILITY LOGIC (Pro Standard)
useIntersectionObserver(
    elementRef,
    ([{ isIntersecting, boundingClientRect, rootBounds }], observerElement) => {
        if (isIntersecting) {
            // Element entered viewport (from any direction)
            tryTriggerAnimation();
        } else if (rootBounds && props.triggerMode === 'auto') {
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
            } else {
                // The element is ABOVE the viewport. 
                // DO NOT RESET. Elements above the screen must remain as they are 
                // so they are already there when you scroll back UP.
            }
        }
    },
    { 
        threshold: 0.1, 
        rootMargin: '10px 0px 10px 0px' 
    }
);

// MANUAL TRIGGER WATCHER
watch(() => props.forceTrigger, (force) => {
    if (props.triggerMode === 'manual' && force) {
        tryTriggerAnimation();
    }
}, { immediate: true });

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

const getLoopingAnimationStyle = (anim: AnimationType) => {
  const baseStyle: any = {
    animationDelay: `${props.delay}ms`,
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  };

  switch (anim) {
    case "sway":
      return {
        ...baseStyle,
        animationName: "sway",
        animationDuration: `${props.duration * 2}ms`,
        transformOrigin: "bottom center",
      };
    case "float":
      return {
        ...baseStyle,
        animationName: "float",
        animationDuration: `${props.duration * 3}ms`,
      };
    case "pulse":
      return {
        ...baseStyle,
        animationName: "pulse",
        animationDuration: `${props.duration * 2}ms`,
      };
    case "sparkle":
      return {
        ...baseStyle,
        animationName: "sparkle",
        animationDuration: `${props.duration * 1.5}ms`,
      };
    case "spin":
      return {
        ...baseStyle,
        animationName: "spin",
        animationDuration: `${props.duration * 4}ms`,
        animationTimingFunction: "linear",
      };
    case "shake":
      return {
        ...baseStyle,
        animationName: "shake",
        animationDuration: `${props.duration}ms`,
      };
    case "swing":
      return {
        ...baseStyle,
        animationName: "swing",
        animationDuration: `${props.duration * 2}ms`,
        transformOrigin: "top center",
      };
    case "heartbeat":
      return {
        ...baseStyle,
        animationName: "heartbeat",
        animationDuration: `${props.duration * 1.5}ms`,
      };
    case "glow":
      return {
        ...baseStyle,
        animationName: "glow",
        animationDuration: `${props.duration * 2}ms`,
      };
    default:
      return {};
  }
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

// 2. Animation Styles (Entrance & Loop)
const animationStyle = computed(() => {
  let animS: any = {};

  if (entranceAnim.value !== "none") {
    if (shouldAnimate.value) {
      animS = { ...getEntranceAnimatedStyle() };
    } else {
      animS = { ...getEntranceInitialStyle() };
    }
  }

  if (loopAnim.value && shouldAnimate.value) {
    animS = { ...animS, ...getLoopingAnimationStyle(loopAnim.value!) };
  }

  return {
      ...animS,
      width: '100%',
      height: '100%'
  };
});

// 3. Static/Content Styles (Rotate, Flip, Opacity, etc.)
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

</script>

<template>
  <!-- ROOT: The 'Box' that browser sees for visibility -->
  <div ref="elementRef" :class="class" :style="rootStyle">
    <!-- MIDDLE: The 'Actor' that performs the entrance/loop animations -->
    <div :style="animationStyle" class="relative">
      <!-- DEEPEST: The 'Canvas' that holds static transforms like rotate/flip -->
      <div :style="staticContentStyle" class="relative">
        <slot />
        
        <!-- Border Drawing Lines -->
        <template v-if="animation === 'draw-border'">
          <!-- Top -->
          <span 
            class="absolute top-0 left-0 h-[2px] bg-current transition-all duration-[1000ms] ease-out"
            :style="{ 
                width: shouldAnimate ? '100%' : '0%', 
                backgroundColor: style.borderColor || style.color || '#000',
                transitionDelay: `${delay}ms` 
            }"
          />
          <!-- Right -->
          <span 
            class="absolute top-0 right-0 w-[2px] bg-current transition-all duration-[1000ms] ease-out"
            :style="{ 
                height: shouldAnimate ? '100%' : '0%', 
                backgroundColor: style.borderColor || style.color || '#000',
                transitionDelay: `${delay + 200}ms` 
            }"
          />
          <!-- Bottom -->
          <span 
            class="absolute bottom-0 right-0 h-[2px] bg-current transition-all duration-[1000ms] ease-out"
            :style="{ 
                width: shouldAnimate ? '100%' : '0%', 
                backgroundColor: style.borderColor || style.color || '#000',
                transitionDelay: `${delay + 400}ms` 
            }"
          />
          <!-- Left -->
          <span 
            class="absolute bottom-0 left-0 w-[2px] bg-current transition-all duration-[1000ms] ease-out"
            :style="{ 
                height: shouldAnimate ? '100%' : '0%', 
                backgroundColor: style.borderColor || style.color || '#000',
                transitionDelay: `${delay + 600}ms` 
            }"
          />
        </template>
      </div>
    </div>
  </div>
</template>

