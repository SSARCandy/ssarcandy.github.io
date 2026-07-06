'use strict';

const { htmlToMarkdown } = require('./to-markdown');
const { pageUrl, yamlString, names } = require('./util');

// Build a YAML front-matter header for a post/page. `source` points at the human
// (HTML) page so an AI that reads the .md can still cite the canonical URL.
function frontMatter(item, config) {
  const lines = ['---'];
  lines.push('title: ' + yamlString(item.title || ''));
  lines.push('source: ' + pageUrl(config, item.path));
  if (item.date) lines.push('date: ' + toDate(item.date));
  if (item.updated) lines.push('updated: ' + toDate(item.updated));
  const tags = names(item.tags);
  if (tags.length) lines.push('tags: [' + tags.map(escapeInline).join(', ') + ']');
  const cats = names(item.categories);
  if (cats.length) lines.push('categories: [' + cats.map(escapeInline).join(', ') + ']');
  lines.push('---');
  return lines.join('\n');
}

// Moment (Hexo dates) or Date -> YYYY-MM-DD.
function toDate(d) {
  try {
    if (d && typeof d.format === 'function') return d.format('YYYY-MM-DD');
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().slice(0, 10);
  } catch (e) {
    return String(d);
  }
}

// Wrap a list item in quotes only if it contains a comma/bracket.
function escapeInline(s) {
  return /[,[\]]/.test(s) ? yamlString(s) : s;
}

// The body already starts with an H1? (avoid a duplicate title heading)
function startsWithH1(md) {
  return /^#\s/.test(md.trimStart());
}

// Full .md document for a post/page: front-matter + H1 title + converted body.
function renderPage(item, config, cfg) {
  const md = htmlToMarkdown(item.content || '', pageUrl(config, item.path), config, cfg);
  const parts = [];
  if (cfg.front_matter) parts.push(frontMatter(item, config));
  const title = item.title || '';
  if (title && !startsWithH1(md)) parts.push('# ' + title);
  parts.push(md);
  return parts.filter(Boolean).join('\n\n') + '\n';
}

module.exports = { renderPage, frontMatter, toDate };
