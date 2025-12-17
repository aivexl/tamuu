/**
 * KV Cache Service
 * Enterprise-grade caching for Tamuu API
 */

import type { Env, TemplateResponse } from '../types';

// Cache TTL values (in seconds)
const CACHE_TTL = {
    TEMPLATE: 300,      // 5 minutes for single template
    TEMPLATES_LIST: 60,  // 1 minute for templates list
    RSVP: 30,           // 30 seconds for RSVP data (needs to be fresh)
} as const;

// Cache key prefixes
const CACHE_KEYS = {
    TEMPLATE: 'template:',
    TEMPLATES_LIST: 'templates:list',
    RSVP: 'rsvp:',
} as const;

/**
 * Cache Service Class
 */
export class CacheService {
    constructor(private kv: KVNamespace) { }

    // ============================================
    // TEMPLATE CACHING
    // ============================================

    /**
     * Get cached template
     */
    async getTemplate(id: string): Promise<TemplateResponse | null> {
        try {
            const cached = await this.kv.get(`${CACHE_KEYS.TEMPLATE}${id}`, 'json');
            return cached as TemplateResponse | null;
        } catch {
            return null;
        }
    }

    /**
     * Cache template
     */
    async setTemplate(id: string, template: TemplateResponse): Promise<void> {
        try {
            await this.kv.put(
                `${CACHE_KEYS.TEMPLATE}${id}`,
                JSON.stringify(template),
                { expirationTtl: CACHE_TTL.TEMPLATE }
            );
        } catch (err) {
            console.error('Failed to cache template:', err);
        }
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
    async getStats(): Promise<{ keys: number; prefixes: Record<string, number> }> {
        try {
            const list = await this.kv.list();
            const prefixes: Record<string, number> = {};

            list.keys.forEach((key) => {
                const prefix = key.name.split(':')[0] + ':';
                prefixes[prefix] = (prefixes[prefix] || 0) + 1;
            });

            return {
                keys: list.keys.length,
                prefixes,
            };
        } catch {
            return { keys: 0, prefixes: {} };
        }
    }
}
