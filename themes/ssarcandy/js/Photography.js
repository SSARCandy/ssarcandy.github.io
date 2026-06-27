import { createGrid } from './PhotographyGrid';
import { createMap } from './PhotographyMap';

// /photography entry. Photo cards are rendered as static HTML at build time (see
// photography.ejs). The grid module enhances that DOM (masonry + sort); the map
// module lazily fetches its data (/flickr_photos.json) the first time the map view
// opens. This entry only wires the view toggle and window resize between the two —
// they share nothing else.
const container = document.querySelector('#photography-grid');
const mapContainer = document.querySelector('#photography-map');

if (container) {
  const grid = createGrid(container);
  const map = createMap(mapContainer);

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
      map.show();
    });
  });

  window.addEventListener('resize', () => {
    grid.relayout();
    if (mapContainer.style.display !== 'none') map.resize();
  });
}
