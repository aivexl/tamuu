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
    const sections = currentTemplate.value?.sections;
    if (!sections) return null;
    
    // Case-insensitive lookup for enterprise-grade robustness
    const targetType = props.sectionType.toLowerCase();
    const match = Object.keys(sections).find(k => k.toLowerCase() === targetType);
    
    return match ? sections[match] : null;
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
    const theme = invitationStore.invitation.theme;
    
    // Fallback logic: Primary color for opening, background color for others
    const fallbackColor = props.sectionType === 'opening' ? theme.colors.primary : theme.colors.background;
    
    return {
        backgroundColor: design?.backgroundColor || fallbackColor || '#f8fafc'
    };
});
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

    <!-- 3. Empty State Fallback -->
    <div 
        v-if="!sectionDesign?.backgroundUrl && elements.length === 0" 
        class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-[0.05]"
    >
        <LayoutTemplate class="w-16 h-16 mb-2" />
        <span class="text-[10px] font-black uppercase tracking-tighter">Design Master</span>
    </div>

    <!-- Luxury Overlay -->
    <div class="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-xl pointer-events-none"></div>
  </div>
</template>
