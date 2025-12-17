import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export function createClient() {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
    }

    console.log('🔧 Creating Supabase client with URL:', supabaseUrl);
    console.log('🔑 Using anon key:', supabaseKey.substring(0, 20) + '...');

    try {
        const client = createBrowserClient(
            supabaseUrl,
            supabaseKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                },
                global: {
                    headers: {
                        'X-Client-Info': 'supabase-js-web',
                    },
                },
            }
        );

        console.log('✅ Supabase client created successfully');
        return client;
    } catch (error) {
        console.error('❌ Failed to create Supabase client:', error);
        throw error;
    }
}
