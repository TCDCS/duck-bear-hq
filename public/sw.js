const CACHE = 'duck-bear-hq-v6-1-setup-seven';
const CORE=['./','./index.html','./home.css?v=4','./home.js?v=4','./account.html','./styles.css?v=5.1.0','./app.js?v=5.1.0','./zoo.css?v=5.1.0','./kart-games.js?v=1','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/media/')||u.pathname.startsWith('/games/'))return;
  e.respondWith(fetch(r).then(resp=>{
    if(resp.ok&&!/no-store|private/i.test(resp.headers.get('cache-control')||'')){
      const copy=resp.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{}));
    }
    return resp;
  }).catch(async()=>{const cached=await caches.match(r);if(cached)return cached;if(r.mode==='navigate')return caches.match('./index.html');throw new Error('Offline');}));
});
