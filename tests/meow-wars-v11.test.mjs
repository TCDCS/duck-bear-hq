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

function composeV11() {
  let source = productionV05Source();
  const renderPattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;

  for (const method of [
    'init','create','update','explode','handleRestartInput','startTurn',
    'activeCat','syncSprites'
  ]) {
    assert.ok(source.includes('GameScene.prototype.' + method), 'production method ' + method);
  }
  assert.ok(source.includes('MenuScene'));
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

  const legacyTint = 'cat.sprite.setTintFill?.(0xffffff);';
  assert.ok(source.split(legacyTint).length - 1 >= 1);
  source = source.split(legacyTint).join(
    'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);'
  );

  const layers = [
    read('public/games/meow-wars/v06-hd.js'),
    read('public/games/meow-wars/v07-gamefeel.js'),
    read('public/games/meow-wars/v08-battle-polish.js'),
    read('public/games/meow-wars/v09-battle-presentation.js'),
    read('public/games/meow-wars/v10-release.js'),
    read('public/games/meow-wars/v11-living-battlefields.js')
  ];

  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  return source.slice(0, index) + '\n' + layers.join('\n') + '\n' + source.slice(index);
}

test('Meow Wars v1.1 composes and compiles against the real production payload', () => {
  const source = composeV11();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v11-living-battlefields-20260918a/);
  assert.doesNotMatch(source, /setTintFill/);
  assert.match(source, /Phaser\.TintModes\.FILL/);
  assert.match(source, /new Phaser\.Game\(config\);/);
});

test('Meow Wars v1.1 hardens menu -> battle transitions and scene reuse', () => {
  const living = read('public/games/meow-wars/v11-living-battlefields.js');

  for (const marker of [
    'MenuScene.prototype.start',
    '__mw11Starting',
    '__MEOW_WARS_PENDING_ARENA',
    '__MEOW_WARS_LAST_START_REQUEST',
    '__MEOW_WARS_LAST_CONFIRMED_ARENA',
    'GameScene.prototype.init',
    'GameScene.prototype.handleRestartInput',
    'cleanupSceneState',
    'resetKeys',
    'Phaser.Scenes.Events.SHUTDOWN',
    'confirmedArenaStarts'
  ]) assert.ok(living.includes(marker), marker);

  assert.match(living, /arenaId:arena\.id/);
  assert.match(living, /requested=data\?\.arenaId\|\|globalThis\.__MEOW_WARS_PENDING_ARENA/);
  assert.match(living, /this\.scene\.start\('MenuScene'/);
});

test('Meow Wars v1.1 adds detailed living props to all seven battlefields', () => {
  const living = read('public/games/meow-wars/v11-living-battlefields.js');

  for (const arena of [
    'garden-siege',
    'rooftop-rumble',
    'junkyard-jamboree',
    'taj-mahal',
    'oconnell-bridge-spire',
    'westminster-bridge-big-ben',
    'donabate-beach'
  ]) assert.ok(living.includes("'" + arena + "'"), arena);

  for (const prop of [
    'wheelbarrow','bbq','greenhouse','garden-chair',
    'hvac','dish','water-tank','roof-vent',
    'car-shell','tyres','oil-drum','scrap-magnet',
    'stone-bench','garden-lamp','stone-planter',
    'dublin-lamp','pub-barrels','bike','wheelie-bin',
    'westminster-lamp','bench','bollard',
    'driftwood','lifebuoy','dune-fence','beach-sign'
  ]) assert.ok(living.includes(prop), prop);

  assert.match(living, /createLinearGradient/);
  assert.match(living, /imageSmoothingQuality='high'/);
  assert.match(living, /metallic\(/);
  assert.match(living, /glass\(/);
  assert.match(living, /wood\(/);
});

test('Meow Wars v1.1 props react to explosions and lost terrain', () => {
  const living = read('public/games/meow-wars/v11-living-battlefields.js');

  for (const marker of [
    'damageLivingProps',
    'destroyLivingProp',
    'spawnPropDebris',
    'updateLivingProps',
    'prop.hp',
    'prop.falling',
    'surfaceY(scene.terrain,prop.x)',
    'stats.propsDamaged',
    'stats.propsDestroyed',
    'stats.propDebris'
  ]) assert.ok(living.includes(marker), marker);

  assert.match(living, /GameScene\.prototype\.explode/);
  assert.match(living, /weapon\.blastRadius\*1\.25/);
});

test('Meow Wars v1.1 preserves v1.0 controls, v0.9 presentation, Dublin branding and 4K art', () => {
  const v10 = read('public/games/meow-wars/v10-release.js');
  const v09 = read('public/games/meow-wars/v09-battle-presentation.js');
  const v07 = read('public/games/meow-wars/v07-gamefeel.js');
  const hd = read('public/games/meow-wars/v06-hd.js');

  assert.match(v10, /TOUCH CONTROLS/);
  assert.match(v10, /FX INTENSITY/);
  assert.match(v10, /meow-wars-v10-settings/);
  assert.match(v09, /BATTLE RECAP/);
  assert.match(v07, /CENTRA_TEAL = '#138d98'/);
  assert.match(v07, /SUPERVALU_RED = '#c8102e'/);
  assert.match(v07, /THE TEMPLE BAR/);
  assert.match(v07, /HA'PENNY BRIDGE/);
  assert.match(hd, /MW_SOURCE_W = 3840/);
  assert.match(hd, /MW_SOURCE_H = 2160/);
});

test('Meow Wars v1.1 shell and loader expose the living-battlefields release', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v11-loader.mjs');

  assert.match(html, /v11-loader\.mjs\?v=11a/);
  assert.match(html, /data-version="1\.1\.0"/);
  assert.match(html, /data-build="mw-v11-living-battlefields-20260918a"/);
  assert.match(loader, /v10-release\.js\?v=11a/);
  assert.match(loader, /v11-living-battlefields\.js\?v=11a/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
});
