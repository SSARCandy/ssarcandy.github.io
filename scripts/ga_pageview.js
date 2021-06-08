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

(async () => {
  const result = {
      visitor_count: 0,
      pv_map: {},
  };
  try {
    const res = await fetchGoogleAnalytic(gaOptions);

    for (let [path, pv] of res.rows) {
      const splited = path.split('/');
      if (Number(splited[1]) && Number(splited[2]) && Number(splited[3])) {
        const slug = splited[4].toLowerCase();
        result.pv_map[slug] = (result.pv_map[slug] || 0) + Number(pv);
      }
    }
    result.visitor_count = res.totalsForAllResults['ga:pageviews'];
    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(JSON.stringify(result));
  }
})();
