<script setup lang="ts">
import { computed } from 'vue';
import type { TemplateElement } from '@/lib/types';
import Label from '@/components/ui/Label.vue';
import Input from '@/components/ui/Input.vue';
import Textarea from '@/components/ui/Textarea.vue';
import FileUploader from '@/components/dashboard/FileUploader.vue';
import { Copy, MapPin } from 'lucide-vue-next';

interface Props {
    element: TemplateElement;
    modelValue: Partial<TemplateElement>; // The override object
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update': [updates: Partial<TemplateElement>];
    'copy': [text: string];
}>();

// Helper to check if a permission is enabled.
// Priorities:
// 1. New granular permission fields (canEditContent) if defined.
// 2. Legacy `isUserEditable` field.
const canEditContent = computed(() => {
    if (props.element.canEditContent !== undefined) return props.element.canEditContent;
    return props.element.isUserEditable || false;
});

const showCopyButton = computed(() => {
    return props.element.showCopyButton || false;
});

const isContentProtected = computed(() => {
    return props.element.isContentProtected || false;
});

// Determine active value (override or default)
const activeContent = computed(() => props.modelValue.content ?? props.element.content ?? '');
const activeImageUrl = computed(() => props.modelValue.imageUrl ?? props.element.imageUrl ?? '');
const activeMapsConfig = computed(() => ({
    ...props.element.mapsConfig,
    ...props.modelValue.mapsConfig
}));

const handleContentUpdate = (val: string | number) => {
    emit('update', { content: String(val) });
};

const handleImageUpdate = (url: string) => {
    emit('update', { imageUrl: url });
};

const handleMapsUrlUpdate = (url: string) => {
    const config = { googleMapsUrl: '', ...activeMapsConfig.value };
    emit('update', { 
        mapsConfig: { 
            ...config, 
            googleMapsUrl: url 
        } 
    });
};

const handleMapsLabelUpdate = (val: string | number) => {
    const config = { googleMapsUrl: '', ...activeMapsConfig.value };
    emit('update', { 
        mapsConfig: { 
            ...config, 
            displayName: String(val)
        } 
    });
};

const copyToClipboard = () => {
    if (activeContent.value) {
        navigator.clipboard.writeText(activeContent.value);
        emit('copy', activeContent.value); // Let parent handle toast
    }
};

</script>

<template>
    <div class="space-y-3 p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-gray-700 flex items-center gap-2">
                {{ element.editableLabel || element.name || 'Element' }}
                <span v-if="isContentProtected" class="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full">Protected</span>
            </span>
            
            <!-- Admin-enabled Copy Button for User Convenience (e.g. they want to test copying their own bank number) -->
            <button 
                v-if="showCopyButton && activeContent"
                @click="copyToClipboard"
                class="text-xs flex items-center gap-1 text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded transition-colors"
                title="Copy current value"
            >
                <Copy class="w-3 h-3" />
                Copy
            </button>
        </div>

        <!-- 1. TEXT EDITING -->
        <template v-if="element.type === 'text' && canEditContent">
            <div class="space-y-2">
                <Label class="text-xs text-gray-500">Text Content</Label>
                <Textarea 
                    v-if="element.content && element.content.length > 50"
                    :model-value="activeContent"
                    @update:model-value="handleContentUpdate"
                    class="text-sm"
                    :rows="3"
                />
                <Input 
                    v-else
                    :model-value="activeContent"
                    @update:model-value="handleContentUpdate"
                    class="text-sm"
                />
            </div>
        </template>

        <!-- 2. IMAGE/GIF EDITING -->
        <template v-else-if="(element.type === 'image' || element.type === 'gif') && canEditContent">
             <FileUploader 
                :model-value="activeImageUrl"
                :type="element.type === 'gif' ? 'any' : 'image'"
                :accept="element.type === 'gif' ? 'image/gif' : 'image/*'"
                :label="element.type === 'gif' ? 'Upload GIF' : 'Upload Foto'"
                :max-size="5 * 1024 * 1024" 
                @update:model-value="handleImageUpdate"
             />
        </template>

        <!-- 3. MAPS POINT EDITING -->
        <template v-else-if="element.type === 'maps_point' && canEditContent">
            <div class="space-y-3">
                <div class="space-y-1">
                    <Label class="text-xs text-gray-500">Google Maps URL</Label>
                    <div class="flex gap-2">
                        <Input 
                            :model-value="activeMapsConfig.googleMapsUrl"
                            @update:model-value="handleMapsUrlUpdate"
                            placeholder="https://goo.gl/maps/..."
                            class="text-sm flex-1"
                        />
                        <a 
                            v-if="activeMapsConfig.googleMapsUrl"
                            :href="activeMapsConfig.googleMapsUrl"
                            target="_blank"
                            class="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                            title="Test Link"
                        >
                            <MapPin class="w-4 h-4" />
                        </a>
                    </div>
                    <p class="text-[10px] text-gray-400">Paste 'Share Link' or 'Embed Link' from Google Maps</p>
                </div>

                <div class="space-y-1">
                    <Label class="text-xs text-gray-500">Display Name / Label</Label>
                    <Input 
                        :model-value="activeMapsConfig.displayName"
                        @update:model-value="handleMapsLabelUpdate"
                        placeholder="e.g. Gedung Serbaguna"
                        class="text-sm"
                    />
                </div>
            </div>
        </template>

        <!-- 4. FALLBACK / READ-ONLY -->
        <div v-else-if="!canEditContent" class="text-xs text-gray-400 italic">
            Content managed by admin.
        </div>
    </div>
</template>
