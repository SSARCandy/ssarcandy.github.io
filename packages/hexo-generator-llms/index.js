/* global hexo */
'use strict';

// hexo-generator-llms — emit a Markdown (.md) twin of every page plus an llms.txt
// index for AI crawlers, and advertise each twin with a <link rel="alternate">.
// Auto-loaded by Hexo because the package name starts with `hexo-`.

const buildConfig = require('./lib/config');
const registerGenerator = require('./lib/generator');
const registerInject = require('./lib/inject-link');

const cfg = buildConfig(hexo.config.llms);

if (cfg.enable) {
  registerGenerator(hexo, cfg);
  if (cfg.alternate_link) registerInject(hexo, cfg);
}
