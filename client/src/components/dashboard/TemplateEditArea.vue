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
                                <div class="p-5 space-y-5">
                                    <!-- Section Content Context -->
                                    <div class="flex items-center justify-between px-1">
                                        <span class="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                                            Content Settings
                                        </span>
                                        <div class="flex gap-2">
                                             <Button variant="ghost" size="icon" @click="invitationStore.duplicateSection(section.id)" class="text-gray-400 hover:text-blue-600">
                                                <Copy class="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" @click="invitationStore.deleteSection(section.id)" class="text-gray-400 hover:text-red-500">
                                                <Trash2 class="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <!-- Editable Fields for current template sync -->
                                    <div v-if="getEditableElements(section.type).length > 0" class="space-y-4">
                                        <UserElementEditor
                                            v-for="element in getEditableElements(section.type)"
                                            :key="element.id"
                                            :element="element"
                                            :model-value="overrides[element.id] || {}"
                                            @update="(updates) => handleElementUpdate(element.id, updates)"
                                        />
                                    </div>
                                    
                                    <div v-else class="py-12 bg-white rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-4">
                                        <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                                            <Layers class="w-6 h-6 text-gray-300" />
                                        </div>
                                        <h4 class="text-sm font-medium text-gray-600 mb-1">Tidak ada field yang dapat diedit</h4>
                                        <p class="text-xs text-gray-400">Section ini didesain secara statis atau diatur oleh admin.</p>
                                    </div>

                                    <!-- Quick Preview Section -->
                                    <div class="pt-2">
                                        <RouterLink 
                                            :to="`/preview/${templateId}?section=${section.id}`"
                                            target="_blank"
                                            class="flex items-center justify-center gap-2 py-3 bg-white rounded-xl border border-gray-100 text-sm font-medium text-blue-600 hover:text-blue-700 hover:shadow-sm transition-all"
                                        >
                                            <Monitor class="w-4 h-4" />
                                            Preview Halaman Ini
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
