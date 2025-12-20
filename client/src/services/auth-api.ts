/**
 * Auth API Service
 * Client SDK for authentication endpoints
 */

import type { UserResponse } from '@/lib/types';

// Hardcoded to ensure production uses correct worker
const API_BASE_URL = 'https://tamuu-api.shafania57.workers.dev';

// ============================================
// HTTP CLIENT
// ============================================

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: 'include', // Include cookies for auth
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
}

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
// AUTH API FUNCTIONS
// ============================================

export async function register(data: RegisterRequest): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function logout(): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
    });
}

export async function getCurrentUser(): Promise<{ user: UserResponse }> {
    return request<{ user: UserResponse }>('/api/auth/me');
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<{ user: UserResponse }> {
    return request<{ user: UserResponse }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
    });
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/auth/verify/${token}`);
}
