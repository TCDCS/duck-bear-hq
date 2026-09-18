import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('Checkout Chaos replaces the wrestling hall with a flat supermarket arena', async () => {
  const { getArena } = await import('../public/games/danao/src/game/arena.js');
  const arena = getArena('ring');
  assert.equal(arena.name, 'Checkout Chaos');
  assert.match(arena.description, /supermarket/i);
  assert.equal(Object.hasOwn(arena, 'ring'), false);
  assert.equal(arena.floorY, 0);
  assert.ok(arena.spawns.every((spawn) => spawn.y < 1.5));
  assert.equal(arena.palette.trim, '#00539f');
  assert.equal(arena.palette.accent, '#ee1c25');
});

test('supermarket visual rebuild removes wrestling scenery and authors a recognisable Tesco store', () => {
  const visuals = read('public/games/danao/src/game/visuals.js');
  for (const marker of [
    'tesco-superstore-sign',
    'supermarket-floor',
    'supermarket-ceiling-light',
    'supermarket-aisle-shelf',
    'supermarket-product-row',
    'supermarket-checkout',
    'supermarket-conveyor',
    'supermarket-produce-island',
    'supermarket-freezer-wall',
    'supermarket-trolley-bay',
    'supermarket-stockroom-door',
    'supermarket-aisle-sign',
  ]) assert.match(visuals, new RegExp(marker));

  for (const oldMarker of [
    'ring-rope-x',
    'ring-rope-z',
    'turnbuckle-pad',
    'crowd-bench',
    'announcer-desk',
    'ring-step',
  ]) assert.doesNotMatch(visuals, new RegExp(oldMarker));
});

test('Tesco branding uses the supplied logo as an in-game texture asset', () => {
  const brand = read('public/games/danao/src/art/tesco-brand.js');
  assert.match(brand, /TESCO_LOGO_DATA_URI/);
  assert.match(brand, /data:image\/svg\+xml/);
  const visuals = read('public/games/danao/src/game/visuals.js');
  assert.match(visuals, /TESCO_LOGO_DATA_URI/);
  assert.match(visuals, /new B\.Texture\(TESCO_LOGO_DATA_URI/);
});

test('first fighter benchmark removes blocky hero limbs in favour of rounded cartoon anatomy', () => {
  const visuals = read('public/games/danao/src/game/visuals.js');
  for (const marker of [
    'hero-arm-soft',
    'hero-leg-soft',
    'hero-face-mouth',
    'hero-hair-fringe',
    'hero-ear',
  ]) assert.match(visuals, new RegExp(marker));
  assert.match(visuals, /CreateCapsule\('hero-arm-soft'/);
  assert.match(visuals, /CreateCapsule\('hero-leg-soft'/);
});

test('supermarket release patch is reproducible through the Danao assembler', () => {
  const assembler = read('scripts/assemble-danao-v05.mjs');
  assert.match(assembler, /patchDanaoSupermarketVisuals/);
  assert.match(assembler, /danao-supermarket-visual-patch\.mjs/);
});
