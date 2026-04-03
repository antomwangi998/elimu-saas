// ElimuSaaS Service Worker v16 - Production Ready
const VERSION = 'v21';
const STATIC_CACHE  = `elimu-static-${VERSION}`;
const DYNAMIC_CACHE = `elimu-dynamic-${VERSION}`;
const API_CACHE     = `elimu-api-${VERSION}`;
const MAX_DYNAMIC   = 60;
const MAX_API       = 30;
const NETWORK_TIMEOUT = 8000; // 8 sec timeout

// Static assets to precache
const STATIC_ASSETS = [
  '/', '/index.html', '/manifest.json',
  '/css/main.css',
  '/js/app.js', '/js/init.js',
  '/js/pages/dashboard.js',
  '/js/pages/students.js',
  '/js/pages/fees.js',
  '/js/pages/all-pages-v2.js',
  '/js/pages/advanced-pages.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Network-first APIs (need fresh data)
const NETWORK_FIRST = ['/api/notifications', '/api/threads', '/api/communication'];
// Stale-while-revalidate APIs (ok to show cached)
const STALE_REVALIDATE = ['/api/analytics/dashboard', '/api/students', '/api/staff', '/api/fees/reports/summary', '/api/superadmin/stats'];
// Cache-only (static config rarely changes)
const CACHE_FIRST = ['/api/curriculum/knec-scale', '/api/academics/classes'];

// ── INSTALL ───────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Install error:', err))
  );
});

// ── ACTIVATE ──────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(keys =>
        Promise.all(keys
          .filter(k => ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(k))
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
        )
      ),
      // Preload key API data
      preloadKeyData(),
    ]).then(() => self.clients.claim())
  );
});

async function preloadKeyData() {
  // Preload dashboard data to make app feel instant on next open
  const cache = await caches.open(API_CACHE);
  const toPreload = ['/api/analytics/dashboard', '/api/superadmin/stats'];
  for (const url of toPreload) {
    try {
      const res = await fetchWithTimeout(self.origin + url, {}, 5000);
      if (res && res.status === 200) await cache.put(url, res);
    } catch(e) { /* ignore preload errors */ }
  }
}

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Skip non-GET for API — queue for sync
  if (req.method !== 'GET' && url.pathname.startsWith('/api/')) {
    e.respondWith(networkOrQueue(req));
    return;
  }

  // Navigation requests — network first, fallback to cached index.html
  if (req.mode === 'navigate') {
    e.respondWith(navigationHandler(req));
    return;
  }

  // API GET requests
  if (url.pathname.startsWith('/api/')) {
    const path = url.pathname;
    if (NETWORK_FIRST.some(p => path.startsWith(p))) {
      e.respondWith(networkFirst(req, API_CACHE));
    } else if (STALE_REVALIDATE.some(p => path.startsWith(p))) {
      e.respondWith(staleWhileRevalidate(req, API_CACHE, MAX_API));
    } else if (CACHE_FIRST.some(p => path.startsWith(p))) {
      e.respondWith(cacheFirst(req, API_CACHE));
    } else {
      e.respondWith(networkFirst(req, API_CACHE));
    }
    return;
  }

  // Static assets
  e.respondWith(cacheFirst(req, DYNAMIC_CACHE, MAX_DYNAMIC));
});

// ── STRATEGIES ────────────────────────────────────────────────

async function navigationHandler(req) {
  try {
    const res = await fetchWithTimeout(req, {}, NETWORK_TIMEOUT);
    if (res && res.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch(e) {
    const cached = await caches.match('/index.html') || await caches.match('/');
    return cached || offlinePage();
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetchWithTimeout(req, {}, NETWORK_TIMEOUT);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(req, res.clone());
    }
    return res;
  } catch(e) {
    const cached = await caches.match(req);
    return cached || offlineApiResponse();
  }
}

async function staleWhileRevalidate(req, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetchWithTimeout(req, {}, NETWORK_TIMEOUT)
    .then(res => {
      if (res && res.status === 200) {
        trimCache(cache, maxItems);
        cache.put(req, res.clone());
      }
      return res;
    })
    .catch(() => null);

  return cached || fetchPromise || offlineApiResponse();
}

async function cacheFirst(req, cacheName, maxItems) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const res = await fetchWithTimeout(req, {}, NETWORK_TIMEOUT);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      if (maxItems) trimCache(cache, maxItems);
      cache.put(req, res.clone());
    }
    return res;
  } catch(e) {
    return offlineApiResponse();
  }
}

async function networkOrQueue(req) {
  try {
    return await fetchWithTimeout(req.clone(), {}, NETWORK_TIMEOUT);
  } catch(e) {
    await queueRequest(req);
    return new Response(JSON.stringify({ queued: true, message: 'Action saved — will sync when online' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── HELPERS ───────────────────────────────────────────────────

function fetchWithTimeout(req, opts, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    fetch(req, opts)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

async function trimCache(cache, maxItems) {
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
  }
}

function offlinePage() {
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ElimuSaaS - Offline</title>
<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#fff;text-align:center;padding:20px}
.icon{font-size:64px;margin-bottom:20px}.title{font-size:24px;font-weight:700;margin-bottom:12px}
.sub{color:#7b9fd4;margin-bottom:24px}.btn{background:#2b7fff;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:16px;cursor:pointer}</style></head>
<body><div class="icon">📡</div><div class="title">You're Offline</div>
<div class="sub">ElimuSaaS needs internet to load. Please check your connection.</div>
<button class="btn" onclick="location.reload()">Try Again</button></body></html>`, {
    headers: { 'Content-Type': 'text/html' }
  });
}

function offlineApiResponse() {
  return new Response(JSON.stringify({ error: 'You are offline. Please check your connection.', offline: true }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── BACKGROUND SYNC ───────────────────────────────────────────
const MAX_RETRIES = 3;

async function queueRequest(req) {
  const db = await openDB();
  const body = await req.clone().text().catch(() => '');
  const headers = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  await dbAdd(db, 'queue', {
    url: req.url, method: req.method, headers, body,
    retries: 0, timestamp: Date.now()
  });
}

self.addEventListener('sync', e => {
  if (e.tag === 'elimu-sync') {
    e.waitUntil(replayQueue());
  }
});

async function replayQueue() {
  const db = await openDB();
  const items = await dbGetAll(db, 'queue');
  for (const item of items) {
    if (item.retries >= MAX_RETRIES) {
      await dbDelete(db, 'queue', item.id);
      continue;
    }
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.method !== 'GET' ? item.body : undefined,
      });
      if (res.ok) {
        await dbDelete(db, 'queue', item.id);
      } else {
        await dbUpdate(db, 'queue', item.id, { retries: item.retries + 1 });
      }
    } catch(e) {
      await dbUpdate(db, 'queue', item.id, { retries: item.retries + 1 });
    }
  }
}

// Trigger sync when coming back online
self.addEventListener('message', e => {
  if (e.data === 'SYNC_NOW') {
    replayQueue().catch(console.error);
  }
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'ElimuSaaS', {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'elimu-notif',
      data: { url: data.url || '/', type: data.type },
      actions: data.actions || [
        { action: 'view', title: 'View', icon: '/icons/icon-72.png' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [100, 50, 100],
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.origin) && 'focus' in client) {
            client.postMessage({ type: 'NAVIGATE', url });
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});

// ── INDEXEDDB HELPERS ─────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('elimu-sync-db', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}
const dbTx = (db, store, mode, fn) => new Promise((res, rej) => {
  const tx = db.transaction(store, mode);
  const s = tx.objectStore(store);
  const req = fn(s);
  if (req) req.onsuccess = () => res(req.result);
  tx.oncomplete = () => res(req?.result);
  tx.onerror = () => rej(tx.error);
});
const dbAdd = (db, store, data) => dbTx(db, store, 'readwrite', s => s.add(data));
const dbGetAll = (db, store) => new Promise((res, rej) => {
  const tx = db.transaction(store, 'readonly');
  const req = tx.objectStore(store).getAll();
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});
const dbDelete = (db, store, id) => dbTx(db, store, 'readwrite', s => s.delete(id));
const dbUpdate = (db, store, id, updates) => new Promise((res, rej) => {
  const tx = db.transaction(store, 'readwrite');
  const objStore = tx.objectStore(store);
  const getReq = objStore.get(id);
  getReq.onsuccess = () => {
    const item = { ...getReq.result, ...updates };
    objStore.put(item);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  };
});
