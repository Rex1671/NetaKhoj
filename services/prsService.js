// services/prsService.js
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import pRetry from 'p-retry';
import { fetchHTML } from '../webextract.mjs';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

class PRSService {
  /**
   * Get member data from PRS India
   */
  async getMemberData(name, type, constituency = null, state = null) {
    const cacheKey = `prs:${type}:${name.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log(`✅ [CACHE] PRS data hit: ${name}`);
      return cached;
    }

    try {
      console.log(`🔍 [PRS] Fetching ${name} (${type})...`);
      
      const urls = this.constructPossibleURLs(name, type);
      
      let successfulUrl = null;
      let html = null;

      // Try each possible URL
      for (const url of urls) {
        try {
          console.log(`🔗 [PRS] Trying: ${url}`);
          
          html = await pRetry(
            () => fetchHTML(url),
            { 
              retries: 2,
              minTimeout: 1000
            }
          );

          // Verify this is the correct page
          if (html && this.verifyPage(html, name)) {
            successfulUrl = url;
            console.log(`✅ [PRS] Success: ${url}`);
            break;
          } else {
            console.log(`⚠️ [PRS] Page doesn't match, trying next...`);
          }
        } catch (err) {
          console.log(`❌ [PRS] Failed: ${url}`);
          continue;
        }
      }

      if (!successfulUrl || !html) {
        console.log(`❌ [PRS] No valid URL found for ${name}`);
        return this.getEmptyResponse();
      }

      const parsedData = this.parseHTML(html, type);

      const result = {
        found: true,
        html,
        url: successfulUrl,
        ...parsedData
      };

      cache.set(cacheKey, result);
      console.log(`✅ [PRS] Data cached for ${name}`);
      
      return result;

    } catch (error) {
      console.error(`❌ [PRS] Error fetching ${name}:`, error.message);
      return this.getEmptyResponse();
    }
  }

  /**
   * Construct all possible URLs for a member
   */
  constructPossibleURLs(name, type) {
    const slugs = this.generateNameSlugs(name);
    const urls = [];

    if (type === 'MP') {
      // Try current and previous Lok Sabhas
      const lokSabhas = ['18th-lok-sabha', '17th-lok-sabha', '16th-lok-sabha'];
      
      for (const ls of lokSabhas) {
        for (const slug of slugs) {
          urls.push(`https://prsindia.org/mptrack/${ls}/${slug}`);
        }
      }
    } else if (type === 'MLA') {
      // MLA URLs are simpler: /mlatrack/{name-slug}
      for (const slug of slugs) {
        urls.push(`https://prsindia.org/mlatrack/${slug}`);
      }
    }

    return urls;
  }

  /**
   * Generate possible name slugs
   */
  generateNameSlugs(name) {
    const slugs = [];
    
    // Basic slug: lowercase, replace spaces with hyphens
    const basicSlug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    slugs.push(basicSlug);

    // Try without middle names/initials
    const parts = name.split(/\s+/);
    if (parts.length > 2) {
      // First and last name only
      const firstLast = `${parts[0]} ${parts[parts.length - 1]}`
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      slugs.push(firstLast);
    }

    // Try with common variations
    // Remove 'Dr.', 'Shri', 'Smt.', etc.
    const cleanedName = name
      .replace(/^(Dr\.?|Shri|Smt\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/gi, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    if (cleanedName !== basicSlug) {
      slugs.push(cleanedName);
    }

    // Remove duplicates
    return [...new Set(slugs)];
  }

  /**
   * Verify if page matches the member we're looking for
   */
  verifyPage(html, name) {
    // Check if page contains the member's name
    const nameParts = name.toLowerCase().split(/\s+/);
    const htmlLower = html.toLowerCase();

    // At least first and last name should appear
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    return htmlLower.includes(firstName) && htmlLower.includes(lastName);
  }

  /**
   * Parse PRS HTML to extract structured data
   */
  parseHTML(html, type) {
    const $ = cheerio.load(html);
    
    // Extract image URL
    const imageSelectors = [
      '.field-name-field-image img',
      '.field-name-field-mla-profile-image img',
      'img[src*="profile"]',
      'img[src*="mla"]',
      'img[src*="mp"]'
    ];
    
    let imageUrl = '';
    for (const selector of imageSelectors) {
      const img = $(selector).attr('src');
      if (img) {
        imageUrl = img;
        break;
      }
    }
    
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : imageUrl.startsWith('/') 
        ? `https://prsindia.org${imageUrl}` 
        : imageUrl 
          ? `https://prsindia.org/${imageUrl}`
          : '';

    // Extract state
    let state = 'Unknown';
    $('.mp_state, .mla_state').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes('State') || i === 0) {
        state = $(elem).find('a').text() || $(elem).text();
        state = state.replace('State :', '').replace(/\(\s*\d+\s*more\s*(MPs?|MLAs?)\s*\)/gi, '').trim();
        if (state && state !== 'Unknown') return false;
      }
    });

    // Extract constituency
    let constituency = 'Unknown';
    const constituencySelectors = [
      '.mp_constituency',
      '.mla_constituency',
      'div:contains("Constituency")'
    ];
    
    for (const selector of constituencySelectors) {
      const elem = $(selector).first();
      if (elem.length) {
        constituency = elem.text().replace('Constituency :', '').trim();
        if (constituency && constituency !== 'Unknown') break;
      }
    }

    // Extract party
    let party = 'Unknown';
    $('.mp_state, .mla_state').each((i, elem) => {
      const text = $(elem).text();
      if (text.includes('Party')) {
        const partyLink = $(elem).find('a');
        party = partyLink.length 
          ? partyLink.text() 
          : text.replace('Party :', '').trim();
        party = party.replace(/\(\s*\d+\s*more\s*(MPs?|MLAs?)\s*\)/gi, '').trim();
        return false;
      }
    });

    // Extract performance data (mainly for MPs)
    const performance = this.extractPerformanceData($);

    // Extract personal info
    const personal = this.extractPersonalInfo($);

    console.log(`📊 [PRS] Parsed data:`, {
      state,
      constituency,
      party,
      hasPerformance: !!performance.attendance,
      hasPersonal: !!personal.age
    });

    return {
      imageUrl: fullImageUrl,
      state,
      constituency,
      party,
      performance,
      personal
    };
  }

  /**
   * Extract performance metrics (MPs mainly)
   */
 /**
 * Extract performance metrics (MPs mainly)
 *//**
 * Extract performance metrics (MPs mainly)
 */
extractPerformanceData($) {
  console.log(`🔍 [PRS] Extracting performance data...`);
  
  // ✅ Debug: Check if performance section exists
  const perfSection = $('.mp-parliamentary-performance');
  const perfSectionHTML = perfSection.html();
  console.log(`📄 [PRS] Performance section HTML length: ${perfSectionHTML?.length || 0}`);
  
  if (!perfSection.length) {
    console.log(`⚠️ [PRS] No .mp-parliamentary-performance section found`);
  } else {
    console.log(`✅ [PRS] Found performance section`);
  }

  // ✅ Enhanced field value getter with better logging
  const getFieldValue = (label, selectors) => {
    if (typeof selectors === 'string') selectors = [selectors];
    
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      const el = $(selector);
      
      if (el.length) {
        const text = el.text().trim();
        
        // Log even if empty to see what was found
        if (text) {
          console.log(`   ✅ ${label} [${i}] (${selector}): "${text}"`);
          
          if (text !== 'N/A') {
            return text;
          }
        } else {
          console.log(`   ⚠️ ${label} [${i}] (${selector}): Found element but empty text`);
        }
      }
    }
    
    console.log(`   ❌ ${label}: Not found in any selector`);
    return null;
  };

  const performance = {
    // Attendance
    attendance: getFieldValue('Attendance', [
      '.mp-attendance .field-name-field-attendance .field-item.even',
      '.mp-attendance .field-name-field-attendance .field-item',
      '.field-name-field-attendance .field-item.even',
      '.field-name-field-attendance .field-item',
      '.mp-attendance .attendance .field-item',
      // Additional fallback selectors
      '.mp-parliamentary-performance .mp-attendance .field-item',
      'div.mp-attendance div.field-item.even'
    ]),
    natAttendance: getFieldValue('Nat Attendance', [
      '.mp-attendance .field-name-field-national-attendance .field-item.even',
      '.mp-attendance .field-name-field-national-attendance .field-item',
      '.field-name-field-national-attendance .field-item',
      'div.mp-attendance div.field-name-field-national-attendance div.field-item'
    ]),
    stateAttendance: getFieldValue('State Attendance', [
      '.mp-attendance .field-name-field-state-attendance .field-item.even',
      '.mp-attendance .field-name-field-state-attendance .field-item',
      '.field-name-field-state-attendance .field-item',
      'div.mp-attendance div.field-name-field-state-attendance div.field-item'
    ]),

    // Debates
    debates: getFieldValue('Debates', [
      '.mp-debate .field-name-field-author .field-item.even',
      '.mp-debate .field-name-field-author .field-item',
      '.field-name-field-author .field-item.even',
      '.field-name-field-author .field-item',
      '.mp-debate .debate .field-item',
      // Additional fallback selectors
      'div.mp-debate div.field-item.even',
      '.mp-parliamentary-performance .mp-debate .field-item'
    ]),
    natDebates: getFieldValue('Nat Debates', [
      '.mp-debate .field-name-field-national-debate .field-item.even',
      '.mp-debate .field-name-field-national-debate .field-item',
      '.field-name-field-national-debate .field-item',
      'div.mp-debate div.field-name-field-national-debate div.field-item'
    ]),
    stateDebates: getFieldValue('State Debates', [
      '.mp-debate .field-name-field-state-debate .field-item.even',
      '.mp-debate .field-name-field-state-debate .field-item',
      '.field-name-field-state-debate .field-item',
      'div.mp-debate div.field-name-field-state-debate div.field-item'
    ]),

    // Questions
    questions: getFieldValue('Questions', [
      '.mp-questions .field-name-field-total-expenses-railway .field-item.even',
      '.mp-questions .field-name-field-total-expenses-railway .field-item',
      '.field-name-field-total-expenses-railway .field-item.even',
      '.field-name-field-total-expenses-railway .field-item',
      '.mp-questions .questions .field-item',
      // Additional fallback selectors
      'div.mp-questions div.field-item.even',
      '.mp-parliamentary-performance .mp-questions .field-item'
    ]),
    natQuestions: getFieldValue('Nat Questions', [
      '.mp-questions .field-name-field-national-questions .field-item.even',
      '.mp-questions .field-name-field-national-questions .field-item',
      '.field-name-field-national-questions .field-item',
      'div.mp-questions div.field-name-field-national-questions div.field-item'
    ]),
    stateQuestions: getFieldValue('State Questions', [
      '.mp-questions .field-name-field-state-questions .field-item.even',
      '.mp-questions .field-name-field-state-questions .field-item',
      '.field-name-field-state-questions .field-item',
      'div.mp-questions div.field-name-field-state-questions div.field-item'
    ]),

    // Private Member Bills
    pmb: getFieldValue('PMB', [
      '.mp-pmb .field-name-field-source .field-item.even',
      '.mp-pmb .field-name-field-source .field-item',
      '.field-name-field-source .field-item.even',
      '.field-name-field-source .field-item',
      '.mp-pmb .pmb .field-item',
      // Additional fallback selectors
      'div.mp-pmb div.field-item.even',
      '.mp-parliamentary-performance .mp-pmb .field-item'
    ]),
    natPMB: getFieldValue('Nat PMB', [
      '.mp-pmb .field-name-field-national-pmb .field-item.even',
      '.mp-pmb .field-name-field-national-pmb .field-item',
      '.field-name-field-national-pmb .field-item',
      'div.mp-pmb div.field-name-field-national-pmb div.field-item'
    ])
  };

  // ✅ Enhanced summary logging
  const foundCount = Object.values(performance).filter(v => v !== null).length;
  const totalFields = Object.keys(performance).length;
  
  console.log(`📊 [PRS] Performance Summary (${foundCount}/${totalFields} fields found):`, {
    attendance: performance.attendance || '❌ Not found',
    debates: performance.debates || '❌ Not found',
    questions: performance.questions || '❌ Not found',
    pmb: performance.pmb || '❌ Not found',
    natAttendance: performance.natAttendance || '❌ Not found',
    natDebates: performance.natDebates || '❌ Not found',
    natQuestions: performance.natQuestions || '❌ Not found',
    natPMB: performance.natPMB || '❌ Not found'
  });

  // ✅ Debug: If nothing found, dump all divs with "field-item" class
  if (foundCount === 0 && perfSection.length) {
    console.log(`⚠️ [PRS] No performance data found. Dumping all .field-item elements:`);
    perfSection.find('.field-item').each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      const classes = $el.attr('class');
      const parent = $el.parent().attr('class');
      console.log(`   [${i}] Classes: "${classes}", Parent: "${parent}", Text: "${text.substring(0, 50)}"`);
    });
  }

  return performance;
}
  /**
   * Extract personal information
   */
 /**
 * Extract personal information
 */
extractPersonalInfo($) {
  const getText = (selectors) => {
    if (typeof selectors === 'string') selectors = [selectors];
    for (const selector of selectors) {
      const el = $(selector);
      if (el.length) {
        let text = el.text().trim();
        // Clean up common labels
        text = text.replace(/^(Age|Gender|Education)\s*:\s*/i, '');
        if (text && text !== 'N/A' && text !== '') return text;
      }
    }
    return null;
  };

  // Age - can be in different places
  let age = null;
  $('.gender, .age').each((i, elem) => {
    const text = $(elem).text();
    if (text.includes('Age')) {
      age = text.replace(/Age\s*:\s*/i, '').trim();
      return false;
    }
  });
  if (!age) {
    age = getText([
      '.field-name-field-mla-age .field-item',
      '.field-name-field-age .field-item'
    ]);
  }

  // Gender
  let gender = null;
  $('.gender').each((i, elem) => {
    const text = $(elem).text();
    if (!text.includes('Age') && (text.includes('Male') || text.includes('Female'))) {
      gender = $(elem).find('a').text() || text.replace('Gender :', '').trim();
      return false;
    }
  });

  // Education
  const education = getText([
    '.education a',
    '.education .field-item',
    '.field-name-field-education a'
  ]);

  // Term info
  const termStart = getText([
    '.term_start .date-display-single',
    '.field-name-field-date-of-introduction .date-display-single'
  ]);

  const termEnd = getText([
    '.term_end .field-item',
    '.field-name-field-end-of-term .field-item'
  ]);

  // ✅ FIX: Extract ONLY the term number, not the entire page
  let noOfTerm = null;
  
  // Try to find in the profile section specifically
  const profileSection = $('.mp_profile_header_info, .mla_profile_header_info');
  
  profileSection.find('.age').each((i, elem) => {
    const text = $(elem).text();
    if (text.includes('No. of Term') || text.includes('Term') || text.includes('First Term') || text.includes('Second Term')) {
      // Extract just the term info
      noOfTerm = text
        .replace(/No\.\s*of\s*Term\s*:\s*/i, '')
        .replace(/Terms?\s*Served\s*:\s*/i, '')
        .split('\n')[0]  // Take only first line
        .trim();
      
      // Stop after first match
      if (noOfTerm) return false;
    }
  });

  // Fallback: try other selectors
  if (!noOfTerm) {
    const termDiv = $('.personal_profile_parent').find('div:contains("Term")').first();
    if (termDiv.length) {
      noOfTerm = termDiv.text()
        .replace(/No\.\s*of\s*Term\s*:\s*/i, '')
        .replace(/Terms?\s*Served\s*:\s*/i, '')
        .trim()
        .split('\n')[0];  // Only first line
    }
  }

  console.log(`👤 [PRS] Personal:`, {
    age: age || 'N/A',
    gender: gender || 'N/A',
    education: education || 'N/A',
    termStart: termStart || 'N/A',
    termEnd: termEnd || 'N/A',
    noOfTerm: noOfTerm || 'N/A'
  });

  return {
    age,
    gender,
    education,
    termStart,
    termEnd,
    noOfTerm
  };
}

  /**
   * Return empty response structure
   */
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
      personal: {}
    };
  }

  /**
   * Clear cache
   */
  clearCache(pattern) {
    if (pattern) {
      const keys = cache.keys().filter(key => key.includes(pattern));
      cache.del(keys);
      console.log(`🗑️ [PRS] Cleared ${keys.length} cache entries`);
    } else {
      cache.flushAll();
      console.log(`🗑️ [PRS] Cache cleared`);
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return cache.getStats();
  }
}

export default new PRSService();