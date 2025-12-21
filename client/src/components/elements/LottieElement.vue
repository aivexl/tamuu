<script setup lang="ts">
import { computed } from 'vue';
import { DotLottieVue } from '@lottiefiles/dotlottie-vue';

interface Props {
    animationUrl: string;
    direction?: 'left' | 'right';
    speed?: number;
    loop?: boolean;
    autoPlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    direction: 'left',
    speed: 1,
    loop: true,
    autoPlay: true
});

const containerStyle = computed(() => ({
    transform: props.direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
    width: '100%',
    height: '100%'
}));
</script>

<template>
    <div class="lottie-element" :style="containerStyle">
        <DotLottieVue 
            v-if="animationUrl"
            :src="animationUrl"
            :autoplay="autoPlay"
            :loop="loop"
            :speed="speed"
            class="w-full h-full"
        />
        <div v-else class="flex items-center justify-center w-full h-full text-slate-400">
            <span class="text-xs">No Animation URL</span>
        </div>
    </div>
</template>

<style scoped>
.lottie-element {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
