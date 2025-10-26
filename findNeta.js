import fetch from 'node-fetch';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

export async function getCandidateData(name, constituency = '', party = '') {
    try {
        // Validate input
        if (!name || name.trim() === '') {
            console.error('❌ Candidate name is required');
            return {
                data: {
                    assetLink: null,
                    content: null,
                    error: 'Candidate name is required'
                }
            };
        }

        console.log('\n' + '='.repeat(60));
        console.log(`📋 Processing: ${name}`);
        console.log('='.repeat(60));

        const searchUrl = `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`;

        // Direct Appwrite call as per sample
        console.log(`📡 [Appwrite] Fetching data for ${name}...`);

        const body = { test: 'search', name, constituency, party };
        console.log(`📤 Request body:`, body);

        const startTime = Date.now();

        const response = await fetch(
            `${APPWRITE_ENDPOINT}/functions/${APPWRITE_FUNCTION_ID}/executions`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Appwrite-Project': APPWRITE_PROJECT_ID,
                    'X-Appwrite-Key': APPWRITE_API_KEY
                },
                body: JSON.stringify({
                    async: false,
                    body: JSON.stringify(body)
                })
            }
        );

        const duration = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        console.log(`⏱️  Total time: ${duration}ms`);
        console.log(`📥 Response:`, JSON.stringify(result, null, 2));

        // Parse the response body if it's a string
        let parsedResponse;
        try {
            parsedResponse = typeof result.responseBody === 'string'
                ? JSON.parse(result.responseBody)
                : result.responseBody;
        } catch (e) {
            parsedResponse = result.responseBody;
        }

        console.log(`\n✅ Status: ${result.status}`);
        console.log(`⏱️  Execution time: ${result.duration}s`);

        if (parsedResponse) {
            console.log(`\n📊 Result:`);
            console.log(JSON.stringify(parsedResponse, null, 2));
        }

        // Check if test passed
        const success = parsedResponse?.success !== false && result.status === 'completed';

        if (success) {
            console.log(`✅ [Appwrite] Successfully fetched data for ${name}`);
            return {
                data: {
                    ...parsedResponse.data,
                    assetLink: parsedResponse.data?.assetLink || searchUrl,
                    searchUrl: searchUrl,
                    source: 'appwrite'
                }
            };
        } else {
            console.log(`❌ [Appwrite] Failed to fetch data for ${name}`);
            if (result.stderr) {
                console.log(`\n📛 Error logs:`);
                console.log(result.stderr);
            }
            return {
                data: {
                    assetLink: searchUrl,
                    content: null,
                    error: 'Failed to fetch data from Appwrite'
                }
            };
        }

    } catch (err) {
        console.error('❌ Error in getCandidateData:', err.message);
        console.error(err.stack);
        return {
            data: {
                assetLink: `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`,
                content: null,
                error: err.message
            }
        };
    }
}
