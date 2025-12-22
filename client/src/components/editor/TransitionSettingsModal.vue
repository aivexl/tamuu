<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTemplateStore } from '@/stores/template';
import Button from '@/components/ui/Button.vue';
import Label from '@/components/ui/Label.vue';
import { X, Save } from 'lucide-vue-next';

const props = defineProps<{
    sectionKey: string;
    sectionTitle: string;
    modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue']);
const store = useTemplateStore();

const activeSection = computed(() => {
    if (!store.activeTemplateId) return null;
    const t = store.templates.find(t => t.id === store.activeTemplateId);
    return t?.sections[props.sectionKey] || null;
});

const transitionEffect = ref(activeSection.value?.pageTransition?.effect || activeSection.value?.transitionEffect || 'none');
const transitionTrigger = ref(activeSection.value?.pageTransition?.trigger || activeSection.value?.transitionTrigger || 'scroll');
const transitionDuration = ref(activeSection.value?.pageTransition?.duration || activeSection.value?.transitionDuration || 1000);

const EFFECTS = [
    { value: 'none', label: 'None' },
    { value: 'fade', label: 'Fade' },
    { value: 'slide-up', label: 'Slide Up' },
    { value: 'slide-down', label: 'Slide Down' },
    { value: 'slide-left', label: 'Slide Left' },
    { value: 'slide-right', label: 'Slide Right' },
    { value: 'zoom-in', label: 'Zoom In' },
    { value: 'zoom-out', label: 'Zoom Out' },
    { value: 'rotate', label: 'Rotate' },
    { value: 'flip-x', label: 'Flip X' },
    { value: 'flip-y', label: 'Flip Y' },
    { value: 'blur', label: 'Blur' },
    { value: 'grayscale', label: 'Grayscale' },
    { value: 'sepia', label: 'Sepia' },
    { value: 'curtain', label: 'Curtain Open' },
    { value: 'door', label: 'Door Open' },
    { value: 'book', label: 'Book Flip' },
    { value: 'ripple', label: 'Ripple' },
    { value: 'glitch', label: 'Glitch' },
    { value: 'pixelate', label: 'Pixelate' },
    { value: 'swirl', label: 'Swirl' },
];

const save = async () => {
    if (store.activeTemplateId) {
        // CTO-LEVEL SYNC: Use the professional pageTransition object
        await store.updateSection(store.activeTemplateId, props.sectionKey, {
            pageTransition: {
                enabled: transitionEffect.value !== 'none',
                effect: transitionEffect.value as any,
                trigger: transitionTrigger.value as any,
                duration: parseInt(String(transitionDuration.value)),
                overlayEnabled: true // Default for luxury feel
            }
        });
    }
    emit('update:modelValue', false);
};

const close = () => {
    emit('update:modelValue', false);
};
</script>

<template>
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button class="absolute top-4 right-4 text-slate-400 hover:text-slate-600" @click="close">
                <X class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                    <Save class="w-6 h-6" />
                </div>
                <div>
                    <h3 class="font-bold text-lg text-slate-800">Page Transition</h3>
                    <p class="text-xs text-slate-500">Customize how {{ sectionTitle }} appears</p>
                </div>
            </div>

            <div class="space-y-4">
                <!-- Effect -->
                <div class="space-y-2">
                    <Label>Transition Effect</Label>
                    <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                        <button 
                            v-for="effect in EFFECTS" 
                            :key="effect.value"
                            class="text-left px-3 py-2 rounded text-sm transition-colors"
                            :class="transitionEffect === effect.value ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'hover:bg-slate-50 text-slate-600'"
                            @click="transitionEffect = effect.value"
                        >
                            {{ effect.label }}
                        </button>
                    </div>
                </div>

                <!-- Trigger -->
                <div class="space-y-2">
                    <Label>Trigger</Label>
                    <select v-model="transitionTrigger" class="w-full rounded-md border border-slate-200 p-2 text-sm">
                        <option value="scroll">On Scroll (Default)</option>
                        <option value="click">Click Page</option>
                        <option value="open_btn">Click Open Button</option>
                    </select>
                    <p class="text-xs text-slate-400" v-if="transitionTrigger === 'open_btn'">
                        This transition will play when the "Open Invitation" button is clicked.
                    </p>
                </div>

                <!-- Duration -->
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <Label>Duration</Label>
                        <span class="text-xs text-slate-500">{{ transitionDuration }}ms</span>
                    </div>
                    <input 
                        type="range" 
                        min="500" 
                        max="3000" 
                        step="100" 
                        v-model="transitionDuration" 
                        class="w-full"
                    />
                </div>
            </div>

            <div class="mt-8 flex gap-3">
                <Button variant="outline" class="flex-1" @click="close">Cancel</Button>
                <Button class="flex-1 bg-indigo-600 hover:bg-indigo-700" @click="save">Save Changes</Button>
            </div>
        </div>
    </div>
</template>
