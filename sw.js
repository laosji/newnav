// Service Worker for Cloudflare Pages
// 保存为 sw.js 放在网站根目录

const CACHE_NAME = 'navigation-v1.2';
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/script.js',
    '/data/sites.json',
    '/data/quick-sites.json'
];

function isStaticResource(pathname) {
    return STATIC_CACHE.includes(pathname);
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

    // 只处理同源请求
    if (url.origin !== location.origin) {
        return;
    }

    // 数据文件策略：网络优先，失败时使用缓存
    if (url.pathname.includes('/data/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // 如果网络请求成功，更新缓存
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // 网络失败时使用缓存
                    console.log('网络请求失败，使用缓存:', request.url);
                    return caches.match(request);
                })
        );
        return;
    }

    // 静态资源策略：缓存优先
    if (isStaticResource(url.pathname)) {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request);
            })
        );
        return;
    }
});
