/**
 * Templates API Routes
 * Full CRUD operations for templates
 * OPTIMIZED FOR 10,000 USERS/MONTH - FREE TIER
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';
import type { Variables } from '../middleware/auth';

export const templatesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

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

// GET /api/templates/public/slug/:slug - Get public invitation view by slug
templatesRouter.get('/public/slug/:slug', async (c) => {
    const slug = c.req.param('slug').toLowerCase();
    const freshParam = c.req.query('fresh');
    const skipCache = freshParam === 'true';

    const cache = new CacheService(c.env.KV);

    // Try cache first (slug-based public view)
    if (!skipCache) {
        const cached = await cache.getPublicView(slug);
        if (cached) {
            return c.json(cached, 200, {
                'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
                'X-Cache-Status': 'HIT',
            });
        }
    }

    const db = new DatabaseService(c.env.DB);
    const template = await db.getTemplateBySlug(slug);

    if (!template || template.status !== 'published') {
        return c.json({ error: 'Invitation not found or not published' }, 404);
    }

    // Cache by slug too
    c.executionCtx.waitUntil(cache.setPublicView(slug, template));

    return c.json(template, 200, {
        'Cache-Control': 'public, max-age=7200, stale-while-revalidate=86400',
        'X-Cache-Status': 'MISS',
    });
});

// ============================================
// TEMPLATES LIST (ADMIN)
// ============================================

// GET /api/templates - List templates (filtered by user role)
templatesRouter.get('/', async (c) => {
    const db = new DatabaseService(c.env.DB);
    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const isAdmin = userRole === 'admin';

    let templates;
    if (isAdmin) {
        // Admins see all templates
        const cache = new CacheService(c.env.KV);
        const cached = await cache.getTemplatesList();
        if (cached) {
            return c.json(cached, 200, {
                'Cache-Control': 'private, max-age=60',
                'X-Cache-Status': 'HIT',
            });
        }
        templates = await db.getTemplates();
        await cache.setTemplatesList(templates);
    } else {
        // Regular users only see their own templates + master templates
        templates = await db.getTemplatesForUser(userId);
    }

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
    const freshParam = c.req.query('fresh');
    const skipCache = freshParam === 'true';

    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const isAdmin = userRole === 'admin';

    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    // Check ownership first (before cache to ensure security)
    const canAccess = await db.canUserAccessTemplate(id, userId, isAdmin);
    if (!canAccess) {
        return c.json({ error: 'Access denied. You can only access your own templates.' }, 403);
    }

    // If fresh=true is passed, skip cache entirely (used by editor after save)
    if (!skipCache) {
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
    } else {
        console.log(`[TEMPLATES] Cache bypass requested for ${id}`);
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

    // Invalidate templates list only on CREATE (when list actually changes)
    // This is the only place we need to invalidate the list
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

    // Get old template to find slug for invalidation
    const oldTemplate = await db.getTemplate(id);

    await db.updateTemplate(id, body);

    // Invalidate template cache
    await cache.invalidateTemplate(id);

    // Invalidate public views if publishing or already published
    if (body.status === 'published' || (oldTemplate && oldTemplate.status === 'published')) {
        await cache.invalidatePublicView(id);

        // ALSO invalidate by slug to prevent stale public view
        const currentSlug = body.slug || (oldTemplate && oldTemplate.slug);
        if (currentSlug) {
            await cache.invalidatePublicView(currentSlug.toLowerCase());
        }
    }

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

    // Invalidate caches - DELETE truly changes the list, so invalidate it
    await cache.invalidateTemplate(id);
    await cache.invalidatePublicView(id);
    await cache.invalidateTemplatesList(); // Only on DELETE, list actually changes

    return c.json({ success: true });
});
