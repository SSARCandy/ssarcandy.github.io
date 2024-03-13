'use strict';

const pageview = require('../pageview.json');

hexo.extend.helper.register('visitor_count', () => {
  return pageview.visitor_count * 5;
});

hexo.extend.helper.register('post_pv', (slug) => {
  return pageview.pv_map[slug.toLowerCase()] * 5 || 0;
});

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


