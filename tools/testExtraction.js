import { fetchHTML } from '../webextract.mjs';
import { extractData } from '../extractData.mjs';
import fs from 'fs';

const testCandidates = [
  {
    name: 'Manoj Tiwari',
    url: 'https://www.myneta.info/LokSabha2019/candidate.php?candidate_id=12699&print=true'
  },
  {
    name: 'Manas Kumar Dutta',
    url: 'https://www.myneta.info/odisha2019/candidate.php?candidate_id=5866&print=true'
  }
];

async function testExtraction() {
  for (const candidate of testCandidates) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Testing: ${candidate.name}`);
    console.log('='.repeat(80));

    try {
      const html = await fetchHTML(candidate.url);
      const data = await extractData(html);

      // Save results
      const outputFile = `test_output_${candidate.name.replace(/\s+/g, '_')}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      
      console.log(`✅ Success! Data saved to ${outputFile}`);
      console.log(`\nSummary:`);
      console.log(`  - Movable Assets: ${data.movableAssets.length} items`);
      console.log(`  - Immovable Assets: ${data.immovableAssets.length} items`);
      console.log(`  - Liabilities: ${data.liabilities.length} items`);
      console.log(`  - Criminal Cases: ${data.crimeOMeter.cases}`);
      
      // Show sample data
      if (data.movableAssets.length > 0) {
        console.log(`\n  Sample Movable Asset (${data.movableAssets[0].description}):`);
        console.log(`    Self: ${data.movableAssets[0].self.substring(0, 100)}...`);
      }

    } catch (error) {
      console.error(`❌ Failed for ${candidate.name}:`, error.message);
    }
  }
}

testExtraction();