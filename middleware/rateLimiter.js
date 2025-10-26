import rateLimit from 'express-rate-limit';
import Logger from '../services/logger.js';

const IS_RENDER = process.env.RENDER === 'true' || !!process.env.RENDER_SERVICE_NAME;

const customKeyGenerator = (req) => {
  if (IS_RENDER) {
    const forwarded = req.headers['x-forwarded-for'];
    return forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress;
  }
  
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress;
  return ip;
};

const skip = (req) => {
  if (IS_RENDER) return false;
  
  if (process.env.NODE_ENV === 'development') {
    const ip = req.ip || req.connection.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
  return false;
};

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_RENDER ? 100 : 200, 
  keyGenerator: customKeyGenerator,
  skip: skip,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  }
});

export const memberLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: IS_RENDER ? 30 : 60,
  keyGenerator: customKeyGenerator,
  skip: skip,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  }
});

export const scraperLimiter = apiLimiter;
