<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTemplateStore } from '@/stores/template';
import { PREDEFINED_SECTION_TYPES, type SectionDesign, type InvitationCategory } from '@/lib/types';
import { invitationsApi } from '@/lib/api/invitations';
import { DEFAULT_ZOOM_CONFIG } from '@/lib/constants';
import KonvaCanvas from '@/components/editor/KonvaCanvas.vue';
import PropertyPanel from '@/components/editor/PropertyPanel.vue';
import ParticleOverlay from '@/components/effects/ParticleOverlay.vue';
import AddElementPanel from '@/components/editor/AddElementPanel.vue';
import Button from '@/components/ui/Button.vue';
import * as CloudflareAPI from '@/services/cloudflare-api';
import { ArrowLeft, Save, Undo, Redo, Layers, ChevronUp, ChevronDown, Eye, EyeOff, Copy, Trash2, Pencil, Plus, Check, Upload, User, Settings, Link2, Tag, Loader2, AlertCircle } from 'lucide-vue-next';

const route = useRoute();
const store = useTemplateStore();

const templateId = computed(() => route.params.id as string);
const activeSection = ref<string>(''); // Will be set to first section on load

// Editable template name/slug
const isEditingName = ref(false);
const editableName = ref('');

// Toast notification
const showToast = ref(false);
const toastMessage = ref('');
const toastVariant = ref<'default' | 'success' | 'destructive'>('success');

// Saving state
const isSaving = ref(false);
const lastSavedAt = ref<Date | null>(null);

// Template Settings: Slug & Category
const showTemplateSettings = ref(false);
const templateSlug = ref('');
const templateCategory = ref<InvitationCategory>('wedding');
const slugChecking = ref(false);
const slugError = ref<string | null>(null);
const slugSuccess = ref(false);
const savingSettings = ref(false);

const categoryOptions: { value: InvitationCategory; label: string }[] = [
    { value: 'wedding', label: 'Pernikahan' },
    { value: 'kids', label: 'Anak & Balita' },
    { value: 'birthday', label: 'Ulang Tahun' },
    { value: 'aqiqah', label: 'Aqiqah' },
    { value: 'tasmiyah', label: 'Tasmiyah' },
    { value: 'khitan', label: 'Khitan' },
    { value: 'umum', label: 'Umum' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'christmas', label: 'Natal' },
    { value: 'newyear', label: 'Tahun Baru' },
    { value: 'syukuran', label: 'Syukuran' },
    { value: 'islami', label: 'Islami' },
    { value: 'party', label: 'Pesta' },
    { value: 'dinner', label: 'Makan Malam' },
    { value: 'school', label: 'Sekolah' },
    { value: 'graduation', label: 'Wisuda' },
    { value: 'other', label: 'Lainnya' },
];

let slugCheckTimeout: ReturnType<typeof setTimeout> | null = null;

const checkSlug = async () => {
    if (!templateSlug.value || templateSlug.value.length < 3) {
        slugError.value = templateSlug.value.length > 0 ? 'Minimal 3 karakter' : null;
        slugSuccess.value = false;
        return;
    }
    
    const cleanSlug = templateSlug.value.toLowerCase().replace(/\s+/g, '-');
    const slugFormat = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    
    if (!slugFormat.test(cleanSlug)) {
        slugError.value = 'Huruf kecil, angka, dan tanda hubung saja';
        slugSuccess.value = false;
        return;
    }

    // Skip check if slug is same as current
    if (cleanSlug === currentTemplate.value?.slug) {
        slugSuccess.value = true;
        slugError.value = null;
        return;
    }
    
    slugChecking.value = true;
    slugError.value = null;
    
    try {
        const result = await invitationsApi.checkSlug(cleanSlug);
        if (result.available) {
            slugSuccess.value = true;
            templateSlug.value = cleanSlug;
        } else {
            slugError.value = result.message;
            slugSuccess.value = false;
        }
    } catch {
        slugError.value = 'Gagal memeriksa';
    } finally {
        slugChecking.value = false;
    }
};

watch(templateSlug, () => {
    slugSuccess.value = false;
    slugError.value = null;
    if (slugCheckTimeout) clearTimeout(slugCheckTimeout);
    slugCheckTimeout = setTimeout(() => {
        if (templateSlug.value.length >= 3) checkSlug();
    }, 500);
});

const saveTemplateSettings = async () => {
    if (!templateId.value || !currentTemplate.value) return;
    if (templateSlug.value && templateSlug.value.length >= 3 && !slugSuccess.value && !slugChecking.value) {
        await checkSlug();
        if (!slugSuccess.value) return;
    }
    
    savingSettings.value = true;
    try {
        await CloudflareAPI.updateTemplate(templateId.value, {
            slug: templateSlug.value || null,
            category: templateCategory.value
        });
        showSaveToast('Pengaturan template disimpan', 'success');
        await store.fetchTemplate(templateId.value, true);
    } catch (e: any) {
        showSaveToast(e.message || 'Gagal menyimpan', 'destructive');
    } finally {
        savingSettings.value = false;
    }
};

const showSaveToast = (message: string, variant: 'default' | 'success' | 'destructive' = 'success') => {
    toastMessage.value = message;
    toastVariant.value = variant;
    showToast.value = true;
    setTimeout(() => showToast.value = false, 3000);
};

const handleSave = async () => {
    if (!currentTemplate.value || isSaving.value) return;
    
    isSaving.value = true;
    try {
        // Update template name if edited
        const updates: any = {};
        if (editableName.value && editableName.value !== currentTemplate.value.name) {
            updates.name = editableName.value;
            currentTemplate.value.name = editableName.value;
        }
        
        if (Object.keys(updates).length > 0) {
            await CloudflareAPI.updateTemplate(templateId.value, updates);
        }
        
        // MANUAL SAVE: Batch save all dirty elements and sections
        const result = await store.saveAllChanges(templateId.value);
        
        lastSavedAt.value = new Date();
        if (result.saved > 0) {
            showSaveToast(`Berhasil menyimpan ${result.saved} perubahan!`, 'success');
        } else {
            showSaveToast('Template tersimpan!', 'success');
        }
    } catch (error) {
        console.error('Save failed:', error);
        showSaveToast('Gagal menyimpan template', 'destructive');
    } finally {
        isSaving.value = false;
    }
};

// Publish handling
const isPublishing = ref(false);
const isPublished = computed(() => currentTemplate.value?.status === 'published');
const isPreviewUser = ref(false);

const handlePublish = async () => {
    if (!currentTemplate.value?.id || isPublishing.value) return;
    
    isPublishing.value = true;
    try {
        const newStatus = isPublished.value ? 'draft' : 'published';
        // Call API via store or directly if store doesn't have it (store usually has updateTemplate)
        await store.updateTemplate(currentTemplate.value.id, { status: newStatus });
        currentTemplate.value.status = newStatus; // Update local state
        showSaveToast(
            newStatus === 'published' ? 'Template berhasil dipublish!' : 'Template dikembalikan ke draft',
            'success'
        );
    } catch (error) {
        console.error('Publish failed:', error);
        showSaveToast('Gagal mengubah status template', 'destructive');
    } finally {
        isPublishing.value = false;
    }
};

const togglePreviewUser = () => {
    isPreviewUser.value = !isPreviewUser.value;
};

const startEditName = () => {
    editableName.value = currentTemplate.value?.name || '';
    isEditingName.value = true;
};

const saveTemplateName = async () => {
    isEditingName.value = false;
    if (editableName.value && currentTemplate.value && editableName.value !== currentTemplate.value.name) {
        try {
            await CloudflareAPI.updateTemplate(templateId.value, { name: editableName.value });
            currentTemplate.value.name = editableName.value;
            showSaveToast('Nama template diperbarui', 'success');
        } catch (error) {
            console.error('Failed to update name:', error);
        }
    }
};

const formattedLastSaved = computed(() => {
    if (!lastSavedAt.value) return 'Not saved yet';
    const now = new Date();
    const diff = now.getTime() - lastSavedAt.value.getTime();
    if (diff < 60000) return 'Saved just now';
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)} min ago`;
    return `Saved ${lastSavedAt.value.toLocaleTimeString()}`;
});

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
        
        // Initialize template slug/category from fetched data
        if (t) {
            templateSlug.value = t.slug || '';
            templateCategory.value = (t.category as InvitationCategory) || 'wedding';
            if (t.slug) slugSuccess.value = true; // Existing slug is valid
        }
        
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
            const first = orderedSections.value[0];
            if (first) {
                activeSection.value = first.key;
            }
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

const fallbackSection: SectionDesign = { animation: 'none', elements: [] };

const currentSectionData = computed(() => 
    currentTemplate.value?.sections[activeSection.value] || fallbackSection
);

// Helper to get section data by type
const getSectionData = (sectionType: string) => {
    return currentTemplate.value?.sections[sectionType] || fallbackSection;
};

const handleElementSelect = (id: string | null) => {
    store.setSelectedElement(id);
};

const handleElementDrag = (sectionKey: string, id: string, pos: { x: number, y: number }) => {
    // Update local state immediately for smoothness (Optimistic/Skip DB)
    store.updateElement(templateId.value, sectionKey, id, { position: pos }, { skipDb: true });
};

const handleElementDragEnd = async (sectionKey: string, id: string, pos: { x: number, y: number }) => {
    await store.updateElement(templateId.value, sectionKey, id, { position: pos });
};

const handleElementTransformEnd = async (sectionKey: string, id: string, props: { x: number, y: number, width: number, height: number, rotation: number }) => {
    console.log('[EditorView] handleElementTransformEnd received:', { sectionKey, id, props });
    const { x, y, width, height, rotation } = props;
    await store.updateElement(templateId.value, sectionKey, id, { 
        position: { x, y },
        size: { width, height },
        rotation
    });
    console.log('[EditorView] store.updateElement called successfully');
};

const handleSectionZoomUpdate = async (sectionKey: string, updates: any) => {
    const currentZoom = getSectionData(sectionKey).zoomConfig || DEFAULT_ZOOM_CONFIG;
    
    // Handle pointIndex - update specific point in points array
    if (typeof updates.pointIndex === 'number' && updates.targetRegion) {
        const points = [...(currentZoom.points || [])];
        const idx = updates.pointIndex;
        
        const point = points[idx];
        if (idx >= 0 && idx < points.length && point) {
            points[idx] = {
                ...point,
                targetRegion: {
                    ...point.targetRegion,
                    ...updates.targetRegion
                }
            };
            
            await store.updateSection(templateId.value, sectionKey, {
                zoomConfig: { ...currentZoom, points }
            }, { skipRefetch: true });
        }
        return;
    }
    
    // Handle selectedPointIndex update (when clicking a zoom box to select it)
    if (typeof updates.selectedPointIndex === 'number') {
        await store.updateSection(templateId.value, sectionKey, {
            zoomConfig: { ...currentZoom, selectedPointIndex: updates.selectedPointIndex }
        }, { skipRefetch: true });
        return;
    }
    
    // Legacy: Skip refetch for drag/resize operations (only targetRegion updates) to prevent box reset
    const isPositionOnlyUpdate = updates.targetRegion && Object.keys(updates).length === 1;
    
    await store.updateSection(templateId.value, sectionKey, {
        zoomConfig: {
            ...currentZoom,
            ...updates
        }
    }, { skipRefetch: isPositionOnlyUpdate });
};
</script>

<template>
    <div class="h-screen flex flex-col bg-slate-50">
        <!-- Toolbar -->
        <header class="h-16 border-b flex items-center justify-between px-6 bg-white z-20 shadow-sm">
             <div class="flex items-center gap-4">
                 <Button variant="ghost" size="icon" @click="$router.push({ name: 'admin' })">
                     <ArrowLeft class="w-5 h-5" />
                 </Button>
                 <div>
                    <!-- Editable Template Name -->
                    <div class="flex items-center gap-2">
                        <input 
                            v-if="isEditingName"
                            v-model="editableName"
                            class="font-bold text-lg text-slate-800 bg-transparent border-b-2 border-teal-500 outline-none px-1"
                            @blur="saveTemplateName"
                            @keyup.enter="saveTemplateName"
                            autofocus
                        />
                        <h1 v-else class="font-bold text-lg text-slate-800 cursor-pointer hover:text-teal-600" @click="startEditName">
                            {{ currentTemplate?.name || 'Loading...' }}
                        </h1>
                        <button v-if="!isEditingName" class="p-1 hover:bg-slate-100 rounded" @click="startEditName">
                            <Pencil class="w-3 h-3 text-slate-400" />
                        </button>
                    </div>
                    <p class="text-xs text-slate-500">{{ formattedLastSaved }}</p>
                 </div>
             </div>
             
            <div class="flex items-center gap-2">
                <Button variant="ghost" size="icon"><Undo class="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon"><Redo class="w-4 h-4" /></Button>
                <div class="w-px h-6 bg-slate-200 mx-2"></div>
                <!-- Preview as User Toggle -->
                <button
                    class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                    :class="isPreviewUser ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                    @click="togglePreviewUser"
                    title="Toggle User Preview Mode"
                >
                    <User class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ isPreviewUser ? 'User Mode' : 'Admin Mode' }}</span>
                </button>
                <!-- Preview Button -->
                <Button 
                    variant="outline"
                    class="flex items-center gap-2"
                    @click="$router.push({ name: 'admin-preview', params: { id: templateId } })"
                >
                    <Eye class="w-4 h-4" />
                    Preview
                </Button>

                <!-- Publish Button -->
                <Button 
                    :class="isPublished 
                        ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white' 
                        : 'bg-green-600 hover:bg-green-700 border-green-700 text-white'"
                    class="flex items-center gap-2"
                    @click="handlePublish" 
                    :disabled="isPublishing"
                >
                    <Upload v-if="!isPublishing && !isPublished" class="w-4 h-4" />
                    <Check v-if="!isPublishing && isPublished" class="w-4 h-4" />
                    <span v-if="isPublishing" class="animate-spin">⏳</span>
                    {{ isPublishing ? 'Processing...' : (isPublished ? 'Unpublish' : 'Publish') }}
                </Button>
                <!-- Save Button with Unsaved Changes Indicator -->
                <Button 
                    :variant="store.isDirty ? 'primary' : 'ghost'" 
                    :class="[
                        'flex items-center gap-2 relative',
                        store.isDirty ? 'bg-teal-600 text-white hover:bg-teal-700' : 'hover:bg-slate-100'
                    ]"
                    @click="handleSave" 
                    :disabled="isSaving"
                >
                    <Save v-if="!isSaving" class="w-4 h-4" />
                    <span v-if="isSaving" class="animate-spin">⏳</span>
                    {{ isSaving ? 'Saving...' : (store.isDirty ? 'Save*' : 'Save') }}
                    <!-- Unsaved indicator dot -->
                    <span v-if="store.isDirty && !isSaving" class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </Button>
            </div>
        </header>

        <div class="flex-1 flex overflow-hidden">
             <!-- Sidebar Left (Sections & Add) -->
            <aside class="w-64 border-r bg-white flex flex-col z-10">
                <!-- Template Settings (Collapsible) -->
                <div class="border-b">
                    <button 
                        class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        @click="showTemplateSettings = !showTemplateSettings"
                    >
                        <div class="flex items-center gap-2 text-slate-600">
                            <Settings class="w-4 h-4" />
                            <span class="text-xs font-bold uppercase tracking-wider">Pengaturan</span>
                        </div>
                        <ChevronDown 
                            class="w-4 h-4 text-slate-400 transition-transform" 
                            :class="{ 'rotate-180': showTemplateSettings }"
                        />
                    </button>
                    
                    <!-- Settings Content (Collapsible) -->
                    <div v-if="showTemplateSettings" class="px-4 pb-4 space-y-4 border-t bg-slate-50">
                        <!-- Slug Input -->
                        <div class="pt-3">
                            <label class="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5">
                                <Link2 class="w-3 h-3" />
                                Slug / Link
                            </label>
                            <div class="relative">
                                <input 
                                    v-model="templateSlug"
                                    type="text"
                                    placeholder="nama-template"
                                    :class="[
                                        'w-full px-3 py-2 text-sm border rounded-lg pr-8 transition-colors',
                                        slugError ? 'border-red-300 focus:border-red-500' :
                                        slugSuccess ? 'border-green-300 focus:border-green-500' :
                                        'border-slate-200 focus:border-teal-500'
                                    ]"
                                />
                                <div class="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    <Loader2 v-if="slugChecking" class="w-4 h-4 text-slate-400 animate-spin" />
                                    <Check v-else-if="slugSuccess" class="w-4 h-4 text-green-500" />
                                    <AlertCircle v-else-if="slugError" class="w-4 h-4 text-red-500" />
                                </div>
                            </div>
                            <p v-if="slugError" class="text-xs text-red-500 mt-1">{{ slugError }}</p>
                            <p v-else-if="slugSuccess" class="text-xs text-green-600 mt-1">✓ Tersedia</p>
                            <p v-else class="text-xs text-slate-400 mt-1">tamuu.pages.dev/{{ templateSlug || '...' }}</p>
                        </div>
                        
                        <!-- Category Dropdown -->
                        <div>
                            <label class="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1.5">
                                <Tag class="w-3 h-3" />
                                Kategori
                            </label>
                            <select 
                                v-model="templateCategory"
                                class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 transition-colors"
                            >
                                <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                                    {{ opt.label }}
                                </option>
                            </select>
                        </div>
                        
                        <!-- Save Settings Button -->
                        <Button 
                            variant="primary"
                            size="sm"
                            class="w-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2"
                            @click="saveTemplateSettings"
                            :disabled="savingSettings || (templateSlug.length >= 3 && !slugSuccess && !slugChecking)"
                        >
                            <Loader2 v-if="savingSettings" class="w-4 h-4 animate-spin" />
                            <Save v-else class="w-4 h-4" />
                            {{ savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan' }}
                        </Button>
                    </div>
                </div>
                
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
                        <div 
                            :class="{
                                'opacity-40 grayscale': section.isVisible === false,
                                'ken-burns': getSectionData(section.key).kenBurnsEnabled
                            }" 
                            class="transition-all duration-300 relative overflow-hidden"
                        >
                             <KonvaCanvas 
                                :section-type="section.key"
                                :elements="getSectionData(section.key).elements || []"
                                :selected-element-id="activeSection === section.key ? store.selectedElementId : null"
                                :background-color="getSectionData(section.key).backgroundColor"
                                :background-url="getSectionData(section.key).backgroundUrl"
                                :overlay-opacity="getSectionData(section.key).overlayOpacity"
                                :particle-type="getSectionData(section.key).particleType"
                                :ken-burns-enabled="getSectionData(section.key).kenBurnsEnabled"
                                :zoom-config="getSectionData(section.key).zoomConfig"
                                :is-active-section="activeSection === section.key"
                                @elementSelect="(id) => { activeSection = section.key; handleElementSelect(id); }"
                                @elementDrag="(id, pos) => handleElementDrag(section.key, id, pos)"
                                @elementDragEnd="(id, pos) => handleElementDragEnd(section.key, id, pos)"
                                @elementTransformEnd="(id, props) => handleElementTransformEnd(section.key, id, props)"
                                @sectionZoomUpdate="(updates) => handleSectionZoomUpdate(section.key, updates)"
                             />

                             <!-- Particle Overlay -->
                             <ParticleOverlay 
                                v-if="getSectionData(section.key).particleType && getSectionData(section.key).particleType !== 'none'"
                                :type="getSectionData(section.key).particleType!" 
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

        <!-- Modals -->
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

    <!-- Toast Notification -->
    <Teleport to="body">
        <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="translate-y-4 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-4 opacity-0"
        >
            <div v-if="showToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div 
                    class="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border"
                    :class="{
                        'bg-green-50 border-green-200 text-green-800': toastVariant === 'success',
                        'bg-red-50 border-red-200 text-red-800': toastVariant === 'destructive',
                        'bg-white border-slate-200 text-slate-800': toastVariant === 'default'
                    }"
                >
                    <Check v-if="toastVariant === 'success'" class="w-5 h-5 text-green-600" />
                    <span class="font-medium">{{ toastMessage }}</span>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

