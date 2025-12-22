<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTemplateStore } from '@/stores/template';
import { DEFAULT_ZOOM_CONFIG } from '@/lib/constants';
import { type TemplateElement, type SectionDesign, type CountdownConfig, type RSVPFormConfig, type IconStyle, type ElementStyle, type ZoomPoint } from '@/lib/types';
import { iconPaths } from '@/lib/icon-paths';
import { uploadFile } from '@/services/cloudflare-api';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Button from '@/components/ui/Button.vue';
import { 
    Upload, Square, Circle, Star, Minus, Heart, Cloud, Leaf, Flower, Sun, Moon,
    MessageCircle, Hexagon,
    AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    Trash2, ChevronsUp, ArrowUp, ArrowDown, ChevronsDown,
    FlipHorizontal2, FlipVertical2, Plus, Clock, GripVertical, Copy
} from 'lucide-vue-next';
import ElementPermissionToggles from './ElementPermissionToggles.vue';
import { useToast } from '@/composables/use-toast';

interface Props {
    activeSection?: SectionDesign;
    activeSectionType?: string;
}

const props = defineProps<Props>();
const store = useTemplateStore();
const { toast } = useToast();

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
    // Sort by zIndex descending (topmost layer at top of list)
    return [...(props.activeSection.elements || [])].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
});

// ============================================
// INLINE NAME EDITING
// ============================================
const editingElementId = ref<string | null>(null);
const editingName = ref('');

const startEditingName = (elementId: string, currentName: string) => {
    editingElementId.value = elementId;
    editingName.value = currentName || '';
};

const saveEditingName = () => {
    if (editingElementId.value && store.activeTemplateId && props.activeSectionType) {
        store.updateElement(store.activeTemplateId, props.activeSectionType, editingElementId.value, { name: editingName.value });
    }
    editingElementId.value = null;
    editingName.value = '';
};

const cancelEditingName = () => {
    editingElementId.value = null;
    editingName.value = '';
};

// ============================================
// DRAG AND DROP LAYER REORDERING
// ============================================
const draggedElementId = ref<string | null>(null);
const dragOverElementId = ref<string | null>(null);
const dragOverPosition = ref<'above' | 'below' | null>(null);

// Selected flight mode for flying decorations
const selectedFlightMode = ref('float-flap');

const handleDragStart = (event: DragEvent, elementId: string) => {
    draggedElementId.value = elementId;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', elementId);
    }
};

const handleDragOver = (event: DragEvent, elementId: string) => {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
    }
    if (draggedElementId.value === elementId) {
        dragOverElementId.value = null;
        dragOverPosition.value = null;
        return;
    }
    dragOverElementId.value = elementId;
    
    // Determine if dropping above or below the target based on mouse Y
    const target = event.currentTarget as HTMLElement;
    if (target) {
        const rect = target.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        dragOverPosition.value = event.clientY < midY ? 'above' : 'below';
    }
};

const handleDragLeave = () => {
    dragOverElementId.value = null;
    dragOverPosition.value = null;
};

// ============================================
// UNIFIED LAYER REORDERING HELPER
// ============================================
/**
 * Takes a new ordered array of element IDs (from top to bottom in UI).
 * Assigns z-indices so that index 0 = highest z, last index = lowest z.
 * Uses a spacing of 10 to allow for future insertions without re-normalization.
 */
const applyNewElementOrder = (newOrderedIds: string[]) => {
    if (!store.activeTemplateId || !props.activeSectionType || !props.activeSection) return;
    
    const elementsInSection = props.activeSection.elements;
    const totalElements = newOrderedIds.length;
    
    newOrderedIds.forEach((id, index) => {
        const el = elementsInSection.find(e => e.id === id);
        if (el) {
            // Top of list (index 0) gets highest z-index
            const newZIndex = (totalElements - index) * 10;
            if (el.zIndex !== newZIndex) {
                store.updateElement(store.activeTemplateId!, props.activeSectionType!, id, { zIndex: newZIndex });
            }
        }
    });
};

const handleDrop = (event: DragEvent, targetElementId: string) => {
    event.preventDefault();
    if (!draggedElementId.value || draggedElementId.value === targetElementId) {
        draggedElementId.value = null;
        dragOverElementId.value = null;
        dragOverPosition.value = null;
        return;
    }

    // Get current sorted list (top = highest z)
    const sortedIds = currentSectionElements.value.map(el => el.id);
    const draggedIndex = sortedIds.indexOf(draggedElementId.value);
    const targetIndex = sortedIds.indexOf(targetElementId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged element
    sortedIds.splice(draggedIndex, 1);
    
    // Insert at the correct position based on dragOverPosition
    let insertIndex = targetIndex;
    if (dragOverPosition.value === 'below') {
        // If the dragged item was originally above the target, adjust index
        insertIndex = draggedIndex < targetIndex ? targetIndex : targetIndex + 1;
    } else {
        insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    }
    // Clamp to valid range
    insertIndex = Math.max(0, Math.min(sortedIds.length, insertIndex));
    sortedIds.splice(insertIndex, 0, draggedElementId.value);

    // Apply the new order
    applyNewElementOrder(sortedIds);

    draggedElementId.value = null;
    dragOverElementId.value = null;
    dragOverPosition.value = null;
};

const handleDragEnd = () => {
    draggedElementId.value = null;
    dragOverElementId.value = null;
    dragOverPosition.value = null;
};

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

const updateIconStyle = (updates: Partial<IconStyle>) => {
    const currentStyle = element.value?.iconStyle || { iconName: 'square', iconColor: '#000000', iconSize: 48 };
    handleUpdate({
        iconStyle: {
            ...currentStyle,
            ...updates
        } as IconStyle
    });
};

// Helper to update lottieConfig with proper defaults
const updateLottieConfig = (updates: Partial<{ url: string; loop: boolean; autoplay: boolean; speed: number; direction: 'left' | 'right' }>) => {
    const currentConfig = element.value?.lottieConfig || { url: '', loop: true, autoplay: true, speed: 1, direction: 'left' as const };
    const newConfig = {
        url: currentConfig.url ?? '',
        loop: currentConfig.loop ?? true,
        autoplay: currentConfig.autoplay ?? true,
        speed: currentConfig.speed ?? 1,
        direction: currentConfig.direction ?? 'left',
        ...updates
    };
    console.log('[PropertyPanel] Updating lottieConfig:', newConfig);
    handleUpdate({ lottieConfig: newConfig });
};

// Section update handler - updates local state AND persists to DB
const handleSectionUpdate = async (updates: Partial<SectionDesign>, options: { skipRefetch?: boolean } = {}) => {
    if (!props.activeSectionType || !store.activeTemplateId) return;
    
    console.log('[PropertyPanel] Updating section:', updates, 'options:', options);
    try {
        await store.updateSection(store.activeTemplateId, props.activeSectionType, updates, options);
        console.log('[PropertyPanel] Update successful');
        toast({
            title: "Tersimpan",
            description: "Pengaturan berhasil diperbarui."
        });
    } catch (error) {
        console.error('[PropertyPanel] Failed to update section:', error);
        toast({
            title: "Gagal Menyimpan",
            description: "Terjadi kesalahan saat menyimpan pengaturan.",
            variant: "destructive"
        });
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

// Layer handlers - now using the unified reorderElements approach
const handleLayer = (action: 'front' | 'up' | 'down' | 'back') => {
    if (!element.value || !props.activeSection) return;
    
    const sortedIds = currentSectionElements.value.map(el => el.id);
    const currentIndex = sortedIds.indexOf(element.value.id);
    
    if (currentIndex === -1) return;
    
    // Remove from current position
    sortedIds.splice(currentIndex, 1);
    
    let newIndex: number;
    switch (action) {
        case 'front':
            newIndex = 0; // Top of list = front
            break;
        case 'up':
            newIndex = Math.max(0, currentIndex - 1);
            break;
        case 'down':
            newIndex = Math.min(sortedIds.length, currentIndex + 1);
            break;
        case 'back':
            newIndex = sortedIds.length; // Bottom of list = back
            break;
        default:
            newIndex = currentIndex;
    }
    
    // Insert at new position
    sortedIds.splice(newIndex, 0, element.value.id);
    
    // Apply the new order
    applyNewElementOrder(sortedIds);
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
        style: 'classic' as ElementStyle,
        backgroundColor: '#ffffff', textColor: '#000000', buttonColor: '#b8860b', buttonTextColor: '#ffffff',
        borderColor: '#e5e5e5', title: 'RSVP Form', showNameField: true, showEmailField: true, showPhoneField: true,
        showMessageField: true, showAttendanceField: true, nameLabel: 'Nama', emailLabel: 'Email',
        phoneLabel: 'Telepon', messageLabel: 'Pesan', attendanceLabel: 'Kehadiran',
        submitButtonText: 'Kirim Ucapan', successMessage: 'Terima kasih!'
    };
    handleUpdate({ rsvpFormConfig: { ...current, ...updates } });
};

// ============================================
// ZOOM POINT MANAGEMENT FUNCTIONS
// ============================================

// Generate unique ID for zoom points
const generateZoomPointId = () => `zp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Add a new zoom point
const addZoomPoint = () => {
    if (!currentSection.value?.zoomConfig) {
        console.warn('[PropertyPanel] No zoomConfig found, cannot add point');
        return;
    }
    
    const currentPoints = currentSection.value.zoomConfig.points || [];
    console.log('[PropertyPanel] Current points before add:', currentPoints.length, currentPoints);
    
    const newPoint = {
        id: generateZoomPointId(),
        label: `Point ${currentPoints.length + 1}`,
        targetRegion: { x: 50, y: 50, width: 50, height: 50 },
    };
    
    // Create new array with spread plus new point
    const newPoints = [...currentPoints, newPoint];
    console.log('[PropertyPanel] New points after add:', newPoints.length, newPoints);
    
    handleSectionUpdate({ 
        zoomConfig: { 
            ...currentSection.value.zoomConfig, 
            points: newPoints, 
            selectedPointIndex: newPoints.length - 1 
        } 
    }, { skipRefetch: true });
};

// Remove a zoom point by index
const removeZoomPoint = (index: number) => {
    if (!currentSection.value?.zoomConfig) return;
    
    const points = [...(currentSection.value.zoomConfig.points || [])];
    if (points.length <= 0 || index < 0 || index >= points.length) return;
    
    points.splice(index, 1);
    
    // Adjust selected index if needed
    let newIndex = currentSection.value.zoomConfig.selectedPointIndex || 0;
    if (newIndex >= points.length) {
        newIndex = Math.max(0, points.length - 1);
    }
    
    handleSectionUpdate({ 
        zoomConfig: { 
            ...currentSection.value.zoomConfig, 
            points, 
            selectedPointIndex: newIndex 
        } 
    }, { skipRefetch: true });
};

// Select a zoom point by index
const selectZoomPoint = (index: number) => {
    if (!currentSection.value?.zoomConfig) return;
    
    handleSectionUpdate({ 
        zoomConfig: { 
            ...currentSection.value.zoomConfig, 
            selectedPointIndex: index 
        } 
    }, { skipRefetch: true });
};

// Update zoom point label
const updateZoomPointLabel = (index: number, label: string) => {
    if (!currentSection.value?.zoomConfig) return;
    
    const points = [...(currentSection.value.zoomConfig.points || [])];
    if (index < 0 || index >= points.length) return;
    
    points[index] = { ...points[index], label } as ZoomPoint;
    
    handleSectionUpdate({ 
        zoomConfig: { 
            ...currentSection.value.zoomConfig, 
            points 
        } 
    }, { skipRefetch: true });
};

// Get selected point X coordinate
const getSelectedPointX = (): number => {
    if (!currentSection.value?.zoomConfig?.points?.length) return 50;
    const idx = currentSection.value.zoomConfig.selectedPointIndex || 0;
    const point = currentSection.value.zoomConfig.points[idx];
    return point?.targetRegion?.x ?? 50;
};

// Get selected point Y coordinate  
const getSelectedPointY = (): number => {
    if (!currentSection.value?.zoomConfig?.points?.length) return 50;
    const idx = currentSection.value.zoomConfig.selectedPointIndex || 0;
    const point = currentSection.value.zoomConfig.points[idx];
    return point?.targetRegion?.y ?? 50;
};

// Update selected point X coordinate
const updateSelectedPointX = (x: number) => {
    if (!currentSection.value?.zoomConfig?.points?.length) return;
    
    const idx = currentSection.value.zoomConfig.selectedPointIndex || 0;
    const points = [...currentSection.value.zoomConfig.points];
    
    if (idx >= 0 && idx < points.length && points[idx]) {
        const currentPoint = points[idx];
        points[idx] = {
            ...currentPoint,
            targetRegion: { ...(currentPoint.targetRegion || { x: 50, y: 50, width: 50, height: 50 }), x }
        } as ZoomPoint;
        handleSectionUpdate({ 
            zoomConfig: { 
                ...currentSection.value!.zoomConfig!, 
                points 
            } 
        });
    }
};

// Update selected point Y coordinate
const updateSelectedPointY = (y: number) => {
    if (!currentSection.value?.zoomConfig?.points?.length) return;
    
    const idx = currentSection.value.zoomConfig.selectedPointIndex || 0;
    const points = [...currentSection.value.zoomConfig.points];
    
    if (idx >= 0 && idx < points.length && points[idx]) {
        const currentPoint = points[idx];
        points[idx] = {
            ...currentPoint,
            targetRegion: { ...(currentPoint.targetRegion || { x: 50, y: 50, width: 50, height: 50 }), y }
        } as ZoomPoint;
        handleSectionUpdate({ 
            zoomConfig: { 
                ...currentSection.value!.zoomConfig!, 
                points 
            } 
        });
    }
};

// Update zoom point duration
const updateZoomPointDuration = (idx: number, duration: number) => {
    if (!currentSection.value?.zoomConfig?.points) return;
    
    const points = [...currentSection.value.zoomConfig.points];
    if (idx >= 0 && idx < points.length) {
        points[idx] = { ...points[idx], duration } as ZoomPoint;
        handleSectionUpdate({ 
            zoomConfig: { 
                ...currentSection.value.zoomConfig, 
                points 
            } 
        }, { skipRefetch: true });
    }
};

// ============================================
// PAGE TRANSITION MANAGEMENT
// ============================================
const pageTransitionEnabled = computed({
    get: () => currentSection.value?.pageTransition?.enabled || false,
    set: (enabled: boolean) => updatePageTransition({ enabled })
});

const pageTransitionEffect = computed({
    get: () => currentSection.value?.pageTransition?.effect || 'none',
    set: (effect: any) => updatePageTransition({ effect })
});

const pageTransitionTrigger = computed({
    get: () => currentSection.value?.pageTransition?.trigger || 'scroll',
    set: (trigger: any) => updatePageTransition({ trigger })
});

const pageTransitionDuration = computed({
    get: () => currentSection.value?.pageTransition?.duration || 1000,
    set: (duration: number) => updatePageTransition({ duration })
});

const pageTransitionOverlay = computed({
    get: () => currentSection.value?.pageTransition?.overlayEnabled || false,
    set: (overlayEnabled: boolean) => updatePageTransition({ overlayEnabled })
});

const updatePageTransition = (updates: Partial<any>) => {
    if (!currentSection.value) return;
    const current = currentSection.value.pageTransition || {
        enabled: false,
        effect: 'none',
        trigger: 'scroll',
        duration: 1000
    };
    handleSectionUpdate({
        pageTransition: { ...current, ...updates }
    }, { skipRefetch: true });
};


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

// Shape categorization for UI
const shapeCategories = [
    {
        name: 'Basic',
        shapes: ['rectangle', 'square', 'rounded-rectangle', 'circle', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'octagon']
    },
    {
        name: 'Stars & Polygons',
        shapes: ['star-4', 'star-5', 'star-6', 'star-8', 'star-burst', 'cross', 'plus', 'asterisk']
    },
    {
        name: 'Hearts & Love',
        shapes: ['heart', 'heart-outline', 'double-heart', 'heart-arrow']
    },
    {
        name: 'Nature',
        shapes: ['leaf', 'flower', 'cloud', 'sun', 'moon', 'raindrop']
    },
    {
        name: 'Lines & Arrows',
        shapes: ['line', 'arrow', 'double-arrow', 'curved-line', 'zigzag', 'wave']
    },
    {
        name: 'Decorative',
        shapes: ['ribbon', 'banner', 'frame', 'badge', 'seal', 'sparkle', 'burst', 'swirl']
    },
    {
        name: 'Communication',
        shapes: ['speech-bubble', 'thought-bubble', 'callout']
    }
];

const getShapeIcon = (type: string) => {
    if (type.startsWith('star-')) return Star;
    if (type.includes('heart')) return Heart;
    if (type === 'rectangle' || type === 'square' || type === 'rounded-rectangle') return Square;
    if (type === 'circle' || type === 'ellipse') return Circle;
    if (type === 'triangle' || type === 'diamond' || type === 'pentagon' || type === 'hexagon' || type === 'octagon') return Hexagon;
    if (type === 'line' || type === 'minus') return Minus;
    if (type === 'cloud') return Cloud;
    if (type === 'leaf') return Leaf;
    if (type === 'flower') return Flower;
    if (type === 'sun') return Sun;
    if (type === 'moon') return Moon;
    if (type === 'speech-bubble' || type === 'thought-bubble' || type === 'callout') return MessageCircle;
    return Square;
};

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
        case 'shape': return '⬜';
        default: return '◻';
    }
};

const getAlignIcon = (type: string) => {
    switch(type) {
        case 'left': return AlignLeft;
        case 'center-h': return AlignCenter;
        case 'right': return AlignRight;
        case 'top': return AlignStartVertical;
        case 'center-v': return AlignCenterVertical;
        case 'bottom': return AlignEndVertical;
        default: return AlignCenter;
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

// ============================================
// FLYING DECORATIONS
// ============================================
// Use API base URL for direct R2 access (bypasses SSL issues with R2 public bucket)
// Hardcoded to ensure production uses correct worker
const API_URL = 'https://tamuu-api.shafania57.workers.dev';

// R2 file keys (as stored in bucket)
const flyingDecorationKeys = [
    { id: 'bird-warm', name: 'Bird (Warm)', key: 'photos/2025/12/1766118233945-5hn7z.png' },
    { id: 'bird-cool', name: 'Bird (Cool)', key: 'photos/2025/12/1766118287972-657f6o.png' },
    { id: 'butterfly-gold', name: 'Butterfly Gold', key: 'photos/2025/12/1766118295218-q7dx3c.png' },
    { id: 'butterfly-blue', name: 'Butterfly Blue', key: 'photos/2025/12/1766118302329-grvg9g.png' },
];

// Use direct R2 endpoint (bypasses SSL certificate issues)
const flyingDecorationsWithProxy = flyingDecorationKeys.map(d => ({
    ...d,
    url: `${API_URL}/api/upload/r2/${d.key}`,  // Original URL for saving
    proxyUrl: `${API_URL}/api/upload/r2/${d.key}`,  // Same URL for display
}));

// Flight mode options for flying decorations
const flightModeOptions = [
    { value: 'flap-bob', label: '🪶 Kepak + Naik-Turun', icon: '↕️' },
    { value: 'float-flap', label: '🌊 Melayang + Kepak', icon: '〰️' },
    { value: 'fly-left', label: '⬅️ Terbang Kiri', icon: '←' },
    { value: 'fly-right', label: '➡️ Terbang Kanan', icon: '→' },
    { value: 'fly-up', label: '⬆️ Terbang Atas', icon: '↑' },
    { value: 'fly-down', label: '⬇️ Terbang Bawah', icon: '↓' },
    { value: 'fly-random', label: '🎲 Gerakan Acak', icon: '✧' },
];

const handleAddFlyingDecoration = async (decoration: typeof flyingDecorationsWithProxy[0], flightMode: string = 'float-flap') => {
    if (!store.activeTemplateId || !props.activeSectionType) return;
    
    const newId = `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const isButterfly = decoration.id.startsWith('butterfly');
    
    const newElement: TemplateElement = {
        id: newId,
        type: 'image',
        name: decoration.name,
        imageUrl: decoration.url,
        position: { x: 50, y: 50 },
        size: { width: 80, height: 80 },
        zIndex: 100,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        animation: 'fade-in',
        loopAnimation: flightMode as any,
        animationSpeed: 3000,
        animationDuration: isButterfly ? 400 : 800,
    };
    
    await store.addElement(store.activeTemplateId, props.activeSectionType, newElement);
};

</script>

<template>
    <div class="space-y-4 text-sm">
        <!-- ELEMENTS LIST -->
        <div v-if="currentSectionElements.length > 0" class="space-y-3 pb-4 border-b border-slate-100">
            <div class="flex items-center justify-between mb-1 px-1">
                <Label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Layers</Label>
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-300 font-medium">{{ currentSectionElements.length }} elements</span>
                </div>
            </div>
            
            <div class="max-h-64 overflow-y-auto pr-1 -mr-1 space-y-2 pt-1 custom-scrollbar">
                <div 
                    v-for="el in currentSectionElements" 
                    :key="el.id"
                    class="group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-200 select-none cursor-pointer"
                    :class="[
                        store.selectedElementId === el.id 
                            ? 'border-indigo-100 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-50' 
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm',
                        dragOverElementId === el.id && draggedElementId !== el.id ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100 scale-[1.02]' : '',
                        draggedElementId === el.id ? 'opacity-30 border-dashed bg-slate-50' : ''
                    ]"
                    draggable="true"
                    @dragstart="handleDragStart($event, el.id)"
                    @dragover="handleDragOver($event, el.id)"
                    @dragleave="handleDragLeave"
                    @drop="handleDrop($event, el.id)"
                    @dragend="handleDragEnd"
                    @click="store.selectedElementId === el.id ? store.setSelectedElement(null) : store.setSelectedElement(el.id)"
                >
                    <!-- Drop Line Indicator (Above) -->
                    <div 
                        v-if="dragOverElementId === el.id && dragOverPosition === 'above' && draggedElementId !== el.id"
                        class="absolute -top-1.5 left-0 right-0 h-0.5 bg-indigo-500 rounded-full shadow-md z-10"
                    >
                        <div class="absolute -left-1 -top-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <div class="absolute -right-1 -top-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                    </div>
                    
                    <!-- Drag Handle -->
                    <div class="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 transition-colors">
                        <GripVertical class="w-3.5 h-3.5" />
                    </div>
                    
                    <!-- Icon Background -->
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-inner transition-colors"
                        :class="store.selectedElementId === el.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'"
                    >
                        {{ getElementIcon(el.type) }}
                    </div>
                    
                    <!-- Element Content -->
                    <div class="flex-1 min-w-0">
                        <div v-if="editingElementId === el.id" class="relative">
                            <input 
                                v-model="editingName"
                                class="w-full bg-white px-2 py-1 text-xs border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-inner"
                                @blur="saveEditingName"
                                @keyup.enter="saveEditingName"
                                @keyup.escape="cancelEditingName"
                                @click.stop
                                autofocus
                            />
                        </div>
                        <div v-else class="flex flex-col">
                            <span 
                                class="text-xs font-semibold truncate transition-colors"
                                :class="store.selectedElementId === el.id ? 'text-indigo-900' : 'text-slate-700'"
                                @dblclick.stop="startEditingName(el.id, el.name || `New ${el.type}`)"
                            >{{ el.name || `New ${el.type}` }}</span>
                            <span class="text-[9px] text-slate-400 uppercase tracking-tight font-medium">{{ el.type.replace('_', ' ') }}</span>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            class="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90" 
                            @click.stop="store.deleteElement(store.activeTemplateId!, props.activeSectionType!, el.id)"
                        >
                            <Trash2 class="w-3.5 h-3.5" />
                        </Button>
                    </div>
                    
                    <!-- Drop Line Indicator (Below) -->
                    <div 
                        v-if="dragOverElementId === el.id && dragOverPosition === 'below' && draggedElementId !== el.id"
                        class="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-indigo-500 rounded-full shadow-md z-10"
                    >
                        <div class="absolute -left-1 -top-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <div class="absolute -right-1 -top-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                    </div>
                </div>
            </div>
            
            <div class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-50 border border-slate-100 border-dashed">
                <span class="text-[9px] text-slate-400 font-medium italic">Drag to reorder layers • Double-click to rename</span>
            </div>
        </div>

        <!-- ELEMENT PROPERTIES -->
        <div v-if="element" class="space-y-6">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3 mt-2">
                <h3 class="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    Properties
                </h3>
                <span class="text-indigo-600 font-mono text-[9px] bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">#{{ element.id.slice(0, 8) }}</span>
            </div>
            <!-- User Permissions -->
            <ElementPermissionToggles
                v-if="store.activeTemplateId && activeSectionType"
                :element="element"
                :template-id="store.activeTemplateId"
                :section-type="activeSectionType"
                class="!mb-6"
            />

            <!-- Common Info -->
            <div class="grid grid-cols-2 gap-4 px-1">
                <div class="space-y-1.5">
                    <Label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</Label>
                    <Input 
                        :model-value="element.name" 
                        @update:model-value="val => handleUpdate({ name: val })" 
                        placeholder="Element Name"
                        class="h-9 rounded-xl border-slate-100 bg-white focus:ring-indigo-100 focus:border-indigo-300 text-xs font-semibold placeholder:text-slate-300"
                    />
                </div>
                <div class="space-y-1.5">
                     <Label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</Label>
                     <div class="h-9 rounded-xl border border-slate-100 bg-slate-50 flex items-center px-3">
                         <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{{ element.type.replace('_', ' ') }}</span>
                     </div>
                </div>
            </div>

            <!-- Transform (Position & Size) -->
            <div class="space-y-4 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 shadow-sm mx-1">
                <div class="flex items-center gap-2 mb-1">
                     <span class="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest flex-1">Transform</span>
                </div>
                
                <div class="grid grid-cols-2 gap-x-4 gap-y-4">
                    <!-- Position -->
                    <div class="flex flex-col gap-2">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Position</span>
                        <div class="flex items-center gap-2">
                            <div class="relative flex-1">
                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-300">X</span>
                                <input 
                                    type="number" 
                                    :value="Math.round(element.position.x)" 
                                    @input="(e: any) => handleUpdate({ position: { ...element.position, x: Number(e.target.value) } })"
                                    class="w-full pl-5 pr-1.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div class="relative flex-1">
                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-300">Y</span>
                                <input 
                                    type="number" 
                                    :value="Math.round(element.position.y)" 
                                    @input="(e: any) => handleUpdate({ position: { ...element.position, y: Number(e.target.value) } })"
                                    class="w-full pl-5 pr-1.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Size -->
                    <div class="flex flex-col gap-2">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Dimensions</span>
                        <div class="flex items-center gap-2">
                            <div class="relative flex-1">
                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-300">W</span>
                                <input 
                                    type="number" 
                                    :value="Math.round(element.size.width)" 
                                    @input="(e: any) => handleUpdate({ size: { ...element.size, width: Number(e.target.value) } })"
                                    class="w-full pl-5 pr-1.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                            <div class="relative flex-1">
                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-300">H</span>
                                <input 
                                    type="number" 
                                    :value="Math.round(element.size.height)" 
                                    @input="(e: any) => handleUpdate({ size: { ...element.size, height: Number(e.target.value) } })"
                                    class="w-full pl-5 pr-1.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Alignment Quick Actions -->
                <div class="pt-4 border-t border-slate-200/50 mt-1">
                    <span class="text-[9px] font-bold text-slate-400 uppercase block mb-3 tracking-tighter">Alignment Tools</span>
                    <div class="grid grid-cols-6 gap-2">
                        <button v-for="align in (['left', 'center-h', 'right', 'top', 'center-v', 'bottom'] as const)" :key="align"
                            @click="handleAlignment(align)"
                            class="flex items-center justify-center p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all active:scale-90 shadow-sm"
                            :title="align"
                        >
                            <component :is="getAlignIcon(align)" class="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <!-- Depth (Z-Order) -->
                <div class="pt-4 border-t border-slate-200/50">
                    <span class="text-[9px] font-bold text-slate-400 uppercase block mb-3 tracking-tighter">Depth Control</span>
                    <div class="grid grid-cols-4 gap-2">
                        <Button variant="outline" size="sm" class="rounded-xl h-9 border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90 shadow-sm" @click="handleLayer('front')" title="Bring to Front"><ChevronsUp class="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" class="rounded-xl h-9 border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90 shadow-sm" @click="handleLayer('up')" title="Move Up"><ArrowUp class="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" class="rounded-xl h-9 border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90 shadow-sm" @click="handleLayer('down')" title="Move Down"><ArrowDown class="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" class="rounded-xl h-9 border-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-90 shadow-sm" @click="handleLayer('back')" title="Send to Back"><ChevronsDown class="w-4 h-4" /></Button>
                    </div>
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
                    <!-- Advanced 3D Entrance Animations -->
                    <optgroup label="🎬 3D Motion">
                        <option value="rotate-in-down-left">Rotate In ↙️</option>
                        <option value="rotate-in-down-right">Rotate In ↘️</option>
                        <option value="zoom-in-down">Zoom In ⬇</option>
                        <option value="zoom-in-up">Zoom In ⬆</option>
                    </optgroup>
                </select>
            </div>

            <!-- Loop Animation Toggle -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                    <Label class="text-xs text-slate-700 font-medium">Loop Animation</Label>
                    <p class="text-[10px] text-slate-400">Repeat animation continuously</p>
                </div>
                <button
                    class="w-10 h-5 rounded-full transition-colors relative"
                    :class="element.animationLoop ? 'bg-indigo-500' : 'bg-slate-300'"
                    @click="handleUpdate({ animationLoop: !element.animationLoop })"
                >
                    <span 
                        class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                        :class="element.animationLoop ? 'translate-x-5' : 'translate-x-0.5'"
                    ></span>
                </button>
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
                        :class="{ 'bg-blue-50 border-blue-300': element?.flipHorizontal }"
                        @click="handleUpdate({ flipHorizontal: !element?.flipHorizontal })"
                    >
                        <FlipHorizontal2 class="w-4 h-4 mr-1" /> H
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        class="flex-1"
                        :class="{ 'bg-blue-50 border-blue-300': element?.flipVertical }"
                        @click="handleUpdate({ flipVertical: !element?.flipVertical })"
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

            <!-- 3D Motion: Parallax (Mouse Tracking) -->
            <div v-if="element.animation !== 'none' || element.loopAnimation !== 'none'" class="space-y-2 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-indigo-100">
                <div class="flex items-center justify-between">
                    <Label class="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                        <span class="text-sm">🌊</span> Parallax (Mouse 3D)
                    </Label>
                    <span class="text-[10px] font-mono text-indigo-500 bg-white/70 px-2 py-0.5 rounded-full">{{ element.parallaxFactor ?? 0 }}</span>
                </div>
                <input 
                    type="range" 
                    min="-1" 
                    max="1" 
                    step="0.1" 
                    :value="element.parallaxFactor ?? 0"
                    @input="(e: any) => handleUpdate({ parallaxFactor: Number(e.target.value) })"
                    class="w-full h-2 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div class="flex justify-between text-[8px] text-indigo-400 font-medium">
                    <span>← Reverse</span>
                    <span>Static</span>
                    <span>Follow →</span>
                </div>
                <p class="text-[9px] text-indigo-600 leading-relaxed">Elements move slightly with mouse for 3D depth effect. Negative = opposite direction.</p>
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
                    <optgroup label="Basic">
                        <option value="none">None</option>
                        <option value="pulse">Pulse</option>
                        <option value="float">Float</option>
                        <option value="sway">Sway</option>
                        <option value="spin">Spin</option>
                        <option value="shake">Shake</option>
                        <option value="glow">Glow</option>
                        <option value="heartbeat">Heartbeat</option>
                    </optgroup>
                    <optgroup label="Flying + Kepak">
                        <option value="float-flap">Melayang + Kepak</option>
                        <option value="flap-bob">Kepak di Tempat</option>
                        <option value="fly-left">Terbang Kiri</option>
                        <option value="fly-right">Terbang Kanan</option>
                        <option value="fly-up">Terbang Atas</option>
                        <option value="fly-down">Terbang Bawah</option>
                        <option value="fly-random">Terbang Acak (Zigzag)</option>
                    </optgroup>
                </select>
                <p class="text-xs text-slate-400">Combines with entrance animation above</p>
            </div>

            <!-- ============ TYPE-SPECIFIC SETTINGS ============ -->

            <!-- IMAGE/GIF SETTINGS -->
            <div v-if="element.type === 'image' || element.type === 'gif'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">{{ element.type === 'gif' ? 'GIF' : 'Image' }}</Label>
                <input type="file" ref="fileInputRef" class="hidden" :accept="element.type === 'gif' ? 'image/gif' : 'image/*'" @change="handleImageUpload" />
                <Button variant="outline" class="w-full justify-center gap-2" @click="triggerImageUpload" :disabled="isUploading">
                    <Upload class="w-4 h-4" /> {{ isUploading ? 'Uploading...' : element.type === 'gif' ? 'Upload GIF' : 'Upload Image' }}
                </Button>
                <Input :model-value="element.imageUrl || ''" @update:model-value="val => handleUpdate({ imageUrl: val })" placeholder="Or paste URL..." />
                <div>
                    <span class="text-xs text-slate-400">Opacity</span>
                    <div class="flex items-center gap-2">
                        <input type="range" min="0" max="1" step="0.05" :value="element.opacity ?? 1" @input="(e: any) => handleUpdate({ opacity: Number(e.target.value) })" class="flex-1 h-2 bg-slate-200 rounded-lg" />
                        <span class="text-xs w-10 text-right">{{ Math.round((element.opacity ?? 1) * 100) }}%</span>
                    </div>
                </div>
                
                <!-- Flying Decorations Quick Add -->
                <div class="pt-3 border-t border-slate-100">
                    <Label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Flying Decorations</Label>
                    
                    <!-- Flight Mode Selector -->
                    <div class="mb-3">
                        <span class="text-[9px] text-slate-400 block mb-1">Flight Mode</span>
                        <select 
                            v-model="selectedFlightMode"
                            class="w-full rounded-lg border border-slate-200 bg-white/80 backdrop-blur px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                        >
                            <option v-for="mode in flightModeOptions" :key="mode.value" :value="mode.value">
                                {{ mode.label }}
                            </option>
                        </select>
                    </div>
                    
                    <!-- Decoration Thumbnails -->
                    <div class="grid grid-cols-4 gap-2">
                        <button 
                            v-for="deco in flyingDecorationsWithProxy" 
                            :key="deco.id"
                            @click="handleAddFlyingDecoration(deco, selectedFlightMode)"
                            class="group relative aspect-square rounded-xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 overflow-hidden hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all active:scale-95"
                            :title="deco.name"
                        >
                            <img 
                                :src="deco.proxyUrl" 
                                :alt="deco.name"
                                class="w-full h-full object-contain p-1.5 group-hover:scale-110 transition-transform duration-200"
                            />
                            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 via-slate-900/40 to-transparent p-1">
                                <span class="text-[7px] text-white font-medium block truncate text-center drop-shadow">{{ deco.name.split(' ')[0] }}</span>
                            </div>
                        </button>
                    </div>
                    <p class="text-[9px] text-slate-400 mt-2 text-center">Click to add • Auto wing-flapping</p>
                </div>
            </div>

            <!-- LOTTIE ANIMATION SETTINGS -->
            <div v-if="element.type === 'lottie'" class="space-y-4 pt-4 border-t border-purple-100">
                <div class="flex items-center justify-between">
                    <Label class="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Lottie Animation</Label>
                    <span class="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">✨ Animated</span>
                </div>
                
                <!-- Lottie URL Input -->
                <div class="space-y-2">
                    <Label class="text-xs text-slate-500">Animation URL</Label>
                    <Input 
                        :model-value="element.lottieConfig?.url || ''" 
                        @update:model-value="val => updateLottieConfig({ url: val })" 
                        placeholder="Paste Lottie URL (.json or .lottie)"
                        class="text-xs"
                    />
                    <p class="text-[10px] text-slate-400 leading-relaxed">
                        Get free animations from <a href="https://lottiefiles.com" target="_blank" class="text-purple-500 hover:underline font-medium">LottieFiles.com</a>
                    </p>
                </div>

                <!-- Speed Slider -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <Label class="text-xs text-slate-500">Speed</Label>
                        <span class="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{{ element.lottieConfig?.speed || 1 }}x</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.25" 
                        max="3" 
                        step="0.25" 
                        :value="element.lottieConfig?.speed || 1"
                        @input="(e: any) => updateLottieConfig({ speed: Number(e.target.value) })"
                        class="w-full h-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <div class="flex justify-between text-[9px] text-slate-400">
                        <span>0.25x (Slow)</span>
                        <span>1x</span>
                        <span>3x (Fast)</span>
                    </div>
                </div>

                <!-- Loop Toggle -->
                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                        <Label class="text-xs text-slate-700 font-medium">Loop Animation</Label>
                        <p class="text-[10px] text-slate-400">Repeat animation continuously</p>
                    </div>
                    <button
                        class="w-10 h-5 rounded-full transition-colors relative"
                        :class="element.lottieConfig?.loop !== false ? 'bg-purple-500' : 'bg-slate-300'"
                        @click="updateLottieConfig({ loop: element.lottieConfig?.loop === false ? true : false })"
                    >
                        <span 
                            class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                            :class="element.lottieConfig?.loop !== false ? 'translate-x-5' : 'translate-x-0.5'"
                        ></span>
                    </button>
                </div>

                <!-- Direction Toggle -->
                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                        <Label class="text-xs text-slate-700 font-medium">Flip Horizontal</Label>
                        <p class="text-[10px] text-slate-400">Mirror the animation</p>
                    </div>
                    <button
                        class="w-10 h-5 rounded-full transition-colors relative"
                        :class="element.lottieConfig?.direction === 'right' ? 'bg-purple-500' : 'bg-slate-300'"
                        @click="updateLottieConfig({ direction: element.lottieConfig?.direction === 'right' ? 'left' : 'right' })"
                    >
                        <span 
                            class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                            :class="element.lottieConfig?.direction === 'right' ? 'translate-x-5' : 'translate-x-0.5'"
                        ></span>
                    </button>
                </div>

                <!-- Preview Hint -->
                <div v-if="!element.lottieConfig?.url" class="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 text-center">
                    <span class="text-2xl">🎬</span>
                    <p class="text-xs text-purple-600 font-medium mt-2">Paste a Lottie URL above to preview</p>
                    <p class="text-[10px] text-purple-400 mt-1">Supports .json and .lottie formats</p>
                </div>
            </div>

            <!-- SHAPE SETTINGS -->
            <div v-if="element.type === 'shape'" class="space-y-4 pt-4 border-t border-slate-100">
                <div class="flex items-center justify-between mb-1">
                    <Label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shape Properties</Label>
                    <Square class="w-3 h-3 text-slate-300" />
                </div>
                
                <!-- Shape Type Grid (Categorized & Scrollable) -->
                <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <div v-for="category in shapeCategories" :key="category.name" class="space-y-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ category.name }}</span>
                        <div class="grid grid-cols-4 gap-2">
                            <button 
                                v-for="shape in category.shapes" 
                                :key="shape"
                                class="group flex flex-col items-center justify-center p-2 rounded-xl border transition-all hover:bg-slate-50 active:scale-95"
                                :class="element.shapeConfig?.shapeType === shape ? 'border-indigo-500 bg-indigo-50/50 text-indigo-600 shadow-sm' : 'border-slate-100 text-slate-400 bg-white'"
                                @click="handleUpdate({ shapeConfig: { ...element.shapeConfig!, shapeType: shape as any } })"
                                :title="shape"
                            >
                                <component :is="getShapeIcon(shape)" class="w-4 h-4 transition-transform group-hover:scale-110" :class="shape === 'triangle' ? '-rotate-90' : ''" />
                                <span class="text-[8px] font-medium capitalize mt-1 truncate w-full text-center">{{ shape.replace('-', ' ') }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Color Group -->
                <div class="grid grid-cols-2 gap-3">
                    <!-- Fill -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Fill Color</span>
                            <div class="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    :checked="element.shapeConfig?.fill !== null"
                                    @change="(e: any) => handleUpdate({ shapeConfig: { ...element.shapeConfig!, fill: e.target.checked ? '#6366f1' : null } })"
                                    class="sr-only peer"
                                />
                                <div class="w-6 h-3 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-indigo-500"></div>
                            </div>
                        </div>
                        <div v-if="element.shapeConfig?.fill !== null" class="relative group h-9">
                            <input 
                                type="color" 
                                class="absolute inset-0 w-full h-full rounded-lg border-2 border-white shadow-sm ring-1 ring-slate-200 cursor-pointer p-0 opacity-0 z-10"
                                :value="element.shapeConfig?.fill || '#6366f1'"
                                @input="(e: any) => handleUpdate({ shapeConfig: { ...element.shapeConfig!, fill: e.target.value } })"
                            />
                            <div class="w-full h-full rounded-lg border border-slate-200 p-0.5" :style="{ backgroundColor: element.shapeConfig?.fill || '#6366f1' }">
                                <div class="w-full h-full rounded-[6px] border border-black/5 flex items-center justify-center">
                                     <span class="text-[8px] text-white mix-blend-difference uppercase font-mono">{{ element.shapeConfig?.fill }}</span>
                                </div>
                            </div>
                        </div>
                        <div v-else class="h-9 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center border-dashed">
                            <span class="text-[9px] text-slate-300 font-medium tracking-tight">None</span>
                        </div>
                    </div>

                    <!-- Stroke -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Stroke Color</span>
                            <div class="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    :checked="element.shapeConfig?.stroke !== null"
                                    @change="(e: any) => handleUpdate({ shapeConfig: { ...element.shapeConfig!, stroke: e.target.checked ? '#474554' : null } })"
                                    class="sr-only peer"
                                />
                                <div class="w-6 h-3 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-2 after:w-2 after:transition-all peer-checked:bg-slate-600"></div>
                            </div>
                        </div>
                        <div v-if="element.shapeConfig?.stroke !== null" class="relative group h-9">
                            <input 
                                type="color" 
                                class="absolute inset-0 w-full h-full rounded-lg border-2 border-white shadow-sm ring-1 ring-slate-200 cursor-pointer p-0 opacity-0 z-10"
                                :value="element.shapeConfig?.stroke || '#474554'"
                                @input="(e: any) => handleUpdate({ shapeConfig: { ...element.shapeConfig!, stroke: e.target.value } })"
                            />
                            <div class="w-full h-full rounded-lg border border-slate-200 p-0.5" :style="{ backgroundColor: element.shapeConfig?.stroke || '#474554' }">
                                 <div class="w-full h-full rounded-[6px] border border-black/5 flex items-center justify-center">
                                     <span class="text-[8px] text-white mix-blend-difference uppercase font-mono">{{ element.shapeConfig?.stroke }}</span>
                                </div>
                            </div>
                        </div>
                        <div v-else class="h-9 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center border-dashed">
                            <span class="text-[9px] text-slate-300 font-medium tracking-tight">None</span>
                        </div>
                    </div>
                </div>

                <!-- Sliders Group -->
                <div class="space-y-3 pt-2">
                    <div v-if="element.shapeConfig?.stroke !== null" class="space-y-1.5">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Stroke Weight</span>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ element.shapeConfig?.strokeWidth || 2 }}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="20" 
                            :value="element.shapeConfig?.strokeWidth || 2"
                            @input="(e: any) => handleUpdate({ shapeConfig: { ...element.shapeConfig!, strokeWidth: Number(e.target.value) } })"
                            class="w-full h-1 bg-slate-100 accent-indigo-500 rounded-full appearance-none cursor-pointer"
                        />
                    </div>

                    <div v-if="element.shapeConfig?.shapeType === 'rectangle'" class="space-y-1.5">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Corner Radius</span>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ element.shapeConfig?.cornerRadius || 0 }}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            :value="element.shapeConfig?.cornerRadius || 0"
                            @input="(e: any) => handleUpdate({ shapeConfig: { ...element.shapeConfig!, cornerRadius: Number(e.target.value) } })"
                            class="w-full h-1 bg-slate-100 accent-indigo-500 rounded-full appearance-none cursor-pointer"
                        />
                    </div>

                    <div v-if="element.shapeConfig?.shapeType.startsWith('star')" class="space-y-1.5">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Points</span>
                            <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ element.shapeConfig?.points || 5 }}</span>
                        </div>
                        <input 
                            type="range" 
                            min="3" 
                            max="12" 
                            :value="element.shapeConfig?.points || 5"
                            @input="(e: any) => handleUpdate({ shapeConfig: { ...element.shapeConfig!, points: Number(e.target.value) } })"
                            class="w-full h-1 bg-slate-100 accent-indigo-500 rounded-full appearance-none cursor-pointer"
                        />
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

            <!-- FLYING BIRD SETTINGS -->
            <div v-if="element.type === 'flying_bird'" class="space-y-3 pt-3 border-t">
                <Label class="text-xs font-semibold text-slate-500 uppercase">Flying Bird Settings</Label>
                
                <!-- Direction -->
                <div>
                    <span class="text-xs text-slate-400">Direction</span>
                    <select 
                        class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" 
                        :value="element.flyingBirdConfig?.direction || 'left'"
                        @change="(e: any) => handleUpdate({ flyingBirdConfig: { ...element.flyingBirdConfig!, direction: e.target.value } })"
                    >
                        <option value="left">← Fly Left</option>
                        <option value="right">→ Fly Right</option>
                    </select>
                </div>
                
                <!-- Color -->
                <div>
                    <span class="text-xs text-slate-400">Bird Color</span>
                    <div class="flex gap-2">
                        <input 
                            type="color" 
                            :value="element.flyingBirdConfig?.birdColor || '#1a1a1a'" 
                            @input="(e: any) => handleUpdate({ flyingBirdConfig: { ...element.flyingBirdConfig!, birdColor: e.target.value } })"
                            class="w-10 h-10 p-1 rounded border cursor-pointer" 
                        />
                        <Input 
                            :model-value="element.flyingBirdConfig?.birdColor || '#1a1a1a'" 
                            @update:model-value="val => handleUpdate({ flyingBirdConfig: { ...element.flyingBirdConfig!, birdColor: val } })" 
                            class="flex-1" 
                        />
                    </div>
                </div>
                
                <!-- Flap Speed -->
                <div>
                    <span class="text-xs text-slate-400">Flap Speed</span>
                    <select 
                        class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white" 
                        :value="element.flyingBirdConfig?.flapSpeed || 0.3"
                        @change="(e: any) => handleUpdate({ flyingBirdConfig: { ...element.flyingBirdConfig!, flapSpeed: Number(e.target.value) } })"
                    >
                        <option value="0.15">Fast (0.15s)</option>
                        <option value="0.3">Normal (0.3s)</option>
                        <option value="0.5">Slow (0.5s)</option>
                        <option value="0.8">Very Slow (0.8s)</option>
                    </select>
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


            <!-- MOTION PATH ANIMATION -->
            <div class="pt-4 border-t space-y-3">
                <div class="flex items-center justify-between">
                    <Label class="text-xs font-semibold text-slate-500 uppercase">Motion Path</Label>
                    <div class="flex items-center gap-1">
                        <span class="text-[10px] text-slate-400">{{ element.motionPathConfig?.enabled ? 'ON' : 'OFF' }}</span>
                        <input 
                            type="checkbox" 
                            :checked="element.motionPathConfig?.enabled" 
                            @change="(e: any) => handleUpdate({ motionPathConfig: { points: element?.motionPathConfig?.points || [], duration: element?.motionPathConfig?.duration || 3000, loop: element?.motionPathConfig?.loop ?? true, enabled: e.target.checked } })"
                            class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                        />
                    </div>
                </div>

                <div v-if="element.motionPathConfig?.enabled" class="space-y-4">
                    <div class="flex flex-col gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            class="w-full text-xs"
                            :class="store.pathEditingId === element.id ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : ''"
                            @click="store.pathEditingId = store.pathEditingId === element.id ? null : element.id"
                        >
                            {{ store.pathEditingId === element.id ? 'Stop Editing Path' : 'Edit Flight Path' }}
                        </Button>
                        <p class="text-[10px] text-slate-400 italic" v-if="store.pathEditingId === element.id">
                            Click on canvas to add points. Drag points to move them. Right-click point to remove.
                        </p>
                    </div>

                    <div v-if="element.motionPathConfig?.points?.length" class="space-y-3">
                        <div class="flex justify-between items-center text-[11px]">
                            <span class="text-slate-500">Duration</span>
                            <span class="font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-600">{{ element.motionPathConfig.duration || 3000 }}ms</span>
                        </div>
                        <input 
                            type="range" 
                            min="500" 
                            max="10000" 
                            step="100" 
                            :value="element.motionPathConfig.duration || 3000"
                            @input="(e: any) => handleUpdate({ motionPathConfig: { points: element?.motionPathConfig?.points || [], enabled: element?.motionPathConfig?.enabled ?? false, loop: element?.motionPathConfig?.loop ?? true, duration: Number(e.target.value) } })"
                            class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />

                        <div class="flex items-center justify-between">
                            <span class="text-[11px] text-slate-500">Loop Animation</span>
                            <input 
                                type="checkbox" 
                                :checked="element.motionPathConfig.loop !== false" 
                                @change="(e: any) => handleUpdate({ motionPathConfig: { points: element?.motionPathConfig?.points || [], duration: element?.motionPathConfig?.duration || 3000, enabled: element?.motionPathConfig?.enabled ?? false, loop: e.target.checked } })"
                                class="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                            />
                        </div>
                        
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            class="w-full text-[10px] text-slate-400 hover:text-red-500 h-7"
                            @click="handleUpdate({ motionPathConfig: { ...element?.motionPathConfig, points: [] } })"
                        >
                            Clear All Points
                        </Button>
                    </div>
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
                    <Input class="mt-2" :model-value="currentSection.backgroundUrl || ''" @update:model-value="val => handleSectionUpdate({ backgroundUrl: val })" placeholder="Or paste URL..." />
                </div>
                <div>
                    <span class="text-xs text-slate-400">Animation Trigger</span>
                    <select 
                        class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                        :value="currentSection.animationTrigger || 'scroll'"
                        @change="(e: any) => handleSectionUpdate({ animationTrigger: e.target.value })"
                    >
                        <option value="scroll">On Scroll (Default)</option>
                        <option value="click">Click Page</option>
                        <option value="open_btn">Click Open Button</option>
                    </select>
                </div>
                
                <!-- Ken Burns Background Effect -->
                <div class="space-y-2 pt-3 border-t border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <Label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <span class="text-sm">🎥</span> Ken Burns Effect
                            </Label>
                            <p class="text-[9px] text-slate-400 mt-0.5">Slow cinematic zoom</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                :checked="currentSection.kenBurnsEnabled || false" 
                                @change="(e: any) => handleSectionUpdate({ kenBurnsEnabled: e.target.checked })"
                                class="sr-only peer"
                            >
                            <div class="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                </div>
                
                <!-- Particle Overlay -->
                <div class="space-y-2 pt-3 border-t border-slate-100">
                    <Label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <span class="text-sm">✨</span> Particle Overlay
                    </Label>
                    <select 
                        class="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                        :value="currentSection.particleType || 'none'"
                        @change="(e: any) => handleSectionUpdate({ particleType: e.target.value })"
                    >
                        <option value="none">None</option>
                        <option value="butterflies">🦋 Butterflies</option>
                        <option value="petals">🌸 Flower Petals</option>
                        <option value="leaves">🍃 Falling Leaves</option>
                        <option value="sparkles">✨ Sparkles</option>
                    </select>
                    <p class="text-[9px] text-slate-400">Animated particles floating in background</p>
                </div>

                <!-- Zoom Effect (Section Level) -->
                <div class="space-y-3 pt-3 border-t border-slate-100">
                    <div class="flex items-center justify-between">
                        <div>
                            <Label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <span class="text-sm">🔍</span> Zoom Effect
                            </Label>
                            <p class="text-[9px] text-slate-400 mt-0.5">Animate background zoom</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                :checked="currentSection.zoomConfig?.enabled || false" 
                                @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection.zoomConfig || DEFAULT_ZOOM_CONFIG), enabled: e.target.checked } })"
                                class="sr-only peer"
                            >
                            <div class="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div v-if="currentSection.zoomConfig?.enabled" class="space-y-3 pl-2 border-l-2 border-indigo-100">
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <span class="text-[10px] text-slate-400">Direction</span>
                                <select 
                                    class="w-full rounded-md border border-slate-200 p-1.5 text-xs bg-white mt-1"
                                    :value="currentSection.zoomConfig?.direction || 'in'"
                                    @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection?.zoomConfig || DEFAULT_ZOOM_CONFIG), direction: e.target.value } })"
                                >
                                    <option value="in">Zoom In</option>
                                    <option value="out">Zoom Out</option>
                                </select>
                            </div>
                            <div>
                                <span class="text-[10px] text-slate-400">Trigger</span>
                                <select 
                                    class="w-full rounded-md border border-slate-200 p-1.5 text-xs bg-white mt-1"
                                    :value="currentSection.zoomConfig?.trigger || 'scroll'"
                                    @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection?.zoomConfig || DEFAULT_ZOOM_CONFIG), trigger: e.target.value } })"
                                >
                                    <option value="scroll">On Scroll</option>
                                    <option value="click">On Click</option>
                                    <option value="open_btn">Open Button</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <span class="text-[10px] text-slate-400">After Animation</span>
                                <select 
                                    class="w-full rounded-md border border-slate-200 p-1.5 text-xs bg-white mt-1"
                                    :value="currentSection.zoomConfig?.behavior || 'reset'"
                                    @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection?.zoomConfig || DEFAULT_ZOOM_CONFIG), behavior: e.target.value } })"
                                >
                                    <option value="reset">Return to Normal</option>
                                    <option value="stay">Stay Zoomed</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between items-center text-[10px] mb-1">
                                <span class="text-slate-400">Zoom Scale</span>
                                <span class="font-medium text-slate-600">{{ currentSection?.zoomConfig?.scale || 1.3 }}x</span>
                            </div>
                            <input 
                                type="range" 
                                min="1.1" 
                                max="2.5" 
                                step="0.1" 
                                :value="currentSection?.zoomConfig?.scale || 1.3"
                                @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection?.zoomConfig || DEFAULT_ZOOM_CONFIG), scale: Number(e.target.value) } })"
                                class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        <div>
                            <div class="flex justify-between items-center text-[10px] mb-1">
                                <span class="text-slate-400">Duration</span>
                                <span class="font-medium text-slate-600">{{ currentSection?.zoomConfig?.duration || 3000 }}ms</span>
                            </div>
                            <input 
                                type="range" 
                                min="1000" 
                                max="10000" 
                                step="500" 
                                :value="currentSection?.zoomConfig?.duration || 3000"
                                @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection?.zoomConfig || DEFAULT_ZOOM_CONFIG), duration: Number(e.target.value) } })"
                                class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        <!-- Multi-Point Zoom Section -->
                        <div class="space-y-2 pt-2 border-t border-slate-100">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-medium text-slate-500">📍 Zoom Points ({{ (currentSection?.zoomConfig?.points || []).length }})</span>
                                <button 
                                    @click="addZoomPoint"
                                    class="flex items-center gap-1 px-2 py-1 text-[10px] bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
                                >
                                    <Plus class="w-3 h-3" />
                                    Add Point
                                </button>
                            </div>

                            <!-- Points List -->
                            <div v-if="(currentSection?.zoomConfig?.points || []).length > 0" class="space-y-1.5 max-h-48 overflow-y-auto">
                                <div 
                                    v-for="(point, idx) in (currentSection?.zoomConfig?.points || [])" 
                                    :key="point.id"
                                    class="flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer"
                                    :class="idx === (currentSection?.zoomConfig?.selectedPointIndex || 0) 
                                        ? 'border-indigo-400 bg-indigo-50/50' 
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
                                    @click="selectZoomPoint(idx)"
                                >
                                    <span 
                                        class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                                        :class="idx === (currentSection?.zoomConfig?.selectedPointIndex || 0)
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-slate-200 text-slate-600'"
                                    >{{ idx + 1 }}</span>
                                    <input 
                                        type="text"
                                        :value="point.label || `Point ${idx + 1}`"
                                        @input="(e: any) => updateZoomPointLabel(idx, e.target.value)"
                                        @click.stop
                                        class="flex-1 text-xs bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                                        placeholder="Label..."
                                    />
                                    <div class="flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5" @click.stop>
                                        <Clock class="w-2.5 h-2.5 text-slate-400" />
                                        <input 
                                            type="number"
                                            :value="point.duration || currentSection.zoomConfig.duration || 3000"
                                            @input="(e: any) => updateZoomPointDuration(idx, Number(e.target.value))"
                                            class="w-10 text-[10px] bg-transparent border-none outline-none text-slate-600 font-bold"
                                            step="500"
                                            min="500"
                                        />
                                        <span class="text-[8px] text-slate-400">ms</span>
                                    </div>
                                    <span class="text-[9px] text-slate-400">({{ point.targetRegion?.x || 50 }}, {{ point.targetRegion?.y || 50 }})</span>
                                    <button
                                        @click.stop="removeZoomPoint(idx)"
                                        class="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 class="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <!-- Empty State -->
                            <div v-else class="text-center py-4 text-slate-400">
                                <p class="text-xs">No zoom points yet</p>
                                <p class="text-[10px] mt-1">Click "Add Point" to create one</p>
                            </div>

                            <!-- Selected Point Coordinates (for reference) -->
                            <div v-if="(currentSection?.zoomConfig?.points || []).length > 0" class="grid grid-cols-2 gap-2 pt-2">
                                <div>
                                    <span class="text-[10px] text-slate-400">Target X (%)</span>
                                    <input 
                                        type="number" 
                                        min="0" max="100"
                                        :value="getSelectedPointX()"
                                        @change="(e: any) => updateSelectedPointX(Number(e.target.value))"
                                        class="w-full rounded-md border border-slate-200 p-1.5 text-xs bg-white mt-1"
                                    />
                                </div>
                                <div>
                                    <span class="text-[10px] text-slate-400">Target Y (%)</span>
                                    <input 
                                        type="number" 
                                        min="0" max="100"
                                        :value="getSelectedPointY()"
                                        @change="(e: any) => updateSelectedPointY(Number(e.target.value))"
                                        class="w-full rounded-md border border-slate-200 p-1.5 text-xs bg-white mt-1"
                                    />
                                </div>
                            </div>

                            <!-- Multi-point Options (only show if > 1 point) -->
                            <div v-if="(currentSection?.zoomConfig?.points || []).length > 1" class="space-y-2 pt-2 border-t border-slate-100">
                                <div>
                                    <div class="flex justify-between items-center text-[10px] mb-1">
                                        <span class="text-slate-400">Transition Time</span>
                                        <span class="font-medium text-slate-600">{{ currentSection?.zoomConfig?.transitionDuration || 1000 }}ms</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="500" 
                                        max="5000" 
                                        step="250" 
                                        :value="currentSection?.zoomConfig?.transitionDuration || 1000"
                                        @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection?.zoomConfig || DEFAULT_ZOOM_CONFIG), transitionDuration: Number(e.target.value) } })"
                                        class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] text-slate-400">Loop Animation</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            :checked="currentSection?.zoomConfig?.loop || false"
                                            @change="(e: any) => handleSectionUpdate({ zoomConfig: { ...(currentSection?.zoomConfig || DEFAULT_ZOOM_CONFIG), loop: e.target.checked } })"
                                            class="sr-only peer"
                                        >
                                        <div class="w-7 h-4 bg-slate-200 peer-focus:ring-1 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <p class="text-[9px] text-slate-400 italic">Drag the virtual box on canvas to set target position.</p>
                    </div>
                </div>
                
            </div>
            <!-- PAGE TRANSITION SETTINGS -->
            <div class="space-y-3 pt-3 border-t border-slate-100">
                <div class="flex items-center justify-between">
                    <div>
                        <Label class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <span class="text-sm">🎭</span> Page Transition
                        </Label>
                        <p class="text-[9px] text-slate-400 mt-0.5">Professional reveal effects</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            v-model="pageTransitionEnabled"
                            class="sr-only peer"
                        >
                        <div class="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                </div>

                <div v-if="pageTransitionEnabled" class="space-y-3 pl-2 border-l-2 border-teal-100 mt-2">
                    <div>
                        <span class="text-[10px] text-slate-400">Effect Style</span>
                        <select 
                            v-model="pageTransitionEffect"
                            class="w-full rounded-md border border-slate-200 p-2 text-xs bg-white mt-1"
                        >
                            <option value="none">None</option>
                            <optgroup label="Essential">
                                <option value="fade">Classic Fade</option>
                                <option value="slide-up">Slide Up</option>
                                <option value="slide-down">Slide Down</option>
                            </optgroup>
                            <optgroup label="Luxury (Standby Mode)">
                                <option value="zoom-reveal">Zoom Reveal</option>
                                <option value="stack-reveal">Stack Layer Reveal</option>
                                <option value="parallax-reveal">Parallax Move</option>
                                <option value="door-reveal">Door Open</option>
                                <option value="pinch-close">Pinch Close</option>
                                <option value="carry-up">Carry Up</option>
                            </optgroup>
                        </select>
                    </div>

                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-[10px] text-slate-400">Section Standby</span>
                            <p class="text-[8px] text-slate-400">Render next section behind</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                v-model="pageTransitionOverlay"
                                class="sr-only peer"
                            >
                            <div class="w-7 h-4 bg-slate-200 peer-focus:ring-1 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                    </div>

                    <div>
                        <span class="text-[10px] text-slate-400">Trigger Mode</span>
                        <select 
                            v-model="pageTransitionTrigger"
                            class="w-full rounded-md border border-slate-200 p-2 text-xs bg-white mt-1"
                        >
                            <option value="scroll">On Scroll (Natural)</option>
                            <option value="click">On Click (Intentional)</option>
                            <option value="open_btn">Open Button (Opening Only)</option>
                        </select>
                    </div>

                    <div>
                        <div class="flex justify-between items-center text-[10px] mb-1">
                            <span class="text-slate-400">Anim Duration</span>
                            <span class="font-medium text-slate-600">{{ pageTransitionDuration }}ms</span>
                        </div>
                        <input 
                            type="range" 
                            min="400" 
                            max="3000" 
                            step="100" 
                            v-model.number="pageTransitionDuration"
                            class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500"
                        />
                    </div>
                </div>
            </div>
            
            <!-- FLYING DECORATIONS (Section Level) -->
            <div class="space-y-3 pt-4 border-t border-slate-100">
                <Label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Add: Flying Decorations</Label>
                <div class="grid grid-cols-4 gap-2">
                    <button 
                        v-for="deco in flyingDecorationsWithProxy" 
                        :key="deco.id"
                        @click="handleAddFlyingDecoration(deco)"
                        class="group relative aspect-square rounded-xl border border-slate-100 bg-white overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all active:scale-95"
                        :title="deco.name"
                    >
                        <img 
                            :src="deco.proxyUrl" 
                            :alt="deco.name"
                            class="w-full h-full object-contain p-1 group-hover:scale-110 transition-transform"
                        />
                        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                            <span class="text-[7px] text-white font-medium block truncate text-center">{{ deco.name.split(' ')[0] }}</span>
                        </div>
                    </button>
                </div>
                <p class="text-[9px] text-slate-400 italic">Click to add birds/butterflies with floating animation</p>
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
