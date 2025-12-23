<script setup lang="ts">
import AppHeader from "@/components/layout/AppHeader.vue";
import InvitationInfoCard from "@/components/dashboard/InvitationInfoCard.vue";
import IconGridMenu from "@/components/dashboard/IconGridMenu.vue";
import StatusToggles from "@/components/dashboard/StatusToggles.vue";
import TemplateEditArea from "@/components/dashboard/TemplateEditArea.vue";
import Modal from "@/components/ui/Modal.vue";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useInvitationStore } from "@/stores/invitation";
import { invitationsApi } from "@/lib/api/invitations";

const store = useInvitationStore();
const route = useRoute();
const loading = ref(false);

onMounted(async () => {
    const invitationId = route.query.id as string;
    if (invitationId) {
        loading.value = true;
        try {
            const invitation = await invitationsApi.getInvitation(invitationId);
            // We need to map TemplateResponse to Invitation type if they differ
            // For now, assume store.setInvitation can handle it or we map it
            // Actually, let's just set the ID in store for now, or fetch full data
            store.updateTemplateId(invitation.id);
            // If the invitation object from backend is what we need:
            // store.setInvitation(invitation as any); 
        } catch (error) {
            console.error("Failed to load invitation:", error);
        } finally {
            loading.value = false;
        }
    }
});

const handleCloseModal = () => {
    store.setActivePanel(null);
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
    <AppHeader />

    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="flex flex-col items-center gap-4">
        <div class="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-500 font-medium animate-pulse">Memuat Undangan Anda...</p>
      </div>
    </div>

    <div v-else class="max-w-4xl mx-auto p-6 space-y-6">
      <InvitationInfoCard />

      <IconGridMenu />

      <StatusToggles />

      <TemplateEditArea />
    </div>

    <!-- Panel Modal -->
    <Modal
      :isOpen="store.activePanel !== null"
      @close="handleCloseModal"
      :title="store.activePanel ? store.activePanel.charAt(0).toUpperCase() + store.activePanel.slice(1) : ''"
      size="lg"
    >
      <div class="text-center py-12">
        <p class="text-gray-600">
          Panel untuk <strong>{{ store.activePanel }}</strong> akan ditambahkan di sini
        </p>
      </div>
    </Modal>
  </div>
</template>
