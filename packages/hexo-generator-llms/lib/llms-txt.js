'use strict';

const { pageUrl } = require('./util');

// Strip HTML tags + collapse whitespace to a short plain-text blurb.
function blurb(html, max) {
  if (!html) return '';
  const text = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// Build /llms.txt — the AI-facing index. `entries` is an ordered list of
// { title, path, section, excerpt } collected by the generator as it emits routes.
// Format follows the llms.txt convention: H1 site name, a summary blockquote, then
// H2 sections of links pointing at each page's .md twin.
function buildLlmsTxt(entries, config, cfg) {
  const out = [];
  out.push('# ' + (config.title || 'Website'));
  if (config.description || config.subtitle) {
    out.push('');
    out.push('> ' + (config.description || config.subtitle));
  }
  out.push('');
  out.push('This file lists Markdown versions of every page for AI/LLM consumption.');

  const sections = new Map();
  entries.forEach((e) => {
    if (!sections.has(e.section)) sections.set(e.section, []);
    sections.get(e.section).push(e);
  });

  for (const [section, items] of sections) {
    out.push('');
    out.push('## ' + section);
    out.push('');
    items.forEach((e) => {
      const md = pageUrl(config, e.path) + 'index.md';
      let line = '- [' + (e.title || e.path) + '](' + md + ')';
      const ex = blurb(e.excerpt, 120);
      if (ex) line += ': ' + ex;
      out.push(line);
    });
  }

  return out.join('\n').trim() + '\n';
}

// Build /llms-full.txt — every page's Markdown body concatenated, separated by rules.
// `bodies` is an array of { title, path, md } from the generator.
function buildLlmsFull(bodies, config) {
  const out = ['# ' + (config.title || 'Website') + ' — full text', ''];
  bodies.forEach((b) => {
    out.push('');
    out.push('---');
    out.push('');
    out.push(b.md.trim());
  });
  return out.join('\n').trim() + '\n';
}

module.exports = { buildLlmsTxt, buildLlmsFull };
