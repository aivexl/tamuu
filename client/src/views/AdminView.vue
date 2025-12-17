<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTemplateStore } from "@/stores/template";
import { Plus, Edit, Trash2, Eye, AlertTriangle } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import SafeImage from "@/components/ui/SafeImage.vue";

const router = useRouter();
const store = useTemplateStore();

onMounted(async () => {
    // Only fetch if empty or force refresh
    if (store.templates.length === 0) {
        await store.fetchTemplates();
    }
});

const handleCreateTemplate = async () => {
  const newId = `t${Date.now()}`;
  const createdId = await store.addTemplate({
    name: `New Template ${store.templates.length + 1}`,
    thumbnail:
      "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400",
    sections: {}, // Will use defaults in store
    sectionOrder: [],
    customSections: [],
    globalTheme: {
      id: newId,
      name: "New Template",
      category: "modern",
      colors: {
        primary: "#000000",
        secondary: "#ffffff",
        accent: "#cccccc",
        background: "#ffffff",
        text: "#000000",
      },
      fontFamily: "Inter",
    },
    eventDate: new Date().toISOString(),
  });

  if (createdId) {
    router.push(`/editor/${createdId}`);
  }
};

const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
        // Implement delete action in store
        // await store.deleteTemplate(id); // TODO: Add this to store
        alert("Delete not implemented in this demo");
    }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Template Manager</h1>
            <p class="text-sm text-slate-500">
              Create and edit invitation templates
            </p>
          </div>
          <Button @click="handleCreateTemplate" class="flex items-center gap-2">
            <Plus class="w-4 h-4" />
            Create Template
          </Button>
        </div>
      </div>
    </header>

    <!-- Template Grid -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Error State -->
      <div
        v-if="store.error"
        class="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700"
      >
        <div
          class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-red-100"
        >
          <AlertTriangle class="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h3 class="font-semibold">Connection Error</h3>
          <p class="text-sm">{{ store.error }}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          @click="store.fetchTemplates()"
          class="ml-auto bg-white hover:bg-red-50 border-red-200 text-red-700"
        >
          Retry
        </Button>
      </div>

      <!-- Loading State -->
      <div
        v-if="store.isLoading"
        class="flex flex-col items-center justify-center py-20"
      >
        <div
          class="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mb-4"
        ></div>
        <p class="text-slate-500">Loading templates...</p>
      </div>

      <!-- Grid -->
      <div v-else>
        <div
            v-if="store.templates.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <Card
            v-for="template in store.templates"
            :key="template.id"
            class="overflow-hidden group hover:shadow-xl transition-shadow duration-300 p-0 border-0"
          >
            <!-- Thumbnail -->
            <div class="relative aspect-[4/3] bg-slate-100 group">
              <SafeImage
                :src="template.thumbnail"
                :alt="template.name"
                class="object-cover w-full h-full"
              />
              <!-- Overlay -->
              <div
                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3"
              >
                <Button
                  size="sm"
                  variant="secondary"
                  class="flex items-center gap-1"
                  @click="router.push(`/editor/${template.id}`)"
                >
                  <Edit class="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="flex items-center gap-1 bg-white/90"
                >
                  <Eye class="w-3.5 h-3.5" />
                  Preview
                </Button>
              </div>
            </div>

            <!-- Info -->
            <div class="p-4 border-t border-slate-100">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-slate-800 truncate pr-2">
                  {{ template.name }}
                </h3>
                <button
                  @click="handleDelete(template.id)"
                  class="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                 {{ template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'Just now' }}
              </p>
            </div>
          </Card>
        </div>

        <!-- Empty State -->
        <div v-else-if="!store.error" class="text-center py-16">
            <p class="text-slate-500">No templates yet. Create your first one!</p>
        </div>
      </div>
    </main>
  </div>
</template>
