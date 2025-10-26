import fetch from 'node-fetch';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

export async function fetchCandidateDataViaAppwrite(name, constituency = '', party = '') {
  try {
    console.log(`📡 [Appwrite] Fetching data for: ${name}`);

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
          async: false, // Wait for result
          body: JSON.stringify({ 
            test: 'search',  // Use the working test
            name, 
            constituency, 
            party 
          })
        }),
        timeout: 120000 // 2 minutes
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Appwrite error ${response.status}: ${errorText}`);
    }

    const execution = await response.json();
    console.log(`✅ [Appwrite] Status: ${execution.status} (${execution.duration}s)`);

    if (execution.status === 'failed') {
      console.error(`❌ [Appwrite] Execution failed:`, execution.stderr);
      throw new Error(`Execution failed: ${execution.stderr || 'Unknown error'}`);
    }

    // Parse the response body
    const result = JSON.parse(execution.responseBody);
    
    // Return in the format your Railway app expects
    return {
      success: result.success,
      data: result.data,
      metadata: {
        ...result.metadata,
        appwriteDuration: execution.duration,
        source: 'appwrite'
      }
    };

  } catch (error) {
    console.error('❌ [Appwrite] Call failed:', error.message);
    throw error;
  }
}