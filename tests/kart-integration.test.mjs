import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto=webcrypto;
const root=new URL('../',import.meta.url);
const text=p=>readFileSync(new URL(p,root),'utf8');
const assets=new Map([['index.html',{body:'GAME',type:'text/html'}],['portraits.js',{body:'PHOTOS',type:'text/javascript'}]]);
const token='example-session-token-not-a-password';
const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('base64url');
async function load(){ assert.ok(existsSync(new URL('src/game-routes.js',root)),'authenticated game routes have not been implemented');return await import('../src/game-routes.js');}
function environment(row={active:1}) {
  let reads=0;
  return {
    get reads(){return reads;},
    DB:{
      prepare(sql){
        assert.match(sql,/sessions s JOIN users u/);
        assert.match(sql,/s\.expires_at>\?/);
        return {
          bind(h,date){
            assert.equal(h,hash);
            assert.ok(Number.isFinite(Date.parse(date)));
            return {async first(){reads++;return row;}};
          }
        };
      }
    }
  };
}
const request=(path='/',cookie=token,method='GET')=>new Request('https://hq.test'+path,{method,headers:cookie?{Cookie:'db_session='+cookie}:{}});
const handler=async()=> (await load()).createGameHandler({assets,fallback:{fetch:()=>new Response('OLD SITE',{status:209})}});
test('game has its own complete page, external scripts and return links',()=>{assert.ok(existsSync(new URL('src/kart-assets/index.html.txt',root)),'standalone game page missing');const html=text('src/kart-assets/index.html.txt');assert.match(html,/<title>Proper Karted/);assert.doesNotMatch(html,/<iframe/);assert.doesNotMatch(html,/<script>(?!\s*<\/script>)/);assert.match(html,/\/\#fun\?games/);for(const m of html.matchAll(/(?:src|href)="([a-z-]+\.(?:js|css))"/g))assert.ok(existsSync(new URL('src/kart-assets/'+m[1]+'.txt',root)),m[1]+' missing');});
test('Games launcher uses a full-page link, not a popup or frame',()=>{const s=text('public/kart-games.js');assert.match(s,/\/games\/proper-karted\/\?play=1/);assert.doesNotMatch(s,/window\.open|<iframe/);assert.match(s,/funPanel/);});
test('host starts a race only when requested and handles browser return',()=>{const s=text('src/kart-assets/host.js.txt');assert.match(s,/get\('play'\) === '1'/);assert.match(s,/startRace\(\)/);assert.match(s,/pageshow/);});
test('five courses and supplied drivers remain in game',()=>{const s=text('src/kart-assets/core.js.txt');for(const name of ['Hyde Park Hustle','Regent Street Rush','Westminster Wobble','Camden Caper','Docklands Dash','Zachary','Guannan','Sara','Samy','Mulan'])assert.ok(s.includes(name),name);});
test('anonymous game navigation redirects to the existing sign-in flow',async()=>{const f=await handler(),env=environment();const r=await f.fetch(request('/games/proper-karted/',null),env);assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/#fun?games');assert.equal(env.reads,0);});
test('anonymous portraits are denied without returning any portrait bytes',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted/portraits.js',null),environment());assert.equal(r.status,401);assert.doesNotMatch(await r.text(),/PHOTOS/);});
test('valid session loads the game with no-store and a restrictive script policy',async()=>{const f=await handler(),env=environment();const r=await f.fetch(request('/games/proper-karted/'),env);assert.equal(r.status,200);assert.equal(await r.text(),'GAME');assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);assert.equal(r.headers.get('vary'),'Cookie');assert.equal(env.reads,1);});
test('a revoked, expired or unknown session cannot access portraits',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted/portraits.js'),environment(null));assert.equal(r.status,401);});
test('a disabled user is denied',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted/portraits.js'),environment({active:0}));assert.equal(r.status,401);});
test('database failure fails closed',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted/'),{DB:{prepare(){throw new Error('database unavailable');}}});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/GAME/);});
test('unknown assets do not fall through to the application shell',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted/not-real.js'),environment());assert.equal(r.status,404);});
test('POST cannot launch or mutate the game',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted/',token,'POST'),environment());assert.equal(r.status,405);});
test('HEAD authenticates but does not send a body',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted/',token,'HEAD'),environment());assert.equal(r.status,200);assert.equal(await r.text(),'');});
test('path without slash is canonicalised without losing launch query',async()=>{const f=await handler();const r=await f.fetch(request('/games/proper-karted?play=1'),environment());assert.equal(r.status,308);assert.equal(r.headers.get('location'),'/games/proper-karted/?play=1');});
test('percent-encoded game route still requires sign-in',async()=>{const f=await handler();const r=await f.fetch(request('/%67ames/proper-karted/portraits.js',null),environment());assert.equal(r.status,401);});
test('unrelated pages and APIs retain the existing Worker',async()=>{const f=await handler();for(const p of ['/','/api/bootstrap','/media/example','/styles.css']){const r=await f.fetch(request(p),environment());assert.equal(r.status,209);}});
test('service worker never caches games or private no-store responses',()=>{const s=text('public/sw.js');assert.match(s,/pathname\.startsWith\('\/games\/'\)/);assert.match(s,/no-store/);});

test('Worker entrypoint imports all game resources as private text modules',()=>{
 const config=JSON.parse(text('wrangler.jsonc'));
 assert.equal(config.main,'./src/worker-games.js');
 assert.ok(config.assets.run_worker_first.includes('/games/*'));
 const entry=text('src/worker-games.js');
 for(const m of entry.matchAll(/from "\.\/kart-assets\/([^"]+)"/g))assert.ok(existsSync(new URL('src/kart-assets/'+m[1],root)));
 assert.match(entry,/fallback:original/);
 assert.doesNotMatch(entry,/fetch\(['"]https?:/);
});
test('site shell includes the Games extension after the original app',()=>{
 const s=text('public/index.html');
 assert.ok(s.indexOf('app.js?v=5.1.0')<s.indexOf('kart-games.js?v=1'));
 assert.ok(s.includes('id="checkoutForm"'));
 assert.ok(s.includes('id="dataDialog"'));
});
test('play=1 executes the real host launch handler once',async()=>{
 const {runInNewContext}=await import('node:vm');
 for(const [search,expected] of [['?play=1',1],['',0],['?play=0',0]]){
  let starts=0,pauses=0;const events={};
  runInNewContext(text('src/kart-assets/host.js.txt'),{
   ProperKarted:{startRace(){starts++;},pause(){pauses++;}},URLSearchParams,location:{search},
   document:{addEventListener(){}},window:{addEventListener(k,fn){events[k]=fn;}}
  });
  assert.equal(starts,expected);
  events.pageshow({persisted:true});assert.equal(pauses,1);
 }
});
test('five supplied portraits are valid small WebP data resources',async()=>{
 const {runInNewContext}=await import('node:vm');const sandbox={};runInNewContext(text('src/kart-assets/portraits.js.txt'),sandbox);
 assert.equal(sandbox.KartPortraits.length,5);
 for(const photo of sandbox.KartPortraits){assert.ok(photo.startsWith('data:image/webp;base64,'));const b=Buffer.from(photo.split(',')[1],'base64');assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');}
});
