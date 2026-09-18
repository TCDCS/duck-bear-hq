import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function productionV05Source() {
  const payload = Array.from({ length: 6 }, (_, i) => read('public/games/meow-wars/v05-payload-' + (i + 1) + '.txt'))
    .join('')
    .replace(/\s+/g, '');
  return gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
}

function composeV07() {
  let source = productionV05Source();
  const renderPattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
  assert.match(source, /new Phaser\.Game\(config\);/);
  for (const method of ['muzzleFx', 'explosionFx', 'damageCat', 'updateProjectiles', 'createSky']) {
    assert.ok(source.includes('GameScene.prototype.' + method), 'production method ' + method);
  }
  const matches = [...source.matchAll(renderPattern)];
  assert.equal(matches.length, 1);
  const replacement =
    "function preferredRenderResolution(devicePixelRatio = 1) {\n" +
    "    const viewportScale = Math.max((globalThis.innerWidth || 1280) / 1280, (globalThis.innerHeight || 720) / 720);\n" +
    "    const mobileCap = (globalThis.innerWidth || 1280) < 800 ? 2 : 3;\n" +
    "    return Math.min(mobileCap, 3, Math.max(1, devicePixelRatio, viewportScale));\n" +
    "}";
  const match = matches[0];
  source = source.slice(0, match.index) + replacement + source.slice(match.index + match[0].length);
  const legacyTint = 'cat.sprite.setTintFill?.(0xffffff);';
  const legacyTintCount = source.split(legacyTint).length - 1;
  assert.ok(legacyTintCount >= 1);
  const tintReplacement = 'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);';
  source = source.split(legacyTint).join(tintReplacement);
  const hd = read('public/games/meow-wars/v06-hd.js');
  const gamefeel = read('public/games/meow-wars/v07-gamefeel.js');
  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  return source.slice(0, index) + '\n' + hd + '\n' + gamefeel + '\n' + source.slice(index);
}

test('Meow Wars v0.7.1 composes and compiles against the real v0.5 production payload', () => {
  const source = composeV07();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v071-dublin-brand-20260918a/);
  assert.match(source, /viewportScale/);
  assert.match(source, /new Phaser\.Game\(config\);/);
});

test('Meow Wars v0.7.1 replaces the Dublin scene with Ha\u2019penny Bridge and richer streetscape cues', () => {
  const source = composeV07();
  assert.match(source, /Ha.*penny Bridge \+ Spire/);
  assert.match(source, /drawHapennyBridge/);
  assert.match(source, /SuperValu/);
  assert.match(source, /Centra/);
  assert.match(source, /THE TEMPLE BAR/);
  assert.match(source, /MERCHANT'S ARCH/);
  assert.match(source, /CENTRA_TEAL = '#138d98'/);
  assert.match(source, /CENTRA_YELLOW = '#efd01f'/);
  assert.match(source, /SUPERVALU_RED = '#c8102e'/);
  assert.match(source, /TEMPLE_RED = '#9a2025'/);
  assert.match(source, /HA'PENNY BRIDGE/);
  assert.match(source, /drawSpire\(c, 1040, 405, 400\)/);
});

test('Meow Wars v0.7.1 adds weapon, explosion, cat-reaction and battlefield ambience polish', () => {
  const fx = read('public/games/meow-wars/v07-gamefeel.js');
  for (const marker of [
    '__MEOW_WARS_FX_STATS',
    'baseMuzzleFx',
    'baseExplosionFx',
    'baseDamageCat',
    'baseUpdateProjectiles',
    'setupAmbience',
    'updateAmbience',
    'animateCats',
    'BOOM!',
    'MRAOW!'
  ]) assert.ok(fx.includes(marker), marker);
  assert.match(fx, /garden-siege/);
  assert.match(fx, /rooftop-rumble/);
  assert.match(fx, /junkyard-jamboree/);
  assert.match(fx, /taj-mahal/);
  assert.match(fx, /westminster-bridge-big-ben/);
  assert.match(fx, /donabate-beach/);
});

test('Meow Wars v0.7.1 shell and loader expose current version/build and retain the 4K HD layer', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v07-loader.mjs');
  const hd = read('public/games/meow-wars/v06-hd.js');
  const css = read('public/games/meow-wars/styles.css');

  assert.match(html, /v07-loader\.mjs\?v=71a/);
  assert.match(html, /data-version="0\.7\.1"/);
  assert.match(html, /data-build="mw-v071-dublin-brand-20260918a"/);
  assert.match(loader, /v06-hd\.js\?v=71a/);
  assert.match(loader, /v07-gamefeel\.js\?v=71a/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
  assert.match(hd, /MW_SOURCE_W = 3840/);
  assert.match(hd, /MW_SOURCE_H = 2160/);
  assert.match(css, /image-rendering:\s*auto/);
  assert.doesNotMatch(css, /crisp-edges|-webkit-optimize-contrast/);
});
