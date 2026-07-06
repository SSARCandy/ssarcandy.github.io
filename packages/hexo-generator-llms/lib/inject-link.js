'use strict';

const emitted = require('./emitted');
const { normalizePath, siteBase, pageUrl } = require('./util');

// Inject <link rel="alternate" type="text/markdown"> into the <head> of every page
// that has a .md twin — with no theme edits. Hexo's after_render:html filter isn't
// handed the output page's URL (its data arg is the layout template's source), so we
// recover the URL from the page's own canonical link, which the theme emits on every
// page. Only pages recorded in the shared `emitted` Set get the tag, so archive / tag /
// pagination pages (which have no .md) are skipped.
module.exports = function register(hexo, cfg) {
  const CANONICAL_RE = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i;

  hexo.extend.filter.register('after_render:html', function (html) {
    if (!html || html.indexOf('</head>') === -1) return html;
    if (html.indexOf('type="text/markdown"') !== -1) return html; // idempotent

    const m = html.match(CANONICAL_RE);
    if (!m) return html;

    const base = siteBase(hexo.config);
    let pagePath = m[1];
    if (pagePath.indexOf(base) === 0) pagePath = pagePath.slice(base.length);
    pagePath = normalizePath(pagePath);

    if (!emitted.has(pagePath)) return html;

    const mdUrl = pageUrl(hexo.config, pagePath) + 'index.md';
    const tag = '<link rel="alternate" type="text/markdown" href="' + mdUrl + '">';
    return html.replace('</head>', tag + '</head>');
  });

  // Fallback for themes that don't emit a canonical link: authors can drop
  // `<%- md_alternate_link() %>` into their <head>. Returns the same tag (or '' when
  // the current page has no .md twin). `this.page` is the template's page context.
  hexo.extend.helper.register('md_alternate_link', function () {
    const page = this && this.page;
    if (!page) return '';
    const key = normalizePath(page.path);
    if (!emitted.has(key)) return '';
    const mdUrl = pageUrl(hexo.config, key) + 'index.md';
    return '<link rel="alternate" type="text/markdown" href="' + mdUrl + '">';
  });
};
