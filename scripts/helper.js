'use strict';

const util = require('util');
const { date_formatter } = require('./util');

const fetchGoogleAnalytic = util.promisify(require('ga-analytics'));
const gaOptions = {
  clientId: process.env.GOOGLEAPI_CLIENTID,
  serviceEmail: process.env.GOOGLEAPI_EMAIL,
  key: process.env.GOOGLEAPI_KEY,
  ids: process.env.GOOGLEAPI_ANALYTICS_TABLE,
  startDate: '2016-07-20',
  endDate: date_formatter(new Date()),
  dimensions: 'ga:pagePath',
  metrics: 'ga:pageviews',
};

let pv_map = {};
let visitor_count = '';
(async () => {
  try {
    const res = await fetchGoogleAnalytic(gaOptions);

    for (let [path, pv] of res.rows) {
      const splited = path.split('/');
      if (Number(splited[1]) && Number(splited[2]) && Number(splited[3])) {
        const slug = splited[4].toLowerCase();
        pv_map[slug] = (pv_map[slug] || 0) + Number(pv);
      }
    }
    visitor_count = res.totalsForAllResults['ga:pageviews'];

    const report = Object.entries(pv_map).sort((a, b) => b[1] - a[1]);
    console.table(report);
  } catch (err) {
    console.error(err);
  }
})();

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