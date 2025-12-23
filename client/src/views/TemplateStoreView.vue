<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInvitationStore } from '@/stores/invitation';
import { invitationsApi, type TemplateResponse } from '@/lib/api/invitations';
import { LayoutTemplate, Eye, Check, Loader2 } from 'lucide-vue-next';
import Button from '@/components/ui/Button.vue';
import SafeImage from '@/components/ui/SafeImage.vue';
import MainNavbar from '@/components/layout/MainNavbar.vue';
import MainFooter from '@/components/layout/MainFooter.vue';

const router = useRouter();
const invitationStore = useInvitationStore();

// Master templates (only templates without user_id)
const masterTemplates = ref<TemplateResponse[]>([]);
const isLoading = ref(true);

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

const selectTemplate = (templateId: string) => {
    invitationStore.updateTemplateId(templateId);
    router.push({ name: 'customer-dashboard' });
};

const previewTemplate = (templateId: string) => {
    window.open(`/preview/${templateId}`, '_blank');
};

</script>

<template>
    <div class="min-h-screen bg-slate-50">
        <MainNavbar />

        <!-- Spacer for sticky navbar -->
        <div class="pt-24"></div>

        <!-- Header -->
        <header class="py-12 bg-white border-b border-slate-100">
            <div class="max-w-7xl mx-auto px-6">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div class="space-y-2">
                        <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full">
                            <LayoutTemplate class="w-3.5 h-3.5 text-indigo-600" />
                            <span class="text-[10px] font-black uppercase tracking-widest text-indigo-700">Explorasi Desain</span>
                        </div>
                        <h1 class="text-4xl font-black text-slate-900 tracking-tight">Koleksi Template Premium</h1>
                        <p class="text-slate-500 font-medium max-w-xl text-sm">Pilih desain mahakarya kami untuk momen spesial Anda. Setiap template dikurasi oleh desainer kelas dunia.</p>
                    </div>
                </div>
            </div>
        </header>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
            <Loader2 class="w-10 h-10 text-teal-600 animate-spin mb-4" />
            <p class="text-gray-500">Memuat template...</p>
        </div>

        <!-- Template Grid -->
        <main v-else class="max-w-6xl mx-auto px-4 py-8">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div 
                    v-for="template in masterTemplates" 
                    :key="template.id"
                    class="bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-200 hover:shadow-xl"
                    :class="currentTemplateId === template.id ? 'border-teal-500 ring-2 ring-teal-200' : 'border-transparent'"
                >
                    <!-- Thumbnail -->
                    <div class="aspect-[3/4] bg-gray-100 relative">
                        <SafeImage 
                            :src="template.thumbnail" 
                            :alt="template.name"
                            class="w-full h-full object-cover"
                        />
                        
                        <!-- Selected Badge -->
                        <div 
                            v-if="currentTemplateId === template.id"
                            class="absolute top-3 right-3 bg-teal-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                        >
                            <Check class="w-3 h-3" />
                            Terpilih
                        </div>
                    </div>

                    <!-- Info & Actions -->
                    <div class="p-4 space-y-3">
                        <div>
                            <h3 class="font-semibold text-gray-900 truncate">{{ template.name }}</h3>
                            <p class="text-xs text-gray-500 capitalize">{{ template.globalTheme?.category || 'Modern' }}</p>
                        </div>

                        <!-- Always Visible Buttons -->
                        <div class="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                class="flex-1 flex items-center justify-center gap-1"
                                @click="previewTemplate(template.id)"
                            >
                                <Eye class="w-4 h-4" />
                                Preview
                            </Button>
                            <Button 
                                :variant="currentTemplateId === template.id ? 'secondary' : 'primary'"
                                size="sm" 
                                class="flex-1 flex items-center justify-center gap-1"
                                @click="selectTemplate(template.id)"
                            >
                                <Check class="w-4 h-4" />
                                {{ currentTemplateId === template.id ? 'Terpilih' : 'Pilih' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div v-if="masterTemplates.length === 0 && !isLoading" class="text-center py-20">
                <p class="text-gray-500 mb-4">Belum ada template tersedia</p>
            </div>
        </main>
        <MainFooter />
    </div>
</template>
