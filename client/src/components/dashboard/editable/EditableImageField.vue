<script setup lang="ts">
import { ref, computed } from 'vue';
import Label from '@/components/ui/Label.vue';
import Button from '@/components/ui/Button.vue';
import SafeImage from '@/components/ui/SafeImage.vue';
import { Upload, X, Image as ImageIcon } from 'lucide-vue-next';
import { uploadFile } from '@/services/cloudflare-api';

interface Props {
    modelValue: string;
    label: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
    'save': [value: string];
}>();

const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const hasImage = computed(() => !!props.modelValue);

const triggerUpload = () => {
    fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    isUploading.value = true;
    try {
        const result = await uploadFile(file);
        if (result.success && result.url) {
            emit('update:modelValue', result.url);
            emit('save', result.url);
        }
    } catch (error) {
        console.error('Upload failed:', error);
    } finally {
        isUploading.value = false;
        if (fileInput.value) {
            fileInput.value.value = '';
        }
    }
};

const removeImage = () => {
    emit('update:modelValue', '');
    emit('save', '');
};
</script>

<template>
    <div class="space-y-3">
        <Label class="text-sm font-medium text-gray-700">{{ label }}</Label>
        
        <div class="flex items-start gap-4">
            <!-- Preview -->
            <div 
                class="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
                :class="{ 'border-solid': hasImage }"
            >
                <SafeImage 
                    v-if="hasImage" 
                    :src="modelValue" 
                    :alt="label"
                    class="w-full h-full object-cover"
                />
                <ImageIcon v-else class="w-8 h-8 text-gray-300" />
            </div>

            <!-- Controls -->
            <div class="flex flex-col gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    @click="triggerUpload"
                    :disabled="isUploading"
                    class="flex items-center gap-2"
                >
                    <Upload class="w-4 h-4" />
                    {{ isUploading ? 'Uploading...' : 'Upload Foto' }}
                </Button>
                
                <Button 
                    v-if="hasImage"
                    variant="ghost" 
                    size="sm" 
                    @click="removeImage"
                    class="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                    <X class="w-4 h-4" />
                    Hapus
                </Button>
            </div>
        </div>

        <input 
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
        />
    </div>
</template>
