import AppwritePRSService from './services/appwritePrsService.js';

async function testCacheFunctionality() {
  console.log('\n🧪 Testing Cache Functionality...');
  const name = 'Rahul Gandhi';
  const type = 'MP';
  const constituency = 'Rae Bareli';

  // First call - should fetch and cache (but will fail due to placeholder URL)
  console.log('First call:');
  const result1 = await AppwritePRSService.getMemberData(name, type, constituency);
  console.log('Result 1:', result1.found ? 'Data found' : 'No data');

  // Second call - should hit cache (but since first failed, cache won't have data)
  console.log('Second call (should attempt cache):');
  const result2 = await AppwritePRSService.getMemberData(name, type, constituency);
  console.log('Result 2:', result2.found ? 'Data found' : 'No data');

  console.log('Cache test completed.');
}

async function testVariedInputs() {
  console.log('\n🧪 Testing Varied Inputs...');
  const testCases = [
    { name: 'Narendra Modi', type: 'MP', constituency: 'Varanasi' },
    { name: 'Amit Shah', type: 'MP', constituency: 'Gandhinagar' },
    { name: 'Some MLA', type: 'MLA', constituency: 'Test Constituency', state: 'Test State' },
    { name: '', type: 'MP', constituency: '' } // Edge case
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${JSON.stringify(testCase)}`);
    const result = await AppwritePRSService.getMemberData(testCase.name, testCase.type, testCase.constituency, testCase.state);
    console.log('Result:', result.found ? 'Data found' : 'No data');
  }

  console.log('Varied inputs test completed.');
}

async function testErrorScenarios() {
  console.log('\n🧪 Testing Error Scenarios...');
  // Test with invalid type or other edge cases
  console.log('Testing with invalid type:');
  const result = await AppwritePRSService.getMemberData('Test', 'INVALID');
  console.log('Result:', result.found ? 'Data found' : 'No data');

  console.log('Error scenarios test completed.');
}

async function testOtherMethods() {
  console.log('\n🧪 Testing Other Methods...');

  // Test normalizeData
  console.log('Testing normalizeData:');
  const mockData = {
    imageUrl: 'test.jpg',
    state: 'UP',
    constituency: 'Rae Bareli',
    party: 'INC',
    age: 53,
    gender: 'Male',
    education: 'Graduate',
    termStart: '2019',
    termEnd: '2024',
    noOfTerm: 2,
    membership: 'Active',
    attendance: '85%',
    natAttendance: '80%',
    stateAttendance: '90%',
    debates: 50,
    natDebates: 40,
    stateDebates: 10,
    questions: 100,
    natQuestions: 80,
    stateQuestions: 20,
    pmb: 5,
    natPMB: 3,
    statePMB: 2,
    attendanceTable: 'table1',
    debatesTable: 'table2',
    questionsTable: 'table3'
  };
  const normalized = AppwritePRSService.normalizeData(mockData, 'MP');
  console.log('Normalized data keys:', Object.keys(normalized));
  console.log('Normalized data sample:', JSON.stringify(normalized, null, 2).slice(0, 200) + '...');

  // Test clearCache
  console.log('Testing clearCache:');
  AppwritePRSService.clearCache('appwrite-prs');
  console.log('Cache cleared.');

  // Test getStats
  console.log('Testing getStats:');
  const stats = AppwritePRSService.getStats();
  console.log('Stats:', stats);

  console.log('Other methods test completed.');
}

async function runAllTests() {
  try {
    console.log('Starting comprehensive tests for AppwritePRSService...');

    await testCacheFunctionality();
    await testVariedInputs();
    await testErrorScenarios();
    await testOtherMethods();

    console.log('\n✅ All tests completed successfully.');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

runAllTests();
