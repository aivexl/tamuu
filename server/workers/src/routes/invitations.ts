/**
 * Invitations API Routes
 * Handles user invitation creation, slug validation, and template cloning
 * Enterprise-grade for user onboarding flow
 */

import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, AuthTokenPayload } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

import { AuthService } from '../services/auth';

export const invitationsRouter = new Hono<{ Bindings: Env }>();

// ============================================
// AUTH HELPERS (Legacy custom JWT removed)
// ============================================

// Use AuthService.getAuthUser(c) instead

// ============================================
// SLUG VALIDATION
// ============================================

// Slug format: lowercase, alphanumeric, hyphens only, 3-50 chars
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

function isValidSlugFormat(slug: string): boolean {
    return SLUG_REGEX.test(slug);
}

// GET /api/invitations/check-slug/:slug - Check slug availability
invitationsRouter.get('/check-slug/:slug', async (c) => {
    const slug = c.req.param('slug').toLowerCase();

    // Validate format
    if (!isValidSlugFormat(slug)) {
        return c.json({
            available: false,
            reason: 'invalid_format',
            message: 'Slug harus 3-50 karakter, huruf kecil, angka, dan tanda hubung saja'
        }, 400);
    }

    // Reserved slugs
    const RESERVED_SLUGS = [
        'admin', 'api', 'dashboard', 'login', 'register', 'profile',
        'templates', 'preview', 'editor', 'onboarding', 'settings',
        'help', 'support', 'about', 'contact', 'terms', 'privacy'
    ];

    if (RESERVED_SLUGS.includes(slug)) {
        return c.json({
            available: false,
            reason: 'reserved',
            message: 'Link ini sudah digunakan oleh sistem'
        });
    }

    const db = new DatabaseService(c.env.DB);
    const isAvailable = await db.checkSlugAvailability(slug);

    return c.json({
        available: isAvailable,
        reason: isAvailable ? null : 'taken',
        message: isAvailable ? 'Link tersedia!' : 'Link ini sudah digunakan'
    });
});

// ============================================
// USER INVITATION CRUD
// ============================================

// GET /api/invitations/my - Get current user's invitations
invitationsRouter.get('/my', async (c) => {
    const user = await AuthService.getAuthUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const db = new DatabaseService(c.env.DB);
    const invitations = await db.getUserInvitations(user.userId);

    return c.json({ invitations });
});

// POST /api/invitations - Create new invitation (clone template)
invitationsRouter.post('/', async (c) => {
    const user = await AuthService.getAuthUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { templateId, slug, name, category } = body;

    // Validate required fields
    if (!templateId || !slug) {
        return c.json({ error: 'Template ID and slug are required' }, 400);
    }

    // Validate slug format
    if (!isValidSlugFormat(slug.toLowerCase())) {
        return c.json({
            error: 'Invalid slug format',
            message: 'Slug harus 3-50 karakter, huruf kecil, angka, dan tanda hubung saja'
        }, 400);
    }

    const db = new DatabaseService(c.env.DB);

    // Check slug availability
    const isAvailable = await db.checkSlugAvailability(slug);
    if (!isAvailable) {
        return c.json({ error: 'Slug already taken' }, 409);
    }

    try {
        // Clone template for user
        const invitation = await db.cloneTemplateForUser(
            templateId,
            user.userId,
            slug.toLowerCase(),
            name || 'My Invitation',
            category || 'wedding'
        );

        // Invalidate caches
        const cache = new CacheService(c.env.KV);
        await cache.invalidateTemplatesList();

        return c.json({ invitation }, 201);
    } catch (error: any) {
        console.error('[INVITATIONS] Clone failed:', error);
        return c.json({ error: error.message || 'Failed to create invitation' }, 500);
    }
});

// ============================================
// MASTER TEMPLATES (for template store)
// ============================================

// GET /api/invitations/masters - Get master templates for selection
invitationsRouter.get('/masters', async (c) => {
    const category = c.req.query('category');

    const db = new DatabaseService(c.env.DB);
    const templates = await db.getMasterTemplates(category);

    return c.json({ templates }, 200, {
        'Cache-Control': 'public, max-age=300'
    });
});

// GET /api/invitations/public/:slug - Get public invitation by slug
invitationsRouter.get('/public/:slug', async (c) => {
    const slug = c.req.param('slug').toLowerCase();
    const cache = new CacheService(c.env.KV);

    // Check cache first
    const cacheKey = `invitation:slug:${slug}`;
    const cached = await c.env.KV.get(cacheKey, 'json');
    if (cached) {
        return c.json(cached, 200, {
            'Cache-Control': 'public, max-age=3600',
            'X-Cache-Status': 'HIT'
        });
    }

    const db = new DatabaseService(c.env.DB);
    const invitation = await db.getTemplateBySlug(slug);

    if (!invitation) {
        return c.json({ error: 'Invitation not found' }, 404);
    }

    // Only show published invitations publicly
    if (invitation.status !== 'published') {
        return c.json({ error: 'Invitation not published' }, 404);
    }

    // Cache for 1 hour
    await c.env.KV.put(cacheKey, JSON.stringify(invitation), { expirationTtl: 3600 });

    return c.json(invitation, 200, {
        'Cache-Control': 'public, max-age=3600',
        'X-Cache-Status': 'MISS'
    });
});

// GET /api/invitations/by-slug/:slug - Get user's invitation by slug (protected)
invitationsRouter.get('/by-slug/:slug', async (c) => {
    const user = await AuthService.getAuthUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const slug = c.req.param('slug').toLowerCase();
    const db = new DatabaseService(c.env.DB);
    const invitation = await db.getTemplateBySlug(slug);

    if (!invitation || (invitation.userId !== user.userId && user.role !== 'admin')) {
        return c.json({ error: 'Not found or access denied' }, 404);
    }

    return c.json({ invitation });
});

// GET /api/invitations/:id - Get user's invitation by ID (protected)
invitationsRouter.get('/:id', async (c) => {
    const user = await getAuthUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const db = new DatabaseService(c.env.DB);
    const invitation = await db.getTemplate(id);

    if (!invitation || (invitation.userId !== user.userId && user.role !== 'admin')) {
        return c.json({ error: 'Not found or access denied' }, 404);
    }

    return c.json({ invitation });
});

// PUT /api/invitations/:id - Update user's invitation
invitationsRouter.put('/:id', async (c) => {
    const user = await getAuthUser(c);
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();

    const db = new DatabaseService(c.env.DB);
    const cache = new CacheService(c.env.KV);

    // Verify ownership
    const existing = await db.getTemplate(id);
    if (!existing || existing.userId !== user.userId) {
        return c.json({ error: 'Not found or access denied' }, 404);
    }

    // If updating slug, validate it
    if (body.slug && body.slug !== existing.slug) {
        if (!isValidSlugFormat(body.slug.toLowerCase())) {
            return c.json({ error: 'Invalid slug format' }, 400);
        }

        const isAvailable = await db.checkSlugAvailability(body.slug);
        if (!isAvailable) {
            return c.json({ error: 'Slug already taken' }, 409);
        }
    }

    await db.updateTemplate(id, body);

    // Invalidate caches
    await cache.invalidateTemplate(id);
    if (existing.slug) {
        await c.env.KV.delete(`invitation:slug:${existing.slug}`);
    }
    if (body.slug) {
        await c.env.KV.delete(`invitation:slug:${body.slug.toLowerCase()}`);
    }

    return c.json({ success: true });
});

// ============================================
// MASTER TEMPLATES (for template store)
// ============================================

// GET /api/invitations/masters - Get master templates for selection
invitationsRouter.get('/masters', async (c) => {
    const category = c.req.query('category');

    const db = new DatabaseService(c.env.DB);
    const templates = await db.getMasterTemplates(category);

    return c.json({ templates }, 200, {
        'Cache-Control': 'public, max-age=300'
    });
});
