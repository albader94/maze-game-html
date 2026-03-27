const CACHE_NAME = 'buried-spire-v2.3.4';
const urlsToCache = [
  './index.html',
  './manifest.json',
  '../src/css/styles.css',
  '../src/css/ui.css',
  '../src/js/config.js',
  '../src/js/messages.js',
  '../src/js/utils.js',
  '../src/js/soundManager.js',
  '../src/js/gameState.js',
  '../src/js/tutorial.js',
  '../src/js/input.js',
  '../src/js/mapGenerator.js',
  '../src/js/entities.js',
  '../src/js/inventory.js',
  '../src/js/renderer.js',
  '../src/js/gameLogic.js',
  '../src/js/storyNarration.js',
  '../src/js/main.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🔄 Caching game assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Game assets cached successfully');
        self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Failed to cache assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service worker activated');
      self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for caching
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// Message handling for cache updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 