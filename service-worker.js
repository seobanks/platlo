const CACHE_NAME = "platlo-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./properties.html",
  "./property.html",
  "./post-property.html",
  "./dashboard.html",
  "./manifest.json",
  "./css/style.css",
  "./css/components.css",
  "./js/config.js",
  "./js/app.js",
  "./js/properties.js",
  "./js/post.js",
  "./js/dashboard.js",
  "./images/hero_bg.jpg",
  "./images/property_1.jpg",
  "./images/property_2.jpg",
  "./images/property_3.jpg",
  "./images/property_4.jpg"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache...", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Intercept & Cache Matching (Network-first falling back to Cache)
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and local scope fetches
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, clone it and cache it dynamically
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        console.log("[Service Worker] Offline detected. Serving asset from Cache:", event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a page/route is fetched but missing from cache, fallback to main shell
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
  );
});
