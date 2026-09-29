import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fixture,call,D1,R2} from './helpers/site-env.mjs';
test('every Site 1 sublink serves the shared no-store shell',async()=>{
 const f=await fixture();f.env.ASSETS.fetch=async r=>new Response(new URL(r.url).pathname);
 for(const path of ['/our-space/','/menus/planner/','/menus/library/','/family/','/scrapbook/','/settings/','/settings/profile/','/settings/security/','/settings/users/','/settings/permissions/','/settings/artwork/','/settings/updates/','/signin/','/forgot-password/']){
  const r=await call(f.env,path);assert.equal(await r.res.text(),'/site/index.html',path);assert.match(r.res.headers.get('cache-control'),/no-store/);
 }
});
test('frontend modules and versioned navigation exist without inline executable scripts',()=>{
 assert.ok(existsSync('public/site/site.mjs'));const html=readFileSync('public/site/index.html','utf8');assert.match(html,/type="module"/);assert.match(html,/aria-live="polite"/);assert.doesNotMatch(html,/<script[^>]*>[^<\s]/);
 const home=readFileSync('public/index.html','utf8');assert.match(home,/7\.0\.0/);assert.match(home,/\/our-space\//);assert.match(home,/\/settings\/updates\//);
});
test('new installation seeds the original pair after the Site 1 migration is already applied',async()=>{
 const env={DB:new D1(),MEDIA:new R2(),SETUP_SECRET:'new-install-fixture',ASSETS:{fetch:async()=>new Response('')}};env.DB.sql.exec(readFileSync('migrations/0004_site_spaces.sql','utf8'));
 const result=await call(env,'/api/setup',{method:'POST',body:{setupSecret:env.SETUP_SECRET,admin:{username:'bear',displayName:'Zach',password:'fixture-password-123'},member:{username:'duck',displayName:'Guannan',password:'other-password-123'}}});assert.equal(result.res.status,201);
 assert.equal(env.DB.sql.prepare('SELECT COUNT(*) AS n FROM site_owners').get().n,2);assert.equal(env.DB.sql.prepare('SELECT COUNT(*) AS n FROM site_legacy_users').get().n,2);
});
