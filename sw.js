// Service Worker — 缓存策略：优先网络，网络失败时使用缓存
const CACHE_NAME = 'blog-cache-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/admin.html',
  '/editor.html',
  '/dashboard.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// 请求：网络优先，失败回退缓存
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 和 chrome-extension
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功响应存入缓存（仅同源）
        if (response.ok && new URL(event.request.url).origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，尝试缓存
        return caches.match(event.request).then((cached) => {
          return cached || new Response('离线状态，请联网后重试', { status: 503 });
        });
      })
  );
});
