self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", event => {
  const url = event.request.url;
  // Não interceptar login Firebase / Google — evita falhas subtis em telemóveis (PWA / SW).
  if (/googleapis\.com|accounts\.google\.com|oauth|gstatic\.com|firebaseapp\.com|firebaseio\.com|googleusercontent\.com/i.test(url)) {
    return;
  }
  event.respondWith(fetch(event.request));
});
