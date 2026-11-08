/**
 * Service Worker untuk e-Pondok PWA
 * Mengizinkan aplikasi diinstal di HP (Add to Home Screen / Install App)
 * & Menjamin pembaruan hosting langsung tampil (Network-First untuk kode aplikasi)
 */

const CACHE_NAME = 'epondok-v6';
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

  const url = event.request.url;

  // Lewati request API Google Apps Script & Google Sheets agar selalu live
  if (url.includes('script.google.com') || url.includes('google.com/macros')) {
    return;
  }

  // File kode aplikasi & navigasi: NETWORK-FIRST
  // Memastikan perubahan kode di hosting selalu segera diambil tanpa tertahan cache lawas
  const isApplicationCode = event.request.mode === 'navigate' ||
                            event.request.destination === 'script' ||
                            event.request.destination === 'style' ||
                            url.includes('/js/') ||
                            url.includes('/css/') ||
                            url.endsWith('.html');

  if (isApplicationCode) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline, ambil dari cache
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html')
                .then((res) => res || caches.match('/'))
                .then((res) => res || caches.match('./'));
            }
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Aset statis (gambar, font, logo): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
