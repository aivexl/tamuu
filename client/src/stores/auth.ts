/**
 * Auth Store (Pinia)
 * Manages authentication state and user data
 */

import { defineStore } from 'pinia';
import * as AuthAPI from '@/services/auth-api';
import type { UserResponse } from '@/lib/types';

interface AuthState {
    user: UserResponse | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        isLoading: false,
        isInitialized: false,
        error: null,
    }),

    getters: {
        isAuthenticated: (state) => !!state.user,
        isVerified: (state) => state.user?.isVerified ?? false,
        isAdmin: (state) => state.user?.role === 'admin',
        isUser: (state) => state.user?.role === 'user',
        userPlan: (state) => state.user?.plan ?? 'free',
        userName: (state) => state.user?.name || state.user?.email?.split('@')[0] || 'User',
    },

    actions: {
        async init() {
            // Skip if already initialized
            if (this.isInitialized) return;

            this.isLoading = true;
            this.error = null;

            try {
                // Supabase handles session persistence automatically
                const { user } = await AuthAPI.getCurrentUser();
                this.user = user;
            } catch (error) {
                // Not logged in - this is normal
                this.user = null;
            } finally {
                this.isLoading = false;
                this.isInitialized = true;
            }
        },

        async register(email: string, password: string, name?: string, phone?: string) {
            this.isLoading = true;
            this.error = null;

            try {
                const { user } = await AuthAPI.register({ email, password, name, phone });
                this.user = user;
                return user;
            } catch (error: any) {
                this.error = error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async login(email: string, password: string) {
            this.isLoading = true;
            this.error = null;

            try {
                const { user } = await AuthAPI.login({ email, password });
                this.user = user;
                return user;
            } catch (error: any) {
                this.error = error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async logout() {
            this.isLoading = true;

            try {
                await AuthAPI.logout();
            } catch (error) {
                // Ignore errors on logout
            } finally {
                this.user = null;
                this.isLoading = false;
            }
        },

        async updateProfile(data: { name?: string; phone?: string; avatarUrl?: string }) {
            this.isLoading = true;
            this.error = null;

            try {
                const { user } = await AuthAPI.updateProfile(data);
                this.user = user;
                return user;
            } catch (error: any) {
                this.error = error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async forgotPassword(email: string) {
            this.isLoading = true;
            this.error = null;

            try {
                const result = await AuthAPI.forgotPassword(email);
                return result.message;
            } catch (error: any) {
                this.error = error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async resetPassword(token: string, newPassword: string) {
            this.isLoading = true;
            this.error = null;

            try {
                const result = await AuthAPI.resetPassword(token, newPassword);
                return result.message;
            } catch (error: any) {
                this.error = error.message;
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        clearError() {
            this.error = null;
        },
    },
});
