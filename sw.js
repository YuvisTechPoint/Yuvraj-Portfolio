const CACHE_NAME = 'yp-portfolio-v2';
const PRECACHE = [
    '/',
    '/index.html',
    '/404.html',
    '/privacy.html',
    '/Assets/css/main.css',
    '/Assets/js/main.js',
    '/Assets/js/projects-data.js',
    '/Assets/js/premium.js',
    '/Assets/images/title_icon.png',
    '/Assets/images/favicon.svg',
    '/site.webmanifest',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

function networkFirst(request) {
    return fetch(request)
        .then((response) => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/404.html')));
}

function cacheFirst(request) {
    return caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
            if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
        });
    });
}

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    if (url.pathname.startsWith('/Assets/')) {
        event.respondWith(cacheFirst(event.request));
    }
});
