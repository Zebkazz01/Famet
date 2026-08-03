/**
 * Service Worker - POS PWA
 * v1.4.0: Network-First para assets, cleanup corregido
 */
var CACHE_VERSION = 'v1.4.0';
var CACHE_STATIC  = 'pos-static-' + CACHE_VERSION;
var CACHE_IMAGES  = 'pos-images-' + CACHE_VERSION;
var CACHE_DYNAMIC = 'pos-dynamic-' + CACHE_VERSION;

var SHELL_FILES = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './pwa/icons/icon-any-192.png',
  './pwa/icons/icon-maskable-192.png'
];

// INSTALL
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(function(cache) {
        return cache.addAll(SHELL_FILES);
      })
      .then(function() { return self.skipWaiting(); })
      .catch(function(err) {
        console.warn('[SW] Error pre-caching:', err);
        return self.skipWaiting();
      })
  );
});

// ACTIVATE — limpiar TODOS los caches viejos (no solo fameat-)
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) {
          return n !== CACHE_STATIC &&
                 n !== CACHE_IMAGES &&
                 n !== CACHE_DYNAMIC;
        }).map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// FETCH
self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  var url = new URL(request.url);
  var p = url.pathname;

  // Ignorar Socket.IO, Vite HMR
  if (p.startsWith('/socket.io') || p.includes('__vite') || p.includes('@vite') || p.includes('@react-refresh')) return;

  // API: Network-First
  if (p.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // SPA: toda navegación devuelve index.html (Network-First, fallback cache)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          if (response && response.status === 200 && response.type === 'basic') {
            var clone = response.clone();
            caches.open(CACHE_STATIC).then(function(cache) {
              cache.put('index.html', clone);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match('index.html')
            .then(function(cached) {
              return cached || caches.match('./')
                .then(function(root) {
                  return root || caches.match('./offline.html');
                });
            });
        })
    );
    return;
  }

  // Imágenes: Cache-First
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(p)) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // JS/CSS/Assets: Network-First (siempre buscar versión fresca del server)
  if (/\.(js|css|woff2?|ttf|eot)$/i.test(p) || p.startsWith('/assets/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Todo lo demás: Network-First
  event.respondWith(networkFirst(request));
});

function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(CACHE_DYNAMIC).then(function(cache) {
        cache.put(request, clone);
      });
    }
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      return cached || new Response(
        JSON.stringify({ error: 'Sin conexion' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    });
  });
}

function cacheFirst(request, cacheName) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(cacheName).then(function(cache) {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(function() {
      return new Response('', { status: 404, statusText: 'Not Found' });
    });
  });
}
