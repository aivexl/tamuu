<script setup lang="ts">
import { ref, watch } from 'vue';
import Input from '@/components/ui/Input.vue';
import Textarea from '@/components/ui/Textarea.vue';
import Label from '@/components/ui/Label.vue';

interface Props {
    modelValue: string;
    label: string;
    placeholder?: string;
    multiline?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: '',
    multiline: false
});

const emit = defineEmits<{
    'update:modelValue': [value: string];
    'save': [value: string];
}>();

const localValue = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
    localValue.value = newVal;
});

const handleBlur = () => {
    if (localValue.value !== props.modelValue) {
        emit('update:modelValue', localValue.value);
        emit('save', localValue.value);
    }
};
</script>

<template>
    <div class="space-y-2">
        <Label class="text-sm font-medium text-gray-700">{{ label }}</Label>
        <Textarea
            v-if="multiline"
            v-model="localValue"
            :placeholder="placeholder"
            class="w-full"
            :rows="4"
            @blur="handleBlur"
        />
        <Input
            v-else
            v-model="localValue"
            :placeholder="placeholder"
            class="w-full"
            @blur="handleBlur"
        />
    </div>
</template>
