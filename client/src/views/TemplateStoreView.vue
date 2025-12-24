<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useInvitationStore } from '@/stores/invitation';
import { invitationsApi, type TemplateResponse } from '@/lib/api/invitations';
import { Eye, Loader2, Sparkles, LogIn, UserPlus, Search } from 'lucide-vue-next';
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
const searchQuery = ref('');
const selectedCategory = ref('All');

const categories = ['All', 'Wedding', 'Birthday', 'Event', 'Classic', 'Floral'];

// Current selected template
const currentTemplateId = computed(() => invitationStore.invitation.templateId);

const filteredTemplates = computed(() => {
    let templates = masterTemplates.value;
    
    if (selectedCategory.value !== 'All') {
        templates = templates.filter(t => t.category === selectedCategory.value);
    }
    
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        templates = templates.filter(t => 
            t.name.toLowerCase().includes(q) || 
            (t.category && t.category.toLowerCase().includes(q))
        );
    }
    
    return templates;
});

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
            <!-- Hero Header with Centered Search -->
            <header class="pt-28 pb-10">
                <div class="max-w-4xl mx-auto px-8 text-center">
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/70 backdrop-blur-md border border-white/60 rounded-full shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                        <Sparkles class="w-3.5 h-3.5 text-teal-600" />
                        <span class="text-[10px] font-black uppercase tracking-[0.2em] text-teal-900">Koleksi Mahakarya Digital</span>
                    </div>
                    
                    <h1 class="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter font-outfit mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        Cari Desain <span class="text-teal-600">Impian</span> Anda
                    </h1>

                    <!-- Professional Large Search Bar -->
                    <div class="relative max-w-2xl mx-auto mb-12 group animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <div class="absolute inset-0 bg-teal-500/20 rounded-[2rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"></div>
                        <div class="relative bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex items-center p-2 focus-within:ring-4 focus-within:ring-teal-500/10 transition-all duration-500">
                            <Search class="w-6 h-6 text-slate-400 ml-6" />
                            <input 
                                v-model="searchQuery"
                                type="text" 
                                placeholder="Cari berdasarkan nama atau kategori..." 
                                class="flex-1 bg-transparent border-none focus:ring-0 px-6 py-4 text-lg font-medium text-slate-700 placeholder:text-slate-300"
                            />
                            <button class="bg-slate-900 text-white p-4 rounded-[1.5rem] hover:bg-teal-500 transition-colors shadow-lg">
                                <Search class="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <!-- Category Filters -->
                    <div class="flex flex-wrap justify-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <button 
                            v-for="cat in categories" 
                            :key="cat"
                            @click="selectedCategory = cat"
                            :class="[
                                'px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 border',
                                selectedCategory === cat 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10' 
                                    : 'bg-white/60 backdrop-blur-md text-slate-500 border-white/80 hover:bg-white hover:text-slate-900 shadow-sm'
                            ]"
                        >
                            {{ cat }}
                        </button>
                    </div>
                </div>
            </header>

            <!-- Loading State -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-32">
                <Loader2 class="w-12 h-12 text-teal-500 animate-spin mb-6" />
                <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Menyiapkan Galeri Digital...</p>
            </div>

            <!-- Template Grid -->
            <main v-else class="max-w-[1600px] mx-auto px-8 py-8 mb-20 animate-in fade-in duration-1000 delay-500">
                <div v-if="filteredTemplates.length === 0" class="text-center py-32 bg-white/50 backdrop-blur-md rounded-[3rem] border border-white/60">
                    <Search class="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h3 class="text-xl font-bold text-slate-900 mb-2 font-outfit">Pencarian Tidak Ditemukan</h3>
                    <p class="text-slate-500 font-medium max-w-xs mx-auto">Kami tidak dapat menemukan template yang sesuai dengan kriteria Anda.</p>
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                    <div 
                        v-for="template in filteredTemplates" 
                        :key="template.id"
                        class="group flex flex-col bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.03)] hover:shadow-2xl hover:border-teal-400/30 transition-all duration-700 hover:-translate-y-1"
                        :class="currentTemplateId === template.id ? 'ring-2 ring-teal-500 ring-offset-4' : ''"
                    >
                        <!-- Thumbnail (Exactly like Dashboard) -->
                        <div class="aspect-[4/5] bg-slate-50 relative overflow-hidden">
                            <SafeImage 
                                :src="template.thumbnail" 
                                :alt="template.name"
                                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                            />
                            
                            <!-- Category Badge (Exactly like Dashboard) -->
                            <div class="absolute top-4 left-4 z-20">
                                <span class="px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-[0.1em] text-slate-900 shadow-md">
                                    {{ template.category || 'Premium' }}
                                </span>
                            </div>
                        </div>

                        <!-- Info (Exactly like Dashboard p-5) -->
                        <div class="p-5">
                            <div class="mb-4">
                                <h3 class="text-sm font-bold text-slate-900 truncate font-outfit">{{ template.name }}</h3>
                                <p class="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{{ template.category || 'Premium' }}</p>
                            </div>
                            
                            <!-- Actions (Always Visible, Below Info) -->
                            <div class="space-y-2.5">
                                <button 
                                    @click="handleSelect(template.id)"
                                    :class="[
                                        'w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-sm',
                                        currentTemplateId === template.id 
                                            ? 'bg-slate-50 text-slate-300 cursor-default border border-slate-100' 
                                            : 'bg-slate-900 text-white hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-500/10'
                                    ]"
                                >
                                    {{ currentTemplateId === template.id ? 'Terpilih' : 'Gunakan Desain' }}
                                </button>
                                
                                <button 
                                    @click="previewTemplate(template.id)"
                                    class="w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-500 flex items-center justify-center gap-2"
                                >
                                    <Eye class="w-3.5 h-3.5" /> Preview Desain
                                </button>
                            </div>
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
