import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { fileURLToPath } from 'url';  
import compression from 'compression';
import config from './config/config.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import apiRoutes from './routes/api.js';
import browserPool from './services/browserPool.js';
import memberRoutes from './routes/member.js';


import crypto from 'crypto'; 

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const log = (level, module, message) => {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = { 
    info: '📝', 
    success: '✅', 
    error: '❌', 
    warn: '⚠️',
    ws: '🔌',
    req: '🌐',
    cache: '💾',
    browser: '🚀'
  }[level] || 'ℹ️';
  console.log(`${emoji} [${level.toUpperCase()}] [${module}] [${timestamp}] ${message}`);
};

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: config.server.allowedOrigins,
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  log('req', 'server', `${req.method} ${req.path}`);
  next();
});


app.use('/api/', apiLimiter);

app.use(express.static('public'));

app.use('/api', apiRoutes);
app.use('/member', memberRoutes); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



const clients = new Map();
const CLIENT_TIMEOUT = 5 * 60 * 1000;

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const sessionId = 'session_' + crypto.randomBytes(8).toString('hex');

  log('ws', 'server', `Client connected → ${sessionId}, IP=${clientIp}`);

  ws.sessionId = sessionId;
  ws.lastActivity = Date.now();
  ws.tempIds = new Set();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.tempId) {
        clients.set(data.tempId, ws);
        ws.tempIds.add(data.tempId);
        ws.lastActivity = Date.now();
        log('ws', 'server', `${sessionId} subscribed: tempId=${data.tempId}`);
      }
    } catch (err) {
      log('error', 'ws', `Invalid message: ${err.message}`);
    }
  });

  ws.on('close', () => {
    for (const tempId of ws.tempIds) {
      clients.delete(tempId);
    }
    log('ws', 'server', `Client disconnected → ${sessionId}`);
  });

  ws.on('error', (error) => {
    log('error', 'ws', `Error for ${sessionId}: ${error.message}`);
  });
});
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [tempId, ws] of clients.entries()) {
    if (now - ws.lastActivity > CLIENT_TIMEOUT) {
      ws.close();
      clients.delete(tempId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    log('info', 'ws', `Cleaned ${cleaned} inactive connections`);
  }
}, 60000);

app.use((err, req, res, next) => {
  log('error', 'server', `${err.message}`);
  res.status(500).json({ 
    error: config.env === 'development' ? err.message : 'Internal server error' 
  });
});

const shutdown = async () => {
  log('info', 'server', 'Shutting down gracefully...');
  
  wss.clients.forEach(client => client.close());
  
  await browserPool.closeAll();
  
  server.close(() => {
    log('success', 'server', 'Server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    log('error', 'server', 'Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(config.server.port, config.server.host, () => {
  log('success', 'server', `Running at http://${config.server.host}:${config.server.port}`);
  log('info', 'server', `Environment: ${config.env}`);
  log('info', 'server', `Cache TTL - PRS: ${config.cache.ttl.prs}s, Candidate: ${config.cache.ttl.candidate}s`);
  log('info', 'server', `Max browsers: ${config.scraper.maxBrowsers}`);
});

export  { app, server };