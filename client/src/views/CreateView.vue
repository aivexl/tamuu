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
    const slug = route.params.slug as string;
    const invitationId = route.query.id as string;
    
    if (slug || invitationId) {
        loading.value = true;
        try {
            let invitation;
            if (slug) {
                invitation = await invitationsApi.getInvitationBySlug(slug);
            } else {
                invitation = await invitationsApi.getInvitation(invitationId);
            }
            
            // Map TemplateResponse (API) to Invitation (Store)
            store.setInvitation({
                ...store.invitation,
                id: invitation.id,
                slug: invitation.slug || "",
                title: invitation.name,
                templateId: invitation.sourceTemplateId || undefined,
                updatedAt: invitation.updatedAt,
                createdAt: invitation.createdAt
            });
            
            console.log("[CreateView] Invitation loaded:", slug || invitationId);
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
