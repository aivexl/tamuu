import { defineStore } from "pinia";
import type {
    Template,
    SectionDesign,
    TemplateElement,
    AnimationType,
} from "@/lib/types";
import * as CloudflareAPI from "@/services/cloudflare-api";
import { PREDEFINED_SECTION_TYPES } from "@/lib/types";


interface State {
    templates: Template[];
    activeTemplateId: string | null;
    selectedElementId: string | null;
    clipboard: TemplateElement | null;
    isLoading: boolean;
    error: string | null;
    isOnline: boolean;
    tempIdMap: Map<string, string>; // Maps temp-id -> db-id for race conditions
    pathEditingId: string | null;
}

export const useTemplateStore = defineStore("template", {
    state: (): State => ({
        templates: [],
        activeTemplateId: null,
        selectedElementId: null,
        pathEditingId: null, // ID of element currently being path-edited
        clipboard: null,
        isLoading: false,
        error: null,
        isOnline: navigator.onLine,
        tempIdMap: new Map(),
    }),

    actions: {
        async fetchTemplates() {
            this.isLoading = true;
            this.error = null;

            if (!this.isOnline) {
                this.error = "No internet connection";
                this.isLoading = false;
                return;
            }

            try {
                const templates = await CloudflareAPI.getTemplates();
                this.templates = templates;
                this.isLoading = false;
            } catch (error: any) {
                this.error = error.message;
                this.isLoading = false;
            }
        },

        async fetchTemplate(id: string) {
            this.isLoading = true;
            this.error = null;

            try {
                const template = await CloudflareAPI.getTemplate(id);
                if (template) {
                    const existing = this.templates.find((t) => t.id === id);
                    if (existing) {
                        // ENTERPRISE FIX: Merge section & element properties instead of replacing
                        Object.keys(template.sections).forEach(sectionType => {
                            const dbSection = template.sections[sectionType];
                            const localSection = existing.sections[sectionType];
                            if (!dbSection || !localSection) return;

                            // 1. Merge section-level properties (backgroundColor, particleType, etc.)
                            // Local properties override DB properties unless they are undefined
                            Object.keys(dbSection).forEach(key => {
                                const k = key as keyof SectionDesign;
                                if (k !== 'elements' && localSection[k] !== undefined) {
                                    (dbSection as any)[k] = localSection[k];
                                }
                            });

                            // 2. Merge elements
                            const dbElements = dbSection.elements || [];
                            const localElements = localSection.elements || [];

                            const mergedElements = dbElements.map(dbEl => {
                                const localEl = localElements.find(e => e.id === dbEl.id);
                                if (localEl) {
                                    return { ...dbEl, ...localEl };
                                }
                                return dbEl;
                            });

                            const pendingElements = localElements.filter(el =>
                                (el.id.startsWith('temp-') || el.id.startsWith('el-')) &&
                                !mergedElements.find(e => e.id === el.id)
                            );

                            dbSection.elements = [...mergedElements, ...pendingElements];
                        });

                        // Replace the template (with merged sections)
                        const index = this.templates.findIndex(t => t.id === id);
                        this.templates[index] = template;
                    } else {
                        this.templates.push(template);
                    }
                } else {
                    this.error = "Template not found";
                }
                this.isLoading = false;
            } catch (error: any) {
                this.error = error.message;
                this.isLoading = false;
            }
        },

        async updateTemplate(id: string, updates: Partial<Template>) {
            this.isLoading = true;
            try {
                await CloudflareAPI.updateTemplate(id, updates);
                const template = this.templates.find(t => t.id === id);
                if (template) {
                    Object.assign(template, updates);
                }
                this.isLoading = false;
            } catch (error: any) {
                this.error = error.message;
                this.isLoading = false;
                throw error;
            }
        },

        async addTemplate(
            templateData: Omit<
                Template,
                "id" | "createdAt" | "updatedAt" | "status"
            > & { status?: "draft" | "published" }
        ) {
            this.isLoading = true;
            try {
                const sections =
                    templateData.sections && Object.keys(templateData.sections).length > 0
                        ? templateData.sections
                        : PREDEFINED_SECTION_TYPES.reduce(
                            (acc, type) => ({
                                ...acc,
                                [type]: {
                                    animation: "fade-in" as AnimationType,
                                    elements: [],
                                    isVisible: true,
                                    pageTitle: type,
                                },
                            }),
                            {} as Record<string, SectionDesign>
                        );

                const newTemplate = await CloudflareAPI.createTemplate({
                    ...templateData,
                    sections,
                });

                if (newTemplate) {
                    this.templates.unshift(newTemplate);
                    this.isLoading = false;
                    return newTemplate.id;
                }
            } catch (error: any) {
                this.error = error.message;
                this.isLoading = false;
                return null;
            }
        },

        async updateElement(
            templateId: string,
            sectionType: string,
            elementId: string,
            updates: Partial<TemplateElement>,
            options: { skipDb?: boolean } = {}
        ) {
            console.log('[Store] updateElement called:', { templateId, sectionType, elementId, updates, options });

            // Check if elementId is a temporary ID that has already been mapped
            const realId = this.tempIdMap.get(elementId) || elementId;
            const targetId = realId;

            // Optimistic update
            const template = this.templates.find((t) => t.id === templateId);
            if (template) {
                const section = template.sections[sectionType];
                if (section) {
                    const index = section.elements.findIndex((el) => el.id === targetId || el.id === elementId);
                    if (index !== -1) {
                        section.elements[index] = { ...section.elements[index], ...updates } as TemplateElement;
                    }
                }
            }

            if (options.skipDb) {
                console.log('[Store] skipDb=true, not calling API');
                return;
            }

            try {
                console.log(`[Store] Calling CloudflareAPI.updateElement for ${targetId}...`);
                await CloudflareAPI.updateElement(targetId, updates, templateId);
            } catch (error: any) {
                console.error("[Store] Failed to update element:", error);
            }
        },

        async updateSection(
            templateId: string,
            sectionType: string,
            updates: Partial<SectionDesign>
        ) {
            console.log('[Store] updateSection called:', { templateId, sectionType, updates });

            const template = this.templates.find((t) => t.id === templateId);
            if (template) {
                const section = template.sections[sectionType];
                if (section) {
                    // Optimistic update
                    Object.assign(section, updates);
                }
            }

            try {
                await CloudflareAPI.updateSection(templateId, sectionType, updates);
            } catch (error: any) {
                console.error("[Store] Failed to update section:", error);
                throw error;
            }
        },

        // ... (Implement other actions similarly: deleteElement, reorderElements, etc.)
        // For brevity in this turn, I will implement the most critical ones.

        async addElement(templateId: string, sectionType: string, element: TemplateElement) {
            const tempId = element.id;
            // Optimistic add
            const template = this.templates.find((t) => t.id === templateId);
            if (template) {
                const section = template.sections[sectionType];
                if (section) {
                    section.elements.push(element);
                }
            }

            try {
                const createdElement = await CloudflareAPI.createElement(templateId, sectionType, element);

                // Update mapping for race conditions
                this.tempIdMap.set(tempId, createdElement.id);

                // Sync ID
                const t = this.templates.find((t) => t.id === templateId);
                if (t) {
                    const s = t.sections[sectionType];
                    if (s) {
                        const el = s.elements.find((e) => e.id === tempId);
                        if (el) {
                            el.id = createdElement.id;
                        }
                    }
                }
                if (this.selectedElementId === tempId) {
                    this.selectedElementId = createdElement.id;
                }
            } catch (error) {
                console.error(error);
            }
        },

        setSelectedElement(id: string | null) {
            this.selectedElementId = id;
        },

        async deleteElement(templateId: string, sectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template || !template.sections[sectionType]) return;

            const section = template.sections[sectionType];
            const index = section.elements.findIndex((e) => e.id === elementId);
            if (index === -1) return;

            // Remove from local state
            section.elements.splice(index, 1);

            // Clear selection if deleted element was selected
            if (this.selectedElementId === elementId) {
                this.selectedElementId = null;
            }

            // Sync to DB (only if it's not a temp ID)
            if (!elementId.startsWith('el-')) {
                try {
                    await CloudflareAPI.deleteElement(elementId, templateId);
                } catch (error) {
                    console.error("Failed to delete element from DB:", error);
                }
            }
        },

        async duplicateElement(templateId: string, sectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template || !template.sections[sectionType]) return;

            const section = template.sections[sectionType];
            const original = section.elements.find((e) => e.id === elementId);
            if (!original) return;

            // Create duplicate with new ID and offset position
            const duplicate: TemplateElement = {
                ...JSON.parse(JSON.stringify(original)),
                id: `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                name: `${original.name || original.type} (copy)`,
                position: {
                    x: original.position.x + 20,
                    y: original.position.y + 20
                }
            };

            section.elements.push(duplicate);
            this.selectedElementId = duplicate.id;

            // Sync to DB
            try {
                const created = await CloudflareAPI.createElement(templateId, sectionType, duplicate);
                duplicate.id = created.id;
                this.selectedElementId = created.id;
            } catch (error) {
                console.error("Failed to duplicate element:", error);
            }
        },

        // Clipboard actions
        copyElement(templateId: string, sectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template || !template.sections[sectionType]) return;

            const element = template.sections[sectionType].elements.find((e) => e.id === elementId);
            if (element) {
                this.clipboard = JSON.parse(JSON.stringify(element));
            }
        },

        async pasteElement(templateId: string, sectionType: string) {
            if (!this.clipboard) return;

            const template = this.templates.find((t) => t.id === templateId);
            if (!template || !template.sections[sectionType]) return;

            const newElement: TemplateElement = {
                ...JSON.parse(JSON.stringify(this.clipboard)),
                id: `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                name: `${this.clipboard.name || this.clipboard.type} (pasted)`,
                position: {
                    x: this.clipboard.position.x + 20,
                    y: this.clipboard.position.y + 20
                }
            };

            template.sections[sectionType].elements.push(newElement);
            this.selectedElementId = newElement.id;

            try {
                const created = await CloudflareAPI.createElement(templateId, sectionType, newElement);
                this.tempIdMap.set(newElement.id, created.id);
                newElement.id = created.id;
                this.selectedElementId = created.id;
            } catch (error) {
                console.error("Failed to paste element:", error);
            }
        },

        async copyElementToSection(templateId: string, fromSectionType: string, toSectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template || !template.sections[fromSectionType] || !template.sections[toSectionType]) return;

            const original = template.sections[fromSectionType].elements.find(e => e.id === elementId);
            if (!original) return;

            const newElement: TemplateElement = {
                ...JSON.parse(JSON.stringify(original)),
                id: `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                name: `${original.name || original.type} (copy)`,
                // Keep original position or offset slightly? 
                // User said "copy to another page", so keeping same position relative to canvas is usually desired.
                position: { ...original.position }
            };

            // Optimistic Add
            template.sections[toSectionType].elements.push(newElement);

            try {
                const created = await CloudflareAPI.createElement(templateId, toSectionType, newElement);
                // Update ID
                newElement.id = created.id;
            } catch (error) {
                console.error("Failed to copy element to section:", error);
                // Revert
                const idx = template.sections[toSectionType].elements.indexOf(newElement);
                if (idx !== -1) template.sections[toSectionType].elements.splice(idx, 1);
            }
        },

        async copySectionElementsTo(templateId: string, fromSectionType: string, toSectionType: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template || !template.sections[fromSectionType] || !template.sections[toSectionType]) return;

            const sourceSection = template.sections[fromSectionType];
            const targetSection = template.sections[toSectionType];
            const sourceElements = sourceSection.elements;

            // Copy section styles (backgroundColor, backgroundUrl, overlayOpacity, textColor)
            const stylesToCopy = {
                backgroundColor: sourceSection.backgroundColor,
                backgroundUrl: sourceSection.backgroundUrl,
                overlayOpacity: sourceSection.overlayOpacity,
                textColor: sourceSection.textColor,
            };

            // Apply styles to target section locally
            Object.assign(targetSection, stylesToCopy);

            // Persist section style updates to database
            try {
                await CloudflareAPI.updateSection(templateId, toSectionType, stylesToCopy);
            } catch (error) {
                console.error("Failed to copy section styles:", error);
            }

            // Copy elements if any
            if (sourceElements.length === 0) return;

            const copiedElements: TemplateElement[] = [];

            for (const original of sourceElements) {
                const newElement: TemplateElement = {
                    ...JSON.parse(JSON.stringify(original)),
                    id: `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                    name: `${original.name || original.type} (copy)`,
                    position: { ...original.position }
                };

                // Optimistic Add
                targetSection.elements.push(newElement);
                copiedElements.push(newElement);

                try {
                    const created = await CloudflareAPI.createElement(templateId, toSectionType, newElement);
                    newElement.id = created.id;
                } catch (error) {
                    console.error("Failed to copy element to section:", error);
                    // Revert this element
                    const idx = targetSection.elements.indexOf(newElement);
                    if (idx !== -1) targetSection.elements.splice(idx, 1);
                }
            }
        },

        // Layer ordering actions
        bringToFront(templateId: string, sectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;

            const elements = template.sections[sectionType].elements;
            const maxZ = Math.max(...elements.map((e) => e.zIndex || 0));
            const element = elements.find((e) => e.id === elementId);
            if (element) {
                element.zIndex = maxZ + 1;
                this.updateElement(templateId, sectionType, elementId, { zIndex: element.zIndex });
            }
        },

        sendToBack(templateId: string, sectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;

            const elements = template.sections[sectionType].elements;
            const minZ = Math.min(...elements.map((e) => e.zIndex || 0));
            const element = elements.find((e) => e.id === elementId);
            if (element) {
                element.zIndex = minZ - 1;
                this.updateElement(templateId, sectionType, elementId, { zIndex: element.zIndex });
            }
        },

        bringForward(templateId: string, sectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;

            const elements = template.sections[sectionType].elements;
            const element = elements.find((e) => e.id === elementId);
            if (!element) return;

            const currentZ = element.zIndex || 0;
            const sortedByZ = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            const currentIdx = sortedByZ.findIndex((e) => e.id === elementId);

            if (currentIdx < sortedByZ.length - 1) {
                const above = sortedByZ[currentIdx + 1];
                if (above) {
                    element.zIndex = above.zIndex || 0;
                    above.zIndex = currentZ;
                    this.updateElement(templateId, sectionType, elementId, { zIndex: element.zIndex });
                    this.updateElement(templateId, sectionType, above.id, { zIndex: above.zIndex });
                }
            }
        },

        sendBackward(templateId: string, sectionType: string, elementId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;

            const elements = template.sections[sectionType].elements;
            const element = elements.find((e) => e.id === elementId);
            if (!element) return;

            const currentZ = element.zIndex || 0;
            const sortedByZ = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            const currentIdx = sortedByZ.findIndex((e) => e.id === elementId);

            if (currentIdx > 0) {
                const below = sortedByZ[currentIdx - 1];
                if (below) {
                    element.zIndex = below.zIndex || 0;
                    below.zIndex = currentZ;
                    this.updateElement(templateId, sectionType, elementId, { zIndex: element.zIndex });
                    this.updateElement(templateId, sectionType, below.id, { zIndex: below.zIndex });
                }
            }
        },

        // Section-level actions
        async addSection(templateId: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template) return;

            // Initialize sectionOrder if missing
            if (!template.sectionOrder) template.sectionOrder = [];

            // Calculate new order
            const newOrder = template.sectionOrder.length;

            const timestamp = Date.now();
            const newSectionKey = `custom-${timestamp}`;
            const newSectionTitle = `Halaman Baru ${template.sectionOrder.length + 1}`;

            // Create new section object locally
            const newSection: SectionDesign = {
                title: newSectionTitle,
                isVisible: true,
                order: newOrder,
                elements: [],
                animation: 'none'
            };

            // Optimistic Update
            template.sections[newSectionKey] = newSection;
            template.sectionOrder.push(newSectionKey);

            try {
                // 1. Create Section Row
                await CloudflareAPI.updateSection(templateId, newSectionKey, {
                    isVisible: true,
                    animation: 'none',
                    pageTitle: newSectionTitle,
                    // defaults
                });

                // 2. Update Order Intact
                await CloudflareAPI.updateTemplate(templateId, {
                    sectionOrder: template.sectionOrder
                });
            } catch (error) {
                console.error("Failed to add section:", error);
                // Revert
                template.sectionOrder = template.sectionOrder.filter(k => k !== newSectionKey);
                delete template.sections[newSectionKey];
            }
        },

        async renameSection(templateId: string, sectionKey: string, newTitle: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionKey]) return;

            template.sections[sectionKey].title = newTitle;

            try {
                await CloudflareAPI.updateSection(templateId, sectionKey, {
                    pageTitle: newTitle
                });
            } catch (error) {
                console.error("Failed to rename section:", error);
            }
        },

        async toggleSectionVisibility(templateId: string, sectionType: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;

            const section = template.sections[sectionType];
            if (section.isVisible === undefined) section.isVisible = true;
            section.isVisible = !section.isVisible;

            try {
                await CloudflareAPI.updateSection(templateId, sectionType, {
                    isVisible: section.isVisible
                });
            } catch (error) {
                console.error("Failed to toggle section visibility:", error);
            }
        },

        async duplicateSection(templateId: string, sectionType: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;
            if (!template.sectionOrder) template.sectionOrder = [];

            const original = template.sections[sectionType];
            const timestamp = Date.now();
            const newSectionKey = `copy-${sectionType}-${timestamp}`; // simple unique key

            // Insert after original
            const originalIndex = template.sectionOrder.indexOf(sectionType);
            const targetIndex = originalIndex === -1 ? template.sectionOrder.length : originalIndex + 1;

            // Clone Elements with new IDs
            const duplicatedElements = original.elements.map((el) => ({
                ...JSON.parse(JSON.stringify(el)),
                id: `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            }));

            const newSection: SectionDesign = {
                ...JSON.parse(JSON.stringify(original)),
                title: `${original.title || 'Untitled'} (Copy)`,
                order: targetIndex,
                elements: duplicatedElements
            };

            // Optimistic Update
            template.sections[newSectionKey] = newSection;
            template.sectionOrder.splice(targetIndex, 0, newSectionKey);

            // Re-assign order properties for local reactivity
            template.sectionOrder.forEach((key, index) => {
                if (template.sections[key]) template.sections[key].order = index;
            });

            try {
                // 1. Create the Section Row
                await CloudflareAPI.updateSection(templateId, newSectionKey, {
                    isVisible: newSection.isVisible,
                    animation: newSection.animation,
                    pageTitle: newSection.title,
                    backgroundColor: newSection.backgroundColor,
                    backgroundUrl: newSection.backgroundUrl,
                    overlayOpacity: newSection.overlayOpacity,
                    openInvitationConfig: newSection.openInvitationConfig
                });

                // 2. Create Elements and sync IDs
                for (const el of duplicatedElements) {
                    if (el.type) {
                        const tempId = el.id;
                        const created = await CloudflareAPI.createElement(templateId, newSectionKey, el);
                        this.tempIdMap.set(tempId, created.id);
                        el.id = created.id;
                    }
                }

                // 3. Update Order
                await CloudflareAPI.updateTemplate(templateId, { sectionOrder: template.sectionOrder });

            } catch (error) {
                console.error("Failed to duplicate section:", error);
                // Revert
                template.sectionOrder.splice(targetIndex, 1);
                delete template.sections[newSectionKey];
            }
        },

        async deleteSection(templateId: string, sectionType: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;
            if (!template.sectionOrder) template.sectionOrder = [];

            // Optimistic Update
            delete template.sections[sectionType];
            template.sectionOrder = template.sectionOrder.filter(k => k !== sectionType);

            try {
                // 1. Update Order First
                await CloudflareAPI.updateTemplate(templateId, {
                    sectionOrder: template.sectionOrder
                });

                // 2. Delete Section Row
                await CloudflareAPI.deleteSection(templateId, sectionType);
            } catch (error) {
                console.error("Failed to delete section:", error);
            }
        },

        async moveSectionUp(templateId: string, sectionType: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;

            // Initialize sectionOrder from sections if empty
            if (!template.sectionOrder || template.sectionOrder.length === 0) {
                template.sectionOrder = Object.entries(template.sections)
                    .map(([key, data]) => ({ key, order: data.order ?? 999 }))
                    .sort((a, b) => a.order - b.order)
                    .map(item => item.key);
            }

            const index = template.sectionOrder.indexOf(sectionType);
            if (index <= 0) return; // Already at top or not found

            // Swap in array
            const temp = template.sectionOrder[index - 1]!;
            template.sectionOrder[index - 1] = sectionType;
            template.sectionOrder[index] = temp;

            // Update local order properties
            template.sectionOrder.forEach((key, idx) => {
                if (template.sections[key]) template.sections[key].order = idx;
            });

            try {
                await CloudflareAPI.updateTemplate(templateId, {
                    sectionOrder: template.sectionOrder
                });
            } catch (error) {
                console.error("Failed to move section up:", error);
            }
        },

        async moveSectionDown(templateId: string, sectionType: string) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template?.sections[sectionType]) return;

            // Initialize sectionOrder from sections if empty
            if (!template.sectionOrder || template.sectionOrder.length === 0) {
                template.sectionOrder = Object.entries(template.sections)
                    .map(([key, data]) => ({ key, order: data.order ?? 999 }))
                    .sort((a, b) => a.order - b.order)
                    .map(item => item.key);
            }

            const index = template.sectionOrder.indexOf(sectionType);
            if (index === -1 || index >= template.sectionOrder.length - 1) return;

            // Swap
            const temp = template.sectionOrder[index + 1]!;
            template.sectionOrder[index + 1] = sectionType;
            template.sectionOrder[index] = temp;

            // Update local order properties
            template.sectionOrder.forEach((key, idx) => {
                if (template.sections[key]) template.sections[key].order = idx;
            });

            try {
                await CloudflareAPI.updateTemplate(templateId, {
                    sectionOrder: template.sectionOrder
                });
            } catch (error) {
                console.error("Failed to move section down:", error);
            }
        },

        // Hydrate store with default sections if missing (recover from legacy/broken state)
        hydrateDefaultSections(templateId: string, defaultSections: any[]) {
            const template = this.templates.find((t) => t.id === templateId);
            if (!template) return;

            // Only populate if completely empty
            if (Object.keys(template.sections).length === 0) {
                const sectionMap: Record<string, SectionDesign> = {};
                const sectionOrder: string[] = [];

                defaultSections.forEach((s) => {
                    sectionMap[s.key] = {
                        id: s.key, // Use key as ID for defaults
                        elements: [],
                        isVisible: true,
                        animation: 'none',
                        animationTrigger: 'scroll',
                        backgroundColor: '#ffffff',
                        transitionEffect: 'none',
                        transitionDuration: 1000,
                        transitionTrigger: 'scroll',
                        title: s.title,
                        order: s.order
                    };
                    sectionOrder.push(s.key);
                });

                template.sections = sectionMap;
                template.sectionOrder = sectionOrder;

                // Note: We are NOT persisting this to DB yet, only in memory to make UI functional.
                // User will persist when they modify something.
            }
        },

        // Legacy helper syncing sections json - redundant now?
        // Retaining for any other calls, but renamed or deprecated.
        async syncSections(_templateId: string, _sections: Record<string, SectionDesign>) {
            // NO-OP or handle legacy. 
            // We should NOT rely on this for section updates anymore.
        },
        async updateMotionPath(templateId: string, sectionType: string, elementId: string, points: Array<{ x: number, y: number }>) {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) return;
            const section = template.sections[sectionType];
            if (!section) return;
            const element = section.elements.find(e => e.id === elementId);
            if (!element) return;

            const newConfig = {
                ...(element.motionPathConfig || { duration: 3000, loop: true, enabled: true }),
                points
            };

            await this.updateElement(templateId, sectionType, elementId, {
                motionPathConfig: newConfig
            });
        },
    },
});
