<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Mail, Lock, Eye, EyeOff, UserPlus, User, Phone, ArrowLeft } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const name = ref('');
const phone = ref('');
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref('');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isFormValid = computed(() => {
    return (
        email.value.trim() !== '' && 
        emailRegex.test(email.value) &&
        password.value.length >= 8 &&
        password.value === confirmPassword.value
    );
});

const passwordError = computed(() => {
    if (password.value && password.value.length < 8) {
        return 'Password minimal 8 karakter';
    }
    return '';
});

const confirmPasswordError = computed(() => {
    if (confirmPassword.value && password.value !== confirmPassword.value) {
        return 'Password tidak sama';
    }
    return '';
});

const handleRegister = async () => {
    if (!isFormValid.value || isSubmitting.value) return;
    
    isSubmitting.value = true;
    errorMessage.value = '';
    
    try {
        await authStore.register(email.value, password.value, name.value || undefined, phone.value || undefined);
        router.push('/my/dashboard');
    } catch (error: any) {
        errorMessage.value = error.message || 'Registration failed. Please try again.';
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
                <p class="text-slate-400">Buat akun baru</p>
            </div>

            <!-- Register Form -->
            <div class="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                <form @submit.prevent="handleRegister" class="space-y-5">
                    <!-- Error Message -->
                    <div 
                        v-if="errorMessage" 
                        class="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                    >
                        {{ errorMessage }}
                    </div>

                    <!-- Name Field (Optional) -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-slate-300">Nama <span class="text-slate-500">(opsional)</span></label>
                        <div class="relative">
                            <User class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                v-model="name"
                                type="text"
                                placeholder="Nama lengkap"
                                class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <!-- Email Field -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-slate-300">Email <span class="text-red-400">*</span></label>
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

                    <!-- Phone Field (Optional) -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-slate-300">Telepon <span class="text-slate-500">(opsional)</span></label>
                        <div class="relative">
                            <Phone class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                v-model="phone"
                                type="tel"
                                placeholder="08xxxxxxxxxx"
                                class="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                            />
                        </div>
                    </div>

                    <!-- Password Field -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-slate-300">Password <span class="text-red-400">*</span></label>
                        <div class="relative">
                            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                placeholder="Minimal 8 karakter"
                                class="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                :class="passwordError ? 'border-red-500/50' : ''"
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
                        <p v-if="passwordError" class="text-xs text-red-400">{{ passwordError }}</p>
                    </div>

                    <!-- Confirm Password Field -->
                    <div class="space-y-2">
                        <label class="text-sm font-medium text-slate-300">Konfirmasi Password <span class="text-red-400">*</span></label>
                        <div class="relative">
                            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                v-model="confirmPassword"
                                :type="showConfirmPassword ? 'text' : 'password'"
                                placeholder="Ulangi password"
                                class="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                                :class="confirmPasswordError ? 'border-red-500/50' : ''"
                            />
                            <button
                                type="button"
                                @click="showConfirmPassword = !showConfirmPassword"
                                class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                <EyeOff v-if="showConfirmPassword" class="w-5 h-5" />
                                <Eye v-else class="w-5 h-5" />
                            </button>
                        </div>
                        <p v-if="confirmPasswordError" class="text-xs text-red-400">{{ confirmPasswordError }}</p>
                    </div>

                    <!-- Submit Button -->
                    <button
                        type="submit"
                        :disabled="!isFormValid || isSubmitting"
                        class="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                    >
                        <UserPlus class="w-5 h-5" />
                        <span>{{ isSubmitting ? 'Memproses...' : 'Daftar' }}</span>
                    </button>
                </form>

                <!-- Divider -->
                <div class="my-6 flex items-center gap-4">
                    <div class="flex-1 h-px bg-white/10"></div>
                    <span class="text-sm text-slate-500">atau</span>
                    <div class="flex-1 h-px bg-white/10"></div>
                </div>

                <!-- Login Link -->
                <p class="text-center text-slate-400">
                    Sudah punya akun?
                    <RouterLink 
                        to="/login" 
                        class="text-teal-400 hover:text-teal-300 font-medium transition-colors"
                    >
                        Masuk
                    </RouterLink>
                </p>
            </div>
        </div>
    </div>
</template>
