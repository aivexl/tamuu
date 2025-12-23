<script setup lang="ts">
import { computed } from 'vue';
import { useTemplateStore } from '@/stores/template';
import { useInvitationStore } from '@/stores/invitation';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/constants';
import SafeImage from '@/components/ui/SafeImage.vue';
import { LayoutTemplate } from 'lucide-vue-next';

interface Props {
  sectionType: string;
  templateId?: string | null;
}

const props = defineProps<Props>();
const templateStore = useTemplateStore();
const invitationStore = useInvitationStore();

/**
 * Template lookup - exact match to what editor uses
 */
const currentTemplate = computed(() => {
    const id = props.templateId || invitationStore.invitation.templateId;
    if (id) {
        return templateStore.templates.find(t => t.id === id) || templateStore.templates[0] || null;
    }
    return templateStore.templates[0] || null;
});

const sectionDesign = computed(() => {
    const primarySections = currentTemplate.value?.sections;
    if (primarySections) {
        const targetType = props.sectionType.toLowerCase();
        const match = Object.keys(primarySections).find(k => k.toLowerCase() === targetType);
        if (match) return primarySections[match];
    }
    return null;
});

/**
 * PIXEL-TO-PERCENTAGE NORMALIZATION ENGINE
 * Exactly matching the editor canvas dimensions (375x667)
 */
const normalize = (val: number, dimension: 'width' | 'height') => {
    const base = dimension === 'width' ? CANVAS_WIDTH : CANVAS_HEIGHT;
    return (val / base) * 100;
};

const elements = computed(() => {
    return sectionDesign.value?.elements || [];
});

/**
 * Background style - EXACT MATCH to KonvaCanvas
 * Uses backgroundColor directly from section, NO fallback to theme
 */
const backgroundStyle = computed(() => {
    const design = sectionDesign.value;
    return {
        backgroundColor: design?.backgroundColor || '#ffffff'
    };
});

/**
 * Get element style for visual rendering
 */
const getElementStyle = (el: any) => {
    const style: any = {
        left: normalize(el.position?.x ?? 0, 'width') + '%',
        top: normalize(el.position?.y ?? 0, 'height') + '%',
        width: normalize(el.size?.width ?? 0, 'width') + '%',
        height: normalize(el.size?.height ?? 0, 'height') + '%',
        zIndex: el.zIndex || 1,
        transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipHorizontal ? -1 : 1}) scaleY(${el.flipVertical ? -1 : 1})`,
        opacity: el.opacity ?? 1,
    };
    return style;
};

/**
 * Get Open Invitation Button styling - exact match to editor/preview
 */
const getButtonStyle = (el: any) => {
    const config = el.openInvitationConfig || {};
    const base: any = {
        backgroundColor: config.buttonColor || '#000000',
        color: config.textColor || '#ffffff',
        fontSize: `${config.fontSize || 16}px`,
        fontFamily: config.fontFamily || 'Inter',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        height: '100%',
    };

    // Style-specific modifications
    const style = config.style || 'minimal';
    switch (style) {
        case 'elegant':
            base.borderRadius = '9999px';
            base.border = '1px solid rgba(255,255,255,0.3)';
            break;
        case 'modern':
            base.borderRadius = '16px';
            base.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.3)';
            break;
        case 'glass':
            base.backgroundColor = 'rgba(255,255,255,0.15)';
            base.backdropFilter = 'blur(10px)';
            base.border = '1px solid rgba(255,255,255,0.2)';
            base.borderRadius = '12px';
            break;
        case 'outline':
            base.backgroundColor = 'transparent';
            base.border = '2px solid #000000';
            break;
        case 'luxury':
            base.border = '2px solid #ffd700';
            base.boxShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
            break;
        case 'neon':
            base.boxShadow = `0 0 20px ${config.buttonColor || '#00ff9d'}`;
            base.border = `2px solid ${config.buttonColor || '#00ff9d'}`;
            break;
        case 'brutalist':
            base.boxShadow = '8px 8px 0px 0px #000000';
            base.border = '3px solid #000000';
            break;
        default: // minimal
            base.borderRadius = '8px';
    }

    return base;
};

/**
 * Get text element style
 */
const getTextStyle = (el: any) => {
    const textStyle = el.textStyle || {};
    return {
        fontSize: `${textStyle.fontSize || 16}px`,
        fontFamily: textStyle.fontFamily || 'Inter',
        fontWeight: textStyle.fontStyle?.includes('bold') ? 'bold' : 'normal',
        fontStyle: textStyle.fontStyle?.includes('italic') ? 'italic' : 'normal',
        color: textStyle.color || '#000000',
        textAlign: textStyle.textAlign || 'center',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: textStyle.textAlign === 'left' ? 'flex-start' : textStyle.textAlign === 'right' ? 'flex-end' : 'center',
        overflow: 'hidden',
        wordBreak: 'break-word' as const,
    };
};

/**
 * Check if element is a visual type (should be rendered as image)
 */
const isImageType = (type: string) => {
    return ['image', 'shape', 'gif', 'sticker'].includes(type);
};

/**
 * Check if element is an open invitation button
 */
const isOpenInvitationButton = (el: any) => {
    return el.type === 'button' && el.openInvitationConfig;
};

/**
 * Get static image URL for GIF (first frame)
 * For dashboard preview we show static version
 */
const getStaticImageUrl = (url: string) => {
    // For GIFs, we could use a service to get first frame,
    // but for now just use the same URL - browser will show first frame when not animating via CSS
    return url;
};
</script>

<template>
  <div 
    class="relative w-full aspect-[375/667] rounded-xl overflow-hidden shadow-sm border border-gray-100"
    :style="backgroundStyle"
  >
    <!-- 1. Background Image - EXACT MATCH to editor -->
    <SafeImage 
        v-if="sectionDesign?.backgroundUrl"
        :src="sectionDesign.backgroundUrl"
        alt="Background"
        class="absolute inset-0 w-full h-full object-cover"
    />

    <!-- 2. Overlay - match editor overlayOpacity -->
    <div 
        v-if="sectionDesign?.overlayOpacity && sectionDesign.overlayOpacity > 0"
        class="absolute inset-0 bg-black pointer-events-none"
        :style="{ opacity: sectionDesign.overlayOpacity }"
    />

    <!-- 3. Elements Layer - PIXEL PERFECT rendering -->
    <div 
        v-if="elements.length > 0"
        class="absolute inset-0 w-full h-full pointer-events-none"
    >
        <div 
            v-for="el in elements" 
            :key="el.id"
            class="absolute pointer-events-none"
            :style="getElementStyle(el)"
        >
            <!-- IMAGE ELEMENTS (including static GIFs) -->
            <SafeImage 
                v-if="isImageType(el.type) && el.imageUrl" 
                :src="getStaticImageUrl(el.imageUrl)" 
                alt="Element"
                class="w-full h-full object-contain"
            />
            
            <!-- TEXT ELEMENTS -->
            <div 
                v-else-if="el.type === 'text'"
                :style="getTextStyle(el)"
            >
                {{ el.content || '' }}
            </div>

            <!-- OPEN INVITATION BUTTON -->
            <div 
                v-else-if="isOpenInvitationButton(el)"
                :style="getButtonStyle(el)"
            >
                {{ el.openInvitationConfig?.buttonText || 'Buka Undangan' }}
            </div>

            <!-- COUNTDOWN ELEMENT (static preview) -->
            <div 
                v-else-if="el.type === 'countdown'"
                class="w-full h-full flex items-center justify-center gap-2 text-xs"
                :style="{ color: el.countdownConfig?.textColor || '#000' }"
            >
                <div class="flex flex-col items-center">
                    <span class="font-bold text-lg">00</span>
                    <span class="text-[8px] opacity-70">Hari</span>
                </div>
                <span>:</span>
                <div class="flex flex-col items-center">
                    <span class="font-bold text-lg">00</span>
                    <span class="text-[8px] opacity-70">Jam</span>
                </div>
                <span>:</span>
                <div class="flex flex-col items-center">
                    <span class="font-bold text-lg">00</span>
                    <span class="text-[8px] opacity-70">Menit</span>
                </div>
            </div>

            <!-- GENERIC ELEMENT (shapes without imageUrl, etc) -->
            <div 
                v-else-if="el.type === 'shape' && el.shapeConfig"
                class="w-full h-full"
                :style="{
                    backgroundColor: el.shapeConfig.fill || 'transparent',
                    border: el.shapeConfig.stroke ? `${el.shapeConfig.strokeWidth || 1}px solid ${el.shapeConfig.stroke}` : 'none',
                    borderRadius: el.shapeConfig.cornerRadius ? `${el.shapeConfig.cornerRadius}px` : '0'
                }"
            />
        </div>
    </div>

    <!-- 4. Empty State (only when NO design exists) -->
    <div 
        v-if="!sectionDesign?.backgroundUrl && elements.length === 0" 
        class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gray-50"
    >
        <div class="w-12 h-12 mx-auto bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-300 border border-gray-100">
            <LayoutTemplate class="w-6 h-6" />
        </div>
        <span class="block mt-3 text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ sectionType }}</span>
    </div>
  </div>
</template>
