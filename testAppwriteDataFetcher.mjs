import { fetchFromAppwrite, getMemberData, getCandidateData, postData, getStats } from './services/appwriteDataFetcher.js';

async function testFetchFromAppwrite() {
  console.log('\n=== Testing fetchFromAppwrite ===');
  try {
    const payload = {
      action: 'testAction',
      key: 'value'
    };
    const result = await fetchFromAppwrite(payload, 'test-request');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testGetMemberData() {
  console.log('\n=== Testing getMemberData ===');
  try {
    const result = await getMemberData('Narendra Modi', 'MP', 'Varanasi', 'Uttar Pradesh');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testGetCandidateData() {
  console.log('\n=== Testing getCandidateData ===');
  try {
    const result = await getCandidateData('Candidate Name', 'Constituency', 'Party');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testPostData() {
  console.log('\n=== Testing postData ===');
  try {
    const data = { action: 'customAction', data: 'test' };
    const result = await postData(data, 'post-test');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testGetStats() {
  console.log('\n=== Testing getStats ===');
  try {
    const stats = getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  console.log('Starting AppwriteDataFetcher Tests...\n');

  await testGetStats();
  await testFetchFromAppwrite();
  await testGetMemberData();
  await testGetCandidateData();
  await testPostData();

  console.log('\nTests completed.');
}

// Run tests
runTests().catch(console.error);

export { runTests, testFetchFromAppwrite, testGetMemberData, testGetCandidateData, testPostData, testGetStats };
