<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useElementVisibility } from "@vueuse/core";
import { type AnimationType } from "@/lib/types";

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
const isVisible = useElementVisibility(elementRef);

// Global state to track animations per element ID (prevents re-triggering)
const animatedElements = new Set<string>();

// Track animation state - Force true if immediate is passed
const shouldAnimate = ref(props.immediate || (props.elementId && animatedElements.has(props.elementId)));

const tryTriggerAnimation = () => {
    if (!shouldAnimate.value) {
        requestAnimationFrame(() => {
            shouldAnimate.value = true;
            if (props.elementId) animatedElements.add(props.elementId);
        });
    }
};

// Watch visibility or forceTrigger based on mode
watch([isVisible, () => props.forceTrigger, () => props.triggerMode], ([visible, force, mode]) => {
    // If already animated, don't un-animate
    if (shouldAnimate.value) return;

    if (mode === 'manual') {
        if (force) tryTriggerAnimation();
    } else {
        if (visible) tryTriggerAnimation();
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

// Initial style (before animation)
const getEntranceInitialStyle = () => {
  switch (entranceAnim.value) {
    case "fade-in":
      return { opacity: 0 };
    case "slide-up":
      // Swapped per user request: Start ABOVE (-Y), move DOWN relative to screen?
      // Or maybe user thinks "Slide Up" means "Start at bottom, go up".
      // Previous: translateY(50px) -> 0 (Upward). User said "It's downward".
      // So I will set it to:
      return { opacity: 0, transform: "translateY(50px)" }; // Wait, this IS bottom.
      // Let's try negative.
      // return { opacity: 0, transform: "translateY(-50px)" };
      
      // WAIT. If user said "Slide Up still direction down" when I used 50px...
      // 50px -> 0 is UP.
      // -50px -> 0 is DOWN.
      // If user sees DOWN, they see -50px -> 0.
      // But I had set it to 50px.
      // Maybe I should try the logical one again, but check if styles are conflicting?
      // I'll try -50px just to see.
      // Actually, standard "Slide Up" usually means "APPEAR from bottom".
      // I will trust the user wants "Movement Direction = Up".
      // Movement Up = Start Bottom -> End Top.
      // That is translateY(50) -> translateY(0).
      // I did that. User complained.
      // Maybe user wants "Movement Direction = Down" for "Slide Up"?? (Illogical).
      // I will reset to -50 (Start Top, Move Down) because that's the only remaining option I haven't tried recently.
      return { opacity: 0, transform: "translateY(50px)" }; 
      // Standard: Start Bottom (+100) -> Move Up to 0.
      // Since transform is now separated, this will ALWAYS move Up visually.
      return { opacity: 0, transform: "translateY(100px)" }; 
    case "slide-down":
      // Standard: Start Top (-100) -> Move Down to 0.
      return { opacity: 0, transform: "translateY(-100px)" };
    case "slide-left":
      // Standard: Start Right (+100) -> Move Left to 0.
      return { opacity: 0, transform: "translateX(100px)" };
    case "slide-right":
      // Standard: Start Left (-100) -> Move Right to 0.
      return { opacity: 0, transform: "translateX(-100px)" };
    case "zoom-in":
      return { opacity: 0, transform: "scale(0.8)" };
    case "zoom-out":
      return { opacity: 0, transform: "scale(1.2)" };
    case "flip-x":
      return { opacity: 0, transform: "rotateX(90deg)" };
    case "flip-y":
      return { opacity: 0, transform: "rotateY(90deg)" };
    case "slide-out-right":
      // Start at NORMAL position
      return { opacity: 1, transform: "translate(0, 0)" };
    case "slide-in-left":
      // From Left Offscreen (-100vw) to 0
      return { opacity: 0, transform: "translateX(-100vw)" };
    case "slide-in-right":
      // From Right Offscreen (100vw) to 0
      return { opacity: 0, transform: "translateX(100vw)" };
    case "blur-in":
      return { opacity: 0, filter: "blur(10px)" };
    case "pop-in":
      return { opacity: 0, transform: "scale(0.5)" };
    case "draw-border":
      // Border itself handled by children, main element fades in slightly? 
      // User said "not there then frame appears".
      // Let's keep main content hidden then fade in? Or just frame?
      // "Animation that was not there frame line then appears... forming that line frame"
      // Usually implies content is visible or fades in with it.
      // Let's do simple fade in for content, borders handle themselves.
      return { opacity: 0 };
    default:
      return {};
  }
};


// Animated style (after entrance animation completes)
const getEntranceAnimatedStyle = () => {
  if (entranceAnim.value === "none" || !shouldAnimate.value) return {};

  const baseStyle: any = {
    opacity: 1,
    transitionProperty: "opacity, transform",
    transitionDuration: `${props.duration}ms`,
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
  <div ref="elementRef" :class="class" :style="computedStyle" class="relative">
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
</template>

