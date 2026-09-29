import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mealStatus,SERVING_TIMES} from '../public/menus/menus.js';
import {publicMealStatus} from '../src/hq/extras.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
import {fixture,call} from './helpers/hq-fixture.mjs';
const handler=createHqHandler({fetch:async()=>new Response('fallback',{status:404})});

test('meal status flips at the requested Dublin serving times',()=>{
  assert.deepEqual(SERVING_TIMES,{breakfast:'06:45',lunch:'12:00',dinner:'18:00'});
  assert.equal(mealStatus('2026-09-29','breakfast',new Date('2026-09-29T05:44:00Z')),'upcoming');
  assert.equal(mealStatus('2026-09-29','breakfast',new Date('2026-09-29T05:45:00Z')),'served');
  assert.equal(mealStatus('2026-09-29','lunch',new Date('2026-09-29T10:59:00Z')),'upcoming');
  assert.equal(mealStatus('2026-09-29','lunch',new Date('2026-09-29T11:00:00Z')),'served');
  assert.equal(mealStatus('2026-09-29','dinner',new Date('2026-09-29T16:59:00Z')),'upcoming');
  assert.equal(mealStatus('2026-09-29','dinner',new Date('2026-09-29T17:00:00Z')),'served');
  assert.equal(mealStatus('2026-09-28','dinner',new Date('2026-09-29T00:00:00Z')),'served');
  assert.equal(mealStatus('2026-09-30','breakfast',new Date('2026-09-29T22:00:00Z')),'upcoming');
});

test('every current public meal card links to the real serving review route',async()=>{
 const html=await readFile(new URL('../public/menus/index.html',import.meta.url),'utf8');
 const ids=['menu-2026-09-28-mon-dinner','menu-2026-09-28-tue-breakfast','menu-2026-09-28-tue-lunch','menu-2026-09-28-tue-dinner','menu-2026-09-28-wed-breakfast','menu-2026-09-28-wed-dinner','menu-2026-09-28-thu-breakfast','menu-2026-09-28-thu-dinner','menu-2026-09-28-fri-breakfast','menu-2026-09-28-fri-dinner'];
 for(const id of ids)assert.match(html,new RegExp('href="/menus/meals/'+id+'/reviews/"'),id);
 assert.equal((html.match(/class="meal(?: featured-meal)? meal-review-card"/g)||[]).length,10);
 assert.match(html,/data-date="2026-09-29"/);
 assert.match(html,/\/menus\/menus\.js\?v=7\.4\.2/);
});

test('homepage hero is fixed to the Causeway artwork and below-fold catalogue is deferred',async()=>{
 const [html,js,art,menuJs]=await Promise.all([
   readFile(new URL('../public/index.html',import.meta.url),'utf8'),
   readFile(new URL('../public/home.js',import.meta.url),'utf8'),
   readFile(new URL('../public/hq/duck-bear-causeway.webp',import.meta.url)),
   readFile(new URL('../public/menus/menus.js',import.meta.url),'utf8')
 ]);
 assert.match(html,/friendly brown bear with a map posing on the Giant’s Causeway/);
 assert.match(html,/rel="preload" as="image" href="\/hq\/duck-bear-causeway\.webp\?v=7\.4\.2"/);
 assert.doesNotMatch(js,/heroUrl/);
 assert.match(js,/IntersectionObserver/);
 assert.equal(art.byteLength,67842);
 const {createHash}=await import('node:crypto');
 assert.equal(createHash('sha256').update(art).digest('hex'),'ea49af491ceb81f7c90c87b447a84dc1ceecc628401ff86d672e803700fa06a0');
 assert.match(menuJs,/setInterval/);
});

test('Our Space no longer fetches every private record before rendering',async()=>{
 const views=await readFile(new URL('../public/hq/views.mjs',import.meta.url),'utf8');
 const start=views.indexOf('export async function homeView');
 assert.ok(start>=0);
 const home=views.slice(start);
 assert.doesNotMatch(home,/const all=await allRecords\(\)/);
 for(const kind of ['plan','serving','memory','note'])assert.match(home,new RegExp("allRecords\\('"+kind+"'\\)"));
 assert.match(home,/Promise\.all/);
});


test('Worker-rendered live menu uses Dublin-time status and real serving review routes',async()=>{
 assert.equal(publicMealStatus('2026-09-29','breakfast',new Date('2026-09-29T05:44:00Z')),'upcoming');
 assert.equal(publicMealStatus('2026-09-29','breakfast',new Date('2026-09-29T05:45:00Z')),'served');
 assert.equal(publicMealStatus('2026-09-29','lunch',new Date('2026-09-29T11:00:00Z')),'served');
 assert.equal(publicMealStatus('2026-09-29','dinner',new Date('2026-09-29T17:00:00Z')),'served');
 const f=await fixture();try{
  await call(handler,f.env,'/api/hq/me');
  const r=await call(handler,f.env,'/menus/',{user:null});
  assert.equal(r.status,200);
  const html=await r.response.text();
  const ids=['menu-2026-09-28-mon-dinner','menu-2026-09-28-tue-breakfast','menu-2026-09-28-tue-lunch','menu-2026-09-28-tue-dinner','menu-2026-09-28-wed-breakfast','menu-2026-09-28-wed-dinner','menu-2026-09-28-thu-breakfast','menu-2026-09-28-thu-dinner','menu-2026-09-28-fri-breakfast','menu-2026-09-28-fri-dinner'];
  for(const id of ids)assert.match(html,new RegExp('href="/menus/meals/'+id+'/reviews/"'),id);
  assert.equal((html.match(/meal-review-card/g)||[]).length,10);
  assert.match(html,/class="meal-status (?:served|upcoming)"/);
  assert.match(html,/data-day-status>(?:Served|Upcoming)</);
  assert.match(html,/\/menus\/menus\.css\?v=8/);
  assert.match(html,/Website 7\.4\.2/);
 }finally{f.close();}
});
