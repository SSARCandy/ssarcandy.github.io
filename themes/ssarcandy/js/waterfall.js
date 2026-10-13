// Shared waterfall (masonry) layout for the /photography and /projects grids.
//
// NOT bundled by Vite: _partial/waterfall.ejs inlines this file (inline_script
// helper) directly after the grid markup, so the grid is packed while the HTML is
// still parsing — visible and in its final layout on first paint, instead of
// waiting for the page bundle to download and run. The bundles reach it through
// window.waterfall to re-pack after a sort/filter.
//
// Container contract (see waterfall.less):
//   .waterfall            the grid; hidden (opacity 0) until the first pack
//   data-gutter="16"      column gutter in px
//   [data-waterfall-sizer] child whose width is the column width (CSS-driven)
// Every other visible child is a card, placed in source order into the currently
// shortest column. Cards hidden with display:none (unfilled ads) are skipped.
(function () {
  if (window.waterfall) return;

  function pack(container) {
    // Hidden (e.g. photography's map view): nothing to measure. Re-packed when
    // shown again — by the ResizeObserver and the caller.
    if (!container.offsetParent) return;

    // Cards go absolute from here on, so the measurements below are of the final
    // card widths, not of the pre-JS flex/float fallback.
    container.classList.add('waterfall-ready');

    const style = getComputedStyle(container);
    const padLeft = parseFloat(style.paddingLeft) || 0;
    const padTop = parseFloat(style.paddingTop) || 0;
    const outerWidth = container.clientWidth;
    const width = outerWidth - padLeft - (parseFloat(style.paddingRight) || 0);
    const gutter = parseFloat(container.dataset.gutter) || 0;
    const sizer = container.querySelector('[data-waterfall-sizer]');
    const colWidth = (sizer && sizer.getBoundingClientRect().width) || width;
    const cols = Math.max(1, Math.round((width + gutter) / (colWidth + gutter)));

    // Read every height first, then write every position: one layout pass.
    const cards = [];
    for (const el of container.children) {
      if (el === sizer || !el.offsetParent) continue;
      cards.push({ el, h: el.offsetHeight + (parseFloat(getComputedStyle(el).marginBottom) || 0) });
    }

    const heights = new Array(cols).fill(0);
    for (const card of cards) {
      let col = 0;
      for (let i = 1; i < cols; i++) if (heights[i] < heights[col]) col = i;
      // Left as a % of the padding box, so a resize stays aligned until re-pack.
      card.el.style.left = ((padLeft + col * (colWidth + gutter)) / outerWidth * 100) + '%';
      card.el.style.top = (padTop + heights[col]) + 'px';
      heights[col] += card.h;
    }
    container.style.height = Math.max.apply(null, heights) + 'px';
  }

  // Re-pack (once per frame) whenever the grid's width or any card's height
  // changes: viewport resize / column flip, an image without a reserved ratio
  // decoding, the webfont swapping in, an ad filling or collapsing.
  function watch(container) {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', () => pack(container));
      return;
    }
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pack(container);
      });
    });
    observer.observe(container);
    for (const el of container.children) observer.observe(el);
  }

  const watched = new WeakSet();

  window.waterfall = function (container) {
    if (!container) return;
    pack(container);
    if (!watched.has(container)) {
      watched.add(container);
      watch(container);
    }
  };
})();
