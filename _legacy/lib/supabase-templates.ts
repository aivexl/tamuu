import { createClient } from '@/utils/supabase/client';
import { Template, InvitationSection, TemplateElement, RSVPResponse, SectionType, ElementType } from './types';

const supabase = createClient();

// --- Retry Helper for Network Resilience ---

/**
 * Retry a function with exponential backoff
 * Handles QUIC protocol errors and network issues
 */
async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        baseDelayMs?: number;
        operationName?: string;
    } = {}
): Promise<T> {
    const { maxAttempts = 3, baseDelayMs = 300, operationName = 'operation' } = options;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            const isNetworkError =
                error?.message?.includes('QUIC') ||
                error?.message?.includes('network') ||
                error?.message?.includes('fetch') ||
                error?.code === 'ECONNRESET';

            console.warn(`⚠️ ${operationName} attempt ${attempt}/${maxAttempts} failed:`,
                error?.message || error);

            if (attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error(`❌ ${operationName} failed after ${maxAttempts} attempts`);
    throw lastError;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Debug function to test Supabase connection
export async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('templates').select('count').limit(1);
        if (error) {
            console.error('Supabase connection test failed:', error);
            return { success: false, error };
        }
        console.log('Supabase connection test successful');
        return { success: true, data };
    } catch (error) {
        console.error('Supabase connection test error:', error);
        return { success: false, error };
    }
}

// --- Debug Functions ---

export async function debugDatabaseState() {
    try {
        console.log('🔍 Starting database debug...');

        // Check templates
        const { data: templates, error: templatesError } = await supabase
            .from('templates')
            .select('*');

        if (templatesError) {
            console.error('❌ Templates query failed:', templatesError);
            return { success: false, error: templatesError };
        }

        console.log(`✅ Found ${templates?.length || 0} templates`);

        // Check sections for each template
        for (const template of templates || []) {
            console.log(`📋 Checking template: ${template.id} (${template.name})`);

            const { data: sections, error: sectionsError } = await supabase
                .from('template_sections')
                .select('*')
                .eq('template_id', template.id);

            if (sectionsError) {
                console.error(`❌ Sections query failed for template ${template.id}:`, sectionsError);
                continue;
            }

            console.log(`  📑 Found ${sections?.length || 0} sections`);

            // Check elements for each section
            for (const section of sections || []) {
                console.log(`    🔧 Checking section: ${section.type} (${section.id})`);

                const { data: elements, error: elementsError } = await supabase
                    .from('template_elements')
                    .select('*')
                    .eq('section_id', section.id);

                if (elementsError) {
                    console.error(`❌ Elements query failed for section ${section.id}:`, {
                        error: elementsError,
                        message: elementsError.message,
                        code: elementsError.code,
                        details: elementsError.details,
                        hint: elementsError.hint,
                    });
                } else {
                    console.log(`      ✅ Found ${elements?.length || 0} elements`);
                }
            }
        }

        return { success: true, data: { templates } };
    } catch (error) {
        console.error('💥 Database debug failed:', error);
        return { success: false, error };
    }
}

// --- Templates ---

// Fast fetch for template listing (without sections/elements)
export async function getTemplatesBasic(): Promise<Template[]> {
    try {
        console.log('🚀 Calling Supabase getTemplatesBasic (Ultra-Light)...');

        const { data, error } = await supabase
            .from('templates')
            .select('id, name, thumbnail, status, updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('❌ Supabase error in getTemplatesBasic:', error);
            throw error;
        }

        if (!data) return [];

        return data.map((t: any) => ({
            id: t.id,
            name: t.name,
            thumbnail: t.thumbnail,
            status: t.status || 'draft',
            sections: {},
            sectionOrder: [], // Not needed for list view
            customSections: [], // Not needed for list view
            globalTheme: {
                id: 'default',
                name: 'Default',
                category: 'modern',
                colors: { primary: '#000000', secondary: '#ffffff', accent: '#000000', background: '#ffffff', text: '#000000' },
                fontFamily: 'Inter',
            }, // Minimal valid theme for list view
            eventDate: undefined,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
        }));
    } catch (error: any) {
        console.error('💥 Error in getTemplatesBasic:', error);
        throw error;
    }
}

// Full fetch with sections and elements (Optimized with nested join)
export async function getTemplates(): Promise<Template[]> {
    // This is still heavy if we load ALL templates with ALL details.
    // Ideally usage should be avoided in favor of getTemplatesBasic + getTemplate(id)
    // But for now we optimize it anyway.
    try {
        console.log('🚀 Calling Supabase getTemplates (Optimized)...');

        const { data, error } = await supabase
            .from('templates')
            .select(`
                *,
                template_sections (
                    *,
                    template_elements (*)
                )
            `)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        if (!data) return [];

        return data.map((t: any) => mapDatabaseResponseToTemplate(t));
    } catch (error: any) {
        console.error('💥 Error in getTemplates:', error);
        throw error;
    }
}

// Restoring the helper function content that was deleted
function mapDatabaseResponseToTemplate(data: any): Template {
    const sections: Record<string, any> = {};

    if (data.template_sections && Array.isArray(data.template_sections)) {
        for (const section of data.template_sections) {
            sections[section.type] = {
                id: section.id,
                isVisible: section.is_visible,
                backgroundColor: section.background_color,
                backgroundUrl: section.background_url,
                overlayOpacity: section.overlay_opacity,
                animation: section.animation,
                pageTitle: section.page_title,
                openInvitationConfig: section.open_invitation_config,
                elements: (section.template_elements || []).map((el: any) => ({
                    id: el.id,
                    type: el.type as ElementType,
                    name: el.name,
                    position: { x: el.position_x, y: el.position_y },
                    size: { width: el.width, height: el.height },
                    zIndex: el.z_index,
                    animation: el.animation,
                    loopAnimation: el.loop_animation,
                    animationDelay: el.animation_delay,
                    animationSpeed: el.animation_speed,
                    animationDuration: el.animation_duration,
                    content: el.content,
                    imageUrl: el.image_url,
                    textStyle: el.text_style,
                    iconStyle: el.icon_style,
                    countdownConfig: el.countdown_config,
                    rsvpFormConfig: el.rsvp_form_config,
                    guestWishesConfig: el.guest_wishes_config,
                    rotation: el.rotation,
                    flipHorizontal: el.flip_horizontal,
                    flipVertical: el.flip_vertical,
                })),
            };
        }
    }

    return {
        id: data.id,
        name: data.name,
        thumbnail: data.thumbnail,
        status: data.status || 'draft',
        sections: sections,
        sectionOrder: data.section_order,
        customSections: data.custom_sections,
        globalTheme: data.global_theme,
        eventDate: data.event_date,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
}

export async function getTemplate(id: string): Promise<Template | null> {
    try {
        console.log(`🔍 Loading template ${id} (Resilient Batch Mode)...`);

        // Step 1: Fetch Template (with retry)
        const templateData = await withRetry(async () => {
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        }, { operationName: 'Fetch Template', maxAttempts: 3, baseDelayMs: 300 });

        if (!templateData) return null;

        // Small delay between requests
        await delay(100);

        // Step 2: Fetch Sections (with retry)
        const sections = await withRetry(async () => {
            const { data, error } = await supabase
                .from('template_sections')
                .select('*')
                .eq('template_id', id);

            if (error) throw error;
            return data || [];
        }, { operationName: 'Fetch Sections', maxAttempts: 3, baseDelayMs: 300 });

        const sectionMap: Record<string, any> = {};

        // Initialize sections in map
        sections.forEach(s => {
            sectionMap[s.id] = { ...s, elements: [] };
        });

        // Step 3: Fetch Elements in SMALLER BATCHES with retry
        const sectionIds = sections.map(s => s.id);
        let allElements: any[] = [];

        if (sectionIds.length > 0) {
            // Split into batches of 4 to reduce request size
            const BATCH_SIZE = 4;
            const batches: string[][] = [];

            for (let i = 0; i < sectionIds.length; i += BATCH_SIZE) {
                batches.push(sectionIds.slice(i, i + BATCH_SIZE));
            }

            console.log(`📦 Fetching elements in ${batches.length} batch(es)...`);

            for (let i = 0; i < batches.length; i++) {
                const batchIds = batches[i];

                try {
                    const batchElements = await withRetry(async () => {
                        const { data, error } = await supabase
                            .from('template_elements')
                            .select('*')
                            .in('section_id', batchIds);

                        if (error) throw error;
                        return data || [];
                    }, {
                        operationName: `Fetch Elements Batch ${i + 1}/${batches.length}`,
                        maxAttempts: 3,
                        baseDelayMs: 400
                    });

                    allElements = [...allElements, ...batchElements];
                    console.log(`  ✅ Batch ${i + 1}: ${batchElements.length} elements`);

                    // Delay between batches to avoid overwhelming the server
                    if (i < batches.length - 1) {
                        await delay(300);
                    }
                } catch (batchError: any) {
                    console.error(`  ⚠️ Batch ${i + 1} failed, continuing with others:`, batchError?.message);
                    // Continue with other batches even if one fails
                }
            }
        }

        // Step 4: Assemble Data (In-Memory Join)
        allElements.forEach(el => {
            if (sectionMap[el.section_id]) {
                sectionMap[el.section_id].elements.push(el);
            }
        });

        // Step 5: Convert to Frontend Structure
        const finalSections: Record<string, any> = {};

        sections.forEach(section => {
            const elementsRaw = sectionMap[section.id].elements;

            // KEY FIX: Use section.type as the key, consistent with Frontend expectations
            finalSections[section.type] = {
                id: section.id,
                isVisible: section.is_visible,
                backgroundColor: section.background_color,
                backgroundUrl: section.background_url,
                overlayOpacity: section.overlay_opacity,
                animation: section.animation,
                pageTitle: section.page_title,
                openInvitationConfig: section.open_invitation_config,
                elements: elementsRaw.map((el: any) => ({
                    id: el.id,
                    type: el.type as ElementType,
                    name: el.name,
                    position: { x: el.position_x, y: el.position_y },
                    size: { width: el.width, height: el.height },
                    zIndex: el.z_index,
                    animation: el.animation,
                    loopAnimation: el.loop_animation,
                    animationDelay: el.animation_delay,
                    animationSpeed: el.animation_speed,
                    animationDuration: el.animation_duration,
                    content: el.content,
                    imageUrl: el.image_url,
                    textStyle: el.text_style,
                    iconStyle: el.icon_style,
                    countdownConfig: el.countdown_config,
                    rsvpFormConfig: el.rsvp_form_config,
                    guestWishesConfig: el.guest_wishes_config,
                    rotation: el.rotation,
                    flipHorizontal: el.flip_horizontal,
                    flipVertical: el.flip_vertical,
                })),
            };
        });

        console.log(`✅ Template ${id} loaded (Resilient Strategy). Sections: ${sections.length}, Elements: ${allElements.length}`);

        return {
            id: templateData.id,
            name: templateData.name,
            thumbnail: templateData.thumbnail,
            status: templateData.status || 'draft',
            sections: finalSections,
            sectionOrder: templateData.section_order,
            customSections: templateData.custom_sections,
            globalTheme: templateData.global_theme,
            eventDate: templateData.event_date,
            createdAt: templateData.created_at,
            updatedAt: templateData.updated_at,
        };

    } catch (err: any) {
        console.error('💥 Unexpected error in getTemplate:', err);
        throw err;
    }
}

export async function createTemplate(template: Partial<Template>): Promise<Template | null> {
    if (!template.name) {
        throw new Error('Template name is required');
    }

    console.log('Creating template with data:', JSON.stringify(template, null, 2));

    try {
        const { data, error } = await supabase
            .from('templates')
            .insert({
                name: template.name,
                thumbnail: template.thumbnail,
                status: template.status || 'draft',
                section_order: template.sectionOrder,
                custom_sections: template.customSections,
                global_theme: template.globalTheme,
                event_date: template.eventDate,
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase createTemplate error:', JSON.stringify(error, null, 2));
            throw error;
        }

        if (!data) {
            throw new Error('No data returned from createTemplate');
        }

        console.log('Template created successfully:', data);

        // Create default sections
        if (template.sections) {
            console.log('Creating sections for template:', data.id);
            for (const [type, design] of Object.entries(template.sections)) {
                await updateSection(data.id, type, design);
            }
        }

        return getTemplate(data.id);
    } catch (err) {
        console.error('Unexpected error in createTemplate:', err);
        // Re-throw the error so the calling code can handle it properly
        throw err;
    }
}

export async function updateTemplate(id: string, updates: Partial<Template>): Promise<void> {
    const { error } = await supabase
        .from('templates')
        .update({
            name: updates.name,
            thumbnail: updates.thumbnail,
            status: updates.status,
            section_order: updates.sectionOrder,
            custom_sections: updates.customSections,
            global_theme: updates.globalTheme,
            event_date: updates.eventDate,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting template:', JSON.stringify(error, null, 2));
        throw error;
    }
}

// --- Sections ---

export async function updateSection(templateId: string, sectionType: string, updates: any): Promise<void> {
    // Check if section exists
    const { data: existingSection } = await supabase
        .from('template_sections')
        .select('id')
        .eq('template_id', templateId)
        .eq('type', sectionType)
        .single();

    if (existingSection) {
        // Update
        const { error } = await supabase
            .from('template_sections')
            .update({
                is_visible: updates.isVisible,
                background_color: updates.backgroundColor,
                background_url: updates.backgroundUrl,
                overlay_opacity: updates.overlayOpacity,
                animation: updates.animation,
                page_title: updates.pageTitle,
                open_invitation_config: updates.openInvitationConfig,
                updated_at: new Date().toISOString(),
            })
            .eq('id', existingSection.id);
        if (error) throw error;
    } else {
        // Create
        const { error } = await supabase
            .from('template_sections')
            .insert({
                template_id: templateId,
                type: sectionType,
                is_visible: updates.isVisible ?? true,
                background_color: updates.backgroundColor,
                background_url: updates.backgroundUrl,
                overlay_opacity: updates.overlayOpacity,
                animation: updates.animation,
                page_title: updates.pageTitle,
                open_invitation_config: updates.openInvitationConfig,
            });
        if (error) throw error;
    }
}

// --- Elements ---

export async function createElement(templateId: string, sectionType: string, element: TemplateElement): Promise<TemplateElement> {
    // Ensure section exists first
    let { data: section } = await supabase
        .from('template_sections')
        .select('id')
        .eq('template_id', templateId)
        .eq('type', sectionType)
        .single();

    if (!section) {
        const { data: newSection, error: sectionError } = await supabase
            .from('template_sections')
            .insert({ template_id: templateId, type: sectionType })
            .select()
            .single();
        if (sectionError) throw sectionError;
        section = newSection;
    }

    if (!section) throw new Error("Failed to find or create section");

    const { data, error } = await supabase
        .from('template_elements')
        .insert({
            id: element.id.startsWith('el-') ? undefined : element.id, // Let DB generate UUID if it's a temp ID
            section_id: section.id,
            type: element.type,
            name: element.name,
            position_x: element.position.x,
            position_y: element.position.y,
            width: element.size.width,
            height: element.size.height,
            z_index: element.zIndex,
            animation: element.animation,
            loop_animation: element.loopAnimation,
            animation_delay: element.animationDelay,
            animation_speed: element.animationSpeed,
            animation_duration: element.animationDuration,
            content: element.content,
            image_url: element.imageUrl,
            text_style: element.textStyle,
            icon_style: element.iconStyle,
            countdown_config: element.countdownConfig,
            rsvp_form_config: element.rsvpFormConfig,
            guest_wishes_config: element.guestWishesConfig,
            rotation: element.rotation,
            flip_horizontal: element.flipHorizontal,
            flip_vertical: element.flipVertical,
        })
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to create element");

    return {
        id: data.id,
        type: data.type as ElementType,
        name: data.name,
        position: { x: data.position_x, y: data.position_y },
        size: { width: data.width, height: data.height },
        zIndex: data.z_index,
        animation: data.animation,
        loopAnimation: data.loop_animation,
        animationDelay: data.animation_delay,
        animationSpeed: data.animation_speed,
        animationDuration: data.animation_duration,
        content: data.content,
        imageUrl: data.image_url,
        textStyle: data.text_style,
        iconStyle: data.icon_style,
        countdownConfig: data.countdown_config,
        rsvpFormConfig: data.rsvp_form_config,
        guestWishesConfig: data.guest_wishes_config,
        rotation: data.rotation,
        flipHorizontal: data.flip_horizontal,
        flipVertical: data.flip_vertical,
    };
}

export async function updateElement(elementId: string, updates: Partial<TemplateElement>): Promise<void> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.position) {
        dbUpdates.position_x = updates.position.x;
        dbUpdates.position_y = updates.position.y;
    }
    if (updates.size) {
        dbUpdates.width = updates.size.width;
        dbUpdates.height = updates.size.height;
    }
    if (updates.zIndex !== undefined) dbUpdates.z_index = updates.zIndex;
    if (updates.animation) dbUpdates.animation = updates.animation;
    if (updates.loopAnimation !== undefined) dbUpdates.loop_animation = updates.loopAnimation;
    if (updates.animationDelay !== undefined) dbUpdates.animation_delay = updates.animationDelay;
    if (updates.animationSpeed !== undefined) dbUpdates.animation_speed = updates.animationSpeed;
    if (updates.animationDuration !== undefined) dbUpdates.animation_duration = updates.animationDuration;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.textStyle) dbUpdates.text_style = updates.textStyle;
    if (updates.iconStyle) dbUpdates.icon_style = updates.iconStyle;
    if (updates.countdownConfig) dbUpdates.countdown_config = updates.countdownConfig;
    if (updates.rsvpFormConfig) dbUpdates.rsvp_form_config = updates.rsvpFormConfig;
    if (updates.guestWishesConfig) dbUpdates.guest_wishes_config = updates.guestWishesConfig;
    if (updates.rotation !== undefined) dbUpdates.rotation = updates.rotation;
    if (updates.flipHorizontal !== undefined) dbUpdates.flip_horizontal = updates.flipHorizontal;
    if (updates.flipVertical !== undefined) dbUpdates.flip_vertical = updates.flipVertical;

    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from('template_elements')
        .update(dbUpdates)
        .eq('id', elementId);

    if (error) throw error;
}

export async function deleteElement(elementId: string): Promise<void> {
    const { error } = await supabase
        .from('template_elements')
        .delete()
        .eq('id', elementId);

    if (error) throw error;
}

// --- RSVP ---

export async function submitRSVP(response: Omit<RSVPResponse, 'id' | 'createdAt'>): Promise<RSVPResponse> {
    const { data, error } = await supabase
        .from('rsvp_responses')
        .insert({
            template_id: response.templateId,
            name: response.name,
            email: response.email,
            phone: response.phone,
            message: response.message,
            attendance: response.attendance,
            is_public: response.isPublic,
        })
        .select()
        .single();

    if (error) throw error;
    return {
        id: data.id,
        templateId: data.template_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message,
        attendance: data.attendance,
        isPublic: data.is_public,
        createdAt: data.created_at,
    };
}

export async function getRSVPResponses(templateId: string): Promise<RSVPResponse[]> {
    const { data, error } = await supabase
        .from('rsvp_responses')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((d: any) => ({
        id: d.id,
        templateId: d.template_id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        message: d.message,
        attendance: d.attendance,
        isPublic: d.is_public,
        createdAt: d.created_at,
    }));
}
