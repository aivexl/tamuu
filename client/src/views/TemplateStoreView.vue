<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useInvitationStore } from '@/stores/invitation';
import { invitationsApi, type TemplateResponse } from '@/lib/api/invitations';
import { LayoutTemplate, Eye, Check, Loader2, Sparkles, LogIn, UserPlus } from 'lucide-vue-next';
import SafeImage from '@/components/ui/SafeImage.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import MainFooter from '@/components/layout/MainFooter.vue';
import Modal from '@/components/ui/Modal.vue';

const router = useRouter();
const authStore = useAuthStore();
const invitationStore = useInvitationStore();

// Master templates (only templates without user_id)
const masterTemplates = ref<TemplateResponse[]>([]);
const isLoading = ref(true);
const showAuthModal = ref(false);
const pendingTemplateId = ref<string | null>(null);

// Current selected template
const currentTemplateId = computed(() => invitationStore.invitation.templateId);

onMounted(async () => {
    try {
        isLoading.value = true;
        masterTemplates.value = await invitationsApi.getMasterTemplates();
    } catch (error) {
        console.error('Failed to fetch master templates:', error);
    } finally {
        isLoading.value = false;
    }
});

const handleSelect = (templateId: string) => {
    if (!authStore.isAuthenticated) {
        pendingTemplateId.value = templateId;
        showAuthModal.value = true;
        return;
    }
    
    invitationStore.updateTemplateId(templateId);
    router.push({ name: 'customer-dashboard' });
};

const goToAuth = (type: 'login' | 'register') => {
    showAuthModal.value = false;
    const redirect = pendingTemplateId.value 
        ? `/app/editor/${pendingTemplateId.value}` // Future enhancement: auto-select after login
        : '/templates';
        
    router.push({ 
        name: type, 
        query: { redirect } 
    });
};

const previewTemplate = (templateId: string) => {
    window.open(`/preview/${templateId}`, '_blank');
};

</script>

<template>
    <div class="min-h-screen bg-slate-50 flex flex-col">
        <!-- Universal Luxury Header -->
        <AppHeader />

        <!-- Mesh Gradient Overlays -->
        <div class="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
            <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        </div>

        <div class="relative z-10 flex-1">
            <!-- Hero Header -->
            <header class="pt-20 pb-12">
                <div class="max-w-7xl mx-auto px-8 text-center sm:text-left">
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-full shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
                        <Sparkles class="w-3.5 h-3.5 text-teal-600" />
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-teal-900">Koleksi Mahakarya Digital</span>
                    </div>
                    <h1 class="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter font-outfit mb-4 animate-in fade-in slide-in-from-left-4 duration-700">Koleksi Template <span class="text-teal-600">Premium</span></h1>
                    <p class="text-slate-500 font-medium max-w-2xl text-lg animate-in fade-in slide-in-from-left-6 duration-700 leading-relaxed">
                        Pilih desain premium yang dikurasi khusus untuk momen tak terlupakan Anda. Mulai dalam hitungan menit dengan kualitas desain kelas dunia.
                    </p>
                </div>
            </header>

            <!-- Loading State -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-32">
                <Loader2 class="w-12 h-12 text-teal-500 animate-spin mb-6" />
                <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Menyiapkan Galeri Digital...</p>
            </div>

            <!-- Template Grid -->
            <main v-else class="max-w-[1600px] mx-auto px-8 py-8 mb-20">
                <div v-if="masterTemplates.length === 0" class="text-center py-32 bg-white/50 backdrop-blur-md rounded-[3rem] border border-white/60">
                    <LayoutTemplate class="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <p class="text-slate-500 font-bold">Belum ada template yang tersedia saat ini.</p>
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                    <div 
                        v-for="template in masterTemplates" 
                        :key="template.id"
                        class="group bg-white rounded-3xl border border-white/60 overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-700"
                        :class="currentTemplateId === template.id ? 'ring-2 ring-teal-500 ring-offset-4' : ''"
                    >
                        <!-- Thumbnail -->
                        <div class="aspect-[4/5] bg-slate-50 relative overflow-hidden">
                            <SafeImage 
                                :src="template.thumbnail" 
                                :alt="template.name"
                                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                            />
                            
                            <!-- Overlay -->
                            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-4">
                                <button 
                                    @click="previewTemplate(template.id)"
                                    class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-xl"
                                    title="Preview Desain"
                                >
                                    <Eye class="w-6 h-6 text-slate-900" />
                                </button>
                                <button 
                                    @click="handleSelect(template.id)"
                                    class="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-90 shadow-xl"
                                    title="Gunakan Template Ini"
                                >
                                    <Check class="w-6 h-6 text-slate-900" />
                                </button>
                            </div>

                            <!-- Category Badge -->
                            <div class="absolute top-4 left-4">
                                <span class="px-3 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                                    {{ template.category || 'Premium' }}
                                </span>
                            </div>
                        </div>

                        <!-- Info -->
                        <div class="p-6">
                            <h3 class="font-bold text-slate-900 truncate mb-4 font-outfit text-lg">{{ template.name }}</h3>
                            <button 
                                @click="handleSelect(template.id)"
                                :class="[
                                    'w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95',
                                    currentTemplateId === template.id 
                                        ? 'bg-slate-100 text-slate-400 cursor-default' 
                                        : 'bg-slate-900 text-white hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-500/20'
                                ]"
                            >
                                {{ currentTemplateId === template.id ? 'Terpilih' : 'Gunakan Desain' }}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <MainFooter />

        <!-- Auth Gateway Modal -->
        <Modal 
            :is-open="showAuthModal" 
            @close="showAuthModal = false"
            position="center"
            maxWidth="md"
        >
            <div class="p-8 sm:p-12 text-center">
                <div class="w-20 h-20 bg-teal-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                    <Sparkles class="w-10 h-10 text-teal-600" />
                </div>
                <h3 class="text-3xl font-black text-slate-900 tracking-tighter font-outfit mb-4">Mulai Karya Digital Anda</h3>
                <p class="text-slate-500 font-medium mb-10 leading-relaxed">
                    Silakan masuk atau buat akun baru untuk mulai mempersonalisasi template pilihan Anda. Proses hanya memakan waktu <span class="text-teal-600 font-bold">1 menit</span>.
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                        @click="goToAuth('login')"
                        class="flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-900 hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <LogIn class="w-4 h-4" /> Masuk
                    </button>
                    <button 
                        @click="goToAuth('register')"
                        class="flex items-center justify-center gap-3 py-4 bg-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:bg-teal-500 shadow-xl shadow-slate-200 transition-all active:scale-95"
                    >
                        <UserPlus class="w-4 h-4" /> Daftar Gratis
                    </button>
                </div>
            </div>
        </Modal>
    </div>
</template>

<style scoped>
.animate-in {
    animation-fill-mode: both;
}
</style>
