<script setup lang="ts">
import { ref } from 'vue';
import { Upload, X, FileVideo, Image as ImageIcon, Loader2 } from 'lucide-vue-next';
import Button from '@/components/ui/Button.vue';
import Label from '@/components/ui/Label.vue';
import SafeImage from '@/components/ui/SafeImage.vue';
import { uploadFile } from '@/services/cloudflare-api';

interface Props {
  modelValue: string;
  label?: string;
  accept?: string;
  maxSize?: number; // in bytes
  type?: 'image' | 'video' | 'any';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Upload File',
  accept: 'image/*,video/*',
  type: 'image',
  disabled: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'change': [value: string];
  'error': [message: string];
}>();

const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const triggerUpload = () => {
  if (props.disabled || isUploading.value) return;
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Validate size
  if (props.maxSize && file.size > props.maxSize) {
    emit('error', `File too large. Max size is ${Math.round(props.maxSize / 1024 / 1024)}MB`);
    if (fileInput.value) fileInput.value.value = '';
    return;
  }

  isUploading.value = true;
  try {
    const result = await uploadFile(file);
    if (result.success && result.url) {
      emit('update:modelValue', result.url);
      emit('change', result.url);
    } else {
        emit('error', 'Upload failed. Please try again.');
    }
  } catch (error) {
    console.error('Upload failed:', error);
    emit('error', 'Upload failed. Please check your connection.');
  } finally {
    isUploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

const removeFile = () => {
  emit('update:modelValue', '');
  emit('change', '');
};

const getFileName = (url: string) => {
  try {
      return url.split('/').pop() || 'File';
  } catch (e) {
      return 'File';
  }
};

const isVideo = (url: string) => {
    return url.match(/\.(mp4|webm|ogg)$/i);
};
</script>

<template>
  <div class="space-y-2">
    <Label v-if="label" class="text-sm font-medium text-gray-700">{{ label }}</Label>
    
    <div class="flex items-start gap-4">
      <!-- Preview/Status Box -->
      <div 
        class="relative w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 group"
        :class="{ 'border-solid border-teal-200': modelValue }"
      >
        <template v-if="isUploading">
            <Loader2 class="w-8 h-8 text-teal-500 animate-spin" />
        </template>
        
        <template v-else-if="modelValue">
            <!-- Image Preview -->
            <SafeImage 
                v-if="type === 'image' || !isVideo(modelValue)"
                :src="modelValue" 
                :alt="label"
                class="w-full h-full object-cover"
            />
            <!-- Video Preview Placeholder -->
             <div v-else class="flex flex-col items-center gap-1 p-1 text-center">
                <FileVideo class="w-8 h-8 text-blue-500" />
                <span class="text-[10px] text-gray-500 line-clamp-2 leading-tight break-all">{{ getFileName(modelValue) }}</span>
             </div>
             
             <!-- Hover overlay to click/delete? Maybe handled by buttons on right for better mobile ux -->
        </template>
        
        <template v-else>
            <ImageIcon v-if="type === 'image'" class="w-8 h-8 text-gray-300" />
            <FileVideo v-else-if="type === 'video'" class="w-8 h-8 text-gray-300" />
            <Upload v-else class="w-8 h-8 text-gray-300" />
        </template>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2 min-w-0 flex-1">
        <div v-if="modelValue" class="text-xs text-gray-500 break-all truncate">
           Current: <a :href="modelValue" target="_blank" class="text-teal-600 hover:underline">{{ getFileName(modelValue) }}</a>
        </div>
        
        <div class="flex flex-wrap gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                @click="triggerUpload"
                :disabled="isUploading || disabled"
                class="flex items-center gap-2"
            >
                <Upload class="w-4 h-4" />
                {{ modelValue ? 'Ganti File' : 'Upload File' }}
            </Button>
            
            <Button 
                v-if="modelValue"
                variant="ghost" 
                size="sm" 
                @click="removeFile"
                :disabled="isUploading || disabled"
                class="flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
                <X class="w-4 h-4" />
                Hapus
            </Button>
        </div>
        <p class="text-[10px] text-gray-400">
            Max size: {{ maxSize ? Math.round(maxSize/1024/1024) + 'MB' : 'Unlimited' }}
        </p>
      </div>
    </div>

    <input 
      ref="fileInput"
      type="file"
      :accept="accept"
      class="hidden"
      @change="handleFileChange"
    />
  </div>
</template>
