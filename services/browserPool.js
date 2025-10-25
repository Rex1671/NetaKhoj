import puppeteer from 'puppeteer';
import config from '../config/config.js';

class BrowserPool {
  constructor() {
    this.browsers = [];
    this.available = [];
    this.busy = new Set();
    this.maxBrowsers = config.scraper.maxBrowsers;
    this.launching = 0;
  }

  async getBrowser() {
    if (this.available.length > 0) {
      const browser = this.available.pop();
      this.busy.add(browser);
      console.log(`♻️ [BROWSER] Reusing (${this.busy.size} busy, ${this.available.length} available)`);
      return browser;
    }

    if (this.browsers.length < this.maxBrowsers && this.launching === 0) {
      this.launching++;
      try {
        const browser = await this.launchBrowser();
        this.browsers.push(browser);
        this.busy.add(browser);
        this.launching--;
        console.log(`🚀 [BROWSER] Launched new (${this.browsers.length}/${this.maxBrowsers})`);
        return browser;
      } catch (error) {
        this.launching--;
        throw error;
      }
    }

    console.log(`⏳ [BROWSER] Waiting for available browser...`);
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(checkInterval);
          const browser = this.available.pop();
          this.busy.add(browser);
          console.log(`✅ [BROWSER] Got browser after waiting`);
          resolve(browser);
        }
      }, 200);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Browser pool timeout'));
      }, 30000);
    });
  }

  async launchBrowser() {
    return await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      timeout: 30000
    });
  }

  releaseBrowser(browser) {
    if (this.busy.has(browser)) {
      this.busy.delete(browser);
      this.available.push(browser);
      console.log(`✅ [BROWSER] Released (${this.busy.size} busy, ${this.available.length} available)`);
    }
  }

  async closeAll() {
    console.log(`🛑 [BROWSER] Closing all browsers (${this.browsers.length})`);
    await Promise.all(this.browsers.map(b => b.close().catch(err => console.error(err))));
    this.browsers = [];
    this.available = [];
    this.busy.clear();
  }

  getStats() {
    return {
      total: this.browsers.length,
      busy: this.busy.size,
      available: this.available.length,
      launching: this.launching
    };
  }
}

export default new BrowserPool();
