import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fetchHTML, fetchPrintPage } from './webextract.mjs';
import { extractData } from './extractData.mjs';

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
        'bsp': 'bahujan samaj party',
        'cpi': 'communist party of india',
        'cpi(m)': 'communist party of india (marxist)',
        'ncp': 'nationalist congress party',
        'aap': 'aam aadmi party',
        'sp': 'samajwadi party',
        'jd(u)': 'janata dal (united)',
        'rld': 'rashtriya lok dal',
        'shs': 'shivsena',
        'tdp': 'telugu desam party',
        'dmk': 'dravida munnetra kazhagam',
        'aimim': 'all india majlis-e-ittehadul muslimeen',
        'ind': 'independent',
        'ggp': 'goa suraksha manch',
        'jkp': 'jammu & kashmir peoples democratic party',
        'ld': 'lok dal',
        'ukd': 'uttarakhand kranti dal',
        'ljp': 'lok jan shakti party',
        'rkp': 'rashtriya krantikari party',
        'bhvsp': 'bhartiya hindu shakti',
        'gpp': 'garvi paltan party',
        'vajp': 'vanchit jamat party',
        'rpi': 'republican party of india',
        'ekta shakti': 'ekta shakti party',
        'cpi(ml)(l)': 'communist party of india (marxist-leninist) (liberation)',
        'bkd': 'bahujan kranti dal',
        'jmm': 'jharkhand mukti morcha',
        'bjd': 'biju janata dal'
    };
    const key = normalize(text);
    return partyMap[key] || key;
}

async function findCandidateURL(candidateQuery) {
    const searchUrl = `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(candidateQuery.name)}`;
    const html = await fetchHTML(searchUrl);
    const $ = cheerio.load(html);

    let candidateUrl = null;
    let allMatches = [];

    console.log(`\n🔍 Searching for: "${candidateQuery.name}"`);
    if (candidateQuery.constituency) console.log(`   Constituency: "${candidateQuery.constituency}"`);
    if (candidateQuery.party) console.log(`   Party: "${candidateQuery.party}"`);

    const hasConstituency = candidateQuery.constituency && candidateQuery.constituency.trim() !== '';
    const hasParty = candidateQuery.party && candidateQuery.party.trim() !== '';

    $('table.w3-table tr').each((i, tr) => {
        if (i === 0) return; // Skip header
        const tds = $(tr).children('td');
        if (tds.length < 5) return;

        const nameAnchor = $(tds[0]).find('a');
        const nameText = normalize(nameAnchor.text());
        const partyText = normalize($(tds[1]).text());
        const constituencyText = normalize($(tds[2]).text());

        // Exact name match required
        const nameMatch = normalize(candidateQuery.name) === nameText;
        
        if (!nameMatch) return;

        allMatches.push({ nameText, partyText, constituencyText });

        // Check additional criteria
        const constituencyMatch = hasConstituency 
            ? cleanConstituency(constituencyText) === cleanConstituency(candidateQuery.constituency)
            : true; // If not provided, consider it a match
        
        const partyMatch = hasParty 
            ? normalizeParty(partyText) === normalizeParty(candidateQuery.party)
            : true; // If not provided, consider it a match

        // Match logic
        if (nameMatch && constituencyMatch && partyMatch) {
            const link = nameAnchor.attr('href');
            candidateUrl = new URL(link, 'https://www.myneta.info').href;
            console.log(`✅ Match found!`);
            console.log(`   Party: ${partyText}`);
            console.log(`   Constituency: ${constituencyText}`);
            return false; // Stop iteration
        }
    });

    if (!candidateUrl && allMatches.length > 0) {
        console.log(`\n⚠️  Found ${allMatches.length} candidate(s) with name "${candidateQuery.name}" but criteria didn't match:`);
        allMatches.forEach((c, idx) => {
            console.log(`   ${idx + 1}. ${c.partyText} | ${c.constituencyText}`);
        });
    }

    return candidateUrl;
}

export async function getCandidateData(name, constituency = '', party = '') {
    try {
        // Validate input
        if (!name || name.trim() === '') {
            console.error('❌ Candidate name is required');
            return { 
                data: { 
                    assetLink: null, 
                    content: null,
                    error: 'Candidate name is required'
                } 
            };
        }

        console.log('\n' + '='.repeat(60));
        console.log(`📋 Processing: ${name}`);
        console.log('='.repeat(60));

        const candidateQuery = { name, constituency, party };
        const candidatePage = await findCandidateURL(candidateQuery);

        const searchUrl = `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`;

        if (!candidatePage) {
            console.log('❌ Candidate not found!');
            return { 
                data: { 
                    assetLink: searchUrl, 
                    content: null,
                    error: 'Candidate not found in search results'
                } 
            };
        }

        const printUrl = candidatePage + '&print=true';
        console.log(`📄 Candidate URL: ${printUrl}`);

        // ✅ USE fetchHTML instead of Puppeteer
        console.log(`⏳ Fetching candidate page...`);
        const html = await fetchPrintPage(printUrl);
        
        console.log(`📊 HTML received: ${(html.length / 1024).toFixed(2)} KB`);

        // Optional: Save for debugging
        const tempDir = path.join(process.cwd(), 'temp_website');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `${name.replace(/\s+/g, '_')}.html`);
        fs.writeFileSync(tempFilePath, html, 'utf-8');
        console.log(`💾 Debug HTML saved: ${tempFilePath}`);

        // Extract data
        console.log('🔬 Extracting data...');
        const extractedData = await extractData(html);

        // Clean up temp file
        try {
            fs.unlinkSync(tempFilePath);
            console.log('🗑️  Temp file removed');
        } catch (e) {
            // Ignore cleanup errors
        }

        if (extractedData && !extractedData.error) {
            extractedData.assetLink = candidatePage;
            extractedData.searchUrl = searchUrl;
            console.log('✅ Extraction successful!\n');
            return { data: extractedData };
        } else {
            console.log('⚠️  Extraction returned null or error\n');
            return { 
                data: { 
                    assetLink: searchUrl, 
                    content: null,
                    error: extractedData?.error || 'Data extraction failed'
                } 
            };
        }

    } catch (err) {
        console.error('❌ Error in getCandidateData:', err.message);
        console.error(err.stack);
        return { 
            data: { 
                assetLink: null, 
                content: null,
                error: err.message
            } 
        };
    }
}