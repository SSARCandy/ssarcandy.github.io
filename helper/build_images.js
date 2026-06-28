'use strict';

// build:images — precompute metadata for every local image under source/img and
// write it to source/image_meta.json (a gitignored build artifact, like
// flickr_photos.json/pageview.json). For each image we store its intrinsic
// dimensions, a tiny inlined LQIP (low-quality image placeholder), and the URL of
// a sibling WebP derivative. The JSON is keyed by the site-absolute URL path
// ("/img/2017-10-31/1.png") and consumed at render time by scripts/image-meta.js to:
//   - reserve each image's box (no layout shift as images decode),
//   - show a blurred placeholder until the real image paints over it (blur-up),
//   - drive the /projects masonry (aspect-ratio) and its card placeholders, and
//   - rewrite every local <img src> to its smaller WebP (see `webp` below).
//
// WebP: for every raster source we also write a sibling `<name>.webp` (gitignored,
// like the JSON). Originals are kept on disk — they remain the fallback and are
// what social/OG scrapers fetch (those reference images via <meta>, not <img>, so
// the render-time rewrite leaves them as the original format). The `.webp` source
// files themselves are skipped for (re-)encoding so the daily cron rebuild never
// re-compresses a WebP into a WebP (which would degrade quality each run); each
// derivative is always encoded fresh from its lossless-enough original.
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

// Encode a sibling WebP next to the source image and return its URL path, or ''
// on failure (the render-time rewrite then leaves the original src untouched).
// The original extension is kept in the name ("foo.png" -> "foo.png.webp") so two
// images that differ only by format ("4.png" + "4.jpg" in one post) don't collapse
// onto the same derivative. Animated GIFs are preserved as animated WebP.
async function buildWebp(buffer, srcFile, ext) {
  if (!sharp) return '';
  const outFile = srcFile + '.webp';
  try {
    const img = ext === '.gif' ? sharp(buffer, { animated: true }) : sharp(buffer);
    await img.webp({ quality: 80 }).toFile(outFile);
    return '/' + path.relative(SOURCE_DIR, outFile).split(path.sep).join('/');
  } catch (e) {
    console.warn(`webp generation failed for ${srcFile}: ${e.message}`);
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
    const ext = path.extname(file).toLowerCase();
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

    // A `.webp` source is already its own derivative; don't re-encode it (avoids
    // progressive quality loss on the daily cron rebuild). Everything else gets a
    // freshly-encoded sibling from its original.
    const webp = ext === '.webp' ? key : await buildWebp(buffer, file, ext);

    meta[key] = { w, h, lqip: await buildLqip(buffer), webp };
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(meta));
  const webpCount = Object.values(meta).filter((m) => m.webp).length;
  console.log(`image_meta.json: ${Object.keys(meta).length} images (${webpCount} with webp)`);
}

main();
