/**
 * Tamuu API - Cloudflare Workers Entry Point
 * Enterprise-grade API for digital invitation platform
 * OPTIMIZED FOR 10,000 USERS/MONTH - FREE TIER
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import type { Env } from './types';

// Import routes
import { templatesRouter } from './routes/templates';
import { sectionsRouter } from './routes/sections';
import { elementsRouter } from './routes/elements';
import { rsvpRouter } from './routes/rsvp';
import { uploadRouter } from './routes/upload';
import { authRouter } from './routes/auth';
import { batchRouter } from './routes/batch';
import { webhookRouter } from './routes/webhook';
import { invitationsRouter } from './routes/invitations';


// Create Hono app with environment type
const app = new Hono<{ Bindings: Env }>();

// ============================================
// MIDDLEWARE (OPTIMIZED)
// ============================================

// Note: Cloudflare Workers automatically handles gzip compression at the edge
// Don't use compress() middleware here as it causes double-compression issues


// Request timing middleware
app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    c.res.headers.set('X-Response-Time', `${duration}ms`);
});

// CORS configuration for frontend
app.use('*', cors({
    origin: (origin) => {
        // Allow specific origins
        const allowedOrigins = [
            'https://tamuu.pages.dev',
            'http://localhost:5173',
            'http://localhost:4173',
        ];

        if (allowedOrigins.includes(origin)) {
            return origin;
        }

        // Allow preview deployments (*.tamuu.pages.dev)
        if (origin && origin.endsWith('.tamuu.pages.dev')) {
            return origin;
        }

        return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Request-Id', 'X-Response-Time', 'X-Cache-Status'],
    maxAge: 86400, // 24 hours
    credentials: true,
}));

// Request logging (only errors in production for performance)
app.use('*', logger());

// Pretty JSON responses
app.use('*', prettyJSON());

// Default cache headers for API responses
app.use('/api/*', async (c, next) => {
    await next();

    // Don't override existing cache headers
    if (c.res.headers.has('Cache-Control')) return;

    // No cache for mutations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
        c.res.headers.set('Cache-Control', 'no-store');
        return;
    }

    // Default short cache for GET requests
    c.res.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/', (c) => {
    return c.json({
        status: 'ok',
        message: 'Tamuu API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health', async (c) => {
    try {
        // Check D1 connection
        const dbCheck = await c.env.DB.prepare('SELECT 1 as check').first();

        // Check KV connection
        await c.env.KV.put('health_check', 'ok', { expirationTtl: 60 });
        const kvCheck = await c.env.KV.get('health_check');

        return c.json({
            status: 'healthy',
            services: {
                d1: dbCheck ? 'connected' : 'error',
                kv: kvCheck === 'ok' ? 'connected' : 'error',
                r2: 'available',
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return c.json({
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
        }, 500);
    }
});

// ============================================
// API ROUTES
// ============================================

// Mount routers
app.route('/api/auth', authRouter);

// Protected routes (require login)
import { authMiddleware, roleMiddleware } from './middleware/auth';

// Protect all /api/templates routes EXCEPT /api/templates/public/*
app.use('/api/templates/*', async (c, next) => {
    if (c.req.path.startsWith('/api/templates/public/')) {
        return await next();
    }
    return authMiddleware(c, next);
});

app.use('/api/sections/*', authMiddleware);
app.use('/api/elements/*', authMiddleware);
app.use('/api/batch-update/*', authMiddleware);

// Strict RBAC: Admin only for modifications
app.on(['POST', 'PUT', 'DELETE', 'PATCH'], '/api/templates/*', roleMiddleware(['admin']));
app.on(['POST', 'PUT', 'DELETE', 'PATCH'], '/api/sections/*', roleMiddleware(['admin']));
app.on(['POST', 'PUT', 'DELETE', 'PATCH'], '/api/elements/*', roleMiddleware(['admin']));
app.use('/api/batch-update/*', roleMiddleware(['admin']));

app.route('/api/templates', templatesRouter);
app.route('/api/sections', sectionsRouter);
app.route('/api/elements', elementsRouter);
app.route('/api/batch-update', batchRouter);

// RSVP and Upload are more flexible
app.route('/api/rsvp', rsvpRouter);
app.route('/api/upload', uploadRouter);

// Invitations (user onboarding) - some endpoints are public, some are protected
app.route('/api/invitations', invitationsRouter);

// Webhook routes (public, called by payment gateways)
app.route('/api/webhook', webhookRouter);


// ============================================
// ERROR HANDLING
// ============================================

app.onError((err, c) => {
    console.error('API Error:', err);

    return c.json({
        error: true,
        message: err.message || 'Internal Server Error',
        ...(c.env.ENVIRONMENT !== 'production' && { stack: err.stack }),
    }, 500);
});

app.notFound((c) => {
    return c.json({
        error: true,
        message: 'Not Found',
        path: c.req.path,
    }, 404);
});

// Export for Cloudflare Workers
export default app;
