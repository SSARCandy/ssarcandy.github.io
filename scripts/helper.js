'use strict';

var _ = require('lodash');
var lunr = require('lunr');
var gaAnalytics = require("ga-analytics");


hexo.extend.helper.register('lunr_index', function(data){
  var index = lunr(function(){
    this.field('tags', {boost: 50});
    this.ref('id');
  });

 data.forEach(function(item, i){
    index.add(_.assign({id: i}, item));
  });

  return JSON.stringify(index.toJSON());
});

var rUrl = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[.\!\/\\w]*))?)/;

/**
* zoom tag
*
* Syntax:
*   {% zoom /path/to/image [/path/to/thumbnail] [title] %}
*/

hexo.extend.tag.register('zoom', function(args){
  var original = args.shift(),
    thumbnail = '';

  if (args.length && rUrl.test(args[0])){
    thumbnail = args.shift();
  }

  var title = args.join(' ');

  return '<div>' +
    '<img src="' + (thumbnail || original) + '" alt="' + title + '" data-action="zoom">'+
    '</div>';
});


var visitor_count = '';

var date_formatter = function (d) {
  var mm = d.getMonth() + 1; // getMonth() is zero-based
  var dd = d.getDate();

  return [d.getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd].join('-');
};

gaAnalytics({
  metrics: "ga:users",
  clientId: process.env.GOOGLEAPI_CLIENTID,
  serviceEmail: process.env.GOOGLEAPI_EMAIL,
  key: process.env.GOOGLEAPI_KEY,
  ids: process.env.GOOGLEAPI_ANALYTICS_TABLE,
  startDate: "2016-07-20",
  endDate: date_formatter(new Date()),
  dimensions: "ga:pagePath",
  metrics: "ga:pageviews"
}, function (err, res) {
  if (err) return;
  visitor_count = res.totalsForAllResults['ga:pageviews'];
});

hexo.extend.helper.register('visitor_count', function () {
  return visitor_count;
});

hexo.extend.helper.register('format_number', function (x) { 
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
});
