<script setup lang="ts">
import { computed } from "vue";
// import { useMotion } from "@vueuse/motion"; // Using v-motion directive instead for declarative usage

// Types
type AnimationType = 
  | 'none'
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'zoom-out'
  | 'flip-x'
  | 'flip-y'
  | 'bounce'
  | 'sway'
  | 'float'
  | 'pulse'
  | 'sparkle'
  | 'spin'
  | 'shake'
  | 'swing'
  | 'heartbeat'
  | 'glow';

interface Props {
  animation: AnimationType;
  delay?: number;
  class?: string;
  style?: any;
}

const props = withDefaults(defineProps<Props>(), {
  animation: 'none',
  delay: 0,
});

const variants = {
    none: {
        initial: {},
        visible: {},
    },
    'fade-in': {
        initial: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 800, ease: 'easeOut' } },
    },
    'slide-up': {
        initial: { opacity: 0, y: 60 },
        visible: { opacity: 1, y: 0, transition: { duration: 700, ease: 'easeOut' } },
    },
    'slide-down': {
        initial: { opacity: 0, y: -60 },
        visible: { opacity: 1, y: 0, transition: { duration: 700, ease: 'easeOut' } },
    },
    'slide-left': {
        initial: { opacity: 0, x: 60 },
        visible: { opacity: 1, x: 0, transition: { duration: 700, ease: 'easeOut' } },
    },
    'slide-right': {
        initial: { opacity: 0, x: -60 },
        visible: { opacity: 1, x: 0, transition: { duration: 700, ease: 'easeOut' } },
    },
    'zoom-in': {
        initial: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1, transition: { duration: 600, ease: 'easeOut' } },
    },
    'zoom-out': {
        initial: { opacity: 0, scale: 1.2 },
        visible: { opacity: 1, scale: 1, transition: { duration: 600, ease: 'easeOut' } },
    },
    'flip-x': {
        initial: { opacity: 0, rotateX: 90 },
        visible: { opacity: 1, rotateX: 0, transition: { duration: 800, ease: 'easeOut' } },
    },
    'flip-y': {
        initial: { opacity: 0, rotateY: 90 },
        visible: { opacity: 1, rotateY: 0, transition: { duration: 800, ease: 'easeOut' } },
    },
    bounce: {
        initial: { opacity: 0, y: 60 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 15,
            },
        },
    },
    // Continuous animations
    sway: {
        initial: {},
        visible: {
            x: [-10, 10, -10],
            transition: {
                duration: 4000,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    },
    float: {
        initial: {},
        visible: {
            y: [-5, 5, -5],
            transition: {
                duration: 3000,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    },
    pulse: {
        initial: {},
        visible: {
            scale: [1, 1.05, 1],
            transition: {
                duration: 2000,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    },
    sparkle: {
        initial: {},
        visible: {
            opacity: [0.8, 1, 0.8],
            filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
            transition: {
                duration: 1500,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    },
    spin: {
        initial: {},
        visible: {
            rotate: 360,
            transition: {
                duration: 2000,
                repeat: Infinity,
                ease: 'linear',
            },
        },
    },
    shake: {
        initial: {},
        visible: {
            x: [-2, 2, -2, 2, 0],
            transition: {
                duration: 500,
                repeat: Infinity,
                repeatDelay: 2000,
            },
        },
    },
    swing: {
        initial: {},
        visible: {
            rotate: [-5, 5, -5],
            transition: {
                duration: 2000,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    },
    heartbeat: {
        initial: {},
        visible: {
            scale: [1, 1.1, 1, 1.1, 1],
            transition: {
                duration: 1500,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    },
    glow: {
        initial: {},
        visible: {
            boxShadow: [
                '0 0 20px rgba(255, 255, 255, 0.3)',
                '0 0 30px rgba(255, 255, 255, 0.6)',
                '0 0 20px rgba(255, 255, 255, 0.3)',
            ],
            transition: {
                duration: 2000,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
    },
};

const motionConfig = computed(() => {
    const v = variants[props.animation] || variants.none;
    const visibleVariant = v.visible as Record<string, unknown>;
    const existingTransition = ('transition' in visibleVariant ? visibleVariant.transition : {}) as Record<string, unknown>;
    return {
        initial: v.initial,
        visible: {
            ...visibleVariant,
            transition: {
                ...existingTransition,
                delay: props.delay * 1000 // VueUse Motion uses ms
            }
        }
    };
});
</script>

<template>
  <div
    v-motion
    :initial="motionConfig.initial"
    :visible="motionConfig.visible"
    :delay="delay * 1000" 
    :class="class"
    :style="style"
  >
    <slot />
  </div>
</template>
