/**
 * KV Cache Service
 * Enterprise-grade caching for Tamuu API
 * OPTIMIZED FOR 10,000 USERS/MONTH - FREE TIER
 * 
 * Features:
 * - Stale-while-revalidate pattern
 * - Status-aware TTL (published vs draft)
 * - Public view caching (48 hours for guests)
 * - Cache hit tracking
 */

import type { TemplateResponse } from '../types';

// Cache TTL values (in seconds) - OPTIMIZED FOR FREE TIER
const CACHE_TTL = {
    // Published templates - aggressive caching (rarely change after publish)
    TEMPLATE_PUBLISHED: 86400,  // 24 hours

    // Draft templates - shorter for editor experience
    TEMPLATE_DRAFT: 60,         // 1 minute

    // Templates list - medium
    TEMPLATES_LIST: 600,        // 10 minutes

    // RSVP data - shorter for freshness
    RSVP: 120,                  // 2 minutes

    // Public invitation view - very aggressive (guests see cached version)
    PUBLIC_VIEW: 172800,        // 48 hours

    // Stale time - how long to serve stale data while revalidating in background
    STALE_WHILE_REVALIDATE: 86400,  // 24 hours stale is acceptable
} as const;

// Cache key prefixes
const CACHE_KEYS = {
    TEMPLATE: 'template:',
    TEMPLATE_PUBLIC: 'public:',
    TEMPLATES_LIST: 'templates:list',
    RSVP: 'rsvp:',
    STATS: 'stats:',
} as const;

// Metadata interface for stale-while-revalidate
interface CacheMetadata {
    cachedAt: number;
    status?: 'draft' | 'published';
    version?: number;
}

// Cache result with SWR info
interface CacheResultWithSWR<T> {
    value: T | null;
    isStale: boolean;
    needsRevalidation: boolean;
}

/**
 * Cache Service Class
 */
export class CacheService {
    constructor(private kv: KVNamespace) { }

    // ============================================
    // STALE-WHILE-REVALIDATE PATTERN
    // ============================================

    /**
     * Get with stale-while-revalidate support
     * Returns data immediately (even if stale), indicates if revalidation needed
     */
    async getWithSWR<T>(key: string, freshTtl: number): Promise<CacheResultWithSWR<T>> {
        try {
            const { value, metadata } = await this.kv.getWithMetadata<T, CacheMetadata>(key, 'json');

            if (!value) {
                return { value: null, isStale: false, needsRevalidation: false };
            }

            const cachedAt = metadata?.cachedAt || 0;
            const age = (Date.now() - cachedAt) / 1000;
            const isStale = age > freshTtl;
            const needsRevalidation = isStale && age < CACHE_TTL.STALE_WHILE_REVALIDATE;

            return { value, isStale, needsRevalidation };
        } catch {
            return { value: null, isStale: false, needsRevalidation: false };
        }
    }

    /**
     * Set with metadata for SWR tracking
     */
    async setWithMetadata<T>(
        key: string,
        value: T,
        ttl: number,
        metadata: Partial<CacheMetadata> = {}
    ): Promise<void> {
        try {
            await this.kv.put(key, JSON.stringify(value), {
                expirationTtl: ttl + CACHE_TTL.STALE_WHILE_REVALIDATE, // Total TTL includes stale period
                metadata: {
                    cachedAt: Date.now(),
                    ...metadata,
                },
            });
        } catch (err) {
            console.error('Cache set failed:', err);
        }
    }

    // ============================================
    // TEMPLATE CACHING (OPTIMIZED WITH SWR)
    // ============================================

    /**
     * Get cached template with SWR support
     */
    async getTemplate(id: string): Promise<CacheResultWithSWR<TemplateResponse>> {
        const result = await this.getWithSWR<TemplateResponse>(
            `${CACHE_KEYS.TEMPLATE}${id}`,
            CACHE_TTL.TEMPLATE_DRAFT // Use shorter TTL for freshness check
        );
        return {
            value: result.value,
            isStale: result.isStale,
            needsRevalidation: result.needsRevalidation,
        };
    }

    /**
     * Cache template with status-aware TTL
     * Published templates get longer TTL (24h) vs draft (1 min)
     */
    async setTemplate(id: string, template: TemplateResponse): Promise<void> {
        const ttl = template.status === 'published'
            ? CACHE_TTL.TEMPLATE_PUBLISHED
            : CACHE_TTL.TEMPLATE_DRAFT;

        await this.setWithMetadata(
            `${CACHE_KEYS.TEMPLATE}${id}`,
            template,
            ttl,
            { status: template.status as 'draft' | 'published' }
        );
    }

    /**
     * Invalidate template cache
     */
    async invalidateTemplate(id: string): Promise<void> {
        try {
            await this.kv.delete(`${CACHE_KEYS.TEMPLATE}${id}`);
            // Also invalidate templates list
            await this.invalidateTemplatesList();
        } catch (err) {
            console.error('Failed to invalidate template cache:', err);
        }
    }

    // ============================================
    // PUBLIC VIEW CACHING (ULTRA AGGRESSIVE - 48 HOURS)
    // For guest access - they rarely need fresh data
    // ============================================

    /**
     * Get cached public invitation view
     * Used by guests - longest cache TTL
     */
    async getPublicView(templateId: string): Promise<TemplateResponse | null> {
        try {
            const cached = await this.kv.get(`${CACHE_KEYS.TEMPLATE_PUBLIC}${templateId}`, 'json');
            return cached as TemplateResponse | null;
        } catch {
            return null;
        }
    }

    /**
     * Cache public view - 48 hours TTL
     */
    async setPublicView(templateId: string, template: TemplateResponse): Promise<void> {
        try {
            await this.kv.put(
                `${CACHE_KEYS.TEMPLATE_PUBLIC}${templateId}`,
                JSON.stringify(template),
                { expirationTtl: CACHE_TTL.PUBLIC_VIEW }
            );
        } catch (err) {
            console.error('Failed to cache public view:', err);
        }
    }

    /**
     * Invalidate public view when template is updated
     */
    async invalidatePublicView(templateId: string): Promise<void> {
        try {
            await this.kv.delete(`${CACHE_KEYS.TEMPLATE_PUBLIC}${templateId}`);
        } catch (err) {
            console.error('Failed to invalidate public view:', err);
        }
    }

    // ============================================
    // TEMPLATES LIST CACHING
    // ============================================

    /**
     * Get cached templates list
     */
    async getTemplatesList(): Promise<TemplateResponse[] | null> {
        try {
            const cached = await this.kv.get(CACHE_KEYS.TEMPLATES_LIST, 'json');
            return cached as TemplateResponse[] | null;
        } catch {
            return null;
        }
    }

    /**
     * Cache templates list
     */
    async setTemplatesList(templates: TemplateResponse[]): Promise<void> {
        try {
            await this.kv.put(
                CACHE_KEYS.TEMPLATES_LIST,
                JSON.stringify(templates),
                { expirationTtl: CACHE_TTL.TEMPLATES_LIST }
            );
        } catch (err) {
            console.error('Failed to cache templates list:', err);
        }
    }

    /**
     * Invalidate templates list cache
     */
    async invalidateTemplatesList(): Promise<void> {
        try {
            await this.kv.delete(CACHE_KEYS.TEMPLATES_LIST);
        } catch (err) {
            console.error('Failed to invalidate templates list cache:', err);
        }
    }

    // ============================================
    // RSVP CACHING
    // ============================================

    /**
     * Get cached RSVP responses
     */
    async getRSVPResponses(templateId: string): Promise<unknown[] | null> {
        try {
            const cached = await this.kv.get(`${CACHE_KEYS.RSVP}${templateId}`, 'json');
            return cached as unknown[] | null;
        } catch {
            return null;
        }
    }

    /**
     * Cache RSVP responses
     */
    async setRSVPResponses(templateId: string, responses: unknown[]): Promise<void> {
        try {
            await this.kv.put(
                `${CACHE_KEYS.RSVP}${templateId}`,
                JSON.stringify(responses),
                { expirationTtl: CACHE_TTL.RSVP }
            );
        } catch (err) {
            console.error('Failed to cache RSVP responses:', err);
        }
    }

    /**
     * Invalidate RSVP cache
     */
    async invalidateRSVP(templateId: string): Promise<void> {
        try {
            await this.kv.delete(`${CACHE_KEYS.RSVP}${templateId}`);
        } catch (err) {
            console.error('Failed to invalidate RSVP cache:', err);
        }
    }

    // ============================================
    // CACHE STATS & MONITORING
    // ============================================

    /**
     * Track cache hit/miss (fire and forget)
     */
    async trackCacheHit(hit: boolean): Promise<void> {
        const key = hit ? `${CACHE_KEYS.STATS}hits` : `${CACHE_KEYS.STATS}misses`;
        try {
            const current = await this.kv.get(key) || '0';
            await this.kv.put(key, String(parseInt(current) + 1), {
                expirationTtl: 86400, // Reset daily
            });
        } catch {
            // Ignore errors in stats tracking - don't block response
        }
    }

    /**
     * Get cache hit rate
     */
    async getCacheHitRate(): Promise<{ hits: number; misses: number; rate: number }> {
        try {
            const hits = parseInt(await this.kv.get(`${CACHE_KEYS.STATS}hits`) || '0');
            const misses = parseInt(await this.kv.get(`${CACHE_KEYS.STATS}misses`) || '0');
            const total = hits + misses;
            const rate = total > 0 ? (hits / total) * 100 : 0;

            return { hits, misses, rate: Math.round(rate) };
        } catch {
            return { hits: 0, misses: 0, rate: 0 };
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Clear all caches (for development/debugging)
     */
    async clearAll(): Promise<void> {
        try {
            const list = await this.kv.list();
            await Promise.all(list.keys.map((key) => this.kv.delete(key.name)));
        } catch (err) {
            console.error('Failed to clear all caches:', err);
        }
    }

    /**
     * Get cache stats
     */
    async getStats(): Promise<{ keys: number; prefixes: Record<string, number>; hitRate: number }> {
        try {
            const list = await this.kv.list();
            const prefixes: Record<string, number> = {};

            list.keys.forEach((key) => {
                const prefix = key.name.split(':')[0] + ':';
                prefixes[prefix] = (prefixes[prefix] || 0) + 1;
            });

            const { rate } = await this.getCacheHitRate();

            return {
                keys: list.keys.length,
                prefixes,
                hitRate: rate,
            };
        } catch {
            return { keys: 0, prefixes: {}, hitRate: 0 };
        }
    }
}
