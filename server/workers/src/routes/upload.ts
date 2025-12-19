/**
 * Upload API Routes
 * R2 file upload, image proxy, and cleanup
 * OPTIMIZED FOR 10,000 USERS/MONTH - FREE TIER
 */

import { Hono } from 'hono';
import type { Env } from '../types';

export const uploadRouter = new Hono<{ Bindings: Env }>();

// Allowed MIME types
const ALLOWED_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/ogg',
];

// Max file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// R2 Public URL
const getR2PublicUrl = (env: Env) => env.R2_PUBLIC_URL || 'https://pub-1e0a9ae6152440268987d00a564a8da5.r2.dev';

// API Base URL for proxy
const getApiBaseUrl = () => 'https://tamuu-api.workers.dev';

/**
 * Extract R2 key from various URL formats
 */
function extractR2Key(url: string): string | null {
    if (!url) return null;

    try {
        const parsedUrl = new URL(url);

        // Handle proxy URL format
        if (url.includes('/api/upload/proxy')) {
            const originalUrl = parsedUrl.searchParams.get('url');
            if (originalUrl) {
                return extractR2Key(originalUrl);
            }
        }

        // Handle direct R2 URL
        if (parsedUrl.hostname.includes('r2.dev') ||
            parsedUrl.hostname.includes('r2.cloudflarestorage.com')) {
            return decodeURIComponent(parsedUrl.pathname.slice(1));
        }
    } catch {
        return null;
    }

    return null;
}

// ============================================
// POST /api/upload - Upload file to R2
// ============================================
uploadRouter.post('/', async (c) => {
    try {
        const contentType = c.req.header('Content-Type') || '';

        // Handle multipart form data
        if (contentType.includes('multipart/form-data')) {
            const formData = await c.req.formData();
            const file = formData.get('file') as File | null;

            if (!file) {
                return c.json({ error: 'No file uploaded' }, 400);
            }

            if (!ALLOWED_TYPES.includes(file.type)) {
                return c.json({ error: 'File type not allowed' }, 400);
            }

            if (file.size > MAX_FILE_SIZE) {
                return c.json({ error: 'File too large' }, 400);
            }

            // Generate unique filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(7);
            const extension = file.name.split('.').pop() || 'jpg';
            const filename = `${timestamp}-${randomString}.${extension}`;

            // Create path with date structure
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const key = `photos/${year}/${month}/${filename}`;

            // Upload to R2 with optimized metadata
            const arrayBuffer = await file.arrayBuffer();
            await c.env.R2.put(key, arrayBuffer, {
                httpMetadata: {
                    contentType: file.type,
                    cacheControl: 'public, max-age=31536000, immutable',
                },
                customMetadata: {
                    originalName: file.name,
                    uploadedAt: new Date().toISOString(),
                    size: String(file.size),
                },
            });

            // Return optimized proxy URL instead of direct R2
            const directUrl = `${getR2PublicUrl(c.env)}/${key}`;
            const proxyUrl = `${getApiBaseUrl()}/api/upload/proxy?url=${encodeURIComponent(directUrl)}`;

            return c.json({
                success: true,
                url: proxyUrl,      // Optimized proxy URL (cached)
                directUrl,          // Direct R2 URL (for backup)
                key,
                filename,
                size: file.size,
                type: file.type,
            });
        }

        return c.json({ error: 'Invalid content type' }, 400);
    } catch (error) {
        console.error('Upload error:', error);
        return c.json({
            error: 'Upload failed',
            details: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
});

// ============================================
// GET /api/upload/r2/* - Direct R2 file serving
// Serves files directly from R2 bucket without external URL access
// This bypasses SSL certificate issues with R2 public bucket
// ============================================
uploadRouter.get('/r2/*', async (c) => {
    // Extract key from the URL path after /r2/
    const fullPath = c.req.path;
    const r2Prefix = '/api/upload/r2/';
    const key = fullPath.startsWith(r2Prefix)
        ? fullPath.slice(r2Prefix.length)
        : c.req.param('*');

    console.log('[R2 Direct] Requested key:', key, 'Full path:', fullPath);

    if (!key) {
        return c.json({ error: 'Missing file key', path: fullPath }, 400);
    }

    try {
        const object = await c.env.R2.get(key);

        if (!object) {
            return c.json({ error: 'File not found', key }, 404);
        }

        const headers = new Headers();
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        headers.set('CDN-Cache-Control', 'max-age=31536000');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('ETag', `"${object.etag}"`);
        headers.set('Content-Length', String(object.size));
        headers.set('X-Cache-Status', 'DIRECT-R2');

        return new Response(object.body, { headers });
    } catch (error) {
        console.error('[R2 Direct] Error:', error);
        return c.json({
            error: 'Failed to fetch file from R2',
            details: error instanceof Error ? error.message : String(error),
        }, 500);
    }
});

// ============================================
// GET /api/upload/proxy - Proxy image from R2
// OPTIMIZED: Direct R2 bucket access (faster than HTTP fetch)
// ============================================
uploadRouter.get('/proxy', async (c) => {
    const imageUrl = c.req.query('url');

    if (!imageUrl) {
        return c.json({ error: 'Missing url parameter' }, 400);
    }

    try {
        const parsedUrl = new URL(imageUrl);

        // Only allow R2 domains
        const allowedDomains = [
            'pub-1e0a9ae6152440268987d00a564a8da5.r2.dev',
            'r2.cloudflarestorage.com',
        ];

        const isAllowed = allowedDomains.some(
            (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            return c.json({ error: 'Domain not allowed' }, 403);
        }

        // Extract key from R2 URL for direct bucket access
        const key = decodeURIComponent(parsedUrl.pathname.slice(1));
        console.log(`[PROXY] Attempting to fetch key: ${key}`);

        // Try to get from R2 bucket directly (FASTER than HTTP fetch)
        let object = null;
        try {
            object = await c.env.R2.get(key);
        } catch (r2Error) {
            console.log(`[PROXY] Direct R2 access failed, falling back to HTTP: ${r2Error}`);
        }

        if (object) {
            const headers = new Headers();
            headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
            headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            headers.set('CDN-Cache-Control', 'max-age=31536000');
            headers.set('Vary', 'Accept-Encoding');
            headers.set('Access-Control-Allow-Origin', '*');
            headers.set('X-Cache-Status', 'HIT-R2');

            // ETag for conditional requests (browser can skip download if unchanged)
            headers.set('ETag', `"${object.etag}"`);

            // Content-Length for better loading indicators
            headers.set('Content-Length', String(object.size));

            return new Response(object.body, { headers });
        }

        // Fallback: Fetch via HTTP if direct R2 access fails
        console.log(`[PROXY] Fallback to HTTP fetch for: ${imageUrl}`);
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Tamuu-Proxy/1.0',
            },
        });

        if (!response.ok) {
            console.error(`[PROXY] HTTP fetch failed: ${response.status} ${response.statusText}`);
            return c.json({ error: `Failed to fetch image: ${response.status}` }, 500);
        }

        const fetchedContentType = response.headers.get('content-type') || 'image/jpeg';
        const body = await response.arrayBuffer();

        return new Response(body, {
            headers: {
                'Content-Type': fetchedContentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'CDN-Cache-Control': 'max-age=31536000',
                'Vary': 'Accept-Encoding',
                'Access-Control-Allow-Origin': '*',
                'X-Cache-Status': 'HIT-FETCH',
            },
        });
    } catch (error) {
        console.error('[PROXY] Error:', error);
        return c.json({
            error: 'Proxy failed',
            details: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

// ============================================
// GET /api/upload/info/* - Get image metadata
// ============================================
uploadRouter.get('/info/*', async (c) => {
    const key = c.req.param('*');

    if (!key) {
        return c.json({ error: 'Missing key' }, 400);
    }

    try {
        const object = await c.env.R2.head(key);

        if (!object) {
            return c.json({ error: 'Image not found' }, 404);
        }

        return c.json({
            key,
            size: object.size,
            contentType: object.httpMetadata?.contentType,
            uploaded: object.uploaded,
            etag: object.etag,
            customMetadata: object.customMetadata,
        });
    } catch (error) {
        console.error('Info error:', error);
        return c.json({ error: 'Failed to get info' }, 500);
    }
});

// ============================================
// DELETE /api/upload/* - Delete file from R2
// Used for cleanup when elements are deleted
// ============================================
uploadRouter.delete('/*', async (c) => {
    const key = c.req.param('*');

    if (!key) {
        return c.json({ error: 'Missing key' }, 400);
    }

    try {
        // Check if file exists
        const exists = await c.env.R2.head(key);
        if (!exists) {
            // File doesn't exist, but that's okay for cleanup
            return c.json({
                success: true,
                deleted: key,
                message: 'File not found (already deleted)',
            });
        }

        // Delete from R2
        await c.env.R2.delete(key);
        console.log(`🗑️ Deleted from R2: ${key}`);

        return c.json({
            success: true,
            deleted: key,
            message: 'File deleted successfully',
        });
    } catch (error) {
        console.error('Delete error:', error);
        return c.json({ error: 'Delete failed' }, 500);
    }
});

// Export helper for use in elements.ts
export { extractR2Key };
