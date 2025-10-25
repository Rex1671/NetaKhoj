import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

async function analyzeMyNetaPage(url) {
  console.log('🔍 Analyzing:', url);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  fs.writeFileSync('debug_page.html', html);
  console.log('✅ Saved raw HTML to debug_page.html');


  const analysis = {
    candidateName: $('h2').first().text().trim(),
    tables: {},
    rawSamples: {}
  };


  console.log('\n📊 MOVABLE ASSETS STRUCTURE:');
  $('#movable_assets tr').each((i, row) => {
    if (i === 0) {
      console.log('  Header:', $(row).find('td').map((j, td) => $(td).text().trim()).get());
      return;
    }
    
    const cells = $(row).find('td');
    if (cells.length > 2) {
      const srNo = $(cells[0]).text().trim();
      const desc = $(cells[1]).text().trim();
      const selfCell = cells[2];
      
      console.log(`\n  Row ${i} (${srNo}): ${desc}`);
      console.log('    Self cell HTML:', $(selfCell).html()?.substring(0, 200) + '...');
      console.log('    Has <span class="desc">:', $(selfCell).find('.desc').length);
      console.log('    Has <br>:', ($(selfCell).html() || '').split('<br').length - 1);
      

      const descriptions = [];
      $(selfCell).find('.desc').each((j, span) => {
        descriptions.push($(span).text().trim());
      });
      console.log('    Descriptions found:', descriptions);
    }
  });

  
  console.log('\n🏠 IMMOVABLE ASSETS STRUCTURE:');
  $('#immovable_assets tr').each((i, row) => {
    if (i === 0) return;
    
    const cells = $(row).find('td');
    if (cells.length > 2) {
      const srNo = $(cells[0]).text().trim();
      const desc = $(cells[1]).text().trim();
      const selfCell = cells[2];
      
      if ($(selfCell).text().trim() !== 'Nil') {
        console.log(`\n  ${desc}:`);
        console.log('    Has .desc spans:', $(selfCell).find('.desc').length);
        console.log('    Has .immov spans:', $(selfCell).find('.immov').length);
        
       
        const htmlSnippet = $(selfCell).html() || '';
        const lines = htmlSnippet.split('<br>').slice(0, 5);
        console.log('    First few lines:');
        lines.forEach(line => {
          const cleanLine = $('<div>').html(line).text().trim();
          if (cleanLine) console.log('      -', cleanLine.substring(0, 80));
        });
      }
    }
  });

  
  console.log('\n💳 LIABILITIES STRUCTURE:');
  $('#liabilities tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length > 2) {
      const desc = $(cells[1]).text().trim();
      const selfCell = cells[2];
      
      if ($(selfCell).text().trim() !== 'Nil' && !desc.includes('Total') && !desc.includes('Dues to')) {
        console.log(`\n  ${desc}:`);
        const descriptions = [];
        $(selfCell).find('.desc').each((j, span) => {
          descriptions.push($(span).text().trim());
        });
        if (descriptions.length) {
          console.log('    Entries:', descriptions);
        }
      }
    }
  });


  console.log('\n💰 INCOME TAX STRUCTURE:');
  $('#income_tax tr').each((i, row) => {
    if (i > 0) {
      const cells = $(row).find('td');
      if (cells.length >= 4) {
        const relation = $(cells[0]).text().trim();
        const incomeHtml = $(cells[3]).html() || '';
        console.log(`\n  ${relation}:`);
        console.log('    Has ** separator:', incomeHtml.includes('**'));
        console.log('    Number of entries:', incomeHtml.split('**').length);
      }
    }
  });

  console.log('\n✅ Analysis complete!');
  console.log('📄 Check debug_page.html for full HTML');
}


