<script setup lang="ts">
import {
  Palette,
  Music,
  LayoutTemplate,
  Users,
  MessageSquare,
  BarChart3,
  Share2,
  Settings,
} from "lucide-vue-next";
import { useInvitationStore } from "@/stores/invitation";

const store = useInvitationStore();

const menuItems = [
  { id: "theme", label: "Tema", icon: Palette, color: "text-purple-600", bg: "bg-purple-50" },
  { id: "music", label: "Musik", icon: Music, color: "text-pink-600", bg: "bg-pink-50" },
  { id: "templates", label: "Template", icon: LayoutTemplate, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "guests", label: "Tamu", icon: Users, color: "text-green-600", bg: "bg-green-50" },
  { id: "wishes", label: "Ucapan", icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50" },
  { id: "analytics", label: "Analitik", icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "share", label: "Bagikan", icon: Share2, color: "text-teal-600", bg: "bg-teal-50" },
  { id: "settings", label: "Pengaturan", icon: Settings, color: "text-gray-600", bg: "bg-gray-50" },
];

const handleMenuClick = (id: string) => {
  store.setActivePanel(id);
};
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <button
      v-for="item in menuItems"
      :key="item.id"
      @click="handleMenuClick(item.id)"
      class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center gap-3 group"
    >
      <div
        class="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
        :class="item.bg"
      >
        <component :is="item.icon" class="w-6 h-6" :class="item.color" />
      </div>
      <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">
        {{ item.label }}
      </span>
    </button>
  </div>
</template>
