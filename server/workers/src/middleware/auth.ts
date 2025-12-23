import { Context, Next } from 'hono';
import { deleteCookie } from 'hono/cookie';
import type { Env } from '../types';
import { AuthService } from '../services/auth';

export interface Variables {
    userId: string;
    userEmail: string;
    userRole: string;
}

/**
 * Authentication Middleware
 * Validates Supabase JWT from cookie or header
 */
export const authMiddleware = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const user = await AuthService.getAuthUser(c);

    if (!user) {
        deleteCookie(c, 'auth_token', { path: '/' });
        return c.json({ error: 'Authentication required' }, 401);
    }

    // Set user data in context for downstream routes
    c.set('userId', user.userId);
    c.set('userEmail', user.email);
    c.set('userRole', user.role);

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
