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

function composeV09() {
  let source = productionV05Source();
  const renderPattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
  assert.match(source, /new Phaser\.Game\(config\);/);

  for (const method of [
    'showTurnBanner','fireCurrentWeapon','fireHitscan','explode','damageCat','checkWin',
    'drawAim','raycast','targetX'
  ]) assert.ok(source.includes('GameScene.prototype.' + method), 'production method ' + method);

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
  const tintCount = source.split(legacyTint).length - 1;
  assert.ok(tintCount >= 1);
  source = source.split(legacyTint).join(
    'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);'
  );

  const layers = [
    read('public/games/meow-wars/v06-hd.js'),
    read('public/games/meow-wars/v07-gamefeel.js'),
    read('public/games/meow-wars/v08-battle-polish.js'),
    read('public/games/meow-wars/v09-battle-presentation.js')
  ];
  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  return source.slice(0, index) + '\n' + layers.join('\n') + '\n' + source.slice(index);
}

test('Meow Wars v0.9 composes and compiles against the real production payload', () => {
  const source = composeV09();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v09-battle-presentation-20260918a/);
  assert.doesNotMatch(source, /setTintFill/);
  assert.match(source, /Phaser\.TintModes\.FILL/);
  assert.match(source, /new Phaser\.Game\(config\);/);
});

test('Meow Wars v0.9 adds aim, wind and turn-readability presentation', () => {
  const fx = read('public/games/meow-wars/v09-battle-presentation.js');

  for (const marker of [
    '__MEOW_WARS_V09_STATS',
    'projectileLanding',
    'updateAimAssist',
    'drawReticle',
    'updateWindVisual',
    'showTurnBanner',
    'TURN ',
    'WIND '
  ]) assert.ok(fx.includes(marker), marker);

  assert.match(fx, /weapon\.behaviour === 'projectile'/);
  assert.match(fx, /weapon\.behaviour === 'hitscan'/);
  assert.match(fx, /weapon\.behaviour === 'airstrike'/);
  assert.match(fx, /weapon\.behaviour === 'ground-runner'/);
});

test('Meow Wars v0.9 tracks combat statistics and renders richer battle-end feedback', () => {
  const fx = read('public/games/meow-wars/v09-battle-presentation.js');

  for (const marker of [
    'trackShot',
    'recordDamage',
    'hitCallout',
    'BIG HIT!',
    'DIRECT HIT',
    'KO!',
    'heavyImpactFlash',
    'showRecap',
    'BATTLE RECAP',
    'damage: [0, 0]',
    'shots: [0, 0]',
    'kos: [0, 0]'
  ]) assert.ok(fx.includes(marker), marker);

  assert.match(fx, /GameScene\.prototype\.fireCurrentWeapon/);
  assert.match(fx, /GameScene\.prototype\.damageCat/);
  assert.match(fx, /GameScene\.prototype\.checkWin/);
});

test('Meow Wars v0.9 keeps v0.8 battle polish, Dublin branding and the 4K HD pipeline', () => {
  const v08 = read('public/games/meow-wars/v08-battle-polish.js');
  const v07 = read('public/games/meow-wars/v07-gamefeel.js');
  const hd = read('public/games/meow-wars/v06-hd.js');

  assert.match(v08, /terrainDebris/);
  assert.match(v08, /weaponExplosionSignature/);
  assert.match(v08, /selected-weapon-detail/);
  assert.match(v07, /CENTRA_TEAL = '#138d98'/);
  assert.match(v07, /SUPERVALU_RED = '#c8102e'/);
  assert.match(v07, /THE TEMPLE BAR/);
  assert.match(v07, /HA'PENNY BRIDGE/);
  assert.match(hd, /MW_SOURCE_W = 3840/);
  assert.match(hd, /MW_SOURCE_H = 2160/);
});

test('Meow Wars v0.9 shell and loader expose the current version/build and four enhancement layers', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v09-loader.mjs');
  const css = read('public/games/meow-wars/styles.css');

  assert.match(html, /v09-loader\.mjs\?v=9a/);
  assert.match(html, /data-version="0\.9\.0"/);
  assert.match(html, /data-build="mw-v09-battle-presentation-20260918a"/);
  assert.match(loader, /v06-hd\.js\?v=9a/);
  assert.match(loader, /v07-gamefeel\.js\?v=9a/);
  assert.match(loader, /v08-battle-polish\.js\?v=9a/);
  assert.match(loader, /v09-battle-presentation\.js\?v=9a/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
  assert.match(css, /image-rendering:\s*auto/);
  assert.doesNotMatch(css, /crisp-edges|-webkit-optimize-contrast/);
});
