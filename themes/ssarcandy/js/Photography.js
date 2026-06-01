/* global maplibregl, Supercluster, Masonry, imagesLoaded */
(function() {
  const container = document.querySelector('#photography-grid');
  const mapContainer = document.querySelector('#photography-map');
  if (!container) return;

  const USER_ID = container.dataset.userId;
  const API_KEY = container.dataset.apiKey;
    
  let masterPhotos = []; // Keep original order
  let sortedPhotosList = [];
  let currentIsRestApi = false;
  let currentSort = 'random'; // 'date', 'views', or 'random'
  let masonryInstance = null;
  
  let mapInstance = null;
  let superclusterIndex = null;
  let currentMarkers = {};
  let masterBounds = null;
  let expandedClusterId = null;
  let newlyExpanded = false;
  let expandOrigin = null;

  let renderedCount = 0;
  const CHUNK_SIZE = 12;
  let observer = null;
  let sentinel = null;

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
    new maplibregl.Popup({ closeButton: false, offset: [x, y - 35] })
      .setLngLat(coords)
      .setHTML(createPopupHtml(props))
      .addTo(mapInstance);
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
    const expansionZoom = 1 + superclusterIndex.getClusterExpansionZoom(clusterId);
        
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
    const popup = new maplibregl.Popup({ closeButton: false, offset: 35 })
      .setHTML(createPopupHtml(props));
    marker.setPopup(popup);
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
      const imgUrl = item.url_c || `https://live.staticflickr.com/${item.server}/${item.id}_${item.secret}_q.jpg`;
      const link = `https://www.flickr.com/photos/${item.owner}/${item.id}`;

      bounds.extend([lng, lat]);
      features.push({
        type: 'Feature',
        properties: { id: item.id, title: item.title, imgUrl: imgUrl, link: link },
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

  function sortPhotos(photos, type) {
    if (type === 'random') {
      const sorted = [...photos];
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
      return sorted;
    }

    if (type === 'views') {
      return [...photos].sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
    }

    // Default: newest first (restore from master list order)
    return [...masterPhotos];
  }

  function initSentinel() {
    if (sentinel) {
      observer.observe(sentinel);
      return;
    }

    sentinel = document.createElement('div');
    sentinel.className = 'sentinel';
    sentinel.style.width = '100%';
    sentinel.style.height = '10px';
    sentinel.style.clear = 'both';
    container.parentNode.insertBefore(sentinel, container.nextSibling);
        
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMorePhotos();
      }
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
  }

  function loadMorePhotos() {
    if (renderedCount >= sortedPhotosList.length) {
      if (sentinel && observer) observer.unobserve(sentinel);
      return;
    }

    const nextChunk = sortedPhotosList.slice(renderedCount, renderedCount + CHUNK_SIZE);
    if (nextChunk.length === 0) return;

    const fragment = document.createDocumentFragment();
    const newItems = [];

    nextChunk.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'grid-item skeleton';
            
      let imgUrl, thumbUrl, link, title, views;
      let aspectRatioStyle = '';
            
      if (currentIsRestApi) {
        imgUrl = item.url_c || `https://live.staticflickr.com/${item.server}/${item.id}_${item.secret}_c.jpg`;
        thumbUrl = item.url_t || `https://live.staticflickr.com/${item.server}/${item.id}_${item.secret}_t.jpg`;
        link = `https://www.flickr.com/photos/${item.owner}/${item.id}`;
        title = item.title;
        views = item.views;
        if (item.width_c && item.height_c) {
          aspectRatioStyle = `aspect-ratio: ${item.width_c} / ${item.height_c};`;
        }
      } else {
        imgUrl = item.media.m.replace('_m.jpg', '_c.jpg');
        thumbUrl = item.media.m;
        link = item.link;
        title = item.title;
        views = null;
      }

      const viewsHtml = views ? `<span class="photo-views"><i class="icon icon-eye"></i> ${views}</span>` : '';
      const isPriority = renderedCount === 0 && index < 4;
      const fetchPriority = isPriority ? 'fetchpriority="high"' : 'loading="lazy"';

      div.innerHTML = `
                <a href="${link}" target="_blank">
                    <div class="blur-up" style="${aspectRatioStyle}">
                        <img src="${thumbUrl}" class="img-small" decoding="async" alt="${title}" onload="this.closest('.grid-item').classList.remove('skeleton')">
                        <img src="${imgUrl}" class="img-large" decoding="async" alt="${title}" ${fetchPriority} onload="this.parentElement.classList.add('loaded')">
                        <div class="photo-title">
                            <span class="photo-name">${title}</span>
                            ${viewsHtml}
                        </div>
                    </div>
                </a>
            `;
      fragment.appendChild(div);
      newItems.push(div);
    });

    container.appendChild(fragment);
    renderedCount += nextChunk.length;

    if (!masonryInstance) {
      masonryInstance = new Masonry(container, {
        itemSelector: '.grid-item',
        columnWidth: '.grid-sizer',
        percentPosition: true,
        gutter: 16,
        transitionDuration: 0,
      });
    } else {
      masonryInstance.appended(newItems);
    }

    // Layout immediately. Images with aspect-ratio will take correct space.
    masonryInstance.layout();
    revealItems(newItems);

    // For images without aspect-ratio or delayed loading, update layout on progress
    imagesLoaded(container).on('progress', function() {
      if (!masonryInstance) return;
      masonryInstance.layout();
    });
  }

  function revealItems(items) {
    if (!items || items.length === 0) return;
    requestAnimationFrame(() => {
      items.forEach(item => item.classList.add('revealed'));
    });
  }

  function renderPhotos(photos, isRestApi, isInitialLoad = false) {
    if (isInitialLoad) {
      masterPhotos = [...photos];
      if (isRestApi) {
        document.querySelector('#view-group').style.display = 'flex';
        document.querySelector('#sort-views-btn').style.display = 'flex';
        // Primary: Initialize markers if we have mapInstance
        if (mapInstance) updateMarkers(masterPhotos);
      }
    }
        
    currentIsRestApi = isRestApi;
    sortedPhotosList = sortPhotos(masterPhotos, currentSort);
        
    container.innerHTML = '<div class="grid-sizer"></div>';
    if (masonryInstance) {
      masonryInstance.destroy();
      masonryInstance = null;
    }
    renderedCount = 0;
        
    initSentinel();
    loadMorePhotos();
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
        if (sentinel) sentinel.style.display = 'block';
        mapContainer.style.display = 'none';
        document.querySelector('#sort-group').style.display = 'flex';
        if (masonryInstance) masonryInstance.layout();
        return;
      }

      container.style.display = 'none';
      if (sentinel) sentinel.style.display = 'none';
      mapContainer.style.display = 'block';
      document.querySelector('#sort-group').style.display = 'none';
      
      requestAnimationFrame(() => {
        initMap();
        if (mapInstance) mapInstance.resize(); 
            
        setTimeout(() => { 
          if (mapInstance) mapInstance.resize(); 
          if (masterPhotos.length > 0) updateMarkers(masterPhotos);
        }, 50);
      });
    });
  });

  // Sort event listeners
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.classList.contains('active')) return;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
            
      currentSort = this.dataset.sort;
      if (masterPhotos.length === 0) return;
      renderPhotos(masterPhotos, currentIsRestApi);
    });
  });

  // Fallback: Feed API
  window.jsonFlickrFeed = function(data) {
    console.log('Flickr: Using Feed API Fallback');
    renderPhotos(data.items, false, true);
  };

  // Primary: REST API
  window.jsonFlickrApi = function(data) {
    if (data.stat !== 'ok') {
      console.error('Flickr REST API failed:', data.message);
      loadFeedApi();
      return;
    }
    renderPhotos(data.photos.photo, true, true);
  };

  function loadFeedApi() {
    const script = document.createElement('script');
    script.src = `https://www.flickr.com/services/feeds/photos_public.gne?id=${USER_ID}&format=json`;
    document.head.appendChild(script);
  }

  function loadRestApi() {
    const script = document.createElement('script');
    script.src = `https://www.flickr.com/services/rest/?method=flickr.people.getPhotos&api_key=${API_KEY}&user_id=${USER_ID}&per_page=100&extras=views,geo,url_c,url_t&format=json&jsoncallback=jsonFlickrApi`;
    script.onerror = loadFeedApi;
    document.head.appendChild(script);
  }

  loadRestApi();

  window.addEventListener('resize', () => {
    if (masonryInstance) masonryInstance.layout();
    if (mapInstance && mapContainer.style.display !== 'none') {
      mapInstance.resize();
    }
  });
})();
