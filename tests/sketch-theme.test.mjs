import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('each website shell and published menu renderer uses the shared sketch theme without restyling games',()=>{
 for(const p of ['public/index.html','public/hq/index.html','public/games/index.html','public/menus/index.html','public/menus/archive/index.html','public/account.html']){
  assert.match(read(p),/\/hq\/sketch\.css\?v=7\.3\.0/,p);assert.match(read(p),/\/hq\/sketch\.mjs/,p);
 }
 assert.match(read('src/hq/extras.mjs'),/\/hq\/sketch\.css/);
 for(const p of ['public/games/meow-wars/index.html','public/games/last-luas/index.html'])assert.doesNotMatch(read(p),/sketch\.css/,p);
});
test('theme accents follow nested navigation and never derive private text from a public route',async()=>{
 assert.ok(fs.existsSync('public/hq/sketch.mjs'),'Shared theme module must exist');
 const {chapterFor}=await import('../public/hq/sketch.mjs');
 for(const [path,chapter] of [['/','home'],['/menus/archive/2026-09-28/','menus'],['/family-tree/people/person-1/edit/','family'],['/scrapbook/albums/','scrapbook'],['/settings/passkeys/','settings'],['/admin/users/owner/email/','admin'],['/verify-email/','auth'],['/info/allergies/','info'],['/games/','games']])assert.equal(chapterFor(path).id,chapter,path);
 assert.equal(chapterFor('/something/unknown/').id,'home');
});
test('the shared skin has reduced motion, dark mode, narrow screen and visible focus treatment',()=>{
 assert.ok(fs.existsSync('public/hq/sketch.css'),'Shared theme CSS must exist');const css=read('public/hq/sketch.css');
 for(const pattern of [/prefers-reduced-motion/,/\.night/,/max-width: *600px/,/focus-visible/,/data-chapter/])assert.match(css,pattern);
});
test('website version bump does not rewrite dependency releases or integrity metadata',()=>{
 const lock=JSON.parse(read('package-lock.json')),dep=lock.packages['node_modules/@sindresorhus/is'];
 assert.equal(dep.version,'7.2.0');assert.equal(dep.resolved,'https://registry.npmjs.org/@sindresorhus/is/-/is-7.2.0.tgz');
 assert.equal(lock.version,'7.4.0');assert.equal(lock.packages[''].version,'7.4.0');
});
