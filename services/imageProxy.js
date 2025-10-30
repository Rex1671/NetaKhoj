// services/imageProxy.js
import crypto from 'crypto';
import { createLogger } from '../utils/logger.js';
import fileStorage from '../utils/fileStorage.js';

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

    // Load existing mappings on startup
    this._loadMappings();
  }

  /**
   * Load mappings from persistent storage
   */
  async _loadMappings() {
    try {
      const result = await fileStorage.loadImageMappings();
      if (result.mappings && Object.keys(result.mappings).length > 0) {
        this.urlMap = new Map(Object.entries(result.mappings));
        // Rebuild reverse map
        this.reverseMap.clear();
        this.urlMap.forEach((url, id) => {
          this.reverseMap.set(url, id);
        });
        logger.success('MAPPINGS-LOADED', `Loaded ${this.urlMap.size} image mappings from storage`);
      } else {
        logger.info('MAPPINGS-LOADED', 'No existing mappings found, starting fresh');
      }
    } catch (error) {
      logger.error('MAPPINGS-LOAD-FAILED', 'Failed to load image mappings', error);
    }
  }

  /**
   * Save mappings to persistent storage
   */
  async _saveMappings() {
    try {
      const mappings = Object.fromEntries(this.urlMap);
      await fileStorage.saveImageMappings(mappings);
      logger.info('MAPPINGS-SAVED', `Saved ${this.urlMap.size} mappings to storage`);
    } catch (error) {
      logger.error('MAPPINGS-SAVE-FAILED', 'Failed to save image mappings', error);
    }
  }

  /**
   * Generate a unique, secure ID for an image URL
   */
  generateImageId(url) {
    if (!url || url === 'N/A' || url === 'Unknown' || url === '') {
      return null;
    }

    // Check if we already have an ID for this URL
    if (this.reverseMap.has(url)) {
      const existingId = this.reverseMap.get(url);
      logger.info('ID-EXISTS', `Reusing existing ID for URL`, {
        id: existingId,
        url: url.substring(0, 50) + '...'
      });
      return existingId;
    }

    // Create a hash-based ID
    const hash = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(url)
      .digest('hex')
      .substring(0, 16);

    const imageId = `img_${hash}`;

    // Store bidirectional mapping
    this.urlMap.set(imageId, url);
    this.reverseMap.set(url, imageId);
    this.stats.created++;

    // Save mappings to persistent storage
    this._saveMappings();

    logger.success('ID-CREATED', `Created image ID`, {
      id: imageId,
      url: url.substring(0, 50) + '...',
      totalMappings: this.urlMap.size
    });

    return imageId;
  }

  /**
   * Get actual URL from image ID
   */
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

  /**
   * Create proxy URL
   */
  createProxyUrl(originalUrl, baseUrl = '') {
    if (!originalUrl || originalUrl === 'N/A' || originalUrl === 'Unknown' || originalUrl === '') {
      logger.warn('INVALID-URL', 'Cannot create proxy for invalid URL', { originalUrl });
      return null;
    }

    // Don't proxy if it's already a proxy URL
    if (originalUrl.includes('/api/image/img_')) {
      logger.info('ALREADY-PROXIED', 'URL is already proxied', { originalUrl });
      return originalUrl;
    }

    const imageId = this.generateImageId(originalUrl);

    if (!imageId) {
      logger.error('ID-GENERATION-FAILED', 'Failed to generate image ID');
      return originalUrl; // Return original URL as fallback
    }

    const proxyUrl = `${baseUrl}/api/image/${imageId}`;

    logger.success('PROXY-CREATED', `Proxy URL created`, {
      imageId,
      proxyUrl,
      originalUrl: originalUrl.substring(0, 50) + '...'
    });

    return proxyUrl;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      totalMappings: this.urlMap.size,
      cacheSize: this.reverseMap.size,
      stats: this.stats,
      sampleIds: Array.from(this.urlMap.keys()).slice(0, 10)
    };
  }

  /**
   * Clear old mappings (optional cleanup)
   */
  cleanup() {
    const before = this.urlMap.size;

    // Keep only last 10000 mappings
    if (this.urlMap.size > 10000) {
      const entries = Array.from(this.urlMap.entries());
      const toKeep = entries.slice(-10000);

      this.urlMap.clear();
      this.reverseMap.clear();

      toKeep.forEach(([id, url]) => {
        this.urlMap.set(id, url);
        this.reverseMap.set(url, id);
      });

      // Save updated mappings
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

  /**
   * Debug: List all mappings
   */
  listAllMappings() {
    const mappings = [];
    this.urlMap.forEach((url, id) => {
      mappings.push({ id, url: url.substring(0, 100) });
    });
    return mappings;
  }
}

// Export singleton instance
const imageProxy = new ImageProxyService();
export default imageProxy;
