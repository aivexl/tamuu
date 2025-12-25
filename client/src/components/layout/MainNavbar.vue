<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  User, 
  LogOut, 
  Sparkles,
  ChevronRight
} from 'lucide-vue-next';

const props = defineProps<{
  transparentWhite?: boolean;
  transparentBg?: string;
}>();

const authStore = useAuthStore();
const router = useRouter();
const isMenuOpen = ref(false);
const isScrolled = ref(false);

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/');
};

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Templates', path: '/templates' },
  { name: 'Fitur', path: '/#features' },
  { name: 'Harga', path: '/#pricing' },
];
</script>

<template>
  <nav 
    class="fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-in-out px-4 py-3 md:px-8"
    :class="[
      isScrolled 
        ? 'backdrop-blur-xl border-b border-black/5 shadow-sm py-2' 
        : 'py-4'
    ]"
    :style="{ 
      backgroundColor: isScrolled ? 'rgba(249, 245, 240, 0.8)' : (props.transparentBg || 'transparent') 
    }"
  >
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-2 group">
        <div 
          class="w-10 h-10 bg-gradient-to-tr from-rose-600 to-rose-400 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105"
          :class="[isScrolled ? 'shadow-rose-100' : 'shadow-rose-950/20']"
        >
          <Sparkles class="w-6 h-6 text-white" />
        </div>
        <span 
          class="text-2xl font-black bg-gradient-to-r bg-clip-text text-transparent tracking-tighter"
          :class="[
            isScrolled || !props.transparentWhite
              ? 'from-slate-900 to-slate-700'
              : 'from-white to-rose-100'
          ]"
        >
          Tamuu
        </span>
      </RouterLink>

      <!-- Desktop Navigation -->
      <div class="hidden md:flex items-center gap-8">
        <div class="flex items-center gap-6">
          <RouterLink 
            v-for="link in navLinks" 
            :key="link.name"
            :to="link.path"
            class="text-sm font-semibold transition-colors duration-200"
            :class="[
              isScrolled || !props.transparentWhite
                ? 'text-slate-600 hover:text-rose-600'
                : 'text-white/80 hover:text-white'
            ]"
          >
            {{ link.name }}
          </RouterLink>
        </div>

        <div class="h-6 w-[1px]" :class="[isScrolled || !props.transparentWhite ? 'bg-slate-200' : 'bg-white/20']"></div>

        <!-- Auth Actions -->
        <div v-if="!authStore.isAuthenticated" class="flex items-center gap-4">
          <RouterLink 
            :to="{ name: 'login', query: { redirect: $route.fullPath } }"
            class="text-sm font-bold transition-colors px-4 py-2"
            :class="[
              isScrolled || !props.transparentWhite
                ? 'text-slate-700 hover:text-rose-600'
                : 'text-white hover:text-rose-200'
            ]"
          >
            Masuk
          </RouterLink>
          <RouterLink 
            :to="{ name: 'register', query: { redirect: $route.fullPath } }"
            class="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
            :class="[
              isScrolled || !props.transparentWhite
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-rose-600 hover:shadow-rose-100'
                : 'bg-white text-rose-950 shadow-xl shadow-rose-950/20 hover:bg-rose-50'
            ]"
          >
            Buat Undangan
            <ChevronRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </RouterLink>
        </div>

        <div v-else class="flex items-center gap-3">
          <RouterLink 
            :to="{ name: 'customer-dashboard' }"
            class="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
          >
            <LayoutDashboard class="w-4 h-4" />
            Dashboard
          </RouterLink>
          
          <div class="relative group">
            <button class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <User class="w-5 h-5 text-slate-600" />
            </button>
            
            <!-- Dropdown -->
            <div class="absolute right-0 top-full mt-2 w-48 bg-[#F9F5F0] rounded-2xl shadow-2xl border border-slate-200/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right translate-y-2 group-hover:translate-y-0">
              <div class="p-2 space-y-1">
                <RouterLink :to="{ name: 'profile' }" class="flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                  <User class="w-4 h-4" />
                  Profil
                </RouterLink>
                <button 
                  @click="handleLogout"
                  class="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut class="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Menu Button -->
      <button 
        class="md:hidden p-2 rounded-xl transition-colors"
        :class="[
          isScrolled || !props.transparentWhite
            ? 'text-slate-600 hover:bg-slate-100'
            : 'text-white hover:bg-white/10'
        ]"
        @click="isMenuOpen = !isMenuOpen"
      >
        <Menu v-if="!isMenuOpen" class="w-6 h-6" />
        <X v-else class="w-6 h-6" />
      </button>
    </div>

    <!-- Mobile Navigation -->
    <div 
      v-if="isMenuOpen"
      class="md:hidden absolute top-full left-0 right-0 bg-[#F9F5F0] border-b border-slate-200 shadow-xl p-4 animate-in slide-in-from-top duration-300"
    >
      <div class="flex flex-col gap-4">
        <RouterLink 
          v-for="link in navLinks" 
          :key="link.name"
          :to="link.path"
          class="text-lg font-bold text-slate-900 px-4 py-2 hover:bg-slate-50 rounded-xl"
          @click="isMenuOpen = false"
        >
          {{ link.name }}
        </RouterLink>
        <div class="h-[1px] bg-slate-100 my-2"></div>
        <div v-if="!authStore.isAuthenticated" class="flex flex-col gap-3">
          <RouterLink 
            :to="{ name: 'login' }"
            class="text-center py-3 font-bold text-slate-900 border border-slate-200 rounded-xl"
            @click="isMenuOpen = false"
          >
            Masuk
          </RouterLink>
          <RouterLink 
            :to="{ name: 'register' }"
            class="text-center py-3 font-bold text-white bg-indigo-600 rounded-xl"
            @click="isMenuOpen = false"
          >
            Buat Undangan
          </RouterLink>
        </div>
        <div v-else class="flex flex-col gap-3">
          <RouterLink 
            :to="{ name: 'customer-dashboard' }"
            class="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold"
            @click="isMenuOpen = false"
          >
            <LayoutDashboard class="w-5 h-5" />
            Dashboard
          </RouterLink>
          <button 
            @click="handleLogout"
            class="flex items-center gap-3 px-4 py-3 text-rose-600 font-bold"
          >
            <LogOut class="w-5 h-5" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.router-link-active:not(.group) {
  color: rgb(79 70 229); /* indigo-600 */
}
</style>
