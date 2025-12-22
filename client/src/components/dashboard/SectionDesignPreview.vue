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
 * ARCHITECTURAL DECISION: AUTHORITATIVE TEMPLATE LOOKUP
 * As CTO, we must ensure that we never show a 'blank' design if a master exists.
 * We prioritize: 
 * 1. Specified templateId (explicit link)
 * 2. Invitation's templateId (implicit link)
 * 3. First available template in store (master fallback)
 */
const currentTemplate = computed(() => {
    const id = props.templateId || invitationStore.invitation.templateId;
    if (id) {
        return templateStore.templates.find(t => t.id === id) || templateStore.templates[0] || null;
    }
    return templateStore.templates[0] || null;
});

const sectionDesign = computed(() => {
    // 1. Primary Lookup (Linked Template)
    const primarySections = currentTemplate.value?.sections;
    if (primarySections) {
        const targetType = props.sectionType.toLowerCase();
        const match = Object.keys(primarySections).find(k => k.toLowerCase() === targetType);
        if (match) return primarySections[match];
    }
    
    // 2. Global "Deep Discovery": Scan all loaded templates for this section type
    // This handles cases where a master template is specialized and missing certain sections.
    const targetType = props.sectionType.toLowerCase();
    for (const temp of templateStore.templates) {
        const sections = temp.sections;
        if (!sections) continue;
        
        const match = Object.keys(sections).find(k => k.toLowerCase() === targetType);
        if (match) {
             const design = sections[match];
             if (design && (design.elements || []).length > 0) {
                 console.log(`[Deep Discovery] Found section '${props.sectionType}' in alternate template: ${temp.id}`);
                 return design;
             }
        }
    }

    console.warn(`[Preview] Section '${props.sectionType}' not found in ANY loaded template.`);
    return null;
});

/**
 * PIXEL-TO-PERCENTAGE NORMALIZATION ENGINE
 * Standardizes raw canvas pixels to responsive percentage values.
 * Based on production canvas dimensions (375x667).
 */
const normalize = (val: number, dimension: 'width' | 'height') => {
    const base = dimension === 'width' ? CANVAS_WIDTH : CANVAS_HEIGHT;
    return (val / base) * 100;
};

const elements = computed(() => {
    return sectionDesign.value?.elements || [];
});

const backgroundStyle = computed(() => {
    const design = sectionDesign.value;
    const themeValue = invitationStore.invitation.theme;
    
    // Fallback logic: Primary color for opening, background color for others
    const fallbackColor = props.sectionType === 'opening' ? themeValue.colors.primary : themeValue.colors.background;
    
    return {
        backgroundColor: design?.backgroundColor || fallbackColor || '#ffffff',
        backgroundImage: !design?.backgroundUrl ? `linear-gradient(135deg, ${themeValue.colors.background} 0%, ${themeValue.colors.secondary}08 100%)` : undefined
    };
});

const theme = computed(() => invitationStore.invitation.theme);
</script>

<template>
  <div 
    class="relative w-full aspect-[375/667] rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white group/design"
    :style="backgroundStyle"
  >
    <!-- 1. Master Background Image -->
    <SafeImage 
        v-if="sectionDesign?.backgroundUrl"
        :src="sectionDesign.backgroundUrl"
        alt="Design background"
        class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/design:scale-110"
    />

    <!-- 2. Interactive Design Elements (High-Fidelity) -->
    <div 
        v-if="elements.length > 0"
        class="absolute inset-0 w-full h-full pointer-events-none"
    >
        <div 
            v-for="el in elements" 
            :key="el.id"
            class="absolute flex items-center justify-center pointer-events-none"
            :style="{
                left: normalize(el.position?.x ?? 0, 'width') + '%',
                top: normalize(el.position?.y ?? 0, 'height') + '%',
                width: normalize(el.size?.width ?? 0, 'width') + '%',
                height: normalize(el.size?.height ?? 0, 'height') + '%',
                zIndex: el.zIndex || 1,
                transform: `rotate(${el.rotation || 0}deg) scale(${el.flipHorizontal ? -1 : 1}, ${el.flipVertical ? -1 : 1})`,
                opacity: el.opacity ?? 1,
            }"
        >
            <!-- High-Fidelity Image Element -->
            <SafeImage 
                v-if="el.type === 'image' || el.type === 'shape'" 
                :src="el.imageUrl || ''" 
                alt="Design element"
                class="w-full h-full object-contain filter drop-shadow-sm"
            />
            
            <!-- Abstract Text Placeholder (Clean & Minimal) -->
            <div 
                v-else-if="el.type === 'text'"
                class="w-full h-[60%] bg-black/5 rounded-full"
            ></div>

            <!-- Complex Logic Element (Button/Countdown) -->
            <div 
                v-else
                class="w-[90%] h-[80%] border border-black/10 rounded-lg bg-white/20 backdrop-blur-[1px]"
            ></div>
        </div>
    </div>

    <!-- 3. Smart Themed Fallback (When no master design exists) -->
    <div 
        v-if="!sectionDesign?.backgroundUrl && elements.length === 0" 
        class="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
    >
        <!-- Subtle Background Pattern -->
        <div class="absolute inset-0 opacity-[0.03] pointer-events-none" :style="{ color: theme.colors.primary }">
             <svg width="100%" height="100%"><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="currentColor"/></pattern><rect width="100%" height="100%" fill="url(#grid)" /></svg>
        </div>

        <div class="relative z-10 space-y-4">
            <div class="w-16 h-16 mx-auto bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-200 border border-gray-50">
                <LayoutTemplate class="w-8 h-8" />
            </div>
            
            <div class="space-y-1">
                <span class="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Master Design</span>
                <span class="block text-[8px] font-medium text-gray-300 uppercase tracking-widest italic">(Standard Fallback: {{ sectionType }})</span>
            </div>

            <!-- Abstract Content Representation -->
            <div class="w-24 h-1 mx-auto rounded-full bg-gray-100/50"></div>
            
            <div class="space-y-2 px-4 max-w-[200px] mx-auto opacity-20">
                 <div class="h-2 bg-gray-300 rounded-full w-full"></div>
                 <div class="h-2 bg-gray-300 rounded-full w-3/4 mx-auto"></div>
                 <div class="h-2 bg-gray-300 rounded-full w-1/2 mx-auto"></div>
            </div>
        </div>
    </div>

    <!-- Luxury Overlay -->
    <div class="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]"></div>
  </div>
</template>
