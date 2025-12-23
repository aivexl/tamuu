<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue';
import { User, UserRound, Mail, Phone, Shield, Save, Loader2, CheckCircle2, Copy, Calendar, Users } from 'lucide-vue-next';

const authStore = useAuthStore();
const isSaving = ref(false);
const saveSuccess = ref(false);
const isHovering = ref(false);
const copySuccess = ref(false);

const profileData = ref({
  name: '',
  phone: '',
  avatarUrl: '',
  gender: '' as 'male' | 'female' | '',
  birthDate: ''
});

// Computed for gender-based icon
const genderIcon = computed(() => {
  const gender = authStore.user?.gender || profileData.value.gender;
  return gender === 'female' ? UserRound : User;
});

// Format tier label with colors
const tierConfig = computed(() => {
  const plan = authStore.user?.plan || 'free';
  const configs: Record<string, { label: string; bgClass: string; textClass: string }> = {
    free: { label: 'FREE', bgClass: 'bg-slate-100', textClass: 'text-slate-700 border-slate-200' },
    basic: { label: 'BASIC', bgClass: 'bg-blue-100', textClass: 'text-blue-700 border-blue-200' },
    premium: { label: 'PREMIUM', bgClass: 'bg-purple-100', textClass: 'text-purple-700 border-purple-200' },
    priority: { label: 'PRIORITY', bgClass: 'bg-amber-100', textClass: 'text-amber-700 border-amber-200' }
  };
  return configs[plan] || configs.free;
});

onMounted(() => {
  if (authStore.user) {
    profileData.value = {
      name: authStore.user.name || '',
      phone: authStore.user.phone || '',
      avatarUrl: authStore.user.avatarUrl || '',
      gender: authStore.user.gender || '',
      birthDate: authStore.user.birthDate || ''
    };
  }
});

const handleSave = async () => {
  isSaving.value = true;
  saveSuccess.value = false;
  
  try {
    await authStore.updateProfile(profileData.value);
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Failed to update profile:', error);
  } finally {
    isSaving.value = false;
  }
};

const copyTamuuId = async () => {
  if (authStore.user?.tamuuId) {
    try {
      await navigator.clipboard.writeText(authStore.user.tamuuId);
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Navigation Header -->
    <DashboardHeader />
    
    <div class="py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Account Settings</h1>
        <p class="mt-2 text-slate-600">Manage your profile information and security preferences.</p>
      </div>

      <div class="grid grid-cols-1 gap-8">
        <!-- Profile Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="p-8">
            <div class="flex items-center gap-6 mb-8">
              <div class="relative">
                <div class="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
                  <img v-if="profileData.avatarUrl" :src="profileData.avatarUrl" class="w-full h-full object-cover" />
                  <component v-else :is="genderIcon" class="w-10 h-10 text-indigo-500" />
                </div>
              </div>
              <div>
                <h2 class="text-xl font-semibold text-slate-900">{{ authStore.userName }}</h2>
                <div class="flex items-center gap-2 mt-1">
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border"
                    :class="[tierConfig.bgClass, tierConfig.textClass]"
                  >
                   {{ tierConfig.label }}
                  </span>
                  <span class="text-slate-400">•</span>
                  <span class="text-slate-500 text-sm">{{ authStore.user?.email }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Name -->
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-slate-700 flex items-center gap-2">
                    Full Name
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User class="w-4 h-4" />
                    </div>
                    <input 
                      v-model="profileData.name"
                      type="text" 
                      class="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 transition-all outline-none sm:text-sm"
                      placeholder="Jane Doe"
                    />
                  </div>
                </div>

                <!-- Phone -->
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-slate-700 flex items-center gap-2">
                    Phone Number
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone class="w-4 h-4" />
                    </div>
                    <input 
                      v-model="profileData.phone"
                      type="tel" 
                      class="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 transition-all outline-none sm:text-sm"
                      placeholder="+62 812..."
                  </div>
                </div>
              </div>

              <!-- Gender & Birth Date Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Gender -->
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-slate-700 flex items-center gap-2">
                    Gender
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Users class="w-4 h-4" />
                    </div>
                    <select 
                      v-model="profileData.gender"
                      class="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 transition-all outline-none sm:text-sm appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <!-- Birth Date -->
                <div class="space-y-1.5">
                  <label class="text-sm font-medium text-slate-700 flex items-center gap-2">
                    Birth Date
                  </label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Calendar class="w-4 h-4" />
                    </div>
                    <input 
                      v-model="profileData.birthDate"
                      type="date" 
                      class="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 transition-all outline-none sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <!-- Email (Read-only) -->
              <div class="space-y-1.5 opacity-60">
                <label class="text-sm font-medium text-slate-700">Email Address</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail class="w-4 h-4" />
                  </div>
                  <input 
                    :value="authStore.user?.email"
                    disabled
                    class="block w-full pl-10 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed sm:text-sm"
                  />
                </div>
                <p class="text-xs text-slate-500">Email cannot be changed for security reasons.</p>
              </div>

              <!-- Tamuu ID (Read-only with Copy) -->
              <div 
                v-if="authStore.user?.tamuuId"
                class="space-y-1.5 group/tamuu"
                @mouseenter="isHovering = true"
                @mouseleave="isHovering = false"
              >
                <label class="text-sm font-medium text-slate-700">Tamuu ID</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Shield class="w-4 h-4" />
                  </div>
                  <input 
                    :value="authStore.user?.tamuuId"
                    disabled
                    class="block w-full pl-10 pr-12 py-2.5 bg-gradient-to-r from-slate-50 to-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-mono text-sm cursor-default tracking-wide"
                  />
                  <!-- Copy Button (visible on hover) -->
                  <button 
                    v-show="isHovering || copySuccess"
                    @click="copyTamuuId"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-500 hover:text-indigo-700 transition-all"
                    :class="copySuccess ? 'text-emerald-600' : ''"
                  >
                    <CheckCircle2 v-if="copySuccess" class="w-4 h-4" />
                    <Copy v-else class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div v-if="saveSuccess" class="flex items-center gap-2 text-emerald-600 text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300">
              <CheckCircle2 class="w-4 h-4" />
              Profile updated successfully
            </div>
            <div v-else></div>

            <button 
              @click="handleSave"
              :disabled="isSaving"
              class="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
            >
              <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
              <Save v-else class="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
