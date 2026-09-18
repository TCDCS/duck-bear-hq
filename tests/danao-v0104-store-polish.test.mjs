import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('Checkout Chaos shelf colliders are lowered to keep fighters readable', async () => {
  const { getArena } = await import('../public/games/danao/src/game/arena.js');
  const arena = getArena('ring');
  const aisles = arena.fixtures.filter((fixture) => fixture.id.startsWith('aisle-'));
  assert.equal(aisles.length, 4);
  assert.ok(aisles.every((fixture) => fixture.size[1] === 1.85));
  assert.ok(aisles.every((fixture) => fixture.y === 0.925));
});

test('Checkout Chaos post-polish fixes shared-white washout and adds store detail', () => {
  const source = read('public/games/danao/src/art/store-polish.js');
  for (const marker of [
    'improveShelfSightlines',
    'fixStoreLighting',
    'store-polish-light-panel',
    'store-polish-checkout-blue-line',
    'store-polish-produce-zone',
    'store-polish-basket',
    'store-polish-endcap-label',
    'store-polish-department-sign',
    'store-polish-can',
  ]) assert.match(source, new RegExp(marker));
  assert.match(source, /sharedWhite\.emissiveColor/);
  assert.match(source, /danaoStorePolished/);
});

test('browser applies Checkout Chaos polish to local and online fights', () => {
  const source = read('public/games/danao/src/main.js');
  assert.match(source, /import \{ polishCheckoutChaos \}/);
  assert.match(source, /polishActiveArena\(state\.arenaId\)/);
  assert.match(source, /polishActiveArena\(arenaId\)/);
  assert.match(source, /CURRENT_ARENA_COPY = 'Checkout Chaos · Lantern Courtyard · Teahouse Rooftop'/);
  assert.match(source, /DANAO v\$\{release\.version\}/);
});

test('store polish release is Danao 0.10.4', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  assert.equal(release.version, '0.10.4');
});
