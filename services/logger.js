import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import geoip from 'geoip-lite';
import useragent from 'useragent';
import crypto from 'crypto';
import os from 'os'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const consoleFormat = winston.format.printf(({ level, message }) => {
  const emoji = {
    error: '❌',
    warn: '⚠️',
    info: '✅',
    http: '🌐',
    verbose: '📝',
    debug: '🔍',
    silly: '💭'
  }[level] || 'ℹ️';
  
  return `${emoji} ${message}`;
});

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports = {
  combined: new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileFormat
  }),
  
  error: new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error',
    format: fileFormat
  }),
  
  access: new DailyRotateFile({
    filename: path.join(logsDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '7d',
    format: fileFormat
  }),
  
  websocket: new DailyRotateFile({
    filename: path.join(logsDir, 'websocket-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: fileFormat
  }),
  
  security: new DailyRotateFile({
    filename: path.join(logsDir, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat
  })
};

const fileLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  transports: [
    transports.combined,
    transports.error
  ]
});

const accessLogger = winston.createLogger({
  transports: [transports.access]
});

const wsLogger = winston.createLogger({
  transports: [transports.websocket]
});

const securityLogger = winston.createLogger({
  transports: [transports.security]
});

const consoleLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    consoleFormat
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.SILENT === 'true'
    })
  ]
});

class Logger {
  static generateFingerprint(req) {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || req.connection?.remoteAddress || ''
    ];
    return crypto.createHash('md5').update(components.join('|')).digest('hex');
  }

  static getClientInfo(req) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const cleanIp = ip.replace('::ffff:', '');
    const geo = geoip.lookup(cleanIp);
    const agent = useragent.parse(req.headers['user-agent'] || '');
    
    return {
      ip: cleanIp,
      fingerprint: this.generateFingerprint(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      browser: agent.toAgent(),
      os: agent.os.toString(),
      device: agent.device.toString(),
      location: geo ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        coordinates: geo.ll
      } : null,
      referer: req.headers.referer || null,
      sessionId: req.sessionId || null
    };
  }

  static logRequest(req, res, responseTime) {
    const clientInfo = this.getClientInfo(req);
    
    accessLogger.info({
      type: 'http_request',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ...clientInfo,
      timestamp: new Date().toISOString()
    });

    if (res.statusCode >= 500) {
      consoleLogger.error(`${req.method} ${req.originalUrl} → ${res.statusCode} (${responseTime}ms)`);
    } else if (res.statusCode >= 400) {
      consoleLogger.warn(`${req.method} ${req.originalUrl} → ${res.statusCode}`);
    } else if (process.env.LOG_REQUESTS === 'true') {
      consoleLogger.info(`${req.method} ${req.originalUrl} → ${res.statusCode}`);
    }
  }

  static logWebSocket(event, ws, data = {}) {
    wsLogger.info({
      type: 'websocket',
      event,
      sessionId: ws.sessionId || 'unknown',
      ip: ws.clientIp || ws._socket?.remoteAddress || 'unknown',
      ...data,
      timestamp: new Date().toISOString()
    });
    
    if (event === 'error') {
      consoleLogger.error(`WebSocket error: ${data.error}`);
    } else if (process.env.LOG_WS === 'true') {
      consoleLogger.info(`WS ${event}: ${ws.sessionId}`);
    }
  }

  static logSecurity(event, req, details = {}) {
    const clientInfo = this.getClientInfo(req);
    
    securityLogger.warn({
      type: 'security',
      event,
      ...clientInfo,
      details,
      timestamp: new Date().toISOString()
    });

    consoleLogger.warn(`Security: ${event} from ${clientInfo.ip}`);
  }

  static logError(error, context = {}) {
    fileLogger.error({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    consoleLogger.error(error.message);
  }

  static info(message, metadata = {}) {
    fileLogger.info({ message, ...metadata });
    if (process.env.LOG_VERBOSE === 'true') {
      consoleLogger.info(message);
    }
  }

  static warn(message, metadata = {}) {
    fileLogger.warn({ message, ...metadata });
    consoleLogger.warn(message);
  }

  static debug(message, metadata = {}) {
    fileLogger.debug({ message, ...metadata });
    if (process.env.DEBUG === 'true') {
      consoleLogger.info(`[DEBUG] ${message}`);
    }
  }

  static console(message, type = 'info') {
    const messages = {
      info: () => consoleLogger.info(message),
      warn: () => consoleLogger.warn(message),
      error: () => consoleLogger.error(message),
      success: () => consoleLogger.info(message)
    };
    
    (messages[type] || messages.info)();
  }

  // Get system info
  static getSystemInfo() {
    return {
      platform: process.platform,
      cpus: os.cpus().length,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
      nodeVersion: process.version
    };
  }

  static cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const logFiles = fs.readdirSync(logsDir);
    let deletedCount = 0;
    
    for (const file of logFiles) {
      if (file.includes('audit')) continue;
      
      const filePath = path.join(logsDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      fileLogger.info(`Cleaned ${deletedCount} old log files`);
    }
  }
}

export default Logger;