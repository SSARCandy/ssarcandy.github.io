/* global maplibregl, Supercluster, Masonry, imagesLoaded */
(function() {
  const container = document.querySelector('#photography-grid');
  const mapContainer = document.querySelector('#photography-map');
  if (!container) return;

  // Photo cards are rendered as static HTML at build time (see photography.ejs).
  // This script only *enhances* that DOM: it runs the masonry layout, re-orders
  // the existing cards for the sort buttons, and builds the map from the cards'
  // data attributes. There is no runtime fetch and no client-built grid markup.

  // In-feed ad cadence, mirrored from photography.ejs so re-sorting can re-space
  // the ad cards the same way the server interleaved them. 0 = no ads.
  const AD_EVERY = parseInt(container.dataset.adEvery, 10) || 0;
  let adObserver = null;

  let mapPhotos = []; // Coords/title/link for the map, read once from the cards.
  let masonryInstance = null;

  let mapInstance = null;
  let superclusterIndex = null;
  let currentMarkers = {};
  let masterBounds = null;
  let expandedClusterId = null;
  let newlyExpanded = false;
  let expandOrigin = null;

  class ZoomControl {
    onAdd(map) {
      this._map = map;
      this._container = document.createElement('div');
      this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

      const zoomIn = document.createElement('button');
      zoomIn.className = 'maplibregl-ctrl-icon';
      zoomIn.type = 'button';
      zoomIn.ariaLabel = 'Zoom In';
      zoomIn.title = 'Zoom In';
      zoomIn.style = 'display: flex; justify-content: center; align-items: center; cursor: pointer;';
      zoomIn.innerHTML = '<i class="icon icon-plus"></i>';
      zoomIn.onclick = () => map.zoomIn();

      const zoomOut = document.createElement('button');
      zoomOut.className = 'maplibregl-ctrl-icon';
      zoomOut.type = 'button';
      zoomOut.ariaLabel = 'Zoom Out';
      zoomOut.title = 'Zoom Out';
      zoomOut.style = 'display: flex; justify-content: center; align-items: center; cursor: pointer;';
      zoomOut.innerHTML = '<i class="icon icon-minus"></i>';
      zoomOut.onclick = () => map.zoomOut();

      this._container.appendChild(zoomIn);
      this._container.appendChild(zoomOut);
      return this._container;
    }
    onRemove() {
      this._container.parentNode.removeChild(this._container);
      this._map = undefined;
    }
  }

  class ResetViewControl {
    onAdd(map) {
      this._map = map;
      this._container = document.createElement('div');
      this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
      this._container.innerHTML = '<button class="maplibregl-ctrl-icon" type="button" aria-label="Reset View" title="Reset View" style="display: flex; justify-content: center; align-items: center; cursor: pointer;"><i class="icon icon-refresh"></i></button>';
      this._container.onclick = (e) => {
        e.preventDefault();
        if (masterBounds) {
          map.fitBounds(masterBounds, { padding: 50, duration: 1500 });
        }
      };
      return this._container;
    }
    onRemove() {
      this._container.parentNode.removeChild(this._container);
      this._map = undefined;
    }
  }

  function initMap() {
    if (mapInstance) return;

    mapInstance = new maplibregl.Map({
      container: 'photography-map',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [121, 23.5],
      zoom: 7,
      maxZoom: 16,
      attributionControl: false,
      dragRotate: false,
    });

    mapInstance.scrollZoom.disable();
    mapContainer.setAttribute('tabindex', '0');
    mapContainer.addEventListener('focus', () => mapInstance.scrollZoom.enable());
    mapContainer.addEventListener('blur', () => mapInstance.scrollZoom.disable());

    mapInstance.addControl(new ZoomControl(), 'top-left');
    mapInstance.addControl(new ResetViewControl(), 'top-left');

    const isMobile = window.innerWidth < 600;
    superclusterIndex = new Supercluster({
      radius: isMobile ? 40 : 20,
      maxZoom: 20,
    });

    superclusterIndex.load([]); // 預防 kdbush undefined 報錯

    mapInstance.on('move', () => renderClusters(false));
    mapInstance.on('moveend', () => {
      renderClusters(true);
      if (expandOrigin) expandOrigin.pending = false;
    });

    mapInstance.on('click', () => {
      if (expandedClusterId === null) return;

      const prev = expandedClusterId;
      expandedClusterId = null;
      if (currentMarkers['cluster-' + prev]) {
        currentMarkers['cluster-' + prev].remove();
        delete currentMarkers['cluster-' + prev];
      }
      renderClusters();
    });
  }

  function renderClusters(shouldAnimate = false) {
    if (!mapInstance || !superclusterIndex || !superclusterIndex.trees) return;

    const bounds = mapInstance.getBounds();
    const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    const zoom = Math.floor(mapInstance.getZoom());

    const clusters = superclusterIndex.getClusters(bbox, zoom);
    const newMarkers = {};

    for (const cluster of clusters) {
      const isCluster = cluster.properties.cluster;
      const id = isCluster ? `cluster-${cluster.properties.cluster_id}` : `photo-${cluster.properties.id}`;
      const coords = cluster.geometry.coordinates;

      if (currentMarkers[id]) {
        newMarkers[id] = currentMarkers[id];
        delete currentMarkers[id];
        continue;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'marker-wrapper';

      const el = document.createElement('div');

      if (isCluster) {
        renderClusterMarker(cluster, wrapper, el, coords);
      } else {
        renderPhotoMarker(cluster, wrapper, el);
      }

      if (shouldAnimate) animateMarker(el, coords);
      wrapper.appendChild(el);

      const marker = new maplibregl.Marker({ element: wrapper }).setLngLat(coords);

      if (!isCluster) {
        attachPhotoPopup(marker, cluster.properties);
      }

      marker.addTo(mapInstance);
      newMarkers[id] = marker;
    }

    for (const id in currentMarkers) {
      currentMarkers[id].remove();
    }
    currentMarkers = newMarkers;
  }

  function renderClusterMarker(cluster, wrapper, el, coords) {
    const count = cluster.properties.point_count;
    const clusterId = cluster.properties.cluster_id;
    const leaves = superclusterIndex.getLeaves(clusterId, 1);
    const imgUrl = leaves[0].properties.imgUrl;

    el.className = 'custom-photo-cluster';
    el.innerHTML = `
            <img src="${imgUrl}" loading="lazy">
            <div class="cluster-badge">${count}</div>
        `;

    if (expandedClusterId === clusterId) {
      renderSpiderLeaves(clusterId, wrapper, coords);
      el.style.opacity = '0.3';
    } else {
      el.style.opacity = '1';
    }

    wrapper.addEventListener('click', (e) => handleClusterClick(e, clusterId, coords));
  }

  function renderSpiderLeaves(clusterId, wrapper, coords) {
    const allLeaves = superclusterIndex.getLeaves(clusterId, 100);
    const total = allLeaves.length;
    const radius = 40;

    const spiderContainer = document.createElement('div');
    spiderContainer.className = 'spider-container';

    const isNew = newlyExpanded;
    if (isNew) newlyExpanded = false;

    allLeaves.forEach((leaf, i) => {
      const angle = (i / total) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      const props = leaf.properties;

      const leafWrapper = document.createElement('div');
      leafWrapper.className = 'spider-leaf-wrapper';

      const leafContent = document.createElement('div');
      leafContent.className = 'spider-leaf-content';
      leafContent.innerHTML = `<img src="${props.imgUrl}" alt="${props.title}" loading="lazy">`;

      leafContent.addEventListener('click', (e) => handleSpiderLeafClick(e, props, coords, x, y));

      leafWrapper.appendChild(leafContent);

      const line = document.createElement('div');
      line.className = 'spider-line';
      line.style.transform = `rotate(${angle}rad)`;

      spiderContainer.appendChild(line);
      spiderContainer.appendChild(leafWrapper);

      applySpiderLeafAnimation(leafWrapper, line, x, y, radius, isNew);
    });

    wrapper.appendChild(spiderContainer);
  }

  function handleSpiderLeafClick(e, props, coords, x, y) {
    e.stopPropagation();
    document.querySelectorAll('.maplibregl-popup').forEach(p => p.remove());
    new maplibregl.Popup({ closeButton: false, anchor: 'bottom', offset: [x, y - 35] })
      .setLngLat(coords)
      .setHTML(createPopupHtml(props))
      .addTo(mapInstance);
    // Center on the visual position of the popup
    mapInstance.flyTo({ center: coords, offset: [-x, -y + 135], speed: 1.2 });
  }

  function applySpiderLeafAnimation(leafWrapper, line, x, y, radius, isNew) {
    if (!isNew) {
      leafWrapper.style.transition = 'none';
      leafWrapper.style.transform = `translate(${x}px, ${y}px)`;
      leafWrapper.style.opacity = '1';
      line.style.transition = 'none';
      line.style.width = `${radius}px`;
      return;
    }

    leafWrapper.style.transform = 'translate(0px, 0px)';
    leafWrapper.style.opacity = '0';
    line.style.width = '0px';
    requestAnimationFrame(() => {
      setTimeout(() => {
        leafWrapper.style.transform = `translate(${x}px, ${y}px)`;
        leafWrapper.style.opacity = '1';
        line.style.width = `${radius}px`;
      }, 10);
    });
  }

  function handleClusterClick(e, clusterId, coords) {
    e.stopPropagation();
    const currentZoom = mapInstance.getZoom();
    const extraExpansion = window.innerWidth < 600 ? 1 : 3; // Add extra zoom for desktop to better show spider leaves
    const expansionZoom = extraExpansion + superclusterIndex.getClusterExpansionZoom(clusterId);

    if (currentZoom < 15.9) {
      // Set pending to true so we know to animate once moveend fires
      expandOrigin = { coords: coords, time: Date.now(), pending: true };
      mapInstance.flyTo({ center: coords, zoom: Math.min(expansionZoom, 16), speed: 1.5 });
      return;
    }

    const prevExpanded = expandedClusterId;

    if (expandedClusterId === clusterId) {
      expandedClusterId = null;
    } else {
      expandedClusterId = clusterId;
      newlyExpanded = true;
    }

    if (prevExpanded !== null && currentMarkers['cluster-' + prevExpanded]) {
      currentMarkers['cluster-' + prevExpanded].remove();
      delete currentMarkers['cluster-' + prevExpanded];
    }

    if (expandedClusterId !== null && currentMarkers['cluster-' + expandedClusterId]) {
      currentMarkers['cluster-' + expandedClusterId].remove();
      delete currentMarkers['cluster-' + expandedClusterId];
    }

    renderClusters();
  }

  function renderPhotoMarker(cluster, wrapper, el) {
    const props = cluster.properties;
    el.className = 'map-marker-icon';
    el.innerHTML = `<img src="${props.imgUrl}" alt="${props.title}" loading="lazy">`;
  }

  function attachPhotoPopup(marker, props) {
    const popup = new maplibregl.Popup({ closeButton: false, anchor: 'bottom', offset: 35 })
      .setHTML(createPopupHtml(props));
    marker.setPopup(popup);
    popup.on('open', () => {
      mapInstance.flyTo({ center: marker.getLngLat(), offset: [0, 100], speed: 1.2 });
    });
  }

  function createPopupHtml(props) {
    return `
            <div class="material-popup">
                <a href="${props.link}" target="_blank" class="material-popup-img">
                    <img src="${props.imgUrl}" loading="lazy" alt="${props.title}">
                </a>
                <div class="material-popup-content">
                    <a href="${props.link}" target="_blank" class="material-popup-title" title="${props.title}">
                        ${props.title}
                    </a>
                </div>
            </div>
        `;
  }

  function animateMarker(el, coords) {
    if (!expandOrigin || !expandOrigin.pending || (Date.now() - expandOrigin.time >= 3000)) return;

    const width = mapInstance.getContainer().offsetWidth;
    const height = mapInstance.getContainer().offsetHeight;
    const originPx = mapInstance.project(expandOrigin.coords);

    if (originPx.x < 0 || originPx.x > width || originPx.y < 0 || originPx.y > height) return;

    const currentPx = mapInstance.project(coords);
    const dx = originPx.x - currentPx.x;
    const dy = originPx.y - currentPx.y;

    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.style.transition = 'none';

    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
        el.style.transform = 'translate(0px, 0px)';

        setTimeout(() => {
          el.style.transition = el.style.transform = '';
        }, 650);
      }, 50);
    });
  }

  function updateMarkers(photos) {
    if (!superclusterIndex) return;

    const features = [];
    const bounds = new maplibregl.LngLatBounds();

    photos.forEach(item => {
      if (!item.latitude || !item.longitude || parseFloat(item.latitude) === 0) return;

      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);

      bounds.extend([lng, lat]);
      features.push({
        type: 'Feature',
        properties: { id: item.id, title: item.title, imgUrl: item.imgUrl, link: item.link },
        geometry: { type: 'Point', coordinates: [lng, lat] },
      });
    });

    superclusterIndex.load(features);
    masterBounds = bounds;

    if (features.length === 0) return;

    if (mapInstance.loaded()) {
      mapInstance.fitBounds(bounds, { padding: 50 });
      renderClusters();
    } else {
      mapInstance.once('load', () => {
        mapInstance.fitBounds(bounds, { padding: 50 });
        renderClusters();
      });
    }
  }

  // ----- Static-grid enhancement -------------------------------------------

  // Read what the map needs straight from the server-rendered cards, so the page
  // carries no separate JSON payload. The image URL and Flickr link are already
  // in each card (the <img> src and the <a> href), so we reuse them directly.
  function readPhotosFromDom() {
    return [...container.querySelectorAll('.grid-item:not(.ad-grid-item)')].map(node => {
      const anchor = node.querySelector('a');
      const large = node.querySelector('.img-large');
      const name = node.querySelector('.photo-name');
      return {
        id: node.dataset.id,
        title: name ? name.textContent.trim() : (large ? large.alt : ''),
        latitude: node.dataset.lat,
        longitude: node.dataset.lng,
        imgUrl: large ? large.getAttribute('src') : '',
        link: anchor ? anchor.getAttribute('href') : '',
      };
    });
  }

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

  function init() {
    mapPhotos = readPhotosFromDom();

    // Lay out the server-rendered cards. Each card reserves its height via an
    // aspect-ratio, so the Masonry constructor positions everything correctly on
    // the initial paint (before any image loads, no reflow).
    masonryInstance = new Masonry(container, {
      itemSelector: '.grid-item',
      columnWidth: '.grid-sizer',
      percentPosition: true,
      gutter: 16,
      transitionDuration: 0,
    });

    // Safety net for any card lacking intrinsic dimensions: relayout as images
    // decode so the masonry never overlaps.
    imagesLoaded(container).on('progress', () => {
      if (masonryInstance) masonryInstance.layout();
    });

    container.querySelectorAll('.ad-grid-item').forEach(observeAd);
  }

  // View toggle event listeners
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.classList.contains('active')) return;
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const view = this.dataset.view;
      if (view === 'grid') {
        container.style.display = 'block';
        mapContainer.style.display = 'none';
        document.querySelector('#sort-group').style.display = 'flex';
        if (masonryInstance) masonryInstance.layout();
        return;
      }

      container.style.display = 'none';
      mapContainer.style.display = 'block';
      document.querySelector('#sort-group').style.display = 'none';

      requestAnimationFrame(() => {
        initMap();
        if (mapInstance) mapInstance.resize();

        setTimeout(() => {
          if (mapInstance) mapInstance.resize();
          if (mapPhotos.length > 0) updateMarkers(mapPhotos);
        }, 50);
      });
    });
  });

  // Sort event listeners — reorder the rendered cards in place.
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.classList.contains('active')) return;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      applySort(this.dataset.sort);
    });
  });

  // The grid is already in the page; enhance it once the libraries are ready.
  if (container.querySelector('.grid-item:not(.ad-grid-item)')) {
    init();
  }

  window.addEventListener('resize', () => {
    if (masonryInstance) masonryInstance.layout();
    if (mapInstance && mapContainer.style.display !== 'none') {
      mapInstance.resize();
    }
  });
})();
