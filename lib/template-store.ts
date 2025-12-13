import { create } from 'zustand';
import { Template, SectionType, SectionDesign, ThemeConfig, TemplateElement, PREDEFINED_SECTION_TYPES, AnimationType } from './types';

// Network error handling utilities
const isNetworkError = (error: any): boolean => {
    return error?.message?.includes('Failed to fetch') ||
           error?.name === 'TypeError' ||
           error?.message?.includes('NetworkError') ||
           error?.message?.includes('ERR_NETWORK') ||
           !navigator.onLine;
};

const createRetryFunction = <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    maxRetries: number = 3,
    delay: number = 1000
): ((...args: T) => Promise<R>) => {
    return async (...args: T): Promise<R> => {
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
                return await fn(...args);
            } catch (error: any) {
                lastError = error;

                if (!isNetworkError(error) || attempt === maxRetries) {
                    break;
                }

                console.warn(`⚠️ Network error on attempt ${attempt}, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }

        console.error('❌ All retry attempts failed');
        throw lastError;
    };
};

// Import Supabase service with proper error handling
let SupabaseService: any;
try {
    const supabaseModule = require('./supabase-templates');
    console.log('✅ Supabase service loaded successfully');

    // Create a wrapper with retry logic
    SupabaseService = {
        getTemplatesBasic: createRetryFunction(supabaseModule.getTemplatesBasic),
        getTemplates: createRetryFunction(supabaseModule.getTemplates),
        getTemplate: createRetryFunction(supabaseModule.getTemplate),
        createTemplate: createRetryFunction(supabaseModule.createTemplate),
        updateTemplate: supabaseModule.updateTemplate,
        deleteTemplate: supabaseModule.deleteTemplate,
        updateSection: supabaseModule.updateSection,
        createElement: supabaseModule.createElement,
        updateElement: supabaseModule.updateElement,
        deleteElement: supabaseModule.deleteElement,
        getRSVPResponses: supabaseModule.getRSVPResponses,
        submitRSVP: supabaseModule.submitRSVP,
        debugDatabaseState: supabaseModule.debugDatabaseState,
    };

} catch (error) {
    console.error('❌ Failed to load Supabase service:', error);
    // Create a proxy that throws meaningful errors
    SupabaseService = new Proxy({}, {
        get(target, prop) {
            return async (...args: any[]) => {
                const operationName = typeof prop === 'string' ? prop : String(prop);
                const error = new Error(`Supabase service unavailable: ${operationName}() cannot be called`);
                console.error('Supabase operation failed:', {
                    operation: operationName,
                    args,
                    error: error.message,
                    stack: error.stack
                });
                throw error;
            };
        }
    });
}

// Mock initial templates (fallback)
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

interface TemplateStore {
    templates: Template[];
    activeTemplateId: string | null;
    selectedElementId: string | null;
    clipboard: TemplateElement | null;
    isLoading: boolean;
    error: string | null;
    isOnline: boolean;

    // Actions
    fetchTemplates: () => Promise<void>;
    fetchTemplatesBasic: () => Promise<void>; // Fast fetch for listings
    addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: 'draft' | 'published' }) => Promise<string | null>;
    updateTemplate: (id: string, updates: Partial<Template>) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;
    setActiveTemplate: (id: string | null) => void;

    // Section Actions
    updateSectionDesign: (templateId: string, sectionType: SectionType, design: Partial<SectionDesign>) => Promise<void>;
    reorderSections: (templateId: string, newOrder: SectionType[]) => Promise<void>;
    copySectionDesign: (templateId: string, fromSection: SectionType, toSection: SectionType) => Promise<void>;

    // Element Actions
    setSelectedElement: (elementId: string | null) => void;
    addElement: (templateId: string, sectionType: SectionType, element: TemplateElement) => Promise<void>;
    updateElement: (templateId: string, sectionType: SectionType, elementId: string, updates: Partial<TemplateElement>, options?: { skipDb?: boolean }) => Promise<void>;
    deleteElement: (templateId: string, sectionType: SectionType, elementId: string) => Promise<void>;
    reorderElements: (templateId: string, sectionType: SectionType, elements: TemplateElement[]) => Promise<void>;

    // Layer Actions (Optimistic only for now, or batch update)
    bringForward: (templateId: string, sectionType: SectionType, elementId: string) => void;
    sendBackward: (templateId: string, sectionType: SectionType, elementId: string) => void;
    bringToFront: (templateId: string, sectionType: SectionType, elementId: string) => void;
    sendToBack: (templateId: string, sectionType: SectionType, elementId: string) => void;

    // Clipboard actions
    copyElement: (templateId: string, sectionType: SectionType, elementId: string) => void;
    pasteElement: (templateId: string, sectionType: SectionType) => void;
    duplicateElement: (templateId: string, fromSection: SectionType, elementId: string, toSection?: SectionType) => void;
}

// Full store implementation with safe Supabase imports
// Network status management
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('🌐 Network connection restored');
        isOnline = true;
        // Update store state
        useTemplateStore.setState({ isOnline: true });
    });

    window.addEventListener('offline', () => {
        console.log('📴 Network connection lost');
        isOnline = false;
        // Update store state
        useTemplateStore.setState({ isOnline: false, error: 'No internet connection' });
    });
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
    templates: [],
    activeTemplateId: null,
    selectedElementId: null,
    clipboard: null,
    isLoading: false,
    error: null,
    isOnline: isOnline,

    fetchTemplates: async () => {
        console.log('🔄 Fetching all templates...');
        set({ isLoading: true, error: null });

        // Check network status
        if (!isOnline) {
            const errorMessage = 'No internet connection. Please check your network and try again.';
            console.warn('📴 Offline mode detected');
            set({ error: errorMessage, isLoading: false });
            return;
        }

        try {
            console.log('🚀 Calling SupabaseService.getTemplates...');
            const templates = await SupabaseService.getTemplates();

            if (Array.isArray(templates)) {
                console.log(`✅ Successfully fetched ${templates.length} templates`);
                set({ templates, isLoading: false, error: null, isOnline: true });
            } else {
                console.warn('⚠️ Supabase returned non-array response:', templates);
                set({ templates: [], isLoading: false, error: null, isOnline: true });
            }
        } catch (error: any) {
            console.error('❌ Failed to fetch templates:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                stack: error?.stack,
                fullError: error
            });

            let errorMessage = 'Failed to load templates';
            if (error?.message?.includes('Unable to connect') || error?.message?.includes('Failed to fetch')) {
                errorMessage = 'Unable to connect to database. Please check your internet connection.';
                set({ isOnline: false });
            } else if (error?.message) {
                errorMessage = `Failed to load templates: ${error.message}`;
            } else if (error?.code) {
                errorMessage = `Database error (${error.code}) while loading templates`;
            }

            set({ error: errorMessage, isLoading: false, templates: [] });
        }
    },

    fetchTemplatesBasic: async () => {
        console.log('🔄 Fetching basic templates...');
        set({ isLoading: true, error: null });

        try {
            console.log('🚀 Calling SupabaseService.getTemplatesBasic...');
            const templates = await SupabaseService.getTemplatesBasic();

            if (Array.isArray(templates)) {
                console.log(`✅ Successfully fetched ${templates.length} basic templates`);
                set({ templates, isLoading: false, error: null });
            } else {
                console.warn('⚠️ Supabase returned non-array response for basic templates:', templates);
                set({ templates: [], isLoading: false, error: null });
            }
        } catch (error: any) {
            console.error('❌ Failed to fetch basic templates:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                stack: error?.stack,
                fullError: error
            });

            let errorMessage = 'Failed to load templates';
            if (error?.message) {
                errorMessage = `Failed to load templates: ${error.message}`;
            } else if (error?.code) {
                errorMessage = `Database error (${error.code}) while loading templates`;
            }

            set({ error: errorMessage, isLoading: false, templates: [] });
        }
    },

    addTemplate: async (templateData) => {
        console.log('🔄 Starting template creation process...', { templateData });

        // Validate input data
        if (!templateData || !templateData.name) {
            const error = new Error('Template name is required');
            console.error('❌ Template validation failed:', error.message);
            set({ error: error.message, isLoading: false });
            return null;
        }

        // Populate default sections if empty
        const sections = templateData.sections && Object.keys(templateData.sections).length > 0
            ? templateData.sections
            : PREDEFINED_SECTION_TYPES.reduce((acc, type) => ({
                ...acc,
                [type]: { animation: 'fade-in' as AnimationType, elements: [], isVisible: true, pageTitle: type }
            }), {} as Record<string, SectionDesign>);

        const sectionOrder = templateData.sectionOrder && templateData.sectionOrder.length > 0
            ? templateData.sectionOrder
            : PREDEFINED_SECTION_TYPES;

        const finalTemplateData = {
            ...templateData,
            sections,
            sectionOrder,
            status: templateData.status || 'draft' as const,
        };

        console.log('📝 Prepared template data:', {
            name: finalTemplateData.name,
            sectionsCount: Object.keys(finalTemplateData.sections).length,
            sectionOrder: finalTemplateData.sectionOrder,
            status: finalTemplateData.status
        });

        set({ isLoading: true, error: null });

        try {
            console.log('🚀 Calling SupabaseService.createTemplate...');
            const created = await SupabaseService.createTemplate(finalTemplateData);

            if (created && created.id) {
                console.log('✅ Template created successfully:', { id: created.id, name: created.name });
                set((state) => ({
                    templates: [created, ...state.templates],
                    isLoading: false,
                    error: null
                }));
                return created.id;
            } else {
                const error = new Error('Supabase returned null or invalid template data');
                console.error('❌ Template creation failed - invalid response:', created);
                set({ error: error.message, isLoading: false });
                return null;
            }
        } catch (error: any) {
            console.error('❌ Failed to create template:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                stack: error?.stack,
                fullError: error
            });

            // Provide meaningful error messages
            let errorMessage = 'Failed to create template';
            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.code) {
                errorMessage = `Database error (${error.code})`;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                errorMessage = 'Unknown error occurred during template creation';
            }

            set({ error: errorMessage, isLoading: false });
            return null;
        }
    },

    updateTemplate: async (id, updates) => {
        set((state) => ({
            templates: state.templates.map((t) =>
                t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
            ),
        }));

        try {
            await SupabaseService.updateTemplate(id, updates);
        } catch (error) {
            console.error('Failed to update template:', error);
            if (typeof error === 'object' && error !== null) {
                console.error('Error details:', JSON.stringify(error, null, 2));
            }
        }
    },

    deleteTemplate: async (id) => {
        const previousTemplates = get().templates;
        set((state) => ({
            templates: state.templates.filter((t) => t.id !== id),
        }));

        try {
            await SupabaseService.deleteTemplate(id);
        } catch (error) {
            console.error('Failed to delete template:', error);
            if (typeof error === 'object' && error !== null) {
                console.error('Error details:', JSON.stringify(error, null, 2));
            }
            // Revert
            set({ templates: previousTemplates });
        }
    },

    setActiveTemplate: (id) => set({ activeTemplateId: id }),

    updateSectionDesign: async (templateId, sectionType, design) => {
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
        }));

        try {
            await SupabaseService.updateSection(templateId, sectionType, design);
        } catch (error) {
            console.error('Failed to update section:', error);
            if (typeof error === 'object' && error !== null) {
                console.error('Error details:', JSON.stringify(error, null, 2));
            }
        }
    },

    reorderSections: async (templateId, newOrder) => {
        set((state) => ({
            templates: state.templates.map((t) =>
                t.id === templateId ? { ...t, sectionOrder: newOrder, updatedAt: new Date().toISOString() } : t
            ),
        }));

        try {
            await SupabaseService.updateTemplate(templateId, { sectionOrder: newOrder });
        } catch (error) {
            console.error('Failed to reorder sections:', error);
            if (typeof error === 'object' && error !== null) {
                console.error('Error details:', JSON.stringify(error, null, 2));
            }
        }
    },

    setSelectedElement: (elementId) => set({ selectedElementId: elementId }),

    addElement: async (templateId, sectionType, element) => {
        // Optimistic add (with temp ID)
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
        }));

        try {
            const createdElement = await SupabaseService.createElement(templateId, sectionType, element);

            // 1. Get the latest state of this element (it might have moved while creating!)
            const currentState = get();
            const currentTemplate = currentState.templates.find(t => t.id === templateId);
            const currentSection = currentTemplate?.sections[sectionType];
            const currentLocalElement = currentSection?.elements.find(el => el.id === element.id);

            // 2. Update local state to use REAL ID
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
                                    el.id === element.id ? { ...el, id: createdElement.id } : el
                                ),
                            },
                        },
                    };
                }),
                // Also update selectedElementId if it matches the temp ID
                selectedElementId: state.selectedElementId === element.id ? createdElement.id : state.selectedElementId
            }));

            // 3. CHECK FOR DRIFT: If local element changed while we were creating it, sync those changes to DB now
            if (currentLocalElement) {
                // Determine what changed compared to what we sent to DB
                // We compare currentLocalElement (latest) vs element (what we sent)
                // We only care about properties that change during interaction (position, size, etc.)
                const hasMoved = currentLocalElement.position.x !== element.position.x || currentLocalElement.position.y !== element.position.y;
                const hasResized = currentLocalElement.size.width !== element.size.width || currentLocalElement.size.height !== element.size.height;
                // Add other checks if necessary (rotation, content, etc.)

                if (hasMoved || hasResized) {
                    // Sync the new position/size to the REAL ID in Supabase
                    // We don't need to update local state because it's already correct (from the drag)
                    // We just need to persist it.
                    await SupabaseService.updateElement(createdElement.id, {
                        position: currentLocalElement.position,
                        size: currentLocalElement.size
                        // ... other changed props
                    });
                }
            }

        } catch (error) {
            console.error('Failed to add element:', error);
            if (typeof error === 'object' && error !== null) {
                console.error('Error details:', JSON.stringify(error, null, 2));
            }
            // Ideally we should revert the optimistic update here if it fails
        }
    },

    updateElement: async (templateId, sectionType, elementId, updates, options = {}) => {
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
        }));

        // Skip DB update if requested (e.g. during drag)
        if (options.skipDb) return;

        // Only update in DB if it's not a temporary element
        if (!elementId.startsWith('el-')) {
            try {
                await SupabaseService.updateElement(elementId, updates);
            } catch (error) {
                console.error('Failed to update element:', error);
                if (typeof error === 'object' && error !== null) {
                    console.error('Error details:', JSON.stringify(error, null, 2));
                }
            }
        }
    },

    deleteElement: async (templateId, sectionType, elementId) => {
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
        }));

        // Only delete from DB if it's not a temporary element
        if (!elementId.startsWith('el-')) {
            try {
                await SupabaseService.deleteElement(elementId);
            } catch (error) {
                console.error('Failed to delete element:', error);
                if (typeof error === 'object' && error !== null) {
                    console.error('Error details:', JSON.stringify(error, null, 2));
                }
            }
        }
    },

    reorderElements: async (templateId, sectionType, elements) => {
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
        }));

        // For reordering, we might need to update z-index or position of all elements
        // This is expensive to do one by one. For now, we'll just update locally.
        // In a real app, you'd batch update or have an 'order' field.
        // We will update z-index for all elements to match their array index
        try {
            const updates = elements.map((el, index) =>
                SupabaseService.updateElement(el.id, { zIndex: index + 1 })
            );
            await Promise.all(updates);
        } catch (error) {
            console.error('Failed to reorder elements:', error);
            if (typeof error === 'object' && error !== null) {
                console.error('Error details:', JSON.stringify(error, null, 2));
            }
        }
    },

    // Layer actions - these just update zIndex locally and then call updateElement
    bringForward: (templateId, sectionType, elementId) => {
        const state = get();
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;
        const section = template.sections[sectionType];
        if (!section) return;

        const element = section.elements.find(el => el.id === elementId);
        if (!element) return;

        const maxZ = Math.max(...section.elements.map((el) => el.zIndex));
        const newZ = Math.min(element.zIndex + 1, maxZ + 1);

        get().updateElement(templateId, sectionType, elementId, { zIndex: newZ });
    },

    sendBackward: (templateId, sectionType, elementId) => {
        const state = get();
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;
        const section = template.sections[sectionType];
        if (!section) return;

        const element = section.elements.find(el => el.id === elementId);
        if (!element) return;

        const newZ = Math.max(element.zIndex - 1, 0);
        get().updateElement(templateId, sectionType, elementId, { zIndex: newZ });
    },

    bringToFront: (templateId, sectionType, elementId) => {
        const state = get();
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;
        const section = template.sections[sectionType];
        if (!section) return;

        const maxZ = Math.max(...section.elements.map((el) => el.zIndex));
        get().updateElement(templateId, sectionType, elementId, { zIndex: maxZ + 1 });
    },

    sendToBack: (templateId, sectionType, elementId) => {
        get().updateElement(templateId, sectionType, elementId, { zIndex: 0 });
    },

    // Copy/Paste/Duplicate - these create new elements, so they call addElement
    copySectionDesign: async (templateId, fromSection, toSection) => {
        const state = get();
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;
        const sourceDesign = template.sections[fromSection];
        if (!sourceDesign) return;

        // Update section properties
        await get().updateSectionDesign(templateId, toSection, {
            backgroundColor: sourceDesign.backgroundColor,
            backgroundUrl: sourceDesign.backgroundUrl,
            overlayOpacity: sourceDesign.overlayOpacity,
            animation: sourceDesign.animation,
        });

        // Copy elements
        for (const el of sourceDesign.elements) {
            const newElement = {
                ...el,
                id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            await get().addElement(templateId, toSection, newElement);
        }
    },

    duplicateElement: (templateId, fromSection, elementId, toSection) => {
        const state = get();
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;
        const sourceSection = template.sections[fromSection];
        if (!sourceSection) return;
        const element = sourceSection.elements.find(el => el.id === elementId);
        if (!element) return;

        const targetSection = toSection || fromSection;
        const target = template.sections[targetSection] || { animation: 'none', elements: [] };
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

        get().addElement(templateId, targetSection, duplicatedElement);
    },

    copyElement: (templateId, sectionType, elementId) => {
        const state = get();
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;
        const section = template.sections[sectionType];
        if (!section) return;
        const element = section.elements.find(el => el.id === elementId);
        if (!element) return;
        set({ clipboard: { ...element } });
    },

    pasteElement: (templateId, sectionType) => {
        const state = get();
        const clipboard = state.clipboard;
        if (!clipboard) return;

        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;
        const section = template.sections[sectionType] || { animation: 'none', elements: [] };
        const maxZ = Math.max(0, ...section.elements.map(el => el.zIndex));

        const pastedElement: TemplateElement = {
            ...clipboard,
            id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${clipboard.name} (paste)`,
            position: {
                x: clipboard.position.x + 20,
                y: clipboard.position.y + 20,
            },
            zIndex: maxZ + 1,
        };

        get().addElement(templateId, sectionType, pastedElement);
    },
}));
