'use strict';

const lunr = require('lunr');
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

hexo.extend.helper.register('lunr_index', data => {
  const index = lunr(function() {
    this.field('tags', { boost: 50 });
    this.ref('id');
    this.pipeline.remove(lunr.trimmer);

    data.forEach((item, i) => {
      this.add({ id: i, ...item});
    });
  });

  return JSON.stringify(index.toJSON());
});


/**
 * zoom tag
 *
 * Syntax:
 *   {% zoom /path/to/image [/path/to/thumbnail] [title] %}
 */
const rUrl = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[.\!\/\\w]*))?)/;
hexo.extend.tag.register('zoom', (args) => {
  const original = args.shift();
  
  let thumbnail = '';
  if (args.length && rUrl.test(args[0])) {
    thumbnail = args.shift();
  }

  const title = args.join(' ');

  return `<div>
            <img src="${(thumbnail || original)}" alt="${title}" data-action="zoom">
          </div>`;
});
