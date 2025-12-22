<script setup lang="ts">
import Button from "@/components/ui/Button.vue";
import { Settings } from "lucide-vue-next";
</script>

<template>
  <header
    class="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100"
  >
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-lg">
        T
      </div>
      <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
        Tamu.id
      </h1>
    </div>

    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" class="text-gray-500 hover:text-gray-700">
        <Settings class="w-5 h-5" />
      </Button>
      <div class="h-6 w-px bg-gray-200"></div>
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="text-sm font-medium text-gray-900">Admin User</p>
          <p class="text-xs text-gray-500">admin@tamu.id</p>
        </div>
        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
           <!-- Placeholder Avatar -->
           <span class="text-xs font-semibold text-gray-600">AU</span>
        </div>
      </div>
    </div>
  </header>
</template>
