import { createLogger } from '../utils/logger.js';
import fileStorage from '../utils/fileStorage.js';

const logger = createLogger('HTTP');

export function requestLogger(req, res, next) {
  const startTime = Date.now();

  if (req.path !== '/health' || process.env.NODE_ENV === 'development') {
    logger.request(req.sessionId, `${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.clientIP,
      userAgent: req.get('user-agent')
    });
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'error' : 'success';

    if (req.path !== '/health' || process.env.NODE_ENV === 'development') {
      logger[logLevel](req.sessionId, `${req.method} ${req.path} - ${res.statusCode}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: res.get('content-length') || 'unknown'
      });
    }

    fileStorage.saveAnalytics('http_request', {
      sessionId: req.sessionId,
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      duration,
      ip: req.clientIP,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });
  });

  next();
}

export default requestLogger;