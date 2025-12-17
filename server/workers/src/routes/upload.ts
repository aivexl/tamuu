/**
 * Upload API Routes
 * R2 file upload and image proxy
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

// POST /api/upload - Upload file to R2
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

            // Upload to R2
            const arrayBuffer = await file.arrayBuffer();
            await c.env.R2.put(key, arrayBuffer, {
                httpMetadata: {
                    contentType: file.type,
                    cacheControl: 'public, max-age=31536000, immutable',
                },
            });

            const publicUrl = `${c.env.R2_PUBLIC_URL}/${key}`;

            return c.json({
                success: true,
                url: publicUrl,
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

// GET /api/upload/proxy - Proxy image from R2
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

        // Fetch the image
        const response = await fetch(imageUrl);

        if (!response.ok) {
            return c.json({ error: `Failed to fetch image: ${response.status}` }, response.status);
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const body = await response.arrayBuffer();

        return new Response(body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800',
                'Access-Control-Allow-Origin': '*',
                'X-Proxy-Cache': 'HIT',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return c.json({ error: 'Proxy failed' }, 500);
    }
});
