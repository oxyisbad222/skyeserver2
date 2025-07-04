/*
 * =================================================================================
 * File: /sw.js (Place in the root of your project)
 * Description: Service Worker for PWA offline capabilities.
 * Caches the core application shell and handles network requests.
 * This version is corrected to avoid module-related errors and improve caching.
 * =================================================================================
 */

const CACHE_NAME = 'skyeserver-cache-v2'; // Bumped version to ensure update
const urlsToCache = [
    '/',
    '/index.html',
    '/admin.html',
    '/css/style.css',
    '/js/app.js',
    '/js/admin.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png'
];

// Install event: open cache and add app shell files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache app shell:', error);
            })
    );
});

// Activate event: remove old caches to ensure the new version is used
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});


// Fetch event: serve from cache, fall back to network
self.addEventListener('fetch', event => {
    // We only want to cache GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For API requests, use a network-first strategy so you always get fresh data
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
            .catch(() => {
                // Optional: return a generic JSON error for offline API calls
                return new Response(JSON.stringify({ error: 'You are offline' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // For all other requests (HTML, CSS, JS, images), use a cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return the response from cache
                if (response) {
                    return response;
                }

                // Not in cache - fetch from network, then add it to the cache for next time
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            })
    );
});
