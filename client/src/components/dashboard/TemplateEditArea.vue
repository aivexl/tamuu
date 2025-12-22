<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import draggable from 'vuedraggable';
import { 
    GripVertical, 
    Layers, 
    ChevronDown, 
    Plus,
    Copy,
    Trash2,
    Monitor,
    LayoutTemplate
} from 'lucide-vue-next';
import { useTemplateStore } from '@/stores/template';
import { useInvitationStore } from '@/stores/invitation';
import type { TemplateElement } from '@/lib/types';
import Toggle from '@/components/ui/Toggle.vue';
import Button from '@/components/ui/Button.vue';
import UserElementEditor from '@/components/dashboard/UserElementEditor.vue';
import SafeImage from '@/components/ui/SafeImage.vue';

const templateStore = useTemplateStore();
const invitationStore = useInvitationStore();

// UI State
const expandedSections = ref<Set<string>>(new Set());

// Data Binding
const sections = computed({
    get: () => invitationStore.invitation.sections || [],
    set: (newOrder) => {
        invitationStore.reorderSections(newOrder);
    }
});

const templateId = computed(() => invitationStore.invitation.templateId);
const currentTemplate = computed(() => {
    if (!templateId.value) return null;
    return templateStore.templates.find(t => t.id === templateId.value);
});

const overrides = computed(() => invitationStore.invitation.elementOverrides || {});

// Methods
const toggleSection = (id: string) => {
    const newSet = new Set(expandedSections.value);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    expandedSections.value = newSet;
};

const handleElementUpdate = (elementId: string, updates: Partial<TemplateElement>) => {
    invitationStore.updateUserElement(elementId, updates);
};

onMounted(async () => {
    if (templateId.value && !currentTemplate.value) {
        await templateStore.fetchTemplate(templateId.value);
    }
});

// Helpers to get elements for a section in user mode
const getEditableElements = (sectionKey: string) => {
    if (!currentTemplate.value) return [];
    const templateSection = currentTemplate.value.sections[sectionKey];
    if (!templateSection) return [];
    
    return (templateSection.elements || []).filter((el: TemplateElement) => {
        return el.canEditContent !== undefined ? el.canEditContent : el.isUserEditable;
    });
};
</script>

<template>
    <div class="space-y-6">
        <!-- Section List Container -->
        <div v-if="templateId" class="space-y-4">
            <draggable 
                v-model="sections" 
                item-key="id"
                handle=".drag-handle"
                :animation="300"
                ghost-class="opacity-0"
                drag-class="shadow-2xl scale-[1.02] z-50"
                class="space-y-3"
            >
                <template #item="{ element: section }">
                    <div class="group">
                        <!-- Section Card -->
                        <div 
                            class="bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 overflow-hidden"
                            :class="{ 'ring-2 ring-teal-500/20 border-teal-100 shadow-md': expandedSections.has(section.id) }"
                        >
                            <!-- Card Header -->
                            <div class="px-5 py-4 flex items-center gap-4">
                                <!-- Drag Handle -->
                                <button class="drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
                                    <GripVertical class="w-5 h-5" />
                                </button>

                                <!-- Title -->
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-semibold text-gray-800 truncate capitalize">
                                        {{ section.title || section.type }}
                                    </h3>
                                    <p class="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                                        {{ section.type }}
                                    </p>
                                </div>

                                <!-- Actions -->
                                <div class="flex items-center gap-6">
                                    <!-- Visibility Toggle -->
                                    <div class="flex items-center gap-2">
                                        <Toggle 
                                            :model-value="section.isVisible" 
                                            @update:modelValue="invitationStore.toggleSectionVisibility(section.id)"
                                        />
                                    </div>

                                    <!-- Edit Button -->
                                    <Button 
                                        variant="secondary" 
                                        size="sm"
                                        @click="toggleSection(section.id)"
                                        class="h-9 px-4 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border-none transition-all"
                                        :class="{ 'bg-teal-50 text-teal-700 hover:bg-teal-100': expandedSections.has(section.id) }"
                                    >
                                        Edit
                                        <ChevronDown 
                                            class="w-4 h-4 ml-1.5 transition-transform duration-300"
                                            :class="{ 'rotate-180': expandedSections.has(section.id) }"
                                        />
                                    </Button>
                                </div>
                            </div>

                            <!-- Expandable Content -->
                            <div 
                                v-if="expandedSections.has(section.id)"
                                class="border-t border-gray-50 bg-gray-50/50"
                            >
                                <div class="p-5 space-y-6">
                                    <!-- Visual Preview Area (Per Section) -->
                                    <div 
                                        class="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-inner border border-gray-200/50 bg-white"
                                        :style="{ backgroundColor: currentTemplate?.sections[section.type]?.backgroundColor || '#ffffff' }"
                                    >
                                        <!-- Background Image Preview -->
                                        <SafeImage 
                                            v-if="currentTemplate?.sections[section.type]?.backgroundUrl"
                                            :src="currentTemplate.sections[section.type].backgroundUrl!"
                                            alt="Section background preview"
                                            class="w-full h-full object-cover"
                                        />

                                        <!-- Centered Section Type/Title for clarity if no BG -->
                                        <div v-if="!currentTemplate?.sections[section.type]?.backgroundUrl" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span class="text-3xl font-black text-gray-100 uppercase tracking-tighter opacity-50">
                                                {{ section.title || section.type }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Section Content Context (Only Actions if no editable fields) -->
                                    <div class="flex items-center justify-between px-1">
                                        <div class="flex flex-col">
                                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                                                Section Settings
                                            </span>
                                        </div>
                                        <div class="flex gap-1">
                                             <Button variant="ghost" size="icon" @click="invitationStore.duplicateSection(section.id)" class="w-8 h-8 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all">
                                                <Copy class="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" @click="invitationStore.deleteSection(section.id)" class="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 class="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <!-- Editable Fields -->
                                    <div v-if="getEditableElements(section.type).length > 0" class="space-y-5">
                                        <UserElementEditor
                                            v-for="element in getEditableElements(section.type)"
                                            :key="element.id"
                                            :element="element"
                                            :model-value="overrides[element.id] || {}"
                                            @update="(updates) => handleElementUpdate(element.id, updates)"
                                        />
                                    </div>

                                    <!-- Quick Preview Section -->
                                    <div class="pt-2">
                                        <RouterLink 
                                            :to="`/preview/${templateId}?section=${section.id}`"
                                            target="_blank"
                                            class="flex items-center justify-center gap-2 py-3.5 bg-white rounded-2xl border border-gray-100 text-sm font-bold text-teal-600 hover:text-teal-700 hover:border-teal-100 hover:shadow-md hover:shadow-teal-500/5 transition-all group/btn"
                                        >
                                            <Monitor class="w-4 h-4 transition-transform group-hover/btn:scale-110" />
                                            Lihat Halaman Penuh
                                        </RouterLink>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </draggable>

            <!-- Add Page Button -->
            <button 
                @click="invitationStore.addSection?.()"
                class="w-full py-4 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/30 text-teal-600 hover:bg-teal-50 hover:border-teal-300 transition-all duration-300 flex items-center justify-center gap-2 font-semibold group mt-4"
            >
                <div class="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus class="w-5 h-5" />
                </div>
                Tambah Halaman
            </button>
        </div>

        <!-- No Template Selected -->
        <div v-else class="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center animate-in fade-in zoom-in duration-500">
            <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layers class="w-10 h-10 text-gray-300" />
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Pilih Template Terlebih Dahulu</h3>
            <p class="text-gray-500 mb-8 max-w-xs mx-auto">Klik menu "Template" di atas untuk memilih desain dasar undangan Anda.</p>
            <RouterLink 
                to="/templates"
                class="inline-flex items-center gap-2 px-8 py-3.5 bg-teal-500 text-white rounded-2xl font-bold hover:bg-teal-600 shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5"
            >
                <LayoutTemplate class="w-5 h-5" />
                Pilih Sekarang
            </RouterLink>
        </div>
    </div>
</template>

<style scoped>
.drag-handle {
    touch-action: none;
}
</style>
