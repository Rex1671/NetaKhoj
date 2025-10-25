import NodeCache from 'node-cache';
import config from '../config/config.js';

class CacheService {
  constructor() {
    this.prsCache = new NodeCache({
      stdTTL: config.cache.ttl.prs,
      checkperiod: 600,
      useClones: false
    });

    this.candidateCache = new NodeCache({
      stdTTL: config.cache.ttl.candidate,
      checkperiod: 600,
      useClones: false
    });

    this.geojsonCache = new NodeCache({
      stdTTL: config.cache.ttl.geojson,
      checkperiod: 3600,
      useClones: false
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    [this.prsCache, this.candidateCache, this.geojsonCache].forEach(cache => {
      cache.on('expired', (key) => {
        console.log(`🗑️ [CACHE] Expired: ${key}`);
      });
    });
  }

 

getCacheKey(type, ...args) {
  if (type === 'candidate_search') {
  
    return `${type}:${args[0].toLowerCase()}:${args[1] || 'any'}`;
  }
  
  if (type === 'candidate') {
   
    return `${type}:${args[0].toLowerCase()}:${args[1] || ''}:${args[2] || ''}`;
  }

  return args.join(':').toLowerCase();
}
  async get(cacheType, key) {
    const cache = this[`${cacheType}Cache`];
    const value = cache.get(key);

    if (value !== undefined) {
      this.stats.hits++;
      console.log(`✅ [CACHE HIT] ${key}`);
      return value;
    }

    this.stats.misses++;
    console.log(`❌ [CACHE MISS] ${key}`);
    return null;
  }

  set(cacheType, key, value, ttl = null) {
    const cache = this[`${cacheType}Cache`];
    const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);

    if (success) {
      this.stats.sets++;
      console.log(`💾 [CACHE SET] ${key}`);
    }

    return success;
  }

  delete(cacheType, key) {
    const cache = this[`${cacheType}Cache`];
    return cache.del(key);
  }

  flush(cacheType = null) {
    if (cacheType) {
      this[`${cacheType}Cache`].flushAll();
    } else {
      this.prsCache.flushAll();
      this.candidateCache.flushAll();
      this.geojsonCache.flushAll();
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? `${(this.stats.hits / total * 100).toFixed(2)}%` : '0%',
      prsKeys: this.prsCache.keys().length,
      candidateKeys: this.candidateCache.keys().length,
      geojsonKeys: this.geojsonCache.keys().length
    };
  }
}

export default new CacheService();
