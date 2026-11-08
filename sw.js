/**
 * Service Worker untuk e-Pondok PWA
 * Mengizinkan aplikasi diinstal di HP (Add to Home Screen / Install App)
 */

const CACHE_NAME = 'epondok-v5';
const ASSETS_TO_CACHE = [
  '/',
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/utils.js',
  './js/auth.js',
  './js/navigation.js',
  './js/dashboard.js',
  './js/santri.js',
  './js/izin-keluar.js',
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
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => {}))
      );
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
  if (!event.request.url.startsWith('http')) return;

  // Navigasi halaman: prioritaskan jaringan, fallback ke cache jika offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html')
          .then((res) => res || caches.match('/'))
          .then((res) => res || caches.match('./'));
      })
    );
    return;
  }

  // Aset statis: cache-first dengan background update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
