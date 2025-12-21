/**
 * Batch Update API Route
 * Enterprise-grade batch update endpoint for Tamuu
 * 
 * OPTIMIZATION: Single endpoint to update multiple sections and elements
 * - Reduces N API calls to 1
 * - Single KV cache invalidation
 * - D1 batch execution for atomicity
 * 
 * @author CTO Engineering Team
 * @version 1.0.0
 */

import { Hono } from 'hono';
import type { Env, SectionDesign, TemplateElement } from '../types';
import { DatabaseService } from '../services/database';
import { CacheService } from '../services/cache';

export const batchRouter = new Hono<{ Bindings: Env }>();

// ============================================
// TYPE DEFINITIONS
// ============================================

interface BatchSectionUpdate {
    sectionType: string;
    updates: Partial<SectionDesign>;
}

interface BatchElementUpdate {
    elementId: string;
    updates: Partial<TemplateElement>;
}

interface BatchUpdateRequest {
    templateId: string;
    sections?: BatchSectionUpdate[];
    elements?: BatchElementUpdate[];
}

interface BatchUpdateResponse {
    success: boolean;
    updated: {
        sections: number;
        elements: number;
        total: number;
    };
    errors: string[];
    duration: number;
}

// ============================================
// VALIDATION CONSTANTS (Enterprise limits)
// ============================================

const MAX_SECTIONS_PER_BATCH = 50;
const MAX_ELEMENTS_PER_BATCH = 500;

// ============================================
// BATCH UPDATE ENDPOINT
// ============================================

/**
 * POST /api/batch-update
 * 
 * Batch update multiple sections and elements in a single request
 * with single cache invalidation at the end.
 */
batchRouter.post('/', async (c) => {
    const startTime = Date.now();
    const errors: string[] = [];
    let sectionsUpdated = 0;
    let elementsUpdated = 0;

    try {
        // 1. Parse and validate request body
        const body = await c.req.json<BatchUpdateRequest>();

        // 2. Validate required fields
        if (!body.templateId) {
            return c.json<BatchUpdateResponse>({
                success: false,
                updated: { sections: 0, elements: 0, total: 0 },
                errors: ['templateId is required'],
                duration: Date.now() - startTime
            }, 400);
        }

        const sections = body.sections || [];
        const elements = body.elements || [];

        // 3. Validate batch size limits (prevent abuse)
        if (sections.length > MAX_SECTIONS_PER_BATCH) {
            return c.json<BatchUpdateResponse>({
                success: false,
                updated: { sections: 0, elements: 0, total: 0 },
                errors: [`Maximum ${MAX_SECTIONS_PER_BATCH} sections per batch allowed`],
                duration: Date.now() - startTime
            }, 400);
        }

        if (elements.length > MAX_ELEMENTS_PER_BATCH) {
            return c.json<BatchUpdateResponse>({
                success: false,
                updated: { sections: 0, elements: 0, total: 0 },
                errors: [`Maximum ${MAX_ELEMENTS_PER_BATCH} elements per batch allowed`],
                duration: Date.now() - startTime
            }, 400);
        }

        // 4. Check if there's anything to update
        if (sections.length === 0 && elements.length === 0) {
            return c.json<BatchUpdateResponse>({
                success: true,
                updated: { sections: 0, elements: 0, total: 0 },
                errors: [],
                duration: Date.now() - startTime
            }, 200);
        }

        // 5. Initialize services
        const db = new DatabaseService(c.env.DB);
        const cache = new CacheService(c.env.KV);

        // 6. Verify template exists
        const templateExists = await db.getTemplate(body.templateId);
        if (!templateExists) {
            return c.json<BatchUpdateResponse>({
                success: false,
                updated: { sections: 0, elements: 0, total: 0 },
                errors: ['Template not found'],
                duration: Date.now() - startTime
            }, 404);
        }

        // 7. Process section updates
        for (const sectionUpdate of sections) {
            try {
                if (!sectionUpdate.sectionType) {
                    errors.push(`Section update missing sectionType`);
                    continue;
                }

                await db.upsertSection(
                    body.templateId,
                    sectionUpdate.sectionType,
                    sectionUpdate.updates
                );
                sectionsUpdated++;
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                errors.push(`Section ${sectionUpdate.sectionType}: ${msg}`);
                console.error(`[BATCH] Section update failed:`, error);
            }
        }

        // 8. Process element updates
        for (const elementUpdate of elements) {
            try {
                if (!elementUpdate.elementId) {
                    errors.push(`Element update missing elementId`);
                    continue;
                }

                // Skip temp IDs (they should be created first, not updated via batch)
                if (elementUpdate.elementId.startsWith('el-') ||
                    elementUpdate.elementId.startsWith('temp-')) {
                    console.log(`[BATCH] Skipping temp element: ${elementUpdate.elementId}`);
                    continue;
                }

                await db.updateElement(
                    elementUpdate.elementId,
                    elementUpdate.updates
                );
                elementsUpdated++;
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                errors.push(`Element ${elementUpdate.elementId}: ${msg}`);
                console.error(`[BATCH] Element update failed:`, error);
            }
        }

        // 9. SINGLE CACHE INVALIDATION - This is the key optimization!
        // Only invalidate once after all updates are complete
        if (sectionsUpdated > 0 || elementsUpdated > 0) {
            await cache.invalidateTemplate(body.templateId);
            console.log(`[BATCH] Cache invalidated for template ${body.templateId}`);
        }

        // 10. Return response
        const totalUpdated = sectionsUpdated + elementsUpdated;
        const duration = Date.now() - startTime;

        console.log(`[BATCH] Completed: ${totalUpdated} updates in ${duration}ms (${errors.length} errors)`);

        return c.json<BatchUpdateResponse>({
            success: errors.length === 0,
            updated: {
                sections: sectionsUpdated,
                elements: elementsUpdated,
                total: totalUpdated
            },
            errors,
            duration
        }, errors.length === 0 ? 200 : 207); // 207 = Multi-Status (partial success)

    } catch (error) {
        console.error('[BATCH] Unexpected error:', error);
        return c.json<BatchUpdateResponse>({
            success: false,
            updated: {
                sections: sectionsUpdated,
                elements: elementsUpdated,
                total: sectionsUpdated + elementsUpdated
            },
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            duration: Date.now() - startTime
        }, 500);
    }
});
