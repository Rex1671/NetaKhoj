import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('IMAGE-PROXY');

class ImageProxyService {
  constructor() {
    this.urlMap = new Map();
    this.reverseMap = new Map();
    this.SECRET_KEY = process.env.IMAGE_PROXY_SECRET || 'default-secret-change-me';
    this.stats = {
      created: 0,
      served: 0,
      errors: 0
    };


  async _loadMappings() {
    try {
      logger.info('MAPPINGS-LOADED', 'Starting with empty mappings (loadImageMappings removed)');
    } catch (error) {
      logger.error('MAPPINGS-LOAD-FAILED', 'Failed to initialize mappings', error);
    }
  }

  async _saveMappings() {
    try {
      logger.info('MAPPINGS-SAVED', `Would save ${this.urlMap.size} mappings (disabled)`);
    } catch (error) {
      logger.error('MAPPINGS-SAVE-FAILED', 'Failed to save image mappings', error);
    }
  }

  generateImageId(url) {
    if (!url || url === 'N/A' || url === 'Unknown' || url === '') {
      return null;
    }

    if (this.reverseMap.has(url)) {
      const existingId = this.reverseMap.get(url);
      logger.info('ID-EXISTS', `Reusing existing ID for URL`, {
        id: existingId,
        url: url.substring(0, 50) + '...'
      });
      return existingId;
    }

    const hash = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(url)
      .digest('hex')
      .substring(0, 16);

    const imageId = `img_${hash}`;

    this.urlMap.set(imageId, url);
    this.reverseMap.set(url, imageId);
    this.stats.created++;

    this._saveMappings();

    logger.success('ID-CREATED', `Created image ID`, {
      id: imageId,
      url: url.substring(0, 50) + '...',
      totalMappings: this.urlMap.size
    });

    return imageId;
  }


  getActualUrl(imageId) {
    const url = this.urlMap.get(imageId);

    if (!url) {
      logger.warn('URL-NOT-FOUND', `No mapping found for image ID: ${imageId}`, {
        totalMappings: this.urlMap.size,
        availableIds: Array.from(this.urlMap.keys()).slice(0, 5)
      });
      this.stats.errors++;
      return null;
    }

    logger.info('URL-FOUND', `Retrieved URL for ${imageId}`);
    this.stats.served++;
    return url;
  }


  createProxyUrl(originalUrl, baseUrl = '') {
    if (!originalUrl || originalUrl === 'N/A' || originalUrl === 'Unknown' || originalUrl === '') {
      logger.warn('INVALID-URL', 'Cannot create proxy for invalid URL', { originalUrl });
      return null;
    }

    if (originalUrl.includes('/api/image/img_')) {
      logger.info('ALREADY-PROXIED', 'URL is already proxied', { originalUrl });
      return originalUrl;
    }

    const imageId = this.generateImageId(originalUrl);

    if (!imageId) {
      logger.error('ID-GENERATION-FAILED', 'Failed to generate image ID');
      return originalUrl; 
    }

    let railwayUrl;

    const env = (process.env.NODE_ENV || '').trim().toLowerCase();
    const isDev = env === 'development' || env === 'dev';

    if (isDev) {
      railwayUrl = baseUrl || 'http://localhost:3000';
      logger.info('PROXY-ENV', 'Using local base URL for development', {
        env: process.env.NODE_ENV,
        parsedEnv: env,
        railwayUrl
      });
    } else {
      railwayUrl = process.env.RAILWAY_STATIC_URL || baseUrl;
      logger.info('PROXY-ENV', 'Using production URL', {
        env: process.env.NODE_ENV,
        parsedEnv: env,
        railwayUrl
      });
    }

    if (railwayUrl.endsWith('/')) {
      railwayUrl = railwayUrl.slice(0, -1);
    }

    const proxyUrl = `${railwayUrl}/api/image/${imageId}`;

    logger.success('PROXY-CREATED', `Proxy URL created`, {
      imageId,
      proxyUrl,
      originalUrl: originalUrl.substring(0, 50) + '...'
    });

    return proxyUrl;
  }


  getStats() {
    return {
      totalMappings: this.urlMap.size,
      cacheSize: this.reverseMap.size,
      stats: this.stats,
      sampleIds: Array.from(this.urlMap.keys()).slice(0, 10)
    };
  }


  cleanup() {
    const before = this.urlMap.size;

    if (this.urlMap.size > 10000) {
      const entries = Array.from(this.urlMap.entries());
      const toKeep = entries.slice(-10000);

      this.urlMap.clear();
      this.reverseMap.clear();

      toKeep.forEach(([id, url]) => {
        this.urlMap.set(id, url);
        this.reverseMap.set(url, id);
      });

      this._saveMappings();

      logger.info('CLEANUP', `Cleaned up ${before - this.urlMap.size} old mappings`, {
        before,
        after: this.urlMap.size
      });
    } else {
      logger.info('CLEANUP', 'No cleanup needed', {
        currentSize: this.urlMap.size,
        maxSize: 10000
      });
    }
  }


  listAllMappings() {
    const mappings = [];
    this.urlMap.forEach((url, id) => {
      mappings.push({ id, url: url.substring(0, 100) });
    });
    return mappings;
  }
}

const imageProxy = new ImageProxyService();
export default imageProxy;
