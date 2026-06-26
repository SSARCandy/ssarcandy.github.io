import lunr from 'lunr';
import { addClass, removeClass,highlightActiveTag } from './Helper';

const elements = document.getElementsByClassName('plugin');
const $input = document.getElementById('plugin-search-input');
const elementLen = elements.length;
const index = lunr.Index.load(window.SEARCH_INDEX);

// In-feed ads are interleaved every N project cards. They aren't `.plugin` items
// (the lunr index maps to .plugin by position), so the filter can't manage them.
// After each filter we re-interleave a proportional number of ads — one per N
// visible projects, capped by how many ad units exist — among the results, instead
// of leaving every ad stranded at its original fixed position.
const projectList = document.querySelector('.project-list');
const AD_EVERY = parseInt(projectList && projectList.dataset.adEvery, 10) || 0;
const adNodes = [...document.getElementsByClassName('project-ad-item')];

function layoutAds() {
  if (!AD_EVERY || !adNodes.length) return;

  const visible = [];
  for (let i = 0; i < elementLen; i++) {
    if (elements[i].classList.contains('on')) visible.push(elements[i]);
  }

  const wanted = Math.min(Math.floor(visible.length / AD_EVERY), adNodes.length);
  for (let k = 0; k < adNodes.length; k++) {
    const ad = adNodes[k];
    if (k < wanted) {
      // Move the ad right after every AD_EVERY-th visible project. Reordering ads
      // (not .plugin items) keeps the lunr index → element mapping intact.
      const anchor = visible[(k + 1) * AD_EVERY - 1];
      anchor.parentNode.insertBefore(ad, anchor.nextSibling);
      ad.style.display = '';
    } else {
      ad.style.display = 'none';
    }
  }
}

function search(value) {
  const result = index.search(value);
  const len = result.length;
  const selected = {};
  let i = 0;

  for (i = 0; i < len; i++) {
    selected[result[i].ref] = true;
  }

  for (i = 0; i < elementLen; i++) {
    if (selected[i]) {
      addClass(elements[i], 'on');
    } else {
      removeClass(elements[i], 'on');
    }
  }

  layoutAds();
}

function displayAll() {
  for (let i = 0; i < elementLen; i++) {
    addClass(elements[i], 'on');
  }

  layoutAds();
}

function hashchange() {
  const hash = location.hash.substring(1);
  $input.value = hash;

  if (hash) {
    highlightActiveTag(hash);
    search(hash);
  } else {
    displayAll();
  }
}

$input.addEventListener('input', function () {
  const value = this.value;

  if (!value) return displayAll();
  search(value);
});

window.addEventListener('hashchange', hashchange);
hashchange();
