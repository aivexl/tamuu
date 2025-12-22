<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getProxiedImageUrl } from "@/lib/image-utils";

interface Props {
  src?: string | null;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  fallbackSrc?: string;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  fallbackSrc: "/placeholder-image.svg",
});

const emit = defineEmits(["load", "error"]);

const hasError = ref(false);
const isLoading = ref(true);

const imageUrl = computed(() => {
  return hasError.value
    ? props.fallbackSrc
    : getProxiedImageUrl(props.src);
});

watch(() => props.src, () => {
  hasError.value = false;
  isLoading.value = true;
});

const handleLoad = () => {
  isLoading.value = false;
  emit("load");
};

const handleError = () => {
  if (!hasError.value) { // Prevent infinite loop if fallback fails
    console.warn("⚠️ SafeImage failed to load:", props.src);
    hasError.value = true;
    isLoading.value = false;
    emit("error");
  }
};
</script>

<template>
  <div
    class="relative overflow-hidden"
    :class="props.class"
    :style="{
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      position: fill ? 'absolute' : undefined,
      top: fill ? 0 : undefined,
      left: fill ? 0 : undefined,
      right: fill ? 0 : undefined,
      bottom: fill ? 0 : undefined,
    }"
  >
    <div
      v-if="isLoading"
      class="absolute inset-0 bg-slate-200 animate-pulse z-10"
    >
    </div>

    <!-- No Image State -->
    <div
      v-if="!src && !hasError"
      class="bg-slate-200 flex items-center justify-center w-full h-full"
    >
      <span class="text-slate-400 text-xs">No Image</span>
    </div>

    <!-- Image -->
    <img
      v-else
      :src="imageUrl"
      :alt="alt"
      :loading="priority ? 'eager' : 'lazy'"
      class="transition-opacity duration-300 w-full h-full object-cover"
      :class="{ 'opacity-0': isLoading, 'opacity-100': !isLoading }"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>
