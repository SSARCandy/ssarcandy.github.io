'use strict';

var _ = require('lodash');
var lunr = require('lunr');


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
* Fancybox tag
*
* Syntax:
*   {% fancybox /path/to/image [/path/to/thumbnail] [title] %}
*/

hexo.extend.tag.register('zoom', function(args){
  var original = args.shift(),
    thumbnail = '';

  if (args.length && rUrl.test(args[0])){
    thumbnail = args.shift();
  }

  var title = args.join(' ');

  return '<p>' +
    '<img src="' + (thumbnail || original) + '" alt="' + title + '" data-action="zoom">'+
    (title ? '<span class="caption">' + title + '</span>' : '') +
    '</p>';
});