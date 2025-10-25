import Logger from '../services/logger.js';

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Generate session ID
  if (!req.sessionId) {
    req.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(...args) {
    res.end = originalEnd;
    res.end.apply(res, args);
    
    const responseTime = Date.now() - startTime;
    Logger.logRequest(req, res, responseTime);
  };

  next();
};