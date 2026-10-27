'use strict';
// Bump VERSION whenever a core file changes. Keep each release atomic.
const VERSION = 'allsuite-v5';
const ASSETS = ['./','./index.html','./app.js','./styles.css','./itinerary.json','./foods.json','./all-suite-logo.jpg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
const assetURLs = ASSETS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(VERSION);
  await cache.addAll(assetURLs.map(url => new Request(url, {cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => /^allsuite-v\d+$/.test(key) && key !== VERSION).map(key => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const canonical = url.origin + url.pathname;
  const navigation = event.request.mode === 'navigate';
  if (!navigation && !assetURLs.includes(canonical)) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const key = navigation ? new URL('./index.html', self.registration.scope).href : canonical;
    const saved = await cache.match(key);
    if (saved) return saved;
    // Repair an evicted asset online; never return HTML as JS/JSON/image data.
    const response = await fetch(key);
    if (response.ok) await cache.put(key, response.clone());
    return response;
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_OFFLINE' || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(VERSION);
      const present = await Promise.all(assetURLs.map(url => cache.match(url)));
      event.ports[0].postMessage({ready:present.every(response => response?.ok), version:VERSION});
    } catch { event.ports[0].postMessage({ready:false}); }
  })());
});
