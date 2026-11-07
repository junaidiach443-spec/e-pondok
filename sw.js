/**
 * Service Worker untuk e-Pondok PWA
 * Mengizinkan aplikasi diinstal di HP (Add to Home Screen / Install App)
 */

const CACHE_NAME = 'epondok-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/utils.js',
  './js/auth.js',
  './js/navigation.js',
  './js/dashboard.js',
  './js/santri.js',
  './js/syahriah.js',
  './js/pembayaran-lain.js',
  './js/tagihan-kustom.js',
  './js/pengeluaran.js',
  './js/laporan.js',
  './js/pengaturan.js',
  './js/backup-restore.js',
  './js/cloud-sync.js',
  './js/cetak.js',
  './js/app.js',
  './assets/logo.png',
  './assets/favicon.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
