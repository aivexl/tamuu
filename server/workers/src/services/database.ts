/**
 * D1 Database Service
 * Enterprise-grade database operations for Tamuu
 */

import type {
    Env,
    DBTemplate,
    DBTemplateSection,
    DBTemplateElement,
    DBRSVPResponse,
    TemplateResponse,
    SectionDesign,
    TemplateElement,
    RSVPResponse as RSVPResponseType
} from '../types';

/**
 * Generate UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Parse JSON safely
 */
function safeParseJSON<T>(str: string | null, fallback: T): T {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

/**
 * Database Service Class
 */
export class DatabaseService {
    constructor(private db: D1Database) { }

    // ============================================
    // TEMPLATES
    // ============================================

    /**
     * Get all templates (list view - minimal data)
     */
    async getTemplates(): Promise<TemplateResponse[]> {
        const results = await this.db
            .prepare(`
        SELECT id, name, thumbnail, status, updated_at, created_at
        FROM templates
        ORDER BY updated_at DESC
        LIMIT 50
      `)
            .all<DBTemplate>();

        return (results.results || []).map((t) => ({
            id: t.id,
            name: t.name,
            thumbnail: t.thumbnail,
            status: t.status,
            sections: {},
            sectionOrder: [],
            customSections: [],
            globalTheme: {
                id: 'default',
                name: 'Default',
                category: 'modern',
                colors: {
                    primary: '#000000',
                    secondary: '#ffffff',
                    accent: '#000000',
                    background: '#ffffff',
                    text: '#000000',
                },
                fontFamily: 'Inter',
            },
            createdAt: t.created_at,
            updatedAt: t.updated_at,
        }));
    }

    /**
     * Get single template with full data (sections + elements)
     */
    async getTemplate(id: string): Promise<TemplateResponse | null> {
        // Fetch template
        const template = await this.db
            .prepare('SELECT * FROM templates WHERE id = ?')
            .bind(id)
            .first<DBTemplate>();

        if (!template) return null;

        // Fetch sections
        const sectionsResult = await this.db
            .prepare('SELECT * FROM template_sections WHERE template_id = ?')
            .bind(id)
            .all<DBTemplateSection>();

        const sections = sectionsResult.results || [];
        const sectionIds = sections.map((s) => s.id);

        // Fetch all elements for all sections in one query
        let allElements: DBTemplateElement[] = [];
        if (sectionIds.length > 0) {
            const placeholders = sectionIds.map(() => '?').join(',');
            const elementsResult = await this.db
                .prepare(`SELECT * FROM template_elements WHERE section_id IN (${placeholders})`)
                .bind(...sectionIds)
                .all<DBTemplateElement>();
            allElements = elementsResult.results || [];
        }

        // Group elements by section_id
        const elementsBySection: Record<string, DBTemplateElement[]> = {};
        allElements.forEach((el) => {
            if (!elementsBySection[el.section_id]) {
                elementsBySection[el.section_id] = [];
            }
            elementsBySection[el.section_id].push(el);
        });

        // Build sections map
        const sectionOrder = safeParseJSON<string[]>(template.section_order, []);
        const finalSections: Record<string, SectionDesign> = {};

        sections.forEach((section) => {
            const sectionElements = elementsBySection[section.id] || [];
            let order = sectionOrder.indexOf(section.type);
            if (order === -1) order = 999;

            finalSections[section.type] = {
                id: section.id,
                isVisible: section.is_visible === 1,
                backgroundColor: section.background_color || undefined,
                backgroundUrl: section.background_url || undefined,
                overlayOpacity: section.overlay_opacity,
                animation: section.animation,
                pageTitle: section.page_title || undefined,
                title: section.page_title || undefined,
                order,
                openInvitationConfig: safeParseJSON(section.open_invitation_config, undefined),
                animationTrigger: (section.animation_trigger as any) || 'scroll',
                transitionEffect: (section.transition_effect as string) || 'none',
                transitionDuration: (section.transition_duration as number) || 1000,
                transitionTrigger: (section.transition_trigger as any) || 'scroll',
                particleType: (section.particle_type as any) || 'none',
                kenBurnsEnabled: section.ken_burns_enabled === 1,
                zoomConfig: safeParseJSON(section.zoom_config, undefined),
                elements: sectionElements.map((el) => this.mapElementToResponse(el)),
            };
        });

        return {
            id: template.id,
            name: template.name,
            thumbnail: template.thumbnail,
            status: template.status,
            sections: finalSections,
            sectionOrder,
            customSections: safeParseJSON(template.custom_sections, []),
            globalTheme: safeParseJSON(template.global_theme, {
                id: 'default',
                name: 'Default',
                category: 'modern',
                colors: {
                    primary: '#000000',
                    secondary: '#ffffff',
                    accent: '#000000',
                    background: '#ffffff',
                    text: '#000000',
                },
                fontFamily: 'Inter',
            }),
            eventDate: template.event_date || undefined,
            createdAt: template.created_at,
            updatedAt: template.updated_at,
        };
    }

    /**
     * Create new template
     */
    async createTemplate(data: Partial<TemplateResponse>): Promise<TemplateResponse> {
        const id = generateUUID();
        const now = new Date().toISOString();

        await this.db
            .prepare(`
        INSERT INTO templates (id, name, thumbnail, status, section_order, custom_sections, global_theme, event_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                id,
                data.name || 'Untitled Template',
                data.thumbnail || null,
                data.status || 'draft',
                JSON.stringify(data.sectionOrder || []),
                JSON.stringify(data.customSections || []),
                JSON.stringify(data.globalTheme || {}),
                data.eventDate || null,
                now,
                now
            )
            .run();

        // Create initial sections if provided
        if (data.sections) {
            for (const [type, design] of Object.entries(data.sections)) {
                await this.upsertSection(id, type, design);
            }
        }

        return (await this.getTemplate(id))!;
    }

    /**
     * Update template
     */
    async updateTemplate(id: string, updates: Partial<TemplateResponse>): Promise<void> {
        const now = new Date().toISOString();

        const sets: string[] = ['updated_at = ?'];
        const values: unknown[] = [now];

        if (updates.name !== undefined) {
            sets.push('name = ?');
            values.push(updates.name);
        }
        if (updates.thumbnail !== undefined) {
            sets.push('thumbnail = ?');
            values.push(updates.thumbnail);
        }
        if (updates.status !== undefined) {
            sets.push('status = ?');
            values.push(updates.status);
        }
        if (updates.sectionOrder !== undefined) {
            sets.push('section_order = ?');
            values.push(JSON.stringify(updates.sectionOrder));
        }
        if (updates.customSections !== undefined) {
            sets.push('custom_sections = ?');
            values.push(JSON.stringify(updates.customSections));
        }
        if (updates.globalTheme !== undefined) {
            sets.push('global_theme = ?');
            values.push(JSON.stringify(updates.globalTheme));
        }
        if (updates.eventDate !== undefined) {
            sets.push('event_date = ?');
            values.push(updates.eventDate);
        }

        values.push(id);

        await this.db
            .prepare(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`)
            .bind(...values)
            .run();
    }

    /**
     * Delete template (cascades to sections and elements)
     */
    async deleteTemplate(id: string): Promise<void> {
        await this.db
            .prepare('DELETE FROM templates WHERE id = ?')
            .bind(id)
            .run();
    }

    // ============================================
    // SECTIONS
    // ============================================

    /**
     * Upsert section (create or update)
     */
    async upsertSection(templateId: string, sectionType: string, updates: Partial<SectionDesign>): Promise<string> {
        // Check if section exists
        const existing = await this.db
            .prepare('SELECT id FROM template_sections WHERE template_id = ? AND type = ?')
            .bind(templateId, sectionType)
            .first<{ id: string }>();

        const now = new Date().toISOString();

        if (existing) {
            // Update existing section - DYNAMIC UPDATE to prevent overwriting missing fields
            const sets: string[] = ['updated_at = ?'];
            const values: any[] = [now];

            if (updates.isVisible !== undefined) {
                sets.push('is_visible = ?');
                values.push(updates.isVisible ? 1 : 0);
            }
            if (updates.backgroundColor !== undefined) {
                sets.push('background_color = ?');
                values.push(updates.backgroundColor || null);
            }
            if (updates.backgroundUrl !== undefined) {
                sets.push('background_url = ?');
                values.push(updates.backgroundUrl || null);
            }
            if (updates.overlayOpacity !== undefined) {
                sets.push('overlay_opacity = ?');
                values.push(updates.overlayOpacity);
            }
            if (updates.animation !== undefined) {
                sets.push('animation = ?');
                values.push(updates.animation);
            }
            if (updates.pageTitle !== undefined) {
                sets.push('page_title = ?');
                values.push(updates.pageTitle || null);
            }
            if (updates.animationTrigger !== undefined) {
                sets.push('animation_trigger = ?');
                values.push(updates.animationTrigger);
            }
            if (updates.openInvitationConfig !== undefined) {
                sets.push('open_invitation_config = ?');
                values.push(JSON.stringify(updates.openInvitationConfig));
            }
            if (updates.transitionEffect !== undefined) {
                sets.push('transition_effect = ?');
                values.push(updates.transitionEffect);
            }
            if (updates.transitionDuration !== undefined) {
                sets.push('transition_duration = ?');
                values.push(updates.transitionDuration);
            }
            if (updates.transitionTrigger !== undefined) {
                sets.push('transition_trigger = ?');
                values.push(updates.transitionTrigger);
            }
            if (updates.particleType !== undefined) {
                sets.push('particle_type = ?');
                values.push(updates.particleType);
            }
            if (updates.kenBurnsEnabled !== undefined) {
                sets.push('ken_burns_enabled = ?');
                values.push(updates.kenBurnsEnabled ? 1 : 0);
            }
            if (updates.zoomConfig !== undefined) {
                sets.push('zoom_config = ?');
                values.push(updates.zoomConfig ? JSON.stringify(updates.zoomConfig) : null);
            }

            if (sets.length > 1) {
                const query = `UPDATE template_sections SET ${sets.join(', ')} WHERE id = ?`;
                await this.db.prepare(query).bind(...values, existing.id).run();
            }

            return existing.id;
        } else {
            // Create new section
            const id = generateUUID();
            await this.db
                .prepare(`
          INSERT INTO template_sections (
            id, template_id, type, is_visible, background_color, background_url, 
            overlay_opacity, animation, page_title, animation_trigger, 
            open_invitation_config, transition_effect, transition_duration, transition_trigger,
            particle_type, ken_burns_enabled, zoom_config,
            created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
                .bind(
                    id,
                    templateId,
                    sectionType,
                    updates.isVisible !== undefined ? (updates.isVisible ? 1 : 0) : 1,
                    updates.backgroundColor || null,
                    updates.backgroundUrl || null,
                    updates.overlayOpacity ?? 0,
                    updates.animation || 'fade-in',
                    updates.pageTitle || null,
                    updates.animationTrigger || 'scroll',
                    updates.openInvitationConfig ? JSON.stringify(updates.openInvitationConfig) : null,
                    updates.transitionEffect || 'none',
                    updates.transitionDuration || 1000,
                    updates.transitionTrigger || 'scroll',
                    updates.particleType || 'none',
                    updates.kenBurnsEnabled ? 1 : 0,
                    updates.zoomConfig ? JSON.stringify(updates.zoomConfig) : null,
                    now,
                    now
                )
                .run();

            return id;
        }
    }

    /**
     * Delete section
     */
    async deleteSection(templateId: string, sectionType: string): Promise<void> {
        await this.db
            .prepare('DELETE FROM template_sections WHERE template_id = ? AND type = ?')
            .bind(templateId, sectionType)
            .run();
    }

    /**
     * Get section ID by template and type
     */
    async getSectionId(templateId: string, sectionType: string): Promise<string | null> {
        const result = await this.db
            .prepare('SELECT id FROM template_sections WHERE template_id = ? AND type = ?')
            .bind(templateId, sectionType)
            .first<{ id: string }>();

        return result?.id || null;
    }

    // ============================================
    // ELEMENTS
    // ============================================

    /**
     * Create element
     */
    async createElement(sectionId: string, element: Partial<TemplateElement>): Promise<TemplateElement> {
        const id = element.id?.startsWith('el-') ? generateUUID() : (element.id || generateUUID());
        const now = new Date().toISOString();

        await this.db
            .prepare(`
        INSERT INTO template_elements (
          id, section_id, type, name, position_x, position_y, width, height, z_index,
          animation, loop_animation, animation_delay, animation_speed, animation_duration, animation_trigger,
          content, image_url, text_style, icon_style, countdown_config,
          rsvp_form_config, guest_wishes_config, open_invitation_config,
          rotation, flip_horizontal, flip_vertical, motion_path_config,
          can_edit_position, can_edit_content, is_content_protected, show_copy_button,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                id,
                sectionId,
                element.type || 'text',
                element.name || 'Element',
                element.position?.x ?? 0,
                element.position?.y ?? 0,
                element.size?.width ?? 100,
                element.size?.height ?? 100,
                element.zIndex ?? 0,
                element.animation || 'fade-in',
                element.loopAnimation || null,
                element.animationDelay ?? 0,
                element.animationSpeed ?? 500,
                element.animationDuration ?? 1000,
                element.animationTrigger || 'scroll',
                element.content || null,
                element.imageUrl || null,
                element.textStyle ? JSON.stringify(element.textStyle) : null,
                element.iconStyle ? JSON.stringify(element.iconStyle) : null,
                element.countdownConfig ? JSON.stringify(element.countdownConfig) : null,
                element.rsvpFormConfig ? JSON.stringify(element.rsvpFormConfig) : null,
                element.guestWishesConfig ? JSON.stringify(element.guestWishesConfig) : null,
                element.openInvitationConfig ? JSON.stringify(element.openInvitationConfig) : null,
                element.rotation ?? 0,
                element.flipHorizontal ? 1 : 0,
                element.flipVertical ? 1 : 0,
                element.motionPathConfig ? JSON.stringify(element.motionPathConfig) : null,
                element.canEditPosition ? 1 : 0,
                element.canEditContent ? 1 : 0,
                element.isContentProtected ? 1 : 0,
                element.showCopyButton ? 1 : 0,
                now,
                now
            )
            .run();

        const created = await this.db
            .prepare('SELECT * FROM template_elements WHERE id = ?')
            .bind(id)
            .first<DBTemplateElement>();

        return this.mapElementToResponse(created!);
    }

    /**
     * Update element
     */
    async updateElement(elementId: string, updates: Partial<TemplateElement>): Promise<void> {
        const now = new Date().toISOString();
        const sets: string[] = ['updated_at = ?'];
        const values: unknown[] = [now];

        if (updates.name !== undefined) {
            sets.push('"name" = ?');
            values.push(updates.name);
        }
        if (updates.position !== undefined) {
            sets.push('"position_x" = ?, "position_y" = ?');
            values.push(updates.position.x, updates.position.y);
        }
        if (updates.size !== undefined) {
            sets.push('"width" = ?, "height" = ?');
            values.push(updates.size.width, updates.size.height);
        }
        if (updates.zIndex !== undefined) {
            sets.push('"z_index" = ?');
            values.push(updates.zIndex);
        }
        if (updates.animation !== undefined) {
            sets.push('"animation" = ?');
            values.push(updates.animation);
        }
        if (updates.loopAnimation !== undefined) {
            sets.push('"loop_animation" = ?');
            values.push(updates.loopAnimation || null);
        }
        if (updates.animationDelay !== undefined) {
            sets.push('"animation_delay" = ?');
            values.push(updates.animationDelay);
        }
        if (updates.animationSpeed !== undefined) {
            sets.push('"animation_speed" = ?');
            values.push(updates.animationSpeed);
        }
        if (updates.animationDuration !== undefined) {
            sets.push('"animation_duration" = ?');
            values.push(updates.animationDuration);
        }
        if (updates.animationTrigger !== undefined) {
            sets.push('"animation_trigger" = ?');
            values.push(updates.animationTrigger);
        }

        if (updates.content !== undefined) {
            sets.push('"content" = ?');
            values.push(updates.content || null);
        }
        if (updates.imageUrl !== undefined) {
            sets.push('"image_url" = ?');
            values.push(updates.imageUrl || null);
        }
        if (updates.textStyle !== undefined) {
            sets.push('"text_style" = ?');
            values.push(JSON.stringify(updates.textStyle));
        }
        if (updates.iconStyle !== undefined) {
            sets.push('"icon_style" = ?');
            values.push(JSON.stringify(updates.iconStyle));
        }
        if (updates.countdownConfig !== undefined) {
            sets.push('"countdown_config" = ?');
            values.push(JSON.stringify(updates.countdownConfig));
        }
        if (updates.rsvpFormConfig !== undefined) {
            sets.push('"rsvp_form_config" = ?');
            values.push(JSON.stringify(updates.rsvpFormConfig));
        }
        if (updates.guestWishesConfig !== undefined) {
            sets.push('"guest_wishes_config" = ?');
            values.push(JSON.stringify(updates.guestWishesConfig));
        }
        if (updates.openInvitationConfig !== undefined) {
            sets.push('"open_invitation_config" = ?');
            values.push(JSON.stringify(updates.openInvitationConfig));
        }
        if (updates.rotation !== undefined) {
            sets.push('"rotation" = ?');
            values.push(updates.rotation);
        }
        if (updates.flipHorizontal !== undefined) {
            sets.push('"flip_horizontal" = ?');
            values.push(updates.flipHorizontal ? 1 : 0);
        }
        if (updates.flipVertical !== undefined) {
            sets.push('"flip_vertical" = ?');
            values.push(updates.flipVertical ? 1 : 0);
        }
        if (updates.motionPathConfig !== undefined) {
            sets.push('"motion_path_config" = ?');
            values.push(updates.motionPathConfig ? JSON.stringify(updates.motionPathConfig) : null);
        }
        if (updates.parallaxFactor !== undefined) {
            sets.push('"parallax_factor" = ?');
            values.push(updates.parallaxFactor);
        }

        // Permissions
        if (updates.canEditPosition !== undefined) {
            sets.push('"can_edit_position" = ?');
            values.push(updates.canEditPosition ? 1 : 0);
        }
        if (updates.canEditContent !== undefined) {
            sets.push('"can_edit_content" = ?');
            values.push(updates.canEditContent ? 1 : 0);
        }
        if (updates.isContentProtected !== undefined) {
            sets.push('"is_content_protected" = ?');
            values.push(updates.isContentProtected ? 1 : 0);
        }
        if (updates.showCopyButton !== undefined) {
            sets.push('"show_copy_button" = ?');
            values.push(updates.showCopyButton ? 1 : 0);
        }

        // Move "No Updates" check to after all possible property processing
        if (sets.length === 1 && sets[0] === 'updated_at = ?') return;

        values.push(elementId);

        const query = `UPDATE template_elements SET ${sets.join(', ')} WHERE id = ?`;
        console.log(`[DB SERVICE] Updating element ${elementId} with query:`, query);
        console.log(`[DB SERVICE] Values:`, values);

        await this.db
            .prepare(query)
            .bind(...values)
            .run();
    }

    /**
     * Get single element by ID
     * Used for cleanup operations
     */
    async getElement(elementId: string): Promise<TemplateElement | null> {
        const result = await this.db
            .prepare('SELECT * FROM template_elements WHERE id = ?')
            .bind(elementId)
            .first<DBTemplateElement>();

        if (!result) return null;
        return this.mapElementToResponse(result);
    }

    /**
     * Delete element
     */
    async deleteElement(elementId: string): Promise<void> {
        await this.db
            .prepare('DELETE FROM template_elements WHERE id = ?')
            .bind(elementId)
            .run();
    }

    // ============================================
    // RSVP
    // ============================================

    /**
     * Submit RSVP response
     */
    async submitRSVP(templateId: string, data: Partial<RSVPResponseType>): Promise<RSVPResponseType> {
        const id = generateUUID();
        const now = new Date().toISOString();

        await this.db
            .prepare(`
        INSERT INTO rsvp_responses (id, template_id, name, email, phone, message, attendance, is_public, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(
                id,
                templateId,
                data.name || 'Guest',
                data.email || null,
                data.phone || null,
                data.message || null,
                data.attendance || null,
                data.isPublic !== false ? 1 : 0,
                now
            )
            .run();

        return {
            id,
            templateId,
            name: data.name || 'Guest',
            email: data.email,
            phone: data.phone,
            message: data.message || '',
            attendance: data.attendance,
            isPublic: data.isPublic !== false,
            createdAt: now,
        };
    }

    /**
     * Get RSVP responses for template
     */
    async getRSVPResponses(templateId: string): Promise<RSVPResponseType[]> {
        const results = await this.db
            .prepare(`
        SELECT * FROM rsvp_responses
        WHERE template_id = ?
        ORDER BY created_at DESC
      `)
            .bind(templateId)
            .all<DBRSVPResponse>();

        return (results.results || []).map((r) => ({
            id: r.id,
            templateId: r.template_id,
            name: r.name,
            email: r.email || undefined,
            phone: r.phone || undefined,
            message: r.message || '',
            attendance: r.attendance || undefined,
            isPublic: r.is_public === 1,
            createdAt: r.created_at,
        }));
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Map DB element to API response
     */
    private mapElementToResponse(el: DBTemplateElement): TemplateElement {
        return {
            id: el.id,
            type: el.type,
            name: el.name,
            position: { x: el.position_x, y: el.position_y },
            size: { width: el.width, height: el.height },
            zIndex: el.z_index,
            animation: el.animation,
            loopAnimation: el.loop_animation || undefined,
            animationDelay: el.animation_delay,
            animationSpeed: el.animation_speed,
            animationDuration: el.animation_duration,
            animationTrigger: (el.animation_trigger || 'scroll') as 'scroll' | 'click' | 'open_btn',
            content: el.content || undefined,
            imageUrl: el.image_url || undefined,
            textStyle: safeParseJSON(el.text_style, undefined),
            iconStyle: safeParseJSON(el.icon_style, undefined),
            countdownConfig: safeParseJSON(el.countdown_config, undefined),
            rsvpFormConfig: safeParseJSON(el.rsvp_form_config, undefined),
            guestWishesConfig: safeParseJSON(el.guest_wishes_config, undefined),
            openInvitationConfig: safeParseJSON(el.open_invitation_config, undefined),
            rotation: el.rotation,
            flipHorizontal: el.flip_horizontal === 1,
            flipVertical: el.flip_vertical === 1,
            motionPathConfig: safeParseJSON(el.motion_path_config, undefined),
            parallaxFactor: el.parallax_factor || 0,

            // Permissions
            canEditPosition: el.can_edit_position === 1,
            canEditContent: el.can_edit_content === 1,
            isContentProtected: el.is_content_protected === 1,
            showCopyButton: el.show_copy_button === 1,
        };
    }
}
