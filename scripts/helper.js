'use strict';

const gaAnalytics = require('ga-analytics');
const { date_formatter } = require('./util');
const gaOptions = {
  metrics: 'ga:users',
  clientId: process.env.GOOGLEAPI_CLIENTID,
  serviceEmail: process.env.GOOGLEAPI_EMAIL,
  key: process.env.GOOGLEAPI_KEY,
  ids: process.env.GOOGLEAPI_ANALYTICS_TABLE,
  startDate: '2016-07-20',
  endDate: date_formatter(new Date()),
  dimensions: 'ga:pagePath',
  metrics: 'ga:pageviews'
};

let pv_map = {};
let visitor_count = '';
gaAnalytics(gaOptions, (err, res) => {
  if (err) {
    console.log(err);
    return;
  }

  for (let [path, pv] of res.rows) {
    const splited = path.split('/');
    if (Number(splited[1]) && Number(splited[2]) && Number(splited[3])) {
      const slug = splited[4].toLowerCase();
      pv_map[slug] = (pv_map[slug] || 0) + Number(pv);
    }
  }

  console.table(pv_map);
  visitor_count = res.totalsForAllResults['ga:pageviews'];
});

hexo.extend.helper.register('visitor_count', () => {
  return visitor_count;
});

hexo.extend.helper.register('post_pv', (slug) => {
  return pv_map[slug.toLowerCase()] || 0;
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