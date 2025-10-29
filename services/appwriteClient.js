import fetch from 'node-fetch';
import { AbortController } from 'abort-controller'; 

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

export async function fetchCandidateDataViaAppwrite(name, constituency = '', party = '', link = null) {
  try {
    console.log(`📡 [Appwrite] Fetching data for: ${name || link}`);
    
    if (!APPWRITE_PROJECT_ID || !APPWRITE_FUNCTION_ID || !APPWRITE_API_KEY) {
      throw new Error('Missing required Appwrite environment variables');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 120000); 

    try {
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
            body: JSON.stringify({ 
              name, 
              constituency, 
              party,
              link
            })
          }),
          signal: controller.signal 
        }
      );

      clearTimeout(timeout); 

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Appwrite] HTTP Error ${response.status}: ${errorText}`);
        throw new Error(`Appwrite API error ${response.status}: ${errorText}`);
      }

      const execution = await response.json();
      console.log(`✅ [Appwrite] Status: ${execution.status} (${execution.duration}s)`);

      if (execution.status === 'failed') {
        console.error(`❌ [Appwrite] Execution failed:`, execution.stderr);
        throw new Error(`Function execution failed: ${execution.stderr || 'Unknown error'}`);
      }

      if (execution.status !== 'completed') {
        console.warn(`⚠️ [Appwrite] Unexpected status: ${execution.status}`);
      }

      let result;
      try {
        result = JSON.parse(execution.responseBody);
      } catch (parseError) {
        console.error(`❌ [Appwrite] Failed to parse response:`, execution.responseBody);
        throw new Error(`Invalid JSON response from function: ${parseError.message}`);
      }
      
      return {
        success: result.success,
        data: result.data,
        candidateUrl: result.candidateUrl || null, 
        metadata: {
          ...result.metadata,
          appwriteDuration: execution.duration,
          appwriteStatus: execution.status,
          source: 'appwrite'
        }
      };

    } finally {
      clearTimeout(timeout); 
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ [Appwrite] Request timeout after 120 seconds');
      throw new Error('Request timeout: Function execution took too long');
    }
    
    console.error('❌ [Appwrite] Call failed:', error.message);
    throw error;
  }
}

export function isAppwriteConfigured() {
  return !!(APPWRITE_PROJECT_ID && APPWRITE_FUNCTION_ID && APPWRITE_API_KEY);
}

export async function testAppwriteConnection() {
  try {
    console.log('\n🧪 Testing Appwrite connection...');
    console.log(`📍 Endpoint: ${APPWRITE_ENDPOINT}`);
    console.log(`🆔 Project ID: ${APPWRITE_PROJECT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`⚡ Function ID: ${APPWRITE_FUNCTION_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`🔑 API Key: ${APPWRITE_API_KEY ? '✅ Set' : '❌ Missing'}`);
    
    if (!isAppwriteConfigured()) {
      throw new Error('Appwrite not properly configured');
    }
    
    const result = await fetchCandidateDataViaAppwrite('Test Candidate');
    console.log('✅ Appwrite connection successful!\n');
    return result;
  } catch (error) {
    console.error('❌ Appwrite connection failed:', error.message, '\n');
    throw error;
  }
}