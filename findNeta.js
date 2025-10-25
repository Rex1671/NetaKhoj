import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fetchHTML } from './webextract.mjs';
import { fetchHTMLWithPuppeteer } from './scraper.mjs';
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
        'bjd': 'Biju Janata Dal'
    };
    const key = normalize(text);
    return partyMap[key] || key;
}

async function findCandidateURL(candidateQuery) {
    const searchUrl = `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(candidateQuery.name)}`;
    const html = await fetchHTML(searchUrl);
    const $ = cheerio.load(html);

    let candidateUrl = null;

    console.log(`Parsing search results table for "${candidateQuery.name}"...`);

    $('table.w3-table tr').each((i, tr) => {
        if (i === 0) return;
        const tds = $(tr).children('td');
        if (tds.length < 5) return;

        const nameAnchor = $(tds[0]).find('a');
        const nameText = normalize(nameAnchor.text());
        const partyText = normalize($(tds[1]).text());
        const constituencyText = normalize($(tds[2]).text());

    
        // Exact name match required
const nameMatch = normalize(candidateQuery.name) === nameText;

// Constituency match (if provided)
const constituencyMatch = !candidateQuery.constituency || 
                          candidateQuery.constituency === '' ||
                          cleanConstituency(constituencyText) === cleanConstituency(candidateQuery.constituency);

// Party match (if provided)
const partyMatch = !candidateQuery.party || 
                   candidateQuery.party === '' ||
                   normalizeParty(partyText) === normalizeParty(candidateQuery.party);

// Need name + (constituency OR party)
if (nameMatch && (constituencyMatch || partyMatch)) {
            const link = nameAnchor.attr('href');
            candidateUrl = new URL(link, 'https://www.myneta.info').href;
            console.log(`  --> Match found! URL: ${candidateUrl}`);
            return false; 
        }
    });

    if (!candidateUrl) console.log(`No exact match found for ${candidateQuery.name}`);
    return candidateUrl;
}

export async function getCandidateData(name, constituency, party) {
    try {
        console.log('\n' + '='.repeat(60));
        console.log(`📋 Processing: ${name}`);
        console.log('='.repeat(60));

        const candidateQuery = { name, constituency, party };
        console.log("Candidate Query",candidateQuery);
        const candidatePage = await findCandidateURL(candidateQuery);

        const searchUrl = `https://www.myneta.info/search_myneta.php?q=${encodeURIComponent(name)}`;

        if (!candidatePage) {
            console.log('❌ Candidate not found!');
            return { 
                data: { 
                    assetLink: "Nhin dunga :)", 
                    content: null,
                    error: 'Candidate not found in search results'
                } 
            };
        }

        const printUrl = candidatePage + '&print=true';
        console.log(`📄 Fetching candidate page...`);


        const html = await fetchHTMLWithPuppeteer(printUrl);
        
        console.log(`📊 HTML received: ${(html.length / 1024).toFixed(2)} KB`);

 
        const tempDir = path.join(process.cwd(), 'temp_website');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFilePath = path.join(tempDir, `${name.replace(/\s+/g, '_')}.html`);
        fs.writeFileSync(tempFilePath, html, 'utf-8');
        console.log(`💾 Debug HTML saved: ${tempFilePath}`);

        
        console.log('🔬 Extracting data...');
        const extractedData = await extractData(html);

        fs.unlinkSync(tempFilePath);
        console.log('🗑️  Temp file removed');

        if (extractedData) {
            extractedData.assetLink = searchUrl;
            console.log('✅ Extraction successful!\n');
            return { data: extractedData };
        } else {
            console.log('⚠️  Extraction returned null\n');
            return { 
                data: { 
                    assetLink: searchUrl, 
                    content: null,
                    error: 'Data extraction failed'
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

export { closeBrowser } from './scraper.mjs';