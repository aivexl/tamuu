/**
 * Auth Service
 * Handles Supabase authentication verification
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env, AuthTokenPayload } from '../types';
import { getCookie } from 'hono/cookie';

export class AuthService {
    private supabase: SupabaseClient;

    // Supabase anon key (safe to hardcode - same as frontend, it's a public key)
    private static readonly SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Y3B5eWJmbmxxbGlzZHFlcmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTc1NjQsImV4cCI6MjA4MDQ5MzU2NH0.sE1-WHRNtxdJiDITqVFl8e_jSINtcUn_WVqehOmK-HY';

    constructor(env: Env) {
        const supabaseUrl = env.SUPABASE_URL || 'https://fzcpyybfnlqlisdqercg.supabase.co';
        // Use service key if available, otherwise fall back to anon key
        const supabaseKey = env.SUPABASE_SERVICE_KEY || AuthService.SUPABASE_ANON_KEY;

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Verify JWT token from Supabase
     */
    async verifyToken(token: string): Promise<AuthTokenPayload | null> {
        if (!token) return null;

        try {
            // Get user from Supabase Auth
            const { data: { user }, error } = await this.supabase.auth.getUser(token);

            if (error || !user) {
                console.error('[Auth] Token verification failed:', error?.message);
                return null;
            }

            // Map to our AuthTokenPayload format
            return {
                userId: user.id,
                email: user.email || '',
                role: (user.user_metadata?.role as 'admin' | 'user') || 'user',
                exp: 0 // Supabase handles expiration, we just assume valid if getUser succeeds
            };
        } catch (err) {
            console.error('[Auth] Exception verifying token:', err);
            return null;
        }
    }

    /**
     * Get authenticated user from request
     */
    static async getAuthUser(c: any): Promise<AuthTokenPayload | null> {
        let token = getCookie(c, 'auth_token'); // Tamuu cookie

        // Also check standard Bearer header (Supabase default)
        if (!token) {
            const authHeader = c.req.header('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.slice(7);
            }
        }

        // Also check 'sb-access-token' cookie (Supabase default)
        if (!token) {
            token = getCookie(c, 'sb-access-token');
        }

        if (!token) return null;

        const authService = new AuthService(c.env);
        return authService.verifyToken(token);
    }
}
