<script setup lang="ts">
import Button from "@/components/ui/Button.vue";
import { Plus } from "lucide-vue-next";
</script>

<template>
  <Button
    variant="dashed"
    class="w-full h-12 border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50"
  >
    <Plus class="w-5 h-5 mr-2" />
    Tambah Bagian Baru
  </Button>
</template>
