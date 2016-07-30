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
