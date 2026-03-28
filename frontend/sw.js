// ============================================================
// ElimuSaaS Service Worker — PWA Offline Support
// ============================================================
const CACHE_NAME = 'elimu-saas-v13';
const STATIC_CACHE = 'elimu-static-v13';
const API_CACHE = 'elimu-api-v7';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/init.js',
  '/js/pages/all-pages-v2.js',
  '/js/pages/advanced-pages.js',
  '/js/pages/complete-pages.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: cache static assets ─────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== STATIC_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for static ──────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // API calls: network first, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — no network connection', offline: true }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 })
      )
    );
    return;
  }

  // Static assets: cache first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Serve index.html for navigation requests when offline
        if (request.mode === 'navigate') return caches.match('/index.html');
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'ElimuSaaS', body: 'New notification' };
  try { data = event.data.json(); } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: data.data || {},
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});
