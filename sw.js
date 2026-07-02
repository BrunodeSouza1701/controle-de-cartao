self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const url = event.request.url;
  // Nao interceptar login Firebase/Google nem manter cache antigo do app.
  if (/googleapis\.com|accounts\.google\.com|oauth|gstatic\.com|firebaseapp\.com|firebaseio\.com|googleusercontent\.com/i.test(url)) {
    return;
  }
  event.respondWith(fetch(event.request));
});
