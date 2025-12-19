/**
 * Elements API Routes
 * CRUD operations for template elements
 * OPTIMIZED: Auto-cleanup R2 images on delete
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';
import { extractR2Key } from './upload';

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
    console.log(`[ELEMENTS ROUTE] Updating element ${id}`);

    const { templateId, ...updates } = body;

    // If image is being changed, cleanup old image from R2
    if (updates.imageUrl !== undefined) {
        const oldElement = await db.getElement(id);
        if (oldElement?.imageUrl && oldElement.imageUrl !== updates.imageUrl) {
            const oldKey = extractR2Key(oldElement.imageUrl);
            if (oldKey) {
                try {
                    await c.env.R2.delete(oldKey);
                    console.log(`🗑️ Cleaned up old image: ${oldKey}`);
                } catch (err) {
                    console.error(`Failed to cleanup old image: ${oldKey}`, err);
                }
            }
        }
    }

    await db.updateElement(id, updates);

    // Invalidate template cache if templateId provided
    if (templateId) {
        await cache.invalidateTemplate(templateId);
    }

    return c.json({ success: true });
});

// DELETE /api/elements/:id - Delete element with R2 cleanup
elementsRouter.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const templateId = c.req.query('templateId');

    // Get element data first (to cleanup image if exists)
    const element = await db.getElement(id);

    // Delete from database
    await db.deleteElement(id);

    // Cleanup image from R2 if exists
    if (element?.imageUrl) {
        const key = extractR2Key(element.imageUrl);
        if (key) {
            try {
                await c.env.R2.delete(key);
                console.log(`🗑️ Deleted image from R2: ${key}`);
            } catch (err) {
                console.error(`Failed to delete R2 image: ${key}`, err);
                // Don't fail the request if R2 delete fails
            }
        }
    }

    // Invalidate template cache if templateId provided
    if (templateId) {
        await cache.invalidateTemplate(templateId);
    }

    return c.json({ success: true });
});
