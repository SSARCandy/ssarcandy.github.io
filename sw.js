/*
 * Self-destroying service worker (tombstone).
 *
 * The site used to ship a hexo-pwa / sw-toolbox worker that cached CSS/JS
 * "cache-first" on unversioned URLs, which left returning visitors on stale
 * (or mismatched) assets after every deploy. That plugin has been removed.
 *
 * A worker cannot simply vanish: browsers that already installed the old one
 * keep it running until a *new* worker at this same URL replaces it. So this
 * file stays here as a kill switch — it wipes all caches and unregisters
 * itself. Existing clients pick it up via their periodic update check (next
 * visit, throttled to ~24h) and clean themselves; new visitors never register
 * a worker at all (the registration script is gone).
 *
 * Keep serving this at /sw.js indefinitely. Only delete it once you're
 * confident no browsers still hold the old worker.
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      // 1. Drop every cache this origin created (old sw-toolbox caches included).
      const keys = await caches.keys();
      await Promise.all(keys.map(function (key) { return caches.delete(key); }));

      // 2. Take control so we can reload open tabs.
      await self.clients.claim();

      // 3. Reload any open tab once, so it re-fetches everything from the
      //    network with no worker in the way.
      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.all(clients.map(function (client) {
        return client.navigate(client.url).catch(function () {});
      }));

      // 4. Remove this registration entirely.
      await self.registration.unregister();
    })()
  );
});
