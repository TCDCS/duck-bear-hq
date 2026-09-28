import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('menu room uses the existing private R2 bucket instead of a new database schema',()=>{
  const source=read('src/index.js');
  assert.match(source,/MENU_ROOM_KEY='menu-room\/private-data-v1\.json'/);
  assert.match(source,/env\.MEDIA\.get\(MENU_ROOM_KEY\)/);
  assert.match(source,/env\.MEDIA\.put\(MENU_ROOM_KEY/);
  assert.doesNotMatch(source,/FROM menu_meals|FROM menu_reviews|FROM menu_suggestions/);
});

test('menu room APIs are authenticated private account routes',()=>{
  const source=read('src/index.js');
  assert.match(source,/\/api\/menus\/dashboard/);
  assert.match(source,/\/api\/menus\/suggestions/);
  assert.match(source,/\/api\/menus\/reviews/);
  assert.match(source,/purpose==='menu-review'/);
  assert.match(source,/key\.startsWith\('menu-reviews\/'\)/);
  assert.match(source,/I want to kiss you/);
  assert.match(source,/I want to fuck you/);
});

test('public menu links to the private menu room without exposing rating meanings in public HTML',()=>{
  const menu=read('public/menus/index.html');
  const member=read('public/menus/member/index.html');
  const memberJs=read('public/menus/member/member.js');
  assert.match(menu,/href="\/menus\/member\/"/);
  assert.match(member,/Plating/);
  assert.match(member,/Review comments/);
  assert.doesNotMatch(menu,/I want to kiss you|I want to fuck you/);
  assert.doesNotMatch(memberJs,/I want to kiss you|I want to fuck you/);
});
