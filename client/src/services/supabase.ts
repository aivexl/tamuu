import { createClient } from "@/lib/supabase-client";
import {
    type Template,
    type TemplateElement,
    type RSVPResponse,
    type ElementType,
    type SectionDesign,
} from "@/lib/types";

const supabase = createClient();

// --- Retry Helper ---
async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        baseDelayMs?: number;
        operationName?: string;
    } = {}
): Promise<T> {
    const { maxAttempts = 3, baseDelayMs = 100, operationName = "operation" } =
        options;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            console.warn(
                `⚠️ ${operationName} attempt ${attempt}/${maxAttempts} failed:`,
                error?.message || error
            );

            if (attempt < maxAttempts) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
}



// --- Templates ---
export async function getTemplates(): Promise<Template[]> {
    const { data, error } = await supabase
        .from("templates")
        .select("id, name, thumbnail, status, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(50);

    if (error) throw error;
    if (!data) return [];

    return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        thumbnail: t.thumbnail,
        status: t.status || "draft",
        sections: {},
        sectionOrder: [],
        customSections: [],
        globalTheme: {
            id: "default",
            name: "Default",
            category: "modern",
            colors: {
                primary: "#000000",
                secondary: "#ffffff",
                accent: "#000000",
                background: "#ffffff",
                text: "#000000",
            },
            fontFamily: "Inter",
        },
        createdAt: t.created_at,
        updatedAt: t.updated_at,
    }));
}

export async function getTemplate(id: string): Promise<Template | null> {
    try {
        const templateData = await withRetry(
            async () => {
                const { data, error } = await supabase
                    .from("templates")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();
                if (error) throw error;
                return data;
            },
            { operationName: "Fetch Template" }
        );

        if (!templateData) return null;

        const sections = await withRetry(
            async () => {
                const { data, error } = await supabase
                    .from("template_sections")
                    .select("*")
                    .eq("template_id", id);
                if (error) throw error;
                return data || [];
            },
            { operationName: "Fetch Sections" }
        );

        const sectionMap: Record<string, any> = {};
        sections.forEach((s) => {
            sectionMap[s.id] = { ...s, elements: [] };
        });

        // Fetch Elements - Optimized bulk fetch with chunking
        const sectionIds = sections.map((s) => s.id);
        let allElements: any[] = [];

        // Chunking prevents sending too many IDs in one distinct query or hitting timeout limits
        // for very large templates, while still being much faster than 1-by-1.
        const CHUNK_SIZE = 5;

        if (sectionIds.length > 0) {
            for (let i = 0; i < sectionIds.length; i += CHUNK_SIZE) {
                const chunk = sectionIds.slice(i, i + CHUNK_SIZE);
                try {
                    const elements = await withRetry(
                        async () => {
                            const { data, error } = await supabase
                                .from("template_elements")
                                .select("*")
                                .in("section_id", chunk);

                            if (error) throw error;
                            return data || [];
                        },
                        { operationName: `Fetch Elements Chunk ${Math.floor(i / CHUNK_SIZE) + 1}` }
                    );

                    allElements.push(...elements);
                } catch (err) {
                    console.error(`Failed to fetch elements for chunk ${i}-${i + CHUNK_SIZE}:`, err);
                    throw err;
                }
            }
        }

        allElements.forEach((el) => {
            if (sectionMap[el.section_id]) {
                sectionMap[el.section_id].elements.push(el);
            }
        });

        const finalSections: Record<string, SectionDesign> = {};

        // Helper to find order
        const sectionOrder = templateData.section_order || [];

        sections.forEach((section) => {
            const elementsRaw = sectionMap[section.id].elements;

            // Determine order: index in sectionOrder array, or fallback
            let order = sectionOrder.indexOf(section.type);
            if (order === -1) order = 999; // Fallback to end if not ordered

            finalSections[section.type] = {
                // @ts-ignore
                id: section.id,
                isVisible: section.is_visible,
                backgroundColor: section.background_color,
                backgroundUrl: section.background_url,
                overlayOpacity: section.overlay_opacity,
                animation: section.animation,
                pageTitle: section.page_title,
                title: section.page_title, // Map to title for consistency
                order: order,
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
                    openInvitationConfig: el.open_invitation_config,
                    rotation: el.rotation,
                    flipHorizontal: el.flip_horizontal,
                    flipVertical: el.flip_vertical,
                })),
            };
        });

        // Sort sectionOrder if needed? No, store uses order property.

        return {
            id: templateData.id,
            name: templateData.name,
            thumbnail: templateData.thumbnail,
            status: templateData.status || "draft",
            sections: finalSections,
            sectionOrder: templateData.section_order || [],
            customSections: templateData.custom_sections,
            globalTheme: templateData.global_theme,
            eventDate: templateData.event_date,
            createdAt: templateData.created_at,
            updatedAt: templateData.updated_at,
        };
    } catch (err) {
        console.error("Unexpected error in getTemplate:", err);
        throw err;
    }
}

export async function createTemplate(
    template: Partial<Template>
): Promise<Template | null> {
    if (!template.name) throw new Error("Template name is required");

    const { data, error } = await supabase
        .from("templates")
        .insert({
            name: template.name,
            thumbnail: template.thumbnail,
            status: template.status || "draft",
            section_order: template.sectionOrder,
            custom_sections: template.customSections,
            global_theme: template.globalTheme,
            event_date: template.eventDate,
        })
        .select()
        .single();

    if (error) throw error;
    if (!data) return null;

    if (template.sections) {
        for (const [type, design] of Object.entries(template.sections)) {
            await updateSection(data.id, type, design);
        }
    }

    return getTemplate(data.id);
}

export async function updateTemplate(
    id: string,
    updates: Partial<Template>
): Promise<void> {
    const { error } = await supabase
        .from("templates")
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
        .eq("id", id);
    if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from("templates").delete().eq("id", id);
    if (error) throw error;
}

// --- Sections ---

export async function deleteSection(
    templateId: string,
    sectionType: string
): Promise<void> {
    const { error } = await supabase
        .from("template_sections")
        .delete()
        .eq("template_id", templateId)
        .eq("type", sectionType);
    if (error) throw error;
}

export async function updateSection(
    templateId: string,
    sectionType: string,
    updates: any
): Promise<void> {
    const { data: existingSection } = await supabase
        .from("template_sections")
        .select("id")
        .eq("template_id", templateId)
        .eq("type", sectionType)
        .single();

    if (existingSection) {
        const { error } = await supabase
            .from("template_sections")
            .update({
                is_visible: updates.isVisible,
                background_color: updates.backgroundColor,
                background_url: updates.backgroundUrl,
                overlay_opacity: updates.overlayOpacity,
                animation: updates.animation,
                page_title: updates.pageTitle, // If DB uses page_title
                // title column? If not exists, maybe rely on page_title or just strictly UI?
                // Assuming page_title IS the title shown in UI
                open_invitation_config: updates.openInvitationConfig,
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingSection.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from("template_sections").insert({
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

export async function createElement(
    templateId: string,
    sectionType: string,
    element: TemplateElement
): Promise<TemplateElement> {
    let { data: section } = await supabase
        .from("template_sections")
        .select("id")
        .eq("template_id", templateId)
        .eq("type", sectionType)
        .single();

    if (!section) {
        const { data: newSection, error } = await supabase
            .from("template_sections")
            .insert({ template_id: templateId, type: sectionType })
            .select()
            .single();
        if (error) throw error;
        section = newSection;
    }

    if (!section) throw new Error("Failed to find or create section");

    const { data, error } = await supabase
        .from("template_elements")
        .insert({
            id: element.id.startsWith("el-") ? undefined : element.id,
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
            open_invitation_config: element.openInvitationConfig,
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
        openInvitationConfig: data.open_invitation_config,
        rotation: data.rotation,
        flipHorizontal: data.flip_horizontal,
        flipVertical: data.flip_vertical,
    };
}

export async function updateElement(
    elementId: string,
    updates: Partial<TemplateElement>
): Promise<void> {
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
    if (updates.loopAnimation !== undefined)
        dbUpdates.loop_animation = updates.loopAnimation;
    if (updates.animationDelay !== undefined)
        dbUpdates.animation_delay = updates.animationDelay;
    if (updates.animationSpeed !== undefined)
        dbUpdates.animation_speed = updates.animationSpeed;
    if (updates.animationDuration !== undefined)
        dbUpdates.animation_duration = updates.animationDuration;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.textStyle) dbUpdates.text_style = updates.textStyle;
    if (updates.iconStyle) dbUpdates.icon_style = updates.iconStyle;
    if (updates.countdownConfig)
        dbUpdates.countdown_config = updates.countdownConfig;
    if (updates.rsvpFormConfig) dbUpdates.rsvp_form_config = updates.rsvpFormConfig;
    if (updates.guestWishesConfig)
        dbUpdates.guest_wishes_config = updates.guestWishesConfig;
    if (updates.openInvitationConfig) dbUpdates.open_invitation_config = updates.openInvitationConfig;
    if (updates.rotation !== undefined) dbUpdates.rotation = updates.rotation;
    if (updates.flipHorizontal !== undefined)
        dbUpdates.flip_horizontal = updates.flipHorizontal;
    if (updates.flipVertical !== undefined)
        dbUpdates.flip_vertical = updates.flipVertical;

    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from("template_elements")
        .update(dbUpdates)
        .eq("id", elementId);
    if (error) throw error;
}

export async function deleteElement(elementId: string): Promise<void> {
    const { error } = await supabase
        .from("template_elements")
        .delete()
        .eq("id", elementId);
    if (error) throw error;
}

// --- RSVP ---

export async function submitRSVP(
    response: Omit<RSVPResponse, "id" | "createdAt">
): Promise<RSVPResponse> {
    const { data, error } = await supabase
        .from("rsvp_responses")
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

export async function getRSVPResponses(
    templateId: string
): Promise<RSVPResponse[]> {
    const { data, error } = await supabase
        .from("rsvp_responses")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false });

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
