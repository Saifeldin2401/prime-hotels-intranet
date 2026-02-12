/**
 * Service Worker for Prime Hotels PWA
 * 
 * Provides offline caching for static assets and API responses.
 * Implements the App Shell pattern for ultra-reliable SPA navigation.
 */

const VERSION = 'v3';
const CACHE_NAME = `prime-hotels-${VERSION}`;
const STATIC_CACHE = `prime-hotels-static-${VERSION}`;
const DYNAMIC_CACHE = `prime-hotels-dynamic-${VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/prime-logo-dark.png',
    '/prime-logo-light.png',
    '/vite.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Chrome extensions and non-http(s)
    if (!url.protocol.startsWith('http')) return;

    // 1. App Shell Pattern for Navigations
    // This solves the "redirected response" error by serving the 200 OK index.html shell
    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                // Try the cache first for the shell
                const cachedResponse = await caches.match('/index.html');
                if (cachedResponse) return cachedResponse;

                // Fallback to network if shell isn't cached yet
                try {
                    // BE CAREFUL: Navigation requests cannot return a redirected response.
                    // If we fetch and it redirects, we should return the redirect as 'manual'
                    // or let it fail and return a custom error.
                    const fetchOptions = { redirect: 'manual' };
                    const response = await fetch(request, fetchOptions);

                    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
                        // Let the browser handle the redirect itself
                        return response;
                    }

                    return response;
                } catch (error) {
                    return new Response('Offline', { status: 503 });
                }
            })()
        );
        return;
    }

    // 2. API requests - network first, fallback to cache
    if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 3. Static assets - cache first, fallback to network
    if (
        request.destination === 'image' ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font' ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico')
    ) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 4. Default - network with cache fallback
    event.respondWith(networkFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Asset not available offline', { status: 503 });
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Network error', { status: 503 });
    }
}

// Handle push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    } catch (e) {
        console.error('Push error:', e);
    }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
