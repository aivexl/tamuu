<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import { cn } from "@/lib/utils";
import { X } from "lucide-vue-next";

interface Props {
  isOpen: boolean;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  showCloseButton: true,
});

const emit = defineEmits(["close"]);

const sizes = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }
);

onUnmounted(() => {
  document.body.style.overflow = "unset";
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        @click="$emit('close')"
      />
    </Transition>

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-4"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none"
      >
        <div
          :class="cn('relative bg-white rounded-2xl shadow-2xl w-full pointer-events-auto', sizes[size])"
        >
          <button
            v-if="showCloseButton"
            @click="$emit('close')"
            class="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
          >
            <X class="w-5 h-5 text-gray-500" />
          </button>

          <div v-if="title" class="p-6 border-b border-gray-200">
            <h2 class="text-2xl font-semibold text-gray-900">{{ title }}</h2>
          </div>

          <div class="p-6">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
