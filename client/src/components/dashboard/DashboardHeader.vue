<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from "@/stores/auth";
import { Settings, User, LogOut, ChevronDown } from "lucide-vue-next";

const authStore = useAuthStore();
const router = useRouter();
const isDropdownOpen = ref(false);

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

// Close dropdown when clicking outside
const closeDropdown = () => {
  isDropdownOpen.value = false;
};
</script>

<template>
  <header
    class="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100"
  >
    <div class="flex items-center gap-2">
      <RouterLink to="/" class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gradient-to-br from-indigo-600 to-teal-400 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
          T
        </div>
        <h1 class="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-500 tracking-tighter">
          Tamu.id
        </h1>
      </RouterLink>
    </div>

    <div class="flex items-center gap-6">
      <div class="hidden md:flex items-center gap-1">
        <button class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
          <Settings class="w-5 h-5" />
        </button>
      </div>

      <div class="h-6 w-px bg-slate-200 hidden md:block"></div>

      <div class="relative" v-click-outside="closeDropdown">
        <button 
          @click="toggleDropdown"
          class="flex items-center gap-3 p-1 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
        >
          <div class="text-right hidden sm:block px-1">
            <p class="text-xs font-black text-slate-900 leading-none mb-1">{{ authStore.userName }}</p>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ authStore.user?.role }}</p>
          </div>
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm relative">
             <span v-if="!authStore.user?.avatarUrl" class="text-xs font-black text-slate-500 uppercase">
               {{ authStore.userName.substring(0, 2) }}
             </span>
             <img v-else :src="authStore.user.avatarUrl" class="w-full h-full object-cover" />
             <div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <ChevronDown class="w-4 h-4 text-slate-400 transition-transform duration-300" :class="{ 'rotate-180': isDropdownOpen }" />
        </button>

        <!-- Dropdown Menu -->
        <div 
          v-if="isDropdownOpen"
          class="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-200"
        >
          <div class="px-3 py-2 border-b border-slate-50 mb-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Akun Saya</p>
            <p class="text-sm font-bold text-slate-900 truncate">{{ authStore.user?.email }}</p>
          </div>
          
          <RouterLink 
            to="/profile" 
            class="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all"
            @click="isDropdownOpen = false"
          >
            <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <User class="w-4 h-4" />
            </div>
            Pengaturan Profil
          </RouterLink>
          
          <button 
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
          >
            <div class="w-8 h-8 rounded-lg bg-rose-100/50 flex items-center justify-center text-rose-600">
              <LogOut class="w-4 h-4" />
            </div>
            Keluar Aplikasi
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
