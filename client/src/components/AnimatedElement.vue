<script setup lang="ts">
import { computed, ref, styleValue } from "vue";
import { useElementVisibility } from "@vueuse/core";
import { type AnimationType } from "@/lib/types";

interface Props {
  animation?: AnimationType;
  loopAnimation?: AnimationType;
  delay?: number;
  duration?: number;
  class?: string;
  style?: any;
}

const props = withDefaults(defineProps<Props>(), {
  animation: "none",
  delay: 0,
  duration: 800,
  class: "",
  style: {},
});

const elementRef = ref<HTMLElement | null>(null);
const isVisible = useElementVisibility(elementRef);

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

const getEntranceInitialStyle = () => {
  switch (entranceAnim.value) {
    case "fade-in":
      return { opacity: 0 };
    case "slide-up":
      return { opacity: 0, transform: "translateY(40px)" };
    case "slide-down":
      return { opacity: 0, transform: "translateY(-40px)" };
    case "slide-left":
      return { opacity: 0, transform: "translateX(40px)" };
    case "slide-right":
      return { opacity: 0, transform: "translateX(-40px)" };
    case "zoom-in":
      return { opacity: 0, transform: "scale(0.8)" };
    case "zoom-out":
      return { opacity: 0, transform: "scale(1.2)" };
    case "flip-x":
      return { opacity: 0, transform: "rotateX(90deg)" };
    case "flip-y":
      return { opacity: 0, transform: "rotateY(90deg)" };
    case "bounce":
      return { opacity: 0, transform: "translateY(40px)" };
    default:
      return {};
  }
};

const getEntranceAnimatedStyle = () => {
  if (entranceAnim.value === "none" || !isVisible.value) return {};

  return {
    opacity: 1,
    transform: "none",
    transitionProperty: "opacity, transform",
    transitionDuration: `${props.duration}ms`,
    transitionDelay: `${props.delay}ms`,
    transitionTimingFunction:
      entranceAnim.value === "bounce"
        ? "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
        : "ease-out",
  };
};

const computedStyle = computed(() => {
  let finalStyle = { ...props.style };

  if (entranceAnim.value !== "none") {
    if (isVisible.value) {
      finalStyle = { ...finalStyle, ...getEntranceAnimatedStyle() };
    } else {
      finalStyle = { ...finalStyle, ...getEntranceInitialStyle() };
    }
  }

  if (loopAnim.value && isVisible.value) {
    // If we have an entrance animation, we should wait for it, but CSS merge is tricky.
    // If both set 'transform', loop overrides entrance?
    // In React code: they are merged. If entrance sets transform: none, and loop sets transform: rotate, conflict?
    // Actually React logic returns finalStyle.
    // If entrance is done, we might want loop to take over.
    // But entrance sets 'transform: none'. Loop sets 'animationName'.
    // 'animation' property handles keyframes. 'transition' handles entrance.
    // So they can coexist if properties don't conflict excessively.
    // However, if entrance sets opacity 0->1, and loop sets opacity 1->0.8 (sparkle), it works.
    finalStyle = { ...finalStyle, ...getLoopingAnimationStyle(loopAnim.value!) };
  }

  return finalStyle;
});
</script>

<template>
  <div ref="elementRef" :class="class" :style="computedStyle">
    <slot />
  </div>
</template>
