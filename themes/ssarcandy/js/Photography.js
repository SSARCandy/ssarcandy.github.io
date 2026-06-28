import { createGrid } from './PhotographyGrid';

// /photography entry. Photo cards are rendered as static HTML at build time (see
// photography.ejs). The grid module enhances that DOM (masonry + sort); the map
// module lazily fetches its data (/flickr_photos.json) the first time the map view
// opens. This entry only wires the view toggle and window resize between the two —
// they share nothing else.
const container = document.querySelector('#photography-grid');
const mapContainer = document.querySelector('#photography-map');

if (container) {
  const grid = createGrid(container);

  // The map module statically pulls in MapLibre GL + supercluster (~800 KB). Import
  // it dynamically so Vite splits it into its own chunk that loads only when needed —
  // otherwise that heavy library blocks the entry from running and Masonry can't lay
  // out the grid until the whole bundle parses (~1s of float fallback "holes" on
  // first paint). Cached after the first import.
  let mapPromise = null;
  function getMap() {
    if (!mapPromise) {
      mapPromise = import('./PhotographyMap').then(({ createMap }) => createMap(mapContainer));
    }
    return mapPromise;
  }

  // Warm the map chunk in the background once the page is idle (well after the grid
  // has painted): the 800 KB download + parse happens off the critical path, so when
  // the user actually opens the map view it's already loaded and switches instantly.
  const warmMap = () => getMap();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(warmMap, { timeout: 3000 });
  } else {
    setTimeout(warmMap, 2000);
  }

  // View toggle: swap which surface is visible, then hand off to the right module.
  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', function() {
      if (this.classList.contains('active')) return;
      document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');

      if (this.dataset.view === 'grid') {
        container.style.display = 'block';
        mapContainer.style.display = 'none';
        document.querySelector('#sort-group').style.display = 'flex';
        grid.relayout();
        return;
      }

      container.style.display = 'none';
      mapContainer.style.display = 'block';
      document.querySelector('#sort-group').style.display = 'none';
      getMap().then((map) => map.show());
    });
  });

  window.addEventListener('resize', () => {
    grid.relayout();
    if (mapContainer.style.display !== 'none' && mapPromise) mapPromise.then((map) => map.resize());
  });
}
