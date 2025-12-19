/**
 * Image Utilities
 * Optimized for 10,000 users/month - FREE TIER
 * 
 * Features:
 * - Proxy URL generation for R2 images
 * - Preload caching (prevents duplicate loads)
 * - Batch preloading for sections
 */

// R2 domains that need proxying
const R2_DOMAINS = [
    "pub-1e0a9ae6152440268987d00a564a8da5.r2.dev",
    "r2.cloudflarestorage.com",
];

// API URL for proxying (uses environment variable or defaults)
// Hardcoded to ensure production uses correct worker
const API_BASE_URL = "https://tamuu-api.shafania57.workers.dev";

// Preload cache - prevents duplicate image loads
const preloadedImages = new Set<string>();
const imageLoadPromises = new Map<string, Promise<void>>();

/**
 * Converts an R2 URL to a proxied URL
 * Returns immediately if already proxied
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return "";

    // Skip data URLs (base64)
    if (url.startsWith("data:")) {
        return url;
    }

    // Skip if already proxied
    if (url.includes('/api/upload/proxy')) {
        return url;
    }

    // Check if it's an R2 URL that needs proxying
    try {
        const parsedUrl = new URL(url);
        const needsProxy = R2_DOMAINS.some(
            (domain) =>
                parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain)
        );

        if (needsProxy) {
            // Use the Workers API for proxying
            return `${API_BASE_URL}/api/upload/proxy?url=${encodeURIComponent(url)}`;
        }
    } catch {
        // Invalid URL, return as-is
    }

    return url;
}

/**
 * Checks if a URL is from R2 storage
 */
export function isR2Url(url: string | null | undefined): boolean {
    if (!url) return false;
    try {
        const parsedUrl = new URL(url);
        return R2_DOMAINS.some(
            (domain) =>
                parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain)
        );
    } catch {
        return false;
    }
}

/**
 * Check if image is already preloaded
 */
export function isPreloaded(url: string | null | undefined): boolean {
    if (!url) return true;
    const proxiedUrl = getProxiedImageUrl(url);
    return preloadedImages.has(proxiedUrl);
}

/**
 * Preload an image URL with caching
 * Returns cached promise if already loading, resolves immediately if already loaded
 */
export function preloadImage(url: string | null | undefined): Promise<void> {
    if (!url) return Promise.resolve();

    const proxiedUrl = getProxiedImageUrl(url);

    // Already preloaded - resolve immediately
    if (preloadedImages.has(proxiedUrl)) {
        return Promise.resolve();
    }

    // Currently loading - return existing promise
    const existingPromise = imageLoadPromises.get(proxiedUrl);
    if (existingPromise) {
        return existingPromise;
    }

    // Start new preload
    const promise = new Promise<void>((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            preloadedImages.add(proxiedUrl);
            imageLoadPromises.delete(proxiedUrl);
            resolve();
        };

        img.onerror = () => {
            imageLoadPromises.delete(proxiedUrl);
            reject(new Error(`Failed to preload: ${url}`));
        };

        img.src = proxiedUrl;
    });

    imageLoadPromises.set(proxiedUrl, promise);
    return promise;
}

/**
 * Batch preload multiple images
 * Useful for preloading all images in a section
 */
export async function preloadImages(urls: (string | null | undefined)[]): Promise<void> {
    const validUrls = urls.filter((url): url is string => !!url && !isPreloaded(url));

    if (validUrls.length === 0) return;

    // Load in parallel, but don't fail if some images fail
    await Promise.allSettled(validUrls.map(preloadImage));
}

/**
 * Preload critical images for a section
 * Prioritizes background and first few elements
 */
export async function preloadSectionImages(
    backgroundUrl?: string | null,
    elementUrls?: (string | null | undefined)[]
): Promise<void> {
    // Load background first (critical)
    if (backgroundUrl) {
        await preloadImage(backgroundUrl).catch(() => {
            console.warn('Failed to preload background:', backgroundUrl);
        });
    }

    // Load element images (first 3 only for initial view)
    if (elementUrls?.length) {
        const priorityUrls = elementUrls.slice(0, 3);
        await preloadImages(priorityUrls);
    }
}

/**
 * Get preload statistics
 */
export function getPreloadStats(): { loaded: number; loading: number } {
    return {
        loaded: preloadedImages.size,
        loading: imageLoadPromises.size,
    };
}

/**
 * Clear preload cache (useful for memory management)
 */
export function clearPreloadCache(): void {
    preloadedImages.clear();
    imageLoadPromises.clear();
}
