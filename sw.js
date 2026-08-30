// Service Worker — network-first สำหรับหน้าเว็บ (ออนไลน์ได้เวอร์ชันล่าสุดเสมอ), cache-first สำหรับไฟล์คงที่
// อยากล้างแคชยกชุด: เปลี่ยนเลขเวอร์ชันด้านล่าง (v1 -> v2 -> ...)
const CACHE = "math-challenge-v2";
const APP_SHELL = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png",
  "https://cdn.tailwindcss.com/3.4.17",
  "https://cdn.jsdelivr.net/npm/lucide@0.263.0/dist/umd/lucide.min.js"
];
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(APP_SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                 // POST ไป backend (API) ไม่ยุ่ง
  const url = new URL(req.url);
  if (url.hostname.includes("script.google") || url.hostname.includes("googleusercontent")) return; // API ปล่อยไปเน็ตตรง

  // หน้าเว็บหลัก = network-first (ออนไลน์ได้ของใหม่เสมอ, ออฟไลน์ใช้แคช)
  const isPage = req.mode === "navigate" || (url.origin === location.origin && url.pathname.endsWith(".html"));
  if (isPage) {
    // no-store = ข้าม HTTP cache ของเบราว์เซอร์ ดึง index.html สดจากเซิร์ฟเวอร์เสมอ (เห็นเวอร์ชันใหม่ทันที)
    e.respondWith(
      fetch(url.pathname, { cache: "no-store" }).then(res => {
        caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // ไฟล์คงที่ (ไอคอน, CDN) = cache-first เพื่อความเร็ว
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && url.origin === location.origin) caches.open(CACHE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
