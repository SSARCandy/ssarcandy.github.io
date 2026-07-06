'use strict';

const emitted = require('./emitted');
const { normalizePath } = require('./util');
const { renderPage } = require('./render-page');
const { buildLlmsTxt, buildLlmsFull } = require('./llms-txt');

// Non-empty rendered content? (skip chrome/redirect/data-driven pages with no prose)
function hasContent(item) {
  return !!(item && item.content && item.content.replace(/<[^>]+>/g, '').trim());
}

module.exports = function register(hexo, cfg) {
  const excluded = cfg.exclude.map(normalizePath);
  const isExcluded = (item) => excluded.indexOf(normalizePath(item.path)) !== -1;

  hexo.extend.generator.register('llms', function (locals) {
    const config = hexo.config;
    const routes = [];
    const index = []; // entries for llms.txt: { title, path, section, excerpt }
    const bodies = []; // for llms-full.txt: { title, path, md }

    const emit = (item, section) => {
      if (isExcluded(item) || !hasContent(item)) return;
      const md = renderPage(item, config, cfg);
      routes.push({ path: normalizePath(item.path) + 'index.md', data: md });
      emitted.add(normalizePath(item.path));
      index.push({
        title: item.title,
        path: item.path,
        section: section,
        excerpt: item.excerpt || item.description || item.content,
      });
      if (cfg.llms_full_txt) bodies.push({ title: item.title || '', path: item.path, md });
    };

    if (cfg.types.includes('post')) locals.posts.sort('-date').each((post) => emit(post, 'Posts'));
    if (cfg.types.includes('page')) locals.pages.each((page) => emit(page, 'Pages'));

    if (cfg.llms_txt) routes.push({ path: 'llms.txt', data: buildLlmsTxt(index, config, cfg) });
    if (cfg.llms_full_txt) routes.push({ path: 'llms-full.txt', data: buildLlmsFull(bodies, config) });

    return routes;
  });
};
