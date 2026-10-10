var CACHE = "td4-v1";
var FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./game.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./gloria-avatar.png",
  "./gloria-chibi.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  var isCode = e.request.mode === "navigate" || /[?&](v=)/.test(url) || /\.(js|css)([?#]|$)/.test(url);
  if (isCode) {
    // network-first for pages & code: updates land immediately, offline falls back to cache
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
  } else {
    // cache-first for images & icons
    e.respondWith(
      caches.match(e.request).then(function (res) {
        return res || fetch(e.request);
      })
    );
  }
});
