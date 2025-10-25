import * as cheerio from 'cheerio';
import fs from 'fs'; 
export async function extractData(html) {
  try {
    const $ = cheerio.load(html);

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    const getCellText = (cell) => {
      const text = $(cell).text().replace(/\s+/g, ' ').trim();
      return text === '' || text === 'Nil' ? 'Nil' : text;
    };

    const extractAmount = (htmlString) => {
      if (!htmlString) return 'Nil';
      
    
      let rsMatch = htmlString.match(/Rs\s*&nbsp;\s*([\d,]+)/i);
      if (!rsMatch) {
        rsMatch = htmlString.match(/Rs\s+([\d,]+)/i);
      }
      if (rsMatch) {
        return `Rs ${rsMatch[1]}`;
      }
      
      const beforeDescMatch = htmlString.match(/([\d,]+)\s*(?:&nbsp;|~)/);
      if (beforeDescMatch) {
        return `Rs ${beforeDescMatch[1]}`;
      }
      
      const numMatch = htmlString.match(/([\d,]+)/);
      return numMatch ? `Rs ${numMatch[1]}` : 'Nil';
    };

    const parseMultiEntryCell = (cell) => {
      if (!cell) return 'Nil';
      
      const $cell = $(cell);
      const htmlContent = $cell.html() || '';
      const textContent = $cell.text().trim();
      
      if (!htmlContent || !textContent || textContent === 'Nil') {
        return 'Nil';
      }

      const entries = htmlContent.split(/<br\s*\/?>\s*<br\s*\/?>/i);
      const parsedEntries = [];

      entries.forEach(entry => {
        if (!entry || entry.trim() === '') return;
        
        const $entry = $('<div>').html(entry);
        const description = $entry.find('.desc').text().trim();
        
        if (description) {
          const amount = extractAmount(entry);
          parsedEntries.push(`${description}: ${amount}`);
        } else {
          const amount = extractAmount(entry);
          if (amount !== 'Nil') {
            parsedEntries.push(amount);
          }
        }
      });

      return parsedEntries.length > 0 ? parsedEntries.join('\n') : textContent;
    };

    const parsePropertyCell = (cell) => {
      if (!cell) return 'Nil';
      
      const $cell = $(cell);
      const htmlContent = $cell.html() || '';
      const textContent = $cell.text().trim();
      
      if (!htmlContent || !textContent || textContent === 'Nil') {
        return 'Nil';
      }

      const properties = htmlContent.split(/<br\s*\/?>\s*<br\s*\/?>/i);
      const parsedProperties = [];

      properties.forEach(prop => {
        if (!prop || prop.trim() === '') return;
        
        const $prop = $('<div>').html(prop);
        const mainDesc = $prop.find('.desc').first().text().trim();
        
        if (!mainDesc) return;

        const details = {
          description: mainDesc,
          totalArea: '',
          builtUpArea: '',
          inherited: '',
          purchaseDate: '',
          purchaseCost: '',
          currentValue: ''
        };

        const fullText = prop;
        
        const totalAreaMatch = fullText.match(/Total Area[:\s]*<span class="immov">([^<]+)/i);
        if (totalAreaMatch) details.totalArea = totalAreaMatch[1].trim();

        const builtAreaMatch = fullText.match(/Built Up Area[:\s]*<span class="immov">([^<]+)/i);
        if (builtAreaMatch) details.builtUpArea = builtAreaMatch[1].trim();

        const inheritedMatch = fullText.match(/Whether Inherited[:\s]*<span class="immov">([YN])/i);
        if (inheritedMatch) details.inherited = inheritedMatch[1];

        const purchaseDateMatch = fullText.match(/Purchase Date[:\s]*<span class="immov">([^<]+)/i);
        if (purchaseDateMatch) details.purchaseDate = purchaseDateMatch[1].trim();

        const purchaseCostMatch = fullText.match(/Purchase Cost[:\s]*<span class="immov">([\d.]+)/i);
        if (purchaseCostMatch) details.purchaseCost = purchaseCostMatch[1];

        const valueMatch = fullText.match(/(\d[\d,]*)\s*(?:&nbsp;|~)/);
        if (valueMatch) details.currentValue = `Rs ${valueMatch[1]}`;

        let formatted = `${details.description}`;
        if (details.totalArea) formatted += ` | Area: ${details.totalArea}`;
        if (details.builtUpArea) formatted += ` | Built: ${details.builtUpArea}`;
        if (details.inherited) formatted += ` | Inherited: ${details.inherited === 'Y' ? 'Yes' : 'No'}`;
        if (details.purchaseDate && details.purchaseDate !== '0000-00-00') formatted += ` | Date: ${details.purchaseDate}`;
        if (details.currentValue) formatted += ` | Value: ${details.currentValue}`;

        parsedProperties.push(formatted);
      });

      return parsedProperties.length > 0 ? parsedProperties.join('\n\n') : textContent;
    };

    // ============================================================================
    // EXTRACT BASIC INFO (Always works)
    // ============================================================================

    const candidateName = $('h2').first().text().replace(/\(Winner\)/gi, '').trim();
    const constituencyText = $('h5').first().text().trim();
    
    const partyDiv = $('div:contains("Party:")').first();
    const party = partyDiv.length ? partyDiv.text().match(/Party:\s*(.+)/)?.[1]?.trim() : null;

    const relationDiv = $('div:contains("S/o|D/o|W/o:")').first();
    const relation = relationDiv.length ? relationDiv.text().match(/S\/o\|D\/o\|W\/o:\s*(.+)/)?.[1]?.trim() : null;

    const ageDiv = $('div:contains("Age:")').first();
    const age = ageDiv.length ? parseInt(ageDiv.text().match(/Age:\s*(\d+)/)?.[1]) : null;

    const voterDiv = $('div:contains("Name Enrolled as Voter in:")').first();
    const voterEnrollment = voterDiv.length ? voterDiv.text().match(/Name Enrolled as Voter in:\s*(.+)/)?.[1]?.trim() : null;


    let education = 'N/A';
   
const educationDiv = $('div:contains("Educational Details")').first();

if (educationDiv.length) {
  let fullText = educationDiv.text();
  
  // Find where "Educational Details" starts
  const startMarker = 'Educational Details';
  const startIndex = fullText.indexOf(startMarker);
  
  if (startIndex !== -1) {
    // Extract text after "Educational Details"
    let eduText = fullText.substring(startIndex + startMarker.length);
    
    // Remove content after common section markers
    const endMarkers = [
      'Crime-O-Meter',
      'Assets & Liabilities',
      'google.charts',
      'No criminal cases',
      'function drawChart'
    ];
    
    for (const marker of endMarkers) {
      const markerIndex = eduText.indexOf(marker);
      if (markerIndex !== -1) {
        eduText = eduText.substring(0, markerIndex);
      }
    }
    
    // Clean up the text
    eduText = eduText
      .replace(/Category:/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (eduText && eduText.length > 0) {
      education = eduText;
    }
  }}
    // ============================================================================
    // PROFESSION & INCOME SOURCES (Fixed indices)
    // ============================================================================

    const professionTable = $('#profession table.w3-table');
    const profession = {
      self: professionTable.find('tr').eq(0).find('td').eq(1).find('b').text().trim() || 'NA',
      spouse: professionTable.find('tr').eq(1).find('td').eq(1).find('b').text().trim() || 'NA'
    };

    const incomeTable = $('#incomesource table.w3-table');
    const sourcesOfIncome = {
      self: incomeTable.find('tr').eq(0).find('td').eq(1).find('b').text().trim() || 'Nil',
      spouse: incomeTable.find('tr').eq(1).find('td').eq(1).find('b').text().trim() || 'NA',
      dependent: incomeTable.find('tr').eq(2).find('td').eq(1).find('b').text().trim() || 'NA'
    };

    // ============================================================================
    // OTHER ELECTIONS
    // ============================================================================

    const otherElections = [];
    $('table:contains("Other Elections") tr').each((i, row) => {
      if (i <= 1) return;
      const cells = $(row).find('td');
      if (cells.length >= 3) {
        const declIn = getCellText(cells[0]);
        if (declIn && !declIn.includes('Click here')) {
          otherElections.push({
            declarationIn: declIn,
            declaredAssets: getCellText(cells[1]),
            declaredCases: parseInt(getCellText(cells[2])) || 0
          });
        }
      }
    });

    // ============================================================================
    // CRIMINAL CASES
    // ============================================================================

    const crimeCasesText = $('div:contains("Number of Criminal Cases:")').text();
    const criminalCases = parseInt(crimeCasesText.match(/Number of Criminal Cases:\s*(\d+)/)?.[1]) || 0;

    const briefIPC = [];
    $('ul li').each((i, li) => {
      const text = $(li).text().trim();
      const match = text.match(/(\d+)\s*charges related to\s*(.+)/i);
      if (match) {
        briefIPC.push({
          count: parseInt(match[1]),
          section: match[2].trim()
        });
      }
    });

    const pendingCases = [];
    $('#cases tr').each((i, row) => {
      if (i === 0) return;
      const cells = $(row).find('td');
      if (cells.length >= 9) {
        const serialNo = getCellText(cells[0]);
        if (serialNo && serialNo !== 'Serial No.' && !serialNo.includes('No Cases')) {
          pendingCases.push({
            serialNo,
            firNo: getCellText(cells[1]),
            caseNo: getCellText(cells[2]),
            court: getCellText(cells[3]),
            ipcSections: getCellText(cells[4]),
            otherDetails: getCellText(cells[5]),
            chargesFramed: getCellText(cells[6]),
            dateChargesFramed: getCellText(cells[7]),
            appealFiled: getCellText(cells[8]),
            appealDetails: cells.length > 9 ? getCellText(cells[9]) : 'Nil'
          });
        }
      }
    });

    // ============================================================================
    // INCOME TAX (Delayed loading - robust parsing)
    // ============================================================================

    console.log('[INCOME_TAX] Parsing...');
    const incomeTax = [];
    const incomeTaxTable = $('#income_tax');
    
    if (incomeTaxTable.length) {
      incomeTaxTable.find('tr').each((i, row) => {
        if (i === 0) return; // Skip header
        const cells = $(row).find('td');
        if (cells.length >= 4) {
          const relation = getCellText(cells[0]);
          const pan = getCellText(cells[1]);
          const year = getCellText(cells[2]);
          const incomeHtml = $(cells[3]).html() || '';

          let income = incomeHtml
            .replace(/<br\s*\/?>/gi, ' ** ')
            .replace(/&nbsp;/g, ' ')
            .replace(/<span[^>]*>/gi, '')
            .replace(/<\/span>/gi, '')
            .replace(/~/g, '')
            .trim();

          incomeTax.push({ relation, pan, year, income });
        }
      });
      console.log(`[INCOME_TAX] ✓ Parsed ${incomeTax.length} entries`);
    } else {
      console.warn('[INCOME_TAX] ⚠️ Table not found');
    }

    // ============================================================================
    // MOVABLE ASSETS (Delayed loading - robust parsing)
    // ============================================================================

    console.log('[MOVABLE] Parsing...');
    const movableAssets = [];
    const movableTable = $('#movable_assets');

    if (movableTable.length) {
      movableTable.find('tr').each((i, row) => {
        const cells = $(row).find('td');
        
        if (cells.length < 8) return;
        
        const srNo = getCellText(cells[0]);
        const description = getCellText(cells[1]);
        
        if (srNo === 'Sr No' || description === 'Description') return;
        
        const descLower = description.toLowerCase();
        if (descLower.includes('gross total') || 
            descLower.includes('total value') ||
            descLower.includes('totals') ||
            srNo.toLowerCase().includes('total')) {
          return;
        }
        
        if (!srNo || srNo === 'Nil') return;
        
        movableAssets.push({
          srNo,
          description,
          self: parseMultiEntryCell(cells[2]),
          spouse: getCellText(cells[3]),
          huf: getCellText(cells[4]),
          dependent1: getCellText(cells[5]),
          dependent2: getCellText(cells[6]),
          dependent3: getCellText(cells[7]),
          total: cells.length > 8 ? extractAmount($(cells[8]).html()) : 'Nil'
        });
      });
      console.log(`[MOVABLE] ✓ Parsed ${movableAssets.length} assets`);
    } else {
      console.warn('[MOVABLE] ⚠️ Table not found');
    }

    // ============================================================================
    // IMMOVABLE ASSETS (Delayed loading - robust parsing)
    // ============================================================================

    console.log('[IMMOVABLE] Parsing...');
    const immovableAssets = [];
    const immovableTable = $('#immovable_assets');

    if (immovableTable.length) {
      immovableTable.find('tr').each((i, row) => {
        const cells = $(row).find('td');
        
        if (cells.length < 8) return;
        
        const srNo = getCellText(cells[0]);
        const description = getCellText(cells[1]);
        
        if (srNo === 'Sr No' || description === 'Description') return;
        
        const descLower = description.toLowerCase();
        if (descLower.includes('total current market') || 
            descLower.includes('totals calculated') ||
            srNo.toLowerCase().includes('total')) {
          return;
        }
        
        if (!srNo || srNo === 'Nil') return;
        
        immovableAssets.push({
          srNo,
          description,
          self: parsePropertyCell(cells[2]),
          spouse: getCellText(cells[3]),
          huf: getCellText(cells[4]),
          dependent1: getCellText(cells[5]),
          dependent2: getCellText(cells[6]),
          dependent3: getCellText(cells[7]),
          total: cells.length > 8 ? extractAmount($(cells[8]).html()) : 'Nil'
        });
      });
      console.log(`[IMMOVABLE] ✓ Parsed ${immovableAssets.length} properties`);
    } else {
      console.warn('[IMMOVABLE] ⚠️ Table not found');
    }

    // ============================================================================
    // LIABILITIES (Delayed loading - robust parsing)
    // ============================================================================

    console.log('[LIABILITIES] Parsing...');
    const liabilities = [];
    const liabilitiesTable = $('#liabilities');

    if (liabilitiesTable.length) {
      liabilitiesTable.find('tr').each((i, row) => {
        const cells = $(row).find('td');
        
        if (cells.length < 8) return;
        
        const srNo = getCellText(cells[0]);
        const description = getCellText(cells[1]);
        
        if (srNo === 'Sr No' || description === 'Description') return;
        
        const descLower = description.toLowerCase();
        if (descLower.includes('grand total') || 
            descLower.includes('totals calculated') ||
            descLower.includes('govt dues') ||
            descLower.includes('dues to departments') ||
            descLower.includes('tax dues') ||
            descLower.includes('whether any other') ||
            srNo === 'ii' || srNo === 'iii' || srNo === 'iv') {
          return;
        }
        
        if (!srNo || srNo === 'Nil') return;
        if (srNo !== 'i' && !srNo.match(/^\d+$/)) return;
        
        liabilities.push({
          srNo,
          description,
          self: parseMultiEntryCell(cells[2]),
          spouse: getCellText(cells[3]),
          huf: getCellText(cells[4]),
          dependent1: getCellText(cells[5]),
          dependent2: getCellText(cells[6]),
          dependent3: getCellText(cells[7]),
          total: cells.length > 8 ? extractAmount($(cells[8]).html()) : 'Nil'
        });
      });
      console.log(`[LIABILITIES] ✓ Parsed ${liabilities.length} items`);
    } else {
      console.warn('[LIABILITIES] ⚠️ Table not found');
    }

    // ============================================================================
    // CONTRACTS
    // ============================================================================

    const contracts = {
      candidate: 'NA',
      spouse: 'NA',
      dependents: 'NA',
      huf: 'NA',
      partnerships: 'NA',
      privateCompanies: 'NA'
    };

    $('#contractdetails tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const desc = getCellText(cells[0]).toLowerCase();
        const details = $(cells[1]).find('b').text().trim() || getCellText(cells[1]);
        
        if (desc.includes('candidate')) contracts.candidate = details;
        else if (desc.includes('spouse')) contracts.spouse = details;
        else if (desc.includes('dependent')) contracts.dependents = details;
        else if (desc.includes('hindu undivided')) contracts.huf = details;
        else if (desc.includes('partnership')) contracts.partnerships = details;
        else if (desc.includes('private companies')) contracts.privateCompanies = details;
      }
    });

    // ============================================================================
    // SUMMARY
    // ============================================================================

    const assetsRow = $('td:contains("Assets:")').first();
    const liabilitiesRow = $('td:contains("Liabilities:")').first();

    const summary = {
      totalAssets: assetsRow.length ? assetsRow.next().text().trim() : 'N/A',
      totalLiabilities: liabilitiesRow.length ? liabilitiesRow.next().text().trim() : 'N/A'
    };

    // ============================================================================
    // FINAL ASSEMBLY
    // ============================================================================

    const extractedData = {
      candidate: {
        name: candidateName,
        party,
        constituency: constituencyText,
        relation,
        age,
        voterEnrollment,
        education,
        professions: profession
      },
      otherElections,
      crimeOMeter: {
        cases: criminalCases
      },
      incomeTax,
      criminalCases: {
        briefIPC,
        pendingCases,
        convictedCases: pendingCases.length === 0 ? ['No Cases'] : []
      },
      movableAssets,
      immovableAssets,
      liabilities,
      profession,
      sourcesOfIncome,
      contracts,
      summary
    };

    console.log('\n✅ Extraction Summary:');
    console.log(`   Name: ${candidateName}`);
    console.log(`   Criminal Cases: ${criminalCases}`);
    console.log(`   Income Tax Entries: ${incomeTax.length}`);
    console.log(`   Movable Assets: ${movableAssets.length}`);
    console.log(`   Immovable Assets: ${immovableAssets.length}`);
    console.log(`   Liabilities: ${liabilities.length}`);
  const outputPath = 'extracted_test.txt';
    fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2), 'utf-8');
    console.log(`\n💾 Extracted data saved to ${outputPath}`);
   
    return extractedData;

  } catch (error) {
    console.error('❌ Extraction error:', error);
    throw error;
  }
}