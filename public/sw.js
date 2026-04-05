/**
 * Service Worker for Prime Hotels PWA
 * 
 * Provides offline caching for static assets and API responses.
 * Implements a "Clean Shell" strategy to resolve navigation redirect errors.
 */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'v8';
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

const AUTH_SENSITIVE_PATHS = new Set([
    '/login',
    '/forgot-password',
    '/reset-password',
    '/complete-invite',
]);

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log(`[SW ${VERSION}] Caching static assets`);
            return Promise.all(
                STATIC_ASSETS.map(async (asset) => {
                    try {
                        await cache.add(asset);
                    } catch (error) {
                        console.warn(`[SW ${VERSION}] Failed to cache asset:`, asset, error);
                    }
                })
            );
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
                    .filter((name) =>
                        name.startsWith('prime-hotels-') &&
                        name !== STATIC_CACHE &&
                        name !== DYNAMIC_CACHE
                    )
                    .map((name) => {
                        console.log(`[SW ${VERSION}] Deleting old cache:`, name);
                        return caches.delete(name);
                    })
            );
        })
    );
    self.clients.claim();
});

// Allow the page to activate a waiting service worker immediately.
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Chrome extensions and non-http(s)
    if (!url.protocol.startsWith('http')) return;

    if (url.origin !== self.location.origin) return;

    // 1. Navigation Redirect Fix (App Shell Pattern)
    // Navigation requests (mode: navigate) can fail if the SW returns redirected/opaqueredirect responses.
    if (request.mode === 'navigate') {
        const skipCachedShell = isAuthSensitivePath(url.pathname);
        
        // PRESERVE HASH: Auth callbacks need the hash (e.g., #access_token=xxx)
        // The hash is not sent to the server, but we need to ensure the client gets it
        const originalUrl = new URL(request.url);
        const hasAuthHash = originalUrl.hash && (
            originalUrl.hash.includes('access_token=') ||
            originalUrl.hash.includes('refresh_token=') ||
            originalUrl.hash.includes('type=')
        );
        
        // Log navigation for debugging
        console.log(`[SW ${VERSION}] Navigation request: ${url.pathname}`, {
            hasHash: !!originalUrl.hash,
            hasAuthHash,
            skipCachedShell
        });
        
        event.respondWith(
            (async () => {
                // For auth callbacks with hash, ALWAYS go to network first
                // The hash is critical and must not be served from cache
                if (hasAuthHash) {
                    console.log(`[SW ${VERSION}] Auth callback detected, bypassing cache: ${url.pathname}`);
                    try {
                        const response = await fetch(request, {
                            redirect: 'follow',
                            credentials: 'same-origin',
                            cache: 'no-store',
                        });
                        
                        const safeNetworkResponse = toSafeResponse(request, response);
                        if (isSuccessfulHtmlResponse(safeNetworkResponse)) {
                            console.log(`[SW ${VERSION}] Serving auth callback from network: ${url.pathname}`);
                            return safeNetworkResponse;
                        }
                    } catch (error) {
                        console.warn(`[SW ${VERSION}] Network fetch failed for auth callback:`, error);
                    }
                    
                    // If network fails for auth callback, try shell but DON'T cache
                    try {
                        const shellUrl = new URL('/index.html', self.location.origin).toString();
                        const response = await fetch(shellUrl, {
                            redirect: 'follow',
                            credentials: 'same-origin',
                            cache: 'no-store',
                        });

                        const safeNetworkResponse = toSafeResponse(request, response);
                        if (isSuccessfulHtmlResponse(safeNetworkResponse)) {
                            console.log(`[SW ${VERSION}] Serving shell for auth callback: ${url.pathname}`);
                            // Return shell but preserve the original URL's hash
                            // The browser will keep the hash since we're not redirecting
                            return new Response(safeNetworkResponse.body, {
                                status: safeNetworkResponse.status,
                                statusText: safeNetworkResponse.statusText,
                                headers: safeNetworkResponse.headers,
                            });
                        }
                    } catch (error) {
                        console.error(`[SW ${VERSION}] Shell fetch failed for auth callback:`, error);
                    }
                    
                    return createOfflineShellResponse();
                }
                
                // Try navigation preload first (if enabled)
                try {
                    const preloadResponse = await event.preloadResponse;
                    const safePreloadResponse = toSafeResponse(request, preloadResponse);
                    if (isSuccessfulHtmlResponse(safePreloadResponse)) {
                        console.log(`[SW ${VERSION}] Serving from preload: ${url.pathname}`);
                        await cacheAppShell(safePreloadResponse.clone(), url.pathname);
                        return safePreloadResponse;
                    }
                } catch (error) {
                    console.warn(`[SW ${VERSION}] Navigation preload failed for ${url.pathname}:`, error);
                }

                // Try network fetch
                try {
                    const response = await fetch(request, {
                        redirect: 'follow',
                        credentials: 'same-origin',
                        cache: 'no-store',
                    });

                    const safeNetworkResponse = toSafeResponse(request, response);
                    if (isSuccessfulHtmlResponse(safeNetworkResponse)) {
                        console.log(`[SW ${VERSION}] Serving from network: ${url.pathname}`);
                        await cacheAppShell(safeNetworkResponse.clone(), url.pathname);
                        return safeNetworkResponse;
                    }
                } catch (error) {
                    console.warn(`[SW ${VERSION}] Network fetch failed for ${url.pathname}:`, error);
                }

                // Fallback to app shell
                try {
                    const shellUrl = new URL('/index.html', self.location.origin).toString();
                    const response = await fetch(shellUrl, {
                        redirect: 'follow',
                        credentials: 'same-origin',
                        cache: 'no-store',
                    });

                    const safeNetworkResponse = toSafeResponse(request, response);
                    if (isSuccessfulHtmlResponse(safeNetworkResponse)) {
                        console.log(`[SW ${VERSION}] Serving app shell for: ${url.pathname}`);
                        const preservedResponse = new Response(safeNetworkResponse.body, {
                            status: safeNetworkResponse.status,
                            statusText: safeNetworkResponse.statusText,
                            headers: safeNetworkResponse.headers,
                        });
                        if (!skipCachedShell) {
                            await cacheAppShell(safeNetworkResponse.clone(), '/index.html');
                        }
                        return preservedResponse;
                    }
                } catch (error) {
                    console.warn(`[SW ${VERSION}] Shell fetch failed:`, error);
                }

                // Last resort: cached shell
                if (!skipCachedShell) {
                    const cachedShell = await getCachedAppShell(request);
                    if (cachedShell) {
                        console.log(`[SW ${VERSION}] Serving cached shell for: ${url.pathname}`);
                        return new Response(cachedShell.body, {
                            status: cachedShell.status,
                            statusText: cachedShell.statusText,
                            headers: cachedShell.headers,
                        });
                    }
                }

                console.error(`[SW ${VERSION}] All navigation strategies failed for: ${url.pathname}`);
                return createOfflineShellResponse();
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
        request.destination === 'font' ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico')
    ) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 3. JS/CSS assets - network-first with cache fallback
    // This prevents white screen when old hashed chunks are requested after deployment
    if (
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'worker'
    ) {
        event.respondWith(
            (async () => {
                try {
                    // Always try network first for fresh builds
                    const networkResponse = await fetch(request, {
                        cache: 'no-store',
                        credentials: 'same-origin',
                    });
                    
                    if (networkResponse.ok) {
                        // Update cache with fresh version for offline use
                        const cache = await caches.open(STATIC_CACHE);
                        await cache.put(request, networkResponse.clone());
                        return networkResponse;
                    }
                } catch (error) {
                    console.warn(`[SW ${VERSION}] Network fetch failed for ${request.destination}:`, request.url, error);
                }
                
                // Fallback to cached version if network fails
                const cached = await caches.match(request);
                if (cached) {
                    return cached;
                }
                
                // If not in cache and network failed, let browser handle the 404
                // This will trigger the error recovery in main.tsx
                return fetch(request);
            })()
        );
        return;
    }

    // 4. Default - network with cache fallback
    event.respondWith(networkFirst(request));
});

function toSafeResponse(request, response) {
    if (!response) return null;
    const requiresNonRedirectResponse = request.redirect !== 'follow';
    const isRedirectStatus = response.status >= 300 && response.status < 400;

    if (!response.redirected && response.type !== 'opaqueredirect') {
        if (requiresNonRedirectResponse && isRedirectStatus) {
            return null;
        }
        return response;
    }
    if (response.type === 'opaqueredirect' && requiresNonRedirectResponse) {
        return null;
    }
    if (!requiresNonRedirectResponse) {
        return response;
    }
    if (isRedirectStatus) {
        return null;
    }
    try {
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    } catch {
        return null;
    }
}

function normalizePathname(pathname) {
    if (!pathname) return '/';
    const normalized = pathname.endsWith('/') && pathname.length > 1
        ? pathname.replace(/\/+$/, '')
        : pathname;
    return normalized || '/';
}

function isAuthSensitivePath(pathname) {
    return AUTH_SENSITIVE_PATHS.has(normalizePathname(pathname));
}

function isSuccessfulHtmlResponse(response) {
    if (!response || !response.ok) return false;
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('text/html');
}

async function cacheAppShell(response, sourcePath) {
    if (!isSuccessfulHtmlResponse(response)) return;
    if (isAuthSensitivePath(sourcePath)) return;

    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled([
        cache.put('/index.html', response.clone()),
        cache.put('/', response.clone()),
    ]);
}

async function getCachedAppShell(request) {
    const cache = await caches.open(STATIC_CACHE);
    for (const path of ['/index.html', '/']) {
        const cached = await cache.match(path);
        const safeCached = toSafeResponse(request, cached);
        if (isSuccessfulHtmlResponse(safeCached)) {
            return safeCached;
        }
    }

    return null;
}

function createOfflineShellResponse() {
    return new Response(
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PHG Connect</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8f6f1;
        color: #1f3b5b;
        font: 16px/1.5 system-ui, sans-serif;
      }
      main {
        max-width: 28rem;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
      }
      p {
        margin: 0;
        color: #4f6480;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Connection problem</h1>
      <p>PHG Connect could not load the app shell. Refresh the page when the network is back.</p>
    </main>
  </body>
</html>`,
        {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Cache-Control': 'no-store',
            },
        }
    );
}

// Cache-first strategy
async function cacheFirst(request) {
    const cached = await caches.match(request);
    const safeCached = toSafeResponse(request, cached);
    if (safeCached) return safeCached;

    try {
        const response = await fetch(request);
        const safeResponse = toSafeResponse(request, response);
        if (!safeResponse) {
            return new Response('Asset not available offline', { status: 503 });
        }

        if (shouldCacheResponse(request, safeResponse)) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, safeResponse.clone());
        }
        return safeResponse;
    } catch {
        return new Response('Asset not available offline', { status: 503 });
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        const safeResponse = toSafeResponse(request, response);
        if (!safeResponse) {
            throw new Error('Unsafe redirect response');
        }

        if (shouldCacheResponse(request, safeResponse)) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, safeResponse.clone());
        }
        return safeResponse;
    } catch {
        const cached = await caches.match(request);
        const safeCached = toSafeResponse(request, cached);
        if (safeCached) return safeCached;
        return new Response('Network error', { status: 503 });
    }
}

function shouldCacheResponse(request, response) {
    if (!response || response.status !== 200) return false;
    if (request.mode === 'navigate') return false;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) return false;

    return true;
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

// Handle navigation preload errors gracefully
self.addEventListener('error', (event) => {
    console.warn(`[SW ${VERSION}] Error:`, event.message);
});

self.addEventListener('unhandledrejection', (event) => {
    console.warn(`[SW ${VERSION}] Unhandled rejection:`, event.reason);
    event.preventDefault();
});
