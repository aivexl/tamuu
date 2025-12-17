// R2 domains that need proxying
const R2_DOMAINS = [
    "pub-1e0a9ae6152440268987d00a564a8da5.r2.dev",
    "r2.cloudflarestorage.com",
];

/**
 * Converts an R2 URL to a proxied URL
 *
 * @param url - Original image URL
 * @returns Proxied URL or original if not R2
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return "";

    // Skip data URLs (base64)
    if (url.startsWith("data:")) {
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
            // In the client, we use the relative API path which will be proxied by Vite or Express
            return `/api/proxy-image?url=${encodeURIComponent(url)}`;
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
 * Preload an image URL (useful for critical images)
 */
export function preloadImage(url: string | null | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!url) {
            resolve();
            return;
        }

        const proxiedUrl = getProxiedImageUrl(url);
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
        img.src = proxiedUrl;
    });
}
