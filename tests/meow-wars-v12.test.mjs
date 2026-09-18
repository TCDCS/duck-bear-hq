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

function composeV12() {
  let source = productionV05Source();
  const renderPattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
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
  assert.ok(source.includes(legacyTint));
  source = source.split(legacyTint).join(
    'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);'
  );

  const layers = [
    read('public/games/meow-wars/v06-hd.js'),
    read('public/games/meow-wars/v07-gamefeel.js'),
    read('public/games/meow-wars/v08-battle-polish.js'),
    read('public/games/meow-wars/v09-battle-presentation.js'),
    read('public/games/meow-wars/v10-release.js'),
    read('public/games/meow-wars/v11-living-battlefields.js'),
    read('public/games/meow-wars/v12-online.js')
  ];
  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  assert.ok(index > 0);
  return source.slice(0, index) + '\n' + layers.join('\n') + '\n' + source.slice(index);
}

test('Meow Wars v1.2 composes and compiles against the real production payload', () => {
  const source = composeV12();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v12-online-rooms-20260918a/);
  assert.doesNotMatch(source, /setTintFill/);
  assert.match(source, /new Phaser\.Game\(config\);/);
});

test('Meow Wars v1.2 exposes private-room create, join, ready, start and reconnect UI', () => {
  const source = read('public/games/meow-wars/v12-online.js');

  for (const marker of [
    'ONLINE 1V1',
    'CREATE ROOM',
    'JOIN ROOM',
    'START ONLINE BATTLE',
    'RECONNECT TO ROOM',
    'READY',
    'LEAVE ROOM',
    'meow-wars-online-v1',
    '/api/meow-wars/',
    'new WebSocket',
    'scheduleReconnect',
    'Private 1v1'
  ]) assert.ok(source.includes(marker), marker);
});

test('Meow Wars v1.2 uses host-authoritative snapshots with server-gated guest intents', () => {
  const source = read('public/games/meow-wars/v12-online.js');

  for (const marker of [
    'makeHostSnapshot',
    'sendHostSnapshot',
    'applyGuestSnapshot',
    'sendGuestState',
    'applyRemoteIntent',
    "kind: 'fire'",
    "kind: 'state'",
    "kind: 'weapon'",
    'turnTeam',
    'ammoSnapshot',
    '__mw12Craters',
    'applyCraterSnapshot',
    'applyPropSnapshot',
    'networkFrozen'
  ]) assert.ok(source.includes(marker), marker);

  assert.match(source, /if \(this\.mode === 'online' && !isHost\(\)\) return;/);
  assert.match(source, /active\.team !== localTeam\(\)/);
});

test('Meow Wars v1.2 keeps v1.1 living props and v1.0 mobile controls', () => {
  const v11 = read('public/games/meow-wars/v11-living-battlefields.js');
  const v10 = read('public/games/meow-wars/v10-release.js');
  const v07 = read('public/games/meow-wars/v07-gamefeel.js');

  assert.match(v11, /createLivingProps/);
  assert.match(v11, /damageLivingProps/);
  assert.match(v11, /greenhouse/);
  assert.match(v11, /dublin-lamp/);
  assert.match(v10, /createTouchUi/);
  assert.match(v10, /TOUCH CONTROLS/);
  assert.match(v07, /THE TEMPLE BAR/);
  assert.match(v07, /SUPERVALU_RED/);
  assert.match(v07, /CENTRA_TEAL/);
});

test('Meow Wars v1.2 shell and loader expose all cumulative layers', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v12-loader.mjs');

  assert.match(html, /v12-loader\.mjs\?v=12a/);
  assert.match(html, /data-version="1\.2\.0"/);
  assert.match(html, /data-build="mw-v12-online-rooms-20260918a"/);
  assert.match(loader, /v11-living-battlefields\.js\?v=12a/);
  assert.match(loader, /v12-online\.js\?v=12a/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
});
