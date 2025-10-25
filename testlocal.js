import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log('🧪 Testing Local Setup\n');

  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    console.log('✅ Health check passed');
    console.log('   Cache stats:', data.cache);
    console.log('   Memory:', data.memory);
  } catch (err) {
    console.log('❌ Health check failed:', err.message);
  }

  // Test 2: Load all-data
  console.log('\n2️⃣ Testing all-data endpoint...');
  try {
    const res = await fetch(`${BASE_URL}/api/all-data`);
    const data = await res.json();
    const keys = Object.keys(data);
    console.log(`✅ Loaded ${keys.length} constituencies`);
    console.log('   Sample:', keys.slice(0, 3).join(', '));
  } catch (err) {
    console.log('❌ All-data failed:', err.message);
  }

  // Test 3: Load GeoJSON
  console.log('\n3️⃣ Testing GeoJSON endpoint...');
  try {
    const res = await fetch(`${BASE_URL}/api/constituencies?type=assembly`);
    const data = await res.json();
    console.log(`✅ Loaded ${data.features.length} assembly constituencies`);
  } catch (err) {
    console.log('❌ GeoJSON failed:', err.message);
  }

  // Test 4: PRS data
  console.log('\n4️⃣ Testing PRS endpoint...');
  try {
    const res = await fetch(`${BASE_URL}/api/prs?name=Manoj Tiwari&type=MP`);
    const data = await res.json();
    console.log('✅ PRS data loaded');
    console.log('   Constituency:', data.constituency);
    console.log('   Party:', data.party);
  } catch (err) {
    console.log('❌ PRS failed:', err.message);
  }

  // Test 5: Candidate data
  console.log('\n5️⃣ Testing candidate endpoint...');
  try {
    const res = await fetch(`${BASE_URL}/api/candidate?name=Manoj Tiwari&constituency=North East Delhi&party=Bharatiya Janata Party`);
    const data = await res.json();
    console.log('✅ Candidate data loaded');
    console.log('   TempId:', data.tempId);
    console.log('   Has data:', !!data.data);
  } catch (err) {
    console.log('❌ Candidate failed:', err.message);
  }

  console.log('\n✅ All tests completed!');
  process.exit(0);
}

test();