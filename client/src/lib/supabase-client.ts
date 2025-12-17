import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function createClient() {
    if (!supabaseUrl || !supabaseKey) {
        console.warn("Missing Supabase environment variables.");
        // Return a dummy client or throw? 
        // Throwing might break the app if envs are missing in dev.
        // But better to fail early if it depends on it.
        // However, the legacy code threw an error.
        if (!supabaseUrl || !supabaseKey) {
            throw new Error(
                "Missing Supabase environment variables. Please check your .env file."
            );
        }
    }

    return createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
        global: {
            headers: {
                "X-Client-Info": "supabase-js-vue",
            },
        },
    });
}
