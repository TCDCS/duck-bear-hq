/* Only application code is cached here. Book bytes and private records live in per-user IndexedDB. */
const CACHE='db-books-code-0.2.0';
const STATIC=['/books/index.html','/books/styles.css','/books/library.mjs','/books/common.mjs','/books/offline.mjs','/books/sync.mjs','/books/publication.mjs','/books/reader.mjs','/books/manifest.json','/books/vendor/jszip.min.js','/books/vendor/purify.min.js','/books/vendor/epub.min.js','/books/vendor/pdf.mjs','/books/vendor/pdf.worker.mjs'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const path of STATIC){const r=await fetch(path,{credentials:'same-origin',cache:'reload'});if(!r.ok||r.redirected)throw Error('Offline shell is not available');await cache.put(path,r);}await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('db-books-code-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith('/books/'))return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(async()=>await(await caches.open(CACHE)).match('/books/index.html')||Response.error()));return;}
 if(STATIC.includes(u.pathname))event.respondWith((async()=>{const cached=await(await caches.open(CACHE)).match(u.pathname);return cached||fetch(event.request);})());
});
