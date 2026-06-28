'use strict';

// build:images — precompute metadata for every local image under source/img and
// write it to source/image_meta.json (a gitignored build artifact, like
// flickr_photos.json/pageview.json). For each image we store its intrinsic
// dimensions and a tiny inlined LQIP (low-quality image placeholder). The JSON is
// keyed by the site-absolute URL path ("/img/2017-10-31/1.png") and consumed at
// render time by scripts/image-meta.js to:
//   - reserve each image's box (no layout shift as images decode), and
//   - show a blurred placeholder until the real image paints over it (blur-up),
//   - drive the /projects masonry (aspect-ratio) and its card placeholders.
//
// Runs as its own pipeline step (before build:hexo) so sharp encodes each image
// once per build instead of on every `hexo generate`. Cross-platform: pure
// fs/path, no shell redirects.

const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');

// sharp is optional: if its native binary is unavailable on this platform the
// placeholders are simply empty (images still get their reserved box) rather than
// failing the build.
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp not available; LQIP placeholders will be empty.');
}

const SOURCE_DIR = path.join(__dirname, '../source');
const IMG_DIR = path.join(SOURCE_DIR, 'img');
const OUT_FILE = path.join(SOURCE_DIR, 'image_meta.json');
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function walk(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full));
    } else if (EXTS.has(path.extname(entry.name).toLowerCase())) {
      found.push(full);
    }
  }
  return found;
}

// A ~24px, pre-blurred JPEG of the image as a base64 data URI (~400 bytes).
// Upscaled by the browser when shown, so it stays soft without a CSS filter.
async function buildLqip(buffer) {
  if (!sharp) return '';
  try {
    const buf = await sharp(buffer) // first frame for GIFs
      .resize(24, null, { fit: 'inside' })
      .blur(2)
      .jpeg({ quality: 40 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (e) {
    console.warn(`LQIP generation failed: ${e.message}`);
    return '';
  }
}

async function main() {
  let files = [];
  try {
    files = walk(IMG_DIR);
  } catch (e) {
    console.warn(`no image directory at ${IMG_DIR}; writing empty metadata.`);
  }

  const meta = {};
  for (const file of files) {
    const key = '/' + path.relative(SOURCE_DIR, file).split(path.sep).join('/');
    let buffer;
    try {
      buffer = fs.readFileSync(file);
    } catch (e) {
      console.warn(`cannot read ${file}: ${e.message}`);
      continue;
    }

    let w = 0;
    let h = 0;
    try {
      const dim = imageSize(buffer);
      w = dim.width || 0;
      h = dim.height || 0;
    } catch (e) {
      console.warn(`dimension read failed for ${file}: ${e.message}`);
    }

    meta[key] = { w, h, lqip: await buildLqip(buffer) };
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(meta));
  console.log(`image_meta.json: ${Object.keys(meta).length} images`);
}

main();
