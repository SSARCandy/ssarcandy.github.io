'use strict';

const fs = require('fs');
const path = require('path');
const { pageUrl, siteBase } = require('./util');

function header(title, sourcePath, config, cfg) {
  const lines = [];
  if (cfg.front_matter) {
    lines.push('---');
    lines.push('title: "' + String(title).replace(/"/g, '\\"') + '"');
    lines.push('source: ' + pageUrl(config, sourcePath));
    lines.push('---');
    lines.push('');
  }
  lines.push('# ' + title);
  return lines.join('\n');
}

// /projects/index.md — one section per entry in source/_data/projects.yml.
function synthesizeProjects(hexo, config, cfg) {
  const data = (hexo.locals.get('data') || {}).projects || [];
  const base = siteBase(config);
  const out = [header('Projects', 'projects/', config, cfg), ''];

  data.forEach((p) => {
    if (!p || !p.title) return;
    out.push('## ' + p.title);
    out.push('');
    if (p.description) {
      out.push(p.description);
      out.push('');
    }
    const links = [];
    if (p.github) links.push('- GitHub: ' + p.github);
    if (p.download) links.push('- Download: ' + p.download);
    if (p.preview) links.push('- Preview: ' + p.preview);
    if (p.youtube) links.push('- YouTube: ' + p.youtube);
    if (Array.isArray(p.tags) && p.tags.length) links.push('- Tags: ' + p.tags.join(', '));
    if (links.length) {
      out.push(links.join('\n'));
      out.push('');
    }
  });

  return out.join('\n').trim() + '\n';
}

// /photography/index.md — list of Flickr photos from the build-time json. Degrades
// to a header-only page when the (gitignored) json is absent, so the build never fails.
function synthesizePhotography(hexo, config, cfg) {
  const out = [header('Photography', 'photography/', config, cfg), ''];
  let photos = [];
  try {
    const file = path.join(hexo.base_dir, 'source', 'flickr_photos.json');
    photos = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(photos)) photos = [];
  } catch (e) {
    photos = [];
  }

  if (!photos.length) {
    out.push('_No photos available at build time._');
    return out.join('\n').trim() + '\n';
  }

  photos.forEach((f) => {
    const url = f.url_c || 'https://live.staticflickr.com/' + f.server + '/' + f.id + '_' + f.secret + '_c.jpg';
    const title = f.title || 'Photo';
    out.push('- ' + title + ' — ' + url);
  });

  return out.join('\n').trim() + '\n';
}

module.exports = { synthesizeProjects, synthesizePhotography };
