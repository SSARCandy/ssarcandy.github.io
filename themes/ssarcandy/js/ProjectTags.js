/* global Masonry, imagesLoaded */
import lunr from 'lunr';
import { highlightActiveTag } from './Helper';

const VISIBLE_CLASS = 'on';

const $input = document.getElementById('plugin-search-input');
const index = lunr.Index.load(window.SEARCH_INDEX);

// Stable, original-order snapshot of the project cards. Captured ONCE, before the
// masonry below reorders the DOM, so a lunr ref (an index into site.data.projects)
// keeps mapping to cards[ref]. getElementsByClassName is live + document-order, so
// it must be frozen to an array before any node moves.
const cards = [...document.getElementsByClassName('plugin')];

// In-feed ads sit outside the .plugin filter set (the lunr index maps to .plugin by
// position). We show a proportional number — one per AD_EVERY visible cards, capped
// by how many ad units were actually rendered.
const projectList = document.querySelector('.project-list');
const AD_EVERY = parseInt(projectList.dataset.adEvery, 10) || 0;
const ads = [...document.getElementsByClassName('project-ad-item')];

const tagFromHash = () => decodeURIComponent(location.hash.slice(1));

// Off-screen attic holding whatever isn't currently placed (filtered-out cards,
// unused ads) so stale nodes don't linger in the masonry layout.
const attic = document.createElement('div');
attic.style.display = 'none';
projectList.parentNode.appendChild(attic);

// Masonry over the rendered cards. Each card reserves its image height via the
// build-time aspect-ratio (project-item.ejs) and its text is already in the DOM,
// so the grid lays out correctly on the first paint — the same approach the
// photography grid uses. Built below once the libraries are ready.
let masonry = null;

function relayout() {
  if (masonry) masonry.layout();
}

// Re-run the layout once an in-feed ad fills and changes height, so the cards
// around it reflow to its final size instead of leaving a gap.
let adObserver = null;
function observeAd(adNode) {
  if (typeof ResizeObserver === 'undefined') return;
  if (!adObserver) adObserver = new ResizeObserver(() => relayout());
  adObserver.observe(adNode);
}

// Lay out the visible cards in source order — ads spliced in after every
// AD_EVERY-th card — then re-run masonry so it packs them as a tight waterfall.
// Anything filtered out is parked in the attic so it leaves the layout cleanly.
function render() {
  const visible = cards.filter((card) => card.classList.contains(VISIBLE_CLASS));
  const adQuota = AD_EVERY ? Math.min(Math.floor(visible.length / AD_EVERY), ads.length) : 0;

  const stream = [];
  let adsPlaced = 0;
  visible.forEach((card, i) => {
    stream.push(card);
    if (adsPlaced < adQuota && (i + 1) % AD_EVERY === 0) stream.push(ads[adsPlaced++]);
  });

  // Re-append in the new order (the .grid-sizer stays put as the first child),
  // then park whatever wasn't placed.
  stream.forEach((node) => projectList.appendChild(node));
  cards.forEach((card) => { if (!card.classList.contains(VISIBLE_CLASS)) attic.appendChild(card); });
  ads.slice(adsPlaced).forEach((ad) => attic.appendChild(ad));

  if (masonry) {
    masonry.reloadItems();
    masonry.layout();
  }
}

// Show the cards matching `query` (a lunr search term or a tag); an empty query
// shows all. Then re-lay out the grid.
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
window.addEventListener('resize', relayout); // re-pack when the column width flips

// Build the grid, lay out the initial (hash-driven) filter, then watch the ads.
masonry = new Masonry(projectList, {
  itemSelector: '.project-list-item',
  columnWidth: '.project-grid-sizer',
  percentPosition: true,
  gutter: 20,
  transitionDuration: 0,
});
hashchange();
ads.forEach(observeAd);

// Safety nets for heights that settle after the first paint and would otherwise
// leave the masonry overlapping: images decoding (any card lacking a reserved
// aspect-ratio) and the self-hosted Roboto webfont swapping in, which can change
// the description text's height. Both just trigger a relayout.
imagesLoaded(projectList).on('progress', relayout);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
