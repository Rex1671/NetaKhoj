import dotenv from 'dotenv';
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0' || localhost,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    behindProxy: process.env.BEHIND_PROXY === 'true',
    trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || []
  },
  cache: {
    ttl: {
      prs: parseInt(process.env.CACHE_TTL_PRS) || 3600,
      candidate: parseInt(process.env.CACHE_TTL_CANDIDATE) || 1800,
      geojson: 86400
    }
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },
   member: {
      windowMs: 1 * 60 * 1000,
      max: process.env.MEMBER_RATE_LIMIT || 30
    },
  scraper: {
    timeout: parseInt(process.env.SCRAPER_TIMEOUT) || 30000,
    retries: parseInt(process.env.SCRAPER_RETRIES) || 3,
    maxBrowsers: parseInt(process.env.MAX_BROWSERS) || 2
  }
};

export default config;
