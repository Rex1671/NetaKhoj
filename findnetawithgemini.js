
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fetchHTML, fetchPrintPage } from './webextract.mjs';
import { extractData } from './extractData.mjs';
import dotenv from "dotenv";
dotenv.config();
if(process.env.GEMINI_API_KEY){
console.log("✅ Loaded key:" );}

// Environment Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Production logging utility (less verbose than development)
function logProduction(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
        'info': '📋',
        'success': '✅', 
        'error': '❌',
        'warning': '⚠️'
    };
    
    // Only log important messages in production
    if (level === 'error' || process.env.NODE_ENV === 'development') {
        console.log(`${prefix[level]} [${timestamp}] ${message}`);
    }
}

// Normalization functions (keeping your exact implementation)
function normalize(text) {
    return text ? text.trim().toLowerCase().replace(/\s+/g, ' ') : '';
}

function cleanConstituency(text) {
    return text
        ? text.trim().toLowerCase()
              .replace(/\s*\([^)]*\)\s*/g, '')
              .replace(/\s+/g, ' ')          
              .replace(/\u00A0/g, '')         
              .trim()
        : '';
}

function normalizeParty(text) {
    if (!text) return '';
    const partyMap = {
        'bjp': 'bharatiya janata party',
        'inc': 'indian national congress',
        'aap': 'aam aadmi party',
        'cpi': 'communist party of india',
        'cpim': 'communist party of india marxist',
        'bsp': 'bahujan samaj party',
        'sp': 'samajwadi party',
        'jdu': 'janata dal united',
        'rjd': 'rashtriya janata dal',
        'aitc': 'all india trinamool congress',
        'dmk': 'dravida munnetra kazhagam',
        'aiadmk': 'all india anna dravida munnetra kazhagam'
    };
    const key = normalize(text);
    return partyMap[key] || key;
}

// ======================= AI SUMMARY SECTION =======================

async function getAIPerceptionSummary(name, party = '', constituency = '', type = 'MP') {
    const startTime = Date.now();

    logProduction(`🤖 [AI] Starting summary generation for "${name}" (${party}, ${constituency})`, 'info');
    
    try {
        if (!GEMINI_API_KEY || !genAI) {
            logProduction('❌ [AI] Gemini API key missing or service unavailable', 'error');
            return { success: false, error: 'API_KEY_MISSING', data: null, responseTime: 0 };
        }

        // FIXED PROMPT - Explicitly requiring JSON output
        const prompt = `You are an expert Indian political analyst. Generate a JSON analysis for:

Politician: ${name}
Party: ${party || 'Unknown'}
Constituency: ${constituency || 'Unknown'}
Type: ${type}

IMPORTANT: You MUST respond with ONLY valid JSON, no other text before or after.

Return a JSON object with these exact keys:
{
    "identity": "Brief 1-2 line description of who they are",
    "promisesVsReality": "Key promises made vs actual delivery (2-3 points)",
    "controversies": "Major controversies or scandals if any",
    "criticView": "What critics say about them",
    "definingMoments": "2-3 defining moments in their political career",
    "threats": "Political threats or challenges they face",
    "currentTalk": "What people are currently saying about them",
    "bottomLine": "Summary assessment in 1-2 lines"
}

If insufficient data is available, return: {"error": "INSUFFICIENT_DATA_AVAILABLE"}

Remember: Output ONLY valid JSON, nothing else.`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-lite-latest", // Changed from flash-lite-latest for better JSON compliance
            generationConfig: {
                temperature: 0.3, // Lower temperature for more consistent JSON output
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
                responseMimeType: "application/json" // Force JSON response
            },
        });

        logProduction('📝 [AI] Sending prompt to Gemini model...', 'info');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let aiResponse = response.text().trim();
        const responseTime = Date.now() - startTime;

        // Clean up response if it has markdown code blocks
        if (aiResponse.startsWith('```json')) {
            aiResponse = aiResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
        }
        if (aiResponse.startsWith('```')) {
            aiResponse = aiResponse.replace(/```\n?/, '').replace(/```\n?$/, '');
        }

        logProduction(`📩 [AI] Response received (${aiResponse.length} chars, ${responseTime}ms)`, 'info');
        
        // First, check if it's valid JSON
        try {
            const testParse = JSON.parse(aiResponse);
            logProduction('✅ [AI] Response is valid JSON', 'success');
        } catch (e) {
            logProduction(`❌ [AI] Invalid JSON response: ${aiResponse.substring(0, 100)}...`, 'error');
            return { success: false, error: 'INVALID_JSON', data: null, responseTime };
        }

        const validation = validateAIResponse(aiResponse, name);

        if (validation.success) {
            logProduction(`✅ [AI] Successfully validated AI summary for "${name}"`, 'success');
            return { success: true, data: validation.data, responseTime };
        } else {
            logProduction(`⚠️ [AI] Validation failed for "${name}" → ${validation.error}`, 'warning');
            return { success: false, error: validation.error, data: null, responseTime };
        }

    } catch (error) {
        const responseTime = Date.now() - startTime;
        logProduction(`❌ [AI] Error for ${name}: ${error.message}`, 'error');
        return {
            success: false,
            error: classifyAIError(error),
            data: null,
            responseTime,
            details: error.message
        };
    }
}

function convertTextToJSON(text, name) {
    // Emergency fallback - creates a basic JSON structure from text
    return {
        identity: `Information about ${name}`,
        promisesVsReality: text.includes('promise') ? 'Analysis pending' : 'No data available',
        controversies: text.includes('controversy') ? 'Some controversies noted' : 'None documented',
        criticView: 'Public opinion varies',
        definingMoments: 'Career highlights being analyzed',
        threats: 'Political challenges exist',
        currentTalk: 'Subject of current discussion',
        bottomLine: text.substring(0, 100) || `${name} - Analysis pending`
    };
}

function validateAIResponse(response, politicianName) {
    logProduction(`🔍 [AI] Validating AI response for "${politicianName}"`, 'info');

    if (!response || response.trim().length < 100) {
        logProduction('⚠️ [AI] Response too short', 'warning');
        return { success: false, error: 'INSUFFICIENT_DATA' };
    }

    const cleanResponse = response.trim();

    if (cleanResponse === "INSUFFICIENT_DATA_AVAILABLE") {
        logProduction('ℹ️ [AI] Response indicated insufficient data', 'info');
        return { success: false, error: 'NO_DATA' };
    }

    // ✅ Expect valid JSON, not old “WHO IS” etc.
    try {
        const parsed = JSON.parse(cleanResponse);
        const keys = Object.keys(parsed);

        const expected = [
            'identity','promisesVsReality','controversies',
            'criticView','definingMoments','threats',
            'currentTalk','bottomLine'
        ];

        const missing = expected.filter(k => !(k in parsed));
        if (missing.length > 3) {
            logProduction(`⚠️ [AI] Missing major keys: ${missing.join(', ')}`, 'warning');
            return { success: false, error: 'MISSING_KEYS' };
        }

        const parsedData = parseAIResponse(cleanResponse, politicianName);
        logProduction('✅ [AI] Parsed successfully', 'success');
        return { success: true, data: parsedData };

    } catch (err) {
        logProduction(`❌ [AI] JSON parse failed: ${err.message}`, 'error');
         const fallbackData = convertTextToJSON(cleanResponse, politicianName);
         return { success: true, data: { politician: politicianName, summary: fallbackData } };
    }
}

function parseAIResponse(response, politicianName) {
    logProduction(`🧩 [AI] Parsing AI JSON response for "${politicianName}"`, 'info');

    let json;
    try {
        json = JSON.parse(response);
    } catch {
        logProduction('⚙️ [AI] Attempting to fix malformed JSON...', 'warning');
        let fixed = response
            .replace(/(\r\n|\n|\r)/gm, ' ')
            .replace(/“|”/g, '"')
            .replace(/‘|’/g, "'")
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
        json = JSON.parse(fixed);
    }

    const expectedKeys = [
        'identity','promisesVsReality','controversies',
        'criticView','definingMoments','threats',
        'currentTalk','bottomLine'
    ];

    const summary = {};
    for (const key of expectedKeys) {
        const val = json[key];
        if (!val) logProduction(`⚠️ [AI] Missing key: ${key}`, 'warning');
        summary[key] = cleanAIText(val);
    }

    const totalWords = Object.values(summary).join(' ').split(/\s+/).length;
    logProduction(`📊 [AI] Total AI summary words: ${totalWords}`, 'info');

    return { politician: politicianName, summary, parsedAt: new Date().toISOString(), totalWordCount: totalWords };
}

function cleanAIText(text) {
    if (!text) return 'Data not available';
    return text
        .replace(/\*\*/g, '')
        .replace(/[_#*]/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function classifyAIError(error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('quota')) return 'QUOTA_EXCEEDED';
    if (msg.includes('api key')) return 'INVALID_API_KEY';
    if (msg.includes('permission')) return 'PERMISSION_DENIED';
    if (msg.includes('timeout')) return 'TIMEOUT';
    return 'UNKNOWN_ERROR';
}



// Find Candidate URL (keeping your exact implementation)
async function findCandidateURL(candidateQuery) {
    const searchUrl = `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(candidateQuery.name)}`;
    
    try {
        const html = await fetchHTML(searchUrl);
        const $ = cheerio.load(html);

        let candidateUrl = null;
        logProduction(`Searching for: "${candidateQuery.name}"`, 'info');

        const hasConstituency = candidateQuery.constituency && candidateQuery.constituency.trim() !== '';
        const hasParty = candidateQuery.party && candidateQuery.party.trim() !== '';

        $('table.w3-table tr').each((i, tr) => {
            if (i === 0) return;
            const tds = $(tr).children('td');
            if (tds.length < 5) return;

            const nameAnchor = $(tds[0]).find('a');
            const nameText = normalize(nameAnchor.text());
            const partyText = normalize($(tds[1]).text());
            const constituencyText = normalize($(tds[2]).text());

            const nameMatch = normalize(candidateQuery.name) === nameText;
            
            if (!nameMatch) return;

            const constituencyMatch = hasConstituency 
                ? cleanConstituency(constituencyText) === cleanConstituency(candidateQuery.constituency)
                : true;
            
            const partyMatch = hasParty 
                ? normalizeParty(partyText) === normalizeParty(candidateQuery.party)
                : true;

            if (nameMatch && constituencyMatch && partyMatch) {
                const link = nameAnchor.attr('href');
                candidateUrl = new URL(link, 'https://www.myneta.info').href;
                logProduction(`Match found for ${candidateQuery.name}`, 'success');
                return false;
            }
        });

        return candidateUrl;
    } catch (error) {
        logProduction(`Search failed for ${candidateQuery.name}: ${error.message}`, 'error');
        return null;
    }
}

// Helper function for AI error messages
function getAIErrorMessage(errorType) {
    const errorMessages = {
        'NO_DATA': 'No public information available for AI summary',
        'INSUFFICIENT_DATA': 'Limited information available for summary',
        'INVALID_FORMAT': 'Unable to process politician data',
        'POOR_QUALITY': 'Data quality insufficient for summary',
        'API_KEY_MISSING': 'AI service not configured',
        'QUOTA_EXCEEDED': 'AI API quota exceeded',
        'INVALID_API_KEY': 'Invalid AI API key',
        'PERMISSION_DENIED': 'AI API permission denied',
        'UNKNOWN_ERROR': 'AI summary generation failed'
    };

    return errorMessages[errorType] || 'AI summary not available';
}

// Main Function (Production Version with AI Integration)
export async function getCandidateData(name, constituency = '', party = '', type = 'MP') {
    const overallStart = Date.now();
    
    try {
        // Input validation
        if (!name || name.trim() === '') {
            logProduction('Candidate name is required', 'error');
            return { 
                success: false,
                data: { 
                    error: 'Candidate name is required',
                    assetLink: null,
                    content: null
                } 
            };
        }

        logProduction(`Processing: ${name}`, 'info');

        // Prepare candidate query
        const candidateQuery = { name, constituency, party };
        
        // Start concurrent operations
        const concurrentStart = Date.now();
        const [myNetaResult, aiResult] = await Promise.allSettled([
            // MyNeta data extraction
            (async () => {
                const myNetaStart = Date.now();
                try {
                    const candidatePage = await findCandidateURL(candidateQuery);

                    if (!candidatePage) {
                        return {
                            success: false,
                            data: { 
                                error: 'Candidate not found in search results',
                                assetLink: `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`,
                                content: null
                            },
                            responseTime: Date.now() - myNetaStart
                        };
                    }

                    const printUrl = candidatePage + '&print=true';
                    logProduction(`Fetching: ${printUrl}`, 'info');

                    const html = await fetchPrintPage(printUrl);
                    logProduction(`HTML: ${(html.length / 1024).toFixed(2)} KB`, 'info');

                    const extractedData = await extractData(html);

                    if (extractedData && !extractedData.error) {
                        extractedData.assetLink = candidatePage;
                        extractedData.source = 'webscraping';
                        extractedData.fetchedAt = new Date().toISOString();
                        
                        return {
                            success: true,
                            data: extractedData,
                            responseTime: Date.now() - myNetaStart
                        };
                    }

                    return {
                        success: false,
                        data: { 
                            error: 'Data extraction failed',
                            assetLink: candidatePage,
                            content: null
                        },
                        responseTime: Date.now() - myNetaStart
                    };

                } catch (error) {
                    logProduction(`MyNeta error for ${name}: ${error.message}`, 'error');
                    return {
                        success: false,
                        data: { 
                            error: error.message,
                            assetLink: `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`,
                            content: null
                        },
                        responseTime: Date.now() - myNetaStart
                    };
                }
            })(),
            
            // AI perception summary
            getAIPerceptionSummary(name, party, constituency, type)
        ]);

        const concurrentDuration = Date.now() - concurrentStart;

        // Process results
        const myNetaData = myNetaResult.status === 'fulfilled' 
            ? myNetaResult.value 
            : { success: false, data: { error: 'MyNeta operation failed' }, responseTime: 0 };

        const aiData = aiResult.status === 'fulfilled' 
            ? aiResult.value 
            : { success: false, error: 'AI operation failed', data: null, responseTime: 0 };

        const overallDuration = Date.now() - overallStart;

        // Log results (only in development or on errors)
        if (process.env.NODE_ENV === 'development' || !myNetaData.success) {
            logProduction(`MyNeta: ${myNetaData.success ? 'SUCCESS' : 'FAILED'} (${myNetaData.responseTime}ms)`, 
                myNetaData.success ? 'success' : 'warning');
        }
        
        if (process.env.NODE_ENV === 'development' || !aiData.success) {
            logProduction(`AI: ${aiData.success ? 'SUCCESS' : 'FAILED'} (${aiData.responseTime}ms)`, 
                aiData.success ? 'success' : 'warning');
        }

        // Construct response (maintaining original structure)
        const response = {
            success: myNetaData.success || aiData.success,
            data: {
                // Original MyNeta data structure
                ...myNetaData.data,
                
                // AI summary as additional field
                aiSummary: aiData.success ? {
                    available: true,
                    ...aiData.data,
                    responseTime: aiData.responseTime
                } : {
                    available: false,
                    error: aiData.error,
                    message: getAIErrorMessage(aiData.error)
                },
                
                // Metadata for monitoring
                metadata: {
                    totalTime: overallDuration,
                    concurrentTime: concurrentDuration,
                    timestamp: new Date().toISOString(),
                    sources: {
                        myneta: myNetaData.success,
                        ai: aiData.success
                    },
                    performance: {
                        myNetaTime: myNetaData.responseTime,
                        aiTime: aiData.responseTime,
                        efficiency: concurrentDuration > 0 ? 
                            Math.round(((myNetaData.responseTime + aiData.responseTime) / concurrentDuration) * 100) / 100 : 1
                    }
                }
            }
        };

        // Log completion
        if (response.success) {
            logProduction(`Successfully processed ${name} (${overallDuration}ms)`, 'success');
        } else {
            logProduction(`Failed to process ${name} - both sources failed`, 'error');
        }

        return response;

    } catch (err) {
        const errorDuration = Date.now() - overallStart;
        logProduction(`Critical error processing ${name}: ${err.message}`, 'error');
        
        return { 
            success: false,
            data: { 
                error: err.message,
                assetLink: `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`,
                content: null,
                aiSummary: {
                    available: false,
                    error: 'SYSTEM_ERROR',
                    message: 'System error occurred during processing'
                },
                metadata: {
                    totalTime: errorDuration,
                    timestamp: new Date().toISOString(),
                    sources: {
                        myneta: false,
                        ai: false
                    }
                }
            }
        };
    }
}

// Development testing function
export async function testCandidateDataProduction(name = "Narendra Modi", constituency = "Varanasi", party = "BJP", type = "MP") {
    // if (process.env.NODE_ENV !== 'development') {
    //     throw new Error('Test function only available in development environment');
    // }
    
    console.log('\n🧪 Testing Production Function...');
    console.log('─'.repeat(50));
    
    const result = await getCandidateData(name, constituency, party, type);
    
    console.log('\n📊 Production Test Results:');
    console.log(`Overall Success: ${result.success ? '✅' : '❌'}`);
    console.log(`MyNeta Data: ${result.data.metadata?.sources.myneta ? '✅' : '❌'}`);
    console.log(`AI Summary: ${result.data.metadata?.sources.ai ? '✅' : '❌'}`);
    console.log(`Total Time: ${result.data.metadata?.totalTime}ms`);
    console.log(`Efficiency: ${result.data.metadata?.performance.efficiency}x`);
    
    if (result.data.aiSummary?.available) {
        console.log('\n🤖 AI Summary Sections:');
        Object.keys(result.data.aiSummary.summary || {}).forEach(key => {
            console.log(`  ✓ ${key}`);
        });
    }
    
    return result;
}


testCandidateDataProduction();