import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('private home files and navigation are present',()=>{
  const html=read('public/hub/index.html'),js=read('public/hub/hub.js'),css=read('public/hub/hub.css');
  for(const route of ['menus/library','menus/week','scrapbook/timeline','family/tree','settings/security','admin/users'])assert.match(html,new RegExp(route.replace('/','\\/')));
  assert.match(js,/\/api\/hub\/users/);
  assert.match(js,/\/api\/hub\/scrapbook/);
  assert.match(js,/\/api\/hub\/family/);
  assert.match(js,/\/api\/hub\/menus/);
  assert.match(css,/hand-drawn|--hand|Comic Sans MS/);
});

test('private home migration is additive and valid',()=>{
  const db=new DatabaseSync(':memory:');
  for(const file of readdirSync(new URL('../migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(read(file.startsWith('migrations/')?file:'migrations/'+file));
  for(const table of ['hub_permissions','family_people','family_relations','scrapbook_items','menu_library','weekly_menus','weekly_menu_items']){
    const row=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
    assert.equal(row?.name,table);
  }
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
  assert.match(hub,/CREATE TABLE IF NOT EXISTS hub_permissions/);
});

test('master prompt documents private permissions and separate settings',()=>{
  const p=read('docs/duck-bear-home-master-prompt.md');
  assert.match(p,/none[\s\S]*read[\s\S]*contribute[\s\S]*admin/);
  assert.match(p,/Profile/);assert.match(p,/Security/);assert.match(p,/Appearance/);assert.match(p,/Privacy/);
});
