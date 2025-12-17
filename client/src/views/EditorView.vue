<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTemplateStore } from '@/stores/template';
import { PREDEFINED_SECTION_TYPES } from '@/lib/types';
import KonvaCanvas from '@/components/editor/KonvaCanvas.vue';
import PropertyPanel from '@/components/editor/PropertyPanel.vue';
import AddElementPanel from '@/components/editor/AddElementPanel.vue';
import Button from '@/components/ui/Button.vue';
import { ArrowLeft, Save, Undo, Redo, Layers, ChevronUp, ChevronDown, Eye, EyeOff, Copy, Trash2, Pencil, Plus } from 'lucide-vue-next';

const route = useRoute();
const store = useTemplateStore();

const templateId = computed(() => route.params.id as string);
const activeSection = ref<string>(''); // Will be set to first section on load

// Section management
const editingSection = ref<string | null>(null);

const currentTemplate = computed(() => store.templates.find(t => t.id === templateId.value));

// Core Logic: Ordered Sections from Store
const orderedSections = computed(() => {
    if (!currentTemplate.value) return [];
    
    // Fallback: If no sections (or very few), might be a fresh/legacy template. 
    // Ensure at least defaults are present in the list even if not in DB yet.
    // However, store usually populates from DB. If DB is empty, store.sections is empty.
    
    const sectionsObj = currentTemplate.value.sections || {};
    let items = Object.entries(sectionsObj)
        .map(([key, data]) => ({ 
            key, 
            ...data,
            title: data.title || key.charAt(0).toUpperCase() + key.slice(1)
        }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    // If perfectly empty, try to show defaults?
    if (items.length === 0) {
        // Return dummy items based on PREDEFINED so user sees something
        // Note: These won't be editable until "Added" effectively, but usually 
        // the store should handle initialization. 
        // Better to just show them so user isn't confused.
        // Importing PREDEFINED_SECTION_TYPES from types.
        return PREDEFINED_SECTION_TYPES.map((type, index) => ({
             key: type,
             title: type.charAt(0).toUpperCase() + type.slice(1),
             order: index,
             isVisible: true,
             elements: [],
             animation: 'none'
        }));
    }

    return items;
});

// Setup active section on load
onMounted(async () => {
    if (templateId.value) {
        await store.fetchTemplate(templateId.value);
        store.activeTemplateId = templateId.value;
        
        const t = store.templates.find(t => t.id === templateId.value);
        // Hydrate defaults if sections are empty (legacy or new template)
        if (t && (!t.sections || Object.keys(t.sections).length === 0)) {
             const defaults = PREDEFINED_SECTION_TYPES.map((type, index) => ({
                 key: type,
                 title: type.charAt(0).toUpperCase() + type.slice(1),
                 order: index
             }));
             store.hydrateDefaultSections(templateId.value, defaults);
        }

        // Set initial active section
        if (orderedSections.value.length > 0 && !activeSection.value) {
            activeSection.value = orderedSections.value[0].key;
        }
    }
    // Add keyboard shortcuts
    window.addEventListener('keydown', handleKeyDown);
});

const startEditTitle = (sectionKey: string) => {
    editingSection.value = sectionKey;
};

const saveTitle = (sectionKey: string, newTitle: string) => {
    store.renameSection(templateId.value, sectionKey, newTitle);
    editingSection.value = null;
};

const addNewSection = () => {
    store.addSection(templateId.value);
    // Note: To auto-select new section, we'd need to watch orderedSections or return key from store
};

// Copy to Section Modal
const showCopyModal = ref(false);
const copySourceSection = ref<string | null>(null);

const openCopyModal = (sectionKey: string) => {
    copySourceSection.value = sectionKey;
    showCopyModal.value = true;
};

const closeCopyModal = () => {
    showCopyModal.value = false;
    copySourceSection.value = null;
};

const handleCopyToSection = async (targetSectionKey: string) => {
    if (!copySourceSection.value || copySourceSection.value === targetSectionKey) return;
    
    await store.copySectionElementsTo(templateId.value, copySourceSection.value, targetSectionKey);
    closeCopyModal();
};

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

// Keyboard shortcuts
const handleKeyDown = (e: KeyboardEvent) => {
    // Skip if user is typing in an input or textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
    }

    // Ctrl+C: Copy selected element
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && store.selectedElementId) {
        e.preventDefault();
        store.copyElement(templateId.value, activeSection.value, store.selectedElementId);
    }

    // Ctrl+V: Paste element
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && store.clipboard) {
        e.preventDefault();
        store.pasteElement(templateId.value, activeSection.value);
    }

    // Delete or Backspace: Delete selected element  
    if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedElementId) {
        e.preventDefault();
        store.deleteElement(templateId.value, activeSection.value, store.selectedElementId);
    }
};

const currentSectionData = computed(() => 
    currentTemplate.value?.sections[activeSection.value] || { animation: 'none', elements: [] }
);

// Helper to get section data by type
const getSectionData = (sectionType: string) => {
    return currentTemplate.value?.sections[sectionType] || { animation: 'none', elements: [] };
};

const handleElementSelect = (id: string | null) => {
    store.setSelectedElement(id);
};

const handleElementDragEnd = (id: string, x: number, y: number) => {
    store.updateElement(templateId.value, activeSection.value, id, { position: { x, y } });
};

const handleElementTransformEnd = (payload: any) => {
    const { id, x, y, width, height, rotation } = payload;
    store.updateElement(templateId.value, activeSection.value, id, { 
        position: { x, y },
        size: { width, height },
        rotation
    });
};
</script>

<template>
    <div class="h-screen flex flex-col bg-slate-50">
        <!-- Toolbar -->
        <header class="h-16 border-b flex items-center justify-between px-6 bg-white z-20 shadow-sm">
             <div class="flex items-center gap-4">
                 <Button variant="ghost" size="icon" @click="$router.push('/admin/templates')">
                     <ArrowLeft class="w-5 h-5" />
                 </Button>
                 <div>
                    <h1 class="font-bold text-lg text-slate-800">{{ currentTemplate?.name || 'Loading...' }}</h1>
                    <p class="text-xs text-slate-500">Last saved just now</p>
                 </div>
             </div>
             
            <div class="flex items-center gap-2">
                <Button variant="ghost" size="icon"><Undo class="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon"><Redo class="w-4 h-4" /></Button>
                <div class="w-px h-6 bg-slate-200 mx-2"></div>
                <Button class="flex items-center gap-2 bg-teal-600 hover:bg-teal-700">
                    <Save class="w-4 h-4" />
                    Save
                </Button>
            </div>
        </header>

        <div class="flex-1 flex overflow-hidden">
             <!-- Sidebar Left (Sections & Add) -->
            <aside class="w-64 border-r bg-white flex flex-col z-10">
                <!-- Section List -->
                <div class="flex-1 overflow-y-auto p-4 border-b">
                    <div class="flex items-center gap-2 mb-3 text-slate-400">
                        <Layers class="w-4 h-4" />
                        <span class="text-xs font-bold uppercase tracking-wider">Sections</span>
                    </div>
                    <div class="space-y-0.5">
                        <div 
                            v-for="(section, index) in orderedSections" 
                            :key="section.key"
                            class="group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all duration-150"
                            :class="activeSection === section.key 
                                ? 'bg-teal-50 text-teal-700' 
                                : 'hover:bg-slate-50 text-slate-600'"
                            @click="activeSection = section.key"
                        >
                            <!-- Left: Title -->
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="text-xs text-slate-400 font-mono w-4">{{ index + 1 }}</span>
                                <input 
                                    v-if="editingSection === section.key"
                                    :value="section.title"
                                    class="text-sm font-medium bg-white border border-teal-400 rounded px-1.5 py-0.5 w-24 focus:outline-none"
                                    @blur="saveTitle(section.key, ($event.target as HTMLInputElement).value)"
                                    @keyup.enter="saveTitle(section.key, ($event.target as HTMLInputElement).value)"
                                    @click.stop
                                    autofocus
                                />
                                <span v-else class="text-sm font-medium">{{ section.title }}</span>
                            </div>
                            
                            <!-- Right: Controls (show on hover) -->
                            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                                <button class="p-1 rounded hover:bg-white/50" title="Rename" @click="startEditTitle(section.key)">
                                    <Pencil class="w-3 h-3" />
                                </button>
                                <button class="p-1 rounded hover:bg-white/50" :disabled="index === 0" :class="{'opacity-30': index === 0}" title="Up" @click="store.moveSectionUp(templateId, section.key)">
                                    <ChevronUp class="w-3 h-3" />
                                </button>
                                <button class="p-1 rounded hover:bg-white/50" :disabled="index === orderedSections.length - 1" :class="{'opacity-30': index === orderedSections.length - 1}" title="Down" @click="store.moveSectionDown(templateId, section.key)">
                                    <ChevronDown class="w-3 h-3" />
                                </button>
                                <button class="p-1 rounded hover:bg-white/50" title="Visibility" @click="store.toggleSectionVisibility(templateId, section.key)">
                                    <Eye v-if="section.isVisible !== false" class="w-3 h-3" />
                                    <EyeOff v-else class="w-3 h-3 text-slate-300" />
                                </button>
                                <button class="p-1 rounded hover:bg-white/50" title="Copy to Page" @click="openCopyModal(section.key)">
                                    <Copy class="w-3 h-3" />
                                </button>
                                <button class="p-1 rounded hover:bg-red-50 text-red-400" title="Delete" @click="store.deleteSection(templateId, section.key)">
                                    <Trash2 class="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        class="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-400 hover:text-teal-600 transition-colors border border-dashed border-slate-200 rounded-md hover:border-teal-400"
                        @click="addNewSection"
                    >
                        <Plus class="w-3.5 h-3.5" />
                        Tambah Halaman Baru
                    </button>
                </div>
                
                <!-- Add Elements Panel -->
                <div class="p-4 bg-slate-50 border-t">
                    <AddElementPanel :activeSection="activeSection" />
                </div>
            </aside>

            <!-- Canvas Area -->
            <main class="flex-1 bg-slate-100 flex items-start justify-center overflow-auto p-6 relative">
                <!-- Zoom Controls - Top Left -->
                <div class="absolute top-6 left-6 bg-white rounded-full shadow-lg border border-slate-200 px-4 py-2 flex items-center gap-4 text-sm font-medium text-slate-600 z-20">
                    <button class="hover:text-slate-900">-</button>
                    <span>100%</span>
                    <button class="hover:text-slate-900">+</button>
                </div>
                
                <!-- Canvas Wrapper - All Sections Stacked -->
                <div class="shadow-2xl ring-1 ring-slate-900/5 bg-white transition-all duration-300">
                    <div v-for="(section, index) in orderedSections" :key="section.key" class="relative group">
                        <!-- Section Divider Bar - Light Theme, positioned at top-right -->
                        <div class="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-md border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span class="text-xs font-bold uppercase tracking-wider text-teal-600 mr-2">{{ section.title }}</span>
                            <button 
                                class="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500 hover:text-slate-700" 
                                :disabled="index === 0" 
                                :class="{ 'opacity-30 cursor-not-allowed': index === 0 }" 
                                title="Move Up"
                                @click="store.moveSectionUp(templateId, section.key)"
                            >
                                <ChevronUp class="w-4 h-4" />
                            </button>
                            <button 
                                class="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500 hover:text-slate-700" 
                                :disabled="index === orderedSections.length - 1" 
                                :class="{ 'opacity-30 cursor-not-allowed': index === orderedSections.length - 1 }" 
                                title="Move Down"
                                @click="store.moveSectionDown(templateId, section.key)"
                            >
                                <ChevronDown class="w-4 h-4" />
                            </button>
                            <button 
                                class="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500 hover:text-slate-700" 
                                title="Toggle Visibility"
                                @click="store.toggleSectionVisibility(templateId, section.key)"
                            >
                                <Eye v-if="section.isVisible !== false" class="w-4 h-4" />
                                <EyeOff v-else class="w-4 h-4" />
                            </button>
                            <button 
                                class="p-1.5 hover:bg-slate-100 rounded transition-colors text-slate-500 hover:text-slate-700" 
                                title="Copy to Page"
                                @click="openCopyModal(section.key)"
                            >
                                <Copy class="w-4 h-4" />
                            </button>
                            <button 
                                class="p-1.5 hover:bg-red-50 rounded transition-colors text-red-300 hover:text-red-500" 
                                title="Delete"
                                @click="store.deleteSection(templateId, section.key)"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>

                        <!-- Canvas Konva -->
                        <!-- If section is hidden, we might want to hide it or dim it? -->
                        <!-- Requirements say "Unified Section Preview". Usually hidden means not in final, maybe just opacity reduced here? Or hidden? -->
                        <!-- Assuming we still show it in editor but maybe marked 'Hidden' or just hide it? 
                             Usually Editor shows everything or has 'Preview Mode'. 
                             Let's show it with opacity if hidden for now to allow editing hidden sections? 
                             Or strictly hide?
                             Given 'Toggle Visibility' usually means "active in production", better to clearly visualize it's hidden. 
                             Let's add opacity-50 if hidden. -->
                        <div :class="{'opacity-40 grayscale': section.isVisible === false}" class="transition-all duration-300">
                             <KonvaCanvas 
                                :section-type="section.key"
                                :elements="getSectionData(section.key).elements || []"
                                :selected-element-id="activeSection === section.key ? store.selectedElementId : null"
                                :background-color="getSectionData(section.key).backgroundColor"
                                :background-url="getSectionData(section.key).backgroundUrl"
                                :overlay-opacity="getSectionData(section.key).overlayOpacity"
                                @elementSelect="(id) => { activeSection = section.key; handleElementSelect(id); }"
                                @elementDragEnd="handleElementDragEnd"
                                @elementTransformEnd="handleElementTransformEnd"
                            />
                        </div>
                    </div>
                </div>
            </main>


            <!-- Sidebar Right (Properties) -->
            <aside class="w-80 border-l bg-white flex flex-col z-10">
                 <div class="p-4 border-b">
                     <h3 class="font-semibold text-slate-800">Properties</h3>
                 </div>
                <div class="flex-1 overflow-y-auto p-4">
                    <PropertyPanel 
                        :active-section="currentSectionData" 
                        :active-section-type="activeSection" 
                    />
                </div>
            </aside>
        </div>
    </div>

    <!-- Copy to Section Modal -->
    <Teleport to="body">
        <div v-if="showCopyModal" class="fixed inset-0 z-50 flex items-center justify-center">
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-black/50" @click="closeCopyModal"></div>
            
            <!-- Modal Content -->
            <div class="relative bg-white rounded-xl shadow-2xl w-80 max-h-[70vh] overflow-hidden z-10">
                <div class="p-4 border-b">
                    <h3 class="font-semibold text-slate-800">Copy Elements to Page</h3>
                    <p class="text-xs text-slate-500 mt-1">Select target page</p>
                </div>
                <div class="p-2 max-h-60 overflow-y-auto">
                    <button
                        v-for="section in orderedSections"
                        :key="section.key"
                        class="w-full text-left px-3 py-2 rounded-lg hover:bg-teal-50 hover:text-teal-700 transition-colors flex items-center gap-2"
                        :class="{
                            'opacity-50 cursor-not-allowed': section.key === copySourceSection,
                            'text-slate-600': section.key !== copySourceSection
                        }"
                        :disabled="section.key === copySourceSection"
                        @click="handleCopyToSection(section.key)"
                    >
                        <span class="text-sm">{{ section.title }}</span>
                        <span v-if="section.key === copySourceSection" class="text-xs text-slate-400">(source)</span>
                    </button>
                </div>
                <div class="p-3 border-t bg-slate-50">
                    <button 
                        class="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        @click="closeCopyModal"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
