/* 홈 화면에 추가했을 때 앱처럼 열리게 하는 서비스 워커.
 * 항상 인터넷에서 새 파일을 먼저 받고(새 버전 바로 반영), 연결이 없을 때만 저장해 둔 파일을 씁니다.
 * 입력한 내용은 어디로도 보내지 않습니다. */
const CACHE = 'ladder-v1';
const CORE = ['./','index.html','css/style.css','css/ladder.css','js/ladder.js','og.png','js/core.js','js/ui.js','js/app.js','js/install.js','manifest.webmanifest','icon.svg','icons/app-192.png','privacy.html'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
