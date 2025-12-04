import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'change-me-in-production'; // Default from config

async function testStorageEndpoints() {
    console.log('🧪 Testing Storage Endpoints...\n');

    // 1. Test Stats (Unauthorized)
    console.log('1️⃣ Testing Stats (Unauthorized)...');
    const statsUnauth = await fetch(`${BASE_URL}/api/storage/stats`);
    if (statsUnauth.status === 401) {
        console.log('   ✅ Correctly rejected unauthorized request');
    } else {
        console.error(`   ❌ Failed: Status ${statsUnauth.status}`);
    }

    // 2. Test Stats (Authorized)
    console.log('\n2️⃣ Testing Stats (Authorized)...');
    const statsAuth = await fetch(`${BASE_URL}/api/storage/stats`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });

    if (statsAuth.ok) {
        const data = await statsAuth.json();
        console.log('   ✅ Stats retrieved successfully');
        console.log('   Stats:', JSON.stringify(data.data, null, 2));
    } else {
        console.error(`   ❌ Failed: Status ${statsAuth.status}`);
        const err = await statsAuth.text();
        console.error('   Error:', err);
    }

    // 3. Test Cleanup (Authorized)
    console.log('\n3️⃣ Testing Manual Cleanup...');
    const cleanupAuth = await fetch(`${BASE_URL}/api/storage/cleanup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });

    if (cleanupAuth.ok) {
        const data = await cleanupAuth.json();
        console.log('   ✅ Cleanup executed successfully');
        console.log('   Result:', JSON.stringify(data.results, null, 2));
    } else {
        console.error(`   ❌ Failed: Status ${cleanupAuth.status}`);
        const err = await cleanupAuth.text();
        console.error('   Error:', err);
    }
}

testStorageEndpoints().catch(console.error);
