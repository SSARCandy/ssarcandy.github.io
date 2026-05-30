const fs = require('fs');
const path = require('path');

const URL = 'https://www.flickr.com/people/ssarcandy/';
const OUTPUT_PATH = path.join(__dirname, '../flickr_key.json');

async function main() {
  try {
    console.log(`Fetching Flickr profile from ${URL}...`);
    
    const response = await fetch(URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Flickr page: ${response.status}`);
    }

    const data = await response.text();
    
    // Look for root.YUI_config.flickr.api.site_key = "..."
    const match = data.match(/root\.YUI_config\.flickr\.api\.site_key\s*=\s*"([a-f0-9]{32})"/);
    
    if (!match || !match[1]) {
      throw new Error('Flickr API key not found on page');
    }

    const key = match[1];
    console.log(`Fetched Flickr API Key: ${key}`);
    
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ api_key: key }, null, 2));
    console.log(`Successfully updated ${OUTPUT_PATH}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
