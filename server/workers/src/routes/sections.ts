/**
 * Sections API Routes
 * CRUD operations for template sections
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

export const sectionsRouter = new Hono<{ Bindings: Env }>();

// PUT /api/sections/:templateId/:type - Update or create section
sectionsRouter.put('/:templateId/:type', async (c) => {
    const templateId = c.req.param('templateId');
    const sectionType = c.req.param('type');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const body = await c.req.json();

    // DEBUG: Log incoming update request
    console.log(`[SECTIONS API] PUT ${templateId}/${sectionType}`, JSON.stringify(body));

    const sectionId = await db.upsertSection(templateId, sectionType, body);

    // DEBUG: Log successful update
    console.log(`[SECTIONS API] Updated section ${sectionId} successfully`);

    // Invalidate template cache
    await cache.invalidateTemplate(templateId);

    return c.json({ success: true, sectionId });
});

// DELETE /api/sections/:templateId/:type - Delete section
sectionsRouter.delete('/:templateId/:type', async (c) => {
    const templateId = c.req.param('templateId');
    const sectionType = c.req.param('type');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    await db.deleteSection(templateId, sectionType);

    // Invalidate template cache
    await cache.invalidateTemplate(templateId);

    return c.json({ success: true });
});
