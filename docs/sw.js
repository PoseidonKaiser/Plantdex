var CACHE = 'plantdex-shell-v1';
var SHELL = [
  '/Plantdex/',
  '/Plantdex/index.html',
  '/Plantdex/manifest.json',
  '/Plantdex/icons/icon-192.png',
  '/Plantdex/icons/icon-512.png',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Network-only for Apps Script (never cache it)
  if (url.indexOf('script.google.com') !== -1) return;

  // Cache-first for shell assets
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache valid responses for shell assets
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        // Offline fallback — return cached shell
        return caches.match('/Plantdex/index.html');
      });
    })
  );
});
