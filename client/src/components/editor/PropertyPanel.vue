<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTemplateStore } from '@/stores/template';
import { type TemplateElement, type SectionDesign, type CountdownConfig, type RSVPFormConfig, type IconStyle, type ElementStyle } from '@/lib/types';
import { iconPaths } from '@/lib/icon-paths';
import { uploadFile } from '@/services/cloudflare-api';
import * as CloudflareAPI from '@/services/cloudflare-api';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Button from '@/components/ui/Button.vue';
import { 
    Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
    FlipHorizontal2, FlipVertical2,
    AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    Upload, Image as ImageIcon, Copy
} from 'lucide-vue-next';

interface Props {
    activeSection?: SectionDesign;
    activeSectionType?: string;
}

const props = defineProps<Props>();
const store = useTemplateStore();

// Currently selected element data
const selectedElement = computed(() => {
    if (!store.selectedElementId || !store.activeTemplateId) return null;
    const template = store.templates.find(t => t.id === store.activeTemplateId);
    if (!template) return null;
    
    for (const [sectionKey, section] of Object.entries(template.sections)) {
        const el = section.elements.find(e => e.id === store.selectedElementId);
        if (el) return { element: el, sectionType: sectionKey };
    }
    return null;
});

const element = computed(() => selectedElement.value?.element);
const currentSection = computed(() => props.activeSection);

const elementAnimation = computed({
    get: () => element.value?.animation || 'none',
    set: (val: any) => handleUpdate({ animation: val })
});

const elementAnimationTrigger = computed({
    get: () => element.value?.animationTrigger || 'scroll',
    set: (val: any) => handleUpdate({ animationTrigger: val })
});

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';

// Canvas constants for alignment imported from constants


// All elements in current section for elements list
const currentSectionElements = computed(() => {
    if (!props.activeSection) return [];
    return props.activeSection.elements || [];
});

// Update element handler
const handleUpdate = (updates: Partial<TemplateElement>) => {
    if (selectedElement.value && store.activeTemplateId) {
        store.updateElement(
            store.activeTemplateId, 
            selectedElement.value.sectionType, 
            selectedElement.value.element.id,
            updates
        );
    }
};

// Section update handler - updates local state AND persists to DB
const handleSectionUpdate = async (updates: Partial<SectionDesign>) => {
    if (props.activeSectionType && store.activeTemplateId) {
        const template = store.templates.find(t => t.id === store.activeTemplateId);
        if (template && template.sections[props.activeSectionType]) {
            // Optimistic local update
            Object.assign(template.sections[props.activeSectionType], updates);
            
            // Persist to database
            try {
                await CloudflareAPI.updateSection(store.activeTemplateId, props.activeSectionType, updates);
            } catch (error) {
                console.error('Failed to persist section update:', error);
            }
        }
    }
};

// Image upload handler
const fileInputRef = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);

const triggerImageUpload = () => {
    fileInputRef.value?.click();
};

const handleImageUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    isUploading.value = true;
    try {
        const result = await uploadFile(file);
        if (result.url) {
            // Create image to get natural dimensions
            const img = new Image();
            img.onload = () => {
                const maxWidth = 500; // CANVAS_WIDTH
                let newWidth = img.naturalWidth;
                let newHeight = img.naturalHeight;

                // Scale down if too wide
                if (newWidth > maxWidth) {
                    const ratio = maxWidth / newWidth;
                    newWidth = maxWidth;
                    newHeight = Math.round(newHeight * ratio);
                } else if (newWidth < 100) {
                     // Scale up if too tiny? Optional.
                     // For now just keep natural if small, or maybe min-width logic.
                }

                handleUpdate({ 
                    imageUrl: result.url,
                    size: { width: newWidth, height: newHeight }
                });
            };
            img.src = result.url;
        }
    } catch (error) {
        console.error('Upload failed:', error);
    } finally {
        isUploading.value = false;
        // Reset input
        if (input) input.value = '';
    }
};

// Background image upload handler for sections
const bgFileInputRef = ref<HTMLInputElement | null>(null);
const isUploadingBg = ref(false);

const triggerBgImageUpload = () => {
    bgFileInputRef.value?.click();
};

const handleBgImageUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    isUploadingBg.value = true;
    try {
        const result = await uploadFile(file);
        if (result.url) {
            handleSectionUpdate({ backgroundUrl: result.url });
        }
    } catch (error) {
        console.error('Background upload failed:', error);
    } finally {
        isUploadingBg.value = false;
        if (input) input.value = '';
    }
};

// Delete element
const handleDelete = () => {
    if (selectedElement.value && store.activeTemplateId) {
        store.deleteElement(store.activeTemplateId, selectedElement.value.sectionType, selectedElement.value.element.id);
    }
};

// Alignment handlers
const handleAlignment = (align: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
    if (!element.value) return;
    const el = element.value;
    let newX = el.position.x;
    let newY = el.position.y;
    
    switch (align) {
        case 'left': newX = 0; break;
        case 'center-h': newX = (CANVAS_WIDTH - el.size.width) / 2; break;
        case 'right': newX = CANVAS_WIDTH - el.size.width; break;
        case 'top': newY = 0; break;
        case 'center-v': newY = (CANVAS_HEIGHT - el.size.height) / 2; break;
        case 'bottom': newY = CANVAS_HEIGHT - el.size.height; break;
    }
    handleUpdate({ position: { x: newX, y: newY } });
};

// Layer handlers
const handleLayer = (action: 'front' | 'up' | 'down' | 'back') => {
    if (!element.value) return;
    const currentZ = element.value.zIndex || 1;
    let newZ = currentZ;
    
    switch (action) {
        case 'front': newZ = 999; break;
        case 'up': newZ = currentZ + 1; break;
        case 'down': newZ = Math.max(1, currentZ - 1); break;
        case 'back': newZ = 1; break;
    }
    handleUpdate({ zIndex: newZ });
};

// Countdown config update helper
const updateCountdownConfig = (updates: Partial<CountdownConfig>) => {
    if (!element.value) return;
    const current = element.value.countdownConfig || {
        targetDate: new Date().toISOString(),
        style: 'elegant' as const,
        showDays: true, showHours: true, showMinutes: true, showSeconds: true,
        backgroundColor: '#ffffff', textColor: '#000000', accentColor: '#b8860b', labelColor: '#666666', digitColor: '#000000',
        fontFamily: 'Inter', fontSize: 24,
        showLabels: true, labels: { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' }
    };
    handleUpdate({ countdownConfig: { ...current, ...updates } });
};

// RSVP config update helper
const updateRSVPConfig = (updates: Partial<RSVPFormConfig>) => {
    if (!element.value) return;
    const current = element.value.rsvpFormConfig || {
        backgroundColor: '#ffffff', textColor: '#000000', buttonColor: '#b8860b', buttonTextColor: '#ffffff',
        borderColor: '#e5e5e5', title: 'RSVP Form', showNameField: true, showEmailField: true, showPhoneField: true,
        showMessageField: true, showAttendanceField: true, nameLabel: 'Nama', emailLabel: 'Email',
        phoneLabel: 'Telepon', messageLabel: 'Pesan', attendanceLabel: 'Kehadiran',
        submitButtonText: 'Kirim Ucapan', successMessage: 'Terima kasih!'
    };
    handleUpdate({ rsvpFormConfig: { ...current, ...updates } });
};

// Icon config update helper
const updateIconStyle = (updates: Partial<IconStyle>) => {
    if (!element.value) return;
    const current = element.value.iconStyle || { iconName: 'instagram', iconColor: '#b8860b', iconSize: 48 };
    handleUpdate({ iconStyle: { ...current, ...updates } });
};

// Define extended icon lists
const extendedSocialIcons = [
    'instagram', 'facebook', 'twitter', 'youtube', 'linkedin', 'tiktok', 'whatsapp', 'telegram', 
    'message-circle', 'send', 'share-2', 'globe', 'link', 'external-link', 'mail', 'at-sign',
    'discord', 'snapchat', 'pinterest', 'wechat', 'line'
];

const extendedContactIcons = [
    'phone', 'phone-call', 'smartphone', 'map-pin', 'clock', 'calendar',
    'home', 'user', 'users', 'briefcase', 'building', 'credit-card', 'gift'
];

const extendedWeddingIcons = [
    'heart', 'heart-outline', 'heart-handshake', 'rings', 'church', 'cake', 'music', 'camera', 'video',
    'mic', 'speaker', 'flower', 'leaf', 'star', 'sparkles', 'sun', 'moon', 'cloud', 'umbrella',
    'anchor', 'compass', 'key', 'bell', 'award', 'bookmark', 'coffee', 'wine', 'utensils'
];

const extendedUiIcons = [
    'check', 'x', 'menu', 'search', 'shopping-cart', 'settings', 'plus', 'minus', 
    'info', 'alert-circle', 'help-circle', 'edit', 'trash', 'save', 'upload', 'download',
    'chevron-right', 'chevron-left', 'arrow-right', 'arrow-left', 'play', 'pause',
    'circle', 'square', 'triangle', 'hexagon', 'shield'
];

const styleOptions: ElementStyle[] = [
    'classic', 'minimal', 'modern', 'elegant', 'rustic', 
    'romantic', 'bold', 'vintage', 'boho', 'luxury', 
    'dark', 'glass', 'outline', 'geometric', 'floral', 
    'pastel', 'monochrome', 'neon', 'brutalist', 'cloud'
];

// Font options
const fontFamilies = [
    'Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans',
    'Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville',
    'Dancing Script', 'Great Vibes', 'Satisfy', 'Pacifico', 'Caveat',
    'Sacramento', 'Allura', 'Italianno', 'Tangerine', 'Alex Brush',
    'Amatic SC', 'Clicker Script', 'Cookie', 'Covered By Your Grace', 'Croissant One',
    'Euphoria Script', 'Gloria Hallelujah', 'Indie Flower', 'Kalam', 'Lavishly Yours',
    'Marck Script', 'Meddon', 'Mr De Haviland', 'Niconne', 'Patrick Hand',
    'Permanent Marker', 'Petit Formal Script', 'Pinyon Script', 'Qwigley',
    'Rock Salt', 'Rouge Script', 'Shadows Into Light', 'Yellowtail', 'Yesteryear',
    'Cinzel', 'Bodoni Moda', 'Mrs Saint Delafield', 'Italiana'
];
const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 80, 96];

// Element type icons
const getElementIcon = (type: string) => {
    switch(type) {
        case 'text': return 'T';
        case 'image': return '🖼';
        case 'icon': return '♡';
        case 'countdown': return '⏱';
        case 'rsvp-form': case 'rsvp_form': return '📝';
        case 'guest_wishes': return '💬';
        case 'open_invitation_button': case 'button': return '🔘';
        default: return '⬜';
    }
};

// Copy to Section Logic
const targetSectionForCopy = ref('');
const availableSectionsForCopy = computed(() => {
    if (!store.activeTemplateId) return [];
    const template = store.templates.find(t => t.id === store.activeTemplateId);
    if (!template) return [];

    const sectionsObj = template.sections || {};
    return Object.entries(sectionsObj)
        .map(([key, data]) => ({
            key,
            title: data.title || key.charAt(0).toUpperCase() + key.slice(1),
            order: data.order ?? 999
        }))
        .sort((a, b) => a.order - b.order);
});

const handleCopyToSection = async () => {
    if (!targetSectionForCopy.value || !selectedElement.value || !store.activeTemplateId) return;
    
    await store.copyElementToSection(
        store.activeTemplateId,
        selectedElement.value.sectionType, 
        targetSectionForCopy.value,
        selectedElement.value.element.id
    );
    
    // Reset selection
    targetSectionForCopy.value = '';
};

</script>

<template>
    <div class="space-y-4 text-sm">
        <!-- ELEMENTS LIST -->
        <div v-if="currentSectionElements.length > 0" class="space-y-2">
            <Label class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Elements</Label>
            <div class="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-slate-50">
                <div 
                    v-for="el in currentSectionElements" 
                    :key="el.id"
                    class="flex items-center justify-between p-2 rounded cursor-pointer hover:bg-white transition-colors"
                    :class="{ 'bg-white shadow-sm ring-1 ring-blue-200': store.selectedElementId === el.id }"
                    @click="store.setSelectedElement(el.id)"
                >
                    <div class="flex items-center gap-2 truncate flex-1">
                        <span class="text-base">{{ getElementIcon(el.type) }}</span>
                        <span class="truncate text-slate-700">{{ el.name || `New ${el.type}` }}</span>
                    </div>
                    <Button variant="ghost" size="sm" class="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 h-auto" @click.stop="store.deleteElement(store.activeTemplateId!, props.activeSectionType!, el.id)">
                        <Trash2 class="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>

        <!-- ELEMENT PROPERTIES -->
        <div v-if="element" class="space-y-4">
            <div class="border-b pb-3">
                <h3 class="font-semibold text-slate-800">Edit: {{ element.name || element.type }}</h3>
            </div>

            <!-- Name -->
            <div class="space-y-1">
                <Label>Name</Label>
                <Input :model-value="element.name" @update:model-value="val => handleUpdate({ name: val })" />
            </div>

            <!-- Position -->
            <div class="space-y-1">
                <Label class="text-xs text-slate-500">Position</Label>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <span class="text-xs text-slate-400">X</span>
                        <Input type="number" :model-value="Math.round(element.position.x)" @update:model-value="val => handleUpdate({ position: { ...element.position, x: Number(val) } })" />
                    </div>
                    <div>
                        <span class="text-xs text-slate-400">Y</span>
                        <Input type="number" :model-value="Math.round(element.position.y)" @update:model-value="val => handleUpdate({ position: { ...element.position, y: Number(val) } })" />
                    </div>
                </div>
            </div>

            <!-- Size -->
            <div class="space-y-1">
                <Label class="text-xs text-slate-500">Size</Label>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <span class="text-xs text-slate-400">W</span>
                        <Input type="number" :model-value="Math.round(element.size.width)" @update:model-value="val => handleUpdate({ size: { ...element.size, width: Number(val) } })" />
                    </div>
                    <div>
                        <span class="text-xs text-slate-400">H</span>
                        <Input type="number" :model-value="Math.round(element.size.height)" @update:model-value="val => handleUpdate({ size: { ...element.size, height: Number(val) } })" />
                    </div>
                </div>
            </div>

            <!-- Page Alignment -->
            <div class="space-y-1">
                <Label class="text-xs text-slate-500">Page Alignment</Label>
                <div class="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" @click="handleAlignment('left')" title="Align Left"><AlignLeft class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleAlignment('center-h')" title="Center H"><AlignCenter class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleAlignment('right')" title="Align Right"><AlignRight class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleAlignment('top')" title="Align Top"><AlignStartVertical class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleAlignment('center-v')" title="Center V"><AlignCenterVertical class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleAlignment('bottom')" title="Align Bottom"><AlignEndVertical class="w-4 h-4" /></Button>
                </div>
            </div>

            <!-- Layer Order -->
            <div class="space-y-1">
                <Label class="text-xs text-slate-500">Layer Order</Label>
                <div class="grid grid-cols-4 gap-1">
                    <Button variant="outline" size="sm" @click="handleLayer('front')" title="Bring to Front"><ChevronsUp class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleLayer('up')" title="Move Up"><ArrowUp class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleLayer('down')" title="Move Down"><ArrowDown class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" @click="handleLayer('back')" title="Send to Back"><ChevronsDown class="w-4 h-4" /></Button>
                </div>
            </div>

            <!-- Animation (Entrance) -->
            <div class="space-y-1">
                <Label class="text-xs text-slate-500">Animation</Label>
                <select 
                    class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                    v-model="elementAnimation"
                >
                    <option value="none">None</option>
                    <option value="fade-in">Fade In</option>
                    <option value="slide-up">Slide Up</option>
                    <option value="slide-down">Slide Down</option>
                    <option value="slide-left">Slide Left</option>
                    <option value="slide-right">Slide Right</option>
                    <option value="slide-out-left">Slide Out Left (Exit)</option>
                    <option value="slide-out-right">Slide Out Right (Exit)</option>
                    <option value="slide-in-left">Slide In Left (Enter)</option>
                    <option value="slide-in-right">Slide In Right (Enter)</option>
                    <option value="blur-in">Blur In</option>
                    <option value="draw-border">Frame Draw</option>
                    <option value="pop-in">Pop In</option>
                    <option value="zoom-in">Zoom In</option>
                    <option value="zoom-out">Zoom Out</option>
                    <option value="flip-x">Flip X</option>
                    <option value="flip-y">Flip Y</option>
                    <option value="bounce">Bounce</option>
                </select>
            </div>

            <!-- Animation Trigger (New Element Level) -->
            <div class="space-y-1">
                <Label class="text-xs text-slate-500">Animation Trigger</Label>
                <select 
                    class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                    v-model="elementAnimationTrigger"
                >
                    <option value="scroll">Scroll (Default)</option>
                    <option value="click">Click Element (Manual)</option>
                    <option value="open_btn">Open Button (After Open)</option>
                </select>
            </div>

            <!-- Transform -->
            <div class="space-y-2">
                <Label class="text-xs text-slate-500">Transform</Label>
                <div class="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        class="flex-1"
                        :class="{ 'bg-blue-50 border-blue-300': element.flipHorizontal }"
                        @click="handleUpdate({ flipHorizontal: !element.flipHorizontal })"
                    >
                        <FlipHorizontal2 class="w-4 h-4 mr-1" /> H
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        class="flex-1"
                        :class="{ 'bg-blue-50 border-blue-300': element.flipVertical }"
                        @click="handleUpdate({ flipVertical: !element.flipVertical })"
                    >
                        <FlipVertical2 class="w-4 h-4 mr-1" /> V
                    </Button>
                </div>
                <div class="flex items-center gap-2">
                    <input 
                        type="range" 
                        min="0" max="360" 
                        :value="element.rotation || 0" 
                        @input="(e: any) => handleUpdate({ rotation: Number(e.target.value) })"
                        class="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <Input type="number" :model-value="element.rotation || 0" @update:model-value="val => handleUpdate({ rotation: Number(val) })" class="w-16 text-center" />
                </div>
            </div>

            <!-- Animation Speed/Duration/Delay -->
            <div class="space-y-2">
                <Label class="text-xs text-slate-500">Animation Timing</Label>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <span class="text-xs text-slate-400">Speed (ms)</span>
                        <Input type="number" :model-value="element.animationSpeed || 500" @update:model-value="val => handleUpdate({ animationSpeed: Number(val) })" />
                    </div>
                    <div>
                        <span class="text-xs text-slate-400">Duration (ms)</span>
                        <Input type="number" :model-value="element.animationDuration || 1000" @update:model-value="val => handleUpdate({ animationDuration: Number(val) })" />
                    </div>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Delay (ms)</span>
                    <Input type="number" :model-value="element.animationDelay || 0" @update:model-value="val => handleUpdate({ animationDelay: Number(val) })" />
                </div>
            </div>

            <!-- Loop Animation -->
            <div class="space-y-1">
                <Label class="text-xs text-slate-500">Loop Animation (Continuous)</Label>
                <select 
                    class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                    :value="element.loopAnimation || 'none'"
                    @change="(e: any) => handleUpdate({ loopAnimation: e.target.value })"
                >
                    <option value="none">None</option>
                    <option value="pulse">Pulse</option>
                    <option value="float">Float</option>
                    <option value="sway">Sway</option>
                    <option value="spin">Spin</option>
                    <option value="shake">Shake</option>
                    <option value="glow">Glow</option>
                    <option value="heartbeat">Heartbeat</option>
                </select>
                <p class="text-xs text-slate-400">Combines with entrance animation above</p>
            </div>

            <!-- ============ TYPE-SPECIFIC SETTINGS ============ -->

            <!-- IMAGE SETTINGS -->
            <div v-if="element.type === 'image'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Image</Label>
                <input type="file" ref="fileInputRef" class="hidden" accept="image/*" @change="handleImageUpload" />
                <Button variant="outline" class="w-full justify-center gap-2" @click="triggerImageUpload" :disabled="isUploading">
                    <Upload class="w-4 h-4" /> {{ isUploading ? 'Uploading...' : 'Upload Image' }}
                </Button>
                <Input :model-value="element.imageUrl || ''" @update:model-value="val => handleUpdate({ imageUrl: val })" placeholder="Or paste URL..." />
                <div>
                    <span class="text-xs text-slate-400">Opacity</span>
                    <div class="flex items-center gap-2">
                        <input type="range" min="0" max="1" step="0.05" :value="element.opacity ?? 1" @input="(e: any) => handleUpdate({ opacity: Number(e.target.value) })" class="flex-1 h-2 bg-slate-200 rounded-lg" />
                        <span class="text-xs w-10 text-right">{{ Math.round((element.opacity ?? 1) * 100) }}%</span>
                    </div>
                </div>
            </div>

            <!-- TEXT SETTINGS -->
            <div v-if="element.type === 'text'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Text Settings</Label>
                <div>
                    <span class="text-xs text-slate-400">Content</span>
                    <textarea 
                        class="w-full rounded-md border border-slate-200 p-2 text-sm min-h-[80px] resize-y"
                        :value="element.content || ''" 
                        @input="(e: any) => handleUpdate({ content: e.target.value })"
                        placeholder="Enter your text here"
                    ></textarea>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Font</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.textStyle?.fontFamily || 'Inter'" @change="(e: any) => handleUpdate({ textStyle: { ...element.textStyle!, fontFamily: e.target.value } })">
                        <option v-for="font in fontFamilies" :key="font" :value="font" :style="{ fontFamily: font }">{{ font }}</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Size</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.textStyle?.fontSize || 18" @change="(e: any) => handleUpdate({ textStyle: { ...element.textStyle!, fontSize: Number(e.target.value) } })">
                        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
                    </select>
                </div>
                <div class="flex gap-1">
                    <Button variant="outline" size="sm" :class="{ 'bg-slate-800 text-white': element.textStyle?.fontWeight === 'bold' }" @click="handleUpdate({ textStyle: { ...element.textStyle!, fontWeight: element.textStyle?.fontWeight === 'bold' ? 'normal' : 'bold' } })" class="flex-1 font-bold">B</Button>
                    <Button variant="outline" size="sm" :class="{ 'bg-slate-800 text-white': element.textStyle?.fontStyle === 'italic' }" @click="handleUpdate({ textStyle: { ...element.textStyle!, fontStyle: element.textStyle?.fontStyle === 'italic' ? 'normal' : 'italic' } })" class="flex-1 italic">I</Button>
                    <Button variant="outline" size="sm" :class="{ 'bg-slate-800 text-white': element.textStyle?.textDecoration === 'underline' }" @click="handleUpdate({ textStyle: { ...element.textStyle!, textDecoration: element.textStyle?.textDecoration === 'underline' ? 'none' : 'underline' } })" class="flex-1 underline">U</Button>
                    <Button variant="outline" size="sm" :class="{ 'bg-slate-800 text-white': element.textStyle?.textAlign === 'left' }" @click="handleUpdate({ textStyle: { ...element.textStyle!, textAlign: 'left' } })" class="flex-1"><AlignLeft class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" :class="{ 'bg-slate-800 text-white': element.textStyle?.textAlign === 'center' }" @click="handleUpdate({ textStyle: { ...element.textStyle!, textAlign: 'center' } })" class="flex-1"><AlignCenter class="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" :class="{ 'bg-slate-800 text-white': element.textStyle?.textAlign === 'right' }" @click="handleUpdate({ textStyle: { ...element.textStyle!, textAlign: 'right' } })" class="flex-1"><AlignRight class="w-4 h-4" /></Button>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.textStyle?.color || '#000000'" @input="(e: any) => handleUpdate({ textStyle: { ...element.textStyle!, color: e.target.value } })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.textStyle?.color || '#000000'" @update:model-value="val => handleUpdate({ textStyle: { ...element.textStyle!, color: val } })" class="flex-1" />
                    </div>
                </div>
            </div>

            <!-- COUNTDOWN SETTINGS -->
            <div v-if="element.type === 'countdown'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Countdown Settings</Label>
                <div>
                    <span class="text-xs text-slate-400">Target Date</span>
                    <input 
                        type="datetime-local"
                        class="w-full rounded-md border border-slate-200 p-2 text-sm"
                        :value="element.countdownConfig?.targetDate?.slice(0, 16) || ''"
                        @input="(e: any) => updateCountdownConfig({ targetDate: new Date(e.target.value).toISOString() })"
                    />
                </div>
                <div>
                    <span class="text-xs text-slate-400">Style</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.countdownConfig?.style || 'classic'" @change="(e: any) => updateCountdownConfig({ style: e.target.value })">
                        <option value="classic">Classic</option>
                        <option value="minimal">Minimal</option>
                        <option value="box">Box</option>
                        <option value="circle">Circle</option>
                        <option value="modern">Modern</option>
                        <option value="elegant">Elegant</option>
                        <option value="neon">Neon</option>
                        <option value="sticker">Sticker</option>
                        <option value="tape">Tape</option>
                        <option value="glitch">Glitch</option>
                        <option value="flip">Flip / Split</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Font Family</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.countdownConfig?.fontFamily || 'Inter'" @change="(e: any) => updateCountdownConfig({ fontFamily: e.target.value })">
                        <option v-for="font in fontFamilies" :key="font" :value="font" :style="{ fontFamily: font }">{{ font }}</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <span class="text-xs text-slate-400">Font Size</span>
                        <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.countdownConfig?.fontSize || 24" @change="(e: any) => updateCountdownConfig({ fontSize: Number(e.target.value) })">
                            <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
                        </select>
                    </div>
                    <div>
                        <span class="text-xs text-slate-400">Digit Color</span>
                        <div class="flex gap-2">
                             <input type="color" :value="element.countdownConfig?.digitColor || '#000000'" @input="(e: any) => updateCountdownConfig({ digitColor: e.target.value })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        </div>
                    </div>
                     <div>
                        <span class="text-xs text-slate-400">Background Color</span>
                        <div class="flex gap-2">
                            <input type="color" :value="element.countdownConfig?.backgroundColor || '#ffffff'" @input="(e: any) => updateCountdownConfig({ backgroundColor: e.target.value })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" :checked="element.countdownConfig?.showDays !== false" @change="(e: any) => updateCountdownConfig({ showDays: e.target.checked })" class="rounded" /> Days
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" :checked="element.countdownConfig?.showHours !== false" @change="(e: any) => updateCountdownConfig({ showHours: e.target.checked })" class="rounded" /> Hours
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" :checked="element.countdownConfig?.showMinutes !== false" @change="(e: any) => updateCountdownConfig({ showMinutes: e.target.checked })" class="rounded" /> Minutes
                    </label>
                    <label class="flex items-center gap-2 text-sm">
                        <input type="checkbox" :checked="element.countdownConfig?.showSeconds !== false" @change="(e: any) => updateCountdownConfig({ showSeconds: e.target.checked })" class="rounded" /> Seconds
                    </label>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Label Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.countdownConfig?.labelColor || '#666666'" @input="(e: any) => updateCountdownConfig({ labelColor: e.target.value })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.countdownConfig?.labelColor || '#666666'" @update:model-value="val => updateCountdownConfig({ labelColor: val })" class="flex-1" />
                    </div>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Accent Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.countdownConfig?.accentColor || '#b8860b'" @input="(e: any) => updateCountdownConfig({ accentColor: e.target.value })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.countdownConfig?.accentColor || '#b8860b'" @update:model-value="val => updateCountdownConfig({ accentColor: val })" class="flex-1" />
                    </div>
                </div>
            </div>

            <!-- RSVP FORM SETTINGS -->
            <div v-if="element.type === 'rsvp-form' || element.type === 'rsvp_form'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">RSVP Form Settings</Label>
                <div>
                     <span class="text-xs text-slate-400">Title</span>
                     <Input :model-value="element.rsvpFormConfig?.title || 'RSVP Form'" @update:model-value="val => updateRSVPConfig({ title: val })" />
                </div>
                <div>
                    <span class="text-xs text-slate-400">Style</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.rsvpFormConfig?.style || 'classic'" @change="(e: any) => updateRSVPConfig({ style: e.target.value })">
                        <option v-for="style in styleOptions" :key="style" :value="style" class="capitalize">{{ style }}</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="element.rsvpFormConfig?.showNameField !== false" @change="(e: any) => updateRSVPConfig({ showNameField: e.target.checked })" class="rounded" /> Show Name Field</label>
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="element.rsvpFormConfig?.showEmailField !== false" @change="(e: any) => updateRSVPConfig({ showEmailField: e.target.checked })" class="rounded" /> Show Email Field</label>
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="element.rsvpFormConfig?.showPhoneField !== false" @change="(e: any) => updateRSVPConfig({ showPhoneField: e.target.checked })" class="rounded" /> Show Phone Field</label>
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="element.rsvpFormConfig?.showMessageField !== false" @change="(e: any) => updateRSVPConfig({ showMessageField: e.target.checked })" class="rounded" /> Show Message Field</label>
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="element.rsvpFormConfig?.showAttendanceField !== false" @change="(e: any) => updateRSVPConfig({ showAttendanceField: e.target.checked })" class="rounded" /> Show Attendance Field</label>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Button Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.rsvpFormConfig?.buttonColor || '#b8860b'" @input="(e: any) => updateRSVPConfig({ buttonColor: e.target.value })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.rsvpFormConfig?.buttonColor || '#b8860b'" @update:model-value="val => updateRSVPConfig({ buttonColor: val })" class="flex-1" />
                    </div>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Submit Button Text</span>
                    <Input :model-value="element.rsvpFormConfig?.submitButtonText || 'Kirim Ucapan'" @update:model-value="val => updateRSVPConfig({ submitButtonText: val })" />
                </div>
            </div>

            <!-- ICON SETTINGS -->
            <div v-if="element.type === 'icon'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Icon Settings</Label>
                
                <!-- Social Media -->
                <div>
                    <span class="text-xs text-slate-400 block mb-1">Social Media</span>
                    <div class="grid grid-cols-6 gap-1">
                        <Button v-for="icon in extendedSocialIcons" :key="icon" variant="outline" size="sm" :class="{ 'bg-blue-50 border-blue-300': element.iconStyle?.iconName === icon }" @click="updateIconStyle({ iconName: icon })" class="p-2 h-auto aspect-square flex items-center justify-center text-slate-700" :title="icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                                <path :d="iconPaths[icon] || ''" />
                            </svg>
                        </Button>
                    </div>
                </div>

                <!-- Contact & Info -->
                <div>
                    <span class="text-xs text-slate-400 block mb-1">Contact & Info</span>
                    <div class="grid grid-cols-6 gap-1">
                         <Button v-for="icon in extendedContactIcons" :key="icon" variant="outline" size="sm" :class="{ 'bg-blue-50 border-blue-300': element.iconStyle?.iconName === icon }" @click="updateIconStyle({ iconName: icon })" class="p-2 h-auto aspect-square flex items-center justify-center text-slate-700" :title="icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                                <path :d="iconPaths[icon] || ''" />
                            </svg>
                        </Button>
                    </div>
                </div>

                <!-- UI & Objects -->
                <div>
                    <span class="text-xs text-slate-400 block mb-1">Interface & Objects</span>
                    <div class="grid grid-cols-6 gap-1">
                         <Button v-for="icon in extendedUiIcons" :key="icon" variant="outline" size="sm" :class="{ 'bg-blue-50 border-blue-300': element.iconStyle?.iconName === icon }" @click="updateIconStyle({ iconName: icon })" class="p-2 h-auto aspect-square flex items-center justify-center text-slate-700" :title="icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                                <path :d="iconPaths[icon] || ''" />
                            </svg>
                        </Button>
                    </div>
                </div>

                <!-- Wedding & Decoration -->
                <div>
                     <span class="text-xs text-slate-400 block mb-1">Wedding & Decorations</span>
                    <div class="grid grid-cols-6 gap-1">
                         <Button v-for="icon in extendedWeddingIcons" :key="icon" variant="outline" size="sm" :class="{ 'bg-blue-50 border-blue-300': element.iconStyle?.iconName === icon }" @click="updateIconStyle({ iconName: icon })" class="p-2 h-auto aspect-square flex items-center justify-center text-slate-700" :title="icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                                <path :d="iconPaths[icon] || ''" />
                            </svg>
                        </Button>
                    </div>
                </div>

                <div>
                    <span class="text-xs text-slate-400">Size</span>
                    <Input type="number" :model-value="element.iconStyle?.iconSize || 48" @update:model-value="val => updateIconStyle({ iconSize: Number(val) })" />
                </div>
                <div>
                    <span class="text-xs text-slate-400">Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.iconStyle?.iconColor || '#b8860b'" @input="(e: any) => updateIconStyle({ iconColor: e.target.value })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.iconStyle?.iconColor || '#b8860b'" @update:model-value="val => updateIconStyle({ iconColor: val })" class="flex-1" />
                    </div>
                </div>
            </div>

            <!-- GUEST WISHES SETTINGS -->
            <div v-if="element.type === 'guest_wishes'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Guest Wishes Settings</Label>
                <div>
                     <span class="text-xs text-slate-400">Style</span>
                     <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.guestWishesConfig?.style || 'classic'" @change="(e: any) => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, style: e.target.value } })">
                        <option v-for="style in styleOptions" :key="style" :value="style" class="capitalize">{{ style }}</option>
                     </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Layout</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.guestWishesConfig?.layout || 'list'" @change="(e: any) => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, layout: e.target.value } })">
                        <option value="list">List</option>
                        <option value="grid">Grid</option>
                        <option value="masonry">Masonry</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Max Display Count</span>
                    <Input type="number" :model-value="element.guestWishesConfig?.maxDisplayCount || 20" @update:model-value="val => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, maxDisplayCount: Number(val) } })" />
                </div>
                <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" :checked="element.guestWishesConfig?.showTimestamp !== false" @change="(e: any) => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, showTimestamp: e.target.checked } })" class="rounded" /> Show Timestamp
                </label>
                <div>
                    <span class="text-xs text-slate-400">Card Background</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.guestWishesConfig?.cardBackgroundColor || '#ffffff'" @input="(e: any) => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, cardBackgroundColor: e.target.value } })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.guestWishesConfig?.cardBackgroundColor || '#ffffff'" @update:model-value="val => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, cardBackgroundColor: val } })" class="flex-1" />
                    </div>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Text Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.guestWishesConfig?.textColor || '#000000'" @input="(e: any) => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, textColor: e.target.value } })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.guestWishesConfig?.textColor || '#000000'" @update:model-value="val => handleUpdate({ guestWishesConfig: { ...element.guestWishesConfig!, textColor: val } })" class="flex-1" />
                    </div>
                </div>
            </div>

            <!-- OPEN INVITATION SETTINGS -->
            <div v-if="element.type === 'open_invitation_button' || element.type === 'button'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Open Invitation Settings</Label>
                <div>
                    <span class="text-xs text-slate-400">Button Text</span>
                    <Input :model-value="element.openInvitationConfig?.buttonText || 'Buka Undangan'" @update:model-value="val => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, buttonText: val } })" />
                </div>
                <div>
                    <span class="text-xs text-slate-400">Sub Text (optional)</span>
                    <Input :model-value="element.openInvitationConfig?.subText || ''" @update:model-value="val => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, subText: val } })" placeholder="e.g., Ketuk untuk membuka" />
                </div>
                <div>
                    <span class="text-xs text-slate-400">Style</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.openInvitationConfig?.buttonStyle || 'elegant'" @change="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, buttonStyle: e.target.value } })">
                        <option v-for="style in styleOptions" :key="style" :value="style" class="capitalize">{{ style }}</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Shape</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.openInvitationConfig?.buttonShape || 'pill'" @change="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, buttonShape: e.target.value } })">
                        <option value="pill">Pill</option>
                        <option value="rounded">Rounded</option>
                        <option value="rectangle">Rectangle</option>
                        <option value="stadium">Stadium</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Font Family</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.openInvitationConfig?.fontFamily || 'Inter'" @change="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, fontFamily: e.target.value } })">
                        <option v-for="font in fontFamilies" :key="font" :value="font" :style="{ fontFamily: font }">{{ font }}</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Font Size</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.openInvitationConfig?.fontSize || 16" @change="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, fontSize: Number(e.target.value) } })">
                        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Button Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.openInvitationConfig?.buttonColor || '#722f37'" @input="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, buttonColor: e.target.value } })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.openInvitationConfig?.buttonColor || '#722f37'" @update:model-value="val => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, buttonColor: val } })" class="flex-1" />
                    </div>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Text Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="element.openInvitationConfig?.textColor || '#ffffff'" @input="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, textColor: e.target.value } })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="element.openInvitationConfig?.textColor || '#ffffff'" @update:model-value="val => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, textColor: val } })" class="flex-1" />
                    </div>
                </div>
                <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" :checked="element.openInvitationConfig?.showIcon !== false" @change="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, showIcon: e.target.checked } })" class="rounded" /> Show Icon
                </label>
                <div v-if="element.openInvitationConfig?.showIcon !== false">
                    <span class="text-xs text-slate-400">Icon</span>
                    <select class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" :value="element.openInvitationConfig?.iconName || 'mail-open'" @change="(e: any) => handleUpdate({ openInvitationConfig: { ...element.openInvitationConfig!, iconName: e.target.value } })">
                        <option value="mail-open">Mail Open</option>
                        <option value="heart">Heart</option>
                        <option value="sparkles">Sparkles</option>
                        <option value="mail">Mail</option>
                        <option value="send">Send</option>
                        <option value="star">Star</option>
                        <option value="gift">Gift</option>
                        <option value="feather">Feather</option>
                    </select>
                </div>
            </div>

            <!-- COPY TO PAGE -->
            <div class="pt-4 border-t space-y-2">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Actions</Label>
                <div class="flex gap-2">
                    <select v-model="targetSectionForCopy" class="flex-1 rounded-md border border-slate-200 p-2 text-sm bg-white">
                        <option value="" disabled>Select Page...</option>
                        <option 
                            v-for="sect in availableSectionsForCopy" 
                            :key="sect.key" 
                            :value="sect.key"
                        >
                            {{ sect.title }}
                        </option>
                    </select>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        :disabled="!targetSectionForCopy"
                        @click="handleCopyToSection"
                        title="Copy to selected page"
                    >
                        <Copy class="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <!-- DELETE BUTTON -->
            <div class="pt-2">
                <Button variant="outline" class="w-full text-red-500 border-red-200 hover:bg-red-50" @click="handleDelete">
                    <Trash2 class="w-4 h-4 mr-2" /> Delete Element
                </Button>
            </div>
        </div>

        <!-- SECTION PROPERTIES (when no element selected) -->
        <div v-else-if="currentSection" class="space-y-4">
            <div class="border-b pb-3">
                <h3 class="font-semibold text-slate-800">Section Properties</h3>
            </div>
            <div class="space-y-3">
                <div>
                    <span class="text-xs text-slate-400">Background Color</span>
                    <div class="flex gap-2">
                        <input type="color" :value="currentSection.backgroundColor || '#ffffff'" @input="(e: any) => handleSectionUpdate({ backgroundColor: e.target.value })" class="w-10 h-10 p-1 rounded border cursor-pointer" />
                        <Input :model-value="currentSection.backgroundColor || '#ffffff'" @update:model-value="val => handleSectionUpdate({ backgroundColor: val })" class="flex-1" />
                    </div>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Background Image</span>
                    <div class="flex gap-2 mt-1">
                        <input type="file" ref="bgFileInputRef" class="hidden" accept="image/*" @change="handleBgImageUpload" />
                        <Button variant="outline" size="sm" class="flex-1 justify-center gap-1" @click="triggerBgImageUpload" :disabled="isUploadingBg">
                            <Upload class="w-3 h-3" /> {{ isUploadingBg ? 'Uploading...' : 'Upload Image' }}
                        </Button>
                    </div>
            </div>
            <div class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Page Transition</Label>
                <div>
                    <span class="text-xs text-slate-400">Transition Effect</span>
                    <select 
                        class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                        :value="currentSection.transitionEffect || 'none'"
                        @change="(e: any) => handleSectionUpdate({ transitionEffect: e.target.value })"
                    >
                        <option value="none">None</option>
                        <option value="fade">Fade</option>
                        <option value="slide-up">Slide Up</option>
                        <option value="slide-down">Slide Down</option>
                        <option value="slide-left">Slide Left</option>
                        <option value="slide-right">Slide Right</option>
                        <option value="zoom-in">Zoom In</option>
                        <option value="zoom-out">Zoom Out</option>
                        <option value="rotate">Rotate</option>
                        <option value="flip-x">Flip X</option>
                        <option value="flip-y">Flip Y</option>
                        <option value="blur">Blur</option>
                        <option value="grayscale">Grayscale</option>
                        <option value="sepia">Sepia</option>
                        <option value="curtain">Curtain Open</option>
                        <option value="door">Door Open</option>
                        <option value="book">Book Flip</option>
                        <option value="ripple">Ripple</option>
                        <option value="glitch">Glitch</option>
                        <option value="pixelate">Pixelate</option>
                        <option value="swirl">Swirl</option>
                    </select>
                </div>
                <div>
                    <span class="text-xs text-slate-400">Transition Trigger</span>
                    <select 
                        class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                        :value="currentSection.transitionTrigger || 'scroll'"
                        @change="(e: any) => handleSectionUpdate({ transitionTrigger: e.target.value })"
                    >
                        <option value="scroll">On Scroll (Default)</option>
                        <option value="click">Click Page</option>
                        <option value="open_btn">Click Open Button</option>
                    </select>
                    <p class="text-xs text-slate-400 mt-1" v-if="currentSection.transitionTrigger === 'open_btn'">
                        This transition will play when the "Open Invitation" button is clicked.
                    </p>
                </div>
                <div>
                    <div class="flex justify-between">
                        <span class="text-xs text-slate-400">Duration</span>
                        <span class="text-xs text-slate-500">{{ currentSection.transitionDuration || 1000 }}ms</span>
                    </div>
                    <input 
                        type="range" 
                        min="500" 
                        max="3000" 
                        step="100" 
                        :value="currentSection.transitionDuration || 1000"
                        @input="(e: any) => handleSectionUpdate({ transitionDuration: Number(e.target.value) })"
                        class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
            <div class="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-sm">
                Select an element to edit its properties.
            </div>
        </div>

        <!-- EMPTY STATE -->
        <div v-else class="text-center text-slate-400 py-10">
            No element selected
        </div>
    </div>
</template>
