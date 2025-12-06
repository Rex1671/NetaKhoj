export default {
  server: {
    port: 3000,
    allowedOrigins: ['http://localhost:3000']
  },

  adminToken: process.env.ADMIN_TOKEN || 'change-me-in-production',

  adminWhitelist: process.env.ADMIN_IPS?.split(',') || ['127.0.0.1', '::1'],

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],

  scraper: {
    maxBrowsers: parseInt(process.env.MAX_BROWSERS) || 3
  },

  cache: {
    ttl: {
      prs: 3600,
      candidate: 3600
    }
  },

  
  cleanup: {
    enabled: true,
    retention: {
      logs: 30,
      candidates: 1, 
      prs: 1,
      analytics: 1, 
      cache: 1 
    }
  },

  rateLimits: {
    api: {
      windowMs: 15 * 60 * 1000,
      max: 100
    },
    websocket: {
      maxConnectionsPerIP: parseInt(process.env.MAX_WS_CONNECTIONS_PER_IP) || 5,
      maxMessagesPerConnection: 100
    }
  },

  requestLimits: {
    jsonBodySize: '10kb',
    urlEncodedBodySize: '10kb',
    maxMessageSize: 10 * 1024 
  }
};
