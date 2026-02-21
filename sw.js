const CACHE_NAME = 'maternity-nutrition-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/nutrition.js',
    './js/weight.js',
    './js/shopping.js',
    './js/recipes.js',
    './js/onboarding.js',
    './js/sharing.js',
    './js/app.js',
    './js/reminders.js',
    './data/foods.json',
    './data/nutrients.json',
    './data/recipes.json',
    './manifest.json'
];

// インストール時にコアアセットをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// ネットワーク優先、失敗時はキャッシュから返す
self.addEventListener('fetch', (event) => {
    // 外部APIリクエストはキャッシュしない
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 成功したレスポンスをキャッシュに保存
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                });
                return response;
            })
            .catch(() => {
                // オフライン時はキャッシュから返す
                return caches.match(event.request);
            })
    );
});
