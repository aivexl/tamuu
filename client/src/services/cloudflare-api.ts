/**
 * Cloudflare API Service
 * Client SDK for Tamuu Cloudflare Workers API
 * Replaces Supabase client
 */

import type {
    Template,
    TemplateElement,
    RSVPResponse,
    SectionDesign,
} from "@/lib/types";

// API Base URL - uses environment variable or defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://tamuu-api.workers.dev";

// ============================================
// HTTP CLIENT WITH RETRY
// ============================================

interface RequestOptions extends RequestInit {
    maxRetries?: number;
    baseDelayMs?: number;
}

async function request<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<T> {
    const { maxRetries = 3, baseDelayMs = 100, ...fetchOptions } = options;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...fetchOptions,
                headers: {
                    "Content-Type": "application/json",
                    ...fetchOptions.headers,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    (errorData as { error?: string }).error ||
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            return response.json();
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(
                `⚠️ API request attempt ${attempt}/${maxRetries} failed:`,
                lastError.message
            );

            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error("Request failed after retries");
}

// ============================================
// TEMPLATES API
// ============================================

export async function getTemplates(): Promise<Template[]> {
    return request<Template[]>("/api/templates");
}

export async function getTemplate(id: string): Promise<Template | null> {
    try {
        return await request<Template>(`/api/templates/${id}`);
    } catch (error) {
        console.error("Failed to fetch template:", error);
        return null;
    }
}

export async function createTemplate(
    template: Partial<Template>
): Promise<Template | null> {
    if (!template.name) throw new Error("Template name is required");

    return request<Template>("/api/templates", {
        method: "POST",
        body: JSON.stringify(template),
    });
}

export async function updateTemplate(
    id: string,
    updates: Partial<Template>
): Promise<void> {
    await request(`/api/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
    });
}

export async function deleteTemplate(id: string): Promise<void> {
    await request(`/api/templates/${id}`, {
        method: "DELETE",
    });
}

// ============================================
// SECTIONS API
// ============================================

export async function updateSection(
    templateId: string,
    sectionType: string,
    updates: Partial<SectionDesign>
): Promise<void> {
    await request(`/api/sections/${templateId}/${sectionType}`, {
        method: "PUT",
        body: JSON.stringify(updates),
    });
}

export async function deleteSection(
    templateId: string,
    sectionType: string
): Promise<void> {
    await request(`/api/sections/${templateId}/${sectionType}`, {
        method: "DELETE",
    });
}

// ============================================
// ELEMENTS API
// ============================================

export async function createElement(
    templateId: string,
    sectionType: string,
    element: TemplateElement
): Promise<TemplateElement> {
    return request<TemplateElement>(
        `/api/elements/${templateId}/${sectionType}`,
        {
            method: "POST",
            body: JSON.stringify(element),
        }
    );
}

export async function updateElement(
    elementId: string,
    updates: Partial<TemplateElement>,
    templateId?: string
): Promise<void> {
    await request(`/api/elements/${elementId}`, {
        method: "PUT",
        body: JSON.stringify({
            ...updates,
            _templateId: templateId, // For cache invalidation
        }),
    });
}

export async function deleteElement(
    elementId: string,
    templateId?: string
): Promise<void> {
    const query = templateId ? `?templateId=${templateId}` : "";
    await request(`/api/elements/${elementId}${query}`, {
        method: "DELETE",
    });
}

// ============================================
// RSVP API
// ============================================

export async function submitRSVP(
    response: Omit<RSVPResponse, "id" | "createdAt">
): Promise<RSVPResponse> {
    return request<RSVPResponse>(`/api/rsvp/${response.templateId}`, {
        method: "POST",
        body: JSON.stringify(response),
    });
}

export async function getRSVPResponses(
    templateId: string
): Promise<RSVPResponse[]> {
    return request<RSVPResponse[]>(`/api/rsvp/${templateId}`);
}

// ============================================
// UPLOAD API (WITH AUTO-COMPRESSION)
// ============================================

import { compressImageToFile, shouldCompress } from "@/lib/image-compress";

interface UploadResult {
    success: boolean;
    url: string;
    directUrl?: string;
    key: string;
    filename: string;
    size: number;
    type: string;
    // Compression info
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: number;
}

export async function uploadFile(file: File): Promise<UploadResult> {
    // Auto-compress large images before upload
    let fileToUpload = file;
    let wasCompressed = false;

    if (shouldCompress(file)) {
        try {
            console.log(`🔄 Compressing ${file.name}...`);
            fileToUpload = await compressImageToFile(file, {
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.85,
                outputType: 'jpeg', // Use JPEG for best compression
            });
            wasCompressed = true;
        } catch (err) {
            console.warn('Compression failed, uploading original:', err);
            fileToUpload = file;
        }
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
            (error as { error?: string }).error || "Upload failed"
        );
    }

    const result = await response.json() as UploadResult;

    // Add compression info to result
    if (wasCompressed) {
        const compressionRatio = Math.round((1 - fileToUpload.size / file.size) * 100);
        console.log(`✅ Upload complete. Compressed ${compressionRatio}% (${formatBytes(file.size)} → ${formatBytes(fileToUpload.size)})`);

        return {
            ...result,
            originalSize: file.size,
            compressedSize: fileToUpload.size,
            compressionRatio,
        };
    }

    return result;
}

// Helper to format bytes
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getProxyImageUrl(originalUrl: string): string {
    return `${API_BASE_URL}/api/upload/proxy?url=${encodeURIComponent(originalUrl)}`;
}

// ============================================
// HEALTH CHECK
// ============================================

interface HealthStatus {
    status: string;
    services?: {
        d1: string;
        kv: string;
        r2: string;
    };
    timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
    return request<HealthStatus>("/health");
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================
// These exports maintain compatibility with the old supabase.ts interface

export {
    getTemplates as fetchTemplates,
    getTemplate as fetchTemplate,
    createTemplate as addTemplate,
    updateTemplate as saveTemplate,
};
