<script setup lang="ts">
import { computed, ref } from "vue";
import Card from "@/components/ui/Card.vue";
import Button from "@/components/ui/Button.vue";
import { Calendar, Clock, Upload } from "lucide-vue-next";
import { useInvitationStore } from "@/stores/invitation";
import { formatDate } from "date-fns";
import { id } from "date-fns/locale";

const store = useInvitationStore();
const activeUntil = computed(() => new Date(store.invitation.activeUntil));

const formattedDate = computed(() =>
  formatDate(activeUntil.value, "dd MMMM yyyy", { locale: id })
);
const formattedTime = computed(() =>
  formatDate(activeUntil.value, "HH:mm", { locale: id })
);

const fileInputRef = ref<HTMLInputElement | null>(null);
const triggerUpload = () => fileInputRef.value?.click();

const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        store.updateThumbnail(url);
    }
};
</script>

<template>
  <Card variant="glass" class="bg-gradient-to-br from-blue-50 to-teal-50 border-none">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="relative w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center overflow-hidden border">
           <img v-if="store.invitation.thumbnailUrl" :src="store.invitation.thumbnailUrl" class="w-full h-full object-cover" />
           <Calendar v-else class="w-8 h-8 text-teal-600" />
           
           <div class="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" @click="triggerUpload">
                <Upload class="w-5 h-5 text-white" />
           </div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">Link Publik</div>
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-teal-700">
              tamuu.id/{{ store.invitation.slug }}
            </span>
          </div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">Aktif Sampai</div>
          <div class="flex items-center gap-2 flex-wrap">
            <Clock class="w-4 h-4 text-gray-500" />
            <span class="font-semibold text-gray-900">
              {{ formattedDate }} - {{ formattedTime }}
            </span>
          </div>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        class="bg-yellow-400 border-yellow-500 text-gray-900 hover:bg-yellow-500 w-full sm:w-auto"
      >
        Perpanjang
      </Button>
      <input type="file" ref="fileInputRef" class="hidden" accept="image/*" @change="handleFileChange" />
    </div>
  </Card>
</template>
