import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('private home files and navigation are present',()=>{
  const html=read('public/hub/index.html'),js=read('public/hub/hub.js'),css=read('public/hub/hub.css');
  for(const route of ['home/today','home/quick-add','menus/library','menus/week','scrapbook/timeline','family/tree','plans/decisions','info/library','settings/email','settings/password','settings/appearance','settings/data','admin/users'])assert.match(html,new RegExp(route.replace('/','\\/')));
  assert.match(js,/\/api\/hub\/users/);
  assert.match(js,/\/api\/hub\/scrapbook/);
  assert.match(js,/\/api\/hub\/family/);
  assert.match(js,/\/api\/hub\/menus/);assert.match(js,/\/api\/hub\/info/);assert.match(js,/\/api\/hub\/board/);
  assert.match(css,/hand-drawn|--hand|Comic Sans MS/);assert.match(css,/art-collage/);assert.match(css,/decision-option/);
});

test('original additive migrations remain valid',()=>{
  const db=new DatabaseSync(':memory:');
  for(const file of readdirSync(new URL('../migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(read(file.startsWith('migrations/')?file:'migrations/'+file));
  db.close();
});

test('worker routes private home only after authentication',()=>{
  const source=read('src/index.js'),hub=read('src/hub.js');
  assert.match(source,/routeHubApi/);
  assert.match(source,/path === '\/api\/hub'/);
  assert.match(hub,/Admin access required/);
  assert.match(hub,/family_tree_level/);
  assert.match(hub,/scrapbook_level/);
  assert.match(hub,/menus_level/);
  assert.match(hub,/private, no-store/);
  assert.match(hub,/async function ensureHubSchema/);
  assert.match(hub,/CREATE TABLE IF NOT EXISTS hub_permissions/);assert.match(hub,/CREATE TABLE IF NOT EXISTS hub_info_pages/);assert.match(hub,/CREATE TABLE IF NOT EXISTS hub_board_items/);
});

test('master prompt documents private permissions and separate settings',()=>{
  const p=read('docs/duck-bear-home-master-prompt.md');
  assert.match(p,/none[\s\S]*read[\s\S]*contribute[\s\S]*admin/);
  assert.match(p,/Profile/);assert.match(p,/Email/);assert.match(p,/Password/);assert.match(p,/Appearance/);assert.match(p,/Privacy/);assert.match(p,/Info Library/);
});


test('public homepage keeps private About and Info behind sign in',()=>{
  const html=read('public/index.html'),source=read('src/index.js');
  assert.doesNotMatch(html,/href="\/info\//);
  assert.doesNotMatch(html,/id="about"/);
  assert.match(html,/\/assets\/art\/yaya-dog\.webp/);
  assert.match(html,/\/assets\/art\/bear-goats\.webp/);
  assert.match(source,/isPrivatePagePath/);
  assert.match(source,/path==='\/info'/);
  assert.match(source,/path==='\/about'/);
});

test('Info library has a seeded allergies subpage and admin page creation',()=>{
  const hub=read('src/hub.js'),ui=read('public/hub/hub.js');
  assert.match(hub,/allergies-hand-wash/);
  assert.match(hub,/Skin irritation: washing-up liquid & hand wash/);
  assert.match(hub,/Admin access required to create library pages/);
  assert.match(ui,/Create info page/);
  assert.match(ui,/info\/new/);
});
