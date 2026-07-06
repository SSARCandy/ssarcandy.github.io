'use strict';

// Zero-config defaults. Anything under the site's `llms:` block in _config.yml
// is shallow-merged over these, so the plugin works with no configuration at all.
const DEFAULTS = {
  enable: true,
  // Which sources to emit a .md for: 'post' (blog posts) and/or 'page' (standalone pages).
  types: ['post', 'page'],
  // Paths to skip, matched against each item's normalized path (e.g. 'projects' skips
  // the page at /projects/). Useful for data-driven pages that have no real Markdown body.
  exclude: [],
  llms_txt: true, // emit /llms.txt (an index of every .md, for AI crawlers)
  llms_full_txt: false, // emit /llms-full.txt (every body concatenated)
  alternate_link: true, // inject <link rel="alternate" type="text/markdown"> into <head>
  front_matter: true, // prepend a YAML header (title/source/date/tags) to each .md
  absolute_urls: true, // rewrite links/images to config.url-absolute so the .md is portable
};

// Freeze so downstream code can't mutate shared config mid-build.
function buildConfig(raw) {
  const merged = Object.assign({}, DEFAULTS, raw || {});
  // List options: take the user's verbatim if provided, else a copy of the default.
  merged.types = raw && Array.isArray(raw.types) ? raw.types.slice() : DEFAULTS.types.slice();
  merged.exclude = raw && Array.isArray(raw.exclude) ? raw.exclude.slice() : DEFAULTS.exclude.slice();
  return Object.freeze(merged);
}

module.exports = buildConfig;
module.exports.DEFAULTS = DEFAULTS;
