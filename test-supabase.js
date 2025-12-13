// Quick test of Supabase client
const { createClient } = require('./utils/supabase/client.ts');

console.log('Testing Supabase client...');

try {
  const client = createClient();
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('❌ Failed to create Supabase client:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
}

