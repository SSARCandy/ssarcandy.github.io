'use strict';

const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');
const { siteBase } = require('./util');

// One service, reused across pages. GFM plugin adds tables / strikethrough / task
// lists / fenced code. Turndown 7 ships its own DOM (@mixmark-io/domino), so there's
// no jsdom dependency.
function makeService() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  });
  td.use(gfm);
  // ref_style injects a <style> block and MathJax leaves <script> tags — drop both
  // so raw CSS/JS never leaks into the Markdown.
  td.remove(['style', 'script']);
  // MathJax renders to <mjx-container><svg>… at build time (the original LaTeX is
  // already gone), which Turndown would turn into empty artifacts — drop it cleanly.
  td.remove((node) => node.nodeName && node.nodeName.toLowerCase() === 'mjx-container');

  const hasClass = (node, cls) => new RegExp('(^|\\s)' + cls + '(\\s|$)').test(node.getAttribute('class') || '');

  // Hexo adds an empty `<a class="headerlink">#</a>` inside every heading — content
  // navigation, not prose. Strip it so headings render as plain `# Title`.
  td.addRule('stripHeaderlink', {
    filter: (node) => node.nodeName === 'A' && hasClass(node, 'headerlink'),
    replacement: () => '',
  });

  // hexo-tag-photozoom emits `<img alt="caption"> <span class="zoom-initial-caption">
  // caption</span>` — the caption is duplicated. Keep it on the image alt, drop the span.
  td.addRule('stripZoomCaption', {
    filter: (node) => hasClass(node, 'zoom-initial-caption'),
    replacement: () => '',
  });

  // Hexo's highlighter renders code as `<figure class="highlight LANG"><table>` with a
  // line-number gutter column and a code column of `<span class="line">…</span>` — not a
  // `<pre><code>`, so GFM's fenced-code rule never fires and Turndown would emit a raw
  // HTML table. Convert it into a proper fenced block: read the code column's lines and
  // tag the fence with the language from the figure's class (e.g. `highlight py`).
  td.addRule('hexoHighlight', {
    filter: (node) => node.nodeName === 'FIGURE' && hasClass(node, 'highlight'),
    replacement: (content, node) => {
      const cls = node.getAttribute('class') || '';
      const lang = cls.split(/\s+/).filter((c) => c && c !== 'highlight')[0] || '';
      const codeCell = node.querySelector('td.code') || node.querySelector('.code') || node;
      const lineNodes = codeCell.querySelectorAll('.line');
      let code;
      if (lineNodes.length) {
        code = Array.from(lineNodes).map((ln) => ln.textContent).join('\n');
      } else {
        code = codeCell.textContent;
      }
      code = code.replace(/\n+$/, '');
      return '\n\n```' + lang + '\n' + code + '\n```\n\n';
    },
  });

  return td;
}

const service = makeService();

// Rewrite src/href attribute values to absolute URLs before converting, so a fetched
// .md resolves images and links without the page context. Root-relative (/img/…)
// resolve against the site root; page-relative resolve against the page's own URL.
function absolutizeHtml(html, pageAbsUrl, base) {
  const root = base + '/';
  return html.replace(/\b(src|href)=(["'])(.*?)\2/gi, (all, attr, q, val) => {
    if (/^(https?:|data:|mailto:|tel:|#)/i.test(val)) return all; // already absolute / anchors
    let abs;
    try {
      abs = new URL(val, val.startsWith('/') ? root : pageAbsUrl).href;
    } catch (e) {
      return all;
    }
    return `${attr}=${q}${abs}${q}`;
  });
}

// Convert rendered post/page HTML to clean Markdown. Because the input is already
// Hexo-rendered, every {% tag %} (zoom, post_link, ref_style, raw) is expanded, so
// none can survive into the output.
function htmlToMarkdown(html, pageAbsUrl, config, cfg) {
  if (!html) return '';
  const prepped = cfg.absolute_urls ? absolutizeHtml(html, pageAbsUrl, siteBase(config)) : html;
  return service.turndown(prepped).trim();
}

module.exports = { htmlToMarkdown };
