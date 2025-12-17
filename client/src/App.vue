<script setup lang="ts">
import { RouterView } from "vue-router";
import Toaster from "@/components/ui/Toaster.vue";
</script>

<template>
  <div class="font-sans antialiased text-gray-900">
    <RouterView />
    <Toaster />
  </div>
</template>
