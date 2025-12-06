
import { createLogger } from '../utils/logger.js';
import dotenv from 'dotenv';
import appwriteService from './AppwriteService.js';

dotenv.config();

const logger = createLogger('AppwriteDataFetcher');

export async function fetchFromAppwrite(payload, requestId = 'default') {
  try {
    const result = await appwriteService.executeFunction(payload, requestId);

    return {
      success: true,
      data: result.data.data || result.data,
      meta: result.data.meta,
      timing: result.data.timing,
      duration: result.timing.total,
      executionId: result.execution.id,
      status: result.execution.status,
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: 0,
    };
  }
}


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


export async function executeFunction(data, requestId) {
  const result = await fetchFromAppwrite(data, requestId);
  return result;
}

export function getStats() {
  return {
    ...appwriteService.getStats(),
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
