// services/mynetaService.js

import { getCandidateData } from '../findNeta.js';
import cacheService from './cacheService.js';

class MyNetaService {
  /**
   * Get candidate data with caching
   * @param {string} name - Candidate name
   * @param {string} constituency - Constituency name
   * @param {string} party - Party name
   * @returns {Promise<Object>} Candidate data
   */
  async getCandidateData(name, constituency, party) {
    // Create cache key
    const cacheKey = cacheService.getCacheKey('candidate', name, constituency, party);
    
    // Check cache first
    const cached = await cacheService.get('candidate', cacheKey);
    if (cached) {
      console.log(`✅ [MYNETA] Cache hit for ${name}`);
      return cached;
    }

    console.log(`🔍 [MYNETA] Fetching candidate data for ${name}`);

    try {
      // Call existing findNeta function
      const data = await getCandidateData(name, constituency, party);
      
      // Cache the result
      cacheService.set('candidate', cacheKey, data);
      
      console.log(`✅ [MYNETA] Successfully fetched data for ${name}`);
      
      return data;

    } catch (error) {
      console.error(`❌ [MYNETA] Error fetching ${name}:`, error.message);
      
      // Return minimal data with error info
      return {
        data: {
          assetLink: `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`,
          content: null,
          error: error.message
        }
      };
    }
  }

  /**
   * Search candidate without full data fetch
   * @param {string} name - Candidate name
   * @returns {Promise<string|null>} Candidate URL or null
   */
  async searchCandidate(name, constituency, party) {
    try {
      const data = await this.getCandidateData(name, constituency, party);
      return data?.data?.assetLink || null;
    } catch (error) {
      console.error(`❌ [MYNETA] Search failed for ${name}:`, error.message);
      return null;
    }
  }

  /**
   * Clear cache for specific candidate
   * @param {string} name
   * @param {string} constituency
   * @param {string} party
   */
  clearCache(name, constituency, party) {
    const cacheKey = cacheService.getCacheKey('candidate', name, constituency, party);
    cacheService.delete('candidate', cacheKey);
    console.log(`🗑️ [MYNETA] Cleared cache for ${name}`);
  }
}

export default new MyNetaService();