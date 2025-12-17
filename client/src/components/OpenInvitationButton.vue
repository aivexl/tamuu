<script setup lang="ts">
import { computed } from "vue";
import { type OpenInvitationConfig } from "@/lib/types";
import {
  MailOpen,
  Heart,
  Sparkles,
  Mail,
  Send,
  ChevronDown,
  Star,
  Coffee,
  Cloud,
  Gift,
  Anchor,
  Feather,
  Smile,
  Zap,
} from "lucide-vue-next";

interface Props {
  config: OpenInvitationConfig;
  scale?: number;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1,
});

const emit = defineEmits(["click"]);

const iconMap: Record<string, any> = {
  "mail-open": MailOpen,
  heart: Heart,
  sparkles: Sparkles,
  mail: Mail,
  send: Send,
  "chevron-down": ChevronDown,
  star: Star,
  coffee: Coffee,
  cloud: Cloud,
  gift: Gift,
  anchor: Anchor,
  feather: Feather,
  smile: Smile,
  zap: Zap,
};

const IconComponent = computed(() => {
  return props.config.iconName ? iconMap[props.config.iconName] || MailOpen : null;
});

const getAnimationClass = (animation?: string) => {
  switch (animation) {
    case "pulse":
      return "animate-pulse";
    case "bounce":
      return "animate-bounce";
    case "float":
      return "animate-float";
    case "glow":
      return "animate-pulse";
    default:
      return "";
  }
};

const getBorderRadius = (shape: string, scale: number) => {
  switch (shape) {
    case "pill":
      return "9999px";
    case "rounded":
      return `${12 * scale}px`;
    case "rectangle":
      return "0px";
    case "stadium":
      return `${20 * scale}px`;
    default:
      return `${8 * scale}px`;
  }
};
</script>

<template>
  <!-- 1. Elegant -->
  <button
    v-if="config.buttonStyle === 'elegant'"
    @click="$emit('click')"
    :class="[
      'flex flex-col items-center gap-2 transition-all duration-500 hover:scale-105 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${16 * scale}px ${40 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: config.fontWeight === 'bold' ? 700 : 500,
      letterSpacing: '0.1em',
      textTransform: config.textTransform || 'uppercase',
      borderRadius: getBorderRadius(config.buttonShape, scale),
      boxShadow: `0 10px 30px -10px ${config.buttonColor}80`,
      border: `1px solid ${config.borderColor || 'transparent'}`,
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="24 * scale"
      :color="config.textColor"
    />
    <span>{{ config.buttonText }}</span>
    <span
      v-if="config.subText"
      :style="{ fontSize: `${(config.fontSize - 4) * scale}px`, opacity: 0.8 }"
    >
      {{ config.subText }}
    </span>
  </button>

  <!-- 2. Minimal -->
  <button
    v-else-if="config.buttonStyle === 'minimal'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-3 group transition-all duration-300',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${12 * scale}px ${24 * scale}px`,
      backgroundColor: 'transparent',
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 600,
      textTransform: config.textTransform || 'uppercase',
      letterSpacing: '0.15em',
      border: 'none',
    }"
  >
    <span class="relative">
      {{ config.buttonText }}
      <span
        class="absolute -bottom-2 left-0 w-0 h-[1px] bg-current transition-all duration-300 group-hover:w-full"
        :style="{ backgroundColor: config.textColor }"
      ></span>
    </span>
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="18 * scale"
      :color="config.textColor"
    />
  </button>

  <!-- 3. Glass -->
  <button
    v-else-if="config.buttonStyle === 'glass'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-3 transition-all duration-300 hover:bg-white/10 hover:scale-105 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${16 * scale}px ${36 * scale}px`,
      backgroundColor: `${config.buttonColor}40`,
      backdropFilter: `blur(${config.backdropBlur || 12}px)`,
      WebkitBackdropFilter: `blur(${config.backdropBlur || 12}px)`,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 500,
      letterSpacing: '0.05em',
      borderRadius: getBorderRadius(config.buttonShape, scale),
      border: `1px solid ${config.borderColor || 'rgba(255,255,255,0.3)'}`,
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="20 * scale"
      :color="config.textColor"
    />
    <span class="drop-shadow-sm">{{ config.buttonText }}</span>
  </button>

  <!-- 4. Outline -->
  <button
    v-else-if="config.buttonStyle === 'outline'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-3 transition-all duration-300 hover:bg-white/5 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${14 * scale}px ${32 * scale}px`,
      backgroundColor: 'transparent',
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: config.textTransform || 'uppercase',
      borderRadius: getBorderRadius(config.buttonShape, scale),
      border: `${config.borderWidth || 2}px solid ${config.borderColor || config.textColor}`,
    }"
  >
    {{ config.buttonText }}
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="20 * scale"
      :color="config.textColor"
    />
  </button>

  <!-- 5. Neon -->
  <button
    v-else-if="config.buttonStyle === 'neon'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${14 * scale}px ${30 * scale}px`,
      backgroundColor: 'transparent',
      color: config.buttonColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
      borderRadius: getBorderRadius(config.buttonShape, scale),
      border: `2px solid ${config.buttonColor}`,
      boxShadow: `0 0 10px ${config.buttonColor}, inset 0 0 10px ${config.buttonColor}`,
      textShadow: `0 0 5px ${config.buttonColor}, 0 0 10px ${config.buttonColor}`,
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="20 * scale"
      :color="config.buttonColor"
    />
    {{ config.buttonText }}
  </button>

  <!-- 6. Gradient -->
  <button
    v-else-if="config.buttonStyle === 'gradient'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-3 transition-all duration-500 hover:brightness-110 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${16 * scale}px ${40 * scale}px`,
      background: `linear-gradient(135deg, ${config.buttonColor} 0%, ${config.gradientEndColor || config.buttonColor} 100%)`,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 600,
      borderRadius: getBorderRadius(config.buttonShape, scale),
      border: 'none',
      boxShadow: `0 10px 20px -5px ${config.buttonColor}80`,
    }"
  >
    {{ config.buttonText }}
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="20 * scale"
      :color="config.textColor"
    />
  </button>

  <!-- 7. Luxury -->
  <button
    v-else-if="config.buttonStyle === 'luxury'"
    @click="$emit('click')"
    :class="[
      'flex flex-col items-center gap-1 transition-all duration-500 hover:scale-105',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${18 * scale}px ${48 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      textTransform: 'uppercase',
      letterSpacing: '0.2em',
      border: `1px solid ${config.borderColor || '#D4AF37'}`,
      outline: `4px double ${config.borderColor || '#D4AF37'}`,
      outlineOffset: '-6px',
      borderRadius: '0',
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="16 * scale"
      :color="config.textColor"
      class="mb-1"
    />
    <span style="font-weight: 400">{{ config.buttonText }}</span>
  </button>

  <!-- 8. Romantic -->
  <button
    v-else-if="config.buttonStyle === 'romantic'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${14 * scale}px ${36 * scale}px`,
      backgroundColor: '#fff',
      color: config.buttonColor,
      fontFamily: config.fontFamily,
      fontSize: `${(config.fontSize + 2) * scale}px`,
      fontStyle: 'italic',
      fontWeight: 500,
      borderRadius: '50px',
      border: `1px solid ${config.buttonColor}40`,
      boxShadow: `0 5px 15px ${config.buttonColor}20`,
    }"
  >
    <span>{{ config.buttonText }}</span>
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="18 * scale"
      :fill="config.buttonColor"
      :color="config.buttonColor"
    />
  </button>

  <!-- 9. Boho -->
  <button
    v-else-if="config.buttonStyle === 'boho'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-3 transition-transform duration-300 hover:scale-105',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${16 * scale}px ${40 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
      border: `1px dashed ${config.borderColor || config.textColor}60`,
      boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
    }"
  >
    {{ config.buttonText }}
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="20 * scale"
      :color="config.textColor"
    />
  </button>

  <!-- 10. Modern -->
  <button
    v-else-if="config.buttonStyle === 'modern'"
    @click="$emit('click')"
    :class="[
      'flex items-center justify-between transition-all duration-300 hover:bg-opacity-90 active:translate-y-1',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${16 * scale}px ${32 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 700,
      textTransform: 'none',
      borderRadius: '6px',
      boxShadow: `4px 4px 0px ${config.shadowColor || '#000'}`,
      border: `2px solid ${config.shadowColor || '#000'}`,
      minWidth: `${160 * scale}px`,
    }"
  >
    {{ config.buttonText }}
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="20 * scale"
      :color="config.textColor"
      class="ml-4"
    />
  </button>

  <!-- 11. Vintage -->
  <button
    v-else-if="config.buttonStyle === 'vintage'"
    @click="$emit('click')"
    :class="[
      'relative flex items-center justify-center transition-all duration-300 hover:scale-105',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${14 * scale}px ${36 * scale}px`,
      backgroundColor: 'transparent',
      color: config.buttonColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
      borderTop: `1px solid ${config.buttonColor}`,
      borderBottom: `1px solid ${config.buttonColor}`,
    }"
  >
    <span
      class="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-[1px]"
      :style="{ backgroundColor: config.buttonColor }"
    ></span>
    <span
      class="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-[1px]"
      :style="{ backgroundColor: config.buttonColor }"
    ></span>
    <span class="px-4">{{ config.buttonText }}</span>
  </button>

  <!-- 12. Playful -->
  <button
    v-else-if="config.buttonStyle === 'playful'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-2 transition-transform duration-300 hover:rotate-3 hover:scale-110 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${16 * scale}px ${32 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 800,
      borderRadius: '24px',
      border: '4px solid white',
      boxShadow: `0 8px 0 ${config.shadowColor || '#e2e8f0'}`,
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="24 * scale"
      :color="config.textColor"
    />
    {{ config.buttonText }}
  </button>

  <!-- 13. Rustic -->
  <button
    v-else-if="config.buttonStyle === 'rustic'"
    @click="$emit('click')"
    :class="[
      'flex flex-col items-center justify-center transition-all duration-300 opacity-90 hover:opacity-100',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${12 * scale}px ${30 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      border: `1px solid ${config.borderColor || config.textColor}`,
      borderRadius: '2px',
      backgroundImage:
        'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)',
    }"
  >
    {{ config.buttonText }}
    <span
      v-if="config.subText"
      style="font-size: 0.7em; margin-top: 4px; font-style: italic"
    >
      — {{ config.subText }} —
    </span>
  </button>

  <!-- 14. Cloud -->
  <button
    v-else-if="config.buttonStyle === 'cloud'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-3 transition-all duration-500 hover:translate-y-[-4px] active:translate-y-[1px]',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${20 * scale}px ${48 * scale}px`,
      backgroundColor: 'white',
      color: config.buttonColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 600,
      borderRadius: '50px',
      boxShadow: `0 10px 25px -5px ${config.buttonColor}40`,
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="22 * scale"
      :color="config.buttonColor"
    />
    {{ config.buttonText }}
  </button>

  <!-- 15. Sticker -->
  <button
    v-else-if="config.buttonStyle === 'sticker'"
    @click="$emit('click')"
    :class="[
      'flex items-center gap-2 transition-transform duration-200 hover:rotate-2 hover:scale-105 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${12 * scale}px ${28 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: 700,
      transform: 'rotate(-2deg)',
      borderRadius: '8px',
      border: '3px solid white',
      boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="20 * scale"
      :color="config.textColor"
    />
    {{ config.buttonText }}
  </button>

  <!-- Default Fallback -->
  <button
    v-else
    @click="$emit('click')"
    :class="[
      'flex flex-col items-center gap-2 transition-all duration-500 hover:scale-105 active:scale-95',
      getAnimationClass(config.animation),
      props.class
    ]"
    :style="{
      padding: `${16 * scale}px ${40 * scale}px`,
      backgroundColor: config.buttonColor,
      color: config.textColor,
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize * scale}px`,
      fontWeight: config.fontWeight === 'bold' ? 700 : 500,
      letterSpacing: '0.1em',
      textTransform: config.textTransform || 'uppercase',
      borderRadius: getBorderRadius(config.buttonShape, scale),
      boxShadow: `0 10px 30px -10px ${config.buttonColor}80`,
      border: `1px solid ${config.borderColor || 'transparent'}`,
    }"
  >
    <component
      :is="IconComponent"
      v-if="config.showIcon && IconComponent"
      :size="24 * scale"
      :color="config.textColor"
    />
    <span>{{ config.buttonText }}</span>
    <span
      v-if="config.subText"
      :style="{ fontSize: `${(config.fontSize - 4) * scale}px`, opacity: 0.8 }"
    >
      {{ config.subText }}
    </span>
  </button>
</template>
