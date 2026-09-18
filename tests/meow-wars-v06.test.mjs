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

function composeV06() {
  let source = productionV05Source();
  const renderPattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
  assert.match(source, /new Phaser\.Game\(config\);/);
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
  const hd = read('public/games/meow-wars/v06-hd.js');
  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  return source.slice(0, index) + '\n' + hd + '\n' + source.slice(index);
}

test('Meow Wars v0.6 composes and compiles against the real v0.5 production payload', () => {
  const source = composeV06();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v06-env-20260918b/);
  assert.match(source, /viewportScale/);
  assert.match(source, /mobileCap/);
  assert.match(source, /new Phaser\.Game\(config\);/);
});

test('Meow Wars v0.6 has seven battlefields with the four requested landmark scenes', () => {
  const source = composeV06();
  for (const id of [
    'garden-siege',
    'rooftop-rumble',
    'junkyard-jamboree',
    'taj-mahal',
    'oconnell-bridge-spire',
    'westminster-bridge-big-ben',
    'donabate-beach'
  ]) assert.ok(source.includes(id), id);

  for (const label of ['Taj Mahal', 'O’Connell Bridge + Spire', 'Westminster Bridge + Big Ben', 'Donabate Beach']) {
    assert.ok(source.includes(label), label);
  }
  assert.match(source, /7 BATTLEFIELDS/);
});

test('Meow Wars v0.6 uses a 4K-source layered background pipeline and HD destructible terrain', () => {
  const hd = read('public/games/meow-wars/v06-hd.js');
  assert.match(hd, /MW_SOURCE_W = 3840/);
  assert.match(hd, /MW_SOURCE_H = 2160/);
  assert.match(hd, /MW_BACKGROUND_SCALE/);
  assert.match(hd, /MW_TERRAIN_SCALE = 2/);
  assert.match(hd, /imageSmoothingQuality = 'high'/);
  assert.match(hd, /parallax\(scene\)/);
  assert.match(hd, /waterFx\(scene\)/);
  assert.match(hd, /drawGarden/);
  assert.match(hd, /drawRooftop/);
  assert.match(hd, /drawJunkyard/);
  assert.match(hd, /drawTaj/);
  assert.match(hd, /drawOconnell/);
  assert.match(hd, /drawWestminster/);
  assert.match(hd, /drawDonabate/);
  assert.match(hd, /releaseOtherBackgroundTextures/);
});

test('Meow Wars v0.6 shell exposes version/build markers and avoids forced pixel scaling', () => {
  const html = read('public/games/meow-wars/index.html');
  const css = read('public/games/meow-wars/styles.css');
  const hub = read('public/games/index.html');
  const loader = read('public/games/meow-wars/v06-loader.mjs');

  assert.match(html, /v06-loader\.mjs\?v=6b/);
  assert.match(html, /data-version="0\.6\.0"/);
  assert.match(html, /data-build="mw-v06-env-20260918b"/);
  assert.match(loader, /v06-hd\.js\?v=6b/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
  assert.match(css, /image-rendering:\s*auto/);
  assert.doesNotMatch(css, /crisp-edges|-webkit-optimize-contrast/);
  assert.match(hub, /seven battlefields/i);
});
