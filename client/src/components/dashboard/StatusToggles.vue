<script setup lang="ts">
import { computed } from "vue";
import { useInvitationStore } from "@/stores/invitation";
import Toggle from "@/components/ui/Toggle.vue";
import Label from "@/components/ui/Label.vue";

const store = useInvitationStore();

const isActive = computed({
  get: () => store.invitation.isActive,
  set: (val) => store.updateInvitationStatus(val),
});

const isScroll = computed({
  get: () => store.invitation.invitationType === "scroll",
  set: (val) => store.updateInvitationType(val ? "scroll" : "standard"),
});

const isGreetingEnabled = computed({
  get: () => store.invitation.greeting.enabled,
  set: (val) =>
    store.updateGreeting({ ...store.invitation.greeting, enabled: val }),
});
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div class="space-y-0.5">
        <Label class="text-base font-semibold">Status Undangan</Label>
        <p class="text-xs text-gray-500">Aktifkan/Nonaktifkan publikasi</p>
      </div>
      <Toggle v-model="isActive" />
    </div>

    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div class="space-y-0.5">
        <Label class="text-base font-semibold">Mode Scroll</Label>
        <p class="text-xs text-gray-500">Scrolling vs. Paging</p>
      </div>
      <Toggle v-model="isScroll" />
    </div>

    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div class="space-y-0.5">
        <Label class="text-base font-semibold">Cover Depan</Label>
        <p class="text-xs text-gray-500">Tampilkan cover sapaan</p>
      </div>
      <Toggle v-model="isGreetingEnabled" />
    </div>
  </div>
</template>
