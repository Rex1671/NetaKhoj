
import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';
import fileStorage from '../utils/fileStorage.js';

const logger = createLogger('CANDIDATE');
const cache = new NodeCache({ 
  stdTTL: 7200,        
  checkperiod: 600,
  useClones: false 
});

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

class CandidateServiceError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'CandidateServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class CandidateTimeoutError extends CandidateServiceError {
  constructor(timeout) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT', 408);
    this.name = 'CandidateTimeoutError';
  }
}

class CandidateNotFoundError extends CandidateServiceError {
  constructor(name) {
    super(`Candidate not found: ${name}`, 'NOT_FOUND', 404);
    this.name = 'CandidateNotFoundError';
  }
}

// ============================================================================
// REQUEST DEDUPLICATOR (Prevents duplicate simultaneous requests)
// ============================================================================

class RequestDeduplicator {
  constructor() {
    this.pending = new Map();
  }

  async deduplicate(key, fn) {
    // If request is already in flight, wait for it
    if (this.pending.has(key)) {
      logger.debug('DEDUP', `Reusing in-flight request: ${key}`);
      return this.pending.get(key);
    }

    // Execute new request
    const promise = fn()
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  clear() {
    this.pending.clear();
  }

  getStats() {
    return {
      pendingRequests: this.pending.size,
      keys: Array.from(this.pending.keys())
    };
  }
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class CandidateMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      timeouts: 0,
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
    
    if (error instanceof CandidateTimeoutError) {
      this.metrics.timeouts++;
    }

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
      avgResponseTime: `${avgResponseTime}ms`,
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
      timeouts: 0,
      totalResponseTime: 0,
      errors: {},
      lastRequest: null,
      lastSuccess: null,
      lastError: null
    };
  }
}

// ============================================================================
// CANDIDATE SERVICE
// ============================================================================

class CandidateService {
  constructor() {
    this.config = {
      endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      projectId: process.env.APPWRITE_PROJECT_ID,
      functionId: process.env.APPWRITE_FUNCTION_ID,
      apiKey: process.env.APPWRITE_API_KEY,
      timeout: parseInt(process.env.CANDIDATE_TIMEOUT) || 20000,
      retryAttempts: parseInt(process.env.CANDIDATE_RETRY_ATTEMPTS) || 2,
      retryDelay: parseInt(process.env.CANDIDATE_RETRY_DELAY) || 1000,
      myNetaBaseUrl: 'https://www.myneta.info'
    };

    this.metrics = new CandidateMetrics();
    this.deduplicator = new RequestDeduplicator();
    
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

    this.enabled = true;
  }

  _initialize() {
    if (!this.enabled) return;

    const { endpoint, functionId } = this.config;
    this.functionUrl = `${endpoint}/functions/${functionId}/executions`;

    logger.info('INIT', 'Candidate service initialized', {
      endpoint: this.functionUrl,
      timeout: this.config.timeout,
      cacheTime: cache.options.stdTTL
    });
  }

  // ========================================================================
  // ENCRYPTION/DECRYPTION METHODS
  // ========================================================================

  _encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('fixkaroweb3.0secretkey', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  _decrypt(encryptedText) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync('fixkaroweb3.0secretkey', 'salt', 32);
      const parts = encryptedText.split(':');
      if (parts.length !== 2) return null;
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return null;
    }
  }

  async _storeMapping(encryptedMeow, originalMeow, encryptedBhaw, originalBhaw) {
    try {
      const mappingFile = 'meow_bhaw_mappings.json';
      let mappings = {};

      // Load existing mappings
      try {
        const existing = await fileStorage.getFile(mappingFile);
        if (existing.found) {
          mappings = JSON.parse(existing.data);
        }
      } catch (error) {
        // File doesn't exist, start fresh
      }

      // Add new mapping
      mappings[encryptedMeow] = { meow: originalMeow, bhaw: originalBhaw };

      // Save updated mappings
      await fileStorage.saveFile(mappingFile, JSON.stringify(mappings, null, 2));
    } catch (error) {
      logger.error('MAPPING', 'Failed to store mapping', error);
    }
  }

  async _getMapping(encryptedMeow) {
    try {
      const mappingFile = 'meow_bhaw_mappings.json';
      const existing = await fileStorage.getFile(mappingFile);
      if (existing.found) {
        const mappings = JSON.parse(existing.data);
        return mappings[encryptedMeow] || null;
      }
    } catch (error) {
      logger.error('MAPPING', 'Failed to get mapping', error);
    }
    return null;
  }

  // ========================================================================
  // MAIN METHOD - WITH VALIDATION
  // ========================================================================

  async getCandidateData(name, constituency = '', party = '', meow = '', bhaw = '') {
    const requestId = this._generateRequestId();

    // Validate input
    if (!name || name.trim() === '') {
      logger.error(requestId, 'Candidate name is required');
      return this._getErrorResponse('Candidate name is required');
    }

    if (!this.enabled) {
      logger.warn(requestId, 'Service not configured');
      return this._getErrorResponse('Service not configured');
    }

    this.metrics.recordRequest();

    const normalizedName = name.trim();

    // Decode encrypted meow and bhaw if provided
    let decodedMeow = meow;
    let decodedBhaw = bhaw;

    if (meow && meow.includes(':')) {
      const mapping = await this._getMapping(meow);
      if (mapping) {
        decodedMeow = mapping.meow;
        decodedBhaw = mapping.bhaw;
        logger.debug(requestId, 'Decoded encrypted meow/bhaw', { decodedMeow, decodedBhaw });
      } else {
        logger.warn(requestId, 'Could not decode encrypted meow', { meow });
      }
    }

    const cacheKey = this._getCacheKey(normalizedName, constituency, party);

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      this.metrics.recordCacheHit();
      logger.success(requestId, `Cache hit: ${normalizedName}`);
      return cached;
    }

    this.metrics.recordCacheMiss();

    // Deduplicate simultaneous requests
    return this.deduplicator.deduplicate(cacheKey, async () => {
      return await this._fetchCandidateData(requestId, {
        name: normalizedName,
        constituency,
        party,
        meow: decodedMeow,
        bhaw: decodedBhaw
      });
    });
  }

  // ========================================================================
  // FETCH WITH RETRY
  // ========================================================================

  async _fetchCandidateData(requestId, params, attempt = 1) {
    const startTime = Date.now();

    try {
      logger.info(requestId, `Attempt ${attempt}/${this.config.retryAttempts + 1}`, {
        name: params.name,
        constituency: params.constituency || 'N/A',
        party: params.party || 'N/A'
      });

      const data = await this._executeFetch(requestId, params);
      const duration = Date.now() - startTime;

      this.metrics.recordSuccess(duration);
      logger.success(requestId, `Data fetched in ${duration}ms`, {
        name: params.name,
        hasAssets: !!data.data?.assets,
        hasCriminalCases: !!data.data?.criminalCases
      });

      // Cache successful result
      const cacheKey = this._getCacheKey(params.name, params.constituency, params.party);
      cache.set(cacheKey, data);

      return data;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Don't retry on certain errors
      if (error instanceof CandidateTimeoutError || 
          error instanceof CandidateNotFoundError ||
          attempt > this.config.retryAttempts) {
        
        this.metrics.recordFailure(error);
        logger.error(requestId, `Failed after ${attempt} attempt(s)`, {
          duration,
          error: error.message
        });

        return this._getErrorResponse(error.message, params.name);
      }

      // Exponential backoff
      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      logger.warn(requestId, `Retrying in ${delay}ms...`, {
        attempt,
        error: error.message
      });

      await this._sleep(delay);
      return this._fetchCandidateData(requestId, params, attempt + 1);
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
      const requestBody = {
        async: false,
        body: JSON.stringify({
          test: 'search',
          name: params.name,
          constituency: params.constituency,
          party: params.party,
          meow: params.meow,
          bhaw: params.bhaw
        })
      };

      logger.debug(requestId, 'Sending request to Appwrite', {
        name: params.name,
        hasConstituency: !!params.constituency,
        hasParty: !!params.party
      });

      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: this._getHeaders(),
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new CandidateServiceError(
          `HTTP ${response.status}: ${errorText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const result = await response.json();
      return await this._parseResponse(requestId, result, params.name);

    } catch (error) {
      clearTimeout(timeout);

      if (error.name === 'AbortError') {
        throw new CandidateTimeoutError(this.config.timeout);
      }

      throw error;
    }
  }

  // ========================================================================
  // RESPONSE PARSING
  // ========================================================================

  async _parseResponse(requestId, result, name) {
    logger.debug(requestId, 'Parsing response', {
      status: result.status,
      duration: result.duration,
      hasResponseBody: !!result.responseBody
    });

    let parsedResponse;
    try {
      parsedResponse = typeof result.responseBody === 'string'
        ? JSON.parse(result.responseBody)
        : result.responseBody;
    } catch (error) {
      logger.error(requestId, 'Failed to parse response body', error);
      parsedResponse = result.responseBody;
    }

    const success = parsedResponse?.success !== false && result.status === 'completed';

    if (!success) {
      if (result.stderr) {
        logger.error(requestId, 'Appwrite function error', { stderr: result.stderr });
      }

      if (parsedResponse?.error?.includes('not found') ||
          parsedResponse?.data?.error?.includes('not found')) {
        throw new CandidateNotFoundError(name);
      }

      throw new CandidateServiceError(
        parsedResponse?.error || 'Failed to fetch data from Appwrite',
        'EXECUTION_FAILED',
        500
      );
    }

    const searchUrl = this._getSearchUrl(name);
    const candidateData = parsedResponse.data || {};

    // Extract meow and bhaw from assetLink if present
    let meow = '';
    let bhaw = '';

    if (candidateData.assetLink) {
      const urlMatch = candidateData.assetLink.match(/\/([^\/]+)\/candidate\.php\?candidate_id=(\d+)/);
      if (urlMatch) {
        bhaw = urlMatch[1]; // e.g., Karnataka2023
        meow = urlMatch[2]; // e.g., 8264
      }
    }

    // Encrypt meow and bhaw if extracted
    let encryptedMeow = '';
    let encryptedBhaw = '';

    if (meow && bhaw) {
      encryptedMeow = this._encrypt(meow);
      encryptedBhaw = this._encrypt(bhaw);

      // Store mapping for future decoding
      await this._storeMapping(encryptedMeow, meow, encryptedBhaw, bhaw);

      logger.debug(requestId, 'Encrypted meow/bhaw', { encryptedMeow: encryptedMeow.substring(0, 20) + '...', encryptedBhaw: encryptedBhaw.substring(0, 20) + '...' });
    }

    return {
      data: {
        ...candidateData,
        meow: encryptedMeow,
        bhaw: encryptedBhaw,
        searchUrl: searchUrl,
        source: 'appwrite',
        timestamp: new Date().toISOString()
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

  _getCacheKey(name, constituency, party) {
    const parts = [
      'candidate',
      name.toLowerCase().trim(),
      constituency?.toLowerCase().trim() || '',
      party?.toLowerCase().trim() || ''
    ];
    
    const keyString = parts.filter(Boolean).join(':');
    if (keyString.length > 100) {
      return 'candidate:' + crypto.createHash('md5').update(keyString).digest('hex');
    }
    
    return keyString;
  }

  _generateRequestId() {
    return `cand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _getSearchUrl(name) {
    return `${this.config.myNetaBaseUrl}/search_myneta.php?q=${encodeURIComponent(name)}`;
  }

  _getErrorResponse(errorMessage, name = '') {
    const searchUrl = name ? this._getSearchUrl(name) : null;
    
    return {
      data: {
        assetLink: searchUrl,
        content: null,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
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
      cache: {
        ...cache.getStats(),
        size: cache.keys().length
      },
      metrics: this.metrics.getStats(),
      deduplicator: this.deduplicator.getStats(),
      config: {
        endpoint: this.functionUrl,
        projectId: this.config.projectId ? `${this.config.projectId.slice(0, 8)}...` : 'not set',
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        cacheTime: cache.options.stdTTL
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
      await this._executeFetch('health-check', {
        name: 'Health Check',
        constituency: '',
        party: '',
        meow: '',
        bhaw: ''
      });
      const duration = Date.now() - startTime;

      return {
        status: 'healthy',
        healthy: true,
        responseTime: duration
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        healthy: false,
        error: error.message
      };
    }
  }

  resetMetrics() {
    this.metrics.reset();
    this.deduplicator.clear();
    logger.info('ADMIN', 'Metrics and deduplicator reset');
  }

  // ========================================================================
  // BATCH OPERATIONS (BONUS!)
  // ========================================================================

  async getCandidatesDataBatch(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new Error('Candidates array is required');
    }

    logger.info('BATCH', `Processing ${candidates.length} candidates`);

    const results = await Promise.allSettled(
      candidates.map(c => 
        this.getCandidateData(
          c.name, 
          c.constituency, 
          c.party, 
          c.meow, 
          c.bhaw
        )
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    logger.info('BATCH', `Completed: ${successful} success, ${failed} failed`);

    return results.map((result, index) => ({
      name: candidates[index].name,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

const candidateService = new CandidateService();

// Backward compatibility export
export async function getCandidateData(name, constituency = '', party = '', meow = '', bhaw = '') {
  return candidateService.getCandidateData(name, constituency, party, meow, bhaw);
}

export default candidateService;