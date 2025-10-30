// server.js - PRODUCTION-HARDENED VERSION WITH SECURITY
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'url';  
import compression from 'compression';
import crypto from 'crypto';
import fs from 'fs';

import config from './config/config.js';
import { apiLimiter, memberLimiter } from './middleware/rateLimiter.js';
import requestLogger from './middleware/requestLogger.js';
import apiRoutes from './routes/api.js';
import memberRoutes from './routes/member.js';
import { createLogger } from './utils/logger.js';
import fileStorage from './utils/fileStorage.js';
import imageProxy from './services/imageProxy.js';

// ============================================================================
// SECURITY MIDDLEWARE & UTILITIES
// ============================================================================

class SecurityManager {
  constructor() {
    this.logger = createLogger('SECURITY');
    this.blockedIPs = new Set();
    this.suspiciousActivity = new Map(); // IP -> { count, firstSeen, lastSeen }
    this.failedAttempts = new Map(); // IP -> { count, lastAttempt }
    this.rateLimitStore = new Map(); // IP -> { requests: [], blocked: false }
    
    // Threat detection thresholds
    this.THRESHOLDS = {
      MAX_FAILED_ATTEMPTS: 5,
      FAILED_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15 minutes
      SUSPICIOUS_SCORE_LIMIT: 10,
      MAX_REQUESTS_PER_MINUTE: 60,
      MAX_WS_CONNECTIONS_PER_IP: 5,
      BLOCK_DURATION: 60 * 60 * 1000, // 1 hour
      AUTO_UNBLOCK_CHECK: 10 * 60 * 1000 // 10 minutes
    };

    // Malicious patterns
    this.MALICIOUS_PATTERNS = [
      /(\.\.|\/\.\.)/g,                    // Path traversal
      /<script[^>]*>.*?<\/script>/gi,      // XSS
      /javascript:/gi,                      // XSS
      /on\w+\s*=/gi,                       // Event handlers
      /(\bor\b|\band\b).*?(\=|like)/gi,    // SQL injection
      /union.*select/gi,                    // SQL injection
      /exec\s*\(/gi,                        // Code execution
      /eval\s*\(/gi,                        // Code execution
      /(rm|wget|curl)\s+-/gi,              // Shell commands
      /\$\{.*\}/g,                         // Template injection
      /__proto__|constructor|prototype/gi   // Prototype pollution
    ];

    this.startCleanupInterval();
  }

  // Block IP address
  blockIP(ip, reason, duration = this.THRESHOLDS.BLOCK_DURATION) {
    this.blockedIPs.add(ip);
    this.logger.warn('BLOCK', `IP blocked: ${ip}`, { reason, duration });
    
    fileStorage.saveAnalytics('ip_blocked', {
      ip,
      reason,
      duration,
      timestamp: new Date().toISOString()
    });

    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      this.logger.info('UNBLOCK', `IP unblocked: ${ip}`);
    }, duration);
  }

  // Check if IP is blocked
  isBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  // Record failed attempt
  recordFailedAttempt(ip, reason) {
    const now = Date.now();
    const record = this.failedAttempts.get(ip) || { count: 0, lastAttempt: now };
    
    // Reset if outside window
    if (now - record.lastAttempt > this.THRESHOLDS.FAILED_ATTEMPT_WINDOW) {
      record.count = 0;
    }
    
    record.count++;
    record.lastAttempt = now;
    this.failedAttempts.set(ip, record);

    this.logger.warn('FAILED_ATTEMPT', `Failed attempt from ${ip}`, { 
      reason, 
      count: record.count 
    });

    // Block if threshold exceeded
    if (record.count >= this.THRESHOLDS.MAX_FAILED_ATTEMPTS) {
      this.blockIP(ip, `Too many failed attempts: ${reason}`);
      return true;
    }

    return false;
  }

  // Record suspicious activity
  recordSuspiciousActivity(ip, activity, score = 1) {
    const now = Date.now();
    const record = this.suspiciousActivity.get(ip) || { 
      count: 0, 
      score: 0,
      firstSeen: now, 
      lastSeen: now,
      activities: []
    };
    
    record.count++;
    record.score += score;
    record.lastSeen = now;
    record.activities.push({ activity, score, timestamp: now });
    
    // Keep only last 50 activities
    if (record.activities.length > 50) {
      record.activities = record.activities.slice(-50);
    }
    
    this.suspiciousActivity.set(ip, record);

    this.logger.warn('SUSPICIOUS', `Suspicious activity from ${ip}`, { 
      activity, 
      score: record.score 
    });

    fileStorage.saveAnalytics('suspicious_activity', {
      ip,
      activity,
      score: record.score,
      timestamp: new Date().toISOString()
    });

    // Block if score too high
    if (record.score >= this.THRESHOLDS.SUSPICIOUS_SCORE_LIMIT) {
      this.blockIP(ip, `Suspicious activity score: ${record.score}`);
      return true;
    }

    return false;
  }

  // Scan for malicious input
  scanForThreats(input) {
    const threats = [];
    const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
    
    for (const pattern of this.MALICIOUS_PATTERNS) {
      const matches = inputStr.match(pattern);
      if (matches) {
        threats.push({
          pattern: pattern.source,
          matches: matches.slice(0, 3) // Limit to first 3 matches
        });
      }
    }
    
    return threats;
  }

  // Validate input
  validateInput(input, maxLength = 1000) {
    if (typeof input !== 'string') return true;
    
    // Check length
    if (input.length > maxLength) {
      return false;
    }

    // Scan for threats
    const threats = this.scanForThreats(input);
    return threats.length === 0;
  }

  // Rate limiting check
  checkRateLimit(ip) {
    const now = Date.now();
    const record = this.rateLimitStore.get(ip) || { requests: [], blocked: false };
    
    // Remove old requests (older than 1 minute)
    record.requests = record.requests.filter(time => now - time < 60000);
    
    // Add current request
    record.requests.push(now);
    this.rateLimitStore.set(ip, record);
    
    // Check if exceeded
    if (record.requests.length > this.THRESHOLDS.MAX_REQUESTS_PER_MINUTE) {
      if (!record.blocked) {
        this.recordSuspiciousActivity(ip, 'Rate limit exceeded', 3);
        record.blocked = true;
      }
      return false;
    }
    
    record.blocked = false;
    return true;
  }

  // Sanitize input
  sanitize(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .slice(0, 1000); // Max length
  }

  // Cleanup old records
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      // Clean failed attempts
      for (const [ip, record] of this.failedAttempts.entries()) {
        if (now - record.lastAttempt > this.THRESHOLDS.FAILED_ATTEMPT_WINDOW) {
          this.failedAttempts.delete(ip);
          cleaned++;
        }
      }

      // Clean suspicious activity
      for (const [ip, record] of this.suspiciousActivity.entries()) {
        if (now - record.lastSeen > 24 * 60 * 60 * 1000) { // 24 hours
          this.suspiciousActivity.delete(ip);
          cleaned++;
        }
      }

      // Clean rate limit store
      for (const [ip, record] of this.rateLimitStore.entries()) {
        if (record.requests.length === 0) {
          this.rateLimitStore.delete(ip);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info('CLEANUP', `Cleaned ${cleaned} security records`);
      }
    }, this.THRESHOLDS.AUTO_UNBLOCK_CHECK);
  }

  // Get security stats
  getStats() {
    return {
      blockedIPs: Array.from(this.blockedIPs),
      totalBlocked: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousActivity.size,
      failedAttempts: this.failedAttempts.size,
      topThreats: this.getTopThreats()
    };
  }

  getTopThreats(limit = 10) {
    return Array.from(this.suspiciousActivity.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([ip, data]) => ({ ip, score: data.score, count: data.count }));
  }
}

const security = new SecurityManager();

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const validators = {
  searchQuery: (q) => {
    if (!q || typeof q !== 'string') return false;
    if (q.length < 1 || q.length > 200) return false;
    if (!/^[a-zA-Z0-9\s\-.,()]+$/.test(q)) return false;
    return true;
  },

  sessionId: (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^(sess|ws)_\d+_[a-f0-9]{16}$/.test(id);
  },

  numericParam: (val, min = 1, max = 365) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= min && num <= max;
  },

  path: (p) => {
    if (!p || typeof p !== 'string') return false;
    // Prevent path traversal
    return !p.includes('..') && !/[<>:"|?*]/.test(p);
  }
};

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// IP blocking middleware
const ipBlocker = (req, res, next) => {
  const ip = getClientIP(req);
  
  if (security.isBlocked(ip)) {
    logger.warn(req.sessionId, 'Blocked IP attempted access', { ip });
    return res.status(403).json({ 
      error: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
};

// Rate limiting middleware (additional layer)
const advancedRateLimit = (req, res, next) => {
  const ip = getClientIP(req);
  
  if (!security.checkRateLimit(ip)) {
    logger.warn(req.sessionId, 'Rate limit exceeded', { ip });
    return res.status(429).json({ 
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  }
  
  next();
};

// Input validation middleware
const validateRequest = (req, res, next) => {
  const ip = getClientIP(req);
  
  // Scan query parameters
  for (const [key, value] of Object.entries(req.query)) {
    const threats = security.scanForThreats(value);
    if (threats.length > 0) {
      security.recordSuspiciousActivity(ip, `Malicious query parameter: ${key}`, 5);
      logger.warn(req.sessionId, 'Malicious input detected in query', { 
        ip, 
        key, 
        threats 
      });
      return res.status(400).json({ 
        error: 'Invalid request',
        code: 'INVALID_INPUT'
      });
    }
  }
  
  // Scan request body
  if (req.body && typeof req.body === 'object') {
    const threats = security.scanForThreats(req.body);
    if (threats.length > 0) {
      security.recordSuspiciousActivity(ip, 'Malicious request body', 5);
      logger.warn(req.sessionId, 'Malicious input detected in body', { 
        ip, 
        threats 
      });
      return res.status(400).json({ 
        error: 'Invalid request',
        code: 'INVALID_INPUT'
      });
    }
  }
  
  next();
};

// Path traversal protection
const pathTraversalProtection = (req, res, next) => {
  const ip = getClientIP(req);
  const url = req.originalUrl || req.url;
  
  if (url.includes('..') || url.includes('%2e%2e')) {
    security.recordSuspiciousActivity(ip, 'Path traversal attempt', 8);
    logger.warn(req.sessionId, 'Path traversal attempt', { ip, url });
    return res.status(400).json({ 
      error: 'Invalid request',
      code: 'INVALID_PATH'
    });
  }
  
  next();
};

// WebSocket connection limiter
const wsConnectionLimiter = new Map(); // IP -> connection count

// ============================================================================
// CLEANUP SCHEDULER
// ============================================================================

const cleanupScheduler = {
  logger: createLogger('CLEANUP'),
  logIntervalId: null,
  storageIntervalId: null,

  start() {
    if (!config.cleanup.enabled) {
      this.logger.info('INIT', 'Automatic cleanup disabled');
      return;
    }

    this.logger.info('INIT', 'Starting cleanup scheduler', {
      logInterval: '1 hour',
      storageInterval: '24 hours',
      retention: config.cleanup.retention
    });

    setTimeout(() => {
      this.runLogCleanup();
      this.runStorageCleanup();
    }, 5000);

    const logInterval = 1 * 60 * 60 * 1000;
    this.logIntervalId = setInterval(() => this.runLogCleanup(), logInterval);

    const storageInterval = 24 * 60 * 60 * 1000;
    this.storageIntervalId = setInterval(() => this.runStorageCleanup(), storageInterval);
  },

  stop() {
    if (this.logIntervalId) clearInterval(this.logIntervalId);
    if (this.storageIntervalId) clearInterval(this.storageIntervalId);
    this.logger.info('STOPPED', 'Cleanup scheduler stopped');
  },

  async runLogCleanup() {
    try {
      this.logger.info('START', 'Running log cleanup');
      const logCleanupResult = this.cleanupLogs();
      this.logger.success('COMPLETE', 'Log cleanup finished', {
        retentionDays: config.cleanup.retention.logs,
        result: logCleanupResult
      });
      return logCleanupResult;
    } catch (error) {
      this.logger.error('FAILED', 'Log cleanup failed', error);
      return { error: error.message };
    }
  },

  async runStorageCleanup() {
    try {
      this.logger.info('START', 'Running storage cleanup');
      const storageCleanupResult = fileStorage.cleanupOldFiles(config.cleanup.retention);
      this.logger.success('COMPLETE', 'Storage cleanup finished', {
        totalDeleted: storageCleanupResult.totalDeleted,
        categories: Object.keys(storageCleanupResult.categories).length
      });
      return storageCleanupResult;
    } catch (error) {
      this.logger.error('FAILED', 'Storage cleanup failed', error);
      return { error: error.message };
    }
  },

  cleanupLogs() {
    try {
      const loggerInstance = createLogger('TEMP');
      loggerInstance.cleanupOldLogs();
      return {
        success: true,
        retentionDays: config.cleanup.retention.logs,
        message: 'Log cleanup completed'
      };
    } catch (error) {
      this.logger.error('LOGS', 'Failed to cleanup logs', error);
      return { success: false, error: error.message };
    }
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

const IS_RAILWAY = !!process.env.RAILWAY_PROJECT_ID;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

process.env.LOG_TO_FILE = IS_PRODUCTION ? 'true' : (process.env.LOG_TO_FILE || 'false');

// ============================================================================
// LOGGER INITIALIZATION
// ============================================================================

const logger = createLogger('SERVER', {
  writeToFile: process.env.LOG_TO_FILE === 'true',
  consoleOutput: true
});

const wsLogger = createLogger('WEBSOCKET');
const memLogger = createLogger('MEMORY');

// ============================================================================
// DIRECTORY SETUP
// ============================================================================

const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'logs'),
    path.join(__dirname, 'data'),
    path.join(__dirname, 'storage'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info('INIT', `Created directory: ${dir}`);
    }
  });
};

ensureDirectories();

// ============================================================================
// MEMORY MONITORING
// ============================================================================

const MEMORY_CHECK_INTERVAL = IS_RAILWAY ? 15 * 60 * 1000 : 5 * 60 * 1000;
const MAX_MEMORY_RECORDS = 1000;

class MemoryMonitor {
  constructor() {
    this.records = [];
    this.metadata = {
      createdAt: new Date().toISOString(),
      platform: IS_RAILWAY ? 'Railway' : 'Local',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'production'
    };
    this.highMemoryAlerted = false;
  }

  record() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const record = {
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000),
        system: Math.round(cpuUsage.system / 1000)
      },
      connections: {
        websocket: wss.clients.size,
        http: server._connections || 0
      }
    };

    this.records.push(record);
    
    if (this.records.length > MAX_MEMORY_RECORDS) {
      this.records = this.records.slice(-MAX_MEMORY_RECORDS);
    }

    if (record.memory.heapUsed > 450) {
      if (!this.highMemoryAlerted) {
        memLogger.warn('ALERT', 'High memory usage detected', {
          heapUsed: `${record.memory.heapUsed} MB`,
          threshold: '450 MB'
        });
        this.highMemoryAlerted = true;
        
        fileStorage.saveAnalytics('memory_alert', {
          memory: record.memory,
          uptime: record.uptime,
          connections: record.connections
        });
      }
    } else if (record.memory.heapUsed < 400) {
      this.highMemoryAlerted = false;
    }

    if (this.records.length % 20 === 0) {
      this.saveToStorage();
    }

    return record;
  }

  saveToStorage() {
    try {
      fileStorage.saveAnalytics('memory_snapshot', {
        records: this.records.slice(-100),
        metadata: this.metadata,
        stats: this.getStats()
      });
    } catch (error) {
      memLogger.error('SAVE', 'Failed to save memory snapshot', error);
    }
  }

  getStats() {
    const recent = this.records.slice(-100);
    
    if (recent.length === 0) {
      return {
        current: this.record(),
        average: null,
        peak: null,
        total: 0
      };
    }

    const avgMemory = {
      rss: Math.round(recent.reduce((sum, r) => sum + r.memory.rss, 0) / recent.length),
      heapUsed: Math.round(recent.reduce((sum, r) => sum + r.memory.heapUsed, 0) / recent.length)
    };

    const peakMemory = {
      rss: Math.max(...recent.map(r => r.memory.rss)),
      heapUsed: Math.max(...recent.map(r => r.memory.heapUsed)),
      timestamp: recent.find(r => r.memory.heapUsed === Math.max(...recent.map(x => x.memory.heapUsed)))?.timestamp
    };

    return {
      current: recent[recent.length - 1],
      average: avgMemory,
      peak: peakMemory,
      total: this.records.length,
      retention: `${Math.round((Date.now() - new Date(this.metadata.createdAt).getTime()) / (1000 * 60 * 60))} hours`
    };
  }

  exportCSV() {
    const headers = 'timestamp,uptime,rss,heapTotal,heapUsed,external,websocket_connections\n';
    const rows = this.records.map(r => 
      `${r.timestamp},${r.uptime},${r.memory.rss},${r.memory.heapTotal},${r.memory.heapUsed},${r.memory.external},${r.connections?.websocket || 0}`
    ).join('\n');
    
    return headers + rows;
  }
}

const memoryMonitor = new MemoryMonitor();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getClientIP = (req) => {
  if (IS_RAILWAY) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.headers['cf-connecting-ip'] ||
           req.connection?.remoteAddress?.replace('::ffff:', '') ||
           'unknown';
  }

  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfIp = req.headers['cf-connecting-ip'];

  if (process.env.BEHIND_PROXY === 'true') {
    if (cfIp) return cfIp;
    if (realIp) return realIp;
    if (forwarded) return forwarded.split(',')[0].trim();
  }

  return req.connection?.remoteAddress?.replace('::ffff:', '') ||
         req.socket?.remoteAddress?.replace('::ffff:', '') ||
         'unknown';
};

const generateSessionId = () => {
  return `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
};

// ============================================================================
// ENHANCED MIDDLEWARE
// ============================================================================

// Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://use.fontawesome.com", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://use.fontawesome.com", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS with strict configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = IS_RAILWAY
      ? [
          process.env.RAILWAY_STATIC_URL,
          'https://fixkaro-web-production.up.railway.app/',
          ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
        ]
      : config.server.allowedOrigins;

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp(allowed.replace('*', '.*'));
        return regex.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn('CORS', 'Blocked origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400
}));

app.use(compression());

// Request size limits
app.use(express.json({ limit: '10kb' })); // Limit JSON body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Trust proxy configuration
if (IS_RAILWAY) {
  app.set('trust proxy', true);
  logger.info('INIT', 'Trust proxy enabled (Railway environment)');
} else if (process.env.BEHIND_PROXY === 'true') {
  app.set('trust proxy', 'loopback');
  logger.info('INIT', 'Trust proxy enabled for localhost');
} else {
  app.set('trust proxy', false);
  logger.info('INIT', 'Trust proxy disabled (direct connection)');
}

// Session ID and IP tracking
app.use((req, res, next) => {
  req.sessionId = generateSessionId();
  req.clientIP = getClientIP(req);
  next();
});

// Apply security middleware
app.use(ipBlocker);
app.use(pathTraversalProtection);
app.use(advancedRateLimit);
app.use(validateRequest);
app.use(requestLogger);

// ============================================================================
// ROUTES - SECURED
// ============================================================================

// Health check - minimal information exposure
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Detailed health (restricted)
app.get('/health/detailed', (req, res) => {
  // Only allow from localhost or specific IPs
  const ip = getClientIP(req);
  if (ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('10.') && !ip.startsWith('192.168.')) {
    security.recordSuspiciousActivity(ip, 'Unauthorized health check access', 2);
    return res.status(403).json({ error: 'Access denied' });
  }

  const memStats = memoryMonitor.getStats();
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: memStats.current?.memory || process.memoryUsage(),
    connections: {
      websocket: wss.clients.size,
      http: server._connections || 0
    },
    environment: {
      node: process.version,
      platform: IS_RAILWAY ? 'Railway' : 'Local',
      env: process.env.NODE_ENV || 'production'
    }
  });
});

// Memory stats - authenticated
app.get('/api/memory/stats', (req, res) => {
  const ip = getClientIP(req);

  // Basic authentication check (you should implement proper auth)
  const authToken = req.headers['authorization'];
  if (!authToken || authToken !== `Bearer ${config.adminToken}`) {
    security.recordFailedAttempt(ip, 'Unauthorized memory stats access');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const stats = memoryMonitor.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    memLogger.error('STATS', 'Failed to get stats', error);
    res.status(500).json({ error: 'Failed to retrieve memory stats' });
  }
});

// Export memory stats - authenticated
app.get('/api/memory/export', (req, res) => {
  const ip = getClientIP(req);
  const authToken = req.headers['authorization'];

  if (!authToken || authToken !== `Bearer ${config.adminToken}`) {
    security.recordFailedAttempt(ip, 'Unauthorized memory export');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const csv = memoryMonitor.exportCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="memory-stats-${Date.now()}.csv"`);
    res.send(csv);
    
    logger.success(req.sessionId, 'Memory stats exported');
  } catch (error) {
    memLogger.error('EXPORT', 'Failed to export', error);
    res.status(500).json({ error: 'Failed to export memory stats' });
  }
});

app.get('/api/search-proxy', async (req, res) => {
  const startTime = Date.now();
  const { q } = req.query;
  const ip = req.clientIP;
  
  try {
    if (!validators.searchQuery(q)) {
      security.recordSuspiciousActivity(ip, 'Invalid search query format', 2);
      return res.status(400).json({ 
        error: 'Invalid search query',
        suggestions: [],
        count: 0
      });
    }

    const sanitizedQuery = security.sanitize(q);

    const externalAPI = `https://lok-tantra-10qg0fa2f-rex1671s-projects.vercel.app/api/search?q=${encodeURIComponent(sanitizedQuery)}`;
    
    logger.info(req.sessionId, `Search: "${sanitizedQuery}"`, { ip });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(externalAPI, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; LokTantraBot/1.0)'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    logger.success(req.sessionId, `Search completed: ${data.suggestions?.length || 0} results`, {
      duration: `${duration}ms`,
      query: sanitizedQuery
    });

    fileStorage.saveAnalytics('search_query', {
      query: sanitizedQuery,
      results: data.suggestions?.length || 0,
      duration,
      ip,
      timestamp: new Date().toISOString()
    });

    res.json({
      ...data,
      responseTime: duration,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      logger.warn(req.sessionId, 'Search timeout', { duration, query: q });
    } else {
      logger.error(req.sessionId, 'Search failed', error);
    }

    res.status(200).json({ 
      suggestions: [],
      count: 0,
      error: 'Search temporarily unavailable',
      fallback: true
    });
  }
});

// Analytics - authenticated
app.get('/api/analytics', async (req, res) => {
  const ip = getClientIP(req);
  const authToken = req.headers['authorization'];
  
  if (!authToken || authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    security.recordFailedAttempt(ip, 'Unauthorized analytics access');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { days = 7 } = req.query;
    
    if (!validators.numericParam(days, 1, 365)) {
      return res.status(400).json({ error: 'Invalid days parameter' });
    }

    const summary = fileStorage.getAnalyticsSummary(parseInt(days));
    
    res.json({
      period: `Last ${days} days`,
      ...summary,
      storage: fileStorage.getStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(req.sessionId, 'Analytics fetch failed', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Security stats - authenticated
app.get('/api/security/stats', (req, res) => {
  const ip = getClientIP(req);
  const authToken = req.headers['authorization'];
  
  if (!authToken || authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    security.recordFailedAttempt(ip, 'Unauthorized security stats access');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({
    success: true,
    data: security.getStats(),
    timestamp: new Date().toISOString()
  });
});

// Manual IP block - authenticated
app.post('/api/security/block', (req, res) => {
  const authToken = req.headers['authorization'];
  
  if (!authToken || authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { ip, reason, duration } = req.body;
  
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ error: 'Invalid IP address' });
  }

  security.blockIP(ip, reason || 'Manual block', duration);
  
  res.json({ 
    success: true, 
    message: `IP ${ip} blocked`,
    timestamp: new Date().toISOString()
  });
});

// Storage search - validated
app.get('/api/storage/search', (req, res) => {
  const { q } = req.query;
  
  if (!q || typeof q !== 'string' || q.length < 3 || q.length > 200) {
    return res.status(400).json({ error: 'Query must be between 3-200 characters' });
  }

  const sanitizedQuery = security.sanitize(q);
  const results = fileStorage.searchCandidates(sanitizedQuery);
  
  logger.info(req.sessionId, `Storage search: "${sanitizedQuery}"`, { results: results.length });
  
  res.json({
    query: sanitizedQuery,
    results,
    count: results.length,
    timestamp: new Date().toISOString()
  });
});

// Backup - authenticated
app.post('/api/storage/backup', async (req, res) => {
  const ip = getClientIP(req);
  const authToken = req.headers['authorization'];
  
  if (!authToken || authToken !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    security.recordFailedAttempt(ip, 'Unauthorized backup access');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    logger.info(req.sessionId, 'Backup initiated');
    const result = await fileStorage.createBackup();
    
    logger.success(req.sessionId, 'Backup completed', { filepath: result.filepath });
    res.json(result);
  } catch (error) {
    logger.error(req.sessionId, 'Backup failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply rate limiters
app.use('/api/', (req, res, next) => {
  apiLimiter(req, res, (err) => {
    if (err && err.statusCode === 429) {
      logger.warn(req.sessionId, 'API rate limit exceeded', {
        ip: req.clientIP,
        path: req.path
      });
      
      security.recordSuspiciousActivity(req.clientIP, 'API rate limit exceeded', 2);
      
      fileStorage.saveAnalytics('rate_limit', {
        type: 'api',
        ip: req.clientIP,
        path: req.path,
        timestamp: new Date().toISOString()
      });
    }
    next(err);
  });
});

app.use('/member/', (req, res, next) => {
  memberLimiter(req, res, (err) => {
    if (err && err.statusCode === 429) {
      logger.warn(req.sessionId, 'Member rate limit exceeded', {
        ip: req.clientIP,
        path: req.path
      });
      security.recordSuspiciousActivity(req.clientIP, 'Member rate limit exceeded', 2);
    }
    next(err);
  });
});

// Static files with security
app.use(express.static('public', {
  dotfiles: 'deny',
  index: false,
  setHeaders: (res, path) => {
    // Prevent caching of sensitive files
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

app.use('/api', apiRoutes);
app.use('/member', memberRoutes); 

// Serve index with environment injection
app.get('/', (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('<!-- ENVIRONMENT_PLACEHOLDER -->', `<script>window.IS_PRODUCTION = ${IS_PRODUCTION};</script>`);
    res.send(html);
  } catch (error) {
    logger.error(req.sessionId, 'Failed to serve index', error);
    res.status(500).send('Server error');
  }
});

// ============================================================================
// WEBSOCKET HANDLING - ENHANCED SECURITY
// ============================================================================

const wsConnections = new Map();
const CLIENT_TIMEOUT = 5 * 60 * 1000;
const MAX_MESSAGE_SIZE = 10 * 1024; // 10KB max message size

wss.on('connection', (ws, req) => {
  const clientIp = getClientIP(req);
  const sessionId = 'ws_' + crypto.randomBytes(8).toString('hex');
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Check if IP is blocked
  if (security.isBlocked(clientIp)) {
    wsLogger.warn(sessionId, 'Blocked IP attempted WebSocket connection', { ip: clientIp });
    ws.close(1008, 'Access denied');
    return;
  }

  // Limit connections per IP
  const currentConnections = wsConnectionLimiter.get(clientIp) || 0;
  if (currentConnections >= security.THRESHOLDS.MAX_WS_CONNECTIONS_PER_IP) {
    wsLogger.warn(sessionId, 'Too many WebSocket connections from IP', { 
      ip: clientIp,
      current: currentConnections,
      max: security.THRESHOLDS.MAX_WS_CONNECTIONS_PER_IP
    });
    security.recordSuspiciousActivity(clientIp, 'WebSocket connection limit exceeded', 3);
    ws.close(1008, 'Too many connections');
    return;
  }

  wsConnectionLimiter.set(clientIp, currentConnections + 1);
  
  ws.sessionId = sessionId;
  ws.clientIp = clientIp;
  ws.lastActivity = Date.now();
  ws.tempIds = new Set();
  ws.connectionTime = new Date();
  ws.messageCount = 0;
  
  wsConnections.set(sessionId, {
    ip: clientIp,
    userAgent,
    connectedAt: new Date(),
    subscriptions: []
  });

  wsLogger.success(sessionId, 'Client connected', {
    ip: clientIp,
    total: wss.clients.size
  });

  fileStorage.saveAnalytics('websocket_connection', {
    sessionId,
    ip: clientIp,
    userAgent,
    timestamp: new Date().toISOString()
  });

  ws.on('message', (message) => {
    try {
      // Check message size
      if (message.length > MAX_MESSAGE_SIZE) {
        wsLogger.warn(sessionId, 'Message too large', { 
          size: message.length,
          max: MAX_MESSAGE_SIZE
        });
        security.recordSuspiciousActivity(clientIp, 'WebSocket message too large', 3);
        ws.close(1009, 'Message too large');
        return;
      }

      // Rate limit messages
      ws.messageCount++;
      if (ws.messageCount > 100) { // Max 100 messages per connection
        wsLogger.warn(sessionId, 'Too many messages', { count: ws.messageCount });
        security.recordSuspiciousActivity(clientIp, 'WebSocket message spam', 4);
        ws.close(1008, 'Too many messages');
        return;
      }

      const data = JSON.parse(message);
      
      // Validate message structure
      if (!data.type || typeof data.type !== 'string') {
        wsLogger.warn(sessionId, 'Invalid message format');
        return;
      }

      // Scan for threats
      const threats = security.scanForThreats(data);
      if (threats.length > 0) {
        wsLogger.warn(sessionId, 'Malicious WebSocket message', { threats });
        security.recordSuspiciousActivity(clientIp, 'Malicious WebSocket message', 5);
        ws.close(1008, 'Invalid message');
        return;
      }

      if (data.type === 'subscribe' && data.tempId) {
        // Limit subscriptions
        if (ws.tempIds.size >= 50) {
          wsLogger.warn(sessionId, 'Too many subscriptions');
          return;
        }

        ws.tempIds.add(data.tempId);
        ws.lastActivity = Date.now();
        
        const connInfo = wsConnections.get(sessionId);
        if (connInfo) {
          connInfo.subscriptions.push(data.tempId);
        }
        
        wsLogger.info(sessionId, `Subscribed to ${data.tempId}`);
      }
    } catch (err) {
      wsLogger.error(sessionId, 'Message processing error', err);
      security.recordSuspiciousActivity(clientIp, 'Invalid WebSocket message', 1);
    }
  });

  ws.on('close', (code, reason) => {
    const duration = Date.now() - ws.connectionTime.getTime();
    
    // Decrement connection counter
    const currentCount = wsConnectionLimiter.get(clientIp) || 1;
    wsConnectionLimiter.set(clientIp, currentCount - 1);
    if (currentCount <= 1) {
      wsConnectionLimiter.delete(clientIp);
    }
    
    wsConnections.delete(sessionId);
    
    wsLogger.info(sessionId, 'Client disconnected', {
      duration: `${Math.round(duration/1000)}s`,
      code,
      remaining: wss.clients.size
    });

    fileStorage.saveAnalytics('websocket_disconnection', {
      sessionId,
      duration,
      code,
      messageCount: ws.messageCount,
      timestamp: new Date().toISOString()
    });
  });

  ws.on('error', (error) => {
    wsLogger.error(sessionId, 'WebSocket error', error);
  });
  
  // Ping interval with cleanup
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);

  ws.on('pong', () => {
    ws.lastActivity = Date.now();
  });
});

// Cleanup idle connections
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  wss.clients.forEach((ws) => {
    if (now - ws.lastActivity > CLIENT_TIMEOUT) {
      ws.close(1000, 'Idle timeout');
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    wsLogger.info('CLEANUP', `Cleaned ${cleaned} inactive connections`, {
      active: wss.clients.size
    });
  }
}, 60000);

// ============================================================================
// ERROR HANDLING - SECURE
// ============================================================================

app.use((err, req, res, next) => {
  // Don't log expected errors
  if (err.statusCode && err.statusCode < 500) {
    logger.warn(req.sessionId, 'Client error', { 
      error: err.message,
      status: err.statusCode 
    });
  } else {
    logger.error(req.sessionId, 'Server error', err);
  }

  const statusCode = err.statusCode || err.status || 500;
  
  // Never expose error details in production
  const errorResponse = {
    error: statusCode === 500 ? 'Internal server error' : err.message,
    requestId: req.sessionId
  };

  // Add stack trace only in development
  if (IS_DEVELOPMENT && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  const ip = getClientIP(req);
  
  logger.warn(req.sessionId, `404 Not Found: ${req.path}`, {
    method: req.method,
    ip
  });

  // Track excessive 404s as suspicious
  const key = `404_${ip}`;
  const count = (security.suspiciousActivity.get(key)?.count || 0) + 1;
  
  if (count > 20) {
    security.recordSuspiciousActivity(ip, 'Excessive 404 requests', 2);
  }
  
  res.status(404).json({ 
    error: 'Not found',
    path: req.path
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async (signal) => {
  logger.warn('SHUTDOWN', `Shutting down gracefully... (${signal})`);
  
  // Save final memory stats
  memoryMonitor.saveToStorage();
  memLogger.success('SHUTDOWN', 'Memory stats saved');
  
  // Create backup
  try {
    await fileStorage.createBackup();
    logger.success('SHUTDOWN', 'Backup created');
  } catch (error) {
    logger.error('SHUTDOWN', 'Backup failed', error);
  }
  
  // Close WebSocket connections
  let wsCount = 0;
  wss.clients.forEach(client => {
    client.close(1001, 'Server shutting down');
    wsCount++;
  });
  logger.info('SHUTDOWN', `Closed ${wsCount} WebSocket connections`);
  
  // Stop cleanup scheduler
  cleanupScheduler.stop();
  
  // Close server
  server.close(() => {
    logger.success('SHUTDOWN', 'Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('SHUTDOWN', 'Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('FATAL', 'Uncaught Exception', error);
  console.error(error.stack);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('FATAL', 'Unhandled Rejection', { reason, promise });
  console.error(reason);
});

// ============================================================================
// HEALTH MONITORING
// ============================================================================

const monitoringInterval = IS_RAILWAY ? 15 * 60 * 1000 : 5 * 60 * 1000;

setInterval(() => {
  const record = memoryMonitor.record();
  
  if (record.memory.heapUsed > 400 || IS_DEVELOPMENT) {
    memLogger.info('MONITOR', 'Health check', {
      memory: `${record.memory.heapUsed}MB / ${record.memory.heapTotal}MB`,
      connections: record.connections,
      uptime: `${Math.round(record.uptime / 60)}min`,
      security: {
        blockedIPs: security.blockedIPs.size,
        suspiciousIPs: security.suspiciousActivity.size
      }
    });
  }
}, monitoringInterval);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || config.server.port || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.success('STARTUP', `🔒 Secured server running at http://${HOST}:${PORT}`, {
    environment: process.env.NODE_ENV || 'production',
    platform: IS_RAILWAY ? 'Railway' : 'Local',
    logToFile: process.env.LOG_TO_FILE === 'true',
    trustProxy: app.get('trust proxy'),
    security: 'ENABLED'
  });

  if (IS_RAILWAY) {
    logger.info('STARTUP', 'Railway Configuration', {
      project: process.env.RAILWAY_PROJECT_ID,
      environment: process.env.RAILWAY_ENVIRONMENT_ID
    });
  }

  logger.info('STARTUP', 'Security Configuration', {
    ipBlocking: 'enabled',
    rateLimit: 'enabled',
    inputValidation: 'enabled',
    threatDetection: 'enabled',
    wsConnectionLimit: security.THRESHOLDS.MAX_WS_CONNECTIONS_PER_IP
  });

  logger.info('STARTUP', 'Cache Configuration', {
    prsTTL: `${config.cache?.ttl?.prs || 3600}s`,
    candidateTTL: `${config.cache?.ttl?.candidate || 3600}s`
  });

  logger.info('STARTUP', 'Monitoring', {
    interval: `${monitoringInterval / 1000 / 60}min`,
    fileStorage: 'enabled'
  });

  cleanupScheduler.start();
  
  // Image proxy cleanup
  const imageCleanupInterval = 2 * 60 * 60 * 1000;
  setInterval(() => {
    imageProxy.cleanup();
    logger.info('IMAGE-CLEANUP', 'Old image mappings cleaned');
  }, imageCleanupInterval);
  
  logger.info('STARTUP', 'Image proxy cleanup scheduled', {
    interval: '2 hours'
  });

  logger.success('STARTUP', '✅ All systems operational');
});

export { app, server, wss };