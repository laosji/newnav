// Service Worker for Cloudflare Pages
// 保存为 sw.js 放在网站根目录

const CACHE_NAME = 'navigation-v1.3'; // Updated cache name
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/script.js'
];

// 改进缓存策略
const CACHE_STRATEGY = {
    static: 'cache-first',
    data: 'network-first',
    images: 'cache-first-with-refresh'
};

function isStaticResource(pathname) {
    return STATIC_CACHE.includes(pathname);
}

// 添加后台同步功能
async function syncDataInBackground() {
    console.log('Service Worker: Executing background sync...');
    try {
        const dataUrls = [
            '/data/sites.json',
            '/data/quick-sites.json'
        ];
        const cache = await caches.open(CACHE_NAME);
        for (const url of dataUrls) {
            const response = await fetch(url);
            if (response.status === 200) {
                await cache.put(url, response);
                console.log(`Service Worker: Cached fresh data for ${url}`);
            }
        }
    } catch (error) {
        console.error('Service Worker: Background sync failed:', error);
    }
}

// 安装事件
self.addEventListener('install', (event) => {
    console.log('Service Worker 安装中...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('缓存已打开');
                return cache.addAll(STATIC_CACHE);
            })
            .catch((error) => {
                console.error('缓存添加失败:', error);
            })
    );

    // 强制激活新的 Service Worker
    self.skipWaiting();
});

// 激活事件
self.addEventListener('activate', (event) => {
    console.log('Service Worker 激活中...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    // 立即控制所有客户端
    self.clients.claim();
});

// 网络请求拦截
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (url.origin !== location.origin) {
        return;
    }

    const requestPath = url.pathname;
    let strategy;

    if (isStaticResource(requestPath)) {
        strategy = CACHE_STRATEGY.static;
    } else if (requestPath.includes('/data/')) {
        strategy = CACHE_STRATEGY.data;
    } else if (/\.(png|jpe?g|gif|svg|webp)$/i.test(requestPath)) {
        strategy = CACHE_STRATEGY.images;
    }

    if (strategy === 'cache-first') {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request);
            })
        );
    } else if (strategy === 'network-first') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
    } else if (strategy === 'cache-first-with-refresh') {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                const fetchedResponsePromise = fetch(request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(err => {
                    console.warn(`Fetch failed for ${request.url}; returning cached response if available.`, err);
                    return cachedResponse;
                });
                return cachedResponse || fetchedResponsePromise;
            })
        );
    }
});

// 添加后台同步事件监听
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(syncDataInBackground());
    }
});
