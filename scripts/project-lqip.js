'use strict';

const fs = require('fs');
const path = require('path');

// sharp is optional: if its native binary is unavailable on this platform, the
// blur-up placeholders are simply skipped (cards still show their reserved
// aspect-ratio box) rather than failing the build.
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp not available; project LQIP placeholders disabled.');
}

const PROJECT_IMG_DIR = path.join(__dirname, '../source/img/projects');

// file -> { mtimeMs, dataUri }. Cached by mtime so repeated generates (e.g. the
// dev server's watch) don't re-encode unchanged images.
const lqipCache = new Map();

// Encode a ~24px, pre-blurred JPEG of the image as a base64 data URI. Upscaled
// via background-size:cover in the card, the browser's own smoothing keeps it
// soft, so no CSS filter (and thus no overflow-clipping that would crop the
// click-to-zoom) is needed. ~400 bytes per image.
async function buildLqip(file) {
  if (!sharp) return '';
  let stat;
  try {
    stat = fs.statSync(path.join(PROJECT_IMG_DIR, file));
  } catch (e) {
    return ''; // image referenced in projects.yml but missing on disk
  }
  const cached = lqipCache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.dataUri;

  let dataUri = '';
  try {
    const buf = await sharp(path.join(PROJECT_IMG_DIR, file)) // first frame for GIFs
      .resize(24, null, { fit: 'inside' })
      .blur(2)
      .jpeg({ quality: 40 })
      .toBuffer();
    dataUri = `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (e) {
    console.warn(`LQIP generation failed for ${file}: ${e.message}`);
  }
  lqipCache.set(file, { mtimeMs: stat.mtimeMs, dataUri });
  return dataUri;
}

// Precompute every project image's LQIP before rendering, so the synchronous EJS
// helper below can read it. Runs inside `hexo generate` (no extra build step).
hexo.extend.filter.register('before_generate', async () => {
  if (!sharp) return;
  const projects = (hexo.locals.get('data') || {}).projects || [];
  await Promise.all(projects.map((p) => buildLqip(p.name + (p.img_ext || '.jpg'))));
});

// Inlined blurred placeholder (base64 data URI) for a project image, shown behind
// the real image until it loads (blur-up). '' when sharp is unavailable or the
// image can't be read, in which case the card just shows its reserved box.
hexo.extend.helper.register('project_lqip', (name, ext) => {
  const entry = lqipCache.get(name + (ext || '.jpg'));
  return entry ? entry.dataUri : '';
});
