<template>
  <div class="flying-element" :class="type" :style="computedStyle">
    <img :src="imageSrc" :alt="type" class="flying-image" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface Props {
  type: 'bird' | 'butterfly-gold' | 'butterfly-blue';
  startX?: number; // Starting X position (%)
  startY?: number; // Starting Y position (%)
  size?: number;   // Size in pixels
  duration?: number; // Animation duration in seconds
  delay?: number;  // Animation delay in seconds
  direction?: 'left-to-right' | 'right-to-left' | 'random';
}

const props = withDefaults(defineProps<Props>(), {
  startX: 0,
  startY: 50,
  size: 60,
  duration: 15,
  delay: 0,
  direction: 'left-to-right',
});

// Image sources from Cloudflare R2
const R2_BASE = 'https://pub-1e0a9ae6152440268987d00a564a8da5.r2.dev/photos/2025/12';
const images: Record<string, string> = {
  'bird': `${R2_BASE}/1766118233945-5hn7z.png`,        // bird-warm
  'bird-warm': `${R2_BASE}/1766118233945-5hn7z.png`,
  'bird-cool': `${R2_BASE}/1766118287972-657f6o.png`,
  'butterfly-gold': `${R2_BASE}/1766118295218-q7dx3c.png`,
  'butterfly-blue': `${R2_BASE}/1766118302329-grvg9g.png`,
};

const imageSrc = computed(() => images[props.type] || images['bird']);

const randomOffset = ref(Math.random() * 20 - 10);

const computedStyle = computed(() => ({
  '--start-x': `${props.startX}%`,
  '--start-y': `${props.startY}%`,
  '--size': `${props.size}px`,
  '--duration': `${props.duration}s`,
  '--delay': `${props.delay}s`,
  '--float-offset': `${randomOffset.value}px`,
  '--direction': props.direction === 'right-to-left' ? 'reverse' : 'normal',
}));
</script>

<style scoped>
.flying-element {
  position: absolute;
  width: var(--size);
  height: var(--size);
  left: var(--start-x);
  top: var(--start-y);
  pointer-events: none;
  z-index: 100;
  animation: 
    fly-horizontal var(--duration) linear var(--delay) infinite var(--direction),
    fly-vertical calc(var(--duration) / 3) ease-in-out var(--delay) infinite alternate,
    flutter 0.3s ease-in-out infinite;
}

.flying-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.1));
}

/* Bird specific animation */
.bird .flying-image,
.bird-warm .flying-image,
.bird-cool .flying-image {
  animation: bird-flap 0.6s ease-in-out infinite;
  transform-origin: center;
}

/* Butterfly specific animation */
.butterfly-gold .flying-image,
.butterfly-blue .flying-image {
  animation: butterfly-flap 4s ease-in-out infinite;
  perspective: 1000px;
  transform-origin: center;
}


/* Horizontal flying path */
@keyframes fly-horizontal {
  0% {
    transform: translateX(-100px);
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
  95% {
    opacity: 1;
  }
  100% {
    transform: translateX(calc(100vw + 100px));
    opacity: 0;
  }
}

/* Vertical bobbing motion */
@keyframes fly-vertical {
  0% {
    margin-top: 0;
  }
  100% {
    margin-top: var(--float-offset);
  }
}

/* Subtle flutter/wobble */
@keyframes flutter {
  0%, 100% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
}

/* Bird - Graceful wing flap (ScaleY) */
@keyframes bird-flap {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.7) translateY(2px);
  }
}

/* Butterfly - 3D fold flap (RotateY) */
@keyframes butterfly-flap {
  0%, 100% {
    transform: perspective(400px) rotateY(0deg);
  }
  50% {
    transform: perspective(400px) rotateY(60deg) scaleX(0.8);
  }
}
</style>
