import dotenv from 'dotenv';
dotenv.config();

import NodeCache from 'node-cache';
import fetch from 'node-fetch';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('APPWRITE-PRS');
const cache = new NodeCache({ 
  stdTTL: 3600,           
  checkperiod: 600,      
  useClones: false        
});

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

class AppwriteError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'AppwriteError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class AppwriteTimeoutError extends AppwriteError {
  constructor(timeout) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT', 408);
    this.name = 'AppwriteTimeoutError';
  }
}

class AppwriteConfigError extends AppwriteError {
  constructor(message) {
    super(message, 'CONFIG_ERROR', 500);
    this.name = 'AppwriteConfigError';
  }
}

// ============================================================================
// CIRCUIT BREAKER (Prevents cascading failures)
// ============================================================================

class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error('CIRCUIT', 'Circuit breaker opened', {
        failures: this.failures,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      });
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null
    };
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class MetricsCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalResponseTime: 0,
      errors: {},
      lastRequest: null,
      lastSuccess: null,
      lastError: null
    };
  }

  recordRequest() {
    this.metrics.totalRequests++;
    this.metrics.lastRequest = new Date().toISOString();
  }

  recordSuccess(duration) {
    this.metrics.successfulRequests++;
    this.metrics.totalResponseTime += duration;
    this.metrics.lastSuccess = new Date().toISOString();
  }

  recordFailure(error) {
    this.metrics.failedRequests++;
    const errorType = error.name || 'UnknownError';
    this.metrics.errors[errorType] = (this.metrics.errors[errorType] || 0) + 1;
    this.metrics.lastError = {
      timestamp: new Date().toISOString(),
      type: errorType,
      message: error.message
    };
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  getStats() {
    const avgResponseTime = this.metrics.successfulRequests > 0
      ? Math.round(this.metrics.totalResponseTime / this.metrics.successfulRequests)
      : 0;

    const successRate = this.metrics.totalRequests > 0
      ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)
      : 0;

    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      avgResponseTime,
      successRate: `${successRate}%`,
      cacheHitRate: `${cacheHitRate}%`
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalResponseTime: 0,
      errors: {},
      lastRequest: null,
      lastSuccess: null,
      lastError: null
    };
  }
}

// ============================================================================
// APPWRITE PRS SERVICE
// ============================================================================

class AppwritePRSService {
  constructor() {
    this.config = {
      endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      projectId: process.env.APPWRITE_PROJECT_ID,
      functionId: process.env.APPWRITE_FUNCTION_ID_PRS,
      apiKey: process.env.APPWRITE_API_KEY,
      timeout: parseInt(process.env.APPWRITE_TIMEOUT) || 15000,
      retryAttempts: parseInt(process.env.APPWRITE_RETRY_ATTEMPTS) || 2,
      retryDelay: parseInt(process.env.APPWRITE_RETRY_DELAY) || 1000
    };

    this.circuitBreaker = new CircuitBreaker(5, 60000);
    this.metrics = new MetricsCollector();
    
    this._validateConfig();
    this._initialize();
  }

  _validateConfig() {
    const { projectId, functionId } = this.config;

    if (!projectId || !functionId) {
      logger.warn('CONFIG', 'Missing PROJECT_ID or FUNCTION_ID - service disabled');
      this.enabled = false;
      return;
    }

    if (projectId.length < 10) {
      throw new AppwriteConfigError('Invalid PROJECT_ID format');
    }

    if (functionId.length < 10) {
      throw new AppwriteConfigError('Invalid FUNCTION_ID format');
    }

    this.enabled = true;
  }

  _initialize() {
    if (!this.enabled) return;

    const { endpoint, functionId } = this.config;
    this.functionUrl = `${endpoint}/functions/${functionId}/executions`;

    logger.info('INIT', 'Service initialized', {
      endpoint: this.functionUrl,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts
    });
  }

  // ========================================================================
  // MAIN METHOD
  // ========================================================================

  async getMemberData(name, type, constituency = null, state = null) {
    if (!this.enabled) {
      logger.warn('DISABLED', 'Service not configured');
      return this._getEmptyResponse();
    }

    const requestId = this._generateRequestId();
    this.metrics.recordRequest();

    const cacheKey = this._getCacheKey(name, type, constituency);
    const cached = cache.get(cacheKey);
    
    if (cached) {
      this.metrics.recordCacheHit();
      logger.success(requestId, `Cache hit: ${name}`, { type, constituency });
      return cached;
    }

    this.metrics.recordCacheMiss();

    try {
      const data = await this.circuitBreaker.execute(async () => {
        return await this._fetchWithRetry(requestId, {
          name,
          type,
          constituency: constituency || '',
          state: state || ''
        });
      });

      if (data.found && data.party !== 'Unknown') {
        cache.set(cacheKey, data);
        logger.success(requestId, `Data fetched and cached: ${name}`, {
          party: data.party,
          constituency: data.constituency
        });
      }

      return data;

    } catch (error) {
      this.metrics.recordFailure(error);
      logger.error(requestId, 'Failed to fetch data', error);
      return this._getEmptyResponse();
    }
  }

  // ========================================================================
  // FETCH WITH RETRY LOGIC
  // ========================================================================

  async _fetchWithRetry(requestId, params, attempt = 1) {
    const startTime = Date.now();

    try {
      logger.info(requestId, `Attempt ${attempt}/${this.config.retryAttempts + 1}`, params);

      const data = await this._executeFetch(requestId, params);
      const duration = Date.now() - startTime;
      
      this.metrics.recordSuccess(duration);
      logger.success(requestId, `Response received in ${duration}ms`);
      
      return data;

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof AppwriteTimeoutError || attempt > this.config.retryAttempts) {
        logger.error(requestId, `Failed after ${attempt} attempt(s)`, {
          duration,
          error: error.message
        });
        throw error;
      }

      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      logger.warn(requestId, `Retrying in ${delay}ms...`, {
        attempt,
        error: error.message
      });

      await this._sleep(delay);
      return this._fetchWithRetry(requestId, params, attempt + 1);
    }
  }

  // ========================================================================
  // CORE FETCH LOGIC
  // ========================================================================

  async _executeFetch(requestId, params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);

    try {
      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(params),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppwriteError(
          `HTTP ${response.status}: ${errorText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const result = await response.json();
      return this._parseResponse(requestId, result, params.type);

    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new AppwriteTimeoutError(this.config.timeout);
      }

      throw error;
    }
  }

  // ========================================================================
  // RESPONSE PARSING
  // ========================================================================
_parseResponse(requestId, result, type) {
  logger.debug(requestId, 'Raw Appwrite execution result', {
    status: result.status,
    hasResponseBody: !!result.responseBody,
    hasResponse: !!result.response,
    responseBodyType: typeof result.responseBody
  });

  // ✅ Appwrite Functions API returns 'responseBody', not 'response'
  let responseData;
  
  if (result.responseBody) {
    try {
      responseData = typeof result.responseBody === 'string'
        ? JSON.parse(result.responseBody)
        : result.responseBody;
      
      logger.debug(requestId, 'Parsed responseBody successfully', {
        success: responseData.success,
        hasData: !!responseData.data,
        dataKeys: responseData.data ? Object.keys(responseData.data).length : 0
      });
    } catch (error) {
      logger.error(requestId, 'Failed to parse responseBody', {
        error: error.message,
        responseBody: result.responseBody?.substring(0, 200)
      });
      return this._getEmptyResponse();
    }
  } 
  // Fallback to 'response' (for direct function calls via Postman)
  else if (result.response) {
    try {
      responseData = typeof result.response === 'string'
        ? JSON.parse(result.response)
        : result.response;
    } catch (error) {
      logger.error(requestId, 'Failed to parse response', error);
      return this._getEmptyResponse();
    }
  }
  // If called directly (not via execution endpoint)
  else if (result.success) {
    responseData = result;
  }
  else {
    logger.error(requestId, 'No valid response found', {
      keys: Object.keys(result)
    });
    return this._getEmptyResponse();
  }

  // Validate response structure
  if (!responseData.success) {
    logger.warn(requestId, 'Function returned success=false', {
      error: responseData.error || 'Unknown error'
    });
    return this._getEmptyResponse();
  }

  if (!responseData.data) {
    logger.warn(requestId, 'Response missing data field', {
      responseKeys: Object.keys(responseData)
    });
    return this._getEmptyResponse();
  }

  // ✅ Log the actual data we received
  logger.info(requestId, 'Valid PRS data received from Appwrite', {
    name: responseData.data.name,
    party: responseData.data.party,
    constituency: responseData.data.constituency,
    attendance: responseData.data.attendance,
    age: responseData.data.age,
    totalFields: Object.keys(responseData.data).length
  });

  // ✅ Normalize the flat data structure into nested format
  const normalized = this._normalizeData(responseData.data, type);
  
  logger.success(requestId, 'Data normalized successfully', {
    found: normalized.found,
    party: normalized.party,
    hasPersonal: Object.keys(normalized.personal).length,
    hasPerformance: Object.keys(normalized.performance).length
  });

  return normalized;
}

  _normalizeData(data, type) {
  // ✅ Appwrite returns flat data, we structure it for frontend
  return {
    found: true,
    source: 'appwrite-prs',
    memberType: type,
    name: data.name || '',
    imageUrl: data.imageUrl || '',
    state: data.state || 'Unknown',
    constituency: data.constituency || 'Unknown',
    party: data.party || 'Unknown',
    
    personal: {
      age: data.age || '',
      gender: data.gender || '',
      education: data.education || '',
      termStart: data.termStart || '',
      termEnd: data.termEnd || '',
      noOfTerm: data.noOfTerm || '',
      membership: data.membership || ''
    },
    
    performance: {
      attendance: data.attendance || '',
      natAttendance: data.natAttendance || '',
      stateAttendance: data.stateAttendance || '',
      debates: data.debates || '',
      natDebates: data.natDebates || '',
      stateDebates: data.stateDebates || '',
      questions: data.questions || '',
      natQuestions: data.natQuestions || '',
      stateQuestions: data.stateQuestions || '',
      pmb: data.pmb || '',
      natPMB: data.natPMB || '',
      statePMB: data.statePMB || ''
    },
    
    tables: {
      attendance: data.attendanceTable || '',
      debates: data.debatesTable || '',
      questions: data.questionsTable || ''
    }
  };
}

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': this.config.projectId
    };

    if (this.config.apiKey) {
      headers['X-Appwrite-Key'] = this.config.apiKey;
    }

    return headers;
  }

  _getCacheKey(name, type, constituency) {
    const parts = [
      'appwrite-prs',
      type,
      name.toLowerCase().trim(),
      constituency?.toLowerCase().trim() || ''
    ];
    return parts.filter(Boolean).join(':');
  }

  _generateRequestId() {
    return `aws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _getEmptyResponse() {
    return {
      found: false,
      source: 'appwrite-prs',
      imageUrl: '',
      state: 'Unknown',
      constituency: 'Unknown',
      party: 'Unknown',
      personal: {},
      performance: {},
      tables: {}
    };
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================================================
  // PUBLIC UTILITY METHODS
  // ========================================================================

  clearCache(pattern) {
    if (pattern) {
      const keys = cache.keys().filter(key => key.includes(pattern));
      cache.del(keys);
      logger.info('CACHE', `Cleared ${keys.length} entries`, { pattern });
    } else {
      const keyCount = cache.keys().length;
      cache.flushAll();
      logger.info('CACHE', `Cleared all ${keyCount} entries`);
    }
  }

  getStats() {
    return {
      enabled: this.enabled,
      cache: cache.getStats(),
      metrics: this.metrics.getStats(),
      circuitBreaker: this.circuitBreaker.getState(),
      config: {
        endpoint: this.functionUrl,
        projectId: this.config.projectId ? `${this.config.projectId.slice(0, 8)}...` : 'not set',
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts
      }
    };
  }

  async healthCheck() {
    if (!this.enabled) {
      return {
        status: 'disabled',
        message: 'Service not configured',
        healthy: false
      };
    }

    try {
      const startTime = Date.now();
      const testData = await this._executeFetch('health-check', {
        name: 'Health Check',
        type: 'MP',
        constituency: '',
        state: ''
      });
      const duration = Date.now() - startTime;

      return {
        status: 'healthy',
        healthy: true,
        responseTime: duration,
        circuitBreaker: this.circuitBreaker.getState().state
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        healthy: false,
        error: error.message,
        circuitBreaker: this.circuitBreaker.getState().state
      };
    }
  }

  resetMetrics() {
    this.metrics.reset();
    this.circuitBreaker.reset();
    logger.info('ADMIN', 'Metrics and circuit breaker reset');
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export default new AppwritePRSService();