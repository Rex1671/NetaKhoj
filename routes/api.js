import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { memberQueryValidator, candidateQueryValidator } from '../middleware/validator.js';
import { scraperLimiter } from '../middleware/rateLimiter.js';
import { 
  fetchFromAppwrite, 
  getMemberData as fetchMemberFromAppwrite,
  getCandidateData as fetchCandidateFromAppwrite,
  getStats as getAppwriteStats 
} from '../services/appwriteDataFetcher.js';
import candidateService from '../services/candidateService.js';
import prsService from '../services/prsService.js';
import cacheService from '../services/cacheService.js';
import browserPool from '../services/browserPool.js';
import fileStorage from '../utils/fileStorage.js';
import imageProxy from '../services/imageProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// ============================================================================
// APPWRITE RESPONSE LOGGER
// ============================================================================

function logAppwriteResponse(functionName, params, response) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    functionName,
    params,
    response,
    responseSize: JSON.stringify(response).length
  };
  
  const logPath = path.join(__dirname, '..', 'appwriteresponse.txt');
  const logLine = `\n${'='.repeat(80)}\n${JSON.stringify(logEntry, null, 2)}\n`;
  
  fs.appendFileSync(logPath, logLine, 'utf8');
  console.log(`[APPWRITE] ${functionName} - Response logged to appwriteresponse.txt`);
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIG = {
  TIMEOUTS: {
    APPWRITE_PRIMARY: 20_000,
    APPWRITE_SECONDARY: 25_000,
    LOCAL_PRS: 25_000,
    CANDIDATE: 10_000,
  },
  DATA_PATHS: {
    ASSEMBLY: 'india_assembly.geojson',
    PARLIAMENTARY: 'india_parliamentary.geojson',
    ALL_DATA: 'all_data.json',
    RAJYA_SABHA: 'rajya_sabha.json',
  },
  STORAGE_MAX_AGE: 24 * 60 * 60 * 1000,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateRequestId = () => crypto.randomBytes(8).toString('hex');

const loadStaticFile = (filename) => {
  const filepath = path.join(__dirname, '..', 'data', 
    filename.includes('geojson') ? 'geojson' : '', filename);
  
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filename}`);
  }
  
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
};

const withCache = async (cacheType, cacheKey, loader) => {
  let data = await cacheService.get(cacheType, cacheKey);
  if (!data) {
    data = await loader();
    cacheService.set(cacheType, cacheKey, data);
  }
  return data;
};

const createTimeoutPromise = (ms, errorMsg) => 
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error(errorMsg)), ms)
  );

// ============================================================================
// SMART DATA MERGER
// ============================================================================

function needsUpdate(value) {
  return !value || 
         value === 'N/A' || 
         value === 'Unknown' || 
         value === 'null' || 
         value === 'undefined' ||
         value === '' ||
         String(value).trim() === '';
}

function smartMergeField(target, source, field, targetLocation = null) {
  let currentValue;
  let targetObj = target;
  
  if (targetLocation === 'personal') {
    if (!target.personal) target.personal = {};
    currentValue = target.personal[field];
    targetObj = target.personal;
  } else if (targetLocation === 'performance') {
    if (!target.performance) target.performance = {};
    currentValue = target.performance[field];
    targetObj = target.performance;
  } else {
    currentValue = target[field];
  }
  
  const sourceValue = source[field];
  
  if (needsUpdate(currentValue) && !needsUpdate(sourceValue)) {
    targetObj[field] = sourceValue;
    return true;
  }
  
  return false;
}

// ============================================================================
// DATA VALIDATION
// ============================================================================

function validateAppwritePrsData(data) {
  return data?.found || (data?.name && data?.party && data.party !== 'Unknown');
}

function validateLocalPrsData(data) {
  return data?.found && data?.html && data.html.length > 0;
}

function validateCandidateData(data) {
  return data && !data.error && (data.candidate || data.movableAssets || data.criminalCases);
}

// ============================================================================
// DATA MERGING FUNCTIONS
// ============================================================================

function mergeAppwritePrs(target, data) {
  if (data.name) target.name = data.name;
  if (data.imageUrl && !target.imageUrl) target.imageUrl = data.imageUrl;
  if (data.state) target.state = data.state;
  if (data.constituency) target.constituency = data.constituency;
  if (data.party) target.party = data.party;
  
  if (!target.personal) target.personal = {};
  const personalFields = ['age', 'gender', 'education', 'termStart', 'termEnd', 'noOfTerm', 'membership'];
  personalFields.forEach(field => {
    if (data[field] && needsUpdate(target.personal[field])) {
      target.personal[field] = data[field];
    }
  });
  
  if (!target.performance) target.performance = {};
  const performanceFields = [
    'attendance', 'natAttendance', 'stateAttendance',
    'debates', 'natDebates', 'stateDebates',
    'questions', 'natQuestions', 'stateQuestions',
    'pmb', 'natPMB', 'statePMB'
  ];
  performanceFields.forEach(field => {
    if (data[field] && needsUpdate(target.performance[field])) {
      target.performance[field] = data[field];
    }
  });
  
  if (data.attendanceTable) target.attendanceTable = data.attendanceTable;
  if (data.debatesTable) target.debatesTable = data.debatesTable;
  if (data.questionsTable) target.questionsTable = data.questionsTable;
}

function mergeLocalPrs(target, data) {
  Object.assign(target, {
    html: data.html || '',
    imageUrl: data.imageUrl || target.imageUrl || '',
    state: data.state || target.state || 'Unknown',
    constituency: data.constituency || target.constituency || 'Unknown',
    party: data.party || target.party || 'Unknown',
  });
  
  if (data.performance) {
    target.performance = { ...target.performance, ...data.performance };
  }
  
  if (data.personal) {
    target.personal = { ...target.personal, ...data.personal };
  }
}

function mergeCandidate(target, data) {
  // Set encrypted meow and bhaw at top level
  if (data.meow) target.meow = data.meow;
  if (data.bhaw) target.bhaw = data.bhaw;

  // Clean and proxy the candidate data
  const cleanedCandidateData = { ...data };

  // Remove unwanted fields
  delete cleanedCandidateData.searchUrl;
  delete cleanedCandidateData.timestamp;
  delete cleanedCandidateData.fetchedAt;
  delete cleanedCandidateData.metadata;

  // Proxy image URLs in candidate data
  if (cleanedCandidateData.imageUrl) {
    const baseUrl = target._req ? `${target._req.protocol}://${target._req.get('host')}` : '';
    const proxyUrl = imageProxy.createProxyUrl(cleanedCandidateData.imageUrl, baseUrl);
    if (proxyUrl) {
      cleanedCandidateData.imageUrl = proxyUrl;
      cleanedCandidateData._imageProxied = true;
    }
  }

  // Proxy image URL in nested candidate object
  if (cleanedCandidateData.candidate && cleanedCandidateData.candidate.imageUrl) {
    const baseUrl = target._req ? `${target._req.protocol}://${target._req.get('host')}` : '';
    const proxyUrl = imageProxy.createProxyUrl(cleanedCandidateData.candidate.imageUrl, baseUrl);
    if (proxyUrl) {
      cleanedCandidateData.candidate.imageUrl = proxyUrl;
      cleanedCandidateData.candidate._imageProxied = true;
    }
  }

  target.candidateData = cleanedCandidateData;

  if (!target.personal) target.personal = {};

  if (data.candidate) {
    if (needsUpdate(target.personal.age)) {
      target.personal.age = data.candidate.age;
    }
    if (needsUpdate(target.personal.education)) {
      target.personal.education = data.candidate.education;
    }
    if (needsUpdate(target.personal.gender)) {
      target.personal.gender = data.candidate.gender;
    }
  }

  const financialFields = [
    'assets', 'liabilities', 'immovableAssets',
    'movableAssets', 'incomeTax', 'criminalCases', 'aiSummary', 'summary'
  ];

  financialFields.forEach(field => {
    if (data[field]) target[field] = data[field];
  });
}

// ============================================================================
// MAIN DATA FETCHER
// ============================================================================

async function fetchAllData(params, requestId) {
  const { name, type, constituency, party, state, meow, bhaw } = params;
  const startTime = Date.now();
  
  const results = {
    appwritePrimary: null,
    localPrs: null,
    candidate: null,
  };

  const errors = {};
  let fromStorage = { prs: false, candidate: false };

  console.log(`[${requestId}] Fetching all data sources`, { name, type });

  // ========================================
  // CHECK STORAGE FIRST
  // ========================================
  
  try {
    const storedPrs = await fileStorage.getPrsData(name, type);
    if (storedPrs.found) {
      const age = Date.now() - new Date(storedPrs.data.timestamp).getTime();
      
      if (age < CONFIG.STORAGE_MAX_AGE) {
        results.appwritePrimary = storedPrs.data.data;
        fromStorage.prs = true;
        console.log(`[${requestId}] Using stored PRS data (age: ${Math.round(age / 1000 / 60)} minutes)`);
      }
    }

    const storedCandidate = await fileStorage.getCandidateData(name);
    if (storedCandidate.found) {
      const age = Date.now() - new Date(storedCandidate.data.timestamp).getTime();
      
      if (age < CONFIG.STORAGE_MAX_AGE) {
        results.candidate = storedCandidate.data.data;
        fromStorage.candidate = true;
        console.log(`[${requestId}] Using stored candidate data (age: ${Math.round(age / 1000 / 60)} minutes)`);
      }
    }
  } catch (error) {
    console.error(`[${requestId}] Storage check failed:`, error);
  }

  // ========================================
  // FETCH FROM SOURCES (if not in storage)
  // ========================================

  const fetchPromises = [];

  // 🔴 APPWRITE CALL #1: Primary data fetch
  if (!results.appwritePrimary) {
    fetchPromises.push(
      Promise.race([
        fetchMemberFromAppwrite(name, type, constituency, state),
        createTimeoutPromise(CONFIG.TIMEOUTS.APPWRITE_PRIMARY, 'Appwrite primary timeout')
      ])
        .then(data => {
          // 📝 LOG APPWRITE RESPONSE
          logAppwriteResponse('fetchMemberFromAppwrite (PRIMARY)', { name, type, constituency, state }, data);
          
          if (validateAppwritePrsData(data)) {
            results.appwritePrimary = data;
            fileStorage.savePrsData(name, type, data, { 
              constituency, 
              state, 
              source: 'appwrite-sdk' 
            });
            console.log(`[${requestId}] ✅ Appwrite SDK data fetched:`, {
              name: data.name,
              party: data.party,
              attendance: data.attendance,
              age: data.age
            });
          }
        })
        .catch(err => {
          errors.appwritePrimary = err.message;
          console.error(`[${requestId}] ❌ Appwrite SDK failed:`, err);
        })
    );
  }

  if (!results.localPrs) {
    fetchPromises.push(
      Promise.race([
        prsService.getMemberData(name, type, constituency, party),
        createTimeoutPromise(CONFIG.TIMEOUTS.LOCAL_PRS, 'Local PRS timeout')
      ])
        .then(data => {
          if (validateLocalPrsData(data)) {
            results.localPrs = data;
            fileStorage.savePrsData(name, type, data, { 
              constituency, 
              party, 
              source: 'local-prs' 
            });
            console.log(`[${requestId}] ✅ Local PRS data fetched`);
          }
        })
        .catch(err => {
          errors.localPrs = err.message;
          console.error(`[${requestId}] ❌ Local PRS failed:`, err);
        })
    );
  }

  if (!results.candidate) {
    fetchPromises.push(
      Promise.race([
        candidateService.getCandidateData(name, constituency || '', party || '', meow, bhaw),
        createTimeoutPromise(CONFIG.TIMEOUTS.CANDIDATE, 'Candidate timeout')
      ])
        .then(result => {
          const data = result?.data || result;
          if (validateCandidateData(data)) {
            results.candidate = data;
            fileStorage.saveCandidateData(name, data, { 
              constituency, 
              party, 
              source: 'appwrite-candidate' 
            });
            console.log(`[${requestId}] ✅ Candidate data fetched`);
          }
        })
        .catch(err => {
          errors.candidate = err.message;
          console.error(`[${requestId}] ❌ Candidate fetch failed:`, err);
        })
    );
  }

  await Promise.allSettled(fetchPromises);

  const duration = Date.now() - startTime;
  console.log(`[${requestId}] Initial fetch completed in ${duration}ms`, {
    appwritePrimary: !!results.appwritePrimary,
    localPrs: !!results.localPrs,
    candidate: !!results.candidate,
  });

  return { results, errors, fromStorage, duration };
}

// ============================================================================
// SECONDARY APPWRITE CALL
// ============================================================================

async function fetchSecondaryData(params, currentData, requestId) {
  const { name, type, constituency, state } = params;
  
  console.log(`[${requestId}] 🔄 Making secondary Appwrite SDK call to fill missing data`);
  
  try {
    // 🔴 APPWRITE CALL #2: Secondary data fetch
    const secondaryData = await Promise.race([
      fetchMemberFromAppwrite(name, type, constituency, state),
      createTimeoutPromise(CONFIG.TIMEOUTS.APPWRITE_SECONDARY, 'Secondary Appwrite timeout')
    ]);

    // 📝 LOG APPWRITE RESPONSE
    logAppwriteResponse('fetchMemberFromAppwrite (SECONDARY)', { name, type, constituency, state }, secondaryData);

    if (!validateAppwritePrsData(secondaryData)) {
      console.warn(`[${requestId}] Secondary call returned no valid data`);
      return null;
    }

    console.log(`[${requestId}] Secondary data received:`, {
      name: secondaryData.name,
      attendance: secondaryData.attendance,
      age: secondaryData.age,
      education: secondaryData.education,
      debates: secondaryData.debates,
      questions: secondaryData.questions,
      attendanceTable: secondaryData.attendanceTable ? 'Present' : 'Missing',
      debatesTable: secondaryData.debatesTable ? 'Present' : 'Missing',
      questionsTable: secondaryData.questionsTable ? 'Present' : 'Missing',
    });

    const updates = {};
    
    const personalFields = ['age', 'gender', 'education', 'termStart', 'termEnd', 'noOfTerm', 'membership'];
    personalFields.forEach(field => {
      if (smartMergeField(currentData, secondaryData, field, 'personal')) {
        updates[`personal.${field}`] = secondaryData[field];
      }
    });
    
    const performanceFields = [
      'attendance', 'natAttendance', 'stateAttendance',
      'debates', 'natDebates', 'stateDebates',
      'questions', 'natQuestions', 'stateQuestions',
      'pmb', 'natPMB', 'statePMB'
    ];
    performanceFields.forEach(field => {
      if (smartMergeField(currentData, secondaryData, field, 'performance')) {
        updates[`performance.${field}`] = secondaryData[field];
      }
    });
    
    const topLevelFields = ['imageUrl', 'state', 'constituency', 'party', 'attendanceTable', 'debatesTable', 'questionsTable'];
    topLevelFields.forEach(field => {
      if (smartMergeField(currentData, secondaryData, field)) {
        updates[field] = secondaryData[field];
      }
    });

    if (secondaryData.attendanceTable && !currentData.attendanceTable) {
      currentData.attendanceTable = secondaryData.attendanceTable;
      updates.attendanceTable = 'Forced merge';
    }
    if (secondaryData.debatesTable && !currentData.debatesTable) {
      currentData.debatesTable = secondaryData.debatesTable;
      updates.debatesTable = 'Forced merge';
    }
    if (secondaryData.questionsTable && !currentData.questionsTable) {
      currentData.questionsTable = secondaryData.questionsTable;
      updates.questionsTable = 'Forced merge';
    }

    if (Object.keys(updates).length > 0) {
      console.log(`[${requestId}] ✅ Secondary call filled ${Object.keys(updates).length} missing fields:`, updates);
      
      console.log(`[${requestId}] Final table state:`, {
        hasAttendanceTable: !!currentData.attendanceTable,
        hasDebatesTable: !!currentData.debatesTable,
        hasQuestionsTable: !!currentData.questionsTable,
        attendanceTableLength: currentData.attendanceTable?.length || 0,
        debatesTableLength: currentData.debatesTable?.length || 0,
        questionsTableLength: currentData.questionsTable?.length || 0,
      });
      
      return { 
        updated: true, 
        fields: Object.keys(updates), 
        data: updates 
      };
    } else {
      console.log(`[${requestId}] Secondary call made but no new data needed`);
      return { updated: false };
    }

  } catch (error) {
    console.error(`[${requestId}] ❌ Secondary Appwrite SDK call failed:`, error);
    return null;
  }
}

// ============================================================================
// BUILD FINAL RESPONSE
// ============================================================================

function buildResponse(results, fromStorage, req) {
  const merged = {
    found: true,
    fromStorage,
    sources: {
      appwritePrimary: !!results.appwritePrimary,
      localPrs: !!results.localPrs,
      candidate: !!results.candidate,
    }
  };

  merged._baseUrl = `${req.protocol}://${req.get('host')}`;

  if (results.candidate) {
    mergeCandidate(merged, results.candidate);
  }

  if (results.appwritePrimary) {
    mergeAppwritePrs(merged, results.appwritePrimary);
  } else if (results.localPrs) {
    mergeLocalPrs(merged, results.localPrs);
  }

  // Proxy top-level imageUrl
  if (merged.imageUrl) {
    const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';
    const proxyUrl = imageProxy.createProxyUrl(merged.imageUrl, baseUrl);

    if (proxyUrl) {
      merged.imageUrl = proxyUrl;
      merged._imageProxied = true;
    }
  }

  // Proxy imageUrl in candidateData
  if (merged.candidateData && merged.candidateData.imageUrl) {
    const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';
    const proxyUrl = imageProxy.createProxyUrl(merged.candidateData.imageUrl, baseUrl);

    if (proxyUrl) {
      merged.candidateData.imageUrl = proxyUrl;
      merged.candidateData._imageProxied = true;
    }
  }

  // Proxy imageUrl in nested candidate object
  if (merged.candidateData && merged.candidateData.candidate && merged.candidateData.candidate.imageUrl) {
    const baseUrl = req ? `${req.protocol}://${req.get('host')}` : '';
    const proxyUrl = imageProxy.createProxyUrl(merged.candidateData.candidate.imageUrl, baseUrl);

    if (proxyUrl) {
      merged.candidateData.candidate.imageUrl = proxyUrl;
      merged.candidateData.candidate._imageProxied = true;
    }
  }

  return merged;
}

// ============================================================================
// ROUTES
// ============================================================================

router.get('/image/:imageId', async (req, res) => {
  const { imageId } = req.params;
  const requestId = req.sessionId || generateRequestId();
  
  try {
    const cached = await cacheService.get('image', imageId);
    if (cached) {
      console.log(`[${requestId}] Image served from cache: ${imageId}`);
      
      res.set({
        'Content-Type': cached.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=26400', 
        'X-Source': 'cache',
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'GET', 
        'Cross-Origin-Resource-Policy': 'cross-origin'
      });
      
      return res.send(cached.buffer);
    }

    const actualUrl = imageProxy.getActualUrl(imageId);
    
    if (!actualUrl) {
      console.warn(`[${requestId}] Invalid image ID: ${imageId}`);
      return res.status(404).json({ error: 'Image not found' });
    }

    console.log(`[${requestId}] Fetching image: ${imageId}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(actualUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FixKaro/1.0)',
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await cacheService.set('image', imageId, {
      buffer,
      contentType,
      cachedAt: new Date().toISOString()
    });

    console.log(`[${requestId}] ✅ Image fetched and cached: ${imageId} (${(buffer.length / 1024).toFixed(2)} KB)`);

    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': buffer.length,
      'X-Source': 'proxy'
    });

    res.send(buffer);

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`[${requestId}] Image fetch timeout: ${imageId}`);
      return res.status(504).json({ error: 'Image fetch timeout' });
    }

    console.error(`[${requestId}] Image proxy error: ${imageId}`, error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

router.get('/constituencies', async (req, res) => {
  try {
    const { type = 'assembly' } = req.query;
    const filename = type === 'assembly' 
      ? CONFIG.DATA_PATHS.ASSEMBLY 
      : CONFIG.DATA_PATHS.PARLIAMENTARY;
    
    const data = await withCache('geojson', type, () => loadStaticFile(filename));
    res.json(data);
    
  } catch (error) {
    console.error('Constituencies error:', error);
    res.status(error.message.includes('not found') ? 404 : 500)
      .json({ error: error.message });
  }
});

router.get('/image-proxy/stats', (req, res) => {
  res.json({
    imageProxy: imageProxy.getStats(),
    imageCache: cacheService.getStats().image || { hits: 0, misses: 0 },
    timestamp: new Date().toISOString()
  });
});

router.get('/all-data', async (req, res) => {
  try {
    const data = await withCache('geojson', 'all_data', 
      () => loadStaticFile(CONFIG.DATA_PATHS.ALL_DATA));
    res.json(data);
  } catch (error) {
    console.error('All-data error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

router.get('/rajya-sabha', async (req, res) => {
  try {
    const data = await withCache('geojson', 'rajya_sabha', 
      () => loadStaticFile(CONFIG.DATA_PATHS.RAJYA_SABHA));
    res.json(data);
  } catch (error) {
    console.error('Rajya Sabha error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// ============================================================================
// MAIN PRS ENDPOINT
// ============================================================================

router.get('/prs', scraperLimiter, memberQueryValidator, async (req, res) => {
  const requestId = req.sessionId || generateRequestId();
  const params = req.query;
  const { name, type } = params;
  const overallStartTime = Date.now();
  
  try {
    const { results, errors, fromStorage, duration } = await fetchAllData(params, requestId);

    const hasData = results.appwritePrimary || results.localPrs || results.candidate;

    if (!hasData) {
      console.warn(`[${requestId}] No data found from any source`, { name, type });
      
      fileStorage.saveAnalytics('prs_request', {
        name, 
        type,
        duration,
        success: false,
        errors: Object.keys(errors),
      });

      return res.status(404).json({
        found: false,
        error: 'Member not found in any database',
        name,
        type,
        details: errors,
        timestamp: new Date().toISOString(),
      });
    }

    const responseData = buildResponse(results, fromStorage, req);

    console.log(`[${requestId}] Initial response built:`, {
      hasPrsData: !!(results.appwritePrimary || results.localPrs),
      hasCandidateData: !!results.candidate,
      personalFields: Object.keys(responseData.personal || {}),
      performanceFields: Object.keys(responseData.performance || {}),
    });

    const secondaryResult = await fetchSecondaryData(params, responseData, requestId);
    
    if (secondaryResult?.updated) {
      responseData.secondaryDataMerged = true;
      responseData.mergedFields = secondaryResult.fields;
      responseData.secondaryData = secondaryResult.data;
    }

    const totalDuration = Date.now() - overallStartTime;

    fileStorage.saveAnalytics('prs_request', {
      name,
      type,
      sources: responseData.sources,
      fromStorage,
      secondaryCallMade: !!secondaryResult,
      secondaryFieldsUpdated: secondaryResult?.fields?.length || 0,
      duration: totalDuration,
      success: true,
    });

    console.log(`[${requestId}] ✅ PRS request completed successfully:`, {
      name,
      sources: responseData.sources,
      secondaryCall: secondaryResult?.updated ? 'Updated data' : 'No updates needed',
      totalDuration: `${totalDuration}ms`,
      fieldsUpdated: secondaryResult?.fields?.length || 0,
    });

    return res.json({
      ...responseData,
      timing: { 
        total: totalDuration,
        primary: duration,
        secondary: secondaryResult ? (totalDuration - duration) : 0,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Unexpected error in PRS endpoint:`, error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// CANDIDATE ENDPOINT
// ============================================================================

router.get('/candidate', scraperLimiter, candidateQueryValidator, async (req, res) => {
  const requestId = req.sessionId || generateRequestId();
  
  try {
    const { name, constituency, party, meow, bhaw } = req.query;
    
    console.log(`[${requestId}] Candidate request:`, { name });

    const result = await candidateService.getCandidateData(
      name, 
      constituency, 
      party, 
      meow, 
      bhaw
    );

    console.log(`[${requestId}] Result is:`, result);
    
    res.json({
      data: result.data || result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Candidate fetch error:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch candidate data',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// DEBUG & ADMIN ENDPOINTS
// ============================================================================

router.get('/test-appwrite-sdk', async (req, res) => {
  try {
    const { name = 'ANITA SUBHADARSHINI', type = 'MP' } = req.query;
    const requestId = generateRequestId();
    
    console.log(`[${requestId}] Testing Appwrite SDK:`, { name, type });
    
    // 🔴 APPWRITE CALL #3: Test endpoint
    const result = await fetchMemberFromAppwrite(name, type);
    
    // 📝 LOG APPWRITE RESPONSE
    logAppwriteResponse('fetchMemberFromAppwrite (TEST)', { name, type }, result);
    
    console.log("Result:", result);
    
    res.json({
      success: true,
      result,
      stats: getAppwriteStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/debug-full-flow', async (req, res) => {
  const { name, type } = req.query;
  
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }
  
  try {
    const requestId = generateRequestId();
    
    // 🔴 APPWRITE CALL #4: Debug primary
    const primary = await fetchMemberFromAppwrite(name, type);
    logAppwriteResponse('fetchMemberFromAppwrite (DEBUG-PRIMARY)', { name, type }, primary);
    
    const mockResponse = { 
      name, 
      type, 
      personal: {}, 
      performance: {} 
    };
    mergeAppwritePrs(mockResponse, primary);
    
    const secondary = await fetchMemberFromAppwrite(name, type);
    logAppwriteResponse('fetchMemberFromAppwrite (DEBUG-SECONDARY)', { name, type }, secondary);
    
    const beforeMerge = JSON.parse(JSON.stringify(mockResponse));
    const secondaryResult = await fetchSecondaryData(
      { name, type }, 
      mockResponse, 
      requestId
    );
    
    res.json({
      primary,
      secondary,
      beforeMerge,
      afterMerge: mockResponse,
      secondaryResult,
      fieldsUpdated: secondaryResult?.fields || [],
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message, 
      stack: error.stack 
    });
  }
});

router.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: {
      used: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      total: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      percentage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%',
    },
    services: {
      browser: browserPool.getStats(),
      cache: cacheService.getStats(),
      appwrite: getAppwriteStats(),
      candidate: candidateService.getStats(),
    },
    storage: fileStorage.getStats(),
    timestamp: new Date().toISOString(),
  });
});

router.post('/cache/clear', (req, res) => {
  const { type } = req.query;
  
  cacheService.flush(type);
  candidateService.clearCache();
  
  console.log('Cache cleared:', { type: type || 'all' });
  
  res.json({ 
    message: `Cache cleared: ${type || 'all'}`,
    timestamp: new Date().toISOString(),
  });
});

router.get('/welcome', (req, res) => {
  console.log('Welcome endpoint accessed');

  res.json({
    message: "Welcome to the FixKaro Web API!",
    version: "3.0",
    features: [
      "Appwrite Node SDK integration",
      "Dual SDK calls for complete data",
      "Smart field-level merging",
      "File-based caching with 24h TTL",
      "Progressive data loading",
      "Comprehensive logging"
    ],
    timestamp: new Date().toISOString(),
  });
});

console.log('✅ API routes initialized with Appwrite SDK dual-call support');

export default router;