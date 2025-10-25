import fetch from 'node-fetch'; 

export async function fetchHTML(url, retries = 3, timeout = 10000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching URL (Attempt ${attempt}/${retries}): ${url}`);

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; Node.js)",
          "Accept": "text/html,application/xhtml+xml"
        },
        signal: controller.signal
      });

      clearTimeout(id);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      console.log(`✅ Successfully fetched ${html.length} characters from ${url}`);
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
