<script setup lang="ts">
import { computed } from 'vue';
import { useTemplateStore } from '@/stores/template';
import type { TemplateElement } from '@/lib/types';
import Toggle from '@/components/ui/Toggle.vue';
import { Move, Edit3, Lock, Copy, Shield } from 'lucide-vue-next';

interface Props {
    element: TemplateElement;
    templateId: string;
    sectionType: string;
}

const props = defineProps<Props>();
const store = useTemplateStore();

const canEditPosition = computed({
    get: () => props.element.canEditPosition ?? false,
    set: (val) => updatePermission('canEditPosition', val)
});

const canEditContent = computed({
    get: () => props.element.canEditContent ?? false,
    set: (val) => updatePermission('canEditContent', val)
});

const isContentProtected = computed({
    get: () => props.element.isContentProtected ?? false,
    set: (val) => updatePermission('isContentProtected', val)
});

const showCopyButton = computed({
    get: () => props.element.showCopyButton ?? false,
    set: (val) => updatePermission('showCopyButton', val)
});

function updatePermission(field: string, value: boolean) {
    store.updateElement(props.templateId, props.sectionType, props.element.id, {
        [field]: value
    });
}

// Content type label based on element type
const contentTypeLabel = computed(() => {
    switch(props.element.type) {
        case 'text': return 'Edit Text';
        case 'image': return 'Edit Image';
        case 'gif': return 'Edit GIF';
        case 'maps_point': return 'Edit Maps Link';
        default: return 'Edit Content';
    }
});
</script>

<template>
    <div class="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            User Permissions
        </h4>
        
        <div class="space-y-3">
            <!-- Can Edit Position -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <div class="p-1.5 bg-white rounded-md border border-slate-200 text-slate-500">
                        <Move class="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <span class="text-sm font-medium text-slate-700 block">Moveable</span>
                        <span class="text-[10px] text-slate-500 block">User can drag position</span>
                    </div>
                </div>
                <Toggle v-model="canEditPosition" />
            </div>
            
            <!-- Can Edit Content -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                    <div class="p-1.5 bg-white rounded-md border border-slate-200 text-slate-500">
                        <Edit3 class="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <span class="text-sm font-medium text-slate-700 block">Editable</span>
                        <span class="text-[10px] text-slate-500 block">User can change {{ element.type }}</span>
                    </div>
                </div>
                <Toggle v-model="canEditContent" />
            </div>

            <!-- Content Protection (Text Only) -->
            <template v-if="element.type === 'text'">
                <div class="h-px bg-slate-200 my-2"></div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="p-1.5 bg-white rounded-md border border-slate-200 text-slate-500">
                            <Shield class="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <span class="text-sm font-medium text-slate-700 block">Protected</span>
                            <span class="text-[10px] text-slate-500 block">Disable copy/selection</span>
                        </div>
                    </div>
                    <Toggle v-model="isContentProtected" />
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="p-1.5 bg-white rounded-md border border-slate-200 text-slate-500">
                            <Copy class="w-3.5 h-3.5" />
                        </div>
                        <div>
                            <span class="text-sm font-medium text-slate-700 block">Copy Button</span>
                            <span class="text-[10px] text-slate-500 block">Show copy icon for user</span>
                        </div>
                    </div>
                    <Toggle v-model="showCopyButton" />
                </div>
            </template>
        </div>
    </div>
</template>
