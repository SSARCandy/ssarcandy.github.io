import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';

// Enhances the server-rendered photo cards in #photography-grid: runs the Masonry
// layout and re-orders the cards in place for the sort buttons, re-spacing the
// in-feed ad cards at the server's cadence. Reads only its own DOM/data-attributes;
// it knows nothing about the map. createGrid() returns { relayout } for the entry.
export function createGrid(container) {
  // In-feed ad cadence, mirrored from photography.ejs so re-sorting can re-space
  // the ad cards the same way the server interleaved them. 0 = no ads.
  const AD_EVERY = parseInt(container.dataset.adEvery, 10) || 0;
  let masonryInstance = null;
  let adObserver = null;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Re-order the existing photo cards in place (no markup rebuilt) and re-space
  // the ad cards at the same cadence the server used, then re-run the layout.
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

    if (masonryInstance) {
      masonryInstance.reloadItems();
      masonryInstance.layout();
    }
  }

  // The ad <ins> self-initialises via its inline push() in the partial; here we
  // only re-run the masonry layout once the ad fills and changes height, so the
  // surrounding photos reflow around its final size instead of leaving a gap.
  function observeAd(adDiv) {
    if (typeof ResizeObserver === 'undefined') return;
    if (!adObserver) {
      adObserver = new ResizeObserver(() => {
        if (masonryInstance) masonryInstance.layout();
      });
    }
    adObserver.observe(adDiv);
  }

  function relayout() {
    if (masonryInstance) masonryInstance.layout();
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

  // The grid is already in the page; lay it out once the libraries are ready. Each
  // card reserves its height via an aspect-ratio, so Masonry positions everything
  // correctly on the initial paint (before any image loads, no reflow).
  if (container.querySelector('.grid-item:not(.ad-grid-item)')) {
    masonryInstance = new Masonry(container, {
      itemSelector: '.grid-item',
      columnWidth: '.grid-sizer',
      percentPosition: true,
      gutter: 16,
      transitionDuration: 0,
    });

    // Safety net for any card lacking intrinsic dimensions: relayout as images
    // decode so the masonry never overlaps.
    imagesLoaded(container).on('progress', () => relayout());

    container.querySelectorAll('.ad-grid-item').forEach(observeAd);
  }

  return { relayout };
}
