<script setup lang="ts">
import { cn } from "@/lib/utils";

interface Props {
  variant?: "default" | "glass" | "elevated";
  hover?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  hover: false,
});

const variants = {
  default: "bg-white border border-gray-200",
  glass: "bg-white/80 backdrop-blur-md border border-white/20",
  elevated: "bg-white shadow-xl",
};
</script>

<template>
  <div
    :class="
      cn(
        'rounded-xl p-6 transition-all duration-200',
        variants[variant],
        hover && 'hover:shadow-2xl hover:scale-[1.02]',
        props.class
      )
    "
  >
    <slot />
  </div>
</template>
