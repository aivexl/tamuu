import { createClient } from '@/utils/supabase/client';
import { Template, InvitationSection, TemplateElement, RSVPResponse, SectionType, ElementType } from './types';

const supabase = createClient();

// --- Templates ---

// Fast fetch for template listing (without sections/elements)
export async function getTemplatesBasic(): Promise<Template[]> {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) throw error;

    return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        thumbnail: t.thumbnail,
        status: t.status || 'draft',
        sections: {}, // Empty - not loaded for performance
        sectionOrder: t.section_order || [],
        customSections: t.custom_sections || [],
        globalTheme: t.global_theme || {},
        eventDate: t.event_date,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
    }));
}

// Full fetch with sections and elements (slower, use for editor/preview)
export async function getTemplates(): Promise<Template[]> {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) throw error;

    // Fetch sections and elements for each template to reconstruct the full object
    // This is a simplified approach; for production, you might want to load details on demand
    const templates: Template[] = [];
    for (const t of data) {
        const fullTemplate = await getTemplate(t.id);
        if (fullTemplate) templates.push(fullTemplate);
    }

    return templates;
}

export async function getTemplate(id: string): Promise<Template | null> {
    try {
        const { data: templateData, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('id', id)
            .single();

        if (templateError) {
            console.error('Error fetching template:', JSON.stringify(templateError, null, 2));
            return null;
        }
        if (!templateData) return null;

        const { data: sectionsData, error: sectionsError } = await supabase
            .from('template_sections')
            .select('*')
            .eq('template_id', id);

        if (sectionsError) {
            console.error('Error fetching sections:', JSON.stringify(sectionsError, null, 2));
            throw sectionsError;
        }

        const sections: Record<string, any> = {};
        for (const section of sectionsData) {
            const { data: elementsData, error: elementsError } = await supabase
                .from('template_elements')
                .select('*')
                .eq('section_id', section.id);

            if (elementsError) {
                console.error('Error fetching elements:', JSON.stringify(elementsError, null, 2));
                throw elementsError;
            }

            // Map database fields back to frontend types
            sections[section.type] = {
                id: section.id,
                isVisible: section.is_visible,
                backgroundColor: section.background_color,
                backgroundUrl: section.background_url,
                overlayOpacity: section.overlay_opacity,
                animation: section.animation,
                pageTitle: section.page_title,
                elements: elementsData.map((el: any) => ({
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

        return {
            id: templateData.id,
            name: templateData.name,
            thumbnail: templateData.thumbnail,
            status: templateData.status || 'draft',
            sections: sections,
            sectionOrder: templateData.section_order,
            customSections: templateData.custom_sections,
            globalTheme: templateData.global_theme,
            eventDate: templateData.event_date,
            createdAt: templateData.created_at,
            updatedAt: templateData.updated_at,
        };
    } catch (err) {
        console.error('Unexpected error in getTemplate:', err);
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
        return null;
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
