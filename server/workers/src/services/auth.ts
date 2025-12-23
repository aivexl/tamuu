/**
 * Auth Service
 * Handles Supabase authentication verification
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env, AuthTokenPayload } from '../types';
import { getCookie } from 'hono/cookie';

export class AuthService {
    private supabase: SupabaseClient;

    constructor(env: Env) {
        // Must use service key for admin tasks, or anon key for client tasks
        // For verification, we just need the URL and a key (anon is enough for getUser with token)
        const supabaseUrl = env.SUPABASE_URL || 'https://fzcpyybfnlqlisdqercg.supabase.co';
        const supabaseKey = env.SUPABASE_SERVICE_KEY || env.R2_PUBLIC_URL?.split('?')[0] || '';
        // Note: Ideally SUPABASE_SERVICE_KEY should be in Env. 
        // If not found, we might fallback or error.

        // IMPORTANT: For Workers, we create a new client per request usually, 
        // or re-use if possible. But for getUser(token), we need to set the session.
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
