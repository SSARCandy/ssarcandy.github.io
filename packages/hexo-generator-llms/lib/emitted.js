'use strict';

// A module singleton shared between the generator (which records every page path
// it produced a .md for) and the after_render:html injector (which only adds the
// alternate <link> to pages that actually have a .md). Node caches this module, so
// both `require('./emitted')` calls get the same Set instance.
//
// Ordering is safe: Hexo runs all generators (populating this Set) before it renders
// any route body, so the Set is complete before the first after_render:html fires.
module.exports = new Set();
