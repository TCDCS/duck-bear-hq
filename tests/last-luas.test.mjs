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

test('runtime-rendered nameboards and final Luas sequence are present',()=>{
  const source=read(game);
  assert.match(source,/function signMaterial/);
  assert.match(source,/Texture\(app\.graphicsDevice/);
  for(const sign of ['ARKET wordmark','Hodges Figgis nameboard','Cafe en Seine nameboard','Dawson Lounge nameboard','Ivy nameboard','Dawson stop nameboard'])assert.match(source,new RegExp(sign));
  assert.match(source,/DOORS CLOSING!/);
  assert.match(source,/THE LUAS IS MOVING!/);
  assert.match(source,/last-luas-best-v1/);
  assert.match(source,/camera\.camera\.fov/);
});

test('v0.4 uses real pinned Quaternius character assets rather than primitive people',()=>{
  const source=read(game);
  assert.match(source,/fatal-funnel-public@29a6bdfd01ad175c389cbd0bac80c30f926ff96b/);
  assert.match(source,/casual-character\.glb/);
  assert.match(source,/worker\.glb/);
  assert.match(source,/loadFromUrl\(CHARACTER_SOURCES\[kind\],'container'/);
  assert.match(source,/instantiateRenderEntity/);
  assert.match(source,/spawnCharacter/);
  assert.match(source,/Idle_Neutral:8/);
  assert.match(source,/Run:16/);
  assert.match(source,/Walk:22/);
  assert.doesNotMatch(source,/\|\|clips\[0\]/);
  assert.match(source,/Runner character model/);
  assert.match(source,/Tourist character model/);
  assert.match(source,/Umbrella pedestrian model/);
  assert.match(source,/Cyclist rider model/);
  assert.match(source,/Delivery rider model/);
  assert.doesNotMatch(source,/sphere\('head'/i);
  assert.doesNotMatch(source,/box\('body'/i);
  assert.match(source,/dataset\.lastLuasCharacterAssets/);
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
  assert.equal(data.version,'0.4.0');
  assert.equal(data.engine,'PlayCanvas 2.22.2');
  assert.equal(data.durationSeconds,90);
  assert.equal(data.location,'Dawson Street, Dublin');
  assert.equal(data.environment.raisedLuasPlatforms,true);
  assert.equal(data.environment.puddleReflections,true);
  assert.equal(data.environment.runtimeNameboards,true);
  assert.equal(data.environment.realAnimatedCharacters,true);
  assert.equal(data.environment.proceduralPeople,false);
  assert.equal(data.thirdPartyAssets.license,'CC0 1.0');
});
