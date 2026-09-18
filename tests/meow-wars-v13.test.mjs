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

function composeV13() {
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
    read('public/games/meow-wars/v12-online.js'),
    read('public/games/meow-wars/v13-environment-depth.js')
  ];

  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  assert.ok(index > 0);
  return source.slice(0, index) + '\n' + layers.join('\n') + '\n' + source.slice(index);
}

test('Meow Wars v1.3 composes and compiles over the real production payload and online layer', () => {
  const source = composeV13();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v13-environment-depth-20260918a/);
  assert.match(source, /mw-v12-online-rooms-20260918a/);
  assert.match(source, /MEOW_DIRECTORY|__MEOW_WARS_ONLINE/);
  assert.doesNotMatch(source, /setTintFill/);
});

test('Meow Wars v1.3 gives all seven maps distinct environment depth', () => {
  const env = read('public/games/meow-wars/v13-environment-depth.js');

  for (const arena of [
    'garden-siege',
    'rooftop-rumble',
    'junkyard-jamboree',
    'taj-mahal',
    'oconnell-bridge-spire',
    'westminster-bridge-big-ben',
    'donabate-beach'
  ]) assert.ok(env.includes("'" + arena + "'"), arena);

  for (const marker of [
    'drawGardenStatic',
    'drawRooftopStatic',
    'drawJunkyardStatic',
    'drawTajStatic',
    'drawDublinStatic',
    'drawWestminsterStatic',
    'drawBeachStatic',
    'setupMovingDetails'
  ]) assert.ok(env.includes(marker), marker);
});

test('Meow Wars v1.3 adds map-specific water, reflections and weather without gameplay authority', () => {
  const env = read('public/games/meow-wars/v13-environment-depth.js');

  for (const marker of [
    'createWaterGraphics',
    'updateWater',
    'Rainy Liffey',
    'Thames Overcast',
    'Breezy Tide',
    'Reflecting pool shimmer',
    "item.kind==='rain'",
    "item.kind==='boat'",
    "item.kind==='boat-left'",
    'stats.waterFrames',
    'stats.weatherFrames',
    'stats.reflections'
  ]) assert.ok(env.includes(marker), marker);

  assert.doesNotMatch(env, /carveCircle\(/);
  assert.doesNotMatch(env, /damageCat\(/);
  assert.doesNotMatch(env, /fireCurrentWeapon\(/);
  assert.doesNotMatch(env, /teamAmmo\[/);
});

test('Meow Wars v1.3 improves foreground material grounding and respects mobile/reduced FX density', () => {
  const env = read('public/games/meow-wars/v13-environment-depth.js');

  assert.match(env, /setupPropPresentation/);
  assert.match(env, /updatePropPresentation/);
  assert.match(env, /propContactShadows:true/);
  assert.match(env, /MOBILE/);
  assert.match(env, /fxIntensity === 'reduced'/);
  assert.match(env, /DETAIL_FACTOR/);
  assert.match(env, /greenhouse/);
  assert.match(env, /water-tank/);
  assert.match(env, /dublin-lamp/);
  assert.match(env, /westminster-lamp/);
  assert.match(env, /lifebuoy/);
});

test('Meow Wars v1.3 preserves the v1.2 online room contract', () => {
  const online = read('public/games/meow-wars/v12-online.js');
  const wrangler = read('wrangler.jsonc');
  const routes = read('src/game-routes.js');

  assert.match(online, /ONLINE 1V1/);
  assert.match(online, /scheduleReconnect/);
  assert.match(online, /sendHostSnapshot/);
  assert.match(online, /applyGuestSnapshot/);
  assert.match(online, /touchUiCreated|__mw10Touch/);
  assert.match(wrangler, /"MEOW_DIRECTORY"/);
  assert.match(wrangler, /"MEOW_ROOMS"/);
  assert.match(routes, /routeMeowWarsMultiplayer/);
});

test('Meow Wars v1.3 shell and loader expose environment-depth release', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v13-loader.mjs');

  assert.match(html, /v13-loader\.mjs\?v=13a/);
  assert.match(html, /data-version="1\.3\.0"/);
  assert.match(html, /data-build="mw-v13-environment-depth-20260918a"/);
  assert.match(loader, /v12-online\.js\?v=13a/);
  assert.match(loader, /v13-environment-depth\.js\?v=13a/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
});
