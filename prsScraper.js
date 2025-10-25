import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

/**
 *
 * @param {string} url 
 * @param {Object} options 
 * @param {boolean} options.fetchMovable 
 * @param {boolean} options.fetchImmovable 
 * @param {boolean} options.fetchLiabilities
 */
export async function fetchAssetTables(url, options = {}) {
    const { fetchMovable = true, fetchImmovable = true, fetchLiabilities = true } = options;

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const html = await page.content();
    const $ = cheerio.load(html);

    const getCellText = (cell) => {
        const text = $(cell).text().replace(/\s+/g, ' ').trim();
        return text === '' ? 'Nil' : text;
    };

    const parseTable = (table) => {
        const data = [];
        table.find('tr').each((i, row) => {
            if (i === 0) return; 

            const cells = $(row).find('td');
            if (!cells.length) return;

            const srNo = getCellText(cells[0]);

            if (!srNo || srNo.toLowerCase().includes('total') || srNo === 'Sr No') return;

            data.push({
                srNo,
                description: getCellText(cells[1] || ''),
                self: getCellText(cells[2] || ''),
                spouse: getCellText(cells[3] || ''),
                huf: getCellText(cells[4] || ''),
                dependent1: getCellText(cells[5] || ''),
                dependent2: getCellText(cells[6] || ''),
                dependent3: getCellText(cells[7] || ''),
                total: getCellText(cells[8] || '')
            });
        });

        return data;
    };

    const tables = {};

    if (fetchMovable) {
        const movableTable = $('#movable_assets');
        tables.movable_assets = movableTable.length ? parseTable(movableTable) : [];
    }

    if (fetchImmovable) {
        const immovableTable = $('#immovable_assets');
        tables.immovable_assets = immovableTable.length ? parseTable(immovableTable) : [];
    }

    if (fetchLiabilities) {
        const liabilitiesTable = $('#liabilities');
        tables.liabilities = liabilitiesTable.length ? parseTable(liabilitiesTable) : [];
    }

    await browser.close();
    return tables;
}


