import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API Route
 * 
 * Proxies requests to R2 bucket through Next.js server to bypass
 * browser SSL validation issues (ERR_CERT_COMMON_NAME_INVALID).
 * 
 * Usage: /api/proxy-image?url=https://pub-xxx.r2.dev/path/to/image.jpg
 */

// Allowed domains for security
const ALLOWED_DOMAINS = [
    'pub-1e0a9ae6152440268987d00a564a8da5.r2.dev',
    'r2.cloudflarestorage.com',
];

// Cache duration: 1 day
const CACHE_MAX_AGE = 86400;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return NextResponse.json(
                { error: 'Missing url parameter' },
                { status: 400 }
            );
        }

        // Validate URL
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(imageUrl);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        // Security: Only allow whitelisted domains
        const isAllowed = ALLOWED_DOMAINS.some(domain =>
            parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            console.warn('🚫 Blocked proxy request for:', parsedUrl.hostname);
            return NextResponse.json(
                { error: 'Domain not allowed' },
                { status: 403 }
            );
        }

        console.log('🖼️ Proxying image:', imageUrl);

        // In development, the R2 bucket has SSL issues
        // Use a custom HTTPS agent to bypass SSL verification
        let response: Response;

        if (process.env.NODE_ENV === 'development') {
            // Dynamic import for https module (Node.js only)
            const https = await import('https');

            // Create custom agent that ignores SSL errors
            const agent = new https.Agent({
                rejectUnauthorized: false,
            });

            // Use native Node.js https.get for development
            const imageData = await new Promise<Buffer>((resolve, reject) => {
                const req = https.get(imageUrl, { agent }, (res) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }

                    const chunks: Buffer[] = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                    res.on('error', reject);
                });

                req.on('error', reject);
                req.setTimeout(30000, () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
            });

            // Determine content type from URL
            const ext = parsedUrl.pathname.split('.').pop()?.toLowerCase();
            const contentTypeMap: Record<string, string> = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
            };
            const contentType = contentTypeMap[ext || ''] || 'image/jpeg';

            return new NextResponse(new Uint8Array(imageData), {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
                    'Access-Control-Allow-Origin': '*',
                    'X-Proxy-Cache': 'DEV-SSL-BYPASS',
                },
            });
        }

        // Production: Use normal fetch (SSL should work in production)
        response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Next.js Image Proxy',
            },
        });

        if (!response.ok) {
            console.error('❌ Failed to fetch image:', response.status, response.statusText);
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.status}` },
                { status: response.status }
            );
        }

        // Get the image data
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Return proxied image with caching headers
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
                'Access-Control-Allow-Origin': '*',
                'X-Proxy-Cache': 'HIT',
            },
        });

    } catch (error) {
        console.error('💥 Image proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Handle preflight requests
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
