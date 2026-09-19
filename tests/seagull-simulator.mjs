import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('public/games/seagull-simulator/index.html','utf8');
const css=readFileSync('public/games/seagull-simulator/game.css','utf8');
const source=readFileSync('src/seagull-simulator/main.ts','utf8');
const release=JSON.parse(readFileSync('public/games/seagull-simulator/release.json','utf8'));
const hub=readFileSync('public/games/index.html','utf8');
const home=readFileSync('public/index.html','utf8');

test('Seagull Simulator is locally bundled and CSP-friendly',()=>{
  assert.match(html,/\/games\/seagull-simulator\/game\.js/);
  assert.doesNotMatch(html,/https?:\/\//);
  assert.match(source,/from 'phaser'/);
});

test('Seagull Simulator keeps the locked Dublin route',()=>{
  assert.deepEqual(release.nextAreas,[]);
  assert.equal(release.area,"Dame Street + College Green + Grafton Street + St Stephen's Green");
  assert.match(source,/CENTRA/);
  assert.match(source,/SuperValu/);
  assert.match(source,/Michael D\./);
  assert.match(source,/garda/);
  assert.match(source,/COLLEGE GREEN/);
  assert.match(source,/luas/);
  assert.match(source,/GRAFTON STREET/);
  assert.match(source,/ST STEPHEN'S GREEN/);
  assert.match(source,/BROWN THOMAS/);
  assert.match(source,/BEWLEY'S/);
});

test('Seagull Simulator exposes mobile and desktop controls',()=>{
  for(const id of ['stickZone','diveBtn','grabBtn','boostBtn'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(source,/W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,SHIFT/);
  assert.match(css,/touch-action:none/);
});

test('Duck & Bear surfaces the new game',()=>{
  assert.match(hub,/\/games\/seagull-simulator\//);
  assert.match(home,/\/games\/seagull-simulator\//);
});

test('Seagull Simulator has replayable progression systems',()=>{
  assert.match(source,/recycleTarget\(t:Target\)/);
  assert.match(source,/updateHeat\(time:number,dt:number\)/);
  assert.match(source,/lastTheftAt>0&&time-this\.lastTheftAt<8000/);
  assert.match(source,/setMission\(index:number\)/);
  assert.match(html,/id="missionBar"/);
  assert.match(html,/id="combo"/);
  assert.match(html,/id="heat"/);
});

test('Seagull can land and waddle without another control button',()=>{
  assert.match(source,/diveHeld/);
  assert.match(source,/grounded/);
  assert.match(source,/gull-walk/);
  assert.match(source,/WADDLE MODE/);
});
