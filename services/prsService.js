import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import { fetchHTML } from '../webextract.mjs';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const inFlightRequests = new Map();

class PRSService {
  constructor() {
    this.FETCH_TIMEOUT = 15000;
    this.MAX_SEARCH_TIME = 20000;
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      urlsChecked: 0,
      firstUrlSuccess: 0
    };
  }

  async getMemberData(name, type, constituency = null, state = null) {
    const cacheKey = `prs:${type}:${name.toLowerCase()}`;
    this.stats.totalRequests++;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      console.log(`✅ [CACHE HIT] ${name} (${this.stats.cacheHits}/${this.stats.totalRequests})`);
      return cached;
    }
    this.stats.cacheMisses++;

    if (inFlightRequests.has(cacheKey)) {
      console.log(`⏳ [DEDUP] Waiting for in-flight request: ${name}`);
      return await inFlightRequests.get(cacheKey);
    }

    const requestPromise = this._executeSearch(name, type, cacheKey);
    inFlightRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  }

  async _executeSearch(name, type, cacheKey) {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [PRS] Searching ${name} (${type})...`);
      
      const searchPromise = this._sequentialSearch(name, type);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), this.MAX_SEARCH_TIME)
      );
      
      const result = await Promise.race([searchPromise, timeoutPromise]);
      
      if (!result.found) {
        const alternateType = type === 'MLA' ? 'MP' : 'MLA';
        console.log(`⚡ [FALLBACK] Quick ${alternateType} check...`);
        
        const quickSearchPromise = this._sequentialSearch(name, alternateType, true);
        const quickTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Quick search timeout')), 8000)
        );
        
        try {
          const altResult = await Promise.race([quickSearchPromise, quickTimeoutPromise]);
          
          if (altResult.found) {
            altResult.searchedAs = type;
            altResult.foundAs = alternateType;
            cache.set(cacheKey, altResult);
            this._updateStats(Date.now() - startTime);
            return altResult;
          }
        } catch (fallbackError) {
          console.log(`⚠️ [FALLBACK] Timeout: ${fallbackError.message}`);
        }
      } else {
        result.searchedAs = type;
        result.foundAs = type;
        cache.set(cacheKey, result);
        this._updateStats(Date.now() - startTime);
        return result;
      }

      return this.getEmptyResponse();

    } catch (error) {
      console.error(`❌ [PRS] Error: ${error.message}`);
      return this.getEmptyResponse();
    }
  }

  async _sequentialSearch(name, type, quickMode = false) {
    const slug = this._generateSlug(name);
    
    const urls = this._generateURLs(slug, type, quickMode);
    
    console.log(`📋 [SEARCH] ${name} → "${slug}" → ${urls.length} URLs`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const shortUrl = url.split('/').slice(-2).join('/');
      
      console.log(`🔄 [${i+1}/${urls.length}] ${shortUrl}`);
      
      try {
        const startTime = Date.now();
        const html = await this._fetchWithTimeout(url, this.FETCH_TIMEOUT);
        const duration = Date.now() - startTime;
        
        this.stats.urlsChecked++;
        
        if (!html || html.length < 1000) {
          console.log(`   ⏭️ Too short (${duration}ms)`);
          continue;
        }

        if (!this._quickValidate(html)) {
          console.log(`   ⏭️ Invalid page (${duration}ms)`);
          continue;
        }

        const parsedData = this._parseHTML(html, type);
        
        if (!this._validateParsedData(parsedData)) {
          console.log(`   ⏭️ Insufficient data (${duration}ms)`);
          continue;
        }

        console.log(`   ✅ FOUND in ${duration}ms`);
        
        if (i === 0) this.stats.firstUrlSuccess++;
        
        return {
          found: true,
          html,
          url,
          memberType: type,
          urlIndex: i,
          ...parsedData
        };

      } catch (err) {
        console.log(`   ❌ ${err.message}`);
        continue;
      }
    }

    console.log(`❌ [NOT FOUND] After ${urls.length} attempts`);
    return { found: false };
  }

  _generateSlug(name) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/^(dr\.?|shri|smt\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/gi, '') 
      .replace(/[^a-z0-9\s]/g, ' ') 
      .replace(/\s+/g, '-') 
      .replace(/-+/g, '-') 
      .replace(/^-|-$/g, ''); 
    
    console.log(`   🔤 "${name}" → "${slug}"`);
    return slug;
  }

  _generateURLs(slug, type, quickMode = false) {
    const urls = [];

    if (type === 'MP') {
      urls.push(`https://prsindia.org/mptrack/18th-lok-sabha/${slug}`);
      
      if (!quickMode) {
        urls.push(`https://prsindia.org/mptrack/17th-lok-sabha/${slug}`);
        
        urls.push(`https://prsindia.org/mptrack/16th-lok-sabha/${slug}`);
        
        urls.push(`https://prsindia.org/mptrack/18th-lok-sabha/${slug}-1`);
        urls.push(`https://prsindia.org/mptrack/18th-lok-sabha/${slug}-2`);
        
        urls.push(`https://prsindia.org/mptrack/17th-lok-sabha/${slug}-1`);
      }
      
    } else if (type === 'MLA') {
      urls.push(`https://prsindia.org/mlatrack/${slug}`);
      
      if (!quickMode) {
        urls.push(`https://prsindia.org/mlatrack/${slug}-1`);
        urls.push(`https://prsindia.org/mlatrack/${slug}-2`);
        urls.push(`https://prsindia.org/mlatrack/${slug}-3`);
      }
    }

    return urls;
  }

  async _fetchWithTimeout(url, timeout) {
    return Promise.race([
      fetchHTML(url, 1, timeout - 1000),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }

  _quickValidate(html) {
    return (
      (html.includes('mp_state') || html.includes('mla_state')) &&
      (html.includes('Party') || html.includes('Constituency'))
    );
  }

  _validateParsedData(data) {
    return (
      data &&
      data.party && 
      data.party !== 'Unknown' &&
      data.constituency && 
      data.constituency !== 'Unknown'
    );
  }

  _parseHTML(html, type) {
    const $ = cheerio.load(html);
    
    const imageUrl = this._extractImage($);
    const state = this._extractField($, '.mp_state, .mla_state', 'State :');
    const constituency = this._extractField($, '.mp_constituency, .mla_constituency', 'Constituency :');
    const party = this._extractField($, '.mp_state, .mla_state', 'Party :');

    return {
      imageUrl,
      state: state || 'Unknown',
      constituency: constituency || 'Unknown',
      party: party || 'Unknown',
      performance: {},
      personal: {}
    };
  }

  _extractImage($) {
    const img = $('.field-name-field-image img, .field-name-field-mla-profile-image img').first().attr('src');
    if (!img) return '';
    
    return img.startsWith('http') ? img : `https://prsindia.org${img.startsWith('/') ? '' : '/'}${img}`;
  }

  _extractField($, selector, label) {
    const elem = $(selector).filter((i, el) => $(el).text().includes(label)).first();
    if (!elem.length) return null;
    
    const link = elem.find('a').first();
    let text = link.length ? link.text() : elem.text();
    
    return text
      .replace(label, '')
      .replace(/\(\s*\d+\s*more\s*(MPs?|MLAs?)\s*\)/gi, '')
      .trim();
  }

  _updateStats(duration) {
    const { avgResponseTime, totalRequests } = this.stats;
    this.stats.avgResponseTime = ((avgResponseTime * (totalRequests - 1)) + duration) / totalRequests;
  }

  getEmptyResponse() {
    return {
      found: false,
      html: '',
      url: null,
      imageUrl: '',
      state: 'Unknown',
      constituency: 'Unknown',
      party: 'Unknown',
      performance: {},
      personal: {},
      searchedAs: null,
      foundAs: null
    };
  }

  clearCache(pattern) {
    if (pattern) {
      const keys = cache.keys().filter(key => key.includes(pattern));
      cache.del(keys);
      console.log(`🗑️ Cleared ${keys.length} cache entries`);
    } else {
      cache.flushAll();
      inFlightRequests.clear();
      console.log(`🗑️ Full cache cleared`);
    }
  }

  getStats() {
    return {
      ...cache.getStats(),
      custom: {
        totalRequests: this.stats.totalRequests,
        cacheHits: this.stats.cacheHits,
        cacheMisses: this.stats.cacheMisses,
        hitRate: this.stats.totalRequests > 0 
          ? `${((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(1)}%` 
          : '0%',
        avgResponseTime: `${this.stats.avgResponseTime.toFixed(0)}ms`,
        urlsChecked: this.stats.urlsChecked,
        firstUrlSuccess: this.stats.firstUrlSuccess,
        firstUrlSuccessRate: this.stats.totalRequests > 0
          ? `${((this.stats.firstUrlSuccess / this.stats.totalRequests) * 100).toFixed(1)}%`
          : '0%',
        inFlightRequests: inFlightRequests.size
      }
    };
  }
}

export default new PRSService();