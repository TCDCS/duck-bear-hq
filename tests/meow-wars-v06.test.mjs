import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const index = read('public/games/meow-wars/index.html');
const loader = read('public/games/meow-wars/v06-loader.js');
const hd = read('public/games/meow-wars/v06-hd.js');

test('Meow Wars v0.6 is the selected branch build', () => {
  assert.match(index, /v06-loader\.js\?v=6/);
  assert.match(index, /meow-wars-version" content="0\.6\.0"/);
  assert.match(index, /MW-HD-20260918-01/);
  assert.doesNotMatch(index, /v05-loader\.js/);
});

test('v0.6 preserves the six v0.5 gameplay payloads and injects before Phaser boot', () => {
  assert.match(loader, /length: 6/);
  assert.match(loader, /v05-payload-/);
  assert.match(loader, /new Phaser\.Game\(config\);/);
  assert.match(loader, /v06-hd\.js\?v=6/);
});

test('HD environment system contains the locked seven battlefields', () => {
  for (const id of [
    'garden-siege','rooftop-rumble','junkyard-jamboree','taj-mahal',
    'oconnell-bridge','westminster-bridge','donabate-beach'
  ]) assert.ok(hd.includes(id), 'missing arena ' + id);
  assert.match(hd, /MW_SOURCE_W = 3840/);
  assert.match(hd, /MW_SOURCE_H = 2160/);
  assert.match(hd, /parallaxLayers: 3/);
  assert.match(hd, /MW_TERRAIN_SCALE = 2/);
});

test('HD layer and loader compile as JavaScript', () => {
  assert.doesNotThrow(() => new Function(loader));
  assert.doesNotThrow(() => new Function(hd));
});
