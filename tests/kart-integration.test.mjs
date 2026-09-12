import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {runInNewContext} from 'node:vm';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const root=new URL('../',import.meta.url),text=p=>readFileSync(new URL(p,root),'utf8');
const {createGameHandler}=await import('data:text/javascript;base64,'+Buffer.from(text('src/game-routes.js')).toString('base64'));
const token='example-test-session',hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('base64url');
const assets=new Map([['index.html',{body:'GAME',type:'text/html'}],['portraits.js',{body:'PHOTOS',type:'text/javascript'}],['motion.js',{body:'TILT',type:'text/javascript'}]]);
const handler=createGameHandler({assets,fallback:{fetch:()=>new Response('EXISTING SITE',{status:209})}});
function environment(row={active:1}){return {DB:{prepare(sql){assert.match(sql,/sessions s JOIN users u/);assert.match(sql,/expires_at>\?/);return {bind(h,date){assert.equal(h,hash);assert.ok(Number.isFinite(Date.parse(date)));return {first:async()=>row};}}}}};}
const request=(path,cookie=token,method='GET')=>new Request('https://site.test'+path,{method,headers:cookie?{Cookie:'db_session='+cookie}:{}});
for(const base of ['/games/wacky-races','/games/proper-karted']){
 test(base+' anonymous pages redirect to existing sign-in',async()=>{const r=await handler.fetch(request(base+'/',null),environment());assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/#fun?games');});
 test(base+' portraits require a valid active session',async()=>{for(const row of [null,{active:0}]){const r=await handler.fetch(request(base+'/portraits.js'),environment(row));assert.equal(r.status,401);assert.doesNotMatch(await r.text(),/PHOTOS/);}});
 test(base+' anonymous assets do not reveal bytes',async()=>{const r=await handler.fetch(request(base+'/portraits.js',null),environment());assert.equal(r.status,401);assert.doesNotMatch(await r.text(),/PHOTOS/);});
 test(base+' authenticated page is private and no-store',async()=>{const r=await handler.fetch(request(base+'/'),environment());assert.equal(r.status,200);assert.equal(await r.text(),'GAME');assert.match(r.headers.get('cache-control'),/private, no-store/);assert.equal(r.headers.get('vary'),'Cookie');assert.match(r.headers.get('content-security-policy'),/script-src 'self';/);});
 test(base+' database failure fails closed',async()=>{const r=await handler.fetch(request(base+'/portraits.js'),{DB:{prepare(){throw Error('offline');}}});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/PHOTOS/);});
 test(base+' unknown assets return 404 rather than site shell',async()=>{const r=await handler.fetch(request(base+'/missing.js'),environment());assert.equal(r.status,404);});
 test(base+' unsupported methods return 405',async()=>{assert.equal((await handler.fetch(request(base+'/',token,'POST'),environment())).status,405);});
 test(base+' HEAD has no body',async()=>{const r=await handler.fetch(request(base+'/',token,'HEAD'),environment());assert.equal(r.status,200);assert.equal(await r.text(),'');});
 test(base+' slash canonicalisation retains launch query',async()=>{const r=await handler.fetch(request(base+'?play=1'),environment());assert.equal(r.status,308);assert.equal(r.headers.get('location'),base+'/?play=1');});
}
test('encoded routes remain protected',async()=>{const r=await handler.fetch(request('/%67ames/wacky-races/portraits.js',null),environment());assert.equal(r.status,401);});
test('site pages and APIs keep the original Worker',async()=>{for(const p of ['/','/api/bootstrap','/media/example','/styles.css','/games/wacky-races-other'])assert.equal((await handler.fetch(request(p),environment())).status,209);});
test('motion allowed only for self, unrelated hardware stays blocked',async()=>{const r=await handler.fetch(request('/games/wacky-races/'),environment());const p=r.headers.get('permissions-policy');assert.match(p,/gyroscope=\(self\)/);assert.match(p,/accelerometer=\(self\)/);assert.match(p,/camera=\(\)/);assert.match(p,/microphone=\(\)/);});
test('remote music is allowed but remote scripts are not',async()=>{const r=await handler.fetch(request('/games/wacky-races/'),environment());const p=r.headers.get('content-security-policy');assert.match(p,/media-src [^;]+https:\/\/incompetech.com/);assert.match(p,/script-src 'self';/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');});
test('complete game page links all required local assets and Games',()=>{const html=text('src/kart-assets/index.html.txt');assert.match(html,/<title>Wacky Races/);assert.doesNotMatch(html,/<iframe|<script>/);assert.match(html,/\/#fun\?games/);for(const m of html.matchAll(/(?:src|href)="([a-z-]+\.(?:js|css))"/g))assert.ok(existsSync(new URL('src/kart-assets/'+m[1]+'.txt',root)));});
test('launcher navigates to a separate full-page race',()=>{const s=text('public/kart-games.js');assert.match(s,/\/games\/wacky-races\/\?play=1/);assert.doesNotMatch(s,/window\.open|<iframe/);assert.match(s,/funPanel/);});
test('host starts only the requested race and pauses browser return',()=>{for(const [search,count]of [['?play=1',1],['',0],['?play=0',0]]){let starts=0,pauses=0;const events={};runInNewContext(text('src/kart-assets/host.js.txt'),{WackyRaces:{startRace(){starts++;},pause(){pauses++;}},URLSearchParams,location:{search},document:{addEventListener(){}},window:{addEventListener(k,fn){events[k]=fn;}}});assert.equal(starts,count);events.pageshow({persisted:true});assert.equal(pauses,1);}});
test('worker imports every game resource and retains original fallback',()=>{const s=text('src/worker-games.js');for(const m of s.matchAll(/from "\.\/kart-assets\/([^"]+)"/g))assert.ok(existsSync(new URL('src/kart-assets/'+m[1],root)));for(const f of ['motion.js','audio.js','models.js','wacky.css'])assert.ok(s.includes(f));assert.match(s,/fallback:original/);assert.doesNotMatch(s,/fetch\(['"]https?:/);});
test('service worker never caches games or private responses',()=>{const s=text('public/sw.js');assert.match(s,/pathname\.startsWith\('\/games\/'\)/);assert.match(s,/no-store\|private/);});
test('five supplied portraits remain valid WebP resources',()=>{const sandbox={};runInNewContext(text('src/kart-assets/portraits.js.txt'),sandbox);assert.equal(sandbox.KartPortraits.length,5);for(const p of sandbox.KartPortraits){assert.ok(p.startsWith('data:image/webp;base64,'));const b=Buffer.from(p.split(',')[1],'base64');assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');}});
test('old local driver store remains and v3 records are separate',()=>{const s=text('src/kart-assets/game.js.txt');assert.match(s,/proper-karted-profiles-v1/);assert.match(s,/`v3:/);});
test('hosted page uses standards mode and current snack wording',()=>{const html=text('src/kart-assets/index.html.txt');assert.match(html,/^<!doctype html>/i);assert.doesNotMatch(html,/10 BISCUITS/);});
