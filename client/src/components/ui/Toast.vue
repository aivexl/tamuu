<script setup lang="ts">
import { cn } from "@/lib/utils";
import { X, Check, AlertCircle, Info } from "lucide-vue-next";

interface Props {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  action?: any;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
});

const emit = defineEmits(["dismiss"]);
</script>

<template>
  <div
    :class="
      cn(
        'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
        variant === 'default' &&
          'border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50',
        variant === 'destructive' &&
          'destructive group border-red-500 bg-red-500 text-slate-50 dark:border-red-900 dark:bg-red-900 dark:text-slate-50',
        variant === 'success' &&
          'border-green-500 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-900 dark:text-green-50'
      )
    "
  >
    <div class="flex gap-3 items-start">
      <Check v-if="variant === 'success'" class="w-5 h-5 text-green-600 mt-0.5" />
      <AlertCircle
        v-else-if="variant === 'destructive'"
        class="w-5 h-5 text-white mt-0.5"
      />
      <Info v-else class="w-5 h-5 text-slate-500 mt-0.5" />

      <div class="grid gap-1">
        <div v-if="title" class="text-sm font-semibold">{{ title }}</div>
        <div v-if="description" class="text-sm opacity-90">{{ description }}</div>
      </div>
    </div>

    <component :is="action" v-if="action" />

    <button
      @click="$emit('dismiss', id)"
      :class="
        cn(
          'absolute right-2 top-2 rounded-md p-1 text-slate-500 hover:text-slate-900 focus:opacity-100 focus:outline-none focus:ring-2',
          'group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600',
          'transition-opacity opacity-70 hover:opacity-100'
        )
      "
    >
      <X class="h-4 w-4" />
    </button>
  </div>
</template>
