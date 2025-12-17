<script setup lang="ts">
import { computed } from "vue";
import { type InvitationSection } from "@/lib/types";
import { useInvitationStore } from "@/stores/invitation";
import Input from "@/components/ui/Input.vue";
import Textarea from "@/components/ui/Textarea.vue";
import Label from "@/components/ui/Label.vue";
import Button from "@/components/ui/Button.vue";
import { Upload } from "lucide-vue-next";

interface Props {
  section: InvitationSection;
}

const props = defineProps<Props>();
const store = useInvitationStore();

const handleTextChange = (key: string, value: string) => {
  store.updateSection(props.section.id, {
    data: {
      ...props.section.data,
      [key]: value,
    },
  });
};

const renderTextFields = computed(() => {
  return Object.entries(props.section.data)
    .filter(([key, value]) => {
      // Filter logic similar to legacy: string, not ID/Type/Image
      return (
        typeof value === "string" &&
        key !== "id" &&
        key !== "type" &&
        key !== "image"
      );
    })
    .map(([key, value]) => ({
        key,
        value: value as string,
        label: key.replace(/([A-Z])/g, " $1").trim(),
        isLongText: (value as string).length > 50 || key === "message" || key === "quote"
    }));
});
</script>

<template>
  <div class="pb-12">
    <h3 class="text-lg font-semibold mb-4 flex items-center gap-2 capitalize">
      Edit {{ section.title }}
    </h3>

    <!-- Maps specific editor -->
    <div v-if="section.type === 'maps'" class="space-y-6">
      <div class="space-y-2">
        <Label>Location Image</Label>
        <div
          class="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <div v-if="section.data.image" class="relative w-full aspect-video mb-4">
            <img
              :src="section.data.image as string"
              alt="Location"
              class="object-cover rounded-md w-full h-full"
            />
            <Button
              variant="destructive"
              size="sm"
              class="absolute top-2 right-2"
              @click="handleTextChange('image', '')"
            >
              Remove
            </Button>
          </div>
          <div v-else class="text-center">
            <div
              class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3"
            >
              <Upload class="w-6 h-6" />
            </div>
            <p class="text-sm font-medium text-gray-900">Click to upload image</p>
            <p class="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 2MB)</p>
            <div class="mt-4 flex gap-2">
              <Input
                placeholder="Or paste image URL..."
                :model-value="(section.data.image as string) || ''"
                @update:model-value="(val) => handleTextChange('image', val)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Generic Fields -->
    <div v-for="field in renderTextFields" :key="field.key" class="space-y-2 mb-4">
      <Label :for="field.key" class="capitalize">{{ field.label }}</Label>
      <Textarea
        v-if="field.isLongText"
        :id="field.key"
        :model-value="field.value"
        @update:model-value="(val) => handleTextChange(field.key, val)"
        class="min-h-[100px]"
      />
      <Input
        v-else
        :id="field.key"
        :model-value="field.value"
        @update:model-value="(val) => handleTextChange(field.key, val)"
      />
    </div>

    <div class="flex justify-end mt-4">
      <Button variant="outline" size="sm"> Reset to Default </Button>
    </div>
  </div>
</template>
