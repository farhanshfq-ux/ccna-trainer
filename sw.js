/* sw.js: makes the app work with no signal.
   On first visit it saves every file the app needs. After that, files are served from the phone.
   VERSION and ASSETS are rewritten by tools/build_app.py whenever the content changes. */
var VERSION = "ccna-trainer-d9436fbc057a";
var ASSETS = ["./", "index.html", "manifest.webmanifest", "css/app.css", "data/coach.json", "data/diagnostic.json", "data/flashcards.json", "data/notes.json", "data/plan.json", "data/questions.json", "data/scenarios.json", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "js/cards.js", "js/core.js", "js/course.js", "js/engine.js", "js/learn.js", "js/main.js", "js/notes.js", "js/progress.js", "js/subnet.js", "js/trouble.js", "js/visuals.js"];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(VERSION).then(function (cache) { return cache.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("ccna-trainer") === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (event) {
  var req = event.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  /* the coach's note is small and changes often: try the network first, fall back to the saved copy */
  if (/\/data\/coach\.json$/.test(url.pathname)) {
    event.respondWith(fetch(req).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  /* everything else: the saved copy first, the network only if it is missing */
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).catch(function () { if (req.mode === "navigate") return caches.match("./", { ignoreSearch: true }); return Response.error(); });
  }));
});
