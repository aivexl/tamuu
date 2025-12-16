const { createClient } = require('@supabase/supabase-js');

// Hardcoded creds (from previous context)
const SUPABASE_URL = 'https://fzcpyybfnlqlisdqercg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Y3B5eWJmbmxxbGlzZHFlcmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTc1NjQsImV4cCI6MjA4MDQ5MzU2NH0.sE1-WHRNtxdJiDITqVFl8e_jSINtcUn_WVqehOmK-HY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testLatency() {
    console.log('⏱️ Starting Latency Test...');
    const start = performance.now();

    try {
        const { data, error } = await supabase
            .from('templates')
            .select('id, name, thumbnail, status, updated_at, created_at')
            .order('updated_at', { ascending: false })
            .limit(50);

        const end = performance.now();
        const duration = (end - start).toFixed(2);

        if (error) {
            console.error(`❌ Query Failed after ${duration}ms:`, error.message);
        } else {
            console.log(`✅ Query Success!`);
            console.log(`📊 Time taken: ${duration}ms`);
            console.log(`📦 Rows returned: ${data.length}`);
            if (data.length > 0) {
                console.log('Sample row:', data[0]);
            }
        }

    } catch (err) {
        console.error('💥 Execution Error:', err);
    }
}

testLatency();
