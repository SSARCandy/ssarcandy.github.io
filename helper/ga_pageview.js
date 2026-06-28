'use strict';
const fs = require('fs');
const path = require('path');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

// Service-account key at the repo root (gitignored). Pass it to the client
// explicitly so this runs cross-platform — no bash-only `GOOGLE_APPLICATION_
// CREDENTIALS=... node` env prefix (which fails in Windows cmd). Falls back to
// Application Default Credentials (e.g. the env var on CI) if the file is absent.
const keyFile = path.resolve(__dirname, '../hexo-pv-c7938b2e210b.json');

const property = 'properties/323014967';
const startDate = '2016-07-20';

async function runReport() {
  const analyticsDataClient = new BetaAnalyticsDataClient(
    fs.existsSync(keyFile) ? { keyFilename: keyFile } : {}
  );
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
  const outFile = path.resolve(__dirname, '../pageview.json');
  fs.writeFileSync(outFile, JSON.stringify(pageviews_sum));
})();
