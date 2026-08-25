const CACHE_NAME = "eoc-offline-v1";
const OFFLINE_ASSETS = [
    "/",
    "/static/css/style.css",
    "/static/js/app.js",
    "/static/js/firstaid_data.js",
    "/static/js/offline_bot.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(OFFLINE_ASSETS);
        })
    );
});

self.addEventListener("fetch", (event) => {
    // Cache-first ONLY for static first-aid and app shell assets
    // Live disaster search and API calls MUST stay network-first
    if (OFFLINE_ASSETS.some((asset) => event.request.url.endsWith(asset))) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request);
            })
        );
    }
});
