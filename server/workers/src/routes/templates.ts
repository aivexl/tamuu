/**
 * Templates API Routes
 * Full CRUD operations for templates
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

export const templatesRouter = new Hono<{ Bindings: Env }>();

// GET /api/templates - List all templates
templatesRouter.get('/', async (c) => {
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    // Try cache first
    const cached = await cache.getTemplatesList();
    if (cached) {
        return c.json(cached);
    }

    // Fetch from database
    const templates = await db.getTemplates();

    // Cache the result
    await cache.setTemplatesList(templates);

    return c.json(templates);
});

// GET /api/templates/:id - Get single template with full data
templatesRouter.get('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    // Try cache first
    const cached = await cache.getTemplate(id);
    if (cached) {
        console.log(`[TEMPLATES API] Returning CACHED template for ${id}`);
        return c.json(cached);
    }

    console.log(`[TEMPLATES API] Fetching template ${id} from DB`);
    // Fetch from database
    const template = await db.getTemplate(id);

    if (!template) {
        return c.json({ error: 'Template not found' }, 404);
    }

    // DEBUG: Log first section's transition settings to verify if they exist in DB
    const firstSectionType = Object.keys(template.sections)[0];
    if (firstSectionType) {
        const s = template.sections[firstSectionType];
        console.log(`[TEMPLATES API] DB Return for ${firstSectionType}:`, {
            bg: s.backgroundColor,
            transition: s.transitionEffect,
            trigger: s.transitionTrigger
        });
    }

    // Cache the result
    await cache.setTemplate(id, template);

    return c.json(template);
});

// POST /api/templates - Create new template
templatesRouter.post('/', async (c) => {
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const body = await c.req.json();

    if (!body.name) {
        return c.json({ error: 'Template name is required' }, 400);
    }

    const template = await db.createTemplate(body);

    // Invalidate cache
    await cache.invalidateTemplatesList();

    return c.json(template, 201);
});

// PUT /api/templates/:id - Update template
templatesRouter.put('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const body = await c.req.json();

    await db.updateTemplate(id, body);

    // Invalidate cache
    await cache.invalidateTemplate(id);

    return c.json({ success: true });
});

// DELETE /api/templates/:id - Delete template
templatesRouter.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    await db.deleteTemplate(id);

    // Invalidate cache
    await cache.invalidateTemplate(id);

    return c.json({ success: true });
});
