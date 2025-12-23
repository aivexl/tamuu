<script setup lang="ts">
/**
 * AppHeader.vue
 * Unified header component for all user-facing pages
 * Consistent navbar across Dashboard, Create, Onboarding
 */

import { ref, computed } from 'vue';
import { useRouter, RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from "@/stores/auth";
import { Settings, User, LogOut, ChevronDown, LayoutDashboard, PlusCircle, Sparkles } from "lucide-vue-next";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const isDropdownOpen = ref(false);

// Navigation items
const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/create', name: 'Buat Undangan', icon: PlusCircle },
    { path: '/onboarding', name: 'Onboarding', icon: Sparkles },
];

const isActive = (path: string) => route.path === path;

const handleLogout = async () => {
    await authStore.logout();
    router.push('/');
};

const toggleDropdown = () => {
    isDropdownOpen.value = !isDropdownOpen.value;
};

const closeDropdown = () => {
    isDropdownOpen.value = false;
};
</script>

<template>
  <header class="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center gap-8">
          <RouterLink to="/" class="flex items-center gap-2">
            <div class="w-9 h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20">
              T
            </div>
            <span class="text-xl font-bold text-slate-800">Tamuu</span>
          </RouterLink>

          <!-- Main Navigation (Desktop) -->
          <nav class="hidden md:flex items-center gap-1">
            <RouterLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
                isActive(item.path)
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              ]"
            >
              <component :is="item.icon" class="w-4 h-4" />
              {{ item.name }}
            </RouterLink>
          </nav>
        </div>

        <!-- Right Section -->
        <div class="flex items-center gap-4">
          <!-- Settings -->
          <button class="hidden md:flex p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Settings class="w-5 h-5" />
          </button>

          <div class="h-6 w-px bg-slate-200 hidden md:block" />

          <!-- User Dropdown -->
          <div class="relative" v-click-outside="closeDropdown">
            <button 
              @click="toggleDropdown"
              class="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-all"
            >
              <div class="text-right hidden sm:block">
                <p class="text-sm font-semibold text-slate-800 leading-none">{{ authStore.userName }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ authStore.user?.role }}</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-medium shadow-md">
                <span v-if="!authStore.user?.avatarUrl">
                  {{ authStore.userName?.charAt(0) || 'U' }}
                </span>
                <img v-else :src="authStore.user.avatarUrl" class="w-full h-full object-cover rounded-xl" />
              </div>
              <ChevronDown 
                class="w-4 h-4 text-slate-400 transition-transform duration-200" 
                :class="{ 'rotate-180': isDropdownOpen }" 
              />
            </button>

            <!-- Dropdown Menu -->
            <div 
              v-if="isDropdownOpen"
              class="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50"
            >
              <div class="px-4 py-2 border-b border-slate-100 mb-1">
                <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Akun</p>
                <p class="text-sm font-semibold text-slate-800 truncate mt-1">{{ authStore.user?.email }}</p>
              </div>
              
              <RouterLink 
                to="/profile" 
                class="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-all"
                @click="isDropdownOpen = false"
              >
                <User class="w-4 h-4" />
                Edit Profil
              </RouterLink>
              
              <button 
                @click="handleLogout"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut class="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <div class="md:hidden border-t border-slate-100 px-4 py-2 flex gap-1 overflow-x-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="[
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
          isActive(item.path)
            ? 'bg-teal-50 text-teal-700'
            : 'text-slate-600 hover:bg-slate-50'
        ]"
      >
        <component :is="item.icon" class="w-4 h-4" />
        {{ item.name }}
      </RouterLink>
    </div>
  </header>
</template>
