
import { fetchAssetTables } from './prsScraper.js';
import { fetchHTML } from './webextract.mjs';
import * as cheerio from 'cheerio';

export async function getCandidateAssetData(name, constituency, party) {
    try {
        console.log("Fetching asset data for:", name, constituency, party);

        const candidateQuery = { name, constituency, party };
        const candidateUrl = await findCandidateURL(candidateQuery);

        if (!candidateUrl) {
            console.log("Candidate URL not found!");
            return {};
        }

        console.log("Candidate URL found:", candidateUrl);

        // Call PRS scraper with the candidate URL
        const jsonData = await fetchAssetTables(candidateUrl);

        console.log("Asset data fetched successfully");
        return jsonData;

    } catch (err) {
        console.error("Error fetching candidate assets:", err);
        return {};
    }
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

function normalize(text) {
    return text ? text.trim().toLowerCase().replace(/\s+/g, ' ') : '';
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
        'jmm': 'jharkhand mukti morcha'
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

        // Debug logs
        // console.log(`Row ${i}: Name="${nameText}", Party="${partyText}", Constituency="${constituencyText}"`);

        if (
            normalize(candidateQuery.name) === nameText &&
            cleanConstituency(constituencyText) === cleanConstituency(candidateQuery.constituency) &&
            normalizeParty(partyText) === normalizeParty(candidateQuery.party)
        ) {
            const link = nameAnchor.attr('href');
            candidateUrl = new URL(link, 'https://www.myneta.info').href;
            console.log(`  --> Match found! URL: ${candidateUrl}`);
            return false; 
        }
    });

    if (!candidateUrl) console.log(`No exact match found for ${candidateQuery.name}`);
    return candidateUrl;
}