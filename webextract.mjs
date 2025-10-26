import fetch from 'node-fetch';

export async function fetchHTML(url, retries = 3, timeout = 15000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching URL (Attempt ${attempt}/${retries}): ${url}`);

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "max-age=0",
          "Referer": "https://www.myneta.info/"
        },
        signal: controller.signal,
        redirect: 'follow',
        compress: true
      });

      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log(`✅ Successfully fetched ${(html.length / 1024).toFixed(2)} KB`);
      return html;

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt === retries) {
        console.error(`🚨 All ${retries} attempts failed for ${url}`);
        throw error;
      }

      const waitTime = 1000 * attempt;
      console.log(`⏳ Retrying in ${waitTime / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

export async function fetchPrintPage(url, retries = 3) {
  console.log(`📄 Fetching print page: ${url}`);
  
  try {
    const html = await fetchHTML(url, retries, 20000); 
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return html;
  } catch (error) {
    console.error('❌ Failed to fetch print page:', error.message);
    throw error;
  }
}