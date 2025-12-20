<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTemplateStore } from '@/stores/template';
import { useInvitationStore } from '@/stores/invitation';
import type { TemplateElement, SectionDesign } from '@/lib/types';
import { ChevronRight, Eye, Layers } from 'lucide-vue-next';
import EditableTextField from './editable/EditableTextField.vue';
import EditableImageField from './editable/EditableImageField.vue';
import EditableMapsField from './editable/EditableMapsField.vue';
import SafeImage from '@/components/ui/SafeImage.vue';

const templateStore = useTemplateStore();
const invitationStore = useInvitationStore();

// Get template ID from invitation
const templateId = computed(() => invitationStore.invitation.templateId);

// Get the current template
const currentTemplate = computed(() => {
    if (!templateId.value) return null;
    return templateStore.templates.find(t => t.id === templateId.value);
});

// Get ordered sections with editable elements
const editableSections = computed(() => {
    if (!currentTemplate.value) return [];
    
    const sectionsObj = currentTemplate.value.sections || {};
    return Object.entries(sectionsObj)
        .map(([key, data]: [string, SectionDesign]) => {
            const editableElements = (data.elements || []).filter(
                (el: TemplateElement) => el.isUserEditable === true
            );
            return {
                key,
                title: data.title || key.charAt(0).toUpperCase() + key.slice(1),
                order: data.order ?? 999,
                backgroundColor: data.backgroundColor,
                backgroundUrl: data.backgroundUrl,
                elements: editableElements,
                hasEditableContent: editableElements.length > 0
            };
        })
        .filter(s => s.hasEditableContent)
        .sort((a, b) => a.order - b.order);
});

// Accordion state - track which sections are expanded
const expandedSections = ref<Set<string>>(new Set());

const toggleSection = (key: string) => {
    const newSet = new Set(expandedSections.value);
    if (newSet.has(key)) {
        newSet.delete(key);
    } else {
        // Only allow one section open at a time
        newSet.clear();
        newSet.add(key);
    }
    expandedSections.value = newSet;
};

const isSectionExpanded = (key: string) => expandedSections.value.has(key);

// Handle element updates
const handleElementUpdate = async (sectionKey: string, elementId: string, field: string, value: string) => {
    if (!templateId.value) return;
    
    const updates: Partial<TemplateElement> = {};
    
    // Determine which field to update based on element type
    if (field === 'content') {
        updates.content = value;
    } else if (field === 'imageUrl') {
        updates.imageUrl = value;
    }
    
    await templateStore.updateElement(templateId.value, sectionKey, elementId, updates);
};

// Load template on mount if needed
import { onMounted } from 'vue';

onMounted(async () => {
    if (templateId.value && !currentTemplate.value) {
        await templateStore.fetchTemplate(templateId.value);
    }
});
</script>

<template>
    <div v-if="editableSections.length > 0" class="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-teal-50 to-blue-50 border-b border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Layers class="w-5 h-5 text-teal-600" />
                Edit Undangan
            </h2>
            <p class="text-sm text-gray-500 mt-1">Sesuaikan informasi undangan Anda</p>
        </div>

        <!-- Accordion Sections -->
        <div class="divide-y divide-gray-100">
            <div 
                v-for="section in editableSections" 
                :key="section.key"
                class="transition-all duration-200"
            >
                <!-- Section Header (Clickable) -->
                <button
                    class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    @click="toggleSection(section.key)"
                >
                    <div class="flex items-center gap-3">
                        <ChevronRight 
                            class="w-5 h-5 text-gray-400 transition-transform duration-200"
                            :class="{ 'rotate-90': isSectionExpanded(section.key) }"
                        />
                        <span class="font-medium text-gray-700">{{ section.title }}</span>
                        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {{ section.elements.length }} field
                        </span>
                    </div>
                    <Eye class="w-4 h-4 text-gray-400" />
                </button>

                <!-- Section Content (Collapsible) -->
                <div 
                    v-if="isSectionExpanded(section.key)"
                    class="px-6 py-4 bg-gray-50 border-t border-gray-100"
                >
                    <!-- Mini Preview -->
                    <div 
                        class="w-full h-32 rounded-lg overflow-hidden mb-6 relative shadow-inner"
                        :style="{
                            backgroundColor: section.backgroundColor || '#f3f4f6'
                        }"
                    >
                        <SafeImage 
                            v-if="section.backgroundUrl"
                            :src="section.backgroundUrl"
                            alt="Section preview"
                            class="w-full h-full object-cover opacity-70"
                        />
                        <div class="absolute inset-0 flex items-center justify-center">
                            <span class="text-xs text-gray-600 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm">
                                Preview {{ section.title }}
                            </span>
                        </div>
                    </div>

                    <!-- Editable Fields -->
                    <div class="space-y-4">
                        <template v-for="element in section.elements" :key="element.id">
                            <!-- Text Field -->
                            <EditableTextField
                                v-if="element.editableType === 'text' || (!element.editableType && element.type === 'text')"
                                :model-value="element.content || ''"
                                :label="element.editableLabel || element.name || 'Text'"
                                :multiline="(element.content?.length || 0) > 50"
                                @save="(val) => handleElementUpdate(section.key, element.id, 'content', val)"
                            />

                            <!-- Image Field -->
                            <EditableImageField
                                v-else-if="element.editableType === 'image' || (!element.editableType && element.type === 'image')"
                                :model-value="element.imageUrl || ''"
                                :label="element.editableLabel || element.name || 'Foto'"
                                @save="(val) => handleElementUpdate(section.key, element.id, 'imageUrl', val)"
                            />

                            <!-- Maps Field -->
                            <EditableMapsField
                                v-else-if="element.editableType === 'maps'"
                                :model-value="element.content || ''"
                                :label="element.editableLabel || 'Link Google Maps'"
                                @save="(val) => handleElementUpdate(section.key, element.id, 'content', val)"
                            />
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State (if no editable elements) -->
        <div v-if="editableSections.length === 0" class="px-6 py-12 text-center">
            <p class="text-gray-500">Template ini tidak memiliki konten yang dapat diedit.</p>
        </div>
    </div>

    <!-- No Template Selected -->
    <div v-else-if="!templateId" class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <Layers class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 class="font-semibold text-gray-700 mb-2">Pilih Template Terlebih Dahulu</h3>
        <p class="text-sm text-gray-500">Klik menu "Template" untuk memilih desain undangan</p>
    </div>
</template>
