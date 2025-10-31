import appwritePRSService from './services/appwritePrsService.js';

async function testValidMP() {
  console.log('\n=== Testing Valid MP Data ===');
  try {
    const result = await appwritePRSService.getMemberData('Narendra Modi', 'MP', 'Varanasi', 'Uttar Pradesh');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Found:', result.found);
    console.log('Party:', result.party);
    console.log('Constituency:', result.constituency);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testInvalidName() {
  console.log('\n=== Testing Invalid Name ===');
  try {
    const result = await appwritePRSService.getMemberData('Invalid Name XYZ', 'MP');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Found:', result.found);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testMLA() {
  console.log('\n=== Testing MLA Data ===');
  try {
    const result = await appwritePRSService.getMemberData('Yogi Adityanath', 'MLA', 'Gorakhpur', 'Uttar Pradesh');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('Found:', result.found);
    console.log('Party:', result.party);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testCacheHit() {
  console.log('\n=== Testing Cache Hit ===');
  try {
    console.log('First call:');
    const result1 = await appwritePRSService.getMemberData('Narendra Modi', 'MP', 'Varanasi', 'Uttar Pradesh');
    console.log('Found:', result1.found, 'Party:', result1.party);

    console.log('Second call (should be from cache):');
    const result2 = await appwritePRSService.getMemberData('Narendra Modi', 'MP', 'Varanasi', 'Uttar Pradesh');
    console.log('Found:', result2.found, 'Party:', result2.party);

    console.log('Results match:', JSON.stringify(result1) === JSON.stringify(result2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const health = await appwritePRSService.healthCheck();
    console.log('Health Status:', JSON.stringify(health, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testStats() {
  console.log('\n=== Testing Stats ===');
  try {
    const stats = appwritePRSService.getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testRawResponse() {
  console.log('\n=== Testing Raw Appwrite Response ===');
  try {
    const response = await fetch('https://cloud.appwrite.io/v1/functions/68ffcb25003df2ce3663/executions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': process.env.APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': process.env.APPWRITE_API_KEY
      },
      body: JSON.stringify({
        name: 'Narendra Modi',
        type: 'MP',
        constituency: 'Varanasi',
        state: 'Uttar Pradesh'
      })
    });

    const rawResult = await response.json();
    console.log('Raw Response:', JSON.stringify(rawResult, null, 2));
    console.log('Response Status:', response.status);
    console.log('Response OK:', response.ok);

    if (rawResult.responseBody) {
      try {
        const actualData = JSON.parse(rawResult.responseBody);
        console.log('Parsed Response Body:', JSON.stringify(actualData, null, 2));
      } catch (parseError) {
        console.log('Response Body (raw string):', rawResult.responseBody);
      }
    }
  } catch (error) {
    console.error('Error fetching raw response:', error.message);
  }
}

async function runTests() {
  console.log('Starting Appwrite Data Fetching Tests...\n');

  await testHealthCheck();
  await testStats();

  await testRawResponse();

  await testValidMP();
  await testInvalidName();
  await testMLA();
  await testCacheHit();

  console.log('\n=== Final Stats ===');
  const finalStats = appwritePRSService.getStats();
  console.log('Final Stats:', JSON.stringify(finalStats, null, 2));

  console.log('\nTests completed.');
}


runTests().catch(console.error);

export { runTests, testValidMP, testInvalidName, testMLA, testCacheHit, testHealthCheck, testStats };
