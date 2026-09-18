import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('Checkout Chaos art pass adds authored supermarket zones and retail detail', () => {
  const visuals = read('public/games/danao/src/game/visuals.js');
  for (const marker of [
    'supermarket-floor-border',
    'supermarket-checkout-lane-strip',
    'supermarket-service-desk',
    'supermarket-entry-glass',
    'supermarket-promo-banner',
    'supermarket-bakery-canopy',
    'supermarket-produce-awning',
    'supermarket-endcap-promo',
    'supermarket-cashier-screen',
    'supermarket-light-truss',
  ]) assert.ok(visuals.includes(marker), marker);
});

test('Checkout Chaos uses an indoor lighting and image-processing profile', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  for (const marker of [
    "arena.id === 'ring'",
    'hemi.intensity = 0.62',
    'sun.intensity = 0.58',
    'scene.imageProcessingConfiguration',
    'TONEMAPPING_ACES',
    'exposure = 0.82',
    'contrast = 1.18',
  ]) assert.ok(runtime.includes(marker), marker);
});

test('supermarket art pass is reproducible through release assembly', () => {
  const assembler = read('scripts/assemble-danao-v05.mjs');
  for (const marker of [
    'patchDanaoSupermarketArtVisuals',
    'patchDanaoSupermarketArtRuntime',
    'danao-supermarket-art-visual-patch.mjs',
    'danao-supermarket-art-runtime-patch.mjs',
  ]) assert.ok(assembler.includes(marker), marker);
});
