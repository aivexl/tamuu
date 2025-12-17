<script setup lang="ts">
import { cn } from "@/lib/utils";

interface Props {
  modelValue: boolean;
  disabled?: boolean;
  class?: string;
}

const props = defineProps<Props>();
const emit = defineEmits(["update:modelValue"]);

const toggle = () => {
  if (!props.disabled) {
    emit("update:modelValue", !props.modelValue);
  }
};
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="toggle"
    :class="
      cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2',
        modelValue ? 'bg-teal-500' : 'bg-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
        props.class
      )
    "
  >
    <span
      class="inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out"
      :class="modelValue ? 'translate-x-[20px]' : 'translate-x-[2px]'"
    />
  </button>
</template>
