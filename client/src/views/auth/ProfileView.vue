<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue';
import { User, Mail, Phone, Shield, Camera, Save, Loader2, CheckCircle2 } from 'lucide-vue-next';

const authStore = useAuthStore();
const isSaving = ref(false);
const saveSuccess = ref(false);

const profileData = ref({
  name: '',
  phone: '',
  avatarUrl: ''
});

onMounted(() => {
  if (authStore.user) {
    profileData.value = {
      name: authStore.user.name || '',
      phone: authStore.user.phone || '',
      avatarUrl: authStore.user.avatarUrl || ''
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
              <div class="relative group">
                <div class="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center border-4 border-white shadow-md overflow-hidden">
                  <img v-if="profileData.avatarUrl" :src="profileData.avatarUrl" class="w-full h-full object-cover" />
                  <User v-else class="w-10 h-10 text-indigo-500" />
                </div>
                <button class="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors">
                  <Camera class="w-4 h-4" />
                </button>
              </div>
              <div>
                <h2 class="text-xl font-semibold text-slate-900">{{ authStore.userName }}</h2>
                <div class="flex items-center gap-2 mt-1">
                  <span 
                    class="px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider"
                    :class="authStore.isAdmin ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'"
                  >
                   {{ authStore.user?.role || 'User' }}
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

        <!-- Role & Permissions (Info Only) -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <div class="flex items-start gap-4">
            <div class="p-3 bg-indigo-50 rounded-xl">
              <Shield class="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Role & Access</h3>
              <p class="text-slate-600 text-sm mt-1">Information about your current account privileges.</p>
              
              <div class="mt-6 flex flex-wrap gap-4">
                <div class="flex flex-col gap-1 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 min-w-[120px]">
                  <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Current Role</span>
                  <span class="text-slate-900 font-semibold uppercase tracking-wide">{{ authStore.user?.role }}</span>
                </div>
                <div class="flex flex-col gap-1 px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 min-w-[120px]">
                  <span class="text-[10px] uppercase tracking-wider font-bold text-slate-400">Plan</span>
                  <span class="text-indigo-600 font-semibold uppercase tracking-wide">{{ authStore.user?.plan }}</span>
                </div>
              </div>

              <div class="mt-6 space-y-3">
                <div class="flex items-center gap-3 text-sm" :class="authStore.isAdmin ? 'text-emerald-700' : 'text-slate-400'">
                  <CheckCircle2 class="w-4 h-4" />
                  Access to Template Editor
                </div>
                <div class="flex items-center gap-3 text-sm" :class="authStore.isAdmin ? 'text-emerald-700' : 'text-slate-400'">
                  <CheckCircle2 class="w-4 h-4" />
                  Manage Master Templates
                </div>
                <div class="flex items-center gap-3 text-sm text-emerald-700">
                  <CheckCircle2 class="w-4 h-4" />
                  Create Digital Invitations
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
