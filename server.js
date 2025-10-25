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
import browserPool from './services/browserPool.js';
import memberRoutes from './routes/member.js';
import crypto from 'crypto'; 
import fs from 'fs';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if running on Render
const IS_RENDER = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;

// Create logs directory (Note: On Render, this will be ephemeral)
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Simple logging function
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
    security: '🔒'
  }[level] || 'ℹ️';
  
  const consoleMessage = `${emoji} [${level.toUpperCase()}] [${module}] [${new Date().toLocaleTimeString()}] ${message}`;
  console.log(consoleMessage);
  
  // On Render, avoid excessive file writes (ephemeral filesystem)
  if (!IS_RENDER && (toFile || level === 'error' || level === 'security')) {
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

// Helper function to get client IP
const getClientIP = (req) => {
  // On Render, the real IP is in these headers
  if (IS_RENDER) {
    // Render provides the client IP in these headers
    return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
           req.headers['x-real-ip'] || 
           req.headers['cf-connecting-ip'] || // If using Cloudflare
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

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS configuration for Render
app.use(cors({
  origin: IS_RENDER 
    ? [
        process.env.RENDER_EXTERNAL_URL, // Your Render app URL
        'https://*.onrender.com',
        ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
      ]
    : config.server.allowedOrigins,
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy configuration - ALWAYS true on Render
if (IS_RENDER) {
  // Render runs apps behind a proxy
  app.set('trust proxy', true);
  log('info', 'server', 'Trust proxy enabled (Render environment)');
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
  
  // Reduce logging on Render to avoid noise
  if (!IS_RENDER || req.path !== '/health') {
    log('req', 'server', `${req.method} ${req.path} | IP: ${clientIP}`);
  }
  
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 1000) {
      log('warn', 'server', `Slow request: ${req.method} ${req.path} (${responseTime}ms)`, !IS_RENDER);
    }
    
    if (res.statusCode >= 400) {
      log('error', 'server', `${req.method} ${req.path} → ${res.statusCode} | IP: ${clientIP}`, !IS_RENDER);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Apply rate limiting
app.use('/api/', (req, res, next) => {
  apiLimiter(req, res, (err) => {
    if (err && err.statusCode === 429) {
      log('security', 'rate-limit', `API rate limit exceeded | IP: ${req.clientIP} | Path: ${req.path}`, !IS_RENDER);
    }
    next(err);
  });
});

app.use('/member/', (req, res, next) => {
  memberLimiter(req, res, (err) => {
    if (err && err.statusCode === 429) {
      log('security', 'rate-limit', `Member rate limit exceeded | IP: ${req.clientIP} | Path: ${req.path}`, !IS_RENDER);
    }
    next(err);
  });
});

// Static files
app.use(express.static('public'));

// Routes
app.use('/api', apiRoutes);
app.use('/member', memberRoutes); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket handling
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
    log('error', 'ws', `Error for ${sessionId}: ${error.message}`, !IS_RENDER);
  });
  
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

// WebSocket cleanup interval
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

// Skip log cleanup on Render (ephemeral filesystem)
if (!IS_RENDER) {
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

// Error handling middleware
app.use((err, req, res, next) => {
  log('error', 'server', `${err.message} | Stack: ${err.stack}`, !IS_RENDER);
  
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({ 
    error: config.env === 'development' ? err.message : 'Internal server error',
    requestId: req.sessionId
  });
});

// 404 handler
app.use((req, res) => {
  log('warn', 'server', `404 Not Found: ${req.method} ${req.path} | IP: ${req.clientIP}`);
  res.status(404).json({ 
    error: 'Not found',
    path: req.path
  });
});

// Graceful shutdown
const shutdown = async (signal) => {
  log('warn', 'server', `Shutting down gracefully... (${signal})`);
  
  let wsCount = 0;
  wss.clients.forEach(client => {
    client.close(1001, 'Server shutting down');
    wsCount++;
  });
  log('info', 'server', `Closed ${wsCount} WebSocket connections`);
  
  await browserPool.closeAll();
  log('info', 'server', 'Browser pool closed');
  
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
  log('error', 'server', `Uncaught Exception: ${error.message}`, !IS_RENDER);
  console.error(error.stack);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  log('error', 'server', `Unhandled Rejection: ${reason}`, !IS_RENDER);
  console.error(reason);
});

// Health monitoring - reduced frequency on Render
const monitoringInterval = IS_RENDER ? 15 * 60 * 1000 : 5 * 60 * 1000;
setInterval(() => {
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
  
  // Skip file writing on Render
  if (!IS_RENDER) {
    const statsFile = path.join(logsDir, `stats-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(statsFile, JSON.stringify({ timestamp: new Date().toISOString(), ...healthInfo }) + '\n');
  }
  
  if (memUsage.heapUsed > 500 * 1024 * 1024) {
    log('warn', 'server', `High memory usage: ${healthInfo.memory.heapUsed}`, !IS_RENDER);
  }
}, monitoringInterval);

// Start server - Render provides PORT
const PORT = process.env.PORT || config.server.port || 3000;
const HOST = '0.0.0.0'; // Always use 0.0.0.0 on Render

server.listen(PORT, HOST, () => {
  log('success', 'server', `Running at http://${HOST}:${PORT}`);
  log('info', 'server', `Environment: ${config.env || process.env.NODE_ENV || 'production'}`);
  log('info', 'server', `Platform: ${IS_RENDER ? 'Render' : 'Local/Other'}`);
  log('info', 'server', `Trust Proxy: ${app.get('trust proxy')}`);
  
  if (IS_RENDER) {
    log('info', 'server', `Render Service: ${process.env.RENDER_SERVICE_NAME}`);
    log('info', 'server', `External URL: ${process.env.RENDER_EXTERNAL_URL}`);
  }
  
  log('info', 'server', `Cache TTL - PRS: ${config.cache.ttl.prs}s, Candidate: ${config.cache.ttl.candidate}s`);
  log('info', 'server', `Max browsers: ${config.scraper.maxBrowsers}`);
});

export { app, server };