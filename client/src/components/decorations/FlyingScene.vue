<template>
  <div class="flying-scene" :style="{ height: height }">
    <!-- Multiple flying elements with staggered timing -->
    <FlyingElement
      v-for="(element, index) in elements"
      :key="index"
      :type="element.type"
      :startX="element.startX"
      :startY="element.startY"
      :size="element.size"
      :duration="element.duration"
      :delay="element.delay"
      :direction="element.direction"
    />
    
    <!-- Content slot -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FlyingElement from './FlyingElement.vue';

interface Props {
  preset?: 'birds' | 'butterflies' | 'mixed' | 'romantic';
  count?: number;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  preset: 'mixed',
  count: 5,
  height: '100%',
});

type ElementType = 'bird' | 'bird-warm' | 'bird-cool' | 'butterfly-gold' | 'butterfly-blue';
type Direction = 'left-to-right' | 'right-to-left';

interface FlyingConfig {
  type: ElementType;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  delay: number;
  direction: Direction;
}

const getRandomInRange = (min: number, max: number) => 
  Math.random() * (max - min) + min;

const elements = computed((): FlyingConfig[] => {
  const result: FlyingConfig[] = [];
  
  for (let i = 0; i < props.count; i++) {
    let type: ElementType;
    
    switch (props.preset) {
      case 'birds':
        type = 'bird';
        break;
      case 'butterflies':
        type = Math.random() > 0.5 ? 'butterfly-gold' : 'butterfly-blue';
        break;
      case 'romantic':
        type = Math.random() > 0.7 ? 'bird' : 
               Math.random() > 0.5 ? 'butterfly-gold' : 'butterfly-blue';
        break;
      default: // mixed
        const types: ElementType[] = ['bird', 'butterfly-gold', 'butterfly-blue'];
        type = types[Math.floor(Math.random() * types.length)];
    }
    
    result.push({
      type,
      startX: getRandomInRange(-10, 10),
      startY: getRandomInRange(10, 80),
      size: getRandomInRange(40, 80),
      duration: getRandomInRange(12, 20),
      delay: getRandomInRange(0, 10),
      direction: Math.random() > 0.3 ? 'left-to-right' : 'right-to-left',
    });
  }
  
  return result;
});
</script>

<style scoped>
.flying-scene {
  position: relative;
  width: 100%;
  overflow: hidden;
}
</style>
