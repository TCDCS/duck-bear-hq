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

function composeV08() {
  let source = productionV05Source();
  const renderPattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
  assert.match(source, /new Phaser\.Game\(config\);/);
  for (const method of [
    'muzzleFx','explosionFx','damageCat','updateProjectiles','createSky',
    'fireHitscan','fireProjectile','placeDeployable','fireAirstrike','fireRunner','fireLaser'
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
  const tintReplacement = 'cat.sprite.setTint?.(0xffffff);\n        cat.sprite.setTintMode?.(Phaser.TintModes.FILL);';
  source = source.split(legacyTint).join(tintReplacement);

  const hd = read('public/games/meow-wars/v06-hd.js');
  const gamefeel = read('public/games/meow-wars/v07-gamefeel.js');
  const battlePolish = read('public/games/meow-wars/v08-battle-polish.js');
  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  return source.slice(0, index) + '\n' + hd + '\n' + gamefeel + '\n' + battlePolish + '\n' + source.slice(index);
}

test('Meow Wars v0.8 composes and compiles against the real v0.5 production payload', () => {
  const source = composeV08();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v08-battle-polish-20260918a/);
  assert.match(source, /viewportScale/);
  assert.doesNotMatch(source, /setTintFill/);
  assert.match(source, /Phaser\.TintModes\.FILL/);
  assert.match(source, /new Phaser\.Game\(config\);/);
});

test('Meow Wars v0.8 contains weapon-specific polish for all 16 weapons', () => {
  const fx = read('public/games/meow-wars/v08-battle-polish.js');
  for (const id of [
    'pistol','shotgun','assault-rifle','sniper','bazooka','grenade','mine','dynamite',
    'airstrike','fish-launcher','yarn-bomb','hairball-mortar','catnip-grenade',
    'exploding-mouse','roomba-ride','laser-pointer'
  ]) assert.ok(fx.includes("'" + id + "'"), id);

  for (const marker of [
    'muzzleAccent',
    'hitscanImpact',
    'projectileTrail',
    'deployablePolish',
    'runnerPolish',
    'weaponExplosionSignature',
    'incomingMarker'
  ]) assert.ok(fx.includes(marker), marker);

  assert.match(fx, /GameScene\.prototype\.fireHitscan/);
  assert.match(fx, /GameScene\.prototype\.fireProjectile/);
  assert.match(fx, /GameScene\.prototype\.fireAirstrike/);
  assert.match(fx, /GameScene\.prototype\.fireRunner/);
  assert.match(fx, /GameScene\.prototype\.fireLaser/);
});

test('Meow Wars v0.8 adds richer destruction, arena reactions, cat animation and HUD feedback', () => {
  const fx = read('public/games/meow-wars/v08-battle-polish.js');
  for (const marker of [
    '__MEOW_WARS_V08_STATS',
    'terrainDebris',
    'arenaImpact',
    'hitExpression',
    'updateCatPolish',
    'updateWeaponPanel',
    'urgentTicks',
    'selected-weapon-detail',
    'active-turn-halo',
    'celebrate'
  ]) assert.ok(fx.includes(marker), marker);

  for (const arena of [
    'garden-siege',
    'rooftop-rumble',
    'junkyard-jamboree',
    'taj-mahal',
    'oconnell-bridge-spire',
    'westminster-bridge-big-ben'
  ]) assert.ok(fx.includes(arena), arena);
  assert.match(fx, /colors = \[0xf0d19a, 0xaee9f5, 0xffffff\]/);
});

test('Meow Wars v0.8 retains the approved v0.7.1 Dublin branding and 4K HD pipeline', () => {
  const v07 = read('public/games/meow-wars/v07-gamefeel.js');
  const hd = read('public/games/meow-wars/v06-hd.js');

  assert.match(v07, /CENTRA_TEAL = '#138d98'/);
  assert.match(v07, /CENTRA_YELLOW = '#efd01f'/);
  assert.match(v07, /SUPERVALU_RED = '#c8102e'/);
  assert.match(v07, /TEMPLE_RED = '#9a2025'/);
  assert.match(v07, /THE TEMPLE BAR/);
  assert.match(v07, /HA'PENNY BRIDGE/);
  assert.match(v07, /drawSpire\(c, 1040, 405, 400\)/);
  assert.match(hd, /MW_SOURCE_W = 3840/);
  assert.match(hd, /MW_SOURCE_H = 2160/);
});

test('Meow Wars v0.8 shell and loader expose the current version/build and all three enhancement layers', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v08-loader.mjs');
  const css = read('public/games/meow-wars/styles.css');

  assert.match(html, /v08-loader\.mjs\?v=8a/);
  assert.match(html, /data-version="0\.8\.0"/);
  assert.match(html, /data-build="mw-v08-battle-polish-20260918a"/);
  assert.match(loader, /v06-hd\.js\?v=8a/);
  assert.match(loader, /v07-gamefeel\.js\?v=8a/);
  assert.match(loader, /v08-battle-polish\.js\?v=8a/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
  assert.match(css, /image-rendering:\s*auto/);
  assert.doesNotMatch(css, /crisp-edges|-webkit-optimize-contrast/);
});
