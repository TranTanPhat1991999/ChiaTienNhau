// ChiaCheck - Service Worker for PWA functionality

const CACHE_NAME = 'chiacheck-v1.0.0';
const CACHE_URLS = [
    '/',
    '/chiatien.html',
    '/css/styles.css',
    '/css/themes.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/storage.js',
    '/js/calculations.js',
    '/js/pdf-export.js',
    '/js/voice.js',
    '/js/analytics.js',
    '/manifest.json',
    // External CDN resources
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.10/dayjs.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('ChiaCheck Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('ChiaCheck Service Worker: Caching app shell');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                console.log('ChiaCheck Service Worker: Installed successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('ChiaCheck Service Worker: Installation failed', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('ChiaCheck Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('ChiaCheck Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('ChiaCheck Service Worker: Activated successfully');
                return self.clients.claim();
            })
            .catch(error => {
                console.error('ChiaCheck Service Worker: Activation failed', error);
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached version if available
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Otherwise, fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response as it can only be consumed once
                        const responseToCache = response.clone();
                        
                        // Cache the fetched response for future use
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('ChiaCheck Service Worker: Fetch failed', error);
                        
                        // Return a custom offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/');
                        }
                        
                        throw error;
                    });
            })
    );
});

// Background sync for saving data when connection is restored
self.addEventListener('sync', event => {
    console.log('ChiaCheck Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'background-sync-sessions') {
        event.waitUntil(syncSessions());
    }
});

// Push notifications (for future features)
self.addEventListener('push', event => {
    console.log('ChiaCheck Service Worker: Push notification received');
    
    if (!event.data) {
        return;
    }
    
    const data = event.data.json();
    const options = {
        body: data.body || 'ChiaCheck notification',
        icon: '/manifest-icon-192.png',
        badge: '/manifest-icon-96.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'ChiaCheck', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('ChiaCheck Service Worker: Notification clicked');
    
    event.notification.close();
    
    // Handle notification actions
    if (event.action) {
        switch (event.action) {
            case 'open-app':
                event.waitUntil(
                    clients.openWindow('/')
                );
                break;
            case 'view-session':
                event.waitUntil(
                    clients.openWindow(`/?session=${event.notification.data.sessionId}`)
                );
                break;
            default:
                break;
        }
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(clientList => {
                    // Focus existing window if available
                    for (const client of clientList) {
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Otherwise open new window
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});

// Message handling for communication with main app
self.addEventListener('message', event => {
    console.log('ChiaCheck Service Worker: Message received', event.data);
    
    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                type: 'VERSION',
                version: CACHE_NAME
            });
            break;
            
        case 'CACHE_SESSION':
            event.waitUntil(cacheSession(event.data.session));
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearCache());
            break;
            
        default:
            console.warn('ChiaCheck Service Worker: Unknown message type', event.data.type);
    }
});

// Utility functions
async function syncSessions() {
    try {
        console.log('ChiaCheck Service Worker: Syncing sessions...');
        
        // Get pending sessions from IndexedDB or localStorage
        const pendingSessions = await getPendingSessions();
        
        if (pendingSessions.length === 0) {
            console.log('ChiaCheck Service Worker: No pending sessions to sync');
            return;
        }
        
        // Attempt to sync each session
        const syncPromises = pendingSessions.map(session => 
            syncSession(session).catch(error => {
                console.error('ChiaCheck Service Worker: Failed to sync session', session.id, error);
                return null;
            })
        );
        
        const results = await Promise.all(syncPromises);
        const successCount = results.filter(result => result !== null).length;
        
        console.log(`ChiaCheck Service Worker: Synced ${successCount}/${pendingSessions.length} sessions`);
        
        // Notify the main app about sync completion
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                syncedCount: successCount,
                totalCount: pendingSessions.length
            });
        });
        
    } catch (error) {
        console.error('ChiaCheck Service Worker: Session sync failed', error);
    }
}

async function getPendingSessions() {
    // In a real implementation, this would read from IndexedDB
    // For now, return empty array as we're using localStorage in the main app
    return [];
}

async function syncSession(session) {
    // In a real implementation, this would sync with a backend server
    // For now, just simulate success
    console.log('ChiaCheck Service Worker: Syncing session', session.id);
    return session;
}

async function cacheSession(session) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const sessionUrl = `/session/${session.id}`;
        
        const response = new Response(JSON.stringify(session), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=86400' // 24 hours
            }
        });
        
        await cache.put(sessionUrl, response);
        console.log('ChiaCheck Service Worker: Session cached', session.id);
    } catch (error) {
        console.error('ChiaCheck Service Worker: Failed to cache session', error);
    }
}

async function clearCache() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('ChiaCheck Service Worker: Cache cleared');
    } catch (error) {
        console.error('ChiaCheck Service Worker: Failed to clear cache', error);
    }
}

// Periodic background sync for data cleanup (future feature)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'cleanup-data') {
        event.waitUntil(cleanupOldData());
    }
});

async function cleanupOldData() {
    try {
        console.log('ChiaCheck Service Worker: Cleaning up old data...');
        
        // Notify main app to perform cleanup
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'CLEANUP_REQUEST'
            });
        });
        
    } catch (error) {
        console.error('ChiaCheck Service Worker: Data cleanup failed', error);
    }
}

// Error handling
self.addEventListener('error', event => {
    console.error('ChiaCheck Service Worker: Error occurred', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('ChiaCheck Service Worker: Unhandled promise rejection', event.reason);
});

// Log service worker lifecycle
console.log('ChiaCheck Service Worker: Script loaded');

// Performance monitoring
if ('performance' in self) {
    self.addEventListener('fetch', event => {
        const startTime = performance.now();
        
        event.respondWith(
            (async () => {
                try {
                    const response = await handleFetch(event);
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    // Log slow requests
                    if (duration > 1000) {
                        console.warn(`ChiaCheck Service Worker: Slow request detected: ${event.request.url} took ${duration.toFixed(2)}ms`);
                    }
                    
                    return response;
                } catch (error) {
                    const endTime = performance.now();
                    const duration = endTime - startTime;
                    
                    console.error(`ChiaCheck Service Worker: Request failed: ${event.request.url} after ${duration.toFixed(2)}ms`, error);
                    throw error;
                }
            })()
        );
    });
}

async function handleFetch(event) {
    const cachedResponse = await caches.match(event.request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    const response = await fetch(event.request);
    
    if (response && response.status === 200 && response.type === 'basic') {
        const responseToCache = response.clone();
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, responseToCache);
    }
    
    return response;
}
