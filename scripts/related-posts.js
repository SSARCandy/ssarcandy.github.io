'use strict';
const lunr = require('lunr');

function build_index(data) {
  const index = lunr(function() {
    this.field('tags', { boost: 50 });
    this.ref('id');
    this.pipeline.remove(lunr.trimmer);

    data.forEach((item, i) => {
      this.add({ id: i, ...item});
    });
  });

  return index;
}

hexo.extend.helper.register('lunr_index', data => {
  return JSON.stringify(build_index(data).toJSON());
});

hexo.extend.helper.register('lunr_related_posts', (data, kw, result_len = 5) => {
  const filtered_data = data.map(({ title, path, _id, tags }) => {
    const tags_list = tags.data.map(t => t.name);
    return { title, path, _id, tags: tags_list };
  });
  const index = build_index(filtered_data);
  const related_posts = index.search(kw).map(r => filtered_data[r.ref]);

  // slice from 1 because first one always is itself.
  return JSON.stringify(related_posts.slice(1, result_len + 1));
})