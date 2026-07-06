'use strict';

const emitted = require('./emitted');
const { normalizePath } = require('./util');
const { renderPage } = require('./render-page');
const { synthesizeProjects, synthesizePhotography } = require('./synthesize');
const { buildLlmsTxt, buildLlmsFull } = require('./llms-txt');

// Non-empty rendered content? (skip chrome/redirect pages that have no prose)
function hasContent(item) {
  return !!(item && item.content && item.content.replace(/<[^>]+>/g, '').trim());
}

module.exports = function register(hexo, cfg) {
  hexo.extend.generator.register('llms', function (locals) {
    const config = hexo.config;
    const routes = [];
    const index = []; // entries for llms.txt: { title, path, section, excerpt }
    const bodies = []; // for llms-full.txt: { title, path, md }

    const add = (routePath, keyPath, md, meta) => {
      routes.push({ path: routePath, data: md });
      emitted.add(normalizePath(keyPath));
      if (meta) index.push(meta);
      if (cfg.llms_full_txt) bodies.push({ title: (meta && meta.title) || '', path: keyPath, md });
    };

    // --- posts ---
    if (cfg.types.includes('post')) {
      locals.posts.sort('-date').each((post) => {
        const md = renderPage(post, config, cfg);
        add(normalizePath(post.path) + 'index.md', post.path, md, {
          title: post.title,
          path: post.path,
          section: 'Posts',
          excerpt: post.excerpt || post.description || post.content,
        });
      });
    }

    // --- pages (about, etc.); the data-driven layouts are synthesized below ---
    if (cfg.types.includes('page')) {
      locals.pages.each((page) => {
        if (page.layout === 'projects' || page.layout === 'photography') return;
        if (!hasContent(page)) return;
        const md = renderPage(page, config, cfg);
        add(normalizePath(page.path) + 'index.md', page.path, md, {
          title: page.title,
          path: page.path,
          section: 'Pages',
          excerpt: page.description || page.excerpt || page.content,
        });
      });
    }

    // --- synthesized data-driven pages ---
    if (cfg.types.includes('projects')) {
      const md = synthesizeProjects(hexo, config, cfg);
      add('projects/index.md', 'projects/', md, {
        title: 'Projects', path: 'projects/', section: 'Pages', excerpt: 'Open source projects.',
      });
    }
    if (cfg.types.includes('photography')) {
      const md = synthesizePhotography(hexo, config, cfg);
      add('photography/index.md', 'photography/', md, {
        title: 'Photography', path: 'photography/', section: 'Pages', excerpt: 'Photo gallery.',
      });
    }

    // --- indexes ---
    if (cfg.llms_txt) routes.push({ path: 'llms.txt', data: buildLlmsTxt(index, config, cfg) });
    if (cfg.llms_full_txt) routes.push({ path: 'llms-full.txt', data: buildLlmsFull(bodies, config) });

    return routes;
  });
};
