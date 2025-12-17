'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';

/**
 * Image Utilities for R2 Storage
 * 
 * Handles image loading with proxy fallback for SSL issues.
 */

// R2 domains that need proxying
const R2_DOMAINS = [
    'pub-1e0a9ae6152440268987d00a564a8da5.r2.dev',
    'r2.cloudflarestorage.com',
];

/**
 * Converts an R2 URL to a proxied URL
 * 
 * @param url - Original image URL
 * @returns Proxied URL or original if not R2
 */
export function getProxiedImageUrl(url: string | null | undefined): string {
    if (!url) return '';

    // Skip data URLs (base64)
    if (url.startsWith('data:')) {
        return url;
    }

    // Check if it's an R2 URL that needs proxying
    try {
        const parsedUrl = new URL(url);
        const needsProxy = R2_DOMAINS.some(domain =>
            parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
        );

        if (needsProxy) {
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
        return R2_DOMAINS.some(domain =>
            parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
        );
    } catch {
        return false;
    }
}

/**
 * Props for SafeImage component
 */
interface SafeImageProps {
    src: string | null | undefined;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
    fill?: boolean;
    priority?: boolean;
    onLoad?: () => void;
    onError?: () => void;
    fallbackSrc?: string;
    useNextImage?: boolean;
}

/**
 * SafeImage Component
 * 
 * A robust image component that:
 * - Automatically proxies R2 URLs
 * - Shows fallback on error
 * - Handles loading states
 */
export function SafeImage({
    src,
    alt,
    width,
    height,
    className = '',
    style,
    fill = false,
    priority = false,
    onLoad,
    onError,
    fallbackSrc = '/placeholder-image.svg',
    useNextImage = false,
}: SafeImageProps) {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Get the proxied URL
    const imageUrl = hasError ? fallbackSrc : getProxiedImageUrl(src);

    const handleLoad = useCallback(() => {
        setIsLoading(false);
        onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
        console.warn('⚠️ SafeImage failed to load:', src);
        setHasError(true);
        setIsLoading(false);
        onError?.();
    }, [src, onError]);

    // No source provided
    if (!src && !hasError) {
        return (
            <div
                className={`bg-slate-200 flex items-center justify-center ${className}`}
                style={{ width, height, ...style }}
            >
                <span className="text-slate-400 text-xs">No Image</span>
            </div>
        );
    }

    // Use Next.js Image component
    if (useNextImage) {
        return (
            <div className={`relative ${className}`} style={style}>
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                        <span className="text-slate-400 text-xs">Loading...</span>
                    </div>
                )}
                <Image
                    src={imageUrl}
                    alt={alt}
                    width={fill ? undefined : width}
                    height={fill ? undefined : height}
                    fill={fill}
                    priority={priority}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity'}
                    unoptimized // Skip Next.js optimization for proxied images
                />
            </div>
        );
    }

    // Use standard img tag (more reliable for dynamic content)
    return (
        <div className={`relative ${className}`} style={style}>
            {isLoading && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                    <span className="text-slate-400 text-xs">Loading...</span>
                </div>
            )}
            <img
                src={imageUrl}
                alt={alt}
                width={width}
                height={height}
                onLoad={handleLoad}
                onError={handleError}
                className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity w-full h-full object-cover`}
                loading={priority ? 'eager' : 'lazy'}
            />
        </div>
    );
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
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
        img.src = proxiedUrl;
    });
}

export default SafeImage;
