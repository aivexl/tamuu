<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

interface Props {
  modelValue?: string | number;
  label?: string;
  error?: string;
  helperText?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
});

const emit = defineEmits(["update:modelValue", "focus", "blur"]);

const textareaClass = computed(() => {
  return cn(
    "w-full px-4 py-2.5 rounded-lg border transition-all duration-200 resize-none",
    "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
    "placeholder:text-gray-400",
    props.error
      ? "border-red-500 focus:ring-red-500"
      : "border-gray-300 hover:border-gray-400",
    props.disabled && "bg-gray-100 cursor-not-allowed opacity-60",
    props.class
  );
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit("update:modelValue", target.value);
};
</script>

<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>
    <textarea
      :id="id"
      :class="textareaClass"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      v-bind="$attrs"
      @input="handleInput"
      @focus="$emit('focus', $event)"
      @blur="$emit('blur', $event)"
    />
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-if="helperText && !error" class="mt-1 text-sm text-gray-500">{{ helperText }}</p>
  </div>
</template>
