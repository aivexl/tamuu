<script setup lang="ts">
import { useToast } from "@/composables/use-toast";
import Toast from "./Toast.vue";

const { toasts, dismiss } = useToast();
</script>

<template>
  <div
    class="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2 pointer-events-none"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0 sm:translate-y-0 sm:translate-x-full"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-to-class="translate-y-full opacity-0 sm:translate-y-0 sm:translate-x-full"
    >
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        v-bind="toast"
        @dismiss="dismiss"
      />
    </TransitionGroup>
  </div>
</template>
