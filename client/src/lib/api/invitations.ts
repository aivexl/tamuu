/**
 * Invitations API Service
 * Client-side service for user onboarding and invitation management
 */

import { apiClient } from './cloudflare';
import type { InvitationCategory, TemplateResponse } from '@/lib/types';

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

export const invitationsApi = {
    /**
     * Check if a slug is available
     */
    async checkSlug(slug: string): Promise<SlugCheckResult> {
        const res = await apiClient.get(`/invitations/check-slug/${encodeURIComponent(slug)}`);
        return res.data as SlugCheckResult;
    },

    /**
     * Get current user's invitations
     */
    async getMyInvitations(): Promise<TemplateResponse[]> {
        const res = await apiClient.get('/invitations/my');
        return (res.data as { invitations: TemplateResponse[] }).invitations;
    },

    /**
     * Create a new invitation (clone template for user)
     */
    async createInvitation(payload: CreateInvitationPayload): Promise<TemplateResponse> {
        const res = await apiClient.post('/invitations', payload);
        return (res.data as { invitation: TemplateResponse }).invitation;
    },

    /**
     * Get public invitation by slug
     */
    async getPublicInvitation(slug: string): Promise<TemplateResponse> {
        const res = await apiClient.get(`/invitations/public/${encodeURIComponent(slug)}`);
        return res.data as TemplateResponse;
    },

    /**
     * Update user's invitation
     */
    async updateInvitation(id: string, updates: Partial<TemplateResponse>): Promise<void> {
        await apiClient.put(`/invitations/${id}`, updates);
    },

    /**
     * Get master templates for selection
     */
    async getMasterTemplates(category?: InvitationCategory): Promise<TemplateResponse[]> {
        const params = category ? `?category=${category}` : '';
        const res = await apiClient.get(`/invitations/masters${params}`);
        return (res.data as { templates: TemplateResponse[] }).templates;
    }
};
