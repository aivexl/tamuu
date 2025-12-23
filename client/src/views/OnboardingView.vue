<script setup lang="ts">
/**
 * OnboardingView.vue
 * Premium multi-step onboarding wizard for invitation creation
 * Enterprise-grade user experience with smooth animations
 */

import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { invitationsApi } from '@/lib/api/invitations';
import type { InvitationCategory, Template } from '@/lib/types';
import SafeImage from '@/components/ui/SafeImage.vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import { 
    Heart, Baby, Gift, BookOpen, Mic, TreePine, Sun, 
    PartyPopper, UtensilsCrossed, GraduationCap, Star,
    ArrowLeft, ArrowRight, Check, Loader2, AlertCircle,
    Sparkles
} from 'lucide-vue-next';

const router = useRouter();

// ============================================
// CATEGORY DATA
// ============================================

interface CategoryItem {
    id: InvitationCategory;
    name: string;
    icon: any;
    color: string;
    bgGradient: string;
}

const categories: CategoryItem[] = [
    { id: 'wedding', name: 'Pernikahan', icon: Heart, color: '#E91E63', bgGradient: 'from-pink-500/20 to-rose-500/20' },
    { id: 'kids', name: 'Anak & Balita', icon: Baby, color: '#4CAF50', bgGradient: 'from-green-500/20 to-emerald-500/20' },
    { id: 'birthday', name: 'Ulang Tahun', icon: Gift, color: '#FF9800', bgGradient: 'from-orange-500/20 to-amber-500/20' },
    { id: 'aqiqah', name: 'Aqiqah', icon: Star, color: '#9C27B0', bgGradient: 'from-purple-500/20 to-violet-500/20' },
    { id: 'tasmiyah', name: 'Tasmiyah', icon: BookOpen, color: '#3F51B5', bgGradient: 'from-indigo-500/20 to-blue-500/20' },
    { id: 'khitan', name: 'Tasyakuran Khitan', icon: Sparkles, color: '#00BCD4', bgGradient: 'from-cyan-500/20 to-teal-500/20' },
    { id: 'umum', name: 'Umum', icon: Star, color: '#607D8B', bgGradient: 'from-slate-500/20 to-gray-500/20' },
    { id: 'seminar', name: 'Seminar', icon: Mic, color: '#2196F3', bgGradient: 'from-blue-500/20 to-sky-500/20' },
    { id: 'christmas', name: 'Natal', icon: TreePine, color: '#F44336', bgGradient: 'from-red-500/20 to-green-500/20' },
    { id: 'newyear', name: 'Tahun Baru', icon: Sparkles, color: '#FFC107', bgGradient: 'from-yellow-500/20 to-amber-500/20' },
    { id: 'syukuran', name: 'Syukuran', icon: Sun, color: '#FF5722', bgGradient: 'from-orange-500/20 to-red-500/20' },
    { id: 'islami', name: 'Islami', icon: Star, color: '#4CAF50', bgGradient: 'from-green-500/20 to-teal-500/20' },
    { id: 'party', name: 'Pesta', icon: PartyPopper, color: '#E91E63', bgGradient: 'from-pink-500/20 to-purple-500/20' },
    { id: 'dinner', name: 'Makan Malam', icon: UtensilsCrossed, color: '#795548', bgGradient: 'from-amber-500/20 to-orange-500/20' },
    { id: 'school', name: 'Sekolah', icon: BookOpen, color: '#3F51B5', bgGradient: 'from-indigo-500/20 to-blue-500/20' },
    { id: 'graduation', name: 'Wisuda', icon: GraduationCap, color: '#673AB7', bgGradient: 'from-purple-500/20 to-indigo-500/20' },
];

// ============================================
// STATE
// ============================================

const currentStep = ref(1);
const selectedCategory = ref<InvitationCategory | null>(null);
const slug = ref('');
const slugError = ref<string | null>(null);
const slugSuccess = ref(false);
const slugChecking = ref(false);
const invitationName = ref('');
const selectedTemplate = ref<any | null>(null);
const templates = ref<any[]>([]);
const loadingTemplates = ref(false);
const creating = ref(false);
const error = ref<string | null>(null);

// Slug validation debounce
let slugTimeout: ReturnType<typeof setTimeout> | null = null;

// ============================================
// COMPUTED
// ============================================

const canProceedStep1 = computed(() => selectedCategory.value !== null);
const canProceedStep2 = computed(() => slug.value.length >= 3 && slugSuccess.value && !slugError.value);
const canProceedStep3 = computed(() => selectedTemplate.value !== null);

const selectedCategoryData = computed(() => 
    categories.find(c => c.id === selectedCategory.value)
);

// ============================================
// METHODS
// ============================================

function selectCategory(cat: InvitationCategory) {
    selectedCategory.value = cat;
}

async function checkSlug() {
    if (slug.value.length < 3) {
        slugError.value = 'Minimal 3 karakter';
        slugSuccess.value = false;
        return;
    }

    // Format check
    const slugFormat = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    const cleanSlug = slug.value.toLowerCase().replace(/\s+/g, '-');
    
    if (!slugFormat.test(cleanSlug)) {
        slugError.value = 'Gunakan huruf kecil, angka, dan tanda hubung saja';
        slugSuccess.value = false;
        return;
    }

    slugChecking.value = true;
    slugError.value = null;
    slugSuccess.value = false;

    try {
        const result = await invitationsApi.checkSlug(cleanSlug);
        if (result.available) {
            slugSuccess.value = true;
            slug.value = cleanSlug; // Update to cleaned version
        } else {
            slugError.value = result.message;
        }
    } catch (e: any) {
        slugError.value = e.message || 'Gagal memeriksa ketersediaan';
    } finally {
        slugChecking.value = false;
    }
}

watch(slug, () => {
    slugSuccess.value = false;
    slugError.value = null;
    
    if (slugTimeout) clearTimeout(slugTimeout);
    slugTimeout = setTimeout(() => {
        if (slug.value.length >= 3) {
            checkSlug();
        }
    }, 500);
});

async function loadTemplates() {
    if (!selectedCategory.value) return;
    
    loadingTemplates.value = true;
    try {
        templates.value = await invitationsApi.getMasterTemplates(selectedCategory.value);
    } catch (e) {
        console.error('Failed to load templates:', e);
    } finally {
        loadingTemplates.value = false;
    }
}

function selectTemplate(template: Template) {
    selectedTemplate.value = template;
}

async function createInvitation() {
    if (!selectedTemplate.value || !selectedCategory.value) return;

    creating.value = true;
    error.value = null;

    try {
        const result = await invitationsApi.createInvitation({
            templateId: selectedTemplate.value.id,
            slug: slug.value,
            name: invitationName.value || `Undangan ${selectedCategoryData.value?.name}`,
            category: selectedCategory.value
        });

        // Redirect to create/edit page with slug
        router.push({ name: 'create', params: { slug: result.slug } });
    } catch (e: any) {
        error.value = e.message || 'Gagal membuat undangan';
    } finally {
        creating.value = false;
    }
}

function nextStep() {
    if (currentStep.value === 1 && canProceedStep1.value) {
        currentStep.value = 2;
    } else if (currentStep.value === 2 && canProceedStep2.value) {
        currentStep.value = 3;
        loadTemplates();
    } else if (currentStep.value === 3 && canProceedStep3.value) {
        createInvitation();
    }
}

function prevStep() {
    if (currentStep.value > 1) {
        currentStep.value--;
    }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
    <!-- Unified Header -->
    <AppHeader />
    
    <!-- Progress Steps -->
    <div class="border-b bg-white/80 backdrop-blur-sm sticky top-16 z-10">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center">
        <div class="flex items-center gap-2">
          <div 
            v-for="step in 3" 
            :key="step"
            class="flex items-center"
          >
            <div 
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                currentStep >= step 
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' 
                  : 'bg-slate-100 text-slate-400'
              ]"
            >
              <Check v-if="currentStep > step" class="w-4 h-4" />
              <span v-else>{{ step }}</span>
            </div>
            <div 
              v-if="step < 3"
              :class="[
                'w-8 h-0.5 mx-1 transition-all duration-300',
                currentStep > step ? 'bg-teal-500' : 'bg-slate-200'
              ]"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Step 1: Category Selection -->
      <div v-if="currentStep === 1" class="animate-fade-in">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-slate-800 mb-2">
            Pilih Jenis Undangan
          </h1>
          <p class="text-slate-500">
            Mulai dengan memilih kategori yang sesuai dengan acaramu
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="selectCategory(cat.id)"
            :class="[
              'group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left',
              selectedCategory === cat.id
                ? 'border-teal-500 bg-gradient-to-br ' + cat.bgGradient + ' shadow-xl scale-[1.02]'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
            ]"
          >
            <div 
              class="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
              :style="{ backgroundColor: cat.color + '15' }"
            >
              <component :is="cat.icon" class="w-6 h-6" :style="{ color: cat.color }" />
            </div>
            <h3 class="font-semibold text-slate-800">{{ cat.name }}</h3>
            
            <!-- Check mark -->
            <div 
              v-if="selectedCategory === cat.id"
              class="absolute top-3 right-3 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center"
            >
              <Check class="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      </div>

      <!-- Step 2: Slug Creation -->
      <div v-if="currentStep === 2" class="animate-fade-in">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-slate-800 mb-2">
            Buat Link Undanganmu
          </h1>
          <p class="text-slate-500">
            Buat link yang unik dan mudah diingat untuk dibagikan
          </p>
        </div>

        <div class="max-w-xl mx-auto">
          <div class="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            <!-- Category Badge -->
            <div v-if="selectedCategoryData" class="flex items-center gap-3 mb-6 pb-6 border-b">
              <div 
                class="w-10 h-10 rounded-xl flex items-center justify-center"
                :style="{ backgroundColor: selectedCategoryData.color + '15' }"
              >
                <component :is="selectedCategoryData.icon" class="w-5 h-5" :style="{ color: selectedCategoryData.color }" />
              </div>
              <div>
                <p class="text-sm text-slate-500">Kategori</p>
                <p class="font-semibold text-slate-800">{{ selectedCategoryData.name }}</p>
              </div>
            </div>

            <!-- Slug Input -->
            <div class="space-y-4">
              <label class="block">
                <span class="text-sm font-medium text-slate-700 mb-2 block">Link Undangan</span>
                <div class="flex items-center">
                  <span class="px-4 py-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-sm">
                    tamuu.pages.dev/
                  </span>
                  <div class="relative flex-1">
                    <input
                      v-model="slug"
                      type="text"
                      placeholder="contoh: andi-sarah"
                      :class="[
                        'w-full px-4 py-3 border rounded-r-xl focus:ring-2 focus:ring-offset-0 transition-all',
                        slugError 
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' 
                          : slugSuccess 
                            ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500' 
                            : 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-500'
                      ]"
                    />
                    <div class="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 v-if="slugChecking" class="w-5 h-5 text-slate-400 animate-spin" />
                      <Check v-else-if="slugSuccess" class="w-5 h-5 text-green-500" />
                      <AlertCircle v-else-if="slugError" class="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                </div>
              </label>

              <!-- Slug Status -->
              <div v-if="slugError" class="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle class="w-4 h-4" />
                {{ slugError }}
              </div>
              <div v-else-if="slugSuccess" class="flex items-center gap-2 text-green-600 text-sm">
                <Check class="w-4 h-4" />
                Link tersedia! ✨
              </div>
              <p v-else class="text-sm text-slate-500">
                Gunakan huruf kecil, angka, dan tanda hubung. Minimal 3 karakter.
              </p>

              <!-- Invitation Name (Optional) -->
              <label class="block pt-4">
                <span class="text-sm font-medium text-slate-700 mb-2 block">
                  Nama Undangan <span class="text-slate-400">(opsional)</span>
                </span>
                <input
                  v-model="invitationName"
                  type="text"
                  placeholder="Contoh: Undangan Pernikahan Andi & Sarah"
                  class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Template Selection -->
      <div v-if="currentStep === 3" class="animate-fade-in">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-slate-800 mb-2">
            Pilih Template
          </h1>
          <p class="text-slate-500">
            Pilih desain yang akan menjadi dasar undanganmu
          </p>
        </div>

        <!-- Loading -->
        <div v-if="loadingTemplates" class="flex flex-col items-center justify-center py-16">
          <Loader2 class="w-8 h-8 text-teal-500 animate-spin mb-4" />
          <p class="text-slate-500">Memuat template...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="templates.length === 0" class="text-center py-16">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles class="w-8 h-8 text-slate-400" />
          </div>
          <h3 class="text-lg font-semibold text-slate-800 mb-2">Belum Ada Template</h3>
          <p class="text-slate-500">Template untuk kategori ini sedang dalam pengembangan</p>
        </div>

        <!-- Templates Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            v-for="template in templates"
            :key="template.id"
            @click="selectTemplate(template)"
            :class="[
              'group relative rounded-2xl overflow-hidden border-2 transition-all duration-300 text-left',
              selectedTemplate?.id === template.id
                ? 'border-teal-500 shadow-xl ring-4 ring-teal-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
            ]"
          >
            <!-- Thumbnail -->
            <div class="aspect-[3/4] bg-slate-100">
              <SafeImage
                v-if="template.thumbnail"
                :src="template.thumbnail"
                :alt="template.name"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <Sparkles class="w-12 h-12 text-slate-300" />
              </div>
            </div>

            <!-- Info -->
            <div class="p-4 bg-white">
              <h3 class="font-semibold text-slate-800 truncate">{{ template.name }}</h3>
            </div>

            <!-- Check mark -->
            <div 
              v-if="selectedTemplate?.id === template.id"
              class="absolute top-3 right-3 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shadow-lg"
            >
              <Check class="w-5 h-5 text-white" />
            </div>
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
        <AlertCircle class="w-5 h-5 flex-shrink-0" />
        {{ error }}
      </div>

      <!-- Navigation Buttons -->
      <div class="flex items-center justify-between mt-8 pt-6 border-t">
        <button
          v-if="currentStep > 1"
          @click="prevStep"
          class="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft class="w-5 h-5" />
          Kembali
        </button>
        <div v-else />

        <button
          @click="nextStep"
          :disabled="
            (currentStep === 1 && !canProceedStep1) ||
            (currentStep === 2 && !canProceedStep2) ||
            (currentStep === 3 && !canProceedStep3) ||
            creating
          "
          :class="[
            'flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-300',
            (currentStep === 1 && canProceedStep1) ||
            (currentStep === 2 && canProceedStep2) ||
            (currentStep === 3 && canProceedStep3)
              ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-[1.02]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          ]"
        >
          <Loader2 v-if="creating" class="w-5 h-5 animate-spin" />
          <span v-else>
            {{ currentStep === 3 ? 'Buat Undangan' : 'Lanjutkan' }}
          </span>
          <ArrowRight v-if="!creating && currentStep < 3" class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
