import rateLimit from 'express-rate-limit';
import config from '../config/config.js';

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const scraperLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many scraping requests, please slow down.' },
  skipSuccessfulRequests: false,
});

export { apiLimiter, scraperLimiter };
