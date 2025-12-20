<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import { MapPin, ExternalLink } from 'lucide-vue-next';

interface Props {
    modelValue: string;
    label: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
    'save': [value: string];
}>();

const localValue = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
    localValue.value = newVal;
});

const isValidMapsUrl = computed(() => {
    if (!localValue.value) return false;
    return localValue.value.includes('google.com/maps') || 
           localValue.value.includes('maps.google.com') ||
           localValue.value.includes('goo.gl/maps');
});

const handleBlur = () => {
    if (localValue.value !== props.modelValue) {
        emit('update:modelValue', localValue.value);
        emit('save', localValue.value);
    }
};

const openMaps = () => {
    if (isValidMapsUrl.value) {
        window.open(localValue.value, '_blank');
    }
};
</script>

<template>
    <div class="space-y-2">
        <Label class="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MapPin class="w-4 h-4 text-red-500" />
            {{ label }}
        </Label>
        
        <div class="flex gap-2">
            <Input
                v-model="localValue"
                placeholder="https://maps.google.com/..."
                class="flex-1"
                @blur="handleBlur"
            />
            <button
                v-if="isValidMapsUrl"
                @click="openMaps"
                class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Buka di Google Maps"
            >
                <ExternalLink class="w-4 h-4 text-gray-600" />
            </button>
        </div>
        
        <p v-if="localValue && !isValidMapsUrl" class="text-xs text-amber-600">
            Pastikan link benar (contoh: https://maps.google.com/...)
        </p>
        <p v-else-if="isValidMapsUrl" class="text-xs text-green-600 flex items-center gap-1">
            ✓ Link valid
        </p>
    </div>
</template>
