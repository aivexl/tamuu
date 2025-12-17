const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fzcpyybfnlqlisdqercg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Y3B5eWJmbmxxbGlzZHFlcmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTc1NjQsImV4cCI6MjA4MDQ5MzU2NH0.sE1-WHRNtxdJiDITqVFl8e_jSINtcUn_WVqehOmK-HY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
    console.log('🔍 Starting Diagnostic for template_elements...');

    // 1. Check Total Count
    const startCount = Date.now();
    const { count, error: countError } = await supabase
        .from('template_elements')
        .select('*', { count: 'exact', head: true });
    console.log(`1. Total Rows: ${count} (took ${Date.now() - startCount}ms)`);
    if (countError) console.error('Error counting:', countError);

    // 2. Check Fetch by specific section_id (simulating the timeout)
    // I'll grab a valid section_id first from template_sections
    const { data: sections } = await supabase.from('template_sections').select('id').limit(1);

    if (sections && sections.length > 0) {
        const sectionId = sections[0].id;
        console.log(`Testing fetch for section_id: ${sectionId}`);

        // A. Select ID only (should be fast if indexed, slowish if not but less data)
        const startId = Date.now();
        const { error: errorId } = await supabase
            .from('template_elements')
            .select('id')
            .eq('section_id', sectionId);
        console.log(`2. Select 'id' only took ${Date.now() - startId}ms`);
        if (errorId) console.error('Error fetching ID:', errorId);

        // B. Select * (checking data transfer size impacting timeout)
        const startAll = Date.now();
        const { data: allData, error: errorAll } = await supabase
            .from('template_elements')
            .select('*')
            .eq('section_id', sectionId);
        console.log(`3. Select '*' took ${Date.now() - startAll}ms`);
        if (errorAll) console.error('Error fetching *:', errorAll);

        if (allData && allData.length > 0) {
            const dataStr = JSON.stringify(allData);
            console.log(`   Data size for this section: ${(dataStr.length / 1024).toFixed(2)} KB for ${allData.length} items.`);
            // Check for huge fields
            let maxFieldSize = 0;
            let maxFieldName = '';
            allData.forEach(row => {
                Object.keys(row).forEach(key => {
                    const val = row[key];
                    if (typeof val === 'string' && val.length > maxFieldSize) {
                        maxFieldSize = val.length;
                        maxFieldName = key;
                    }
                });
            });
            console.log(`   Largest field: '${maxFieldName}' with size ${(maxFieldSize / 1024).toFixed(2)} KB`);
        }
    } else {
        console.log('No sections found to test.');
    }
}

diagnose();
