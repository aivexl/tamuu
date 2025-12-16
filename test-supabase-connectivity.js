// Test Supabase connectivity
const https = require('https');

const SUPABASE_URL = 'https://fzcpyybfnlqlisdqercg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Y3B5eWJmbmxxbGlzZHFlcmNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTc1NjQsImV4cCI6MjA4MDQ5MzU2NH0.sE1-WHRNtxdJiDITqVFl8e_jSINtcUn_WVqehOmK-HY';

console.log('Testing Supabase connectivity...');

// Test basic health check
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      console.log(`Health check - Status: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (data) {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } else {
            resolve({ status: res.statusCode, data: null });
          }
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Health check failed:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

// Test templates endpoint
const testTemplates = () => {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/templates?select=*&limit=1',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      console.log(`Templates check - Status: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (data) {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } else {
            resolve({ status: res.statusCode, data: null });
          }
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Templates check failed:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

async function runTests() {
  try {
    console.log('🔍 Testing Supabase connectivity...\n');

    // Test 1: Health check
    console.log('1. Testing basic connectivity...');
    const healthResult = await testHealth();
    console.log('✅ Health check result:', healthResult);

    // Test 2: Templates endpoint
    console.log('\n2. Testing templates endpoint...');
    const templatesResult = await testTemplates();
    console.log('✅ Templates check result:', JSON.stringify(templatesResult, null, 2));

    console.log('\n🎉 All connectivity tests completed!');

  } catch (error) {
    console.error('\n❌ Connectivity test failed:', error.message);
    console.error('Full error:', error);
  }
}

runTests();

