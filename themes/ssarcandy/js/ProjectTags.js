import lunr from 'lunr';
import { highlightActiveTag } from './Helper';

const VISIBLE_CLASS = 'on';
// Single source of truth for the column-count breakpoint (mirrors projectlist.less).
const MOBILE_QUERY = window.matchMedia('(max-width: 760px)');

const $input = document.getElementById('plugin-search-input');
const index = lunr.Index.load(window.SEARCH_INDEX);

// Stable, original-order snapshot of the project cards. Captured ONCE, before the
// masonry below reshuffles the DOM, so a lunr ref (an index into site.data.projects)
// keeps mapping to cards[ref]. getElementsByClassName is live + document-order, so it
// must be frozen to an array before any node moves.
const cards = [...document.getElementsByClassName('plugin')];

// In-feed ads sit outside the .plugin filter set (the lunr index maps to .plugin by
// position). We show a proportional number — one per AD_EVERY visible cards, capped
// by how many ad units were actually rendered.
const projectList = document.querySelector('.project-list');
const AD_EVERY = parseInt(projectList.dataset.adEvery, 10) || 0;
const ads = [...document.getElementsByClassName('project-ad-item')];

const tagFromHash = () => decodeURIComponent(location.hash.slice(1));

function createDiv(className) {
  const node = document.createElement('div');
  node.className = className;
  return node;
}

// Masonry scaffold: a flex row of columns, plus an off-screen attic that holds
// whatever isn't currently placed (filtered-out cards, unused ads) so stale nodes
// don't linger in the layout.
const masonry = createDiv('project-masonry');
const attic = createDiv('project-attic');
attic.style.display = 'none';
projectList.append(masonry, attic);

let columns = [];

function ensureColumns(count) {
  if (columns.length === count) return;
  masonry.textContent = '';
  columns = Array.from({ length: count }, () => {
    const col = createDiv('project-column');
    masonry.appendChild(col);
    return col;
  });
}

// Lay out the visible cards. They're streamed in source order (ads spliced in after
// every AD_EVERY-th card) and dealt round-robin across the columns, so reading
// row-by-row follows source order (1 2 / 3 4 / …) while each column still packs as a
// tight waterfall.
function render() {
  ensureColumns(MOBILE_QUERY.matches ? 1 : 2);

  const visible = cards.filter((card) => card.classList.contains(VISIBLE_CLASS));
  const adQuota = AD_EVERY ? Math.min(Math.floor(visible.length / AD_EVERY), ads.length) : 0;

  const stream = [];
  let adsPlaced = 0;
  visible.forEach((card, i) => {
    stream.push(card);
    if (adsPlaced < adQuota && (i + 1) % AD_EVERY === 0) {
      stream.push(ads[adsPlaced++]);
    }
  });
  stream.forEach((node, i) => columns[i % columns.length].appendChild(node));

  // Park whatever wasn't placed so it leaves the layout cleanly.
  cards.forEach((card) => {
    if (!card.classList.contains(VISIBLE_CLASS)) attic.appendChild(card);
  });
  ads.slice(adsPlaced).forEach((ad) => attic.appendChild(ad));
}

// Show the cards matching `query` (a lunr search term or a tag); an empty query shows
// all. Then re-lay out the columns.
function applyFilter(query) {
  const term = query.trim();
  const matches = term ? new Set(index.search(term).map((hit) => Number(hit.ref))) : null;
  cards.forEach((card, i) => {
    card.classList.toggle(VISIBLE_CLASS, !matches || matches.has(i));
  });
  render();
}

function hashchange() {
  const tag = tagFromHash();
  $input.value = tag;
  highlightActiveTag(tag); // '' clears every active-tag
  applyFilter(tag);
}

// Toggle behaviour: clicking the already-active tag clears the filter. Its href
// equals the current hash, so the click wouldn't fire `hashchange` on its own —
// intercept it, drop the hash (without leaving a stray `#`) and re-render.
document.addEventListener('click', (e) => {
  const link = e.target.closest('.article-tag-list-link');
  if (!link) return;

  const tag = decodeURIComponent(link.getAttribute('href').slice(1));
  if (tag !== tagFromHash()) return;

  e.preventDefault();
  history.pushState('', document.title, location.pathname + location.search);
  hashchange();
});

$input.addEventListener('input', () => applyFilter($input.value));
window.addEventListener('hashchange', hashchange);
MOBILE_QUERY.addEventListener('change', render); // re-deal when the column count flips

hashchange();
