const { createClient } = require('@supabase/supabase-js');

// Hardcoded creds
const SUPABASE_URL = 'https://fzcpyybfnlqlisdqercg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Y3B5eWJmbmxxbGlzZHFlcmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTc1NjQsImV4cCI6MjA4MDQ5MzU2NH0.sE1-WHRNtxdJiDITqVFl8e_jSINtcUn_WVqehOmK-HY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testNestedQuery() {
    console.log('🔍 Testing nested query...');

    // 1. Get the maroon template ID first
    const { data: templates } = await supabase.from('templates').select('id, name').ilike('name', '%maroon%');
    if (!templates || !templates.length) {
        console.error('❌ Template maroon not found');
        return;
    }
    const id = templates[0].id;
    console.log(`🎯 Target Template: ${templates[0].name} (${id})`);

    // 2. Run the EXACT query used in the application
    const { data, error } = await supabase
        .from('templates')
        .select(`
        *,
        template_sections (
            *,
            template_elements (*)
        )
    `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('❌ Query Error:', error);
        return;
    }

    // 3. Inspect the structure deep down
    console.log('\n📊 Response Structure Analysis:');
    if (data.template_sections) {
        console.log(`✅ template_sections found: ${data.template_sections.length} items`);

        const openingSection = data.template_sections.find(s => s.type === 'opening');
        if (openingSection) {
            console.log('\n🔎 Inspecting "opening" section:');
            const elements = openingSection.template_elements;
            if (elements) {
                console.log(`   Element key 'template_elements' exists.`);
                console.log(`   Is Array? ${Array.isArray(elements)}`);
                console.log(`   Count: ${elements.length}`);
                if (elements.length > 0) {
                    console.log('   Sample Element:', JSON.stringify(elements[0], null, 2));
                }
            } else {
                console.error('   ❌ "template_elements" property is MISSING or null/undefined on structure!');
                console.log('   Keys present on section object:', Object.keys(openingSection));
            }
        } else {
            console.warn('   ⚠️ No "opening" section found.');
        }
    } else {
        console.error('❌ template_sections MISSING from response!');
    }
}

testNestedQuery();
