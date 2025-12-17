/**
 * RSVP API Routes
 * Submit and retrieve RSVP responses
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

export const rsvpRouter = new Hono<{ Bindings: Env }>();

// POST /api/rsvp/:templateId - Submit RSVP
rsvpRouter.post('/:templateId', async (c) => {
    const templateId = c.req.param('templateId');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    const body = await c.req.json();

    if (!body.name) {
        return c.json({ error: 'Name is required' }, 400);
    }

    const response = await db.submitRSVP(templateId, body);

    // Invalidate RSVP cache
    await cache.invalidateRSVP(templateId);

    return c.json(response, 201);
});

// GET /api/rsvp/:templateId - Get RSVP responses
rsvpRouter.get('/:templateId', async (c) => {
    const templateId = c.req.param('templateId');
    const cache = new CacheService(c.env.KV);
    const db = new DatabaseService(c.env.DB);

    // Try cache first
    const cached = await cache.getRSVPResponses(templateId);
    if (cached) {
        return c.json(cached);
    }

    // Fetch from database
    const responses = await db.getRSVPResponses(templateId);

    // Cache the result
    await cache.setRSVPResponses(templateId, responses);

    return c.json(responses);
});
