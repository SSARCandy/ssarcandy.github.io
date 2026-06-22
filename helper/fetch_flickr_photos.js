const fs = require('fs');
const path = require('path');

const PROFILE_URL = 'https://www.flickr.com/people/ssarcandy/';
const USER_ID = '200681089@N06';
const LIVE_FALLBACK_URL = 'https://ssarcandy.tw/flickr_photos.json';
const OUTPUT_PATH = path.join(__dirname, '../source/flickr_photos.json');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Scrape the public site_key that Flickr's own frontend embeds on every page.
// It rotates on Flickr deploys, so we only ever use it for this one build-time call.
async function scrapeApiKey() {
  const response = await fetch(PROFILE_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Failed to fetch Flickr profile page: ${response.status}`);
  }
  const html = await response.text();
  const match = html.match(/root\.YUI_config\.flickr\.api\.site_key\s*=\s*"([a-f0-9]{32})"/);
  if (!match || !match[1]) {
    throw new Error('Flickr site_key not found on page');
  }
  return match[1];
}

async function fetchPhotos(apiKey) {
  const url = `https://www.flickr.com/services/rest/?method=flickr.people.getPhotos&api_key=${apiKey}&user_id=${USER_ID}&per_page=100&extras=views,geo,url_c,url_t&format=json&nojsoncallback=1`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Flickr REST API returned ${response.status}`);
  }
  const data = await response.json();
  if (data.stat !== 'ok') {
    throw new Error(`Flickr REST API stat=${data.stat} (${data.message || 'unknown error'})`);
  }
  const photos = data.photos && data.photos.photo;
  if (!Array.isArray(photos) || photos.length === 0) {
    throw new Error('Flickr REST API returned no photos');
  }
  return photos;
}

// On any primary failure, reuse the JSON already deployed on the live site so a
// transient key/API hiccup never produces an empty photography page.
async function fetchLiveFallback() {
  const response = await fetch(LIVE_FALLBACK_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Live fallback returned ${response.status}`);
  }
  const photos = await response.json();
  if (!Array.isArray(photos) || photos.length === 0) {
    throw new Error('Live fallback JSON was empty');
  }
  return photos;
}

async function main() {
  let photos;
  try {
    const apiKey = await scrapeApiKey();
    console.log(`Scraped Flickr site_key: ${apiKey}`);
    photos = await fetchPhotos(apiKey);
    console.log(`Fetched ${photos.length} photos from Flickr REST API.`);
  } catch (err) {
    console.error(`Primary fetch failed: ${err.message}`);
    try {
      photos = await fetchLiveFallback();
      console.log(`Recovered ${photos.length} photos from live fallback.`);
    } catch (fallbackErr) {
      console.error(`Live fallback failed: ${fallbackErr.message}`);
      // Keep an existing local copy if we have one; otherwise emit an empty list.
      if (fs.existsSync(OUTPUT_PATH)) {
        console.warn('Keeping existing local flickr_photos.json.');
        return;
      }
      console.warn('No data available, writing empty flickr_photos.json.');
      photos = [];
    }
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(photos));
  console.log(`Wrote ${photos.length} photos to ${OUTPUT_PATH}`);
}

main();
