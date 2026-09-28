import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('menu room migration stores suggestions reviews plating and photos',()=>{
  const sql=read('migrations/0004_menu_room.sql');
  for(const name of ['menu_meals','menu_suggestions','menu_reviews','menu_review_photos'])assert.match(sql,new RegExp('CREATE TABLE IF NOT EXISTS '+name));
  assert.match(sql,/plating_rating INTEGER NOT NULL CHECK\(plating_rating BETWEEN 1 AND 5\)/);
  assert.match(sql,/overall_rating INTEGER NOT NULL CHECK\(overall_rating BETWEEN 1 AND 6\)/);
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
