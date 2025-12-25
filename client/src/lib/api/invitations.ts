/**
 * Invitations API Service
 * Client-side service for user onboarding and invitation management
 */

import type { InvitationCategory } from '@/lib/types';

import { supabase } from '@/lib/supabase';

// API Base URL - matches cloudflare-api.ts
const API_BASE_URL = "https://tamuu-api.shafania57.workers.dev";

// Simple request helper with auth
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = (errorData as any).message || (errorData as any).error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(String(message));
    }

    return response.json();
}

export interface SlugCheckResult {
    available: boolean;
    reason: 'invalid_format' | 'reserved' | 'taken' | null;
    message: string;
}

export interface CreateInvitationPayload {
    templateId: string;
    slug: string;
    name?: string;
    category?: InvitationCategory;
}

// Template response type (simplified for this module)
export interface TemplateResponse {
    id: string;
    name: string;
    slug?: string | null;
    category?: InvitationCategory;
    thumbnail?: string;
    status: string;
    userId?: string | null;
    sourceTemplateId?: string | null;
    invitationMessage?: string;
    createdAt: string;
    updatedAt: string;
}

export const invitationsApi = {
    /**
     * Check if a slug is available
     */
    async checkSlug(slug: string): Promise<SlugCheckResult> {
        return request<SlugCheckResult>(`/api/my-invitations/check-slug/${encodeURIComponent(slug)}`);
    },

    /**
     * Get current user's invitations
     */
    async getMyInvitations(): Promise<TemplateResponse[]> {
        const res = await request<{ invitations: TemplateResponse[] }>('/api/my-invitations/my');
        return res.invitations;
    },

    /**
     * Create a new invitation (clone template for user)
     */
    async createInvitation(payload: CreateInvitationPayload): Promise<TemplateResponse> {
        const res = await request<{ invitation: TemplateResponse }>('/api/my-invitations', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res.invitation;
    },

    /**
     * Get public invitation by slug
     */
    async getPublicInvitation(slug: string): Promise<TemplateResponse> {
        return request<TemplateResponse>(`/api/my-invitations/public/${encodeURIComponent(slug)}`);
    },

    /**
     * Update user's invitation
     */
    async updateInvitation(id: string, updates: Partial<TemplateResponse>): Promise<void> {
        await request(`/api/my-invitations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    /**
     * Get a specific invitation by ID (protected)
     */
    async getInvitation(id: string): Promise<TemplateResponse> {
        const res = await request<{ invitation: TemplateResponse }>(`/api/my-invitations/${id}`);
        return res.invitation;
    },

    /**
     * Get a specific invitation by slug (protected)
     */
    async getInvitationBySlug(slug: string): Promise<TemplateResponse> {
        const res = await request<{ invitation: TemplateResponse }>(`/api/my-invitations/by-slug/${encodeURIComponent(slug)}`);
        return res.invitation;
    },

    /**
     * Get master templates for selection
     */
    async getMasterTemplates(category?: InvitationCategory): Promise<TemplateResponse[]> {
        const params = category ? `?category=${category}` : '';
        const res = await request<{ templates: TemplateResponse[] }>(`/api/invitations/masters${params}`);
        return res.templates;
    }
};
