'use strict';
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const property = 'properties/323014967';
const startDate = '2016-07-20';

async function runReport() {
  const analyticsDataClient = new BetaAnalyticsDataClient();
  const [response] = await analyticsDataClient.runReport({
    property,
    dateRanges: [{
      startDate,
      endDate: 'today',
    }],
    dimensions: [{
      name: 'pagePath',
    }],
    metrics: [{
      name: 'screenPageViews',
    }],
  });

  const title2view = {
    visitor_count: 0,
    pv_map: {},
  };
  response.rows.forEach(row => {
    const path = row.dimensionValues[0].value;
    const views = +row.metricValues[0].value;
    title2view.visitor_count += views;
    if (!path.startsWith('/20')) return;
    const title = path.split('/')[4].toLocaleLowerCase();
    title2view.pv_map[title] = (title2view.pv_map[title] || 0) + views;
  });
  return title2view;
}

(async () => {
  const pageviews_v4 = await runReport();
  const pageviews_sum = require('../source/GAv3-pageview.json');
  pageviews_sum.visitor_count += pageviews_v4.visitor_count;
  for (const [k, v] of Object.entries(pageviews_v4.pv_map)) {
    pageviews_sum.pv_map[k] = pageviews_sum.pv_map[k]
      ? pageviews_sum.pv_map[k] + v
      : v;
  }
  console.log(JSON.stringify(pageviews_sum))
})();
