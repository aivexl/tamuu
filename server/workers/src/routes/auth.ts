/**
 * Authentication API Routes
 * Register, Login, Password Reset, Email Verification
 * Enterprise-grade JWT-based auth for Cloudflare Workers
 */

import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Env, DBUser, UserResponse, AuthTokenPayload } from '../types';

export const authRouter = new Hono<{ Bindings: Env }>();

// ============================================
// CONSTANTS
// ============================================
const JWT_SECRET = 'tamuu-jwt-secret-2024'; // In production, use env variable
const JWT_EXPIRY_DAYS = 7;
const SALT_ROUNDS = 10;

// ============================================
// HELPERS
// ============================================

// Simple UUID generator
function generateUUID(): string {
    const hex = (n: number) => Math.floor(Math.random() * 16).toString(16);
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.floor(Math.random() * 16);
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Simple password hashing (using Web Crypto API)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + JWT_SECRET);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await hashPassword(password);
    return computed === hash;
}

// JWT helpers using Web Crypto
async function createJWT(payload: Omit<AuthTokenPayload, 'exp'>): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + (JWT_EXPIRY_DAYS * 24 * 60 * 60);
    const fullPayload = { ...payload, exp };

    const base64Header = btoa(JSON.stringify(header));
    const base64Payload = btoa(JSON.stringify(fullPayload));

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${base64Header}.${base64Payload}`)
    );

    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `${base64Header}.${base64Payload}.${base64Signature}`;
}

async function verifyJWT(token: string): Promise<AuthTokenPayload | null> {
    try {
        const [header, payload, signature] = token.split('.');
        if (!header || !payload || !signature) return null;

        // Verify signature
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

        // Check expiry
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

// Map DB user to API response
function mapUserToResponse(user: DBUser): UserResponse {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        plan: user.plan,
        role: user.role,
        planExpiresAt: user.plan_expires_at,
        isVerified: user.is_verified === 1,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
    };
}

// ============================================
// ROUTES
// ============================================

// POST /api/auth/register - Create new account
authRouter.post('/register', async (c) => {
    const body = await c.req.json();
    const { email, password, name, phone } = body;

    // Validate required fields
    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return c.json({ error: 'Invalid email format' }, 400);
    }

    // Validate password length
    if (password.length < 8) {
        return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if email already exists
    const existing = await c.env.DB
        .prepare('SELECT id FROM users WHERE email = ?')
        .bind(email.toLowerCase())
        .first();

    if (existing) {
        return c.json({ error: 'Email already registered' }, 409);
    }

    // Create user
    const id = generateUUID();
    const passwordHash = await hashPassword(password);
    const verificationToken = generateUUID();
    const now = new Date().toISOString();

    await c.env.DB
        .prepare(`
            INSERT INTO users (id, email, password_hash, name, phone, verification_token, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(id, email.toLowerCase(), passwordHash, name || null, phone || null, verificationToken, now, now)
        .run();

    // Get created user
    const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(id)
        .first<DBUser>();

    if (!user) {
        return c.json({ error: 'Failed to create user' }, 500);
    }

    // Create JWT token
    const token = await createJWT({
        userId: user.id,
        email: user.email,
        role: user.role
    });

    // Set cookie - SameSite: None for cross-origin
    setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: JWT_EXPIRY_DAYS * 24 * 60 * 60,
        path: '/',
    });

    return c.json({
        user: mapUserToResponse(user),
        token,
        message: 'Registration successful. Please verify your email.',
    }, 201);
});

// POST /api/auth/login - Login with email/password
authRouter.post('/login', async (c) => {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
    }

    // Find user
    const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE email = ?')
        .bind(email.toLowerCase())
        .first<DBUser>();

    if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Create JWT token
    const token = await createJWT({
        userId: user.id,
        email: user.email,
        role: user.role
    });

    // Set cookie - SameSite: None for cross-origin
    setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: JWT_EXPIRY_DAYS * 24 * 60 * 60,
        path: '/',
    });

    return c.json({
        user: mapUserToResponse(user),
        token,
    });
});

// POST /api/auth/logout - Clear auth cookie
authRouter.post('/logout', async (c) => {
    deleteCookie(c, 'auth_token', { path: '/' });
    return c.json({ success: true });
});

// GET /api/auth/me - Get current user from token
authRouter.get('/me', async (c) => {
    // Try cookie first, then Authorization header
    let token = getCookie(c, 'auth_token');

    if (!token) {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    if (!token) {
        return c.json({ error: 'Not authenticated' }, 401);
    }

    const payload = await verifyJWT(token);
    if (!payload) {
        deleteCookie(c, 'auth_token', { path: '/' });
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(payload.userId)
        .first<DBUser>();

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: mapUserToResponse(user) });
});

// PUT /api/auth/profile - Update user profile
authRouter.put('/profile', async (c) => {
    let token = getCookie(c, 'auth_token');

    if (!token) {
        const authHeader = c.req.header('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.slice(7);
        }
    }

    if (!token) {
        return c.json({ error: 'Not authenticated' }, 401);
    }

    const payload = await verifyJWT(token);
    if (!payload) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const body = await c.req.json();
    const { name, phone, avatarUrl } = body;

    const now = new Date().toISOString();
    await c.env.DB
        .prepare(`
            UPDATE users 
            SET name = COALESCE(?, name), 
                phone = COALESCE(?, phone), 
                avatar_url = COALESCE(?, avatar_url),
                updated_at = ?
            WHERE id = ?
        `)
        .bind(name, phone, avatarUrl, now, payload.userId)
        .run();

    const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE id = ?')
        .bind(payload.userId)
        .first<DBUser>();

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: mapUserToResponse(user) });
});

// POST /api/auth/forgot-password - Request password reset
authRouter.post('/forgot-password', async (c) => {
    const body = await c.req.json();
    const { email } = body;

    if (!email) {
        return c.json({ error: 'Email is required' }, 400);
    }

    const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE email = ?')
        .bind(email.toLowerCase())
        .first<DBUser>();

    if (!user) {
        // Don't reveal if email exists
        return c.json({ message: 'If email exists, reset link will be sent' });
    }

    const resetToken = generateUUID();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await c.env.DB
        .prepare(`
            UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?
        `)
        .bind(resetToken, resetExpires, user.id)
        .run();

    // TODO: Send email with reset link
    console.log(`[AUTH] Password reset token for ${email}: ${resetToken}`);

    return c.json({ message: 'If email exists, reset link will be sent' });
});

// POST /api/auth/reset-password - Reset password with token
authRouter.post('/reset-password', async (c) => {
    const body = await c.req.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
        return c.json({ error: 'Token and new password are required' }, 400);
    }

    if (newPassword.length < 8) {
        return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE reset_token = ?')
        .bind(token)
        .first<DBUser>();

    if (!user) {
        return c.json({ error: 'Invalid or expired reset token' }, 400);
    }

    // Check if token expired
    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
        return c.json({ error: 'Reset token has expired' }, 400);
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    await c.env.DB
        .prepare(`
            UPDATE users 
            SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = ?
            WHERE id = ?
        `)
        .bind(passwordHash, now, user.id)
        .run();

    return c.json({ message: 'Password reset successful' });
});

// GET /api/auth/verify/:token - Verify email
authRouter.get('/verify/:token', async (c) => {
    const token = c.req.param('token');

    const user = await c.env.DB
        .prepare('SELECT * FROM users WHERE verification_token = ?')
        .bind(token)
        .first<DBUser>();

    if (!user) {
        return c.json({ error: 'Invalid verification token' }, 400);
    }

    const now = new Date().toISOString();
    await c.env.DB
        .prepare(`
            UPDATE users 
            SET is_verified = 1, verification_token = NULL, updated_at = ?
            WHERE id = ?
        `)
        .bind(now, user.id)
        .run();

    return c.json({ message: 'Email verified successfully' });
});
