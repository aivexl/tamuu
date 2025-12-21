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
    flapSpeed: 0.4
});

const containerStyle = computed(() => ({
    transform: props.direction === 'right' ? 'scaleX(-1)' : 'scaleX(1)',
    '--bird-color': props.color,
    '--flap-duration': `${props.flapSpeed}s`
}));
</script>

<template>
    <div class="svg-bird-wrapper" :style="containerStyle">
        <svg viewBox="0 0 100 60" class="svg-bird" preserveAspectRatio="xMidYMid meet">
            <!-- Body -->
            <ellipse 
                cx="50" cy="32" rx="18" ry="10" 
                :fill="color"
                class="bird-body"
            />
            
            <!-- Head -->
            <circle 
                cx="70" cy="28" r="8" 
                :fill="color"
            />
            
            <!-- Beak -->
            <polygon 
                points="78,28 90,30 78,32" 
                :fill="color"
            />
            
            <!-- Tail -->
            <polygon 
                points="32,30 10,20 15,35 10,45 32,35" 
                :fill="color"
            />
            
            <!-- Left Wing -->
            <path 
                d="M45,32 Q30,5 20,10 Q35,15 40,28 Z" 
                :fill="color"
                class="svg-bird-wing svg-bird-wing-left"
            />
            
            <!-- Right Wing -->
            <path 
                d="M55,32 Q70,55 80,50 Q65,45 60,32 Z" 
                :fill="color"
                class="svg-bird-wing svg-bird-wing-right"
            />
            
            <!-- Eye -->
            <circle cx="72" cy="26" r="2" fill="white"/>
            <circle cx="73" cy="26" r="1" fill="#333"/>
        </svg>
    </div>
</template>

<style scoped>
.svg-bird-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.svg-bird {
    width: 100%;
    height: 100%;
}

.svg-bird-wing {
    transform-origin: 50% 32px;
    animation: wing-flap var(--flap-duration, 0.4s) ease-in-out infinite;
}

.svg-bird-wing-left {
    animation-delay: 0s;
}

.svg-bird-wing-right {
    animation-delay: 0s;
    animation-direction: reverse;
}

@keyframes wing-flap {
    0%, 100% {
        transform: rotate(-25deg) translateY(0);
    }
    50% {
        transform: rotate(25deg) translateY(-3px);
    }
}
</style>
