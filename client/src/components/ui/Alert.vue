<script setup lang="ts">
import { cn } from "@/lib/utils";
import { AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-vue-next";

interface Props {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "info",
});

const variants = {
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-900",
    icon: Info,
    iconColor: "text-blue-500",
  },
  success: {
    container: "bg-green-50 border-green-200 text-green-900",
    icon: CheckCircle,
    iconColor: "text-green-500",
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-900",
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-900",
    icon: AlertCircle,
    iconColor: "text-red-500",
  },
};
</script>

<template>
  <div
    :class="
      cn('border rounded-lg p-4 flex gap-3', variants[variant].container, props.class)
    "
  >
    <component
      :is="variants[variant].icon"
      :class="cn('w-5 h-5 flex-shrink-0 mt-0.5', variants[variant].iconColor)"
    />
    <div class="flex-1">
      <div v-if="title" class="font-semibold mb-1">{{ title }}</div>
      <div class="text-sm">
        <slot />
      </div>
    </div>
  </div>
</template>
