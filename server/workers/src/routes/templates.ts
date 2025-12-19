/**
 * Templates API Routes
 * Full CRUD operations for templates
 * OPTIMIZED FOR 10,000 USERS/MONTH - FREE TIER
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

export const templatesRouter = new Hono<{ Bindings: Env }>();

// ============================================
// PUBLIC VIEW ENDPOINT (HIGHLY CACHED - FOR GUESTS)
// 48-hour cache for maximum performance
// ============================================

// GET /api/templates/public/:id - Get public invitation view
templatesRouter.get('/public/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);

    // Check public view cache first (48 hour TTL)
    const cached = await cache.getPublicView(id);
    if (cached) {
        // Track cache hit (non-blocking)
        c.executionCtx.waitUntil(cache.trackCacheHit(true));

        // Return with aggressive cache headers
        return c.json(cached, 200, {
            'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'max-age=86400',
            'X-Cache-Status': 'HIT',
        });
    }

    // Track cache miss (non-blocking)
    c.executionCtx.waitUntil(cache.trackCacheHit(false));

    const db = new DatabaseService(c.env.DB);
    const template = await db.getTemplate(id);

    if (!template) {
        return c.json({ error: 'Invitation not found' }, 404);
    }

    if (template.status !== 'published') {
        return c.json({ error: 'Invitation not published' }, 404);
    }

    // Cache for future requests (non-blocking)
    c.executionCtx.waitUntil(cache.setPublicView(id, template));

    return c.json(template, 200, {
        'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'max-age=86400',
        'X-Cache-Status': 'MISS',
    });
});

// ============================================
// TEMPLATES LIST (ADMIN)
// ============================================

// GET /api/templates - List all templates
templatesRouter.get('/', async (c) => {
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    // Try cache first
    const cached = await cache.getTemplatesList();
    if (cached) {
        return c.json(cached, 200, {
            'Cache-Control': 'private, max-age=60',
            'X-Cache-Status': 'HIT',
        });
    }

    // Fetch from database
    const templates = await db.getTemplates();

    // Cache the result
    await cache.setTemplatesList(templates);

    return c.json(templates, 200, {
        'Cache-Control': 'private, max-age=60',
        'X-Cache-Status': 'MISS',
    });
});

// ============================================
// SINGLE TEMPLATE (WITH SWR)
// ============================================

// GET /api/templates/:id - Get single template with full data
templatesRouter.get('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    // Try cache with stale-while-revalidate
    const { value: cached, isStale, needsRevalidation } = await cache.getTemplate(id);

    if (cached) {
        // If stale but usable, revalidate in background (non-blocking)
        if (needsRevalidation) {
            console.log(`[TEMPLATES] Serving stale, revalidating ${id}...`);
            c.executionCtx.waitUntil(revalidateInBackground(id, db, cache));
        }

        return c.json(cached, 200, {
            'Cache-Control': 'private, max-age=60',
            'X-Cache-Status': isStale ? 'STALE' : 'HIT',
        });
    }

    console.log(`[TEMPLATES API] Fetching template ${id} from DB`);
    // Fetch from database
    const template = await db.getTemplate(id);

    if (!template) {
        return c.json({ error: 'Template not found' }, 404);
    }

    // Cache the result
    await cache.setTemplate(id, template);

    return c.json(template, 200, {
        'Cache-Control': 'private, max-age=60',
        'X-Cache-Status': 'MISS',
    });
});

/**
 * Background revalidation (non-blocking)
 * Updates cache while user already received stale data
 */
async function revalidateInBackground(
    id: string,
    db: DatabaseService,
    cache: CacheService
): Promise<void> {
    try {
        const template = await db.getTemplate(id);
        if (template) {
            await cache.setTemplate(id, template);
            console.log(`[REVALIDATE] Template ${id} refreshed in background`);
        }
    } catch (err) {
        console.error(`[REVALIDATE] Failed for ${id}:`, err);
    }
}

// ============================================
// CREATE TEMPLATE
// ============================================

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

// ============================================
// UPDATE TEMPLATE
// ============================================

// PUT /api/templates/:id - Update template
templatesRouter.put('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const body = await c.req.json();

    await db.updateTemplate(id, body);

    // Invalidate all related caches
    await cache.invalidateTemplate(id);
    await cache.invalidatePublicView(id); // Also invalidate public view

    return c.json({ success: true });
});

// ============================================
// DELETE TEMPLATE
// ============================================

// DELETE /api/templates/:id - Delete template
templatesRouter.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    await db.deleteTemplate(id);

    // Invalidate all related caches
    await cache.invalidateTemplate(id);
    await cache.invalidatePublicView(id); // Also invalidate public view

    return c.json({ success: true });
});
