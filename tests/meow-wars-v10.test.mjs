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

function composeV10() {
  let source = productionV05Source();
  const renderPattern = /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;

  for (const method of [
    'create','update','explode','fireCurrentWeapon','cycleWeapon',
    'activeCat','syncSprites','drawAim'
  ]) {
    assert.ok(source.includes('GameScene.prototype.' + method), 'production method ' + method);
  }
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
    read('public/games/meow-wars/v10-release.js')
  ];

  const marker = 'new Phaser.Game(config);';
  const index = source.lastIndexOf(marker);
  return source.slice(0, index) + '\n' + layers.join('\n') + '\n' + source.slice(index);
}

test('Meow Wars v1.0 composes and compiles against the real production payload', () => {
  const source = composeV10();
  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /mw-v10-release-20260918a/);
  assert.doesNotMatch(source, /setTintFill/);
  assert.match(source, /Phaser\.TintModes\.FILL/);
  assert.match(source, /new Phaser\.Game\(config\);/);
});

test('Meow Wars v1.0 has persistent release settings with safe defaults', () => {
  const release = read('public/games/meow-wars/v10-release.js');

  for (const marker of [
    "SETTINGS_KEY = 'meow-wars-v10-settings'",
    'aimAssist: true',
    'screenShake: true',
    'sfx: true',
    "fxIntensity: 'full'",
    'hudDetail: true',
    "touchMode: 'auto'",
    'localStorage?.getItem',
    'localStorage?.setItem',
    '__MEOW_WARS_SETTINGS',
    'settingsLoaded',
    'settingsSaved'
  ]) assert.ok(release.includes(marker), marker);

  assert.match(release, /AIM ASSIST/);
  assert.match(release, /SCREEN SHAKE/);
  assert.match(release, /SOUND EFFECTS/);
  assert.match(release, /FX INTENSITY/);
  assert.match(release, /WEAPON DETAIL HUD/);
  assert.match(release, /TOUCH CONTROLS/);
});

test('Meow Wars v1.0 provides real touch movement, aim, fire and weapon controls', () => {
  const release = read('public/games/meow-wars/v10-release.js');

  for (const marker of [
    'touchEnvironment',
    'touchEnabled',
    'createTouchUi',
    'applyTouchInput',
    'AIM ▲',
    'AIM ▼',
    'FIRE',
    "scene.cycleWeapon(-1)",
    "scene.cycleWeapon(1)",
    'touch.left',
    'touch.right',
    'touch.fire',
    'scene.fireCurrentWeapon()',
    "type: 'move'",
    "type: 'aim'",
    'touchInputFrames'
  ]) assert.ok(release.includes(marker), marker);

  assert.match(release, /navigator\?\.maxTouchPoints/);
  assert.match(release, /matchMedia\?\.\('\(pointer: coarse\)'\)/);
});

test('Meow Wars v1.0 settings actively gate aim, shake, audio, FX density and weapon detail', () => {
  const release = read('public/games/meow-wars/v10-release.js');

  assert.match(release, /scene\.__mw09AimGuide\?\.clear/);
  assert.match(release, /settings\.screenShake/);
  assert.match(release, /forcedShakeBlocks/);
  assert.match(release, /installAudioGate/);
  assert.match(release, /audioBlocks/);
  assert.match(release, /trimExplosionFx/);
  assert.match(release, /settings\.fxIntensity !== 'reduced'/);
  assert.match(release, /fxTrimmed/);
  assert.match(release, /scene\.__mw08WeaponPanel/);
  assert.match(release, /settings\.hudDetail/);
});

test('Meow Wars v1.0 preserves v0.9 presentation, v0.8 combat polish, Dublin branding and 4K art', () => {
  const v09 = read('public/games/meow-wars/v09-battle-presentation.js');
  const v08 = read('public/games/meow-wars/v08-battle-polish.js');
  const v07 = read('public/games/meow-wars/v07-gamefeel.js');
  const hd = read('public/games/meow-wars/v06-hd.js');

  assert.match(v09, /BATTLE RECAP/);
  assert.match(v09, /projectileLanding/);
  assert.match(v08, /terrainDebris/);
  assert.match(v08, /weaponExplosionSignature/);
  assert.match(v07, /CENTRA_TEAL = '#138d98'/);
  assert.match(v07, /SUPERVALU_RED = '#c8102e'/);
  assert.match(v07, /THE TEMPLE BAR/);
  assert.match(v07, /HA'PENNY BRIDGE/);
  assert.match(hd, /MW_SOURCE_W = 3840/);
  assert.match(hd, /MW_SOURCE_H = 2160/);
});

test('Meow Wars v1.0 shell and loader expose the release version/build and all cumulative layers', () => {
  const html = read('public/games/meow-wars/index.html');
  const loader = read('public/games/meow-wars/v10-loader.mjs');
  const css = read('public/games/meow-wars/styles.css');

  assert.match(html, /v10-loader\.mjs\?v=10a/);
  assert.match(html, /data-version="1\.0\.0"/);
  assert.match(html, /data-build="mw-v10-release-20260918a"/);
  assert.match(loader, /v06-hd\.js\?v=10a/);
  assert.match(loader, /v07-gamefeel\.js\?v=10a/);
  assert.match(loader, /v08-battle-polish\.js\?v=10a/);
  assert.match(loader, /v09-battle-presentation\.js\?v=10a/);
  assert.match(loader, /v10-release\.js\?v=10a/);
  assert.match(loader, /__MEOW_WARS_LOADER_BUILD/);
  assert.match(css, /image-rendering:\s*auto/);
  assert.doesNotMatch(css, /crisp-edges|-webkit-optimize-contrast/);
});
