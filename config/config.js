export default {
  // Server configuration
  server: {
    port: 3000,
    allowedOrigins: ['http://localhost:3000']
  },

  // Authentication tokens
  adminToken: process.env.ADMIN_TOKEN || 'change-me-in-production',

  // IP Whitelist (for admin endpoints)
  adminWhitelist: process.env.ADMIN_IPS?.split(',') || ['127.0.0.1', '::1'],

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],

  // Scraper configuration
  scraper: {
    maxBrowsers: parseInt(process.env.MAX_BROWSERS) || 3
  },

  // Cache configuration
  cache: {
    ttl: {
      prs: 3600,
      candidate: 3600
    }
  },

  // Cleanup configuration
  cleanup: {
    enabled: true,
    retention: {
      logs: 30, // days
      candidates: 24, // hours
      prs: 24, // hours
      analytics: 24, // hours
      cache: 1 // hours
    }
  },

  // Rate Limits
  rateLimits: {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    },
    websocket: {
      maxConnectionsPerIP: parseInt(process.env.MAX_WS_CONNECTIONS_PER_IP) || 5,
      maxMessagesPerConnection: 100
    }
  },

  // Request Limits
  requestLimits: {
    jsonBodySize: '10kb',
    urlEncodedBodySize: '10kb',
    maxMessageSize: 10 * 1024 // 10KB
  }
};
