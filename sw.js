// sw.js

const CACHE_NAME = 'mess-manager-cache-v2';

// The critical files required to load the app offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './js/app.js',
    './js/database.js',
    './js/ui.js',
    './js/export.js',
    'https://cdn.tailwindcss.com' // Caches the Tailwind styling engine
];

// 1. INSTALLATION: Cache all core assets immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching Files');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. ACTIVATION: Clean up old versions of the cache if we update the app
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing Old Cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. FETCHING: Intercept network requests (Offline-First Strategy)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // If the file is in the cache, return it instantly (Offline Mode)
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise, fetch it from the internet and dynamically cache it for next time
                return fetch(event.request).then((networkResponse) => {
                    // Only cache valid requests from our own app to prevent bloating
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }
                    
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return networkResponse;
                });
            })
            .catch(() => {
                // If offline and the file isn't cached, always fallback to the main app skeleton
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});

