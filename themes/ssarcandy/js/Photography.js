/* global L, Masonry, imagesLoaded */
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
  let markersLayer = null;

  let renderedCount = 0;
  const CHUNK_SIZE = 12;
  let observer = null;
  let sentinel = null;

  function initMap() {
    if (mapInstance) return;
    mapInstance = L.map('photography-map', {
      scrollWheelZoom: false, // Prevent scroll trapping
      tap: true,              // Ensure tap works well on mobile
      touchZoom: 'center',
      attributionControl: false,
      maxZoom: 15,
      zoomSnap: 0.1,          // Allow fractional zooming
      wheelPxPerZoomLevel: 100, // Smoother wheel zoom
    }).setView([23.5, 121], 7); // Default to Taiwan

    mapInstance.on('focus', () => mapInstance.scrollWheelZoom.enable());
    mapInstance.on('blur', () => mapInstance.scrollWheelZoom.disable());

    L.maplibreGL({
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(mapInstance);

    markersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false, // Custom slow zoom
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        const markers = cluster.getAllChildMarkers();
        let imgHtml = '';
        if (markers.length > 0) {
          const firstMarkerHtml = markers[0].options.icon.options.html;
          const match = firstMarkerHtml.match(/src="([^"]+)"/);
          if (match && match[1]) {
            imgHtml = '<img src="' + match[1] + '" loading="lazy">';
          }
        }

        return L.divIcon({
          html: '<div class="custom-photo-cluster">' +
                            imgHtml +
                            '<div class="cluster-badge">' + childCount + '</div>' +
                          '</div>',
          className: 'custom-cluster-icon',
          iconSize: L.point(60, 60),
          iconAnchor: L.point(30, 30),
        });
      },
    }).addTo(mapInstance);

    markersLayer.on('clusterclick', function(a) {
      const bounds = a.layer.getBounds();
      // If already at max zoom or all markers in cluster have same position, spiderfy
      if (mapInstance.getZoom() === mapInstance.getMaxZoom() || bounds.getNorthEast().equals(bounds.getSouthWest())) {
        a.layer.spiderfy();
      } else {
        mapInstance.flyToBounds(bounds, {
          padding: [50, 50],
          duration: 2,
          easeLinearity: 0.1, 
        });
      }
    });

    L.Control.ResetView = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.innerHTML = '<a href="#" title="Reset View" role="button" aria-label="Reset View" style="display: flex; justify-content: center; align-items: center; width: 30px; height: 30px; text-decoration: none; color: #444;"><i class="icon icon-refresh"></i></a>';
        L.DomEvent.disableClickPropagation(container);
        container.onclick = function(e) {
          e.preventDefault();
          if (markersLayer && markersLayer.getBounds().isValid()) {
            map.flyToBounds(markersLayer.getBounds(), {
              padding: [50, 50],
              duration: 1.5,
              easeLinearity: 0.1,
            });
          }
        };
        return container;
      },
    });
    mapInstance.addControl(new L.Control.ResetView());
  }

  function updateMarkers(photos) {
    if (!markersLayer) return;
    markersLayer.clearLayers();
    const bounds = [];

    photos.forEach(item => {
      if (!item.latitude || !item.longitude || parseFloat(item.latitude) === 0) return;

      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);
      const imgUrl = item.url_c || `https://live.staticflickr.com/${item.server}/${item.id}_${item.secret}_q.jpg`;
      const link = `https://www.flickr.com/photos/${item.owner}/${item.id}`;

      const customIcon = L.divIcon({
        className: 'custom-cluster-icon',
        html: `<div class="map-marker-icon"><img src="${imgUrl}" alt="${item.title}" loading="lazy"></div>`,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });
      marker.bindPopup(`
                <div class="material-popup">
                    <a href="${link}" target="_blank" class="material-popup-img">
                        <img src="${imgUrl}" loading="lazy" alt="${item.title}">
                    </a>
                    <div class="material-popup-content">
                        <a href="${link}" target="_blank" class="material-popup-title" title="${item.title}">
                            ${item.title}
                        </a>
                    </div>
                </div>
            `, { closeButton: false });
      markersLayer.addLayer(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      mapInstance.fitBounds(bounds, { padding: [50, 50] });
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
      
      initMap();
      setTimeout(() => {
        if (!mapInstance || masterPhotos.length === 0) return;
        mapInstance.invalidateSize();
        updateMarkers(masterPhotos);
      }, 100);
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
      mapInstance.invalidateSize();
    }
  });
})();
