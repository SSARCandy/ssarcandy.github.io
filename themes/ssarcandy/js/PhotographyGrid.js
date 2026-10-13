import { lazyInitAds } from './lazyAds';

// Enhances the server-rendered photo cards in #photography-grid: re-orders the
// cards in place for the sort buttons, re-spacing the in-feed ad cards at the
// server's cadence, and lazily requests those ads. The layout itself is the shared
// waterfall packer (js/waterfall.js), already run inline right after the grid
// markup and self-re-packing on resize; here we only re-pack after a sort. Reads
// only its own DOM/data-attributes; it knows nothing about the map. createGrid()
// returns { relayout } for the entry.
export function createGrid(container) {
  // In-feed ad cadence, mirrored from photography.ejs so re-sorting can re-space
  // the ad cards the same way the server interleaved them. 0 = no ads.
  const AD_EVERY = parseInt(container.dataset.adEvery, 10) || 0;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function relayout() {
    if (window.waterfall) window.waterfall(container);
  }

  // Re-order the existing photo cards in place (no markup rebuilt) and re-space
  // the ad cards at the same cadence the server used, then re-pack.
  function applySort(type) {
    const photoNodes = [...container.querySelectorAll('.grid-item:not(.ad-grid-item)')];
    const adNodes = [...container.querySelectorAll('.grid-item.ad-grid-item')];

    let ordered;
    if (type === 'views') {
      ordered = photoNodes.slice().sort((a, b) => (parseInt(b.dataset.views, 10) || 0) - (parseInt(a.dataset.views, 10) || 0));
    } else if (type === 'date') {
      ordered = photoNodes.slice().sort((a, b) => (parseInt(a.dataset.index, 10) || 0) - (parseInt(b.dataset.index, 10) || 0));
    } else {
      ordered = shuffle(photoNodes.slice());
    }

    // Detach the cards (the .grid-sizer stays), then re-append photos with the
    // ad cards interleaved every Nth position, reusing the same ad nodes.
    photoNodes.forEach(n => n.remove());
    adNodes.forEach(n => n.remove());

    const fragment = document.createDocumentFragment();
    let adIdx = 0;
    ordered.forEach((node, i) => {
      fragment.appendChild(node);
      if (AD_EVERY && (i + 1) % AD_EVERY === 0 && adIdx < adNodes.length) {
        fragment.appendChild(adNodes[adIdx++]);
      }
    });
    while (adIdx < adNodes.length) fragment.appendChild(adNodes[adIdx++]);
    container.appendChild(fragment);

    relayout();
  }

  // Sort event listeners — reorder the rendered cards in place.
  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', function() {
      if (this.classList.contains('active')) return;
      document.querySelectorAll('.sort-btn').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
      applySort(this.dataset.sort);
    });
  });

  lazyInitAds(container.querySelectorAll('.ad-grid-item'));

  return { relayout };
}
