'use strict';

const pageview = require('../pageview.json');

hexo.extend.helper.register('visitor_count', () => {
  return pageview.visitor_count;
});

hexo.extend.helper.register('post_pv', (slug) => {
  return pageview.pv_map[slug.toLowerCase()] || 0;
});

hexo.extend.helper.register('format_number', (x) => { 
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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