import puppeteer from 'puppeteer';

let browserInstance = null;


async function getBrowser() {
  if (!browserInstance) {
    console.log('🚀 Launching browser...');
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  return browserInstance;
}


export async function fetchHTMLWithPuppeteer(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    console.log(`🌐 Loading: ${url}`);

    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );


    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('⏳ Waiting for dynamic tables...');


    const tableWaits = [
      page.waitForSelector('#movable_assets', { timeout: 15000 }).catch(() => console.warn('  ⚠️ movable_assets timeout')),
      page.waitForSelector('#immovable_assets', { timeout: 15000 }).catch(() => console.warn('  ⚠️ immovable_assets timeout')),
      page.waitForSelector('#liabilities', { timeout: 15000 }).catch(() => console.warn('  ⚠️ liabilities timeout')),
      page.waitForSelector('#income_tax', { timeout: 15000 }).catch(() => console.warn('  ⚠️ income_tax timeout'))
    ];

    await Promise.all(tableWaits);


    await page.waitForFunction(() => {
      const movable = document.querySelector('#movable_assets');
      const immovable = document.querySelector('#immovable_assets');
      const liabilities = document.querySelector('#liabilities');
      
      const movableRows = movable ? movable.querySelectorAll('tr').length : 0;
      const immovableRows = immovable ? immovable.querySelectorAll('tr').length : 0;
      const liabilityRows = liabilities ? liabilities.querySelectorAll('tr').length : 0;
      
      return movableRows > 2 || immovableRows > 2 || liabilityRows > 2;
    }, { timeout: 10000 }).catch(() => console.warn('  ⚠️ Table rows not populated'));

   
    await page.waitForTimeout(2000);

    const html = await page.content();
    
    console.log(`✅ HTML fetched: ${(html.length / 1024).toFixed(2)} KB`);
    
    return html;

  } catch (error) {
    console.error('❌ Puppeteer fetch failed:', error.message);
    throw error;
  } finally {
    await page.close();
  }
}


export async function closeBrowser() {
  if (browserInstance) {
    console.log('🔒 Closing browser...');
    await browserInstance.close();
    browserInstance = null;
  }
}