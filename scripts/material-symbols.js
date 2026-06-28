/* Material Symbols icons: rewrite readable `<i ...>name</i>` markup to the
   self-hosted subset font's PUA codepoints.

   The subset (helper/build_font.js) is keyed by codepoint, not ligature, so an
   icon name never forms a glyph on its own. Templates and partials keep using
   readable names; this after_render filter converts them to &#xCODE; in the final
   HTML. Client-injected icons do the same via themes/ssarcandy/js/icon.js — both
   read this one committed codepoint map. */
'use strict';

const codepoints = require('../themes/ssarcandy/material-symbols-codepoints.json');
const RE = /(<i\b[^>]*\bmaterial-symbols-outlined\b[^>]*>)([a-z0-9_]+)(<\/i>)/g;
const warned = new Set();

hexo.extend.filter.register('after_render:html', function (html) {
  return html.replace(RE, function (match, open, name, close) {
    const cp = codepoints[name];
    if (!cp) {
      if (!warned.has(name)) {
        warned.add(name);
        hexo.log.warn(`[material-symbols] no codepoint mapped for icon "${name}" — add it to material-symbols-codepoints.json`);
      }
      return match;
    }
    return `${open}&#x${cp};${close}`;
  });
});
