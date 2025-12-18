/**
 * Elements API Routes
 * CRUD operations for template elements
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

export const elementsRouter = new Hono<{ Bindings: Env }>();

// POST /api/elements/:templateId/:sectionType - Create element
elementsRouter.post('/:templateId/:sectionType', async (c) => {
    const templateId = c.req.param('templateId');
    const sectionType = c.req.param('sectionType');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const body = await c.req.json();

    // First ensure section exists
    let sectionId = await db.getSectionId(templateId, sectionType);
    if (!sectionId) {
        sectionId = await db.upsertSection(templateId, sectionType, {});
    }

    const element = await db.createElement(sectionId, body);

    // Invalidate template cache
    await cache.invalidateTemplate(templateId);

    return c.json(element, 201);
});

// PUT /api/elements/:id - Update element
elementsRouter.put('/:id', async (c) => {
    const id = c.req.param('id');
    const db = new DatabaseService(c.env.DB);
    const cache = new CacheService(c.env.KV);

    const body = await c.req.json();
    console.log(`[ELEMENTS ROUTE] Updating element ${id} with body:`, JSON.stringify(body, null, 2));

    const { templateId, ...updates } = body;

    await db.updateElement(id, updates);

    // Invalidate template cache if templateId provided
    if (templateId) {
        await cache.invalidateTemplate(templateId);
    }

    return c.json({ success: true });
});

// DELETE /api/elements/:id - Delete element
elementsRouter.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const templateId = c.req.query('templateId');

    await db.deleteElement(id);

    // Invalidate template cache if templateId provided
    if (templateId) {
        await cache.invalidateTemplate(templateId);
    }

    return c.json({ success: true });
});
