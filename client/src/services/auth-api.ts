/**
 * Auth API Service - Supabase Edition
 * Uses Supabase Auth for reliable session management
 */

import { supabase } from '@/lib/supabase';
import type { UserResponse } from '@/lib/types';

// ============================================
// AUTH TYPES
// ============================================

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name?: string;
    phone?: string;
}

export interface AuthResponse {
    user: UserResponse;
    token: string;
    message?: string;
}

export interface ProfileUpdateRequest {
    name?: string;
    phone?: string;
    avatarUrl?: string;
}

// ============================================
// HELPER: Map Supabase User to App User
// ============================================

function mapSupabaseUser(supabaseUser: any): UserResponse {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        phone: supabaseUser.user_metadata?.phone || null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        plan: supabaseUser.user_metadata?.plan || 'free',
        role: supabaseUser.user_metadata?.role || 'user',
        planExpiresAt: supabaseUser.user_metadata?.plan_expires_at || null,
        isVerified: supabaseUser.email_confirmed_at !== null,
        createdAt: supabaseUser.created_at,
        updatedAt: supabaseUser.updated_at,
    };
}

// ============================================
// AUTH API FUNCTIONS
// ============================================

export async function register(data: RegisterRequest): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                name: data.name,
                phone: data.phone,
                role: 'user',
                plan: 'free',
            },
        },
    });

    if (error) throw new Error(error.message);
    if (!authData.user) throw new Error('Registration failed');

    return {
        user: mapSupabaseUser(authData.user),
        token: authData.session?.access_token || '',
        message: 'Registration successful. Please verify your email.',
    };
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
    });

    if (error) throw new Error(error.message);
    if (!authData.user) throw new Error('Login failed');

    return {
        user: mapSupabaseUser(authData.user),
        token: authData.session?.access_token || '',
    };
}

export async function logout(): Promise<{ success: boolean }> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    return { success: true };
}

export async function getCurrentUser(): Promise<{ user: UserResponse }> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        throw new Error('Not authenticated');
    }

    return { user: mapSupabaseUser(user) };
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<{ user: UserResponse }> {
    const { data: authData, error } = await supabase.auth.updateUser({
        data: {
            name: data.name,
            phone: data.phone,
            avatar_url: data.avatarUrl,
        },
    });

    if (error) throw new Error(error.message);
    if (!authData.user) throw new Error('Update failed');

    return { user: mapSupabaseUser(authData.user) };
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw new Error(error.message);
    return { message: 'Password reset email sent' };
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Note: Supabase handles token verification automatically via the URL
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) throw new Error(error.message);
    return { message: 'Password reset successful' };
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
    // Supabase handles email verification automatically via URL parameters
    return { message: 'Email verification handled by Supabase' };
}

// ============================================
// SESSION HELPERS (for compatibility)
// ============================================

export function getToken(): string | null {
    // Supabase handles token storage internally
    return null;
}

export function setToken(_token: string): void {
    // Supabase handles token storage internally
}

export function clearToken(): void {
    // Supabase handles token clearing via signOut
}
