import { Context, Next } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';
import type { Env, AuthTokenPayload } from '../types';

// JWT Secret - MUST match the one in auth.ts
const JWT_SECRET = 'tamuu-jwt-secret-2024';

export interface Variables {
    userId: string;
    userEmail: string;
    userRole: string;
}

async function verifyJWT(token: string): Promise<AuthTokenPayload | null> {
    try {
        const [header, payload, signature] = token.split('.');
        if (!header || !payload || !signature) return null;

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(JWT_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signatureData = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureData,
            encoder.encode(`${header}.${payload}`)
        );

        if (!isValid) return null;

        const decoded = JSON.parse(atob(payload)) as AuthTokenPayload;

        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

/**
 * Authentication Middleware
 * Validates JWT from cookie or header
 */
export const authMiddleware = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    let token = getCookie(c, 'auth_token');

    if (!token) {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    if (!token) {
        return c.json({ error: 'Authentication required' }, 401);
    }

    const payload = await verifyJWT(token);
    if (!payload) {
        deleteCookie(c, 'auth_token', { path: '/' });
        return c.json({ error: 'Invalid or expired session' }, 401);
    }

    // Set user data in context for downstream routes
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    c.set('userRole', payload.role);

    await next();
};

/**
 * Role-Based Access Control Middleware
 * Requires specific role to proceed
 */
export const roleMiddleware = (allowedRoles: ('admin' | 'user')[]) => {
    return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
        const userRole = c.get('userRole');

        if (!userRole || !allowedRoles.includes(userRole as any)) {
            return c.json({
                error: 'Forbidden',
                message: 'You do not have permission to access this resource'
            }, 403);
        }

        await next();
    };
};
