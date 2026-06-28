'use strict';

// Render-time consumer of source/image_meta.json (written by `npm run build:images`).
// One source of truth for image dimensions + LQIP placeholders, used by both the
// /projects masonry helpers and a filter that adds blur-up + box reservation to
// post content images. If the JSON is missing (e.g. a bare `hexo generate` with no
// prior build:images) everything degrades to no reservation / no placeholder
// rather than failing the build.

const fs = require('fs');
const path = require('path');

const META_FILE = path.join(__dirname, '../source/image_meta.json');

// Mirrors `.article … img { max-height: 600px }` (article.less). We can't let the
// browser apply that cap once we pin an explicit width (it would squash tall
// images), so we reproduce it here: the displayed width that keeps a tall image's
// height at 600 while preserving its ratio. Keep in sync with the LESS.
const MAX_IMG_HEIGHT = 600;

let meta = null;
function load() {
  if (meta) return meta;
  try {
    meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  } catch (e) {
    console.warn('image_meta.json not found; image dimensions/LQIP disabled.');
    meta = {};
  }
  return meta;
}

function lookup(urlPath) {
  return load()[urlPath] || null;
}

// ---- /projects helpers (unified onto image_meta.json) -------------------------
// Project card images live at source/img/projects/<name><ext> → /img/projects/...
function projectMeta(name, ext) {
  return lookup(`/img/projects/${name}${ext || '.jpg'}`);
}

// CSS aspect-ratio ("640 / 480") so the masonry card reserves the image's height
// before it loads and lays out on the first paint with no reflow.
hexo.extend.helper.register('project_image_aspect', (name, ext) => {
  const m = projectMeta(name, ext);
  return m && m.w && m.h ? `${m.w} / ${m.h}` : '';
});

// Inlined blurred placeholder shown behind the card image until it decodes.
hexo.extend.helper.register('project_lqip', (name, ext) => {
  const m = projectMeta(name, ext);
  return m ? m.lqip : '';
});

// ---- post content images: blur-up + box reservation + lazy load ---------------
// Rewrite every <img> whose src is a dated post-image path (/img/YYYY-MM-DD/...).
// We add, computed from the build-time metadata:
//   - width + aspect-ratio + height:auto, so the browser reserves the exact box
//     (capped at 600px tall, ratio preserved — matching the existing CSS) and the
//     page doesn't jump as images decode;
//   - loading=lazy / decoding=async;
//   - the inlined LQIP as the image's own background, so a blurred preview shows
//     until the photo paints over it.
// No wrapper element: the click-to-zoom (hexo-tag-photozoom + zoom.js) transforms
// the <img> in place and must not be boxed/clipped.
const CONTENT_IMG = /^\/img\/\d{4}-\d{2}-\d{2}\//;

function reserveStyle(m) {
  const parts = [];
  if (m.w && m.h) {
    // Display width that reproduces the max-height:600px cap with the ratio kept.
    const capW = m.h > MAX_IMG_HEIGHT ? Math.round((MAX_IMG_HEIGHT * m.w) / m.h) : m.w;
    parts.push(`width:${capW}px`, 'max-width:100%', `aspect-ratio:${m.w}/${m.h}`, 'height:auto');
  }
  if (m.lqip) {
    parts.push(`background-image:url('${m.lqip}')`, 'background-size:cover', 'background-position:center');
  }
  return parts.join(';');
}

hexo.extend.filter.register('after_render:html', (str) => {
  if (!str.includes('<img')) return str;

  return str.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc=(["'])(.*?)\1/i);
    if (!srcMatch) return tag;

    const urlPath = srcMatch[2].split(/[?#]/)[0];
    if (!CONTENT_IMG.test(urlPath)) return tag;

    const m = lookup(urlPath);
    if (!m) return tag;

    let out = tag;
    // Leave any image that already carries these alone (idempotent / authored).
    if (!/\sstyle=/i.test(out)) {
      const style = reserveStyle(m);
      if (style) out = out.replace(/^<img\b/i, `<img style="${style}"`);
    }
    if (!/\sloading=/i.test(out)) {
      out = out.replace(/^<img\b/i, '<img loading="lazy" decoding="async"');
    }
    return out;
  });
});
