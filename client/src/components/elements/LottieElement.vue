<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Vue3Lottie } from 'vue3-lottie';

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

const lottieRef = ref<any>(null);
const animationData = ref<any>(null);
const isLoading = ref(true);
const hasError = ref(false);

const containerStyle = computed(() => ({
    transform: props.direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
    width: '100%',
    height: '100%'
}));

const loadAnimation = async () => {
    if (!props.animationUrl) {
        hasError.value = true;
        isLoading.value = false;
        return;
    }
    
    try {
        isLoading.value = true;
        hasError.value = false;
        
        const response = await fetch(props.animationUrl);
        if (!response.ok) throw new Error('Failed to load animation');
        
        animationData.value = await response.json();
        isLoading.value = false;
    } catch (error) {
        console.error('Failed to load Lottie animation:', error);
        hasError.value = true;
        isLoading.value = false;
    }
};

onMounted(() => {
    loadAnimation();
});

watch(() => props.animationUrl, () => {
    loadAnimation();
});
</script>

<template>
    <div class="lottie-element" :style="containerStyle">
        <!-- Loading state -->
        <div v-if="isLoading" class="flex items-center justify-center w-full h-full">
            <div class="animate-pulse bg-slate-200 rounded-full w-8 h-8"></div>
        </div>
        
        <!-- Error state -->
        <div v-else-if="hasError" class="flex items-center justify-center w-full h-full text-red-400">
            <span class="text-xs">⚠️</span>
        </div>
        
        <!-- Lottie animation -->
        <Vue3Lottie 
            v-else-if="animationData"
            ref="lottieRef"
            :animation-data="animationData"
            :loop="loop"
            :auto-play="autoPlay"
            :speed="speed"
            class="w-full h-full"
        />
    </div>
</template>

<style scoped>
.lottie-element {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
