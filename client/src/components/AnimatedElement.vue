<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useElementVisibility } from "@vueuse/core";
import { type AnimationType } from "@/lib/types";

// SHARED STATE: Persist manual triggers (Open Invitation button) across remounts
const permanentAnimations = new Set<string>();

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
const isVisible = useElementVisibility(elementRef, { 
    threshold: 0.1, // Trigger when 10% is visible
    rootMargin: '20px 0px 20px 0px' // Start slightly early for smoothness
});

// Track animation state
const shouldAnimate = ref(props.elementId ? permanentAnimations.has(props.elementId) : false);

const tryTriggerAnimation = () => {
    if (!shouldAnimate.value) {
        requestAnimationFrame(() => {
            shouldAnimate.value = true;
            // Only memorize manual triggers (pro standard)
            if (props.triggerMode === 'manual' && props.elementId) {
                permanentAnimations.add(props.elementId);
            }
        });
    }
};

// Trigger immediately if prop is set
onMounted(() => {
    if (props.immediate) {
        tryTriggerAnimation();
    }
});

// Watch visibility or forceTrigger based on mode
watch([isVisible, () => props.forceTrigger, () => props.triggerMode], ([visible, force, mode]) => {
    if (mode === 'manual') {
        // MANUAL MODE: Persistence logic
        if (shouldAnimate.value) return;
        if (force) tryTriggerAnimation();
    } else {
        // AUTO MODE: Re-trigger logic (Pro standard: animate on entry, reset on exit)
        if (visible) {
            tryTriggerAnimation();
        } else if (!props.immediate) {
            // Reset state so it can re-animate when entering again
            // We only reset if NOT immediate to avoid cover flickering
            shouldAnimate.value = false;
        }
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

const computedStyle = computed(() => {
  let finalStyle = { ...props.style };

  if (entranceAnim.value !== "none") {
    if (shouldAnimate.value) {
      finalStyle = { ...finalStyle, ...getEntranceAnimatedStyle() };
    } else {
      finalStyle = { ...finalStyle, ...getEntranceInitialStyle() };
    }
  }

  if (loopAnim.value && shouldAnimate.value) {
    finalStyle = { ...finalStyle, ...getLoopingAnimationStyle(loopAnim.value!) };
  }

  return finalStyle;
});
</script>

<template>
  <div ref="elementRef" :class="class" class="relative">
    <div :style="computedStyle" class="w-full h-full relative">
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
</template>

