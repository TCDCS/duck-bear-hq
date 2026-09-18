/* Meow Wars v0.9.0 battle presentation.
   Loaded after v0.8 battle polish. */
(() => {
'use strict';

const MW09_VERSION = '0.9.0';
const MW09_BUILD = 'mw-v09-battle-presentation-20260918a';

const stats = globalThis.__MEOW_WARS_V09_STATS = {
  aimAssist: 0,
  turnBanners: 0,
  damageTracked: 0,
  shotsTracked: 0,
  kosTracked: 0,
  heavyImpact: 0,
  recapShown: 0,
  windVisualTicks: 0
};

function colorForTeam(team) {
  return team === 0 ? 0x58b9ff : 0xff6f8d;
}

function cssColor(value) {
  return '#' + Number(value >>> 0).toString(16).padStart(6, '0').slice(-6);
}

function clearObjects(list) {
  if (!list) return;
  for (const object of list) object?.destroy?.();
}

function setupPresentation(scene) {
  scene.__mw09AimGuide = scene.add.graphics().setDepth(33);
  scene.__mw09WindMarks = [];
  scene.__mw09BattleStats = {
    damage: [0, 0],
    shots: [0, 0],
    kos: [0, 0]
  };

  for (let i = 0; i < 6; i += 1) {
    const mark = scene.add.text(110 + i * 205, 120 + (i % 3) * 58, '››', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '17px',
      color: '#ffffff',
      stroke: '#12314a',
      strokeThickness: 2
    }).setDepth(-3).setAlpha(.08 + (i % 2) * .025);
    scene.__mw09WindMarks.push({ object: mark, phase: i * 37 });
  }
}

function updateWindVisual(scene, time, delta) {
  const marks = scene.__mw09WindMarks;
  if (!marks) return;
  const direction = Math.abs(scene.wind) < 1 ? 0 : scene.wind > 0 ? 1 : -1;
  const speed = 0.006 + Math.abs(scene.wind) * 0.0013;

  for (const item of marks) {
    const mark = item.object;
    if (!mark?.active) continue;
    mark.setText(direction < 0 ? '‹‹' : direction > 0 ? '››' : '··');
    mark.alpha = direction === 0 ? .035 : Math.min(.18, .055 + Math.abs(scene.wind) / 150);
    if (direction !== 0) {
      mark.x += direction * speed * delta * 10;
      if (mark.x > 1390) mark.x = -90;
      if (mark.x < -90) mark.x = 1390;
      mark.y += Math.sin(time * .0017 + item.phase) * .025 * delta;
    }
  }
  stats.windVisualTicks += 1;
}

function drawReticle(graphics, x, y, color, radius = 13, alpha = .9) {
  graphics.lineStyle(2.5, color, alpha);
  graphics.strokeCircle(x, y, radius);
  graphics.beginPath();
  graphics.moveTo(x - radius - 8, y);
  graphics.lineTo(x - radius + 1, y);
  graphics.moveTo(x + radius - 1, y);
  graphics.lineTo(x + radius + 8, y);
  graphics.moveTo(x, y - radius - 8);
  graphics.lineTo(x, y - radius + 1);
  graphics.moveTo(x, y + radius - 1);
  graphics.lineTo(x, y + radius + 8);
  graphics.strokePath();
}

function projectileLanding(scene, cat, weapon) {
  const angle = scene.aimAngleDeg * Math.PI / 180;
  const speed = weapon.projectileSpeed * (0.65 + scene.chargePower * 0.55);
  let x = cat.x + scene.facing * 30;
  let y = cat.y - 9;
  let vx = Math.cos(angle) * scene.facing * speed;
  let vy = -Math.sin(angle) * speed;

  for (let i = 0; i < 90; i += 1) {
    const dt = .045;
    vx += scene.wind * 5 * weapon.windFactor * dt;
    vy += GRAVITY * dt;
    x += vx * dt;
    y += vy * dt;

    if (x < 0 || x > WIDTH || y > HEIGHT + 30)
      break;
    if (isSolidWorld(scene.terrain, x, y + 3))
      return { x, y: surfaceY(scene.terrain, x) };
    const hit = scene.cats.find((candidate) =>
      candidate.alive &&
      candidate.id !== cat.id &&
      Math.hypot(candidate.x - x, candidate.y - y) < 22
    );
    if (hit)
      return { x: hit.x, y: hit.y - 4 };
  }
  return { x: Math.max(0, Math.min(WIDTH, x)), y: Math.max(0, Math.min(HEIGHT, y)) };
}

function updateAimAssist(scene) {
  const g = scene.__mw09AimGuide;
  if (!g) return;
  g.clear();

  if (scene.gameOver || scene.actionLocked || scene.isCpuTurn())
    return;

  const cat = scene.activeCat();
  if (!cat?.alive)
    return;

  const weapon = WEAPONS[scene.selectedWeaponIndex];
  const teamColor = colorForTeam(cat.team);
  const guideColor = weapon.family === 'cat' ? 0xff79cf : 0x7bd8ff;

  if (weapon.behaviour === 'projectile' || weapon.behaviour === 'lobbed') {
    const end = projectileLanding(scene, cat, weapon);
    drawReticle(g, end.x, end.y - 5, guideColor, 12, .74);
    g.fillStyle(teamColor, .75);
    g.fillTriangle(end.x - 5, end.y - 30, end.x + 5, end.y - 30, end.x, end.y - 21);
  } else if (weapon.behaviour === 'hitscan' || weapon.behaviour === 'spread') {
    const angle = scene.aimAngleDeg * Math.PI / 180;
    const dx = Math.cos(angle) * scene.facing;
    const dy = -Math.sin(angle);
    const max = weapon.id === 'sniper' ? 1180 : 760;
    const hit = scene.raycast(cat.x, cat.y - 4, dx, dy, max, cat.id);
    drawReticle(g, hit.x, hit.y, hit.cat ? 0xffe36e : guideColor, hit.cat ? 16 : 11, .82);
  } else if (weapon.behaviour === 'airstrike' || weapon.behaviour === 'laser') {
    const x = scene.targetX(cat);
    const y = surfaceY(scene.terrain, x);
    drawReticle(g, x, y - 3, weapon.behaviour === 'laser' ? 0xff5675 : 0xffd461, 18, .92);
  } else if (weapon.behaviour === 'deploy') {
    const x = Math.max(10, Math.min(WIDTH - 10, cat.x + scene.facing * 28));
    const y = surfaceY(scene.terrain, x);
    drawReticle(g, x, y - 8, 0xffd66a, 10, .72);
  } else if (weapon.behaviour === 'ground-runner') {
    const y = surfaceY(scene.terrain, cat.x + scene.facing * 70);
    g.lineStyle(2, guideColor, .55);
    g.beginPath();
    g.moveTo(cat.x + scene.facing * 24, cat.y - 4);
    g.lineTo(cat.x + scene.facing * 120, Math.min(HEIGHT - 20, y - 6));
    g.strokePath();
  }

  stats.aimAssist += 1;
}

function showTurnBanner(scene, cat) {
  const teamName = cat.team === 0 ? scene.blueSquad.name : scene.redSquad.name;
  const color = colorForTeam(cat.team);
  const objects = [];

  const back = scene.add.rectangle(640, 100, 520, 70, 0x0b1627, .96)
    .setStrokeStyle(3, color, .92)
    .setDepth(182)
    .setAlpha(0);
  const accent = scene.add.rectangle(397, 100, 12, 66, color, .94).setDepth(183).setAlpha(0);
  const avatar = scene.add.image(448, 100, catTextureKey(cat.team, cat.presetId))
    .setScale(.36)
    .setDepth(184)
    .setAlpha(0);
  const title = scene.add.text(500, 82, 'TURN ' + scene.turnNumber + '  ·  ' + teamName.toUpperCase(), {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: cssColor(color)
  }).setDepth(184).setAlpha(0);
  const name = scene.add.text(500, 103, cat.name.toUpperCase(), {
    fontFamily: 'Arial Black, Arial',
    fontSize: '22px',
    color: '#ffffff'
  }).setDepth(184).setAlpha(0);
  const wind = scene.add.text(856, 100, 'WIND ' + (scene.wind < 0 ? '◀ ' : scene.wind > 0 ? '▶ ' : '• ') + Math.abs(scene.wind), {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: '#ffe36e'
  }).setOrigin(1, .5).setDepth(184).setAlpha(0);

  objects.push(back, accent, avatar, title, name, wind);
  scene.tweens.add({
    targets: objects,
    alpha: 1,
    duration: 140,
    hold: 620,
    yoyo: true,
    onComplete: () => clearObjects(objects)
  });
  stats.turnBanners += 1;
}

function hitCallout(scene, cat, amount, died) {
  if (amount < 28 && !died) return;
  const label = died ? 'KO!' : amount >= 55 ? 'BIG HIT!' : 'DIRECT HIT';
  const text = scene.add.text(cat.x, cat.y - 78, label, {
    fontFamily: 'Arial Black, Arial',
    fontSize: died ? '24px' : amount >= 55 ? '19px' : '15px',
    color: died ? '#ffe36e' : '#ffffff',
    stroke: '#2e1c2a',
    strokeThickness: 6
  }).setOrigin(.5).setDepth(99).setRotation((Math.random() - .5) * .08);

  scene.tweens.add({
    targets: text,
    y: text.y - 38,
    alpha: 0,
    scale: died ? 1.25 : 1.12,
    duration: died ? 850 : 620,
    ease: 'Cubic.Out',
    onComplete: () => text.destroy()
  });
}

function heavyImpactFlash(scene, weapon) {
  if (!weapon || weapon.blastRadius < 52) return;
  const alpha = Math.min(.11, .035 + weapon.blastRadius / 1000);
  const flash = scene.add.rectangle(640, 360, 1280, 720, weapon.family === 'cat' ? 0xff82d4 : 0xffffff, alpha)
    .setDepth(410);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 130,
    onComplete: () => flash.destroy()
  });
  stats.heavyImpact += 1;
}

function trackShot(scene) {
  const cat = scene.activeCat();
  if (!cat) return;
  scene.__mw09BattleStats.shots[cat.team] += 1;
  scene.__mw09FiringTeam = cat.team;
  stats.shotsTracked += 1;
}

function recordDamage(scene, team, amount, died) {
  if (team !== 0 && team !== 1) return;
  scene.__mw09BattleStats.damage[team] += amount;
  stats.damageTracked += 1;
  if (died) {
    scene.__mw09BattleStats.kos[team] += 1;
    stats.kosTracked += 1;
  }
}

function showRecap(scene) {
  if (scene.__mw09RecapShown) return;
  scene.__mw09RecapShown = true;

  const blue = scene.__mw09BattleStats;
  const box = scene.add.rectangle(640, 455, 650, 105, 0x0a1729, .96)
    .setStrokeStyle(2, 0x6bd4ff, .72)
    .setDepth(254);
  const heading = scene.add.text(640, 421, 'BATTLE RECAP', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '17px',
    color: '#ffe36e'
  }).setOrigin(.5).setDepth(255);
  const left = scene.add.text(430, 452,
    scene.blueSquad.name.toUpperCase() +
    '\nDamage  ' + Math.round(blue.damage[0]) +
    '   KOs  ' + blue.kos[0] +
    '   Shots  ' + blue.shots[0], {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#bde9ff',
      align: 'center'
    }).setOrigin(.5).setDepth(255);
  const right = scene.add.text(850, 452,
    scene.redSquad.name.toUpperCase() +
    '\nDamage  ' + Math.round(blue.damage[1]) +
    '   KOs  ' + blue.kos[1] +
    '   Shots  ' + blue.shots[1], {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffd2dc',
      align: 'center'
    }).setOrigin(.5).setDepth(255);
  stats.recapShown += 1;
}

function closeSettings(scene) {
  if (!scene.__mw09Settings) return;
  clearObjects(scene.__mw09Settings);
  scene.__mw09Settings = null;
}

function openSettings(scene) {
  if (scene.__mw09Settings) return;
  const items = [];
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x06111e, .84).setInteractive().setDepth(800);
  const panel = scene.add.rectangle(640, 350, 780, 505, 0x102a47, .99)
    .setStrokeStyle(4, 0x63d8ff, .9).setDepth(801);
  const title = scene.add.text(640, 132, 'MEOW WARS v' + MW09_VERSION, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '34px',
    color: '#ffd253',
    stroke: '#13243d',
    strokeThickness: 5
  }).setOrigin(.5).setDepth(802);
  const copy = [
    'Build  ' + MW09_BUILD,
    '',
    'Aim readability     impact reticles for projectile, hitscan and targeted weapons',
    'Turn clarity        cat portrait, turn number, squad and wind transition banner',
    'Wind readability    animated sky markers show wind direction/intensity',
    'Combat feedback     BIG HIT / DIRECT HIT / KO callouts + heavy impact flash',
    'Battle recap        damage, KOs and shots by squad after the winner is decided',
    'Preserved           v0.8 weapon/destruction polish + v0.7.1 Dublin branding',
    'Environment         seven battlefields · 4K-source layered HD pipeline',
    '',
    'Controls',
    'A/D move   W/S aim   SPACE charge/fire   Q/E weapons',
    'ESC pause   R rematch   M main menu'
  ];
  const info = scene.add.text(315, 187, copy.join('\n'), {
    fontFamily: 'Arial',
    fontSize: '15.5px',
    color: '#edf9ff',
    lineSpacing: 7
  }).setDepth(802);
  const close = scene.add.rectangle(640, 568, 220, 44, 0xef5b52, 1)
    .setStrokeStyle(2, 0xffeee0, 1)
    .setInteractive({ useHandCursor: true }).setDepth(803);
  const closeText = scene.add.text(640, 568, 'CLOSE', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '18px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(804);

  dim.on('pointerdown', () => closeSettings(scene));
  close.on('pointerdown', () => closeSettings(scene));
  items.push(dim, panel, title, info, close, closeText);
  scene.__mw09Settings = items;
}

const v08Create = GameScene.prototype.create;
GameScene.prototype.create = function() {
  v08Create.call(this);
  setupPresentation(this);
  const marker = this.children.getByName('mw-build-marker');
  if (marker?.setText)
    marker.setText('v' + MW09_VERSION + ' · ' + MW09_BUILD);
};

const v08Update = GameScene.prototype.update;
GameScene.prototype.update = function(time, delta) {
  v08Update.call(this, time, delta);
  if (!this.hud || !this.cats) return;
  updateWindVisual(this, time, delta);
  updateAimAssist(this);
};

GameScene.prototype.showTurnBanner = function(cat) {
  showTurnBanner(this, cat);
};

const v08FireCurrentWeapon = GameScene.prototype.fireCurrentWeapon;
GameScene.prototype.fireCurrentWeapon = function() {
  if (!this.actionLocked && !this.gameOver && this.activeCat()?.alive)
    trackShot(this);
  return v08FireCurrentWeapon.call(this);
};

const v08FireHitscan = GameScene.prototype.fireHitscan;
GameScene.prototype.fireHitscan = function(shooter, weapon, offsets) {
  const previous = this.__mw09DamageTeamContext;
  this.__mw09DamageTeamContext = shooter.team;
  try {
    return v08FireHitscan.call(this, shooter, weapon, offsets);
  } finally {
    this.__mw09DamageTeamContext = previous;
  }
};

const v08Explode = GameScene.prototype.explode;
GameScene.prototype.explode = function(x, y, weapon, ownerId) {
  const owner = this.catById(ownerId);
  const previous = this.__mw09DamageTeamContext;
  if (owner) this.__mw09DamageTeamContext = owner.team;
  heavyImpactFlash(this, weapon);
  try {
    return v08Explode.call(this, x, y, weapon, ownerId);
  } finally {
    this.__mw09DamageTeamContext = previous;
  }
};

const v08DamageCat = GameScene.prototype.damageCat;
GameScene.prototype.damageCat = function(cat, damage, impulseX, impulseY) {
  const before = cat.health;
  const result = v08DamageCat.call(this, cat, damage, impulseX, impulseY);
  const applied = Math.max(0, before - cat.health);
  const died = before > 0 && cat.health <= 0;
  if (applied > .4) {
    recordDamage(this, this.__mw09DamageTeamContext, applied, died);
    hitCallout(this, cat, applied, died);
  }
  return result;
};

const v08CheckWin = GameScene.prototype.checkWin;
GameScene.prototype.checkWin = function() {
  const wasOver = this.gameOver;
  const result = v08CheckWin.call(this);
  if (!wasOver && this.gameOver)
    showRecap(this);
  return result;
};

const v08MenuCreate = MenuScene.prototype.create;
MenuScene.prototype.create = function() {
  v08MenuCreate.call(this);

  for (const child of this.children.list) {
    if (typeof child.text === 'string') {
      if (child.text.includes('MEOW WARS v0.8.0'))
        child.setText(child.text.replace('MEOW WARS v0.8.0', 'MEOW WARS v' + MW09_VERSION));
      if (child.text.includes('mw-v08-battle-polish-20260918a'))
        child.setText(child.text.replace('mw-v08-battle-polish-20260918a', MW09_BUILD));
      if (child.text === 'SETTINGS' && Math.abs((child.x || 0) - 1160) < 3 && Math.abs((child.y || 0) - 45) < 3)
        child.setVisible(false);
    }
    if (child.input && Math.abs((child.x || 0) - 1160) < 3 && Math.abs((child.y || 0) - 45) < 3)
      child.disableInteractive?.();
  }

  const button = this.add.rectangle(1160, 45, 170, 36, 0x173d61, .99)
    .setStrokeStyle(2, 0xffd253, .95)
    .setInteractive({ useHandCursor: true }).setDepth(290);
  this.add.text(1160, 45, 'SETTINGS', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(291);
  button.on('pointerdown', () => openSettings(this));
};

const previousBuildInfo = globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion = MW09_VERSION;
document.documentElement.dataset.meowWarsBuild = MW09_BUILD;
const host = document.getElementById('game');
if (host) {
  host.dataset.version = MW09_VERSION;
  host.dataset.build = MW09_BUILD;
}
globalThis.__MEOW_WARS_VERSION = MW09_VERSION;
globalThis.__MEOW_WARS_BUILD = MW09_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO = () => {
  const base = typeof previousBuildInfo === 'function' ? previousBuildInfo() : {};
  return {
    ...base,
    version: MW09_VERSION,
    build: MW09_BUILD,
    battlePresentation: [
      'impact-reticle',
      'enhanced-turn-banner',
      'wind-sky-markers',
      'big-hit-callouts',
      'ko-callout',
      'battle-recap'
    ],
    v09Stats: { ...stats }
  };
};
})();
