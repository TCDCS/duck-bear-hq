/* Meow Wars v1.0.0 release pass.
   Persistent settings + touch controls + release hardening. */
(() => {
'use strict';

const MW10_VERSION = '1.0.0';
const MW10_BUILD = 'mw-v10-release-20260918a';
const SETTINGS_KEY = 'meow-wars-v10-settings';

const DEFAULT_SETTINGS = Object.freeze({
  aimAssist: true,
  screenShake: true,
  sfx: true,
  hudDetail: true,
  touchMode: 'auto'
});

const stats = globalThis.__MEOW_WARS_V10_STATS = {
  settingsLoaded: 0,
  settingsSaved: 0,
  settingsApplied: 0,
  touchUiCreated: 0,
  touchInputFrames: 0,
  forcedShakeBlocks: 0,
  audioBlocks: 0
};

function copyDefaults() {
  return { ...DEFAULT_SETTINGS };
}

function loadSettings() {
  const settings = copyDefaults();
  try {
    const raw = globalThis.localStorage?.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (typeof saved.aimAssist === 'boolean') settings.aimAssist = saved.aimAssist;
      if (typeof saved.screenShake === 'boolean') settings.screenShake = saved.screenShake;
      if (typeof saved.sfx === 'boolean') settings.sfx = saved.sfx;
      if (typeof saved.hudDetail === 'boolean') settings.hudDetail = saved.hudDetail;
      if (['auto', 'on', 'off'].includes(saved.touchMode)) settings.touchMode = saved.touchMode;
    }
  } catch {
    // Bad/stale local settings should never stop the game booting.
  }
  stats.settingsLoaded += 1;
  return settings;
}

const settings = globalThis.__MEOW_WARS_SETTINGS = loadSettings();

function saveSettings() {
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
    stats.settingsSaved += 1;
  } catch {
    // Private browsing/storage denial: keep settings for this session.
  }
}

function touchEnvironment() {
  try {
    return Boolean(
      globalThis.matchMedia?.('(pointer: coarse)').matches ||
      globalThis.navigator?.maxTouchPoints > 0 ||
      (globalThis.innerWidth || 1280) < 900
    );
  } catch {
    return (globalThis.innerWidth || 1280) < 900;
  }
}

function touchEnabled() {
  if (settings.touchMode === 'on') return true;
  if (settings.touchMode === 'off') return false;
  return touchEnvironment();
}

function settingLabel(key) {
  if (key === 'touchMode')
    return settings.touchMode.toUpperCase();
  return settings[key] ? 'ON' : 'OFF';
}

function toggleSetting(key) {
  if (key === 'touchMode') {
    settings.touchMode = settings.touchMode === 'auto' ? 'on' : settings.touchMode === 'on' ? 'off' : 'auto';
  } else {
    settings[key] = !settings[key];
  }
  saveSettings();
  return settingLabel(key);
}

function disableOldSettingsButton(scene) {
  for (const child of scene.children.list) {
    if (typeof child.text === 'string') {
      if (child.text.includes('MEOW WARS v0.9.0'))
        child.setText(child.text.replace('MEOW WARS v0.9.0', 'MEOW WARS v' + MW10_VERSION));
      if (child.text.includes('mw-v09-battle-presentation-20260918a'))
        child.setText(child.text.replace('mw-v09-battle-presentation-20260918a', MW10_BUILD));
      if (child.text === 'SETTINGS' && Math.abs((child.x || 0) - 1160) < 3 && Math.abs((child.y || 0) - 45) < 3)
        child.setVisible(false);
    }
    if (child.input && Math.abs((child.x || 0) - 1160) < 3 && Math.abs((child.y || 0) - 45) < 3)
      child.disableInteractive?.();
  }
}

function clearOverlay(scene) {
  if (!scene.__mw10SettingsOverlay) return;
  for (const object of scene.__mw10SettingsOverlay)
    object?.destroy?.();
  scene.__mw10SettingsOverlay = null;
}

function settingsRow(scene, items, y, label, key, detail) {
  const row = scene.add.rectangle(640, y, 650, 46, 0x0b2038, .96)
    .setStrokeStyle(1, 0x5c91b6, .42)
    .setDepth(903);
  const title = scene.add.text(350, y - 7, label, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '15px',
    color: '#ffffff'
  }).setDepth(904);
  const sub = scene.add.text(350, y + 12, detail, {
    fontFamily: 'Arial',
    fontSize: '10px',
    color: '#9fc4dc'
  }).setDepth(904);

  const button = scene.add.rectangle(880, y, 118, 31, 0x173d61, .99)
    .setStrokeStyle(2, settings[key] === false || settings[key] === 'off' ? 0xe06b6b : 0xffd253, .9)
    .setInteractive({ useHandCursor: true })
    .setDepth(905);
  const value = scene.add.text(880, y, settingLabel(key), {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(906);

  button.on('pointerdown', () => {
    const next = toggleSetting(key);
    value.setText(next);
    button.setStrokeStyle(
      2,
      next === 'OFF' ? 0xe06b6b : next === 'AUTO' ? 0x6bcff5 : 0xffd253,
      .9
    );
  });

  items.push(row, title, sub, button, value);
}

function openSettings(scene) {
  if (scene.__mw10SettingsOverlay) return;

  const items = [];
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x06111e, .86)
    .setInteractive()
    .setDepth(900);
  const panel = scene.add.rectangle(640, 350, 760, 590, 0x102a47, .995)
    .setStrokeStyle(4, 0x63d8ff, .9)
    .setDepth(901);
  const title = scene.add.text(640, 78, 'MEOW WARS v' + MW10_VERSION, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '32px',
    color: '#ffd253',
    stroke: '#13243d',
    strokeThickness: 5
  }).setOrigin(.5).setDepth(902);
  const build = scene.add.text(640, 111, MW10_BUILD, {
    fontFamily: 'Arial',
    fontSize: '12px',
    color: '#a9d9f4'
  }).setOrigin(.5).setDepth(902);

  items.push(dim, panel, title, build);

  settingsRow(scene, items, 170, 'AIM ASSIST', 'aimAssist', 'Landing / impact reticles for human turns');
  settingsRow(scene, items, 226, 'SCREEN SHAKE', 'screenShake', 'Explosion camera shake');
  settingsRow(scene, items, 282, 'SOUND EFFECTS', 'sfx', 'Shots, explosions, meows and UI tones');
  settingsRow(scene, items, 338, 'WEAPON DETAIL HUD', 'hudDetail', 'Selected weapon name, ammo and description');
  settingsRow(scene, items, 394, 'TOUCH CONTROLS', 'touchMode', 'AUTO detects touch/small screens · ON/OFF overrides');

  const note = scene.add.text(640, 455,
    'Keyboard: A/D move · W/S aim · SPACE charge/fire · Q/E weapons\n' +
    'Gamepad: left stick move/aim · A fire · LB/RB weapons\n' +
    'Touch: movement, aim, fire and weapon buttons appear in battle', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#d9effc',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(.5).setDepth(902);

  const close = scene.add.rectangle(640, 565, 220, 44, 0xef5b52, 1)
    .setStrokeStyle(2, 0xffeee0, 1)
    .setInteractive({ useHandCursor: true })
    .setDepth(905);
  const closeText = scene.add.text(640, 565, 'CLOSE', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '18px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(906);

  dim.on('pointerdown', () => clearOverlay(scene));
  close.on('pointerdown', () => clearOverlay(scene));
  items.push(note, close, closeText);
  scene.__mw10SettingsOverlay = items;
}

function makeTouchButton(scene, x, y, w, h, text, onDown, onUp = null) {
  const rect = scene.add.rectangle(x, y, w, h, 0x0b2948, .62)
    .setStrokeStyle(2, 0x80d9ff, .56)
    .setInteractive({ useHandCursor: true })
    .setDepth(130);
  const label = scene.add.text(x, y, text, {
    fontFamily: 'Arial Black, Arial',
    fontSize: text.length > 4 ? '11px' : '18px',
    color: '#ffffff',
    align: 'center'
  }).setOrigin(.5).setDepth(131);

  rect.on('pointerdown', (pointer) => {
    pointer?.event?.preventDefault?.();
    rect.setFillStyle(0x236b9f, .8);
    onDown?.();
  });

  const release = (pointer) => {
    pointer?.event?.preventDefault?.();
    rect.setFillStyle(0x0b2948, .62);
    onUp?.();
  };
  rect.on('pointerup', release);
  rect.on('pointerout', release);
  rect.on('pointerupoutside', release);

  return [rect, label];
}

function destroyTouchUi(scene) {
  if (!scene.__mw10TouchObjects) return;
  for (const object of scene.__mw10TouchObjects)
    object?.destroy?.();
  scene.__mw10TouchObjects = null;
  scene.__mw10Touch = null;
}

function createTouchUi(scene) {
  destroyTouchUi(scene);
  if (!touchEnabled()) return;

  const touch = scene.__mw10Touch = {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    prevFire: false
  };
  const objects = [];

  objects.push(...makeTouchButton(scene, 52, 565, 70, 54, '◀', () => { touch.left = true; }, () => { touch.left = false; }));
  objects.push(...makeTouchButton(scene, 126, 565, 70, 54, '▶', () => { touch.right = true; }, () => { touch.right = false; }));

  objects.push(...makeTouchButton(scene, 1080, 535, 72, 44, 'AIM ▲', () => { touch.up = true; }, () => { touch.up = false; }));
  objects.push(...makeTouchButton(scene, 1156, 535, 72, 44, 'AIM ▼', () => { touch.down = true; }, () => { touch.down = false; }));
  objects.push(...makeTouchButton(scene, 1198, 585, 92, 54, 'FIRE', () => { touch.fire = true; }, () => { touch.fire = false; }));

  objects.push(...makeTouchButton(scene, 1042, 585, 62, 44, 'Q', () => {
    if (!scene.actionLocked && !scene.gameOver && !scene.isCpuTurn())
      scene.cycleWeapon(-1);
  }));
  objects.push(...makeTouchButton(scene, 1108, 585, 62, 44, 'E', () => {
    if (!scene.actionLocked && !scene.gameOver && !scene.isCpuTurn())
      scene.cycleWeapon(1);
  }));

  scene.__mw10TouchObjects = objects;
  stats.touchUiCreated += 1;
}

function applyTouchInput(scene, delta) {
  const touch = scene.__mw10Touch;
  if (!touch || scene.gameOver || scene.paused || scene.actionLocked || scene.isCpuTurn())
    return;

  const active = scene.activeCat();
  if (!active?.alive) return;

  const dt = Math.min(delta, 40) / 1000;

  if (touch.left !== touch.right) {
    const direction = touch.left ? -1 : 1;
    scene.facing = direction;
    const nextX = Math.max(28, Math.min(WIDTH - 28, active.x + direction * 92 * dt));
    const nextSurface = surfaceY(scene.terrain, nextX);
    if (nextSurface < HEIGHT) {
      active.x = nextX;
      if (active.vy === 0)
        active.y = nextSurface - CAT_FOOT;
    }
  }

  if (touch.up)
    scene.aimAngleDeg = Math.max(8, Math.min(82, scene.aimAngleDeg + 52 * dt));
  if (touch.down)
    scene.aimAngleDeg = Math.max(8, Math.min(82, scene.aimAngleDeg - 52 * dt));

  if (touch.fire) {
    scene.chargePower = Math.max(.36, Math.min(1, scene.chargePower + Math.min(delta, 40) * .00055));
  } else if (touch.prevFire) {
    scene.fireCurrentWeapon();
  }

  touch.prevFire = touch.fire;
  scene.syncSprites?.();
  stats.touchInputFrames += 1;
}

function applyHudSetting(scene) {
  const panel = scene.__mw08WeaponPanel;
  if (!panel) return;
  const visible = settings.hudDetail;
  panel.back?.setVisible?.(visible);
  panel.name?.setVisible?.(visible);
  panel.desc?.setVisible?.(visible);
}

function applyAimSetting(scene) {
  if (settings.aimAssist) return;
  scene.__mw09AimGuide?.clear?.();
}

function refreshTouchSetting(scene) {
  const should = touchEnabled();
  const exists = Boolean(scene.__mw10TouchObjects);
  if (should && !exists)
    createTouchUi(scene);
  else if (!should && exists)
    destroyTouchUi(scene);
}

function installAudioGate() {
  if (Sfx.prototype.__mw10AudioGateInstalled) return;
  Sfx.prototype.__mw10AudioGateInstalled = true;

  for (const name of ['click', 'shot', 'explosion', 'meow', 'tone']) {
    const original = Sfx.prototype[name];
    if (typeof original !== 'function') continue;
    Sfx.prototype[name] = function(...args) {
      if (!settings.sfx) {
        stats.audioBlocks += 1;
        return;
      }
      return original.apply(this, args);
    };
  }
}

installAudioGate();

const v09MenuCreate = MenuScene.prototype.create;
MenuScene.prototype.create = function() {
  v09MenuCreate.call(this);
  disableOldSettingsButton(this);

  const button = this.add.rectangle(1160, 45, 170, 36, 0x173d61, .99)
    .setStrokeStyle(2, 0xffd253, .95)
    .setInteractive({ useHandCursor: true })
    .setDepth(390);
  this.add.text(1160, 45, 'SETTINGS', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(391);
  button.on('pointerdown', () => openSettings(this));
};

const v09Create = GameScene.prototype.create;
GameScene.prototype.create = function() {
  v09Create.call(this);
  createTouchUi(this);
  applyHudSetting(this);
  applyAimSetting(this);
  const marker = this.children.getByName('mw-build-marker');
  if (marker?.setText)
    marker.setText('v' + MW10_VERSION + ' · ' + MW10_BUILD);
  stats.settingsApplied += 1;
};

const v09Update = GameScene.prototype.update;
GameScene.prototype.update = function(time, delta) {
  v09Update.call(this, time, delta);
  if (!this.hud || !this.cats) return;
  applyTouchInput(this, delta);
  applyHudSetting(this);
  applyAimSetting(this);
  refreshTouchSetting(this);
};

const v09Explode = GameScene.prototype.explode;
GameScene.prototype.explode = function(x, y, weapon, ownerId) {
  if (settings.screenShake)
    return v09Explode.call(this, x, y, weapon, ownerId);

  const camera = this.cameras?.main;
  const originalShake = camera?.shake;
  if (camera && typeof originalShake === 'function') {
    camera.shake = function() { return camera; };
    stats.forcedShakeBlocks += 1;
  }
  try {
    return v09Explode.call(this, x, y, weapon, ownerId);
  } finally {
    if (camera && originalShake)
      camera.shake = originalShake;
  }
};

const previousBuildInfo = globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion = MW10_VERSION;
document.documentElement.dataset.meowWarsBuild = MW10_BUILD;
const host = document.getElementById('game');
if (host) {
  host.dataset.version = MW10_VERSION;
  host.dataset.build = MW10_BUILD;
}
globalThis.__MEOW_WARS_VERSION = MW10_VERSION;
globalThis.__MEOW_WARS_BUILD = MW10_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO = () => {
  const base = typeof previousBuildInfo === 'function' ? previousBuildInfo() : {};
  return {
    ...base,
    version: MW10_VERSION,
    build: MW10_BUILD,
    releaseSettings: { ...settings },
    touchEnabled: touchEnabled(),
    v10Stats: { ...stats }
  };
};
})();
