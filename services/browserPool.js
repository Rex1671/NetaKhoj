
class BrowserPool {
  constructor() {
    this.browsers = [];
    this.available = [];
    this.busy = new Set();
    this.maxBrowsers = 0; 
    this.launching = 0;
  }

  async getBrowser() {
    throw new Error('BrowserPool is disabled - Puppeteer dependency removed');
  }

  async launchBrowser() {
    throw new Error('BrowserPool is disabled - Puppeteer dependency removed');
  }

  releaseBrowser(browser) {
  }

  async closeAll() {
  }

  getStats() {
    return {
      total: 0,
      busy: 0,
      available: 0,
      launching: 0,
      disabled: true,
      reason: 'Puppeteer dependency removed'
    };
  }
}

export default new BrowserPool();
