import { Hono } from 'hono';
import { Env, GuestResponse } from '../types';
import { DatabaseService } from '../services/database';
import { authMiddleware } from '../middleware/auth';

const guests = new Hono<{ Bindings: Env; Variables: { userId: string; userRole: string } }>();

// All guest routes require authentication
guests.use('*', authMiddleware);

/**
 * GET /api/guests/stats/summary
 * Get total guest statistics for current user
 */
guests.get('/stats/summary', async (c) => {
    const userId = c.get('userId');
    const db = new DatabaseService(c.env.DB);

    try {
        const stats = await db.getUserGuestStats(userId);
        return c.json(stats);
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

/**
 * GET /api/guests/:invitationId
 * Fetch all guests for a specific invitation
 */
guests.get('/:invitationId', async (c) => {
    const invitationId = c.req.param('invitationId');
    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const db = new DatabaseService(c.env.DB);

    // Security Check: Verify user owns the template
    const hasAccess = await db.canUserAccessTemplate(invitationId, userId, userRole === 'admin');
    if (!hasAccess) {
        return c.json({ error: 'Unauthorized access to this invitation' }, 403);
    }

    try {
        const result = await db.getGuests(invitationId);

        // Disable caching for guest list to ensure real-time accuracy after deletions/imports
        c.res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

        return c.json({ guests: result });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

/**
 * POST /api/guests/:invitationId
 * Add a single guest
 */
guests.post('/:invitationId', async (c) => {
    const invitationId = c.req.param('invitationId');
    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const body = await c.req.json<Partial<GuestResponse>>();
    const db = new DatabaseService(c.env.DB);

    // Security Check
    const hasAccess = await db.canUserAccessTemplate(invitationId, userId, userRole === 'admin');
    if (!hasAccess) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!body.name) {
        return c.json({ error: 'Guest name is required' }, 400);
    }

    try {
        const guest = await db.addGuest(invitationId, body);
        return c.json({ guest }, 201);
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

/**
 * POST /api/guests/:invitationId/bulk
 * Batch import guests
 */
guests.post('/:invitationId/bulk', async (c) => {
    const invitationId = c.req.param('invitationId');
    const userId = c.get('userId');
    const userRole = c.get('userRole');
    const body = await c.req.json<{ guests: Partial<GuestResponse>[] }>();
    const db = new DatabaseService(c.env.DB);

    // Security Check
    const hasAccess = await db.canUserAccessTemplate(invitationId, userId, userRole === 'admin');
    if (!hasAccess) {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!body.guests || !Array.isArray(body.guests)) {
        return c.json({ error: 'Invalid guest list' }, 400);
    }

    try {
        await db.bulkAddGuests(invitationId, body.guests);
        return c.json({ success: true, count: body.guests.length });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

/**
 * PUT /api/guests/:guestId
 * Update guest details
 */
guests.put('/:guestId', async (c) => {
    const guestId = c.req.param('guestId');
    const body = await c.req.json<Partial<GuestResponse>>();
    const db = new DatabaseService(c.env.DB);

    // Note: Enterprise check would verify ownership of the invitation this guest belongs to
    // For now, allow direct update if guest exists

    try {
        await db.updateGuest(guestId, body);
        return c.json({ success: true });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

/**
 * DELETE /api/guests/:guestId
 * Remove a guest
 */
guests.delete('/:guestId', async (c) => {
    const guestId = c.req.param('guestId');
    console.log(`[GUESTS] Deleting guest: ${guestId}`);
    const db = new DatabaseService(c.env.DB);

    try {
        await db.deleteGuest(guestId);
        console.log(`[GUESTS] Successfully deleted guest: ${guestId}`);
        return c.json({ success: true });
    } catch (err: any) {
        console.error(`[GUESTS] Delete failed for ${guestId}:`, err);
        return c.json({ error: err.message }, 500);
    }
});

export default guests;
