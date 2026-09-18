import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('Lantern Courtyard gets a second environment-detail layer', () => {
  const source = read('public/games/danao/src/art/arena-polish.js');
  for (const marker of [
    'courtyard-polish-stone-line-x',
    'courtyard-polish-medallion',
    'courtyard-polish-pillar',
    'courtyard-polish-corner-lantern',
    'courtyard-polish-pagoda-roof',
    'courtyard-polish-planter',
    'courtyard-polish-bamboo',
    'courtyard-polish-banner',
    'courtyard-polish-lantern-light',
  ]) assert.match(source, new RegExp(marker));
});

test('Teahouse Rooftop gets skyline, tiles and animated roof life', () => {
  const source = read('public/games/danao/src/art/arena-polish.js');
  for (const marker of [
    'rooftop-polish-tile-row',
    'rooftop-polish-skyline',
    'rooftop-polish-window',
    'rooftop-polish-water-tank',
    'rooftop-polish-ac-unit',
    'rooftop-polish-string-bulb',
    'rooftop-polish-laundry',
    'rooftop-polish-neon-box',
    'rooftop-polish-fill',
  ]) assert.match(source, new RegExp(marker));
});

test('arena polish has bounded scene-owned animation instead of background timers', () => {
  const source = read('public/games/danao/src/art/arena-polish.js');
  assert.match(source, /onBeforeRenderObservable\.add/);
  assert.match(source, /Math\.sin/);
  assert.doesNotMatch(source, /setInterval|setTimeout/);
  assert.match(source, /scene\.metadata\[marker\]/);
});

test('local and online fights both apply the new arena polish layer', () => {
  const source = read('public/games/danao/src/main.js');
  assert.match(source, /import \{ polishDanaoArena \}/);
  assert.match(source, /polishDanaoArena\(B, scene, arenaId\)/);
  assert.equal((source.match(/polishActiveArena\(/g) || []).length >= 3, true);
});

test('environment parity release is Danao 0.10.5', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  assert.equal(release.version, '0.10.5');
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
