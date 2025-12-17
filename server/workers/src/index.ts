/**
 * Tamuu API - Cloudflare Workers Entry Point
 * Enterprise-grade API for digital invitation platform
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

// Create Hono app with environment type
const app = new Hono<{ Bindings: Env }>();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration for frontend
app.use('*', cors({
    origin: [
        'https://tamuu.pages.dev',
        'http://localhost:5173',
        'http://localhost:4173',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours
    credentials: true,
}));

// Request logging
app.use('*', logger());

// Pretty JSON responses in development
app.use('*', prettyJSON());

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
// DIAGNOSTIC ROUTES
// ============================================

app.get('/api/debug/columns', async (c) => {
    try {
        const result = await c.env.DB.prepare('PRAGMA table_info(template_sections)').all();
        return c.json({
            table: 'template_sections',
            columns: result.results.map((r: any) => ({
                name: r.name,
                type: r.type,
                dflt_value: r.dflt_value
            }))
        });
    } catch (error) {
        return c.json({ error: true, message: error instanceof Error ? error.message : String(error) }, 500);
    }
});

// ============================================
// API ROUTES
// ============================================

// Mount routers
app.route('/api/templates', templatesRouter);
app.route('/api/sections', sectionsRouter);
app.route('/api/elements', elementsRouter);
app.route('/api/rsvp', rsvpRouter);
app.route('/api/upload', uploadRouter);

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
