const CACHE = 'duck-bear-hq-v7-2-accounts-passkeys';
const CORE=['/','/index.html','/home.css?v=4','/home.js?v=7.4.0','/hq/style.css?v=7.4.0','/hq/public.css?v=7.4.0','/hq/duck-bear.svg','/assets/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.searchParams.has('reset')||/^\/(info|about|hub|account|legacy-account|our-space|family-tree|scrapbook|plans|image-library|settings|admin|shop|orders|points|sign-in|reset-password|verify-email|accept-invitation)([/.]|$)/.test(u.pathname)||/^\/menus\/(planner|ideas|recipes|reviews|shopping|weeks|member|meals)(\/|$)/.test(u.pathname))return;
  if(u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/media/')||u.pathname.startsWith('/games/'))return;
  e.respondWith(fetch(r).then(resp=>{
    if(resp.ok&&!/no-store|private/i.test(resp.headers.get('cache-control')||'')){
      const copy=resp.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{}));
    }
    return resp;
  }).catch(async()=>{const cached=await caches.match(r);if(cached)return cached;if(r.mode==='navigate')return caches.match('./index.html');throw new Error('Offline');}));
});
