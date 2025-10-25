import { getCandidateData } from '../findNeta.js';
import cacheService from './cacheService.js';

class MyNetaService {
  /**
   * @param {string} name 
   * @param {string} constituency 
   * @param {string} party 
   * @returns {Promise<Object>} 
   */
  async getCandidateData(name, constituency = '', party = '') {
    const cacheKey = cacheService.getCacheKey('candidate', name, constituency, party);
    
    const cached = await cacheService.get('candidate', cacheKey);
    if (cached) {
      console.log(`✅ [MYNETA] Cache hit for ${name}`);
      return cached;
    }

    console.log(`🔍 [MYNETA] Fetching candidate data for ${name}, Constituency: ${constituency || 'N/A'}, Party: ${party || 'N/A'}`);

    try {
      const data = await getCandidateData(name, constituency, party);
      
      if (data && data.data && !data.data.error) {
        cacheService.set('candidate', cacheKey, data);
        console.log(`✅ [MYNETA] Successfully fetched and cached data for ${name}`);
      } else {
        console.log(`⚠️ [MYNETA] No valid data found for ${name}`);
      }
      
      return data;

    } catch (error) {
      console.error(`❌ [MYNETA] Error fetching ${name}:`, error.message);
      
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
   * Search candidate
   * @param {string} name 
   * @param {string} constituency
   * @param {string} party
   * @returns {Promise<string|null>}
   */
  async searchCandidate(name, constituency = '', party = '') {
    try {
      const data = await this.getCandidateData(name, constituency, party);
      return data?.data?.assetLink || null;
    } catch (error) {
      console.error(`❌ [MYNETA] Search failed for ${name}:`, error.message);
      return null;
    }
  }

  /**
   * @param {string} name
   * @param {string} constituency
   * @param {string} party
   */
  clearCache(name, constituency = '', party = '') {
    const cacheKey = cacheService.getCacheKey('candidate', name, constituency, party);
    cacheService.delete('candidate', cacheKey);
    console.log(`🗑️ [MYNETA] Cleared cache for ${name}`);
  }
}

export default new MyNetaService();