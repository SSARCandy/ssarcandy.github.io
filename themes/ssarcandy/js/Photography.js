import { createGrid } from './PhotographyGrid';

// /photography entry. Photo cards are rendered as static HTML at build time (see
// photography.ejs) and packed by the inline waterfall script. The grid module
// enhances that DOM (sort + lazy ads); the map
// module lazily fetches its data (/flickr_photos.json) the first time the map view
// opens. This entry only wires the view toggle and window resize between the two —
// they share nothing else.
const container = document.querySelector('#photography-grid');
const mapContainer = document.querySelector('#photography-map');

if (container) {
  const grid = createGrid(container);

  // The map module statically pulls in MapLibre GL + supercluster (~800 KB). Import
  // it dynamically so Vite splits it into its own chunk that loads only when needed,
  // keeping this entry tiny. Cached after the first import.
  let mapPromise = null;
  const getMap = () => {
    if (!mapPromise) {
      mapPromise = import('./PhotographyMap').then(({ createMap }) => createMap(mapContainer));
    }
    return mapPromise;
  };

  // Warm the map chunk so opening the map view is instant — but never at the
  // expense of the photos: only after the page has fully loaded and the browser
  // is idle (no forced deadline), and not at all on a data-saver / slow
  // connection. Hovering, focusing or touching the map button fetches it on demand.
  const conn = navigator.connection;
  const slowNet = conn && (conn.saveData || /(^|-)2g$|^3g$/.test(conn.effectiveType || ''));
  if (!slowNet) {
    const warmMap = () => {
      if ('requestIdleCallback' in window) requestIdleCallback(() => getMap());
      else setTimeout(getMap, 2000);
    };
    if (document.readyState === 'complete') warmMap();
    else window.addEventListener('load', warmMap, { once: true });
  }
  const mapBtn = document.querySelector('.view-btn[data-view="map"]');
  if (mapBtn) {
    ['pointerenter', 'touchstart', 'focus'].forEach((type) => {
      mapBtn.addEventListener(type, () => getMap(), { once: true, passive: true });
    });
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

  // The grid re-packs itself on resize (waterfall.js); only the map needs telling.
  window.addEventListener('resize', () => {
    if (mapContainer.style.display !== 'none' && mapPromise) mapPromise.then((map) => map.resize());
  });
}
