import * as sdk from 'node-appwrite';
import { createLogger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('AppwriteDataFetcher');

// ============================================================================
// CONFIGURATION
// ============================================================================

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '65c4e9c5c54471be7a7f';
const API_KEY = process.env.APPWRITE_API_KEY;
const FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID_PRS || '68ffcb25003df2ce3663';

// ============================================================================
// INITIALIZE APPWRITE CLIENT
// ============================================================================

const client = new sdk.Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const functions = new sdk.Functions(client);

// ============================================================================
// MAIN FETCH FUNCTION
// ============================================================================

/**
 * @param {Object} payload
 * @param {string} requestId 
 * @returns {Promise<Object>} 
 */
export async function fetchFromAppwrite(payload, requestId = 'default') {
  const startTime = Date.now();
  
  try {
    logger.info(requestId, 'Making Appwrite SDK request', payload);

    const execution = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify(payload),
      false,
      '/', 
      'POST', 
      {}
    );

    const duration = Date.now() - startTime;

    logger.success(requestId, `Appwrite completed in ${duration}ms`, {
      executionId: execution.$id,
      status: execution.status
    });

    let responseData;
    try {
      responseData = JSON.parse(execution.responseBody);
    } catch (parseError) {
      logger.error(requestId, 'Failed to parse response body', parseError);
      throw new Error('Invalid JSON response from Appwrite function');
    }

    if (responseData.success === false) {
      throw new Error(responseData.error || 'Appwrite function returned error');
    }

    return {
      success: true,
      data: responseData.data || responseData,
      meta: responseData.meta,
      timing: responseData.timing,
      duration,
      executionId: execution.$id,
      status: execution.status,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(requestId, 'Appwrite request failed', { 
      duration, 
      error: error.message 
    });

    return {
      success: false,
      error: error.message,
      duration,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * @param {string} name
 * @param {string} type 
 * @param {string} constituency
 * @param {string} state 
 * @returns {Promise<Object>} 
 */
export async function getMemberData(name, type, constituency = null, state = null) {
  const payload = {
    name,
    type,
  };

  if (constituency) payload.constituency = constituency;
  if (state) payload.state = state;

  const result = await fetchFromAppwrite(payload, `member-${name}`);

  if (result.success) {
    return {
      found: true,
      ...result.data,
      _meta: result.meta,
      _timing: result.timing,
    };
  }
  
  throw new Error(result.error || 'Failed to fetch member data');
}

/**
 * @param {string} name 
 * @param {string} constituency 
 * @param {string} party
 * @returns {Promise<Object>} 
 */
export async function getCandidateData(name, constituency, party) {
  const payload = {
    action: 'getCandidateData',
    name,
    constituency,
    party,
  };

  const result = await fetchFromAppwrite(payload, `candidate-${name}`);

  if (result.success) {
    return result.data;
  }
  
  throw new Error(result.error || 'Failed to fetch candidate data');
}

/**
 * @param {Object} data
 * @param {string} requestId 
 * @returns {Promise<Object>}
 */
export async function executeFunction(data, requestId) {
  const result = await fetchFromAppwrite(data, requestId);
  return result;
}

export function getStats() {
  return {
    endpoint: APPWRITE_ENDPOINT,
    projectId: PROJECT_ID,
    functionId: FUNCTION_ID,
    configured: !!(PROJECT_ID && API_KEY && FUNCTION_ID),
    sdkVersion: 'node-appwrite',
  };
}

export async function testConnection() {
  try {
    const result = await fetchFromAppwrite({ 
      name: 'TEST', 
      type: 'MP' 
    }, 'health-check');
    
    return {
      healthy: result.success,
      message: result.success ? 'Connected to Appwrite' : result.error,
    };
  } catch (error) {
    return {
      healthy: false,
      message: error.message,
    };
  }
}