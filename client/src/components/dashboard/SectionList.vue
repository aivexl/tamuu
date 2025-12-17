<script setup lang="ts">
import { ref, computed } from "vue";
import type { InvitationSection } from "@/lib/types";
import draggable from "vuedraggable";
import { GripVertical, ArrowUp, ArrowDown, Eye, EyeOff, Copy, Trash2 } from "lucide-vue-next";
import { useInvitationStore } from "@/stores/invitation";
import Button from "@/components/ui/Button.vue";
import SectionEditor from "./SectionEditor.vue";

const store = useInvitationStore();

// Computed for v-model of draggable
const sections = computed({
  get: () => store.invitation.sections,
  set: (newOrder) => {
    // Update order property based on index
    const ordered = newOrder.map((section: InvitationSection, index: number) => ({
      ...section,
      order: index + 1,
    }));
    store.reorderSections(ordered);
  },
});

const expandedSections = ref<Set<string>>(new Set());

const toggleExpand = (sectionId: string) => {
  const newSet = new Set(expandedSections.value);
  if (newSet.has(sectionId)) {
    newSet.delete(sectionId);
  } else {
    newSet.add(sectionId);
  }
  expandedSections.value = newSet;
};

// Expand all by default or on mount?
// Let's expand all initially to match the "canvas" feel
store.invitation.sections.forEach(s => expandedSections.value.add(s.id));
</script>

<template>
  <div class="">
    <draggable
      v-model="sections"
      item-key="id"
      handle=".drag-handle"
      :animation="200"
      ghost-class="opacity-50"
      drag-class="shadow-lg z-50"
    >
      <template #item="{ element: section }">
        <div
          class="relative bg-white transition-all duration-200 group"
        >
          <!-- Header Row Overlay -->
          <div 
            class="absolute top-0 left-0 w-full z-10 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 backdrop-blur-sm border-b border-gray-100"
            @click="toggleExpand(section.id)"
          >
            <div
              class="drag-handle text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1"
              @click.stop
            >
              <GripVertical class="w-5 h-5" />
            </div>

            <div
              class="flex-1 text-sm font-medium text-gray-700 capitalize flex items-center gap-2"
            >
              <span
                v-if="section.type === 'maps'"
                class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
              >
                Maps
              </span>
              {{ section.title }}
            </div>

            <!-- Controls -->
            <div class="flex items-center gap-1" @click.stop>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100" @click="store.moveSection(sections.indexOf(section), 'up')" title="Move Up">
                    <ArrowUp class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100" @click="store.moveSection(sections.indexOf(section), 'down')" title="Move Down">
                    <ArrowDown class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100" @click="store.toggleSectionVisibility(section.id)" title="Toggle Visibility">
                    <Eye v-if="section.isVisible" class="w-4 h-4" />
                    <EyeOff v-else class="w-4 h-4 text-gray-300" />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100" @click="store.duplicateSection(section.id)" title="Duplicate">
                    <Copy class="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" @click="store.deleteSection(section.id)" title="Delete">
                    <Trash2 class="w-4 h-4" />
                </Button>
                <Button
              size="sm"
              variant="ghost"
              @click="toggleExpand(section.id)"
              class="min-w-[70px]"
              :class="{
                'bg-gray-100 text-gray-700 hover:bg-gray-200': !expandedSections.has(section.id),
                'bg-blue-50 text-blue-600': expandedSections.has(section.id)
              }"
            >
              {{ expandedSections.has(section.id) ? "Close" : "Edit" }}
            </Button>
            </div>
          </div>

          <!-- Expanded Editor Area -->
          <div
            v-if="expandedSections.has(section.id)"
            class="bg-white"
          >
            <SectionEditor :section="section" />
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>
