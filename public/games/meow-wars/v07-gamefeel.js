/* Meow Wars v0.7.0 game-feel + Dublin landmark pass.
   Loaded after v0.6 HD environments and before Phaser boot. */
(() => {
'use strict';

const MW07_VERSION = '0.7.0';
const MW07_BUILD = 'mw-v07-gamefeel-20260918a';
const DUBLIN_ID = 'oconnell-bridge-spire';
const VIEW_W = 1280;
const VIEW_H = 720;
const SOURCE_SCALE = 3;
const BG_SCALE = (globalThis.innerWidth || 1280) < 800
  ? 1.5
  : Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));

const fxStats = globalThis.__MEOW_WARS_FX_STATS = {
  muzzle: 0,
  tracerImpact: 0,
  explosion: 0,
  reaction: 0,
  projectileTrail: 0,
  ambience: 0
};

const dublinArena = ARENAS.find((arena) => arena.id === DUBLIN_ID);
if (dublinArena) {
  dublinArena.name = 'Ha\u2019penny Bridge + Spire';
  dublinArena.tagline = 'White iron, Liffey wind, city lights and catastrophic aim.';
  dublinArena.water = {
    kind: 'river', x: 0, width: 1280, y: 404, height: 158,
    color: '#4d9cad', amplitude: 3.4, speed: 0.0019
  };
}

function rr(c, x, y, w, h, r) {
  const q = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  c.beginPath();
  c.moveTo(x + q, y);
  c.arcTo(x + w, y, x + w, y + h, q);
  c.arcTo(x + w, y + h, x, y + h, q);
  c.arcTo(x, y + h, x, y, q);
  c.arcTo(x, y, x + w, y, q);
  c.closePath();
}

function ellipse(c, x, y, rx, ry, fill, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.restore();
}

function cloud(c, x, y, s, alpha) {
  ellipse(c, x, y, 58 * s, 17 * s, '#ffffff', alpha);
  ellipse(c, x - 29 * s, y - 10 * s, 25 * s, 22 * s, '#ffffff', alpha);
  ellipse(c, x + 4 * s, y - 17 * s, 31 * s, 27 * s, '#ffffff', alpha);
  ellipse(c, x + 37 * s, y - 8 * s, 21 * s, 18 * s, '#ffffff', alpha);
}

function storefront(c, x, baseY, w, h, body, trim, sign, signColor, signText) {
  c.fillStyle = body;
  c.fillRect(x, baseY - h, w, h);
  c.fillStyle = trim;
  c.fillRect(x, baseY - h, w, 8);
  c.fillStyle = '#27333d';
  c.fillRect(x + 9, baseY - 42, w - 18, 34);
  const cols = Math.max(2, Math.floor((w - 24) / 28));
  for (let i = 0; i < cols; i += 1) {
    c.fillStyle = (i % 3 === 0) ? '#f3d58f' : '#80a8b2';
    c.fillRect(x + 12 + i * 28, baseY - h + 24, 15, 23);
  }
  c.fillStyle = signColor;
  rr(c, x + 7, baseY - 78, w - 14, 25, 4);
  c.fill();
  c.fillStyle = signText || '#ffffff';
  c.font = 'bold 12px Arial';
  c.textAlign = 'center';
  c.fillText(sign, x + w / 2, baseY - 61);
}

function drawSpire(c, x, baseY, height) {
  const g = c.createLinearGradient(x - 8, 0, x + 10, 0);
  g.addColorStop(0, '#64747c');
  g.addColorStop(0.35, '#dfe9ec');
  g.addColorStop(0.64, '#ffffff');
  g.addColorStop(1, '#6c7f86');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x - 8, baseY);
  c.lineTo(x + 8, baseY);
  c.lineTo(x + 1.3, baseY - height);
  c.lineTo(x - 1.3, baseY - height);
  c.closePath();
  c.fill();
  ellipse(c, x, baseY - height, 2.6, 2.6, '#f6ffff');
}

function bridgeY(x, left, right, edgeY, crestY) {
  const t = Math.max(0, Math.min(1, (x - left) / (right - left)));
  const arch = 4 * t * (1 - t);
  return edgeY - arch * (edgeY - crestY);
}

function drawHapennyBridge(c) {
  const left = 270;
  const right = 1010;
  const edgeY = 458;
  const crestY = 355;

  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  c.strokeStyle = 'rgba(43,67,78,.28)';
  c.lineWidth = 13;
  c.beginPath();
  for (let x = left; x <= right; x += 8) {
    const y = bridgeY(x, left, right, edgeY + 8, crestY + 8);
    if (x === left) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();

  c.strokeStyle = '#f5f3e9';
  c.lineWidth = 11;
  c.beginPath();
  for (let x = left; x <= right; x += 6) {
    const y = bridgeY(x, left, right, edgeY, crestY);
    if (x === left) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();

  c.strokeStyle = '#cfd2cf';
  c.lineWidth = 3;
  c.beginPath();
  for (let x = left; x <= right; x += 6) {
    const y = bridgeY(x, left, right, edgeY + 13, crestY + 13);
    if (x === left) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();

  for (let x = left + 12; x < right; x += 22) {
    const deckY = bridgeY(x, left, right, edgeY, crestY);
    const railTop = deckY - 39;
    c.strokeStyle = '#f6f4ec';
    c.lineWidth = 2.3;
    c.beginPath();
    c.moveTo(x, deckY - 4);
    c.lineTo(x, railTop);
    c.stroke();

    c.beginPath();
    c.arc(x + 11, railTop + 17, 11, Math.PI, 0);
    c.stroke();
  }

  c.strokeStyle = '#ffffff';
  c.lineWidth = 3.2;
  c.beginPath();
  for (let x = left; x <= right; x += 6) {
    const y = bridgeY(x, left, right, edgeY - 39, crestY - 39);
    if (x === left) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();

  for (const x of [left + 20, (left + right) / 2, right - 20]) {
    const y = bridgeY(x, left, right, edgeY - 42, crestY - 42);
    c.strokeStyle = '#f8f6ee';
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x, y - 35); c.stroke();
    c.fillStyle = '#2e3b43';
    rr(c, x - 7, y - 43, 14, 16, 3); c.fill();
    c.fillStyle = '#ffe6a3';
    rr(c, x - 4, y - 40, 8, 9, 2); c.fill();
  }

  c.restore();
}

function drawDublinLayer(layer, c) {
  if (layer === 0) {
    const sky = c.createLinearGradient(0, 0, 0, 560);
    sky.addColorStop(0, '#5db8e4');
    sky.addColorStop(1, '#d9eef4');
    c.fillStyle = sky;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    ellipse(c, 1100, 92, 58, 58, '#ffe7a0', .78);
    cloud(c, 105, 100, .78, .58);
    cloud(c, 470, 134, .61, .47);
    cloud(c, 980, 142, .55, .43);

    // North quay / Aston Quay frontage.
    const fronts = [
      ['#d6c0a2','#81634f'],['#c7ad90','#6b5b53'],['#d8c9b4','#6d635b'],
      ['#b8b6b2','#626b70'],['#d4bba4','#7f5c4e'],['#c8b19b','#5f5a58'],
      ['#d7c6ad','#786351'],['#b8b9b8','#5c6467']
    ];
    for (let i = 0; i < 9; i += 1) {
      const x = -24 + i * 148;
      const h = 142 + ((i * 31) % 55);
      const y = 420 - h;
      c.fillStyle = fronts[i % fronts.length][0];
      c.fillRect(x, y, 140, h);
      c.fillStyle = fronts[i % fronts.length][1];
      c.fillRect(x, y, 140, 9);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          c.fillStyle = ((row + col + i) % 4 === 0) ? '#f3d28d' : '#7398a2';
          c.fillRect(x + 15 + col * 29, y + 28 + row * 34, 14, 20);
        }
      }
    }

    // Bigger Spire, deliberately prominent in the skyline.
    drawSpire(c, 1006, 405, 385);

    // Nearby current supermarket / convenience-store cues.
    storefront(c, 118, 418, 174, 132, '#cab6a0', '#67554b', 'CENTRA', '#1f568f', '#ffd64f');
    storefront(c, 824, 418, 190, 138, '#d0bda6', '#665750', 'SUPERVALU', '#267447', '#ffffff');

    // Recognisable nearby pub names sit high enough to remain visible above destructible terrain.
    c.fillStyle = '#5c2b27';
    rr(c, 330, 326, 214, 28, 4); c.fill();
    c.fillStyle = '#f2d28c';
    c.font = 'bold 12px Arial';
    c.textAlign = 'center';
    c.fillText("HA'PENNY BRIDGE INN", 437, 345);
    c.fillStyle = '#294536';
    rr(c, 574, 304, 180, 28, 4); c.fill();
    c.fillStyle = '#f4e1b1';
    c.fillText("MERCHANT'S ARCH", 664, 323);

    // Quay architecture and church-like roofline to help the area read as central Dublin.
    c.fillStyle = '#7b7066';
    c.fillRect(1040, 306, 180, 112);
    c.fillStyle = '#5e5350';
    c.beginPath();
    c.moveTo(1030, 306); c.lineTo(1130, 246); c.lineTo(1230, 306); c.closePath(); c.fill();
  } else if (layer === 1) {
    const river = c.createLinearGradient(0, 394, 0, 575);
    river.addColorStop(0, '#68adbb');
    river.addColorStop(1, '#397e8d');
    c.fillStyle = river;
    c.fillRect(0, 394, VIEW_W, 190);
    for (let y = 414; y < 570; y += 20) {
      c.strokeStyle = 'rgba(238,252,255,.18)';
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, y); c.lineTo(VIEW_W, y + Math.sin(y * .1) * 2); c.stroke();
    }

    drawHapennyBridge(c);

    // Stone quays at either end of the footbridge.
    c.fillStyle = '#8e8175';
    c.fillRect(0, 455, 275, 42);
    c.fillRect(1005, 455, 275, 42);
    c.fillStyle = '#b6aa9e';
    c.fillRect(0, 455, 275, 8);
    c.fillRect(1005, 455, 275, 8);
  } else {
    // South-side pub frontage and busy quay details in the near layer.
    c.fillStyle = 'rgba(92,78,69,.78)';
    c.fillRect(0, 520, VIEW_W, 78);
    c.fillStyle = '#9b8d80';
    c.fillRect(0, 520, VIEW_W, 8);

    c.fillStyle = '#572b25';
    rr(c, 60, 455, 214, 58, 5); c.fill();
    c.fillStyle = '#e7c87e';
    c.font = 'bold 14px Arial';
    c.textAlign = 'center';
    c.fillText("HA'PENNY BRIDGE INN", 167, 489);

    c.fillStyle = '#263b31';
    rr(c, 1004, 455, 204, 58, 5); c.fill();
    c.fillStyle = '#f3dfad';
    c.fillText("MERCHANT'S ARCH", 1106, 489);

    // Lamps, bins, bikes and pedestrians keep the quay feeling lived-in.
    for (const x of [315, 470, 795, 940]) {
      c.strokeStyle = '#29343a'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(x, 520); c.lineTo(x, 467); c.stroke();
      c.fillStyle = '#ffe5a1'; rr(c, x - 6, 456, 12, 15, 2); c.fill();
    }
    for (const x of [360, 735]) {
      c.strokeStyle = '#28333a'; c.lineWidth = 3;
      c.beginPath(); c.arc(x, 509, 12, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(x + 28, 509, 12, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x,509); c.lineTo(x+14,487); c.lineTo(x+28,509); c.stroke();
    }
  }
}

function dublinTextureKey(layer) {
  return 'mw06-bg-' + DUBLIN_ID + '-' + layer;
}

function ensureV07DublinTextures(scene) {
  if (scene.__mwV07DublinReady) return;
  for (let layer = 0; layer < 3; layer += 1) {
    const key = dublinTextureKey(layer);
    const existing = scene.textures.get(key);
    if (scene.textures.exists(key) && existing && existing.__mwV07Dublin) continue;
    if (scene.textures.exists(key)) scene.textures.remove(key);

    const source = document.createElement('canvas');
    source.width = VIEW_W * SOURCE_SCALE;
    source.height = VIEW_H * SOURCE_SCALE;
    const src = source.getContext('2d', { alpha: true });
    src.setTransform(SOURCE_SCALE, 0, 0, SOURCE_SCALE, 0, 0);
    src.imageSmoothingEnabled = true;
    src.imageSmoothingQuality = 'high';
    drawDublinLayer(layer, src);

    const texture = scene.textures.createCanvas(
      key,
      Math.round(VIEW_W * BG_SCALE),
      Math.round(VIEW_H * BG_SCALE)
    );
    texture.__mwV07Dublin = true;
    const out = texture.getContext();
    out.clearRect(0, 0, texture.width, texture.height);
    out.imageSmoothingEnabled = true;
    out.imageSmoothingQuality = 'high';
    out.drawImage(source, 0, 0, source.width, source.height, 0, 0, texture.width, texture.height);
    texture.refresh();
    source.width = 1;
    source.height = 1;
  }
  scene.__mwV07DublinReady = true;
}

const v06CreateSky = GameScene.prototype.createSky;
GameScene.prototype.createSky = function() {
  if (this.arena && this.arena.id === DUBLIN_ID) ensureV07DublinTextures(this);
  return v06CreateSky.call(this);
};

function fadeOut(scene, object, props = {}) {
  scene.tweens.add({
    targets: object,
    alpha: 0,
    duration: props.duration || 420,
    delay: props.delay || 0,
    scale: props.scale == null ? object.scale : props.scale,
    x: props.x == null ? object.x : props.x,
    y: props.y == null ? object.y : props.y,
    ease: props.ease || 'Cubic.Out',
    onComplete: () => object.destroy()
  });
}

const baseMuzzleFx = GameScene.prototype.muzzleFx;
GameScene.prototype.muzzleFx = function(shooter, weapon) {
  baseMuzzleFx.call(this, shooter, weapon);
  fxStats.muzzle += 1;
  const x = shooter.x + this.facing * 31;
  const y = shooter.y - 10;
  const catWeapon = weapon.family === 'cat';
  const color = catWeapon ? 0xff66d2 : 0xffd56f;
  const core = this.add.circle(x, y, weapon.id === 'sniper' ? 5 : 4, 0xffffff, .96).setDepth(36);
  const halo = this.add.circle(x, y, weapon.id === 'shotgun' ? 12 : 9, color, .38).setDepth(35);
  fadeOut(this, core, { duration: 90, scale: 2.8 });
  fadeOut(this, halo, { duration: 150, scale: 2.3 });
  for (let i = 0; i < 5; i += 1) {
    const spark = this.add.rectangle(x, y, 11 + i * 2, 2.2, color, .92)
      .setDepth(35)
      .setRotation((i - 2) * .28 + (this.facing < 0 ? Math.PI : 0));
    fadeOut(this, spark, {
      duration: 120 + i * 16,
      x: x + this.facing * (25 + i * 7),
      y: y + (i - 2) * 5,
      scale: .2
    });
  }
};

const baseTracer = GameScene.prototype.drawTracer;
GameScene.prototype.drawTracer = function(x1, y1, x2, y2, color) {
  baseTracer.call(this, x1, y1, x2, y2, color);
  fxStats.tracerImpact += 1;
  const spark = this.add.circle(x2, y2, 5, color, .9).setDepth(33);
  spark.setStrokeStyle?.(2, 0xffffff, .85);
  fadeOut(this, spark, { duration: 220, scale: 2.4 });
};

const baseExplosionFx = GameScene.prototype.explosionFx;
GameScene.prototype.explosionFx = function(x, y, weapon) {
  baseExplosionFx.call(this, x, y, weapon);
  fxStats.explosion += 1;
  const radius = Math.max(26, weapon.blastRadius || 36);
  const catWeapon = weapon.family === 'cat';
  const hot = catWeapon ? 0xff75d2 : 0xffb44f;
  const smoke = catWeapon ? 0x7a5ca3 : 0x4d5157;

  const shock = this.add.circle(x, y, Math.max(10, radius * .28), hot, 0).setDepth(39);
  shock.setStrokeStyle?.(7, 0xffffff, .72);
  this.tweens.add({
    targets: shock, alpha: 0, scale: 4.2,
    duration: 520, ease: 'Cubic.Out',
    onComplete: () => shock.destroy()
  });

  const flash = this.add.rectangle(640, 360, 1280, 720, 0xffffff, Math.min(.1, radius / 1200)).setDepth(420);
  fadeOut(this, flash, { duration: 120, scale: 1 });

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + Math.random() * .2;
    const puff = this.add.circle(
      x + Math.cos(angle) * radius * .14,
      y + Math.sin(angle) * radius * .1,
      8 + Math.random() * 10,
      smoke,
      .52
    ).setDepth(38);
    fadeOut(this, puff, {
      delay: 70 + i * 12,
      duration: 520 + Math.random() * 260,
      x: puff.x + Math.cos(angle) * radius * .55,
      y: puff.y - 28 - Math.random() * 36,
      scale: 2.1 + Math.random() * .8
    });
  }

  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const shard = this.add.rectangle(x, y, 7 + Math.random() * 9, 2 + Math.random() * 3, hot, .95)
      .setDepth(42)
      .setRotation(angle);
    fadeOut(this, shard, {
      duration: 260 + Math.random() * 250,
      x: x + Math.cos(angle) * (radius * .8 + Math.random() * radius),
      y: y + Math.sin(angle) * radius * .75 + 28,
      scale: .25
    });
  }

  if (radius >= 55) {
    const word = this.add.text(x, y - radius * .75, catWeapon ? 'MEOOM!' : 'BOOM!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: radius >= 78 ? '27px' : '21px',
      color: catWeapon ? '#ffdbf4' : '#fff3b0',
      stroke: '#452637',
      strokeThickness: 6
    }).setOrigin(.5).setDepth(90).setRotation((Math.random() - .5) * .16);
    fadeOut(this, word, { duration: 610, y: word.y - 38, scale: 1.28 });
  }
};

const baseDamageCat = GameScene.prototype.damageCat;
GameScene.prototype.damageCat = function(cat, damage, impulseX, impulseY) {
  const before = cat.health;
  baseDamageCat.call(this, cat, damage, impulseX, impulseY);
  const applied = Math.max(0, before - cat.health);
  if (applied < .4) return;
  fxStats.reaction += 1;
  const reaction = applied >= 42 ? 'MRAOW!' : applied >= 20 ? 'HISS!' : 'MRRP!';
  const label = this.add.text(cat.x + (Math.random() - .5) * 16, cat.y - 52, reaction, {
    fontFamily: 'Arial Black, Arial',
    fontSize: applied >= 42 ? '18px' : '14px',
    color: applied >= 42 ? '#ffe36e' : '#ffffff',
    stroke: '#2f2532',
    strokeThickness: 5
  }).setOrigin(.5).setDepth(88).setRotation((Math.random() - .5) * .18);
  fadeOut(this, label, { duration: 560, y: label.y - 34, scale: 1.18 });
};

const baseUpdateProjectiles = GameScene.prototype.updateProjectiles;
GameScene.prototype.updateProjectiles = function(dtMs) {
  baseUpdateProjectiles.call(this, dtMs);
  const now = this.time.now;
  for (const projectile of this.projectiles) {
    if (now - (projectile.__mwTrailAt || 0) < 42) continue;
    projectile.__mwTrailAt = now;
    fxStats.projectileTrail += 1;
    const catWeapon = projectile.weapon && projectile.weapon.family === 'cat';
    const color = catWeapon ? 0xff74cf : 0xffd98a;
    const dot = this.add.circle(projectile.x, projectile.y, catWeapon ? 4.5 : 3.2, color, .55).setDepth(18);
    fadeOut(this, dot, {
      duration: 250,
      y: dot.y + 5,
      scale: .15
    });
  }
};

function addAmbient(scene, object, type, data) {
  object.setDepth(data.depth == null ? -8 : data.depth);
  scene.__mw07Ambient.push({ object, type, ...data });
  fxStats.ambience += 1;
  return object;
}

function setupAmbience(scene) {
  scene.__mw07Ambient = [];
  const id = scene.arena.id;

  if (id === 'garden-siege') {
    for (let i = 0; i < 7; i += 1) {
      const wing = scene.add.ellipse(95 + i * 175, 390 + (i % 3) * 28, 9, 5, [0xffd760,0xff7caf,0x8fe7ff][i % 3], .8);
      addAmbient(scene, wing, 'butterfly', { baseX: wing.x, baseY: wing.y, phase: i * .8, speed: .0011 + i * .00004 });
    }
  } else if (id === 'rooftop-rumble') {
    for (let i = 0; i < 4; i += 1) {
      const light = scene.add.circle(210 + i * 275, 325 - (i % 2) * 70, 3.5, i % 2 ? 0x49f0d3 : 0xff668d, .8);
      addAmbient(scene, light, 'blink', { phase: i * 1.7 });
    }
  } else if (id === 'junkyard-jamboree') {
    for (let i = 0; i < 6; i += 1) {
      const spark = scene.add.rectangle(120 + i * 202, 420 - (i % 2) * 65, 8, 2, 0xffd45a, .7);
      addAmbient(scene, spark, 'spark', { baseX: spark.x, baseY: spark.y, phase: i * .9 });
    }
  } else if (id === 'taj-mahal') {
    for (let i = 0; i < 8; i += 1) {
      const drop = scene.add.circle(525 + i * 33, 453 + (i % 2) * 4, 2.5, 0xdffcff, .65);
      addAmbient(scene, drop, 'fountain', { baseX: drop.x, baseY: drop.y, phase: i * .55 });
    }
  } else if (id === DUBLIN_ID) {
    const bus = scene.add.container(-120, 398);
    const body = scene.add.rectangle(0, 0, 96, 32, 0x2e6e79, .94);
    const top = scene.add.rectangle(-8, -22, 72, 24, 0xd8d9b0, .96);
    const window1 = scene.add.rectangle(-24, -23, 18, 12, 0x8cc7da, .9);
    const window2 = scene.add.rectangle(0, -23, 18, 12, 0x8cc7da, .9);
    const window3 = scene.add.rectangle(24, -23, 18, 12, 0x8cc7da, .9);
    const wheel1 = scene.add.circle(-29, 16, 8, 0x1d2930, 1);
    const wheel2 = scene.add.circle(29, 16, 8, 0x1d2930, 1);
    bus.add([body, top, window1, window2, window3, wheel1, wheel2]);
    addAmbient(scene, bus, 'bus', { baseY: 398, speed: .055, depth: -8.5 });
  } else if (id === 'westminster-bridge-big-ben') {
    const bus = scene.add.rectangle(-80, 394, 82, 33, 0xb92c3b, .95);
    addAmbient(scene, bus, 'london-bus', { baseY: 394, speed: .045, depth: -8.5 });
  } else if (id === 'donabate-beach') {
    for (let i = 0; i < 5; i += 1) {
      const gull = scene.add.text(120 + i * 250, 150 + (i % 2) * 55, '⌁', {
        fontFamily: 'Arial', fontSize: '23px', color: '#f5fbff'
      }).setOrigin(.5);
      addAmbient(scene, gull, 'gull', { baseX: gull.x, baseY: gull.y, phase: i * .7, speed: .025 + i * .002, depth: -8.5 });
    }
  }
}

function updateAmbience(scene, time, delta) {
  if (!scene.__mw07Ambient) return;
  for (const item of scene.__mw07Ambient) {
    const o = item.object;
    if (!o || !o.active) continue;
    if (item.type === 'butterfly') {
      o.x = item.baseX + Math.sin(time * item.speed + item.phase) * 32;
      o.y = item.baseY + Math.sin(time * item.speed * 2.2 + item.phase) * 10;
      o.scaleX = .75 + Math.abs(Math.sin(time * .012 + item.phase)) * .5;
    } else if (item.type === 'blink') {
      o.alpha = .25 + Math.max(0, Math.sin(time * .004 + item.phase)) * .75;
    } else if (item.type === 'spark') {
      const t = (time * .003 + item.phase) % 1;
      o.x = item.baseX + t * 24;
      o.y = item.baseY - t * 18;
      o.alpha = 1 - t;
    } else if (item.type === 'fountain') {
      const t = (time * .0018 + item.phase) % 1;
      o.x = item.baseX + Math.sin(t * Math.PI * 2) * 4;
      o.y = item.baseY - Math.sin(t * Math.PI) * 23;
      o.alpha = .35 + Math.sin(t * Math.PI) * .55;
    } else if (item.type === 'bus' || item.type === 'london-bus') {
      o.x += item.speed * delta;
      if (o.x > VIEW_W + 130) o.x = -130;
      o.y = item.baseY + Math.sin(time * .005) * 1.5;
    } else if (item.type === 'gull') {
      o.x += item.speed * delta;
      if (o.x > VIEW_W + 50) o.x = -50;
      o.y = item.baseY + Math.sin(time * .0022 + item.phase) * 18;
      o.angle = Math.sin(time * .006 + item.phase) * 6;
    }
  }
}

function animateCats(scene, time) {
  if (!scene.cats) return;
  for (const cat of scene.cats) {
    if (!cat.sprite || !cat.sprite.active || !cat.alive) continue;
    const previous = cat.__mw07PrevX == null ? cat.x : cat.__mw07PrevX;
    const dx = cat.x - previous;
    cat.__mw07PrevX = cat.x;
    const moving = Math.abs(dx) > .12;
    const bob = moving ? Math.sin(time * .018 + cat.x * .03) * 2.1 : Math.sin(time * .004 + cat.x * .02) * .8;
    cat.sprite.y = cat.y + bob;
    const lean = moving ? Math.max(-4, Math.min(4, dx * 2.5)) : Math.sin(time * .002 + cat.x) * .45;
    cat.sprite.angle = lean;
  }
}

const v06GameCreate = GameScene.prototype.create;
GameScene.prototype.create = function() {
  v06GameCreate.call(this);
  const marker = this.children.getByName('mw-build-marker');
  if (marker && marker.setText) marker.setText('v' + MW07_VERSION + ' · ' + MW07_BUILD);
  setupAmbience(this);
};

const v06GameUpdate = GameScene.prototype.update;
GameScene.prototype.update = function(time, delta) {
  v06GameUpdate.call(this, time, delta);
  updateAmbience(this, time, delta);
  animateCats(this, time);
};

function closeV07Settings(scene) {
  if (!scene.__mw07Settings) return;
  for (const object of scene.__mw07Settings) object.destroy();
  scene.__mw07Settings = null;
}

function openV07Settings(scene) {
  if (scene.__mw07Settings) return;
  const items = [];
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x06111e, .8).setInteractive().setDepth(600);
  const panel = scene.add.rectangle(640, 350, 720, 470, 0x102a47, .99).setStrokeStyle(4, 0x63d8ff, .9).setDepth(601);
  const title = scene.add.text(640, 155, 'SETTINGS + BUILD', {
    fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#ffd253',
    stroke: '#13243d', strokeThickness: 5
  }).setOrigin(.5).setDepth(602);
  const copy = [
    'MEOW WARS  v' + MW07_VERSION,
    'Build  ' + MW07_BUILD,
    '',
    'Dublin scene        Ha\u2019penny Bridge + enlarged Spire',
    'Street detail       SuperValu · Centra · pub frontage',
    'Battle effects      blast smoke · shock rings · debris · weapon trails',
    'Cat reactions       hit callouts · movement bob · impact lean',
    'World ambience      moving details on all 7 battlefields',
    'Art pipeline        4K source → layered HD runtime',
    '',
    'Controls',
    'A/D move   W/S aim   SPACE charge/fire   Q/E weapons',
    'ESC pause   R rematch   M main menu'
  ];
  const info = scene.add.text(350, 205, copy.join('\n'), {
    fontFamily: 'Arial', fontSize: '16px', color: '#edf9ff', lineSpacing: 6
  }).setDepth(602);
  const close = scene.add.rectangle(640, 560, 220, 44, 0xef5b52, 1)
    .setStrokeStyle(2, 0xffeee0, 1).setInteractive({ useHandCursor: true }).setDepth(603);
  const closeText = scene.add.text(640, 560, 'CLOSE', {
    fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff'
  }).setOrigin(.5).setDepth(604);
  dim.on('pointerdown', () => closeV07Settings(scene));
  close.on('pointerdown', () => closeV07Settings(scene));
  items.push(dim, panel, title, info, close, closeText);
  scene.__mw07Settings = items;
}

const v06MenuCreate = MenuScene.prototype.create;
MenuScene.prototype.create = function() {
  v06MenuCreate.call(this);

  for (const child of this.children.list) {
    if (typeof child.text !== 'string') continue;
    if (child.text.includes('MEOW WARS v0.6.0')) child.setText(child.text.replace('MEOW WARS v0.6.0', 'MEOW WARS v' + MW07_VERSION));
    if (child.text.includes('mw-v06-env-20260918b')) child.setText(child.text.replace('mw-v06-env-20260918b', MW07_BUILD));
  }

  const settings = this.add.rectangle(1160, 45, 170, 36, 0x173d61, .99)
    .setStrokeStyle(2, 0xffd253, .95)
    .setInteractive({ useHandCursor: true })
    .setDepth(90);
  this.add.text(1160, 45, 'SETTINGS', {
    fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff'
  }).setOrigin(.5).setDepth(91);
  settings.on('pointerdown', () => openV07Settings(this));
};

const previousBuildInfo = globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion = MW07_VERSION;
document.documentElement.dataset.meowWarsBuild = MW07_BUILD;
const gameHost = document.getElementById('game');
if (gameHost) {
  gameHost.dataset.version = MW07_VERSION;
  gameHost.dataset.build = MW07_BUILD;
}
globalThis.__MEOW_WARS_VERSION = MW07_VERSION;
globalThis.__MEOW_WARS_BUILD = MW07_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO = () => {
  const base = typeof previousBuildInfo === 'function' ? previousBuildInfo() : {};
  return {
    ...base,
    version: MW07_VERSION,
    build: MW07_BUILD,
    dublinLandmark: 'Ha\u2019penny Bridge + Spire',
    gameFeel: ['weapon-trails','blast-smoke','shock-rings','cat-reactions','arena-ambience'],
    fxStats: { ...fxStats }
  };
};
})();
