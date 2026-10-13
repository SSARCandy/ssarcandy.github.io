const fs = require('fs');
const path = require('path');
const { buildLqip } = require('./lqip');

const PROFILE_URL = 'https://www.flickr.com/people/ssarcandy/';
const USER_ID = '200681089@N06';
const LIVE_FALLBACK_URL = 'https://ssarcandy.tw/flickr_photos.json';
const OUTPUT_PATH = path.join(__dirname, '../source/flickr_photos.json');
const LQIP_PATH = path.join(__dirname, '../flickr_lqip.json');

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

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

// Run fn over items with at most `limit` in flight.
async function mapLimit(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// Inlined blur-up placeholders for the /photography cards, so each card needs one
// image request (the real photo) instead of two (a `_t` thumbnail + the photo).
// Written to its own file rather than into flickr_photos.json, which the map view
// fetches at runtime and doesn't need ~45 KB of base64. Entries from a previous run
// are reused by id; any failure just leaves that card on its flat background.
async function writeLqip(photos) {
  const previous = readJson(LQIP_PATH, {});
  const lqip = {};
  let fetched = 0;
  await mapLimit(photos, 8, async (photo) => {
    if (previous[photo.id]) {
      lqip[photo.id] = previous[photo.id];
      return;
    }
    const url = photo.url_t || `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`;
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await buildLqip(Buffer.from(await response.arrayBuffer()));
      if (data) {
        lqip[photo.id] = data;
        fetched++;
      }
    } catch (err) {
      console.warn(`LQIP for photo ${photo.id} failed: ${err.message}`);
    }
  });
  fs.writeFileSync(LQIP_PATH, JSON.stringify(lqip));
  console.log(`Wrote ${Object.keys(lqip).length}/${photos.length} LQIP placeholders (${fetched} new) to ${LQIP_PATH}`);
}

async function loadPhotos() {
  try {
    const apiKey = await scrapeApiKey();
    console.log(`Scraped Flickr site_key: ${apiKey}`);
    const photos = await fetchPhotos(apiKey);
    console.log(`Fetched ${photos.length} photos from Flickr REST API.`);
    return photos;
  } catch (err) {
    console.error(`Primary fetch failed: ${err.message}`);
  }
  try {
    const photos = await fetchLiveFallback();
    console.log(`Recovered ${photos.length} photos from live fallback.`);
    return photos;
  } catch (fallbackErr) {
    console.error(`Live fallback failed: ${fallbackErr.message}`);
  }
  return null;
}

async function main() {
  let photos = await loadPhotos();
  if (photos) {
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(photos));
    console.log(`Wrote ${photos.length} photos to ${OUTPUT_PATH}`);
  } else if (fs.existsSync(OUTPUT_PATH)) {
    // Keep an existing local copy if we have one; otherwise emit an empty list.
    console.warn('Keeping existing local flickr_photos.json.');
    photos = readJson(OUTPUT_PATH, []);
  } else {
    console.warn('No data available, writing empty flickr_photos.json.');
    photos = [];
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(photos));
  }

  try {
    await writeLqip(photos);
  } catch (err) {
    console.warn(`LQIP generation skipped: ${err.message}`);
  }
}

main();
