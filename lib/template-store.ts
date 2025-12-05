import { create } from 'zustand';
import { Template, SectionType, SectionDesign, ThemeConfig, TemplateElement } from './types';

// Mock initial templates
const defaultTheme: ThemeConfig = {
    id: 'default',
    name: 'Default Theme',
    category: 'modern',
    colors: {
        primary: '#000000',
        secondary: '#ffffff',
        accent: '#cccccc',
        background: '#ffffff',
        text: '#000000',
    },
    fontFamily: 'Inter',
};

const demoTemplates: Template[] = [
    {
        id: 't1',
        name: 'Elegant Gold',
        thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400',
        sections: {
            opening: {
                animation: 'fade-in',
                overlayOpacity: 0.3,
                elements: [
                    {
                        id: 'e1',
                        type: 'text',
                        name: 'Title',
                        position: { x: 37, y: 80 },
                        size: { width: 300, height: 40 },
                        animation: 'fade-in',
                        zIndex: 1,
                        content: 'The Wedding of',
                        textStyle: {
                            fontFamily: 'Playfair Display',
                            fontSize: 24,
                            fontWeight: 'normal',
                            fontStyle: 'italic',
                            textDecoration: 'none',
                            textAlign: 'center',
                            color: '#b8860b',
                        },
                    },
                    {
                        id: 'e2',
                        type: 'text',
                        name: 'Names',
                        position: { x: 37, y: 130 },
                        size: { width: 300, height: 100 },
                        animation: 'zoom-in',
                        animationDelay: 0.3,
                        zIndex: 2,
                        content: 'Muhyina & Misbah',
                        textStyle: {
                            fontFamily: 'Dancing Script',
                            fontSize: 42,
                            fontWeight: 'bold',
                            fontStyle: 'normal',
                            textDecoration: 'none',
                            textAlign: 'center',
                            color: '#2c1810',
                        },
                    },
                ],
            },
            quotes: { animation: 'slide-up', elements: [] },
            couple: { animation: 'zoom-in', elements: [] },
            event: { animation: 'slide-up', elements: [] },
            maps: { animation: 'fade-in', elements: [] },
            rsvp: { animation: 'slide-up', elements: [] },
            thanks: { animation: 'fade-in', elements: [] },
        },
        globalTheme: { ...defaultTheme, name: 'Elegant Gold', id: 'elegant-gold' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 't2',
        name: 'Rustic Garden',
        thumbnail: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400',
        sections: {
            opening: { animation: 'zoom-out', overlayOpacity: 0.2, elements: [] },
            quotes: { animation: 'fade-in', elements: [] },
            couple: { animation: 'slide-left', elements: [] },
            event: { animation: 'slide-right', elements: [] },
            maps: { animation: 'zoom-in', elements: [] },
            rsvp: { animation: 'bounce', elements: [] },
            thanks: { animation: 'flip-y', elements: [] },
        },
        globalTheme: { ...defaultTheme, name: 'Rustic Garden', id: 'rustic-garden' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

interface TemplateStore {
    templates: Template[];
    activeTemplateId: string | null;
    selectedElementId: string | null;

    // Actions
    addTemplate: (template: Template) => void;
    updateTemplate: (id: string, updates: Partial<Template>) => void;
    deleteTemplate: (id: string) => void;
    setActiveTemplate: (id: string | null) => void;
    updateSectionDesign: (templateId: string, sectionType: SectionType, design: Partial<SectionDesign>) => void;
    reorderSections: (templateId: string, newOrder: SectionType[]) => void;

    // Section copy actions
    copySectionDesign: (templateId: string, fromSection: SectionType, toSection: SectionType) => void;
    duplicateElement: (templateId: string, fromSection: SectionType, elementId: string, toSection?: SectionType) => void;

    // Element actions
    setSelectedElement: (elementId: string | null) => void;
    addElement: (templateId: string, sectionType: SectionType, element: TemplateElement) => void;
    updateElement: (templateId: string, sectionType: SectionType, elementId: string, updates: Partial<TemplateElement>) => void;
    deleteElement: (templateId: string, sectionType: SectionType, elementId: string) => void;
    reorderElements: (templateId: string, sectionType: SectionType, elements: TemplateElement[]) => void;
    bringForward: (templateId: string, sectionType: SectionType, elementId: string) => void;
    sendBackward: (templateId: string, sectionType: SectionType, elementId: string) => void;
    bringToFront: (templateId: string, sectionType: SectionType, elementId: string) => void;
    sendToBack: (templateId: string, sectionType: SectionType, elementId: string) => void;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
    templates: demoTemplates,
    activeTemplateId: null,
    selectedElementId: null,

    addTemplate: (template) =>
        set((state) => ({
            templates: [...state.templates, template],
        })),

    updateTemplate: (id, updates) =>
        set((state) => ({
            templates: state.templates.map((t) =>
                t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
            ),
        })),

    deleteTemplate: (id) =>
        set((state) => ({
            templates: state.templates.filter((t) => t.id !== id),
        })),

    setActiveTemplate: (id) => set({ activeTemplateId: id }),

    updateSectionDesign: (templateId, sectionType, design) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const existingDesign = t.sections[sectionType] || { animation: 'none', elements: [] };
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: { ...existingDesign, ...design },
                    },
                    updatedAt: new Date().toISOString(),
                };
            }),
        })),

    reorderSections: (templateId, newOrder) =>
        set((state) => ({
            templates: state.templates.map((t) =>
                t.id === templateId ? { ...t, sectionOrder: newOrder, updatedAt: new Date().toISOString() } : t
            ),
        })),

    setSelectedElement: (elementId) => set({ selectedElementId: elementId }),

    addElement: (templateId, sectionType, element) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType] || { animation: 'none', elements: [] };
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: {
                            ...section,
                            elements: [...(section.elements || []), element],
                        },
                    },
                    updatedAt: new Date().toISOString(),
                };
            }),
        })),

    updateElement: (templateId, sectionType, elementId, updates) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType];
                if (!section) return t;
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: {
                            ...section,
                            elements: section.elements.map((el) =>
                                el.id === elementId ? { ...el, ...updates } : el
                            ),
                        },
                    },
                    updatedAt: new Date().toISOString(),
                };
            }),
        })),

    deleteElement: (templateId, sectionType, elementId) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType];
                if (!section) return t;
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: {
                            ...section,
                            elements: section.elements.filter((el) => el.id !== elementId),
                        },
                    },
                    updatedAt: new Date().toISOString(),
                };
            }),
            selectedElementId: null,
        })),

    reorderElements: (templateId, sectionType, elements) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType];
                if (!section) return t;
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: { ...section, elements },
                    },
                    updatedAt: new Date().toISOString(),
                };
            }),
        })),

    bringForward: (templateId, sectionType, elementId) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType];
                if (!section) return t;
                const maxZ = Math.max(...section.elements.map((el) => el.zIndex));
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: {
                            ...section,
                            elements: section.elements.map((el) =>
                                el.id === elementId ? { ...el, zIndex: Math.min(el.zIndex + 1, maxZ + 1) } : el
                            ),
                        },
                    },
                };
            }),
        })),

    sendBackward: (templateId, sectionType, elementId) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType];
                if (!section) return t;
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: {
                            ...section,
                            elements: section.elements.map((el) =>
                                el.id === elementId ? { ...el, zIndex: Math.max(el.zIndex - 1, 0) } : el
                            ),
                        },
                    },
                };
            }),
        })),

    bringToFront: (templateId, sectionType, elementId) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType];
                if (!section) return t;
                const maxZ = Math.max(...section.elements.map((el) => el.zIndex));
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: {
                            ...section,
                            elements: section.elements.map((el) =>
                                el.id === elementId ? { ...el, zIndex: maxZ + 1 } : el
                            ),
                        },
                    },
                };
            }),
        })),

    sendToBack: (templateId, sectionType, elementId) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const section = t.sections[sectionType];
                if (!section) return t;
                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [sectionType]: {
                            ...section,
                            elements: section.elements.map((el) =>
                                el.id === elementId ? { ...el, zIndex: 0 } : el
                            ),
                        },
                    },
                };
            }),
        })),

    copySectionDesign: (templateId, fromSection, toSection) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const sourceDesign = t.sections[fromSection];
                if (!sourceDesign) return t;

                // Deep copy elements with new IDs
                const copiedElements = sourceDesign.elements.map((el) => ({
                    ...el,
                    id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                }));

                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [toSection]: {
                            ...sourceDesign,
                            elements: copiedElements,
                        },
                    },
                    updatedAt: new Date().toISOString(),
                };
            }),
        })),

    duplicateElement: (templateId, fromSection, elementId, toSection) =>
        set((state) => ({
            templates: state.templates.map((t) => {
                if (t.id !== templateId) return t;
                const sourceSection = t.sections[fromSection];
                if (!sourceSection) return t;

                const element = sourceSection.elements.find((el) => el.id === elementId);
                if (!element) return t;

                const targetSection = toSection || fromSection;
                const target = t.sections[targetSection] || { animation: 'none', elements: [] };
                const maxZ = Math.max(0, ...target.elements.map((el) => el.zIndex));

                const duplicatedElement = {
                    ...element,
                    id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: `${element.name} (copy)`,
                    position: {
                        x: element.position.x + 20,
                        y: element.position.y + 20,
                    },
                    zIndex: maxZ + 1,
                };

                return {
                    ...t,
                    sections: {
                        ...t.sections,
                        [targetSection]: {
                            ...target,
                            elements: [...target.elements, duplicatedElement],
                        },
                    },
                    updatedAt: new Date().toISOString(),
                };
            }),
        })),
}));
