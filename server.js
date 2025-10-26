import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'url';  
import compression from 'compression';
import config from './config/config.js';
import { apiLimiter, memberLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/api.js';
import memberRoutes from './routes/member.js';
import crypto from 'crypto'; 
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if running on Railway
const IS_RAILWAY = !!process.env.RAILWAY_PROJECT_ID;

// Create necessary directories
const logsDir = path.join(__dirname, 'logs');
const dataDir = path.join(__dirname, 'data');
[logsDir, dataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================================================
// LOGGING - DEFINE FIRST (MOVED UP)
// ============================================================================

const log = (level, module, message, toFile = false) => {
  const timestamp = new Date().toISOString();
  const emoji = {
    info: '📝',
    success: '✅',
    error: '❌',
    warn: '⚠️',
    ws: '🔌',
    req: '🌐',
    cache: '💾',
    browser: '🚀',
    security: '🔒',
    memory: '🧠'
  }[level] || 'ℹ️';

  const consoleMessage = `${emoji} [${level.toUpperCase()}] [${module}] [${new Date().toLocaleTimeString()}] ${message}`;
  console.log(consoleMessage);

  if (!IS_RAILWAY && (toFile || level === 'error' || level === 'security')) {
    const logEntry = {
      timestamp,
      level,
      module,
      message,
      date: new Date().toLocaleDateString()
    };

    const logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }
};

// ============================================================================
// MEMORY MONITORING (NOW log IS DEFINED)
// ============================================================================

const MEMORY_STORAGE_FILE = path.join(dataDir, 'memory-stats.json');
const MEMORY_CHECK_INTERVAL = IS_RAILWAY ? 15 * 60 * 1000 : 5 * 60 * 1000;
const MAX_MEMORY_RECORDS = 1000;

class MemoryMonitor {
  constructor() {
    this.stats = this.loadStats();
  }

  loadStats() {
    try {
      if (fs.existsSync(MEMORY_STORAGE_FILE)) {
        const data = fs.readFileSync(MEMORY_STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        log('info', 'memory', `Loaded ${parsed.records?.length || 0} historical memory records`);
        return parsed;
      }
    } catch (error) {
      log('warn', 'memory', `Could not load memory stats: ${error.message}`);
    }
    
    return {
      records: [],
      metadata: {
        createdAt: new Date().toISOString(),
        platform: IS_RAILWAY ? 'Railway' : 'Local',
        nodeVersion: process.version
      }
    };
  }

  saveStats() {
    try {
      if (this.stats.records.length > MAX_MEMORY_RECORDS) {
        this.stats.records = this.stats.records.slice(-MAX_MEMORY_RECORDS);
      }

      this.stats.metadata.lastUpdated = new Date().toISOString();
      this.stats.metadata.totalRecords = this.stats.records.length;

      fs.writeFileSync(MEMORY_STORAGE_FILE, JSON.stringify(this.stats, null, 2), 'utf-8');
    } catch (error) {
      log('error', 'memory', `Failed to save memory stats: ${error.message}`);
    }
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

    this.stats.records.push(record);
    
    if (this.stats.records.length % 10 === 0 || record.memory.heapUsed > 400) {
      this.saveStats();
    }

    return record;
  }

  getStats() {
    const recent = this.stats.records.slice(-100);
    
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
      total: this.stats.records.length,
      retention: `${Math.round((Date.now() - new Date(this.stats.metadata.createdAt).getTime()) / (1000 * 60 * 60))} hours`
    };
  }

  exportCSV() {
    const headers = 'timestamp,uptime,rss,heapTotal,heapUsed,external,websocket_connections\n';
    const rows = this.stats.records.map(r => 
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

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: IS_RAILWAY
    ? [
        process.env.RAILWAY_STATIC_URL,
        'https://*.up.railway.app',
        ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
      ]
    : config.server.allowedOrigins,
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy configuration
if (IS_RAILWAY) {
  app.set('trust proxy', true);
  log('info', 'server', 'Trust proxy enabled (Railway environment)');
} else if (process.env.BEHIND_PROXY === 'true') {
  app.set('trust proxy', 'loopback');
  log('info', 'server', 'Trust proxy enabled for localhost');
} else {
  app.set('trust proxy', false);
  log('info', 'server', 'Trust proxy disabled (direct connection)');
}

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  if (!req.sessionId) {
    req.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  req.clientIP = clientIP;
  
  if (!IS_RAILWAY || req.path !== '/health') {
    log('req', 'server', `${req.method} ${req.path} | IP: ${clientIP}`);
  }

  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    const responseTime = Date.now() - startTime;

    if (responseTime > 1000) {
      log('warn', 'server', `Slow request: ${req.method} ${req.path} (${responseTime}ms)`, !IS_RAILWAY);
    }

    if (res.statusCode >= 400) {
      log('error', 'server', `${req.method} ${req.path} → ${res.statusCode} | IP: ${clientIP}`, !IS_RAILWAY);
    }

    return originalSend.call(this, data);
  };
  
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  const memStats = memoryMonitor.getStats();
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: memStats.current?.memory || process.memoryUsage(),
    connections: {
      websocket: wss.clients.size
    }
  });
});

// Memory stats endpoint
app.get('/api/memory/stats', (req, res) => {
  try {
    const stats = memoryMonitor.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log('error', 'memory', `Failed to get stats: ${error.message}`);
    res.status(500).json({ error: 'Failed to retrieve memory stats' });
  }
});

// Export memory stats as CSV
app.get('/api/memory/export', (req, res) => {
  try {
    const csv = memoryMonitor.exportCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="memory-stats-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    log('error', 'memory', `Failed to export: ${error.message}`);
    res.status(500).json({ error: 'Failed to export memory stats' });
  }
});

app.use('/api/', (req, res, next) => {
  apiLimiter(req, res, (err) => {
    if (err && err.statusCode === 429) {
      log('security', 'rate-limit', `API rate limit exceeded | IP: ${req.clientIP} | Path: ${req.path}`, !IS_RAILWAY);
    }
    next(err);
  });
});

app.use('/member/', (req, res, next) => {
  memberLimiter(req, res, (err) => {
    if (err && err.statusCode === 429) {
      log('security', 'rate-limit', `Member rate limit exceeded | IP: ${req.clientIP} | Path: ${req.path}`, !IS_RAILWAY);
    }
    next(err);
  });
});

app.use(express.static('public'));

app.use('/api', apiRoutes);
app.use('/member', memberRoutes); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// WEBSOCKET HANDLING
// ============================================================================

const clients = new Map();
const CLIENT_TIMEOUT = 5 * 60 * 1000;
const wsConnections = new Map();

wss.on('connection', (ws, req) => {
  const clientIp = getClientIP(req);
  const sessionId = 'ws_' + crypto.randomBytes(8).toString('hex');
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  ws.sessionId = sessionId;
  ws.clientIp = clientIp;
  ws.lastActivity = Date.now();
  ws.tempIds = new Set();
  ws.connectionTime = new Date();
  
  wsConnections.set(sessionId, {
    ip: clientIp,
    userAgent,
    connectedAt: new Date(),
    subscriptions: []
  });

  log('ws', 'server', `Client connected → ${sessionId} | IP: ${clientIp}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.tempId) {
        clients.set(data.tempId, ws);
        ws.tempIds.add(data.tempId);
        ws.lastActivity = Date.now();
        
        const connInfo = wsConnections.get(sessionId);
        if (connInfo) {
          connInfo.subscriptions.push(data.tempId);
        }
        
        log('ws', 'server', `${sessionId} subscribed: tempId=${data.tempId}`);
      }
    } catch (err) {
      log('error', 'ws', `Invalid message from ${sessionId}: ${err.message}`);
    }
  });

  ws.on('close', (code, reason) => {
    const duration = Date.now() - ws.connectionTime.getTime();
    
    for (const tempId of ws.tempIds) {
      clients.delete(tempId);
    }
    
    wsConnections.delete(sessionId);
    
    log('ws', 'server', `Client disconnected → ${sessionId} | Duration: ${Math.round(duration/1000)}s | Code: ${code}`);
  });

  ws.on('error', (error) => {
    log('error', 'ws', `Error for ${sessionId}: ${error.message}`, !IS_RAILWAY);
  });
  
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [tempId, ws] of clients.entries()) {
    if (now - ws.lastActivity > CLIENT_TIMEOUT) {
      ws.close(1000, 'Idle timeout');
      clients.delete(tempId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    log('info', 'ws', `Cleaned ${cleaned} inactive connections | Active: ${clients.size}`);
  }
}, 60000);

// ============================================================================
// LOG CLEANUP
// ============================================================================

if (!IS_RAILWAY) {
  setInterval(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    fs.readdir(logsDir, (err, files) => {
      if (err) return;

      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        fs.stat(filePath, (err, stats) => {
          if (!err && stats.mtime < cutoffDate) {
            fs.unlink(filePath, (err) => {
              if (!err) log('info', 'server', `Deleted old log: ${file}`);
            });
          }
        });
      });
    });
  }, 24 * 60 * 60 * 1000);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  log('error', 'server', `${err.message} | Stack: ${err.stack}`, !IS_RAILWAY);

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: config.env === 'development' ? err.message : 'Internal server error',
    requestId: req.sessionId
  });
});

app.use((req, res) => {
  log('warn', 'server', `404 Not Found: ${req.method} ${req.path} | IP: ${req.clientIP}`);
  res.status(404).json({ 
    error: 'Not found',
    path: req.path
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const shutdown = async (signal) => {
  log('warn', 'server', `Shutting down gracefully... (${signal})`);
  
  memoryMonitor.saveStats();
  log('success', 'memory', 'Memory stats saved');
  
  let wsCount = 0;
  wss.clients.forEach(client => {
    client.close(1001, 'Server shutting down');
    wsCount++;
  });
  log('info', 'server', `Closed ${wsCount} WebSocket connections`);
  
  server.close(() => {
    log('success', 'server', 'Server closed successfully');
    process.exit(0);
  });
  
  setTimeout(() => {
    log('error', 'server', 'Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  log('error', 'server', `Uncaught Exception: ${error.message}`, !IS_RAILWAY);
  console.error(error.stack);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'server', `Unhandled Rejection: ${reason}`, !IS_RAILWAY);
  console.error(reason);
});

// ============================================================================
// HEALTH MONITORING
// ============================================================================

const monitoringInterval = IS_RAILWAY ? 15 * 60 * 1000 : 5 * 60 * 1000;
setInterval(() => {
  const record = memoryMonitor.record();
  
  const memUsage = process.memoryUsage();
  const healthInfo = {
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`
    },
    connections: {
      http: server._connections || 0,
      websocket: wss.clients.size,
      tracked: wsConnections.size
    },
    uptime: `${Math.round(process.uptime() / 60)} minutes`
  };

  if (!IS_RAILWAY) {
    const statsFile = path.join(logsDir, `stats-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(statsFile, JSON.stringify({ timestamp: new Date().toISOString(), ...healthInfo }) + '\n');
  }

  if (memUsage.heapUsed > 500 * 1024 * 1024) {
    log('warn', 'server', `High memory usage: ${healthInfo.memory.heapUsed}`, !IS_RAILWAY);
  }
}, monitoringInterval);

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || config.server.port || 3000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  log('success', 'server', `Running at http://${HOST}:${PORT}`);
  log('info', 'server', `Environment: ${config.env || process.env.NODE_ENV || 'production'}`);
  log('info', 'server', `Platform: ${IS_RAILWAY ? 'Railway' : 'Local/Other'}`);
  log('info', 'server', `Trust Proxy: ${app.get('trust proxy')}`);

  if (IS_RAILWAY) {
    log('info', 'server', `Railway Project: ${process.env.RAILWAY_PROJECT_ID}`);
    log('info', 'server', `Railway Environment: ${process.env.RAILWAY_ENVIRONMENT_ID}`);
  }

  log('info', 'server', `Cache TTL - PRS: ${config.cache.ttl.prs}s, Candidate: ${config.cache.ttl.candidate}s`);
  log('info', 'memory', `Memory monitoring enabled (interval: ${monitoringInterval / 1000 / 60} min)`);
});

export { app, server, clients, wss };