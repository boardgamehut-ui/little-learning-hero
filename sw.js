// 小小學習王 Service Worker — 離線可玩
// 改版部署時把 CACHE 版本號 +1，使用者下次連線就會更新
const CACHE = 'llw-v14';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                      // 意見回報(POST)不攔
  var url = new URL(req.url);
  if (/board\.php|feedback\.php/.test(url.pathname)) return;  // 排行榜/回饋：永遠走網路

  // 導航(開頁面)：網路優先→更新快取；離線就用快取的 index.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (resp) {
        var cp = resp.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', cp); });
        return resp;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // 其他同源資源：快取優先，沒有再抓網路並順手快取
  e.respondWith(
    caches.match(req).then(function (r) {
      return r || fetch(req).then(function (resp) {
        if (resp && resp.ok && url.origin === location.origin) {
          var cp = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, cp); });
        }
        return resp;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
