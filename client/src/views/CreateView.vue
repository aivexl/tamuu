<script setup lang="ts">
import AppHeader from "@/components/layout/AppHeader.vue";
import InvitationInfoCard from "@/components/dashboard/InvitationInfoCard.vue";
import IconGridMenu from "@/components/dashboard/IconGridMenu.vue";
import StatusToggles from "@/components/dashboard/StatusToggles.vue";
import TemplateEditArea from "@/components/dashboard/TemplateEditArea.vue";
import Modal from "@/components/ui/Modal.vue";
import { useInvitationStore } from "@/stores/invitation";

const store = useInvitationStore();

// Watch activePanel to open modal
// Since activePanel is in store, we can use it to drive Modal state
// However, the Modal implementation in legacy used activePanel string.

const handleCloseModal = () => {
    store.setActivePanel(null);
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
    <AppHeader />

    <div class="max-w-4xl mx-auto p-6 space-y-6">
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
