<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    color?: string;
    direction?: 'left' | 'right';
    flapSpeed?: number;
}

const props = withDefaults(defineProps<Props>(), {
    color: '#1a1a1a',
    direction: 'left',
    flapSpeed: 0.5
});

const containerStyle = computed(() => ({
    transform: props.direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
    '--butterfly-color': props.color,
    '--flap-duration': `${props.flapSpeed}s`
}));
</script>

<template>
    <div class="svg-butterfly-wrapper" :style="containerStyle">
        <svg viewBox="0 0 100 80" class="svg-butterfly" preserveAspectRatio="xMidYMid meet">
            <!-- Body -->
            <ellipse 
                cx="50" cy="40" rx="4" ry="18" 
                :fill="color"
            />
            
            <!-- Head -->
            <circle 
                cx="50" cy="18" r="5" 
                :fill="color"
            />
            
            <!-- Antennae -->
            <path d="M47,15 Q40,5 35,8" :stroke="color" stroke-width="1.5" fill="none"/>
            <path d="M53,15 Q60,5 65,8" :stroke="color" stroke-width="1.5" fill="none"/>
            <circle cx="35" cy="8" r="2" :fill="color"/>
            <circle cx="65" cy="8" r="2" :fill="color"/>
            
            <!-- Left Upper Wing -->
            <path 
                d="M46,28 Q20,10 15,30 Q10,50 30,55 Q46,50 46,40 Z" 
                :fill="color"
                class="svg-butterfly-wing svg-butterfly-wing-upper-left"
            />
            
            <!-- Right Upper Wing -->
            <path 
                d="M54,28 Q80,10 85,30 Q90,50 70,55 Q54,50 54,40 Z" 
                :fill="color"
                class="svg-butterfly-wing svg-butterfly-wing-upper-right"
            />
            
            <!-- Left Lower Wing -->
            <path 
                d="M46,45 Q25,50 20,65 Q30,75 46,58 Z" 
                :fill="color"
                class="svg-butterfly-wing svg-butterfly-wing-lower-left"
            />
            
            <!-- Right Lower Wing -->
            <path 
                d="M54,45 Q75,50 80,65 Q70,75 54,58 Z" 
                :fill="color"
                class="svg-butterfly-wing svg-butterfly-wing-lower-right"
            />
        </svg>
    </div>
</template>

<style scoped>
.svg-butterfly-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    perspective: 300px;
}

.svg-butterfly {
    width: 100%;
    height: 100%;
}

.svg-butterfly-wing {
    transform-origin: 50% 40px;
}

.svg-butterfly-wing-upper-left,
.svg-butterfly-wing-lower-left {
    transform-origin: 46px 40px;
    animation: butterfly-flap-left var(--flap-duration, 0.5s) ease-in-out infinite;
}

.svg-butterfly-wing-upper-right,
.svg-butterfly-wing-lower-right {
    transform-origin: 54px 40px;
    animation: butterfly-flap-right var(--flap-duration, 0.5s) ease-in-out infinite;
}

@keyframes butterfly-flap-left {
    0%, 100% {
        transform: rotateY(0deg) scaleX(1);
    }
    50% {
        transform: rotateY(60deg) scaleX(0.3);
    }
}

@keyframes butterfly-flap-right {
    0%, 100% {
        transform: rotateY(0deg) scaleX(1);
    }
    50% {
        transform: rotateY(-60deg) scaleX(0.3);
    }
}
</style>
