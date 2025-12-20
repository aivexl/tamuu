<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { ParticleType } from '@/lib/types';

interface Props {
  type: ParticleType;
  count?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'none',
  count: 8,
});

interface Particle {
  id: string;
  left: number;
  top: number;
  delay: number;
  duration: number;
  scale: number;
  opacity: number;
}

const particles = ref<Particle[]>([]);

const particleAssets: Record<Exclude<ParticleType, 'none'>, string> = {
  'butterflies': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Cpath d="M12 5a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V12h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v3.27c.6.34 1 .99 1 1.73a2 2 0 0 1-2 2 2 2 0 0 1-2-2c0-.74.4-1.39 1-1.73V16H9a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2V8.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/%3E%3C/svg%3E',
  'petals': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(255,182,193,0.6)"%3E%3Ccircle cx="12" cy="8" r="3"/%3E%3Cellipse cx="8" cy="12" rx="3" ry="4" transform="rotate(-30 8 12)"/%3E%3Cellipse cx="16" cy="12" rx="3" ry="4" transform="rotate(30 16 12)"/%3E%3C/svg%3E',
  'leaves': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(34,139,34,0.4)"%3E%3Cpath d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.59-2.17c1.81.8 3.74 1.17 5.7 1.17 4.97 0 9-4.03 9-9 0-2.21-.8-4.23-2.12-5.78L17 8z"/%3E%3C/svg%3E',
  'sparkles': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="gold"%3E%3Cpath d="M12 2l1.09 3.26L16 6.35l-3.26 1.09L11.65 11 10.56 7.74 7 6.65l3.56-1.09L12 2zm0 10l.72 2.17L15 14.9l-2.17.72L12.1 18l-.72-2.17L9 15.1l2.17-.72L11.28 12z"/%3E%3C/svg%3E',
};

const getParticleImage = (type: ParticleType) => {
  if (type === 'none') return '';
  return particleAssets[type];
};

const generateParticles = () => {
  if (props.type === 'none') return;
  
  particles.value = Array.from({ length: props.count }, (_, i) => ({
    id: `particle-${i}-${Date.now()}`,
    left: Math.random() * 100,
    top: -10 - Math.random() * 20, // Start above viewport
    delay: Math.random() * 5,
    duration: 15 + Math.random() * 10, // 15-25 seconds
    scale: 0.5 + Math.random() * 0.8, // 0.5 to 1.3
    opacity: 0.3 + Math.random() * 0.4, // 0.3 to 0.7
  }));
};

onMounted(() => {
  generateParticles();
});

onUnmounted(() => {
  particles.value = [];
});
</script>

<template>
  <div v-if="type !== 'none'" class="particle-overlay">
    <div
      v-for="particle in particles"
      :key="particle.id"
      class="particle"
      :style="{
        left: `${particle.left}%`,
        top: `${particle.top}%`,
        animationDelay: `${particle.delay}s`,
        animationDuration: `${particle.duration}s`,
        transform: `scale(${particle.scale})`,
        opacity: particle.opacity,
      }"
    >
      <img
        :src="getParticleImage(type)"
        :alt="type"
        class="particle-image"
      />
    </div>
  </div>
</template>

<style scoped>
.particle-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 40px;
  height: 40px;
  animation: float-down linear infinite;
  will-change: transform;
}

.particle-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

@keyframes float-down {
  0% {
    transform: translateY(0) translateX(0) rotate(0deg);
  }
  25% {
    transform: translateY(25vh) translateX(10px) rotate(90deg);
  }
  50% {
    transform: translateY(50vh) translateX(-10px) rotate(180deg);
  }
  75% {
    transform: translateY(75vh) translateX(15px) rotate(270deg);
  }
  100% {
    transform: translateY(110vh) translateX(0) rotate(360deg);
  }
}
</style>
