
import { testConnection as testFetcher } from './services/appwriteDataFetcher.js';
import candidateService from './services/candidateService.js';
import appwriteService from './services/AppwriteService.js';
import imageProxy from './services/imageProxy.js';
import cacheService from './services/cacheService.js';

async function runTests() {
    console.log('🧪 Starting Verification Tests...\n');

    // 1. Test AppwriteService directly
    console.log('1️⃣ Testing AppwriteService...');
    const serviceStats = appwriteService.getStats();
    console.log('   Stats:', serviceStats);
    if (serviceStats.enabled) {
        console.log('   ✅ AppwriteService is enabled');
    } else {
        console.error('   ❌ AppwriteService is disabled (check .env)');
    }

    // 2. Test appwriteDataFetcher (Backward Compatibility)
    console.log('\n2️⃣ Testing appwriteDataFetcher (Backward Compatibility)...');
    const fetcherResult = await testFetcher();
    if (fetcherResult.healthy) {
        console.log('   ✅ appwriteDataFetcher connection successful');
    } else {
        console.error('   ❌ appwriteDataFetcher failed:', fetcherResult.message);
    }

    // 3. Test candidateService
    console.log('\n3️⃣ Testing candidateService...');
    const candidateHealth = await candidateService.healthCheck();
    if (candidateHealth.healthy) {
        console.log('   ✅ candidateService health check passed');
    } else {
        console.error('   ❌ candidateService health check failed:', candidateHealth.error);
    }

    // 4. Test Real Candidate Fetch
    console.log('\n4️⃣ Testing Real Candidate Fetch...');
    try {
        const candidateData = await candidateService.getCandidateData(
            'Sangeeta Kumari Singh Deo',
            'Bolangir',
            'Bharatiya Janata Party'
        );

        if (candidateData && !candidateData.error) {
            console.log('   ✅ Real candidate fetch successful');
            console.log('   Data keys:', Object.keys(candidateData));
        } else {
            console.error('   ❌ Real candidate fetch failed:', candidateData?.error || 'Unknown error');
            if (candidateData?.data?.error) {
                console.error('   Inner error:', candidateData.data.error);
            }
        }
    } catch (error) {
        console.error('   ❌ Real candidate fetch threw error:', error.message);
    }

    // 5. Test Image Proxy
    console.log('\n5️⃣ Testing Image Proxy...');
    try {
        // Mock environment variables
        process.env.RAILWAY_STATIC_URL = 'https://production-app.com/';

        // Test 'dev' alias
        process.env.NODE_ENV = 'dev';

        const testUrl = 'https://example.com/image.jpg';
        const localBaseUrl = 'http://localhost:3000';

        // Pass localBaseUrl as argument, simulating api.js behavior
        const proxyUrl = imageProxy.createProxyUrl(testUrl, localBaseUrl);

        console.log(`   Original: ${testUrl}`);
        console.log(`   Proxy (Dev): ${proxyUrl}`);

        if (proxyUrl.startsWith(localBaseUrl)) {
            console.log('   ✅ Correctly used local URL in development mode (alias: dev)');
        } else {
            console.error('   ❌ Failed to use local URL in development mode (alias: dev)');
        }

        // Test Production Mode
        process.env.NODE_ENV = 'production';
        const prodProxyUrl = imageProxy.createProxyUrl(testUrl, localBaseUrl);
        console.log(`   Proxy (Prod): ${prodProxyUrl}`);

        if (prodProxyUrl.startsWith('https://production-app.com')) {
            console.log('   ✅ Correctly used Railway URL in production mode');
        } else {
            console.error('   ❌ Failed to use Railway URL in production mode');
        }

    } catch (error) {
        console.error('   ❌ Image proxy test failed:', error.message);
    }



    // 6. Test Cache Service (Polling)
    console.log('\n6️⃣ Testing Cache Service (Polling)...');
    try {
        const requestId = 'test-poll-id';
        const pollData = { status: 'ready', data: { foo: 'bar' } };

        // Set cache
        cacheService.set('poll', requestId, pollData);

        // Get cache
        const cached = cacheService.get('poll', requestId);

        if (cached && cached.data.foo === 'bar') {
            console.log('   ✅ Cache service handles "poll" type correctly');
        } else {
            console.error('   ❌ Cache service failed to retrieve "poll" data');
        }

        // Check TTL
        const ttl = cacheService.getTTL('poll');
        if (ttl === 5 * 60 * 1000) {
            console.log('   ✅ Poll TTL is correct (5 mins)');
        } else {
            console.error(`   ❌ Poll TTL is incorrect: ${ttl}`);
        }

    } catch (error) {
        console.error('   ❌ Cache service test failed:', error.message);
    }

    console.log('\n🏁 Verification Complete');
}

runTests().catch(console.error);
