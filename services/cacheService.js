import { createLogger } from '../utils/logger.js';

const logger = createLogger('CACHE');

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      prs: { hits: 0, misses: 0, sets: 0, expirations: 0 },
      candidate: { hits: 0, misses: 0, sets: 0, expirations: 0 },
      geojson: { hits: 0, misses: 0, sets: 0, expirations: 0 },
      image: { hits: 0, misses: 0, sets: 0, expirations: 0 },
      poll: { hits: 0, misses: 0, sets: 0, expirations: 0 }
    };
    this.logger = logger;

    logger.info('INIT', 'Cache service initialized');
  }

  getCacheKey(type, key) {
    return `${type}:${key}`;
  }

  getTTL(type) {
    const ttls = {
      image: 24 * 60 * 60 * 1000,
      prs: 60 * 60 * 1000,
      candidate: 60 * 60 * 1000,
      geojson: 24 * 60 * 60 * 1000,
      poll: 5 * 60 * 1000
    };

    return ttls[type] || 60 * 60 * 1000;
  }

  set(type, key, value, ttl = null) {
    const cacheKey = this.getCacheKey(type, key);
    const expiresAt = Date.now() + (ttl || this.getTTL(type));

    if (!this.stats[type]) {
      this.stats[type] = { hits: 0, misses: 0, sets: 0, expirations: 0 };
    }

    this.cache.set(cacheKey, {
      data: value,
      expiresAt,
      createdAt: Date.now(),
      type
    });

    this.stats[type].sets++;

    if (type === 'image') {
      this.logger.info('SET', `Cached image: ${key}`, {
        size: value?.buffer ? `${(value.buffer.length / 1024).toFixed(2)} KB` : 'unknown',
        contentType: value?.contentType || 'unknown',
        expiresIn: `${Math.round((ttl || this.getTTL(type)) / 1000 / 60)} minutes`
      });
    } else {
      this.logger.info('SET', `Cached ${type}: ${key}`);
    }

    return true;
  }

  get(type, key) {
    const cacheKey = this.getCacheKey(type, key);
    const entry = this.cache.get(cacheKey);

    if (!this.stats[type]) {
      this.stats[type] = { hits: 0, misses: 0, sets: 0, expirations: 0 };
    }

    if (!entry) {
      this.stats[type].misses++;
      this.logger.info('MISS', `Cache miss: ${type}:${key}`);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats[type].misses++;
      this.stats[type].expirations++;
      this.logger.info('EXPIRED', `Cache expired: ${type}:${key}`);
      return null;
    }

    this.stats[type].hits++;

    if (type === 'image') {
      this.logger.success('HIT', `Cache hit: ${type}:${key}`, {
        age: `${Math.round((Date.now() - entry.createdAt) / 1000 / 60)} minutes`,
        size: entry.data?.buffer ? `${(entry.data.buffer.length / 1024).toFixed(2)} KB` : 'unknown'
      });
    } else {
      this.logger.success('HIT', `Cache hit: ${type}:${key}`);
    }

    return entry.data;
  }

  has(type, key) {
    const cacheKey = this.getCacheKey(type, key);
    const entry = this.cache.get(cacheKey);

    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  delete(type, key) {
    const cacheKey = this.getCacheKey(type, key);
    const deleted = this.cache.delete(cacheKey);

    if (deleted) {
      this.logger.info('DELETE', `Deleted cache: ${type}:${key}`);
    }

    return deleted;
  }

  flush(type = null) {
    if (type) {
      let deleted = 0;
      for (const [key, entry] of this.cache.entries()) {
        if (entry.type === type) {
          this.cache.delete(key);
          deleted++;
        }
      }

      if (this.stats[type]) {
        this.stats[type] = { hits: 0, misses: 0, sets: 0, expirations: 0 };
      }

      this.logger.info('FLUSH', `Flushed cache type: ${type}`, { deleted });
    } else {
      const size = this.cache.size;
      this.cache.clear();

      Object.keys(this.stats).forEach(key => {
        this.stats[key] = { hits: 0, misses: 0, sets: 0, expirations: 0 };
      });

      this.logger.info('FLUSH', `Flushed all cache`, { deleted: size });
    }
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;

        if (this.stats[entry.type]) {
          this.stats[entry.type].expirations++;
        }
      }
    }

    if (cleaned > 0) {
      this.logger.info('CLEANUP', `Cleaned ${cleaned} expired entries`, {
        remaining: this.cache.size
      });
    }

    return cleaned;
  }

  getStats() {
    const typeStats = {};

    for (const type in this.stats) {
      const stat = this.stats[type];
      const total = stat.hits + stat.misses;
      const hitRate = total > 0 ? ((stat.hits / total) * 100).toFixed(2) : '0.00';

      typeStats[type] = {
        ...stat,
        hitRate: `${hitRate}%`
      };
    }

    return {
      total: this.cache.size,
      types: typeStats,
      memory: this._estimateMemoryUsage()
    };
  }

  _estimateMemoryUsage() {
    let totalBytes = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalBytes += key.length * 2;

      if (entry.data?.buffer && Buffer.isBuffer(entry.data.buffer)) {
        totalBytes += entry.data.buffer.length;
      } else if (typeof entry.data === 'string') {
        totalBytes += entry.data.length * 2;
      } else if (entry.data) {
        totalBytes += JSON.stringify(entry.data).length * 2;
      }
    }

    return {
      bytes: totalBytes,
      kb: (totalBytes / 1024).toFixed(2),
      mb: (totalBytes / 1024 / 1024).toFixed(2)
    };
  }
}

const cacheService = new CacheService();

setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);

export default cacheService;