import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { BUILD, VERSION, patchSource } from '../public/games/meow-wars/v06-patch.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

function productionV05Source() {
  const payload = Array.from({ length: 6 }, (_, i) => read(`public/games/meow-wars/v05-payload-${i + 1}.txt`))
    .join('')
    .replace(/\s+/g, '');
  return gunzipSync(Buffer.from(payload, 'base64')).toString('utf8');
}

test('Meow Wars v0.6 patches the actual v0.5 production bundle', () => {
  const original = productionV05Source();
  const patched = patchSource(original);

  assert.ok(patched.length > original.length + 10000);
  for (const id of [
    'garden-siege',
    'rooftop-rumble',
    'junkyard-jamboree',
    'taj-mahal',
    'oconnell-bridge-spire',
    'westminster-bridge-big-ben',
    'donabate-beach'
  ]) assert.match(patched, new RegExp(id));

  assert.match(patched, /GameScene\.prototype\.createSky = function/);
  assert.match(patched, /updateEnvironmentV06/);
  assert.match(patched, /vector-4k/);
  assert.match(patched, /Adaptive HD → 4K render scale/);
  assert.match(patched, /\$\{ARENAS\.length\} BATTLEFIELDS/);
  assert.doesNotMatch(patched, /3 BATTLEFIELDS/);
});

test('Meow Wars v0.6 carries explicit version and build markers', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v06-loader.mjs');
  assert.equal(VERSION, '0.6.0');
  assert.equal(BUILD, 'mw-v06-env-20260918a');
  assert.match(html, /v06-loader\.mjs\?v=6/);
  assert.match(html, /data-version="0\.6\.0"/);
  assert.match(html, /data-build="mw-v06-env-20260918a"/);
  assert.match(loader, /__MEOW_WARS_VERSION/);
  assert.match(loader, /__MEOW_WARS_BUILD/);
});

test('Meow Wars v0.6 removes forced crisp-edge scaling and advertises seven battlefields', () => {
  const css = read('public/games/meow-wars/styles.css');
  const hub = read('public/games/index.html');
  assert.match(css, /image-rendering:\s*auto/);
  assert.doesNotMatch(css, /crisp-edges|-webkit-optimize-contrast/);
  assert.match(hub, /seven battlefields/i);
});
