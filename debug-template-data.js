const { createClient } = require('@supabase/supabase-js');

// Hardcoded from verified working test script
const SUPABASE_URL = 'https://fzcpyybfnlqlisdqercg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Y3B5eWJmbmxxbGlzZHFlcmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTc1NjQsImV4cCI6MjA4MDQ5MzU2NH0.sE1-WHRNtxdJiDITqVFl8e_jSINtcUn_WVqehOmK-HY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTemplates() {
    console.log('🔍 Listing templates...');
    const { data: templates, error } = await supabase.from('templates').select('*');

    if (error) {
        console.error('Error listing templates:', error);
        return;
    }

    if (!templates || templates.length === 0) {
        console.log('No templates found.');
        return;
    }

    console.log(`Found ${templates.length} templates.`);

    // Find "template maroon" or fallback to first
    const targetTemplate = templates.find(t => t.name.toLowerCase().includes('maroon')) || templates[0];
    console.log(`\n🕵️ Inspecting template: ${targetTemplate.name} (${targetTemplate.id})`);
    console.log(`   Status: ${targetTemplate.status}`);
    console.log(`   Created: ${targetTemplate.created_at}`);

    // Fetch sections
    const { data: sections, error: secError } = await supabase
        .from('template_sections')
        .select('*')
        .eq('template_id', targetTemplate.id);

    if (secError) {
        console.error('Error fetching sections:', secError);
        return;
    }

    console.log(`Found ${sections.length} sections for this template.`);

    // For each section, fetch elements
    for (const section of sections) {
        const { data: elements, error: elError } = await supabase
            .from('template_elements')
            .select('*')
            .eq('section_id', section.id);

        if (elError) {
            console.error(`Error fetching elements for section ${section.type}:`, elError);
        } else {
            console.log(`  - Section [${section.type}]: ${elements.length} elements`);
            if (elements.length > 0) {
                console.log(`    First element: ${elements[0].name} (${elements[0].type})`);
            }
        }
    }
}

inspectTemplates();
