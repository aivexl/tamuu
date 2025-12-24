<script setup lang="ts">
/**
 * AppHeader.vue
 * Unified header component for all user-facing pages
 * Consistent navbar across Dashboard, Create, Onboarding
 */

import { ref } from 'vue';
import { useRouter, RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from "@/stores/auth";
import { User, LogOut, ChevronDown, LayoutDashboard, Sparkles } from "lucide-vue-next";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const isDropdownOpen = ref(false);

// Navigation items
const navItems = [
    { routeName: 'customer-dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { routeName: 'template-store', name: 'Template Store', icon: Sparkles },
];

const isActive = (routeName: string) => route.name === routeName;

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
  <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
    <div class="max-w-7xl mx-auto px-6 sm:px-8">
      <div class="flex items-center justify-between h-20">
        <!-- Logo -->
        <div class="flex items-center gap-10">
          <RouterLink to="/" class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-slate-900/20 group-hover:scale-105 transition-transform duration-500">
              T
            </div>
            <span class="text-2xl font-black text-slate-900 tracking-tighter uppercase font-outfit">Tamuu</span>
          </RouterLink>

          <!-- Main Navigation (Desktop) -->
          <nav class="hidden md:flex items-center gap-1">
            <RouterLink
              v-for="item in navItems"
              :key="item.routeName"
              :to="{ name: item.routeName }"
              :class="[
                'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300',
                isActive(item.routeName)
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              ]"
            >
              <component :is="item.icon" class="w-4 h-4" />
              {{ item.name }}
            </RouterLink>
          </nav>
        </div>

        <!-- Right Section -->
        <div class="flex items-center gap-6">
          <!-- User Dropdown -->
          <div class="relative" v-click-outside="closeDropdown">
            <button 
              @click="toggleDropdown"
              class="flex items-center gap-3 p-1.5 pr-4 rounded-[1.25rem] hover:bg-white/50 border border-transparent hover:border-slate-100 transition-all duration-300"
            >
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white font-black shadow-lg shadow-teal-500/20">
                <span v-if="!authStore.user?.avatarUrl">
                  {{ authStore.userName?.charAt(0) || 'U' }}
                </span>
                <img v-else :src="authStore.user.avatarUrl" class="w-full h-full object-cover rounded-2xl" />
              </div>
              <div class="text-left hidden sm:block">
                <p class="text-sm font-bold text-slate-900 leading-none">{{ authStore.userName }}</p>
                <p class="text-[10px] font-black uppercase tracking-widest text-teal-600 mt-1">Premium</p>
              </div>
              <ChevronDown 
                class="w-4 h-4 text-slate-400 transition-transform duration-300" 
                :class="{ 'rotate-180': isDropdownOpen }" 
              />
            </button>

            <!-- Dropdown Menu -->
            <transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <div 
                v-if="isDropdownOpen"
                class="absolute right-0 top-full mt-3 w-64 bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/60 py-3 z-50 overflow-hidden"
              >
                <div class="px-5 py-3 border-b border-slate-50 mb-2 bg-slate-50/50">
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logged in as</p>
                  <p class="text-sm font-bold text-slate-900 truncate mt-1">{{ authStore.user?.email }}</p>
                </div>
                
                <RouterLink 
                  :to="{ name: 'profile' }" 
                  class="flex items-center gap-4 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all"
                  @click="isDropdownOpen = false"
                >
                  <User class="w-5 h-5" />
                  Edit Profil
                </RouterLink>

                <RouterLink 
                  :to="{ name: 'customer-dashboard' }" 
                  class="flex items-center gap-4 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-white hover:text-slate-900 transition-all"
                  @click="isDropdownOpen = false"
                >
                  <LayoutDashboard class="w-5 h-5" />
                  Dashboard
                </RouterLink>
                
                <div class="mt-2 pt-2 border-t border-slate-50 px-2">
                  <button 
                    @click="handleLogout"
                    class="w-full flex items-center gap-4 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <LogOut class="w-5 h-5" />
                    Keluar
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <div class="md:hidden border-t border-slate-100 px-4 py-2 flex gap-1 overflow-x-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.routeName"
        :to="{ name: item.routeName }"
        :class="[
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
          isActive(item.routeName)
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
