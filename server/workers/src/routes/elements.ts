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
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const body = await c.req.json();
    const templateId = body._templateId; // Optional: pass from frontend for cache invalidation

    await db.updateElement(id, body);

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
