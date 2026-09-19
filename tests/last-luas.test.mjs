import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const index='public/games/last-luas/index.html';
const css='public/games/last-luas/game.css';
const game='public/games/last-luas/game.mjs';
const release='public/games/last-luas/release.json';

test('Last Luas static game files exist',()=>{
  for(const path of [index,css,game,release])assert.ok(existsSync(path),path+' must exist');
});

test('Last Luas source parses as an ES module',()=>{
  execFileSync(process.execPath,['--check',game],{stdio:'pipe'});
});

test('Last Luas is a pinned PlayCanvas 90-second runner',()=>{
  const source=read(game);
  assert.match(source,/playcanvas@2\.22\.2\/build\/playcanvas\.mjs/);
  assert.match(source,/duration:90/);
  assert.match(source,/pullAwayAt:8\.5/);
  assert.match(source,/streetLength:430/);
  for(const name of ['ARKET','HODGES FIGGIS','CAFÉ EN SEINE','THE DAWSON LOUNGE','THE IVY','DAWSON LUAS STOP'])assert.match(source,new RegExp(name));
  for(const feature of ['buildWetDetails','buildStreetLife','buildLuasStop','Dawson raised platform','Platform white edge','Glass Luas shelter'])assert.match(source,new RegExp(feature));
});

test('Last Luas is exposed in every Games surface',()=>{
  for(const path of ['public/games/index.html','public/index.html','public/kart-games.js']){
    const content=read(path);
    assert.match(content,/\/games\/last-luas\//,path+' should link Last Luas');
  }
});

test('Last Luas CSP permits only the pinned engine CDN in addition to self',()=>{
  const headers=read('public/_headers');
  assert.match(headers,/\/games\/last-luas\/\*/);
  assert.match(headers,/script-src 'self' https:\/\/cdn\.jsdelivr\.net 'wasm-unsafe-eval'/);
  assert.doesNotMatch(read(index),/<script[^>]+src="https:/);
});

test('street polish includes distinct hazards and final sprint feedback',()=>{
  const source=read(game),styles=read(css);
  assert.match(source,/umbrella-hit/);
  assert.match(source,/final-sprint/);
  assert.match(source,/ambientPerson/);
  assert.match(source,/urgency=/);
  assert.match(styles,/umbrella-flash/);
  assert.match(styles,/final-sprint/);
});

test('release metadata matches the playable slice',()=>{
  const data=JSON.parse(read(release));
  assert.equal(data.game,'Last Luas');
  assert.equal(data.version,'0.2.0');
  assert.equal(data.engine,'PlayCanvas 2.22.2');
  assert.equal(data.durationSeconds,90);
  assert.equal(data.location,'Dawson Street, Dublin');
  assert.equal(data.environment.raisedLuasPlatforms,true);
  assert.equal(data.environment.puddleReflections,true);
});
