import { createClient } from '@/utils/supabase/client';
import { Template, InvitationSection, TemplateElement, RSVPResponse, SectionType, ElementType } from './types';

const supabase = createClient();

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
        console.log('🚀 Calling Supabase getTemplatesBasic...');

        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error in getTemplatesBasic:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
            throw error;
        }

        if (!data) {
            console.warn('⚠️ No data returned from getTemplatesBasic');
            return [];
        }

        console.log(`✅ getTemplatesBasic returned ${data.length} templates`);
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
    } catch (error: any) {
        console.error('💥 Network error in getTemplatesBasic:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
        });

        // If it's a network error, provide a user-friendly message
        if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
            console.error('🌐 Network connectivity issue detected');
            throw new Error('Unable to connect to database. Please check your internet connection.');
        }

        throw error;
    }
}

// Full fetch with sections and elements (slower, use for editor/preview)
export async function getTemplates(): Promise<Template[]> {
    try {
        console.log('🚀 Calling Supabase getTemplates...');

        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error in getTemplates:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
            throw error;
        }

        if (!data || data.length === 0) {
            console.log('ℹ️ No templates found');
            return [];
        }

        console.log(`📋 Processing ${data.length} templates with full details...`);

        // Fetch sections and elements for each template to reconstruct the full object
        // This is a simplified approach; for production, you might want to load details on demand
        const templates: Template[] = [];
        for (const t of data) {
            try {
                const fullTemplate = await getTemplate(t.id);
                if (fullTemplate) {
                    templates.push(fullTemplate);
                } else {
                    console.warn(`⚠️ Failed to load full details for template ${t.id}`);
                }
            } catch (templateError) {
                console.error(`❌ Error loading template ${t.id}:`, templateError);
                // Continue with other templates
            }
        }

        console.log(`✅ getTemplates completed: ${templates.length}/${data.length} templates loaded`);
        return templates;
    } catch (error: any) {
        console.error('💥 Network error in getTemplates:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack,
        });

        // If it's a network error, provide a user-friendly message
        if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
            console.error('🌐 Network connectivity issue detected');
            throw new Error('Unable to connect to database. Please check your internet connection.');
        }

        throw error;
    }
}

export async function getTemplate(id: string): Promise<Template | null> {
    try {
        console.log(`🔍 Loading template ${id}...`);

        // First, test basic Supabase connectivity
        console.log('🔗 Testing Supabase client connectivity...');
        try {
            const { data: testData, error: testError } = await supabase
                .from('templates')
                .select('count')
                .limit(1)
                .single();

            if (testError) {
                console.error('🚫 Supabase connectivity test failed:', {
                    message: testError.message,
                    code: testError.code,
                    details: testError.details,
                    hint: testError.hint,
                });
                throw new Error(`Supabase connectivity issue: ${testError.message}`);
            }
            console.log('✅ Supabase client connectivity OK');
        } catch (connectError) {
            console.error('💥 Supabase connection test failed:', connectError);
            throw connectError;
        }

        const { data: templateData, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('id', id)
            .single();

        if (templateError) {
            console.error('❌ Error fetching template:', {
                message: templateError.message,
                code: templateError.code,
                details: templateError.details,
                hint: templateError.hint,
            });
            return null;
        }

        if (!templateData) {
            console.warn(`⚠️ Template ${id} not found`);
            return null;
        }

        console.log(`📄 Template ${id} found, loading sections...`);

        const { data: sectionsData, error: sectionsError } = await supabase
            .from('template_sections')
            .select('*')
            .eq('template_id', id);

        if (sectionsError) {
            console.error('❌ Error fetching sections:', {
                message: sectionsError.message,
                code: sectionsError.code,
                details: sectionsError.details,
                hint: sectionsError.hint,
            });
            throw sectionsError;
        }

        console.log(`📑 Found ${sectionsData?.length || 0} sections, loading elements...`);

        // Test template_elements table accessibility
        console.log('🔍 Testing template_elements table access...');
        try {
            const { data: testElements, error: testElementsError } = await supabase
                .from('template_elements')
                .select('count')
                .limit(1);

            if (testElementsError) {
                console.error('🚫 template_elements table access failed:', {
                    message: testElementsError.message,
                    code: testElementsError.code,
                    details: testElementsError.details,
                    hint: testElementsError.hint,
                });
            } else {
                console.log('✅ template_elements table accessible');
            }
        } catch (testError) {
            console.error('💥 template_elements table test failed:', testError);
        }

        const sections: Record<string, any> = {};
        for (const section of sectionsData || []) {
            try {
                console.log(`🔍 Fetching elements for section ${section.type} (${section.id})...`);
                console.log(`🔍 Querying: SELECT * FROM template_elements WHERE section_id = '${section.id}'`);

                const { data: elementsData, error: elementsError } = await supabase
                    .from('template_elements')
                    .select('*')
                    .eq('section_id', section.id);

                console.log(`📊 Query result:`, {
                    sectionId: section.id,
                    hasData: !!elementsData,
                    dataLength: elementsData?.length || 0,
                    hasError: !!elementsError,
                    errorType: typeof elementsError
                });

                if (elementsError) {
                    console.error('❌ Error fetching elements for section:', section.id, {
                        message: elementsError.message,
                        code: elementsError.code,
                        details: elementsError.details,
                        hint: elementsError.hint,
                        fullError: elementsError,
                        sectionId: section.id,
                        sectionType: section.type,
                    });

                    // If it's a permission or table issue, log more details
                    if (elementsError.code === 'PGRST116' || elementsError.message?.includes('permission')) {
                        console.error('🚫 Possible permission or table issue detected');
                        console.error('🔍 Error details:', {
                            code: elementsError.code,
                            message: elementsError.message,
                            hint: elementsError.hint,
                            details: elementsError.details,
                        });
                    }

                    // Instead of throwing, create an empty elements array and continue
                    console.warn(`⚠️ Continuing with empty elements for section ${section.type}`);
                    sections[section.type] = {
                        id: section.id,
                        isVisible: section.is_visible,
                        backgroundColor: section.background_color,
                        backgroundUrl: section.background_url,
                        overlayOpacity: section.overlay_opacity,
                        animation: section.animation,
                        pageTitle: section.page_title,
                        openInvitationConfig: section.open_invitation_config,
                        elements: [], // Empty array instead of failing
                    };
                    continue; // Skip to next section
                }

                console.log(`✅ Found ${elementsData?.length || 0} elements for section ${section.type}`);

                console.log(`🔧 Section ${section.type}: ${elementsData?.length || 0} elements`);

                // Map database fields back to frontend types
                sections[section.type] = {
                    id: section.id,
                    isVisible: section.is_visible,
                    backgroundColor: section.background_color,
                    backgroundUrl: section.background_url,
                    overlayOpacity: section.overlay_opacity,
                    animation: section.animation,
                    pageTitle: section.page_title,
                    openInvitationConfig: section.open_invitation_config,
                    elements: (elementsData || []).map((el: any) => ({
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
            } catch (sectionError: any) {
                console.error(`❌ Error processing section ${section.type}:`, {
                    sectionId: section.id,
                    sectionType: section.type,
                    error: sectionError,
                    message: sectionError?.message,
                    code: sectionError?.code,
                    details: sectionError?.details,
                    hint: sectionError?.hint,
                });

                // Continue with other sections but mark this one as failed
                sections[section.type] = {
                    id: section.id,
                    isVisible: false,
                    elements: [],
                    error: sectionError?.message || 'Failed to load elements',
                    backgroundColor: section.background_color,
                    backgroundUrl: section.background_url,
                    overlayOpacity: section.overlay_opacity,
                    animation: section.animation,
                    pageTitle: section.page_title,
                    openInvitationConfig: section.open_invitation_config,
                };
            }
        }

        const result = {
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

        console.log(`✅ Template ${id} loaded successfully with ${Object.keys(sections).length} sections`);
        return result;

    } catch (err: any) {
        console.error('💥 Unexpected error in getTemplate:', {
            message: err?.message,
            name: err?.name,
            stack: err?.stack,
        });

        // If it's a network error, provide a user-friendly message
        if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
            console.error('🌐 Network connectivity issue detected in getTemplate');
            throw new Error('Unable to connect to database. Please check your internet connection.');
        }

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
