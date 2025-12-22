/**
 * Payment Webhook Handler
 * Receives payment notifications and updates user plan in Supabase
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import type { Env } from '../types';

export const webhookRouter = new Hono<{ Bindings: Env }>();

// ============================================
// SUPABASE ADMIN CLIENT
// ============================================

function getSupabaseAdmin(env: Env) {
    const supabaseUrl = env.SUPABASE_URL || 'https://fzcpyybfnlqlisdqercg.supabase.co';
    const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_KEY not configured');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// ============================================
// PLAN CONFIGURATION
// ============================================

const PLAN_DURATIONS: Record<string, number> = {
    'basic': 30,      // 30 days
    'premium': 90,    // 90 days
    'platinum': 365,  // 1 year
};

function calculateExpiry(plan: string): string {
    const days = PLAN_DURATIONS[plan] || 30;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry.toISOString();
}

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

/**
 * Generic webhook for updating user plan
 * Can be called by any payment gateway after verification
 */
webhookRouter.post('/update-plan', async (c) => {
    try {
        const body = await c.req.json();
        const { userId, email, plan, transactionId } = body;

        if (!plan || (!userId && !email)) {
            return c.json({ error: 'Missing required fields: plan, and userId or email' }, 400);
        }

        const supabase = getSupabaseAdmin(c.env);

        // Find user by email or ID
        let targetUserId = userId;

        if (!targetUserId && email) {
            // Find user by email
            const { data: users, error: findError } = await supabase.auth.admin.listUsers();
            if (findError) throw findError;

            const user = users.users.find(u => u.email === email);
            if (!user) {
                return c.json({ error: 'User not found' }, 404);
            }
            targetUserId = user.id;
        }

        // Calculate expiry date
        const planExpiresAt = calculateExpiry(plan);

        // Update user metadata
        const { data, error } = await supabase.auth.admin.updateUserById(targetUserId, {
            user_metadata: {
                plan: plan,
                plan_expires_at: planExpiresAt,
                last_transaction_id: transactionId,
            },
        });

        if (error) throw error;

        console.log(`✅ Plan updated for user ${targetUserId}: ${plan} until ${planExpiresAt}`);

        return c.json({
            success: true,
            userId: targetUserId,
            plan: plan,
            expiresAt: planExpiresAt,
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return c.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});

/**
 * Midtrans Webhook Handler
 * Receives payment notification from Midtrans
 */
webhookRouter.post('/midtrans', async (c) => {
    try {
        const notification = await c.req.json();

        // Verify signature (in production, verify with Midtrans server key)
        const {
            transaction_status,
            order_id,
            gross_amount,
            custom_field1: email,
            custom_field2: plan
        } = notification;

        // Only process successful payments
        if (!['capture', 'settlement'].includes(transaction_status)) {
            return c.json({ status: 'ignored', reason: 'Transaction not successful' });
        }

        const supabase = getSupabaseAdmin(c.env);

        // Find user by email
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === email);

        if (!user) {
            console.error(`User not found for email: ${email}`);
            return c.json({ error: 'User not found' }, 404);
        }

        // Update plan
        const planExpiresAt = calculateExpiry(plan);

        await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
                plan: plan,
                plan_expires_at: planExpiresAt,
                last_transaction_id: order_id,
                last_payment_amount: gross_amount,
            },
        });

        console.log(`✅ Midtrans: Plan ${plan} activated for ${email}`);

        return c.json({ status: 'success' });

    } catch (error) {
        console.error('Midtrans webhook error:', error);
        return c.json({ error: 'Webhook processing failed' }, 500);
    }
});

/**
 * Xendit Webhook Handler
 * Receives payment notification from Xendit
 */
webhookRouter.post('/xendit', async (c) => {
    try {
        const notification = await c.req.json();

        // Verify callback token (in production, verify with Xendit callback token)
        const callbackToken = c.req.header('x-callback-token');
        // if (callbackToken !== c.env.XENDIT_CALLBACK_TOKEN) {
        //     return c.json({ error: 'Invalid callback token' }, 401);
        // }

        const {
            status,
            external_id,
            paid_amount,
            metadata
        } = notification;

        // Only process paid status
        if (status !== 'PAID') {
            return c.json({ status: 'ignored', reason: 'Not paid yet' });
        }

        const { email, plan } = metadata || {};

        if (!email || !plan) {
            return c.json({ error: 'Missing email or plan in metadata' }, 400);
        }

        const supabase = getSupabaseAdmin(c.env);

        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users.find(u => u.email === email);

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        const planExpiresAt = calculateExpiry(plan);

        await supabase.auth.admin.updateUserById(user.id, {
            user_metadata: {
                plan: plan,
                plan_expires_at: planExpiresAt,
                last_transaction_id: external_id,
                last_payment_amount: paid_amount,
            },
        });

        console.log(`✅ Xendit: Plan ${plan} activated for ${email}`);

        return c.json({ status: 'success' });

    } catch (error) {
        console.error('Xendit webhook error:', error);
        return c.json({ error: 'Webhook processing failed' }, 500);
    }
});
