<script setup lang="ts">
import { computed } from 'vue';
import type { TemplateElement } from '@/lib/types';
import { MapPin, ExternalLink } from 'lucide-vue-next';

interface Props {
    element: TemplateElement;
    isPreview?: boolean;
}

const props = defineProps<Props>();

const embedUrl = computed(() => {
    const url = props.element.mapsConfig?.googleMapsUrl || '';
    // If it's already an embed URL, use it
    if (url.includes('/embed')) return url;
    
    // Naively try to convert some common share URLs to embed if possible, 
    // but Google Maps links vary wildy. Safest is to ask user for embed URL or use a service.
    // For now, if it's a standard maps link, we might not be able to embed it directly without an API key or proper embed format.
    // However, the user request implies they just want to "paste link".
    // A simple trick for basic places is using the /embed?pb=... format if they copy it from "Share > Embed map".
    // If they copy the direct link, standard iframe won't work for cross-origin reasons usually.
    // Let's assume user pastes the 'Embed map' src OR we just show a placeholder if it's not embeddable.
    
    return url;
});

const hasValidUrl = computed(() => {
    const url = props.element.mapsConfig?.googleMapsUrl || '';
    return url.trim().length > 0;
});

const isEmbeddable = computed(() => {
    return embedUrl.value.includes('/embed') || embedUrl.value.includes('output=embed');
});

const displayName = computed(() => props.element.mapsConfig?.displayName || 'Lokasi');
const buttonText = computed(() => props.element.mapsConfig?.buttonText || 'Lihat Lokasi');
const linkUrl = computed(() => props.element.mapsConfig?.googleMapsUrl || '#');

</script>

<template>
    <div class="w-full h-full relative rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col">
        <!-- Embed Area -->
        <div v-if="element.mapsConfig?.showEmbed" class="flex-1 relative bg-slate-100">
            <template v-if="hasValidUrl && isEmbeddable">
                <iframe 
                    :src="embedUrl"
                    class="w-full h-full border-0 absolute inset-0"
                    allowfullscreen
                    loading="lazy"
                    draggable="false"
                />
                <!-- Overlay to capture clicks in editor so dragging works -->
                <div v-if="!isPreview" class="absolute inset-0 z-10"></div>
            </template>
            <template v-else>
                <div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <MapPin class="w-8 h-8 text-slate-300 mb-2" />
                    <p v-if="!hasValidUrl" class="text-xs text-slate-400">Belum ada link maps</p>
                    <p v-else class="text-xs text-slate-400">Preview tidak tersedia untuk link ini (Coba gunakan link Embed)</p>
                </div>
            </template>
        </div>

        <!-- Label/Button Area -->
        <div 
            v-if="element.mapsConfig?.showLabel || element.mapsConfig?.showLinkButton" 
            class="p-3 bg-white border-t border-slate-100 flex flex-col gap-2 relative z-20"
        >
            <div v-if="element.mapsConfig?.showLabel" class="flex items-center gap-2">
                <MapPin :style="{ color: element.mapsConfig?.pinColor || '#EF4444' }" class="w-4 h-4 flex-shrink-0" />
                <span class="text-sm font-medium text-slate-700 truncate">{{ displayName }}</span>
            </div>
            
            <a 
                v-if="element.mapsConfig?.showLinkButton"
                :href="isPreview ? linkUrl : 'javascript:void(0)'"
                :target="isPreview ? '_blank' : ''"
                class="flex items-center justify-center gap-2 w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-md transition-colors"
                :class="{'cursor-default': !isPreview}"
            >
                <ExternalLink class="w-3 h-3" />
                {{ buttonText }}
            </a>
        </div>
    </div>
</template>
