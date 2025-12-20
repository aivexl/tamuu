<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const isFormValid = computed(() => {
    return email.value.trim() !== '' && password.value.length >= 8;
});

const handleLogin = async () => {
    if (!isFormValid.value || isSubmitting.value) return;
    
    isSubmitting.value = true;
    errorMessage.value = '';
    
    try {
        await authStore.login(email.value, password.value);
        router.push('/my/dashboard');
    } catch (error: any) {
        errorMessage.value = error.message || 'Login failed. Please try again.';
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <!-- Back Button -->
        <RouterLink 
            to="/" 
            class="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
            <ArrowLeft class="w-5 h-5" />
            <span class="text-sm font-medium">Kembali</span>
        </RouterLink>

        <div class="w-full max-w-md">
            <!-- Logo -->
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-white mb-2">Tamuu</h1>
                <p class="text-slate-400">Masuk ke akun Anda</p>
            </div>

            <!-- Login Form -->
            <div class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                <form @submit.prevent="handleLogin" class="space-y-6">
                    <!-- Error Message -->
                    <div 
                        v-if="errorMessage" 
                        class="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                    >
                        {{ errorMessage }}
                    </div>

                    <!-- Email Field -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-slate-300">Email</label>
                        <div class="relative">
                            <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                v-model="email"
                                type="email"
                                placeholder="nama@email.com"
                                class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <!-- Password Field -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-slate-300">Password</label>
                        <div class="relative">
                            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="Minimal 8 karakter"
                                class="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                            <button
                                type="button"
                                @click="showPassword = !showPassword"
                                class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                <EyeOff v-if="showPassword" class="w-5 h-5" />
                                <Eye v-else class="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <!-- Forgot Password -->
                    <div class="text-right">
                        <RouterLink 
                            to="/forgot-password" 
                            class="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                        >
                            Lupa password?
                        </RouterLink>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="!isFormValid || isSubmitting"
                        class="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                        <LogIn class="w-5 h-5" />
                        <span>{{ isSubmitting ? 'Memproses...' : 'Masuk' }}</span>
                    </button>
                </form>

                <!-- Divider -->
                <div class="my-8 flex items-center gap-4">
                    <div class="flex-1 h-px bg-white/10"></div>
                    <span class="text-sm text-slate-500">atau</span>
                    <div class="flex-1 h-px bg-white/10"></div>
                </div>

                <!-- Register Link -->
                <p class="text-center text-slate-400">
                    Belum punya akun?
                    <RouterLink 
                        to="/register" 
                        class="text-teal-400 hover:text-teal-300 font-medium transition-colors"
                    >
                        Daftar sekarang
                    </RouterLink>
                </p>
            </div>
        </div>
    </div>
</template>
