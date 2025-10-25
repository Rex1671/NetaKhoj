import * as cheerio from 'cheerio';
import fs from 'fs'; // ✅ Add this import

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

    /**
     * Extract ONLY the number, not the description
     * e.g., "3,50,000 3 Lacs+" -> "Rs 3,50,000"
     */
    const extractAmount = (htmlString) => {
      if (!htmlString) return 'Nil';
      
      const tempDiv = $('<div>').html(htmlString);
      const plainText = tempDiv.text().trim();
      
      if (plainText === 'Nil' || plainText === '') return 'Nil';
      
      // Priority 1: Rs&nbsp;NUMBER format (in total columns)
      let rsMatch = htmlString.match(/Rs\s*&nbsp;\s*([\d,]+)/i);
      if (rsMatch) return `Rs ${rsMatch[1]}`;
      
      // Priority 2: Just NUMBER (before any descriptive span)
      // Match: "3,50,000&nbsp;<span>..."
      const beforeSpanMatch = htmlString.match(/([\d,]+)\s*&nbsp;\s*<span/);
      if (beforeSpanMatch) return `Rs ${beforeSpanMatch[1]}`;
      
      // Priority 3: Match plain number followed by whitespace and optional description
      const numberMatch = plainText.match(/^(\d[\d,]*)/);
      if (numberMatch) return `Rs ${numberMatch[1]}`;
      
      return 'Nil';
    };

    /**
     * Parse multi-entry cell - extract description and amount separately
     */
    const parseMultiEntryCell = (cell) => {
      if (!cell) return 'Nil';
      
      const $cell = $(cell);
      const htmlContent = $cell.html() || '';
      const textContent = $cell.text().trim();
      
      if (!htmlContent || !textContent || textContent === 'Nil') {
        return 'Nil';
      }

      // Split by double br tags
      const entries = htmlContent.split(/<br\s*\/?>\s*<br\s*\/?>/i);
      const parsedEntries = [];

      entries.forEach(entry => {
        if (!entry || entry.trim() === '') return;
        
        const $entry = $('<div>').html(entry);
        const description = $entry.find('.desc').text().trim();
        
        if (description) {
          // Extract the number that comes after the description
          const amount = extractAmount(entry);
          parsedEntries.push(`${description}: ${amount}`);
        }
      });

      return parsedEntries.length > 0 ? parsedEntries.join('\n') : 'Nil';
    };

    /**
     * Parse property cell with structured data
     */
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

        // Extract current value (the number before the span)
        const valueMatch = prop.match(/([\d,]+)\s*&nbsp;\s*<span[^>]*>.*?(?:Lacs?|Crore?)/i);
        const currentValue = valueMatch ? `Rs ${valueMatch[1]}` : '';

        let formatted = mainDesc;
        if (currentValue) formatted += ` - ${currentValue}`;

        parsedProperties.push(formatted);
      });

      return parsedProperties.length > 0 ? parsedProperties.join('\n') : 'Nil';
    };

    // ============================================================================
    // EXTRACT BASIC INFO
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

    // ============================================================================
    // EDUCATION - Find the correct div (not the Crime-O-Meter one)
    // ============================================================================
    let education = 'N/A';
    
    $('h3').each((i, h3) => {
      const $h3 = $(h3);
      if ($h3.text().trim() === 'Educational Details') {
        const $panel = $h3.closest('div.w3-panel');
        const fullText = $panel.text();
        const cleanText = fullText
          .replace('Educational Details', '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Only take the part after the HR
        const parts = cleanText.split(/Category:/);
        if (parts.length > 1) {
          education = 'Category: ' + parts[1].trim();
        } else {
          education = cleanText;
        }
        return false;
      }
    });

    // ============================================================================
    // PROFESSION & INCOME
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
    // INCOME TAX
    // ============================================================================

    console.log('[INCOME_TAX] Parsing...');
    const incomeTax = [];
    const incomeTaxTable = $('#income_tax');
    
    if (incomeTaxTable.length) {
      incomeTaxTable.find('tr').each((i, row) => {
        if (i === 0) return;
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
    // MOVABLE ASSETS
    // ============================================================================

    console.log('[MOVABLE] Parsing...');
    const movableAssets = [];
    const movableTable = $('#movable_assets');

    if (movableTable.length) {
      let currentSrNo = null;
      
      movableTable.find('tr').each((i, row) => {
        if (i === 0) return;
        
        const cells = $(row).find('td');
        if (cells.length < 8) return;
        
        const firstCellText = getCellText(cells[0]);
        const secondCellText = getCellText(cells[1]);
        
        if (firstCellText === 'Sr No' || secondCellText === 'Description') return;
        
        // Skip total rows
        if (secondCellText.toLowerCase().includes('gross total') || 
            secondCellText.toLowerCase().includes('totals')) {
          return;
        }
        
        let srNo, description, selfIdx, spouseIdx, hufIdx, dep1Idx, dep2Idx, dep3Idx, totalIdx;
        
        // Check if this row has a rowspan attribute
        const firstCellRowspan = $(cells[0]).attr('rowspan');
        const isSerialNoCell = /^[ivxlcdm]+$/i.test(firstCellText);
        
        if (cells.length >= 9 && (isSerialNoCell || firstCellRowspan)) {
          // Full row with srNo
          srNo = firstCellText;
          description = secondCellText;
          currentSrNo = srNo;
          selfIdx = 2; spouseIdx = 3; hufIdx = 4; dep1Idx = 5; dep2Idx = 6; dep3Idx = 7; totalIdx = 8;
        } else if (cells.length === 8) {
          // Rowspan continuation
          srNo = currentSrNo;
          description = firstCellText;
          selfIdx = 1; spouseIdx = 2; hufIdx = 3; dep1Idx = 4; dep2Idx = 5; dep3Idx = 6; totalIdx = 7;
        } else {
          return;
        }
        
        if (!description || description === 'Nil') return;
        
        movableAssets.push({
          srNo,
          description,
          self: parseMultiEntryCell(cells[selfIdx]),
          spouse: getCellText(cells[spouseIdx]),
          huf: getCellText(cells[hufIdx]),
          dependent1: getCellText(cells[dep1Idx]),
          dependent2: getCellText(cells[dep2Idx]),
          dependent3: getCellText(cells[dep3Idx]),
          total: extractAmount($(cells[totalIdx]).html())
        });
      });
      console.log(`[MOVABLE] ✓ Parsed ${movableAssets.length} assets`);
    } else {
      console.warn('[MOVABLE] ⚠️ Table not found');
    }

    // ============================================================================
    // IMMOVABLE ASSETS
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
        if (descLower.includes('total current market') || descLower.includes('totals')) {
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
    // LIABILITIES - rowspan="4" means 4 rows total
    // ============================================================================

    console.log('[LIABILITIES] Parsing...');
    const liabilities = [];
    const liabilitiesTable = $('#liabilities');

    if (liabilitiesTable.length) {
      let inSectionI = false;
      let sectionIRowsProcessed = 0;
      const maxSectionIRows = 4; // rowspan="4"
      
      liabilitiesTable.find('tr').each((i, row) => {
        if (i === 0) return; // Skip header
        
        const cells = $(row).find('td');
        if (cells.length < 8) return;
        
        const firstCellText = getCellText(cells[0]);
        const firstCellRowspan = $(cells[0]).attr('rowspan');
        
        // Check if this starts section i
        if (firstCellText === 'i' && firstCellRowspan) {
          inSectionI = true;
          sectionIRowsProcessed = 0;
          
          // First row of section i
          const description = getCellText(cells[1]);
          liabilities.push({
            srNo: 'i',
            description,
            self: parseMultiEntryCell(cells[2]),
            spouse: getCellText(cells[3]),
            huf: getCellText(cells[4]),
            dependent1: getCellText(cells[5]),
            dependent2: getCellText(cells[6]),
            dependent3: getCellText(cells[7]),
            total: cells.length > 8 ? extractAmount($(cells[8]).html()) : 'Nil'
          });
          sectionIRowsProcessed++;
          return;
        }
        
        // Check if we're entering section ii, iii, or iv
        if (firstCellText === 'ii' || firstCellText === 'iii' || firstCellText === 'iv') {
          inSectionI = false;
          return;
        }
        
        // Process continuation rows of section i
        if (inSectionI && sectionIRowsProcessed < maxSectionIRows && cells.length === 8) {
          const description = firstCellText;
          
          // Skip the "Grand Total" row
          if (description.toLowerCase().includes('grand total')) {
            inSectionI = false;
            return;
          }
          
          liabilities.push({
            srNo: 'i',
            description,
            self: parseMultiEntryCell(cells[1]),
            spouse: getCellText(cells[2]),
            huf: getCellText(cells[3]),
            dependent1: getCellText(cells[4]),
            dependent2: getCellText(cells[5]),
            dependent3: getCellText(cells[6]),
            total: extractAmount($(cells[7]).html())
          });
          sectionIRowsProcessed++;
        }
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
    console.log(`   Education: ${education}`);
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