<script setup lang="ts">
import { ref, computed, watch, nextTick, reactive, onUnmounted, onMounted } from 'vue';
import { type TemplateElement, type SectionType } from '@/lib/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';
import { getProxiedImageUrl, isR2Url } from '@/lib/image-utils';
import { iconPaths } from '@/lib/icon-paths';
import { shapePaths } from '@/lib/shape-paths';
import { useTemplateStore } from '@/stores/template';
import MapsPointElement from '@/components/elements/MapsPointElement.vue';
import LottieElement from '@/components/elements/LottieElement.vue';
import SvgBird from '@/components/elements/SvgBird.vue';
import SvgButterfly from '@/components/elements/SvgButterfly.vue';

// Track Shift key for bypassing boundaries
const isShiftPressed = ref(false);

const handleKeyDownGlobal = (e: KeyboardEvent) => {
    if (e.key === 'Shift') isShiftPressed.value = true;
};

const handleKeyUpGlobal = (e: KeyboardEvent) => {
    if (e.key === 'Shift') isShiftPressed.value = false;
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDownGlobal);
    window.addEventListener('keyup', handleKeyUpGlobal);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDownGlobal);
    window.removeEventListener('keyup', handleKeyUpGlobal);
    if (intervalId) clearInterval(intervalId);
});

interface Props {
  sectionType: SectionType;
  elements: TemplateElement[];
  selectedElementId: string | null;
  backgroundColor?: string;
  backgroundUrl?: string;
  overlayOpacity?: number;
  scale?: number;
  viewMode?: 'admin' | 'user';
  particleType?: 'none' | 'butterflies' | 'petals' | 'leaves' | 'sparkles';
  kenBurnsEnabled?: boolean;
  zoomConfig?: any; // ZoomAnimationConfig
  isActiveSection?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  backgroundColor: '#ffffff',
  scale: 1,
  viewMode: 'admin'
});

const store = useTemplateStore();

const emit = defineEmits<{
    (e: 'elementSelect', id: string | null): void;
    (e: 'elementDrag', id: string, position: { x: number; y: number }): void;
    (e: 'elementDragEnd', id: string, position: { x: number; y: number }): void;
    (e: 'elementTransformEnd', id: string, transform: { x: number; y: number; width: number; height: number; rotation: number }): void;
    // Legacy events if any?
    (e: 'select', id: string): void;
    (e: 'update', id: string, updates: Partial<TemplateElement>): void;
    (e: 'drag-end', id: string, x: number, y: number): void;
    (e: 'sectionZoomUpdate', updates: any): void;
}>();

// Canvas config
const configStage = computed(() => ({
  width: CANVAS_WIDTH * props.scale,
  height: CANVAS_HEIGHT * props.scale,
  scaleX: props.scale,
  scaleY: props.scale,
}));

const configBackground = computed(() => ({
  x: 0,
  y: 0,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  fill: props.backgroundColor,
  listening: false,
}));

const configOverlay = computed(() => ({
  x: 0,
  y: 0,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT, 
  fill: `rgba(0,0,0,${props.overlayOpacity || 0})`,
  listening: false,
  visible: !!(props.overlayOpacity && props.overlayOpacity > 0),
}));

// Images state
const loadedImages = reactive<Record<string, HTMLImageElement>>({});
const imageErrors = reactive<Record<string, boolean>>({});

const loadImages = () => {
    // 1. Bg Image
    if (props.backgroundUrl) {
        loadImage(props.backgroundUrl);
    }
    // 2. Element Images
    props.elements.forEach(el => {
        if (el.type === 'image' && el.imageUrl) {
            loadImage(el.imageUrl);
        }
    });
}

const loadImage = (url: string) => {
    if (loadedImages[url] || imageErrors[url]) return; // Already loaded or failed

    const proxiedUrl = getProxiedImageUrl(url);
    const img = new Image();
    
    // CRITICAL: Only set crossOrigin for R2 URLs that go through our proxy
    // External URLs (unsplash, etc) will fail CORS if we set crossOrigin
    if (isR2Url(url)) {
        img.crossOrigin = "Anonymous";
    }
    
    img.src = proxiedUrl;
    
    img.onload = () => {
        loadedImages[url] = img;
    };
    
    img.onerror = () => {
         // Retry once? Or just mark error
         console.error(`Failed to load image: ${url}`);
         imageErrors[url] = true;
    }
};

watch(() => [props.backgroundUrl, props.elements], loadImages, { deep: true, immediate: true });

const sortedElements = computed(() => {
    return [...props.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
});

// Separate GIF elements for HTML overlay rendering (Konva can't animate GIFs)
const gifElements = computed(() => {
    return sortedElements.value.filter(el => el.type === 'gif' && el.imageUrl);
});

// Maps Point elements for HTML overlay rendering (iframe)
const mapsElements = computed(() => {
    return sortedElements.value.filter(el => el.type === 'maps_point');
});

// All creature elements for HTML overlay rendering (Lottie + SVG animations)
const creatureElements = computed(() => {
    const creatureTypes = ['flying_bird', 'lottie_bird', 'lottie_butterfly', 'svg_bird', 'svg_butterfly', 'lottie'];
    return sortedElements.value.filter(el => creatureTypes.includes(el.type));
});

// Non-overlay elements for Konva canvas rendering  
const canvasElements = computed(() => {
    const overlayTypes = ['gif', 'maps_point', 'flying_bird', 'lottie_bird', 'lottie_butterfly', 'svg_bird', 'svg_butterfly', 'lottie'];
    return sortedElements.value.filter(el => !overlayTypes.includes(el.type));
});

// GIF drag/resize state
const gifDragState = reactive<{
    isDragging: boolean;
    isResizing: boolean;
    elementId: string | null;
    startX: number;
    startY: number;
    startPos: { x: number; y: number };
    startSize: { width: number; height: number };
    resizeCorner: string;
}>({
    isDragging: false,
    isResizing: false,
    elementId: null,
    startX: 0,
    startY: 0,
    startPos: { x: 0, y: 0 },
    startSize: { width: 0, height: 0 },
    resizeCorner: ''
});

// GIF drag handlers
const handleGifMouseDown = (e: MouseEvent, gif: TemplateElement) => {
    e.preventDefault();
    e.stopPropagation();
    
    emit('elementSelect', gif.id);
    
    gifDragState.isDragging = true;
    gifDragState.elementId = gif.id;
    gifDragState.startX = e.clientX;
    gifDragState.startY = e.clientY;
    gifDragState.startPos = { ...gif.position };
    
    window.addEventListener('mousemove', handleGifMouseMove);
    window.addEventListener('mouseup', handleGifMouseUp);
};

const handleGifResizeMouseDown = (e: MouseEvent, gif: TemplateElement, corner: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    gifDragState.isResizing = true;
    gifDragState.elementId = gif.id;
    gifDragState.startX = e.clientX;
    gifDragState.startY = e.clientY;
    gifDragState.startSize = { ...gif.size };
    gifDragState.startPos = { ...gif.position };
    gifDragState.resizeCorner = corner;
    
    window.addEventListener('mousemove', handleGifMouseMove);
    window.addEventListener('mouseup', handleGifMouseUp);
};

const handleGifMouseMove = (e: MouseEvent) => {
    if (!gifDragState.elementId) return;
    
    const deltaX = (e.clientX - gifDragState.startX) / props.scale;
    const deltaY = (e.clientY - gifDragState.startY) / props.scale;
    
    if (gifDragState.isDragging) {
        const newX = Math.round(gifDragState.startPos.x + deltaX);
        const newY = Math.round(gifDragState.startPos.y + deltaY);
        emit('elementDrag', gifDragState.elementId, { x: newX, y: newY });
    } else if (gifDragState.isResizing) {
        let newWidth = gifDragState.startSize.width;
        let newHeight = gifDragState.startSize.height;
        let newX = gifDragState.startPos.x;
        let newY = gifDragState.startPos.y;
        
        // Keep aspect ratio
        const aspectRatio = gifDragState.startSize.width / gifDragState.startSize.height;
        
        if (gifDragState.resizeCorner.includes('right')) {
            newWidth = Math.max(50, gifDragState.startSize.width + deltaX);
            newHeight = newWidth / aspectRatio;
        }
        if (gifDragState.resizeCorner.includes('left')) {
            newWidth = Math.max(50, gifDragState.startSize.width - deltaX);
            newHeight = newWidth / aspectRatio;
            newX = gifDragState.startPos.x + (gifDragState.startSize.width - newWidth);
        }
        if (gifDragState.resizeCorner.includes('bottom') && !gifDragState.resizeCorner.includes('left') && !gifDragState.resizeCorner.includes('right')) {
            newHeight = Math.max(50, gifDragState.startSize.height + deltaY);
            newWidth = newHeight * aspectRatio;
        }
        if (gifDragState.resizeCorner.includes('top') && !gifDragState.resizeCorner.includes('left') && !gifDragState.resizeCorner.includes('right')) {
            newHeight = Math.max(50, gifDragState.startSize.height - deltaY);
            newWidth = newHeight * aspectRatio;
            newY = gifDragState.startPos.y + (gifDragState.startSize.height - newHeight);
        }
        
        emit('elementTransformEnd', gifDragState.elementId, {
            x: Math.round(newX),
            y: Math.round(newY),
            width: Math.round(newWidth),
            height: Math.round(newHeight),
            rotation: 0
        });
    }
};

const handleGifMouseUp = () => {
    if (gifDragState.isDragging && gifDragState.elementId) {
        // Final position update
        const gif = props.elements.find(el => el.id === gifDragState.elementId);
        if (gif) {
            emit('elementDragEnd', gifDragState.elementId, { x: gif.position.x, y: gif.position.y });
        }
    }
    
    gifDragState.isDragging = false;
    gifDragState.isResizing = false;
    gifDragState.elementId = null;
    
    window.removeEventListener('mousemove', handleGifMouseMove);
    window.removeEventListener('mouseup', handleGifMouseUp);
};

const handleElementDblClick = (element: TemplateElement) => {
    if (element.type === 'text' || element.type === 'button') {
        const currentText = element.openInvitationConfig?.buttonText || element.content || '';
        const newText = prompt('Edit Text:', currentText);
        
        if (newText !== null && newText !== currentText) {
            let updates: Partial<TemplateElement> = { content: newText };
            
            // Special handling for open invitation button text
            if (element.type === 'button' && element.openInvitationConfig) {
                 updates = { 
                     ...updates,
                     openInvitationConfig: {
                         ...element.openInvitationConfig,
                         buttonText: newText
                     }
                 };
            }

            // Using store directly requires it to be initialized? 
            // We need to confirm store is available. 
            // The method logic relies on `store` variable which I need to make sure is available in scope.
            // I added `const store = useTemplateStore()` in imports previously?
            newText && store && store.updateElement(store.activeTemplateId!, props.sectionType, element.id, updates);
        }
    }
};

// --- MOTION PATH EDITING ---
const editingPathElement = computed(() => {
    if (!store.pathEditingId) return null;
    return props.elements.find(el => el.id === store.pathEditingId);
});

// Reference to the canvas container for extended path editing zone
const canvasContainer = ref<HTMLDivElement | null>(null);

// Handle clicks on the extended path editing zone (area outside canvas)
const handleExtendedPathClick = (e: MouseEvent) => {
    if (!store.pathEditingId || !editingPathElement.value || !canvasContainer.value) return;
    
    const rect = canvasContainer.value.getBoundingClientRect();
    // Calculate position relative to the canvas container, accounting for extended padding
    const extendedPadding = 200; // matches the CSS padding
    const x = Math.round((e.clientX - rect.left - extendedPadding) / props.scale);
    const y = Math.round((e.clientY - rect.top - extendedPadding) / props.scale);
    
    const points = [...(editingPathElement.value.motionPathConfig?.points || [])];
    points.push({ x, y });
    store.updateMotionPath(store.activeTemplateId!, props.sectionType, editingPathElement.value.id, points);
};

const handlePathPointDragMove = (e: any, index: number) => {
    if (!editingPathElement.value) return;
    const node = e.target;
    const points = [...(editingPathElement.value.motionPathConfig?.points || [])];
    points[index] = { x: Math.round(node.x()), y: Math.round(node.y()) };
    
    store.updateMotionPath(store.activeTemplateId!, props.sectionType, editingPathElement.value.id, points);
};

const handlePathPointClick = (e: any, index: number) => {
    e.cancelBubble = true;
    // Right click to remove point
    if (e.evt.button === 2) {
        if (!editingPathElement.value) return;
        const points = [...(editingPathElement.value.motionPathConfig?.points || [])];
        points.splice(index, 1);
        store.updateMotionPath(store.activeTemplateId!, props.sectionType, editingPathElement.value.id, points);
    }
};

const handleStageClick = (e: any) => {
    // If in path editing mode, add a point
    if (store.pathEditingId && editingPathElement.value) {
        const stageNode = e.target.getStage();
        const pointerPos = stageNode.getPointerPosition();
        if (pointerPos) {
            const x = Math.round(pointerPos.x / props.scale);
            const y = Math.round(pointerPos.y / props.scale);
            
            const points = [...(editingPathElement.value.motionPathConfig?.points || [])];
            points.push({ x, y });
            store.updateMotionPath(store.activeTemplateId!, props.sectionType, editingPathElement.value.id, points);
            return;
        }
    }

    // Deselect if clicked on empty stage
    if (e.target === e.target.getStage()) {
        emit('elementSelect', null);
    }
};

// Event Handlers

const handleDragEnd = (e: any, element: TemplateElement) => {
    const x = Math.round(e.target.x());
    const y = Math.round(e.target.y());
    emit('elementDragEnd', element.id, { x, y });
};

const handleDragMove = (e: any, element: TemplateElement) => {
    const node = e.target;
    let newX = node.x();
    let newY = node.y();

    // Apply virtual boundaries unless Shift is pressed
    if (!isShiftPressed.value) {
        const width = node.width() || element.size.width;
        const height = node.height() || element.size.height;
        
        // Clamp position within canvas bounds
        newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - width));
        newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - height));
        
        // Apply constrained position
        node.x(newX);
        node.y(newY);
    }

    emit('elementDrag', element.id, { x: Math.round(newX), y: Math.round(newY) });
};

const handleElementClick = (elementId: string) => {
    emit('elementSelect', elementId);
};

// Transformer Logic
const transformer = ref<any>(null);
const stage = ref<any>(null);

// Watch for selection change to attach transformer
watch(
  () => props.selectedElementId,
  async (newId) => {
    if (!transformer.value || !stage.value) return;

    await nextTick();
    const tr = transformer.value.getNode();
    const stageNode = stage.value.getStage();
    
    // If zoom box is active and no element selected, attach to selected zoom point
    if (!newId && props.isActiveSection && props.zoomConfig?.enabled) {
        const selectedIdx = props.zoomConfig.selectedPointIndex || 0;
        const zoomBoxNode = stageNode.findOne(`#zoom-target-box-${selectedIdx}`);
        if (zoomBoxNode) {
            tr.nodes([zoomBoxNode]);
            tr.moveToTop();
            tr.getLayer().batchDraw();
            return;
        }
    }

    if (!newId) {
        tr.nodes([]);
        tr.getLayer().batchDraw();
        return;
    }

    const selectedNode = stageNode.findOne('#' + newId);
    if (selectedNode) {
        tr.nodes([selectedNode]);
        tr.getLayer().batchDraw();
        tr.moveToTop(); 
    } else {
        tr.nodes([]);
        tr.getLayer().batchDraw();
    }
  }, 
  { flush: 'post' } 
);

// Watch for zoomConfig toggle while section is active to show/hide zoom target box transformer
watch(
    () => [props.isActiveSection, props.zoomConfig?.enabled],
    async ([active, enabled]) => {
        if (!transformer.value || !stage.value) return;
        if (props.selectedElementId) return; // Element selection takes priority

        await nextTick();
        const tr = transformer.value?.getNode?.();
        if (!tr) return; // Early exit if transformer node is not available
        
        const stageNode = stage.value?.getStage?.();
        if (!stageNode) return;

        if (active && enabled) {
            const selectedIdx = props.zoomConfig?.selectedPointIndex || 0;
            const zoomBoxNode = stageNode.findOne(`#zoom-target-box-${selectedIdx}`);
            if (zoomBoxNode) {
                tr.nodes([zoomBoxNode]);
                tr.moveToTop();
                tr.getLayer()?.batchDraw();
            }
        } else if (!props.selectedElementId) {
            tr.nodes([]);
            tr.getLayer().batchDraw();
        }
    }
);

// Watch for selectedPointIndex change to switch transformer to different zoom box
watch(
    () => props.zoomConfig?.selectedPointIndex,
    async (newIdx) => {
        if (!transformer.value || !stage.value) return;
        if (!props.isActiveSection || !props.zoomConfig?.enabled) return;
        if (props.selectedElementId) return; // Element selection takes priority
        
        await nextTick();
        const tr = transformer.value?.getNode?.();
        if (!tr) return;
        
        const stageNode = stage.value?.getStage?.();
        if (!stageNode) return;
        
        const idx = newIdx || 0;
        const zoomBoxNode = stageNode.findOne(`#zoom-target-box-${idx}`);
        if (zoomBoxNode) {
            tr.nodes([zoomBoxNode]);
            tr.moveToTop();
            tr.getLayer()?.batchDraw();
        }
    }
);

const ZOOM_TARGET_ID = 'zoom-target-box';

// Colors for different zoom points (cycle through)
const ZOOM_POINT_COLORS = [
    '#6366f1', // indigo
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#8b5cf6', // violet
    '#14b8a6', // teal
];

// Generate config for multiple zoom points
const zoomTargetConfigs = computed(() => {
    if (!props.zoomConfig?.enabled || !props.isActiveSection) return [];
    
    const points = props.zoomConfig.points || [];
    const selectedIdx = props.zoomConfig.selectedPointIndex || 0;
    
    // If no points set, fallback to legacy targetRegion as single point
    if (points.length === 0 && props.zoomConfig.targetRegion) {
        const tr = props.zoomConfig.targetRegion;
        const w = Math.max(20, (tr.width / 100) * CANVAS_WIDTH);
        const h = Math.max(20, (tr.height / 100) * CANVAS_HEIGHT);
        const px = (tr.x / 100) * CANVAS_WIDTH - w / 2;
        const py = (tr.y / 100) * CANVAS_HEIGHT - h / 2;
        
        return [{
            id: `${ZOOM_TARGET_ID}-0`,
            pointIndex: 0,
            x: px,
            y: py,
            width: w,
            height: h,
            draggable: true,
            stroke: ZOOM_POINT_COLORS[0],
            strokeWidth: 3,
            dash: [5, 5],
            fill: 'rgba(99, 102, 241, 0.08)',
            name: 'zoom-target',
            isSelected: true,
        }];
    }
    
    return points.map((point: { targetRegion?: { x: number; y: number; width: number; height: number } }, idx: number) => {
        const tr = point.targetRegion || { x: 50, y: 50, width: 50, height: 50 };
        const w = Math.max(20, (tr.width / 100) * CANVAS_WIDTH);
        const h = Math.max(20, (tr.height / 100) * CANVAS_HEIGHT);
        const px = (tr.x / 100) * CANVAS_WIDTH - w / 2;
        const py = (tr.y / 100) * CANVAS_HEIGHT - h / 2;
        
        const isSelected = idx === selectedIdx;
        const color = ZOOM_POINT_COLORS[idx % ZOOM_POINT_COLORS.length];
        
        return {
            id: `${ZOOM_TARGET_ID}-${idx}`,
            pointIndex: idx,
            x: px,
            y: py,
            width: w,
            height: h,
            draggable: true,
            stroke: color,
            strokeWidth: isSelected ? 3 : 2,
            dash: isSelected ? [5, 5] : [3, 3],
            fill: isSelected ? `${color}15` : `${color}08`,
            name: 'zoom-target',
            isSelected,
        };
    });
});

// Legacy single config removed - using zoomTargetConfigs array

const handleZoomTargetDragEnd = (e: any, pointIndex: number) => {
    const node = e.target;
    const w = node.width();
    const h = node.height();
    const cx = node.x() + w / 2;
    const cy = node.y() + h / 2;
    
    // Convert back to percentages
    const x = (cx / CANVAS_WIDTH) * 100;
    const y = (cy / CANVAS_HEIGHT) * 100;
    
    emit('sectionZoomUpdate', { 
        pointIndex,
        targetRegion: { x: Math.round(x), y: Math.round(y) } 
    });
};

const handleZoomTargetTransformEnd = (e: any, pointIndex: number) => {
    const node = e.target;
    // Get transformed dimensions
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const w = node.width() * scaleX;
    const h = node.height() * scaleY;
    const cx = node.x() + w / 2;
    const cy = node.y() + h / 2;
    
    // Reset internal node state
    node.scaleX(1);
    node.scaleY(1);
    node.width(w);
    node.height(h);
    
    // Convert to percentages
    const x = (cx / CANVAS_WIDTH) * 100;
    const y = (cy / CANVAS_HEIGHT) * 100;
    const pw = (w / CANVAS_WIDTH) * 100;
    const ph = (h / CANVAS_HEIGHT) * 100;
    
    emit('sectionZoomUpdate', { 
        pointIndex,
        targetRegion: { 
            x: Math.round(x), 
            y: Math.round(y), 
            width: Math.round(pw), 
            height: Math.round(ph) 
        } 
    });
};

const handleZoomTargetClick = (e: any, pointIndex: number) => {
    e.cancelBubble = true;
    // Select this point
    emit('sectionZoomUpdate', { selectedPointIndex: pointIndex });
};

const handleTransformEnd = () => {
   console.log('[KonvaCanvas] handleTransformEnd TRIGGERED');
   
   // Use the transformer ref, not e.target (e.target is the transformed node, not the transformer)
   if (!transformer.value) {
       console.warn('[KonvaCanvas] handleTransformEnd: No transformer ref');
       return;
   }
   
   const tr = transformer.value.getNode();
   const node = tr.nodes()[0];
   
   if (!node) {
       console.warn('[KonvaCanvas] handleTransformEnd: No node found in transformer');
       return;
   }

   const scaleX = node.scaleX();
   const scaleY = node.scaleY();

   // Reset scale to 1 and adjust width/height instead for consistent storage
   const newWidth = Math.max(5, node.width() * scaleX);
   const newHeight = Math.max(5, node.height() * scaleY);
   
   node.scaleX(1);
   node.scaleY(1);
   node.width(newWidth);
   node.height(newHeight);
   
   const emitPayload = {
       x: Math.round(node.x()),
       y: Math.round(node.y()),
       width: Math.round(newWidth),
       height: Math.round(newHeight),
       rotation: Math.round(node.rotation())
   };
   console.log('[KonvaCanvas] Emitting elementTransformEnd with:', props.selectedElementId, emitPayload);
   if (props.selectedElementId) {
       emit('elementTransformEnd', props.selectedElementId, emitPayload);
   }
};

// Countdown Logic
const timeLeft = reactive<{ [key: string]: { days: string; hours: string; minutes: string; seconds: string } }>({});
let intervalId: any = null;

const calculateTimeLeft = () => {
    props.elements.forEach(element => {
        if (element.type === 'countdown' && element.countdownConfig?.targetDate) {
            const difference = +new Date(element.countdownConfig.targetDate) - +new Date();
            let timeLeftForElement = { days: '00', hours: '00', minutes: '00', seconds: '00' };

            if (difference > 0) {
                timeLeftForElement = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)).toString().padStart(2, '0'),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24).toString().padStart(2, '0'),
                    minutes: Math.floor((difference / 1000 / 60) % 60).toString().padStart(2, '0'),
                    seconds: Math.floor((difference / 1000) % 60).toString().padStart(2, '0')
                };
            }
            timeLeft[element.id] = timeLeftForElement;
        }
    });
};

watch(() => props.elements, () => {
    calculateTimeLeft();
    if (!intervalId) {
        intervalId = setInterval(calculateTimeLeft, 1000);
    }
}, { deep: true, immediate: true });

// Cleanup interval in the global onUnmounted (moved to top)

// Helper to get visible countdown items based on config
const getVisibleCountdownItems = (element: TemplateElement, customLabels?: { days: string; hours: string; minutes: string; seconds: string }) => {
    const config = (element.countdownConfig || {}) as any;
    const tl = timeLeft[element.id] || { days: '00', hours: '00', minutes: '00', seconds: '00' };
    const labels = customLabels || { days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds' };
    
    const items = [];
    if (config.showDays !== false) items.push({ val: tl.days, label: labels.days, key: 'days' });
    if (config.showHours !== false) items.push({ val: tl.hours, label: labels.hours, key: 'hours' });
    if (config.showMinutes !== false) items.push({ val: tl.minutes, label: labels.minutes, key: 'minutes' });
    if (config.showSeconds !== false) items.push({ val: tl.seconds, label: labels.seconds, key: 'seconds' });
    
    return items;
};

const getVisibleRSVPFields = (element: TemplateElement) => {
    const config = (element.rsvpFormConfig || {}) as any;
    const fields = [];
    if (config.showNameField !== false) fields.push({ name: 'name', label: config.nameLabel || 'Nama' });
    if (config.showEmailField !== false) fields.push({ name: 'email', label: config.emailLabel || 'Email' });
    if (config.showPhoneField !== false) fields.push({ name: 'phone', label: config.phoneLabel || 'Telepon' });
    if (config.showAttendanceField !== false) fields.push({ name: 'attendance', label: config.attendanceLabel || 'Kehadiran' });
    if (config.showMessageField !== false) fields.push({ name: 'message', label: config.messageLabel || 'Pesan' });
    return fields;
};

// Helper for Classic style text
const getClassicCountdownText = (element: TemplateElement) => {
    const items = getVisibleCountdownItems(element); // Use default English labels (not shown in string anyway)
    return items.map(item => item.val).join(' : ');
};

const getClassicLabelText = (element: TemplateElement) => {
     const items = getVisibleCountdownItems(element);
     return items.map(item => item.label).join('  ');
};

// --- STYLE HELPERS ---
const getElementStyleConfig = (style: string, primaryColor: string, shape?: string) => {
    const s = style || 'classic';
    const config = {
        fill: '#ffffff',
        stroke: null as string | null,
        strokeWidth: 0,
        cornerRadius: 0,
        shadowColor: 'black',
        shadowBlur: 0,
        shadowOpacity: 0,
        shadowOffset: { x: 0, y: 0 },
        opacity: 1
    };

    // Base Shape Corner Radius
    if (shape === 'pill' || shape === 'stadium') {
        config.cornerRadius = 9999;
    } else if (shape === 'rounded') {
        config.cornerRadius = 12;
    } else {
        config.cornerRadius = 0; // rectangle
    }

    switch (s) {
        case 'classic':
            config.fill = '#ffffff';
            config.stroke = '#e2e8f0';
            config.strokeWidth = 1;
            break;
        case 'minimal':
            config.fill = '#ffffff';
            config.stroke = null;
            config.shadowBlur = 5;
            config.shadowOpacity = 0.05;
            break;
        case 'modern':
            config.fill = '#ffffff';
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 16;
            config.shadowBlur = 20;
            config.shadowOpacity = 0.1;
            config.shadowOffset = { x: 0, y: 10 };
            break;
        case 'elegant':
            config.fill = '#fdfbf7'; // Warm white
            config.stroke = primaryColor;
            config.strokeWidth = 1;
            if (shape !== 'pill' && shape !== 'stadium' && shape !== 'rounded') config.cornerRadius = 4;
            break;
        case 'rustic':
            config.fill = '#fffaf0'; // Floral white
            config.stroke = '#8b4513';
            config.strokeWidth = 1;
            break;
        case 'romantic':
            config.fill = '#fff0f5'; // Lavender blush
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 24;
            config.shadowColor = '#ffb6c1';
            config.shadowBlur = 10;
            config.shadowOpacity = 0.3;
            break;
        case 'bold':
            config.fill = '#ffffff';
            config.stroke = '#000000';
            config.strokeWidth = 4;
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 0;
            config.shadowColor = '#000000';
            config.shadowOffset = { x: 6, y: 6 };
            config.shadowOpacity = 1;
            break;
        case 'vintage':
            config.fill = '#f5f5dc'; // Beige
            config.stroke = '#8b4513';
            config.strokeWidth = 2;
            if (shape !== 'pill' && shape !== 'stadium' && shape !== 'rounded') config.cornerRadius = 2;
            break;
        case 'boho':
            config.fill = '#fbf7f5';
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 30; // Very round
            config.stroke = '#d2b48c'; // Tan
            config.strokeWidth = 1;
            break;
        case 'luxury':
            config.fill = '#1a1a1a';
            config.stroke = '#ffd700'; // Gold
            config.strokeWidth = 2;
            if (shape !== 'pill' && shape !== 'stadium' && shape !== 'rounded') config.cornerRadius = 8;
            config.shadowColor = '#ffd700';
            config.shadowBlur = 15;
            config.shadowOpacity = 0.2;
            break;
        case 'dark':
            config.fill = '#1e293b';
            config.stroke = '#334155';
            config.strokeWidth = 1;
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 12;
            break;
        case 'glass':
            config.fill = 'rgba(255, 255, 255, 0.7)';
            config.stroke = 'rgba(255, 255, 255, 0.5)';
            config.strokeWidth = 1;
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 16;
            config.shadowBlur = 10;
            config.shadowOpacity = 0.1;
            break;
        case 'outline':
            config.fill = 'transparent';
            config.stroke = primaryColor;
            config.strokeWidth = 2;
            if (shape !== 'pill' && shape !== 'stadium' && shape !== 'rounded') config.cornerRadius = 8;
            break;
        case 'geometric':
            config.fill = '#ffffff';
            config.stroke = '#000000';
            config.strokeWidth = 2;
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 0;
            break;
        case 'floral':
            config.fill = '#fff5f7';
            config.stroke = '#ffc0cb';
            config.strokeWidth = 1;
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 20;
            break;
        case 'pastel':
            config.fill = '#f0f9ff'; // Alice blue
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 12;
            config.shadowBlur = 5;
            config.shadowColor = '#bae6fd';
            config.shadowOpacity = 0.5;
            break;
        case 'monochrome':
            config.fill = '#ffffff';
            config.stroke = '#000000';
            config.strokeWidth = 1;
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 0;
            break;
        case 'neon':
            config.fill = '#000000';
            config.stroke = primaryColor;
            config.strokeWidth = 2;
            config.shadowColor = primaryColor;
            config.shadowBlur = 20;
            config.shadowOpacity = 0.8;
            if (shape !== 'pill' && shape !== 'stadium' && shape !== 'rounded') config.cornerRadius = 8;
            break;
        case 'brutalist':
            config.fill = '#e2e8f0';
            config.stroke = '#000000';
            config.strokeWidth = 3;
            config.shadowColor = '#000000';
            config.shadowOffset = { x: 8, y: 8 };
            config.shadowOpacity = 1;
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 0;
            break;
        case 'cloud':
            config.fill = '#ffffff';
            if (shape !== 'pill' && shape !== 'stadium') config.cornerRadius = 50;
            config.shadowBlur = 25;
            config.shadowColor = '#cbd5e1';
            config.shadowOpacity = 0.5;
            config.shadowOffset = { x: 0, y: 5 };
            break;
    }
    return config;
};

const getRSVPStyleConfig = (element: TemplateElement) => {
    const config = (element.rsvpFormConfig || { style: 'classic' }) as any;
    const base = getElementStyleConfig(config.style as string, config.buttonColor || '#000000');
    // Overrides
    if (config.backgroundColor) base.fill = config.backgroundColor;
    if (config.borderColor) base.stroke = config.borderColor;
    
    // Input field style derived from base
    const inputStyle = {
        fill: config.style === 'dark' || config.style === 'luxury' || config.style === 'neon' ? 'rgba(255,255,255,0.1)' : '#f8fafc',
        stroke: base.stroke || '#e2e8f0',
        cornerRadius: base.cornerRadius > 4 ? 8 : base.cornerRadius
    };
    
    return { ...base, inputStyle };
};

const getGuestWishesStyleConfig = (element: TemplateElement) => {
    const config = (element.guestWishesConfig || { style: 'classic' }) as any;
    const base = getElementStyleConfig(config.style as string, config.cardBorderColor || '#000000');
    if (config.cardBackgroundColor) base.fill = config.cardBackgroundColor;
    if (config.cardBorderColor) base.stroke = config.cardBorderColor;
    return base;
};

</script>

<template>
  <!-- Extended Path Editing Zone - visible when editing path to allow clicks outside canvas -->
  <div 
    ref="canvasContainer"
    class="relative"
    :class="{ 'path-edit-zone': store.pathEditingId }"
    @click.self="handleExtendedPathClick"
  >
    <div class="relative bg-white shadow-sm">
    <v-stage 
        ref="stage"
        :config="configStage" 
        @mousedown="handleStageClick" 
        @touchstart="handleStageClick"
    >
      <v-layer>
        <!-- Background Color -->
        <v-rect :config="configBackground" />

        <!-- Background Image -->
        <v-image
            v-if="backgroundUrl && loadedImages[backgroundUrl]"
            :config="{
                image: loadedImages[backgroundUrl],
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                listening: false
            }"
        />

        <!-- Overlay -->
        <v-rect :config="configOverlay" />

        <!-- Elements (excluding GIFs which are rendered as HTML overlay) -->
        <v-group
          v-for="element in canvasElements"
          :key="element.id"
          :config="{
            x: element.position.x,
            y: element.position.y,
            width: element.size.width,
            height: element.size.height,
            rotation: element.rotation || 0,
            scaleX: element.flipHorizontal ? -1 : 1,
            scaleY: element.flipVertical ? -1 : 1,
            offsetX: element.flipHorizontal ? element.size.width : 0,
            offsetY: element.flipVertical ? element.size.height : 0,
            draggable: true,
            id: element.id,
            name: 'element-' + element.id 
          }"
          @dragend="(e: any) => handleDragEnd(e, element)"
          @dragmove="(e: any) => handleDragMove(e, element)"
          @click="(e: any) => { e.cancelBubble = true; handleElementClick(element.id); }"
          @tap="(e: any) => { e.cancelBubble = true; handleElementClick(element.id); }"
          @dblclick="(e: any) => { e.cancelBubble = true; handleElementDblClick(element); }"
          @transformend="handleTransformEnd"
        >
            <!-- CRITICAL: Hit area for click detection. Without this, clicks don't register because all other children have listening: false -->
            <v-rect
                :config="{
                    width: element.size.width,
                    height: element.size.height,
                    fill: 'transparent',
                    listening: true,
                    perfectDrawEnabled: false
                }"
            />
            
            <!-- Image Element -->
            <v-image
                v-if="element.type === 'image' && element.imageUrl && loadedImages[element.imageUrl]"
                :config="{
                    image: loadedImages[element.imageUrl],
                    width: element.size.width,
                    height: element.size.height,
                    crop: element.cropRect,
                    opacity: element.opacity ?? 1,
                    listening: false
                }"
             />
             
             <!-- Image Placeholder/Error -->
             <v-group v-else-if="element.type === 'image'">
                  <v-rect
                    :config="{
                        width: element.size.width,
                        height: element.size.height,
                        fill: '#f1f5f9',
                        stroke: '#cbd5e1',
                        strokeWidth: 1,
                        dash: [5, 5],
                        listening: false
                    }"
                 />
                 <v-text
                    :config="{
                        text: imageErrors[element.imageUrl || ''] ? 'Failed to Load' : 'Loading Image...',
                        width: element.size.width,
                        height: element.size.height,
                        align: 'center',
                        verticalAlign: 'middle',
                        fill: imageErrors[element.imageUrl || ''] ? '#ef4444' : '#64748b',
                        fontSize: 12,
                        listening: false
                    }"
                 />
             </v-group>

            <!-- SHAPE ELEMENT -->
            <template v-if="element.type === 'shape' && element.shapeConfig">
                <!-- Rectangle -->
                <v-rect
                    v-if="element.shapeConfig.shapeType === 'rectangle'"
                    :config="{
                        width: element.size.width,
                        height: element.size.height,
                        fill: element.shapeConfig.fill ?? undefined,
                        stroke: element.shapeConfig.stroke ?? undefined,
                        strokeWidth: element.shapeConfig.stroke ? element.shapeConfig.strokeWidth : 0,
                        cornerRadius: element.shapeConfig.cornerRadius || 0,
                        listening: false
                    }"
                />
                
                <!-- Circle -->
                <v-circle
                    v-else-if="element.shapeConfig.shapeType === 'circle'"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        radius: Math.min(element.size.width, element.size.height) / 2,
                        fill: element.shapeConfig.fill ?? undefined,
                        stroke: element.shapeConfig.stroke ?? undefined,
                        strokeWidth: element.shapeConfig.stroke ? element.shapeConfig.strokeWidth : 0,
                        listening: false
                    }"
                />
                
                <!-- Ellipse -->
                <v-ellipse
                    v-else-if="element.shapeConfig.shapeType === 'ellipse'"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        radiusX: element.size.width / 2,
                        radiusY: element.size.height / 2,
                        fill: element.shapeConfig.fill ?? undefined,
                        stroke: element.shapeConfig.stroke ?? undefined,
                        strokeWidth: element.shapeConfig.stroke ? element.shapeConfig.strokeWidth : 0,
                        listening: false
                    }"
                />
                
                <!-- Triangle -->
                <v-regular-polygon
                    v-else-if="element.shapeConfig.shapeType === 'triangle'"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        sides: 3,
                        radius: Math.min(element.size.width, element.size.height) / 2,
                        fill: element.shapeConfig.fill ?? undefined,
                        stroke: element.shapeConfig.stroke ?? undefined,
                        strokeWidth: element.shapeConfig.stroke ? element.shapeConfig.strokeWidth : 0,
                        listening: false
                    }"
                />
                
                <!-- Polygons (Pentagon, Hexagon, etc.) -->
                <v-regular-polygon
                    v-else-if="['pentagon', 'hexagon', 'octagon'].includes(element.shapeConfig.shapeType)"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        sides: element.shapeConfig.shapeType === 'pentagon' ? 5 : element.shapeConfig.shapeType === 'hexagon' ? 6 : 8,
                        radius: Math.min(element.size.width, element.size.height) / 2,
                        fill: element.shapeConfig.fill ?? undefined,
                        stroke: element.shapeConfig.stroke ?? undefined,
                        strokeWidth: element.shapeConfig.stroke ? element.shapeConfig.strokeWidth : 0,
                        listening: false
                    }"
                />

                <!-- Star -->
                <v-star
                    v-else-if="(element.shapeConfig.shapeType as string) === 'star' || element.shapeConfig.shapeType.startsWith('star-')"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        numPoints: element.shapeConfig.shapeType === 'star-4' ? 4 : element.shapeConfig.shapeType === 'star-6' ? 6 : element.shapeConfig.shapeType === 'star-8' ? 8 : (element.shapeConfig.points || 5),
                        innerRadius: Math.min(element.size.width, element.size.height) * (element.shapeConfig.innerRadius || 0.4) / 2,
                        outerRadius: Math.min(element.size.width, element.size.height) / 2,
                        fill: element.shapeConfig.fill ?? undefined,
                        stroke: element.shapeConfig.stroke ?? undefined,
                        strokeWidth: element.shapeConfig.stroke ? element.shapeConfig.strokeWidth : 0,
                        listening: false
                    }"
                />
                
                <!-- Line -->
                <v-line
                    v-else-if="element.shapeConfig.shapeType === 'line'"
                    :config="{
                        points: [0, element.size.height / 2, element.size.width, element.size.height / 2],
                        stroke: element.shapeConfig.stroke || '#000000',
                        strokeWidth: element.shapeConfig.strokeWidth || 2,
                        listening: false
                    }"
                />

                <!-- Generic SVG Path Shapes -->
                <v-path
                    v-else
                    :config="{
                        data: shapePaths[element.shapeConfig.shapeType] || element.shapeConfig.pathData || '',
                        fill: element.shapeConfig.fill ?? undefined,
                        stroke: element.shapeConfig.stroke ?? undefined,
                        strokeWidth: element.shapeConfig.stroke ? element.shapeConfig.strokeWidth : 0,
                        scaleX: element.size.width / 100,
                        scaleY: element.size.height / 100,
                        listening: false,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }"
                />
            </template>

            <!-- Text Element -->
            <v-text
                v-if="element.type === 'text' && element.textStyle"
                :config="{
                    text: element.content || '',
                    fontSize: element.textStyle.fontSize,
                    fontFamily: element.textStyle.fontFamily,
                    fontStyle: element.textStyle.fontStyle,
                    fill: element.textStyle.color,
                    align: element.textStyle.textAlign,
                    width: element.size.width,
                    height: element.size.height,
                    verticalAlign: 'middle',
                    listening: false,
                    wrap: 'word'
                }"
            />

            <!-- Countdown Element -->
            <v-group v-if="element.type === 'countdown'">
                <!-- Hit Area for selection -->
                <v-rect :config="{ width: element.size.width, height: element.size.height, fill: 'transparent', listening: true }" />

                <!-- 1. CLASSIC STYLE -->
                <!-- 1. CLASSIC STYLE -->
                <!-- 1. CLASSIC STYLE -->
                <v-group v-if="!element.countdownConfig?.style || element.countdownConfig.style === 'classic'">
                     <v-rect :config="{ width: element.size.width, height: element.size.height, fill: element.countdownConfig?.backgroundColor || '#f8fafc', stroke: '#e2e8f0', cornerRadius: 8, listening: false }" />
                     <v-text :config="{ text: getClassicCountdownText(element), width: element.size.width, height: element.size.height, align: 'center', verticalAlign: 'middle', fontSize: element.countdownConfig?.fontSize || 24, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fill: element.countdownConfig?.digitColor || '#334155', listening: false }" />
                     <v-text :config="{ text: getClassicLabelText(element), width: element.size.width, y: element.size.height / 2 + (element.countdownConfig?.fontSize || 24), align: 'center', fontSize: 10, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fill: element.countdownConfig?.labelColor || '#94a3b8', listening: false }" />
                </v-group>

                <!-- 2. MINIMAL STYLE -->
                <!-- 2. MINIMAL STYLE -->
                <v-group v-else-if="element.countdownConfig.style === 'minimal'">
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length), width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length }">
                        <v-text :config="{ text: item.val || '00', width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.3, align: 'center', fontSize: element.countdownConfig?.fontSize || 28, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.digitColor || '#1e293b', listening: false }" />
                        <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.7, align: 'center', fontSize: 10, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fill: element.countdownConfig?.labelColor || '#64748b', listening: false }" />
                    </v-group>
                </v-group>

                <!-- 3. BOX STYLE (Card / Clean White Box) -->
                <!-- 3. BOX STYLE (Card / Clean White Box) -->
                <v-group v-else-if="element.countdownConfig.style === 'box' || element.countdownConfig.style === 'card'">
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'HARI', hours:'JAM', minutes:'MENIT', seconds:'DETIK'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element).length), width: element.size.width / getVisibleCountdownItems(element).length }">
                        <v-rect :config="{ x: 4, y: 0, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: element.size.width / getVisibleCountdownItems(element).length, fill: element.countdownConfig?.backgroundColor || '#ffffff', cornerRadius: 10, shadowColor: 'black', shadowBlur: 10, shadowOpacity: 0.1, listening: false }" />
                        <v-text :config="{ text: item.val || '00', x: 4, y: 2, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: element.size.width / getVisibleCountdownItems(element).length, align: 'center', verticalAlign: 'middle', fontSize: element.countdownConfig?.fontSize || 28, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.digitColor || '#000000', listening: false }" />
                        <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element).length, y: (element.size.width / getVisibleCountdownItems(element).length) + 10, align: 'center', fontSize: 10, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.labelColor || '#ffffff', listening: false }" />
                    </v-group>
                </v-group>

                <!-- 4. CIRCLE STYLE (Progress Ring) -->
                <!-- 4. CIRCLE STYLE (Progress Ring) -->
                <v-group v-else-if="element.countdownConfig.style === 'circle'">
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'HARI', hours:'JAM', minutes:'MENIT', seconds:'DETIK'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element).length), width: element.size.width / getVisibleCountdownItems(element).length }">
                        <!-- Ring Background -->
                        <v-arc :config="{ x: (element.size.width / getVisibleCountdownItems(element).length) / 2, y: (element.size.width / getVisibleCountdownItems(element).length) / 2, innerRadius: ((element.size.width / getVisibleCountdownItems(element).length) / 2) - 4, outerRadius: ((element.size.width / getVisibleCountdownItems(element).length) / 2), angle: 360, fill: element.countdownConfig?.backgroundColor || '#ffffff', opacity: 1, listening: false }" />
                        <!-- Ring Progress -->
                        <v-arc :config="{ x: (element.size.width / getVisibleCountdownItems(element).length) / 2, y: (element.size.width / getVisibleCountdownItems(element).length) / 2, innerRadius: ((element.size.width / getVisibleCountdownItems(element).length) / 2) - 4, outerRadius: ((element.size.width / getVisibleCountdownItems(element).length) / 2), angle: 360 * (parseInt(item.val || '0') / 60), rotation: -90, fill: element.countdownConfig?.accentColor || '#000000', listening: false }" />
                        
                        <v-text :config="{ text: item.val || '00', x: 0, y: ((element.size.width / getVisibleCountdownItems(element).length) / 2) - ((element.countdownConfig?.fontSize || 20)/2) - 5, width: element.size.width / getVisibleCountdownItems(element).length, align: 'center', fontSize: element.countdownConfig?.fontSize || 20, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.digitColor || '#000000', listening: false }" />
                        <v-text :config="{ text: item.label, x: 0, y: ((element.size.width / getVisibleCountdownItems(element).length) / 2) + ((element.countdownConfig?.fontSize || 20)/2), width: element.size.width / getVisibleCountdownItems(element).length, align: 'center', fontSize: 9, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.labelColor || '#ffffff', listening: false }" />
                    </v-group>
                </v-group>

                <!-- 5. MODERN STYLE (Gradient/Soft Box) -->
                <!-- 5. MODERN STYLE (Gradient/Soft Box) -->
                <v-group v-else-if="element.countdownConfig.style === 'modern'">
                     <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'HARI', hours:'JAM', minutes:'MENIT', seconds:'DETIK'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element).length), width: element.size.width / getVisibleCountdownItems(element).length }">
                        <v-rect :config="{ x: 4, y: 0, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: element.size.width / getVisibleCountdownItems(element).length, fill: element.countdownConfig?.backgroundColor || '#ffffff', opacity: 0.1, cornerRadius: 10, listening: false }" />
                        <v-rect :config="{ x: 4, y: 0, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: element.size.width / getVisibleCountdownItems(element).length, fillLinearGradientStartPoint: { x: 0, y: 0 }, fillLinearGradientEndPoint: { x: (element.size.width / getVisibleCountdownItems(element).length) - 8, y: element.size.width / getVisibleCountdownItems(element).length }, fillLinearGradientColorStops: [0, 'rgba(255,255,255,0.7)', 1, 'rgba(255,255,255,0.2)'], cornerRadius: 10, shadowColor: 'black', shadowBlur: 5, shadowOpacity: 0.1, listening: false }" />
                        
                        <v-text :config="{ text: item.val || '00', x: 4, y: 2, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: element.size.width / getVisibleCountdownItems(element).length, align: 'center', verticalAlign: 'middle', fontSize: element.countdownConfig?.fontSize || 30, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.digitColor || '#000000', listening: false }" />
                        <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element).length, y: (element.size.width / getVisibleCountdownItems(element).length) + 10, align: 'center', fontSize: 10, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.labelColor || '#ffffff', listening: false }" />
                     </v-group>
                </v-group>

                <!-- 6. ELEGANT STYLE -->
                <!-- 6. ELEGANT STYLE -->
                <!-- 6. ELEGANT STYLE -->
                <v-group v-else-if="element.countdownConfig.style === 'elegant'">
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'Days', hours:'Hours', minutes:'Minutes', seconds:'Seconds'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element).length), width: element.size.width / getVisibleCountdownItems(element).length }">
                         <v-rect v-if="i > 0" :config="{ x: 0, y: element.size.height * 0.25, width: 1, height: element.size.height * 0.5, fill: element.countdownConfig.accentColor || '#b8860b', opacity: 0.3, listening: false }" />
                         <v-text :config="{ text: item.val || '00', width: element.size.width / getVisibleCountdownItems(element).length, y: element.size.height * 0.25, align: 'center', fontSize: element.countdownConfig?.fontSize || 26, fontFamily: element.countdownConfig?.fontFamily || 'Playfair Display', fontStyle: 'italic', fill: element.countdownConfig?.digitColor || '#b8860b', listening: false }" />
                         <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element).length, y: element.size.height * 0.75, align: 'center', fontSize: 10, fontFamily: element.countdownConfig?.fontFamily || 'Playfair Display', fill: element.countdownConfig?.labelColor || '#b8860b', listening: false }" />
                    </v-group>
                </v-group>

                <!-- 7. NEON STYLE -->
                <!-- 7. NEON STYLE -->
                <v-group v-else-if="element.countdownConfig.style === 'neon'">
                    <v-rect :config="{ width: element.size.width, height: element.size.height, fill: '#0f172a', cornerRadius: 8, listening: false }" />
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length), width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length }">
                        <v-text :config="{ text: item.val || '00', width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.25, align: 'center', fontSize: 24, fontFamily: 'monospace', fill: '#00ff9d', shadowColor: '#00ff9d', shadowBlur: 10, listening: false }" />
                        <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.65, align: 'center', fontSize: 10, fill: '#00ff9d', opacity: 0.8, listening: false }" />
                    </v-group>
                </v-group>

                <!-- 8. STICKER STYLE -->
                <!-- 8. STICKER STYLE -->
                <v-group v-else-if="element.countdownConfig.style === 'sticker'">
                     <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'Days', hours:'Hrs', minutes:'Mins', seconds:'Secs'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element, {days:'Days', hours:'Hrs', minutes:'Mins', seconds:'Secs'}).length), width: element.size.width / getVisibleCountdownItems(element, {days:'Days', hours:'Hrs', minutes:'Mins', seconds:'Secs'}).length }">
                        <v-text :config="{ text: item.val || '00', x: 2, y: element.size.height * 0.2 + 2, width: element.size.width / getVisibleCountdownItems(element, {days:'Days', hours:'Hrs', minutes:'Mins', seconds:'Secs'}).length, align: 'center', fontSize: 22, fontFamily: 'Arial', fontStyle: 'bold', fill: '#000000', stroke: '#ffffff', strokeWidth: 4, lineJoin: 'round', listening: false }" />
                        <v-text :config="{ text: item.val || '00', x: 2, y: element.size.height * 0.2 + 2, width: element.size.width / getVisibleCountdownItems(element, {days:'Days', hours:'Hrs', minutes:'Mins', seconds:'Secs'}).length, align: 'center', fontSize: 22, fontFamily: 'Arial', fontStyle: 'bold', fill: '#000000', listening: false }" />
                        <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element, {days:'Days', hours:'Hrs', minutes:'Mins', seconds:'Secs'}).length, y: element.size.height * 0.7, align: 'center', fontSize: 10, fill: '#000000', fontStyle: 'italic', listening: false }" />
                     </v-group>
                </v-group>

                <!-- 9. TAPE STYLE -->
                <!-- 9. TAPE STYLE -->
                <v-group v-else-if="element.countdownConfig.style === 'tape'">
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'DAYS', hours:'HRS', minutes:'MIN', seconds:'SEC'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element, {days:'DAYS', hours:'HRS', minutes:'MIN', seconds:'SEC'}).length), width: element.size.width / getVisibleCountdownItems(element, {days:'DAYS', hours:'HRS', minutes:'MIN', seconds:'SEC'}).length }">
                        <v-rect :config="{ x: 5, y: element.size.height * 0.2, width: (element.size.width / getVisibleCountdownItems(element, {days:'DAYS', hours:'HRS', minutes:'MIN', seconds:'SEC'}).length) - 10, height: element.size.height * 0.5, fill: '#f1f5f9', opacity: 0.8, rotation: (i % 2 === 0 ? 2 : -2), shadowColor: 'black', shadowBlur: 2, listening: false }" />
                        <v-text :config="{ text: item.val || '00', width: element.size.width / getVisibleCountdownItems(element, {days:'DAYS', hours:'HRS', minutes:'MIN', seconds:'SEC'}).length, y: element.size.height * 0.3, align: 'center', fontSize: 20, fontFamily: 'Courier New', fill: '#334155', rotation: (i % 2 === 0 ? 2 : -2), listening: false }" />
                        <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element, {days:'DAYS', hours:'HRS', minutes:'MIN', seconds:'SEC'}).length, y: element.size.height * 0.75, align: 'center', fontSize: 8, fill: '#94a3b8', spacing: 1, listening: false }" />
                    </v-group>
                </v-group>

                <!-- 10. GLITCH STYLE -->
                <!-- 10. GLITCH STYLE -->
                <v-group v-else-if="element.countdownConfig.style === 'glitch'">
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length), width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length }">
                         <v-text :config="{ text: item.val || '00', width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.25, align: 'center', fontSize: 28, fontFamily: 'Arial', fontStyle: 'bold', fill: '#ff00ff', x: 2, opacity: 0.7, listening: false }" />
                         <v-text :config="{ text: item.val || '00', width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.25, align: 'center', fontSize: 28, fontFamily: 'Arial', fontStyle: 'bold', fill: '#00ffff', x: -2, opacity: 0.7, listening: false }" />
                         <v-text :config="{ text: item.val || '00', width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.25, align: 'center', fontSize: 28, fontFamily: 'Arial', fontStyle: 'bold', fill: '#ffffff', listening: false }" />
                         <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element, {days:'D', hours:'H', minutes:'M', seconds:'S'}).length, y: element.size.height * 0.65, align: 'center', fontSize: 10, fill: '#ffffff', fontStyle: 'bold', listening: false }" />
                    </v-group>
                </v-group>

                <!-- 11. FLIP STYLE (Split-Flap) -->
                <!-- 11. FLIP STYLE (Split-Flap) -->
                <v-group v-else-if="element.countdownConfig.style === 'flip'">
                    <v-group v-for="(item, i) in getVisibleCountdownItems(element, {days:'HARI', hours:'JAM', minutes:'MENIT', seconds:'DETIK'})" :key="item.key" :config="{ x: i * (element.size.width / getVisibleCountdownItems(element).length), width: element.size.width / getVisibleCountdownItems(element).length }">
                        <!-- Upper Flap: Round top corners only -->
                        <v-rect :config="{ x: 4, y: 0, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: (element.size.width / getVisibleCountdownItems(element).length) / 2, fill: element.countdownConfig?.backgroundColor || '#1e293b', cornerRadius: [6, 6, 0, 0], listening: false }" />
                         <!-- Lower Flap: Round bottom corners only -->
                        <v-rect :config="{ x: 4, y: ((element.size.width / getVisibleCountdownItems(element).length) / 2) + 1, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: ((element.size.width / getVisibleCountdownItems(element).length) / 2) - 1, fill: element.countdownConfig?.backgroundColor || '#1e293b', cornerRadius: [0, 0, 6, 6], listening: false }" />
                         
                        <!-- Split Line -->
                        <v-line :config="{ points: [4, (element.size.width / getVisibleCountdownItems(element).length) / 2, (element.size.width / getVisibleCountdownItems(element).length) - 4, (element.size.width / getVisibleCountdownItems(element).length) / 2], stroke: 'black', strokeWidth: 2, opacity: 0.5, listening: false }" />
                        
                        <v-text :config="{ text: item.val || '00', x: 4, y: 2, width: (element.size.width / getVisibleCountdownItems(element).length) - 8, height: element.size.width / getVisibleCountdownItems(element).length, align: 'center', verticalAlign: 'middle', fontSize: element.countdownConfig?.fontSize || 32, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.digitColor || '#ffffff', listening: false }" />
                        <v-text :config="{ text: item.label, width: element.size.width / getVisibleCountdownItems(element).length, y: (element.size.width / getVisibleCountdownItems(element).length) + 10, align: 'center', fontSize: 10, fontFamily: element.countdownConfig?.fontFamily || 'Inter', fontStyle: 'bold', fill: element.countdownConfig?.labelColor || '#ffffff', listening: false }" />
                    </v-group>
                </v-group>
            </v-group>
             <!-- RSVP Form Element -->
            <v-group v-if="element.type === 'rsvp-form' || element.type === 'rsvp_form'">
                 <v-rect
                    :config="{
                        width: element.size.width,
                        height: element.size.height,
                        fill: getRSVPStyleConfig(element).fill,
                        stroke: getRSVPStyleConfig(element).stroke,
                        strokeWidth: getRSVPStyleConfig(element).strokeWidth,
                        cornerRadius: getRSVPStyleConfig(element).cornerRadius,
                        shadowColor: getRSVPStyleConfig(element).shadowColor,
                        shadowBlur: getRSVPStyleConfig(element).shadowBlur,
                        shadowOpacity: getRSVPStyleConfig(element).shadowOpacity,
                        shadowOffset: getRSVPStyleConfig(element).shadowOffset,
                        listening: false
                    }"
                />
                <v-text
                    :config="{
                        text: element.rsvpFormConfig?.title || 'RSVP Form',
                        x: 20,
                        y: 15,
                        width: element.size.width - 40,
                        align: 'center',
                        fontStyle: 'bold',
                        fontSize: 16,
                        fill: element.rsvpFormConfig?.textColor || '#475569',
                        listening: false
                    }"
                />
                <!-- Dynamic Input Fields -->
                <v-group 
                    v-for="(field, i) in getVisibleRSVPFields(element)" 
                    :key="field.name"
                    :config="{ x: 20, y: 50 + (i * 45) }"
                >
                     <!-- Input Box -->
                    <v-rect :config="{ width: element.size.width - 40, height: 35, ...getRSVPStyleConfig(element).inputStyle, listening: false }" />
                    
                    <!-- Placeholder Label -->
                    <v-text 
                        :config="{ 
                            text: field.label, 
                            x: 10, 
                            y: 10, 
                            width: element.size.width - 60, 
                            height: 35, 
                            align: 'left', 
                            verticalAlign: 'middle', 
                            fill: element.rsvpFormConfig?.textColor || '#94a3b8', 
                            opacity: 0.6,
                            fontSize: 13, 
                            listening: false 
                        }" 
                    />
                    
                     <!-- Dropdown Chevron for Attendance -->
                     <v-path 
                        v-if="field.name === 'attendance'"
                        :config="{
                            data: 'M6 9l6 6 6-6',
                            x: element.size.width - 65, 
                            y: 10,
                            scaleX: 1.2,
                            scaleY: 1.2,
                            stroke: element.rsvpFormConfig?.textColor || '#64748b',
                            strokeWidth: 2,
                            lineCap: 'round',
                            lineJoin: 'round',
                            opacity: 1,
                            listening: false
                        }"
                    />
                </v-group>
                
                <!-- Button -->
                <v-rect :config="{ x: 20, y: 50 + (getVisibleRSVPFields(element).length * 45) + 10, width: element.size.width - 40, height: 40, fill: element.rsvpFormConfig?.buttonColor || '#0f172a', cornerRadius: 6, listening: false }" />
                <v-text :config="{ text: element.rsvpFormConfig?.submitButtonText || 'Submit', x: 20, y: 50 + (getVisibleRSVPFields(element).length * 45) + 22, width: element.size.width - 40, align: 'center', fill: element.rsvpFormConfig?.buttonTextColor || 'white', fontSize: 13, fontStyle: 'bold', listening: false }" />
            </v-group>

            <!-- Icon Element -->
            <v-group v-if="element.type === 'icon'">
                 <v-path
                    :config="{
                        x: 0,
                        y: 0,
                        width: element.size.width,
                        height: element.size.height,
                        data: iconPaths[element.iconStyle?.iconName || 'star'] || iconPaths['star'],
                        fill: element.iconStyle?.iconColor || '#b8860b',
                        scaleX: element.size.width / 24,
                        scaleY: element.size.height / 24,
                        listening: false
                    }"
                />
            </v-group>

            <!-- Guest Wishes Element -->
             <v-group v-if="element.type === 'guest_wishes'">
                 <v-rect
                    :config="{
                        width: element.size.width,
                        height: element.size.height,
                        fill: getGuestWishesStyleConfig(element).fill,
                        stroke: getGuestWishesStyleConfig(element).stroke,
                        strokeWidth: getGuestWishesStyleConfig(element).strokeWidth,
                        cornerRadius: getGuestWishesStyleConfig(element).cornerRadius,
                        shadowColor: getGuestWishesStyleConfig(element).shadowColor,
                        shadowBlur: getGuestWishesStyleConfig(element).shadowBlur,
                        shadowOpacity: getGuestWishesStyleConfig(element).shadowOpacity,
                        shadowOffset: getGuestWishesStyleConfig(element).shadowOffset,
                        listening: false
                    }"
                />
                <v-text
                    :config="{
                        text: 'Guest Wishes',
                        y: 10,
                        width: element.size.width,
                        align: 'center',
                        fontSize: 14,
                        fontStyle: 'bold',
                        fill: element.guestWishesConfig?.textColor || '#475569',
                        listening: false
                    }"
                />
                <!-- Mock Cards -->
                <v-rect :config="{ x: 10, y: 40, width: element.size.width - 20, height: 60, fill: element.guestWishesConfig?.cardBackgroundColor || '#ffffff', cornerRadius: 4, shadowColor: 'black', shadowBlur: 2, shadowOpacity: 0.05, stroke: element.guestWishesConfig?.cardBorderColor || 'transparent', strokeWidth: 1, listening: false }" />
                <v-rect :config="{ x: 10, y: 110, width: element.size.width - 20, height: 60, fill: element.guestWishesConfig?.cardBackgroundColor || '#ffffff', cornerRadius: 4, shadowColor: 'black', shadowBlur: 2, shadowOpacity: 0.05, stroke: element.guestWishesConfig?.cardBorderColor || 'transparent', strokeWidth: 1, listening: false }" />
            </v-group>

             <!-- Shape Element -->
             <v-group v-else-if="element.type === 'shape' && element.shapeConfig">
                <!-- Basic Shape Components -->
                <v-rect
                    v-if="element.shapeConfig.shapeType === 'rectangle' || element.shapeConfig.shapeType === 'square' || element.shapeConfig.shapeType === 'rounded-rectangle'"
                    :config="{
                        width: element.size.width,
                        height: element.size.height,
                        fill: element.shapeConfig.fill || 'transparent',
                        stroke: element.shapeConfig.stroke || 'transparent',
                        strokeWidth: element.shapeConfig.strokeWidth || 0,
                        cornerRadius: element.shapeConfig.shapeType === 'rounded-rectangle' ? (element.shapeConfig.cornerRadius || 20) : (element.shapeConfig.shapeType === 'square' ? 0 : element.shapeConfig.cornerRadius || 0),
                        listening: false
                    }"
                />
                <v-circle
                    v-else-if="element.shapeConfig.shapeType === 'circle'"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        radius: Math.min(element.size.width, element.size.height) / 2,
                        fill: element.shapeConfig.fill || 'transparent',
                        stroke: element.shapeConfig.stroke || 'transparent',
                        strokeWidth: element.shapeConfig.strokeWidth || 0,
                        listening: false
                    }"
                />
                <v-ellipse
                    v-else-if="element.shapeConfig.shapeType === 'ellipse'"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        radiusX: element.size.width / 2,
                        radiusY: element.size.height / 2,
                        fill: element.shapeConfig.fill || 'transparent',
                        stroke: element.shapeConfig.stroke || 'transparent',
                        strokeWidth: element.shapeConfig.strokeWidth || 0,
                        listening: false
                    }"
                />
                <v-regular-polygon
                    v-else-if="['triangle', 'diamond', 'pentagon', 'hexagon', 'octagon'].includes(element.shapeConfig.shapeType)"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        sides: element.shapeConfig.shapeType === 'triangle' ? 3 : (element.shapeConfig.shapeType === 'pentagon' ? 5 : (element.shapeConfig.shapeType === 'hexagon' ? 6 : (element.shapeConfig.shapeType === 'octagon' ? 8 : 4))),
                        radius: Math.min(element.size.width, element.size.height) / 2,
                        rotation: element.shapeConfig.shapeType === 'triangle' ? -90 : (element.shapeConfig.shapeType === 'diamond' ? 45 : 0),
                        fill: element.shapeConfig.fill || 'transparent',
                        stroke: element.shapeConfig.stroke || 'transparent',
                        strokeWidth: element.shapeConfig.strokeWidth || 0,
                        listening: false
                    }"
                />
                <v-star
                    v-else-if="element.shapeConfig.shapeType.startsWith('star-')"
                    :config="{
                        x: element.size.width / 2,
                        y: element.size.height / 2,
                        numPoints: parseInt(element.shapeConfig.shapeType.split('-')[1] || '5') || 5,
                        innerRadius: (Math.min(element.size.width, element.size.height) / 2) * (element.shapeConfig.innerRadius || 0.4),
                        outerRadius: Math.min(element.size.width, element.size.height) / 2,
                        fill: element.shapeConfig.fill || 'transparent',
                        stroke: element.shapeConfig.stroke || 'transparent',
                        strokeWidth: element.shapeConfig.strokeWidth || 0,
                        listening: false
                    }"
                />
                <!-- Complex/SVG Path Shapes -->
                <v-path
                    v-else
                    :config="{
                        data: shapePaths[element.shapeConfig.shapeType] || element.shapeConfig.pathData || '',
                        width: element.size.width,
                        height: element.size.height,
                        scaleX: element.size.width / 100,
                        scaleY: element.size.height / 100,
                        fill: element.shapeConfig.fill || 'transparent',
                        stroke: element.shapeConfig.stroke || 'transparent',
                        strokeWidth: (element.shapeConfig.strokeWidth || 0) / (element.size.width / 100),
                        listening: false
                    }"
                />
             </v-group>

             <!-- Button Element (Basic & Open Invitation) -->
            <v-group v-if="element.type === 'button' || element.type === 'open_invitation_button'">
                <!-- Open Invitation Button Styles -->
                <v-group v-if="element.openInvitationConfig">
                    <!-- Base Shape via Helper -->
                     <v-rect
                        :config="{
                            width: element.size.width,
                            height: element.size.height,
                            ...getElementStyleConfig(element.openInvitationConfig.buttonStyle, element.openInvitationConfig.buttonColor || '#000000', element.openInvitationConfig.buttonShape),
                            // Explicit overrides
                            fill: (element.openInvitationConfig.buttonStyle === 'outline' || element.openInvitationConfig.buttonStyle === 'minimal') ? 'transparent' : (element.openInvitationConfig.buttonStyle === 'glass' ? 'rgba(255,255,255,0.2)' : (element.openInvitationConfig.buttonColor || '#000000')),
                            stroke: element.openInvitationConfig.buttonColor || '#000000',
                            strokeWidth: (element.openInvitationConfig.buttonStyle === 'outline' || element.openInvitationConfig.buttonStyle === 'minimal') ? 2 : 1,
                            listening: false
                        }"
                    />
                    <!-- Text -->
                    <v-text
                        :config="{
                            text: element.openInvitationConfig.buttonText || element.content || 'Open Invitation',
                            width: element.size.width,
                            height: element.size.height,
                            align: 'center',
                            verticalAlign: 'middle',
                            fill: element.openInvitationConfig.textColor || '#ffffff',
                            fontSize: Number(element.openInvitationConfig.fontSize || 14),
                            fontFamily: element.openInvitationConfig.fontFamily || 'Inter',
                            listening: false
                        }"
                    />
                </v-group>
                <!-- Basic Button Fallback -->
                 <v-group v-else>
                     <v-rect
                        :config="{
                            width: element.size.width,
                            height: element.size.height,
                            fill: element.textStyle?.color || '#000000',
                            cornerRadius: 4,
                            listening: false
                        }"
                    />
                    <v-text
                        :config="{
                            text: element.content || 'Button',
                            width: element.size.width,
                            height: element.size.height,
                            align: 'center',
                            verticalAlign: 'middle',
                            fill: '#ffffff',
                            fontSize: element.textStyle?.fontSize || 14,
                            fontFamily: element.textStyle?.fontFamily,
                            listening: false
                        }"
                    />
                </v-group>
            </v-group>
        </v-group>

        <!-- MOTION PATH OVERLAY -->
        <v-group v-if="editingPathElement && editingPathElement.motionPathConfig?.enabled">
            <!-- Path Line -->
            <v-line
                v-if="editingPathElement.motionPathConfig.points.length > 1"
                :config="{
                    points: editingPathElement.motionPathConfig.points.flatMap(p => [p.x, p.y]),
                    stroke: '#6366f1',
                    strokeWidth: 2,
                    dash: [5, 5],
                    lineJoin: 'round',
                    lineCap: 'round',
                    listening: false
                }"
            />
            
            <!-- Path Points -->
            <v-circle
                v-for="(point, index) in editingPathElement.motionPathConfig.points"
                :key="'point-' + index"
                :config="{
                    x: point.x,
                    y: point.y,
                    radius: 6,
                    fill: '#6366f1',
                    stroke: 'white',
                    strokeWidth: 2,
                    draggable: true,
                    shadowBlur: 5,
                    shadowOpacity: 0.3
                }"
                @dragmove="(e: any) => handlePathPointDragMove(e, index)"
                @mousedown="(e: any) => handlePathPointClick(e, index)"
            />
            
            <!-- Connection from element to first point (if exists) -->
            <v-line
                v-if="editingPathElement.motionPathConfig.points.length > 0 && editingPathElement.motionPathConfig.points[0]"
                :config="{
                    points: [
                        editingPathElement.position.x + editingPathElement.size.width / 2,
                        editingPathElement.position.y + editingPathElement.size.height / 2,
                        editingPathElement.motionPathConfig.points[0]!.x,
                        editingPathElement.motionPathConfig.points[0]!.y
                    ],
                    stroke: '#6366f1',
                    strokeWidth: 1,
                    dash: [2, 2],
                    opacity: 0.5,
                    listening: false
                }"
            />
        </v-group>

        <!-- Transformer -->
        <v-transformer
            ref="transformer"
            v-if="selectedElementId || (isActiveSection && zoomConfig?.enabled)"
            :config="{
                nodes: [], // Will be set via updated hook or watcher
                anchorStroke: '#3b82f6',
                anchorFill: '#ffffff',
                anchorSize: 10,
                borderStroke: '#3b82f6',
                borderDash: [4, 4],
                keepRatio: true,
                enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
            }"
            @transformend="handleTransformEnd"
        />

        <!-- Zoom Target Boxes (Multiple Points) -->
        <v-rect
            v-for="boxConfig in zoomTargetConfigs"
            :key="boxConfig.id"
            :config="boxConfig"
            @click="(e: any) => handleZoomTargetClick(e, boxConfig.pointIndex)"
            @tap="(e: any) => handleZoomTargetClick(e, boxConfig.pointIndex)"
            @dragend="(e: any) => handleZoomTargetDragEnd(e, boxConfig.pointIndex)"
            @transformend="(e: any) => handleZoomTargetTransformEnd(e, boxConfig.pointIndex)"
        />
      </v-layer>
    </v-stage>

    <!-- GIF, Maps & Creature Overlay - Rendered as HTML -->
    <template v-for="overlayEl in [...gifElements, ...mapsElements, ...creatureElements]" :key="'overlay-' + overlayEl.id">
        <div 
        class="absolute pointer-events-auto"
        :style="{
            left: (overlayEl.position.x * scale) + 'px',
            top: (overlayEl.position.y * scale) + 'px',
            width: (overlayEl.size.width * scale) + 'px',
            height: (overlayEl.size.height * scale) + 'px',
            transform: `rotate(${overlayEl.rotation || 0}deg) scaleX(${overlayEl.flipHorizontal ? -1 : 1}) scaleY(${overlayEl.flipVertical ? -1 : 1})`,
            zIndex: (overlayEl.zIndex || 1) + 1000,
            opacity: overlayEl.opacity ?? 1,
        }"
        @mousedown="(e) => handleGifMouseDown(e, overlayEl)"
        >
        <!-- GIF Image -->
        <img
            v-if="overlayEl.type === 'gif'"
            :src="getProxiedImageUrl(overlayEl.imageUrl)"
            :alt="overlayEl.name"
            class="w-full h-full cursor-move"
            :style="{
            objectFit: overlayEl.objectFit || 'contain',
            background: 'transparent',
            imageRendering: 'auto',
            }"
            draggable="false"
        />

        <!-- Maps Point -->
        <MapsPointElement
            v-if="overlayEl.type === 'maps_point'"
            :element="overlayEl"
            :is-preview="false"
            class="w-full h-full cursor-move"
        />

        <!-- Lottie Bird -->
        <LottieElement
            v-if="overlayEl.type === 'lottie_bird'"
            :animation-url="overlayEl.flyingBirdConfig?.lottieUrl || ''"
            :direction="overlayEl.flyingBirdConfig?.direction || 'left'"
            :speed="1"
            class="w-full h-full cursor-move"
        />

        <!-- Lottie Butterfly -->
        <LottieElement
            v-if="overlayEl.type === 'lottie_butterfly'"
            :animation-url="overlayEl.flyingBirdConfig?.lottieUrl || ''"
            :direction="overlayEl.flyingBirdConfig?.direction || 'left'"
            :speed="1"
            class="w-full h-full cursor-move"
        />

        <!-- SVG Bird -->
        <SvgBird
            v-if="overlayEl.type === 'svg_bird' || overlayEl.type === 'flying_bird'"
            :color="overlayEl.flyingBirdConfig?.birdColor || '#1a1a1a'"
            :direction="overlayEl.flyingBirdConfig?.direction || 'left'"
            :flap-speed="overlayEl.flyingBirdConfig?.flapSpeed || 0.4"
            class="w-full h-full cursor-move"
        />

        <!-- SVG Butterfly -->
        <SvgButterfly
            v-if="overlayEl.type === 'svg_butterfly'"
            :color="overlayEl.flyingBirdConfig?.birdColor || '#1a1a1a'"
            :direction="overlayEl.flyingBirdConfig?.direction || 'left'"
            :flap-speed="overlayEl.flyingBirdConfig?.flapSpeed || 0.5"
            class="w-full h-full cursor-move"
        />

        <!-- Generic Lottie Animation -->
        <LottieElement
            v-if="overlayEl.type === 'lottie'"
            :animation-url="overlayEl.lottieConfig?.url || ''"
            :direction="overlayEl.lottieConfig?.direction || 'left'"
            :speed="overlayEl.lottieConfig?.speed || 1"
            :loop="overlayEl.lottieConfig?.loop !== false"
            :auto-play="overlayEl.lottieConfig?.autoplay !== false"
            class="w-full h-full cursor-move"
        />
        
        <!-- Selection border -->
        <div 
            v-if="selectedElementId === overlayEl.id"
            class="absolute inset-0 border-2 border-blue-500 border-dashed pointer-events-none z-50"
        />
        
        <!-- Resize handles (only when selected) -->
        <template v-if="selectedElementId === overlayEl.id">
            <!-- Top-left -->
            <div 
            class="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm cursor-nw-resize -top-1.5 -left-1.5 z-50 pointer-events-auto"
            @mousedown.stop="handleGifResizeMouseDown($event, overlayEl, 'top-left')"
            />
            <!-- Top-right -->
            <div 
            class="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm cursor-ne-resize -top-1.5 -right-1.5 z-50 pointer-events-auto"
            @mousedown.stop="handleGifResizeMouseDown($event, overlayEl, 'top-right')"
            />
            <!-- Bottom-left -->
            <div 
            class="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm cursor-sw-resize -bottom-1.5 -left-1.5 z-50 pointer-events-auto"
            @mousedown.stop="handleGifResizeMouseDown($event, overlayEl, 'bottom-left')"
            />
            <!-- Bottom-right -->
            <div 
            class="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm cursor-se-resize -bottom-1.5 -right-1.5 z-50 pointer-events-auto"
            @mousedown.stop="handleGifResizeMouseDown($event, overlayEl, 'bottom-right')"
            />
        </template>
        </div>
    </template>
    </div> <!-- Close inner canvas div -->
  </div> <!-- Close outer path-edit-zone container -->
</template>

<style scoped>
/* Extended path editing zone - adds padding around canvas when editing motion path */
.path-edit-zone {
    padding: 200px;
    margin: -200px;
    cursor: crosshair;
    background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(99, 102, 241, 0.03) 10px,
        rgba(99, 102, 241, 0.03) 20px
    );
}

.path-edit-zone::before {
    content: 'Click anywhere to add path points';
    position: absolute;
    top: 170px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: #6366f1;
    background: white;
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid #c7d2fe;
    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);
    white-space: nowrap;
    z-index: 1000;
}
</style>
