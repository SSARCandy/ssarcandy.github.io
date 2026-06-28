'use strict';

const fs = require('fs');
const path = require('path');

let pageview = { visitor_count: 0, pv_map: {} };
try {
  pageview = require('../pageview.json');
} catch (e) {
  console.warn('pageview.json not found, using default values.');
}

hexo.extend.helper.register('visitor_count', () => {
  return pageview.visitor_count;
});

hexo.extend.helper.register('post_pv', (slug) => {
  return pageview.pv_map[slug.toLowerCase()] || 0;
});

// Unique, sorted set of every tag used across projects (projects.yml), for the
// /projects filter buttons. Derived at render time so there's no data file to
// keep in sync.
hexo.extend.helper.register('project_tags', () => {
  const projects = (hexo.locals.get('data') || {}).projects || [];
  return [...new Set(projects.flatMap((project) => project.tags || []))].sort();
});

// Flickr photo metadata captured at build time (helper/fetch_flickr_photos.js),
// read here so /photography renders as static HTML instead of being built
// client-side after a runtime fetch. Read fresh each call (the file is
// regenerated per build); on a missing/invalid file return an empty list so the
// grid is simply empty rather than the build failing.
hexo.extend.helper.register('flickr_photos', () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../source/flickr_photos.json'), 'utf8'));
  } catch (e) {
    console.warn('flickr_photos.json not found or invalid; photography grid will be empty.');
    return [];
  }
});

// project_image_aspect / project_lqip live in scripts/image-meta.js now, reading
// the shared source/image_meta.json (built by `npm run build:images`).

/**
 * Generate images path in specified "page", and append additional image paths.
 */
hexo.extend.helper.register('page_images', (page, additional_imgs) => {
  const { content } = page;
  let images = [];

  if (!images.length && content) {
    images = images.slice();

    if (content.includes('<img')) {
      let img;
      const imgPattern = /<img [^>]*src=['"]([^'"]+)([^>]*>)/gi;
      while ((img = imgPattern.exec(content)) !== null) {
        images.push(img[1]);
      }
    }
  }

  return images.concat(additional_imgs);
});

hexo.extend.tag.register('ref_style', () => {
  return `
  <style>
  h1+ol {
    list-style-type: none;
    counter-reset: list-counter;
    padding-left: 0;
  }
  h1+ol li {
    position: relative;
    padding-left: 3em;
  }
  h1+ol li::before {
    counter-increment: list-counter;
    content: "[" counter(list-counter) "] ";
    position: absolute;
    left: 0;
    width: 25px;
    text-align: right;
  }
  </style>
  `;
});


