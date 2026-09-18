/* Meow Wars v0.8.0 battle polish.
   Loaded after the v0.6 HD environments and v0.7.1 Dublin/game-feel pass. */
(() => {
'use strict';

const MW08_VERSION = '0.8.0';
const MW08_BUILD = 'mw-v08-battle-polish-20260918a';

const stats = globalThis.__MEOW_WARS_V08_STATS = {
  weaponAccent: 0,
  projectileTrail: 0,
  terrainDebris: 0,
  arenaImpact: 0,
  catExpress: 0,
  hudRefresh: 0,
  urgentTicks: 0,
  victoryFx: 0
};

const WEAPON_THEME = {
  'pistol':          { primary: 0xdbe7f5, accent: 0xffd479, trail: 0xffffff, impact: 0xffe6a3 },
  'shotgun':         { primary: 0xd5a16e, accent: 0xffc66e, trail: 0xffe4bd, impact: 0xffbd65 },
  'assault-rifle':   { primary: 0x87a6c4, accent: 0xffbc5c, trail: 0xe6f2ff, impact: 0xffcf78 },
  'sniper':          { primary: 0x87d8ff, accent: 0xffffff, trail: 0xbcecff, impact: 0xe7f8ff },
  'bazooka':         { primary: 0x91c960, accent: 0xffd56d, trail: 0xd8d7ce, impact: 0xffa64d },
  'grenade':         { primary: 0x7ebc61, accent: 0xffdb69, trail: 0xb9c8a8, impact: 0xffbb57 },
  'mine':            { primary: 0xabb4c4, accent: 0xff5f63, trail: 0xff6a6e, impact: 0xff7c61 },
  'dynamite':        { primary: 0xe9544c, accent: 0xffdd61, trail: 0xffb458, impact: 0xff704f },
  'airstrike':       { primary: 0x67c8ff, accent: 0xffdf79, trail: 0xe6f7ff, impact: 0xff9b4f },
  'fish-launcher':   { primary: 0x64d5f3, accent: 0xe8fbff, trail: 0x76eaff, impact: 0x64d5f3 },
  'yarn-bomb':       { primary: 0xff65c3, accent: 0xffd8ef, trail: 0xff8bd2, impact: 0xff65c3 },
  'hairball-mortar': { primary: 0x806f5c, accent: 0xe6d8c4, trail: 0xa58d73, impact: 0x78634e },
  'catnip-grenade':  { primary: 0x63d45f, accent: 0xd7ffae, trail: 0x87ea73, impact: 0x63d45f },
  'exploding-mouse': { primary: 0xb9b5bf, accent: 0xff776c, trail: 0xd7cbd7, impact: 0xff8d72 },
  'roomba-ride':     { primary: 0x6a768d, accent: 0x6ff5f0, trail: 0x71e7ee, impact: 0x5ce5ec },
  'laser-pointer':   { primary: 0xff56cf, accent: 0xffd9f3, trail: 0xff4f73, impact: 0xff476f }
};

function themeFor(weapon) {
  return WEAPON_THEME[weapon && weapon.id] || { primary: 0xffffff, accent: 0xffd56d, trail: 0xffffff, impact: 0xffad62 };
}

function colorCss(value) {
  return '#' + Number(value >>> 0).toString(16).padStart(6, '0').slice(-6);
}

function tweenAway(scene, object, options) {
  const opts = options || {};
  scene.tweens.add({
    targets: object,
    x: opts.x == null ? object.x : opts.x,
    y: opts.y == null ? object.y : opts.y,
    alpha: opts.alpha == null ? 0 : opts.alpha,
    scaleX: opts.scaleX == null ? object.scaleX : opts.scaleX,
    scaleY: opts.scaleY == null ? object.scaleY : opts.scaleY,
    rotation: opts.rotation == null ? object.rotation : opts.rotation,
    duration: opts.duration || 360,
    delay: opts.delay || 0,
    ease: opts.ease || 'Cubic.Out',
    onComplete: () => object.destroy()
  });
}

function spawnCasing(scene, x, y, facing, color, index) {
  const casing = scene.add.rectangle(x, y, 7, 2.5, color, .95)
    .setDepth(45)
    .setRotation((index - 1) * .35);
  scene.tweens.add({
    targets: casing,
    x: x - facing * (18 + index * 4),
    y: y - 19 - index * 4,
    rotation: casing.rotation + facing * (2.4 + index),
    duration: 150 + index * 25,
    ease: 'Quad.Out',
    onComplete: () => tweenAway(scene, casing, {
      y: y + 18,
      x: casing.x - facing * 8,
      rotation: casing.rotation + facing * 2,
      duration: 270,
      ease: 'Quad.In'
    })
  });
}

function muzzleAccent(scene, shooter, weapon) {
  const theme = themeFor(weapon);
  const x = shooter.x + scene.facing * 33;
  const y = shooter.y - 10;
  const conventional = weapon.family === 'conventional';

  if (conventional && ['pistol', 'shotgun', 'assault-rifle', 'sniper'].includes(weapon.id)) {
    const count = weapon.id === 'shotgun' ? 2 : weapon.id === 'assault-rifle' ? 2 : 1;
    for (let i = 0; i < count; i += 1)
      spawnCasing(scene, x - scene.facing * 7, y - 3, scene.facing, 0xe5c079, i);
  }

  if (weapon.id === 'sniper') {
    const streak = scene.add.rectangle(x + scene.facing * 30, y, 72, 2, theme.primary, .82)
      .setDepth(44);
    tweenAway(scene, streak, {
      x: streak.x + scene.facing * 42,
      scaleX: .25,
      duration: 120
    });
  } else if (weapon.id === 'bazooka' || weapon.id === 'fish-launcher') {
    for (let i = 0; i < 5; i += 1) {
      const puff = scene.add.circle(
        shooter.x - scene.facing * (18 + i * 6),
        shooter.y - 7 + (i - 2) * 2,
        5 + i * .8,
        weapon.id === 'fish-launcher' ? 0x8adcf1 : 0xbfc0bb,
        .45
      ).setDepth(33);
      tweenAway(scene, puff, {
        x: puff.x - scene.facing * (17 + i * 5),
        y: puff.y - 5 - i,
        scaleX: 2,
        scaleY: 2,
        duration: 280 + i * 35
      });
    }
  } else if (weapon.family === 'cat') {
    const paw = scene.add.circle(x, y, 9, theme.accent, .28).setDepth(44);
    paw.setStrokeStyle?.(2, theme.primary, .85);
    tweenAway(scene, paw, { scaleX: 2.8, scaleY: 2.8, duration: 170 });
  }

  shooter.__mw08RecoilUntil = scene.time.now + (weapon.id === 'sniper' ? 210 : weapon.id === 'shotgun' ? 180 : 135);
  shooter.__mw08RecoilFacing = scene.facing;
  shooter.__mw08RecoilPower = weapon.id === 'sniper' || weapon.id === 'shotgun' ? 1.5 : weapon.blastRadius > 50 ? 1.25 : 1;
  stats.weaponAccent += 1;
}

function impactSpark(scene, x, y, color, count, spread) {
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI * .9 + Math.random() * Math.PI * 1.8;
    const distance = (10 + Math.random() * spread);
    const spark = scene.add.rectangle(x, y, 7 + Math.random() * 7, 2, color, .95)
      .setDepth(47)
      .setRotation(angle);
    tweenAway(scene, spark, {
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      rotation: angle + 1.7,
      duration: 170 + Math.random() * 190
    });
  }
}

function hitscanImpact(scene, x, y, weapon) {
  const theme = themeFor(weapon);
  const count = weapon.id === 'sniper' ? 12 : weapon.id === 'shotgun' ? 7 : 5;
  impactSpark(scene, x, y, theme.impact, count, weapon.id === 'sniper' ? 40 : 25);
  const dust = scene.add.circle(x, y, weapon.id === 'sniper' ? 8 : 5, theme.primary, .35).setDepth(43);
  tweenAway(scene, dust, { scaleX: 2.4, scaleY: 2.4, duration: 220 });
}

function ensureProjectileFollower(scene, projectile) {
  if (!scene.__mw08ProjectileFollowers)
    scene.__mw08ProjectileFollowers = new Map();
  if (scene.__mw08ProjectileFollowers.has(projectile))
    return scene.__mw08ProjectileFollowers.get(projectile);

  const weapon = projectile.weapon;
  const theme = themeFor(weapon);
  let follower = null;
  if (weapon.id === 'bazooka') {
    follower = scene.add.circle(projectile.x, projectile.y, 7, theme.accent, .22).setDepth(18);
    follower.setStrokeStyle?.(2, theme.primary, .65);
  } else if (weapon.id === 'fish-launcher') {
    follower = scene.add.ellipse(projectile.x, projectile.y, 23, 10, theme.primary, .18).setDepth(18);
    follower.setStrokeStyle?.(2, theme.accent, .7);
  } else if (weapon.id === 'yarn-bomb') {
    follower = scene.add.circle(projectile.x, projectile.y, 11, theme.primary, .08).setDepth(18);
    follower.setStrokeStyle?.(2, theme.primary, .8);
  } else if (weapon.id === 'catnip-grenade') {
    follower = scene.add.circle(projectile.x, projectile.y, 9, theme.primary, .17).setDepth(18);
  } else if (weapon.id === 'laser-pointer') {
    follower = scene.add.circle(projectile.x, projectile.y, 7, theme.impact, .22).setDepth(18);
  }

  if (follower)
    scene.__mw08ProjectileFollowers.set(projectile, follower);
  return follower;
}

function projectileTrail(scene, projectile) {
  const now = scene.time.now;
  if (now - (projectile.__mw08TrailAt || 0) < 62)
    return;
  projectile.__mw08TrailAt = now;

  const weapon = projectile.weapon;
  const theme = themeFor(weapon);
  let count = 1;
  let radius = 3.4;
  let color = theme.trail;

  if (weapon.id === 'bazooka') {
    count = 2;
    radius = 4.8;
    color = 0xa9aaa6;
  } else if (weapon.id === 'fish-launcher') {
    count = 3;
    radius = 2.8;
  } else if (weapon.id === 'yarn-bomb') {
    count = 2;
    radius = 3.3;
  } else if (weapon.id === 'hairball-mortar') {
    count = 2;
    radius = 4.2;
  } else if (weapon.id === 'catnip-grenade') {
    count = 3;
    radius = 3.6;
  } else if (weapon.id === 'grenade') {
    count = 1;
    radius = 2.8;
    color = 0xffc95b;
  }

  for (let i = 0; i < count; i += 1) {
    const dot = scene.add.circle(
      projectile.x - projectile.vx * .012 + (Math.random() - .5) * 8,
      projectile.y - projectile.vy * .008 + (Math.random() - .5) * 8,
      radius * (.75 + Math.random() * .45),
      color,
      weapon.id === 'bazooka' ? .38 : .56
    ).setDepth(17);

    tweenAway(scene, dot, {
      y: dot.y + (weapon.id === 'catnip-grenade' ? -11 : 7),
      x: dot.x + (Math.random() - .5) * 10,
      scaleX: weapon.id === 'bazooka' ? 1.8 : .2,
      scaleY: weapon.id === 'bazooka' ? 1.8 : .2,
      duration: 250 + Math.random() * 210
    });
  }

  if (weapon.id === 'grenade' || weapon.id === 'dynamite') {
    const ember = scene.add.circle(projectile.x, projectile.y - 4, 2.4, 0xffe47a, .95).setDepth(23);
    tweenAway(scene, ember, {
      y: ember.y - 12,
      x: ember.x + (Math.random() - .5) * 8,
      duration: 160
    });
  }

  stats.projectileTrail += 1;
}

function cleanupProjectileFollowers(scene) {
  if (!scene.__mw08ProjectileFollowers)
    return;
  const active = new Set(scene.projectiles);
  for (const [projectile, follower] of scene.__mw08ProjectileFollowers) {
    if (!active.has(projectile) || !projectile.object || !projectile.object.active) {
      follower.destroy();
      scene.__mw08ProjectileFollowers.delete(projectile);
      continue;
    }
    follower.setPosition(projectile.x, projectile.y);
    follower.rotation = projectile.object.rotation || 0;
    if (projectile.weapon.id === 'yarn-bomb')
      follower.scale = 1 + Math.sin(scene.time.now * .018) * .12;
  }
}

function deployablePolish(scene, item) {
  if (!item || !item.object || !item.object.active)
    return;
  if (item.weapon.id === 'mine') {
    const armed = item.armedMs <= 0;
    item.object.setAlpha(armed ? .88 + Math.sin(scene.time.now * .015) * .12 : .55);
    if (armed && scene.time.now - (item.__mw08PulseAt || 0) > 520) {
      item.__mw08PulseAt = scene.time.now;
      const pulse = scene.add.circle(item.x, item.y, 9, 0xff5a61, 0).setDepth(13);
      pulse.setStrokeStyle?.(2, 0xff6b70, .8);
      tweenAway(scene, pulse, { scaleX: 2.3, scaleY: 2.3, duration: 360 });
    }
  } else if (item.weapon.id === 'dynamite' && item.fuseMs != null) {
    if (scene.time.now - (item.__mw08FuseAt || 0) > 130) {
      item.__mw08FuseAt = scene.time.now;
      const spark = scene.add.circle(item.x + 7, item.y - 12, 2.5, 0xffdf64, .98).setDepth(18);
      tweenAway(scene, spark, {
        x: spark.x + (Math.random() - .5) * 10,
        y: spark.y - 13 - Math.random() * 7,
        duration: 180
      });
    }
  }
}

function runnerPolish(scene, runner) {
  if (!runner || !runner.object || !runner.object.active)
    return;
  const now = scene.time.now;
  if (now - (runner.__mw08TrailAt || 0) < 90)
    return;
  runner.__mw08TrailAt = now;
  const roomba = runner.weapon.id === 'roomba-ride';
  const color = roomba ? 0x6ce8ed : 0xbbaea8;
  const puff = scene.add.circle(
    runner.x - runner.direction * 12,
    runner.y + 2,
    roomba ? 3.5 : 3,
    color,
    roomba ? .45 : .35
  ).setDepth(10);
  tweenAway(scene, puff, {
    x: puff.x - runner.direction * 13,
    y: puff.y - 4,
    scaleX: roomba ? 2 : 1.5,
    scaleY: roomba ? 2 : 1.5,
    duration: 260
  });
}

function terrainDebris(scene, x, y, weapon) {
  if (!weapon || weapon.blastRadius <= 0)
    return;
  const top = Number.parseInt(scene.arena.palette.terrainTop.slice(1), 16);
  const deep = Number.parseInt(scene.arena.palette.terrainDeep.slice(1), 16);
  const count = Math.min(24, 9 + Math.floor(weapon.blastRadius / 6));

  for (let i = 0; i < count; i += 1) {
    const color = i % 3 === 0 ? deep : top;
    const chunk = scene.add.rectangle(
      x + (Math.random() - .5) * weapon.blastRadius * .5,
      y + (Math.random() - .5) * 12,
      4 + Math.random() * 8,
      3 + Math.random() * 6,
      color,
      .92
    ).setDepth(35).setRotation(Math.random() * Math.PI);

    const facing = Math.random() < .5 ? -1 : 1;
    const lift = 24 + Math.random() * Math.max(26, weapon.blastRadius * .8);
    scene.tweens.add({
      targets: chunk,
      x: chunk.x + facing * (16 + Math.random() * weapon.blastRadius),
      y: chunk.y - lift,
      rotation: chunk.rotation + facing * (1.5 + Math.random() * 3),
      duration: 160 + Math.random() * 130,
      ease: 'Quad.Out',
      onComplete: () => tweenAway(scene, chunk, {
        y: y + 28 + Math.random() * 35,
        x: chunk.x + facing * (12 + Math.random() * 28),
        rotation: chunk.rotation + facing * 2,
        duration: 260 + Math.random() * 220,
        ease: 'Quad.In'
      })
    });
  }

  const dust = scene.add.circle(x, y, Math.max(12, weapon.blastRadius * .32), top, .22).setDepth(34);
  tweenAway(scene, dust, {
    y: y - 18,
    scaleX: 2.4,
    scaleY: 1.55,
    duration: 420
  });
  stats.terrainDebris += count;
}

function arenaImpact(scene, x, y, weapon) {
  const id = scene.arena.id;
  let colors;
  let count = 9;
  let kind = 'circle';

  if (id === 'garden-siege') {
    colors = [0x72c968, 0xf18fa8, 0xffda65];
    kind = 'leaf';
  } else if (id === 'rooftop-rumble') {
    colors = [0x8de5ff, 0xffffff, 0x6b7b93];
    kind = 'shard';
  } else if (id === 'junkyard-jamboree') {
    colors = [0xffb34f, 0xb5bdc3, 0x7e5c46];
    kind = 'spark';
    count = 12;
  } else if (id === 'taj-mahal') {
    colors = [0xffffff, 0xf7dba0, 0xb6e7dd];
    kind = 'petal';
  } else if (id === 'oconnell-bridge-spire') {
    colors = [0x7de2f0, 0xd8f8ff, 0x4aa8bd];
    kind = 'drop';
    count = 12;
  } else if (id === 'westminster-bridge-big-ben') {
    colors = [0x8bd9ef, 0xffffff, 0xd45761];
    kind = 'drop';
    count = 11;
  } else {
    colors = [0xf0d19a, 0xaee9f5, 0xffffff];
    kind = 'sand';
    count = 12;
  }

  for (let i = 0; i < count; i += 1) {
    const color = colors[i % colors.length];
    const angle = -Math.PI + Math.random() * Math.PI;
    const distance = 25 + Math.random() * Math.max(35, weapon.blastRadius || 42);
    let object;
    if (kind === 'leaf' || kind === 'petal')
      object = scene.add.ellipse(x, y, 9, 4, color, .86).setDepth(36).setRotation(angle);
    else if (kind === 'shard' || kind === 'spark')
      object = scene.add.rectangle(x, y, 9 + Math.random() * 8, 2.5, color, .92).setDepth(36).setRotation(angle);
    else
      object = scene.add.circle(x, y, 2.5 + Math.random() * 4, color, .8).setDepth(36);

    tweenAway(scene, object, {
      x: x + Math.cos(angle) * distance,
      y: y - 12 - Math.random() * 45,
      rotation: object.rotation + 2,
      scaleX: .25,
      scaleY: .25,
      duration: 330 + Math.random() * 300
    });
  }

  stats.arenaImpact += 1;
}

function weaponExplosionSignature(scene, x, y, weapon) {
  const theme = themeFor(weapon);

  if (weapon.id === 'yarn-bomb') {
    for (let i = 0; i < 3; i += 1) {
      const ring = scene.add.circle(x, y, 13 + i * 6, theme.primary, 0).setDepth(43);
      ring.setStrokeStyle?.(3, i % 2 ? theme.accent : theme.primary, .88);
      tweenAway(scene, ring, {
        delay: i * 50,
        scaleX: 2.8 + i * .4,
        scaleY: 2.8 + i * .4,
        duration: 420 + i * 60
      });
    }
  } else if (weapon.id === 'catnip-grenade') {
    for (let i = 0; i < 10; i += 1) {
      const puff = scene.add.circle(
        x + (Math.random() - .5) * 24,
        y + (Math.random() - .5) * 16,
        7 + Math.random() * 8,
        i % 2 ? 0x63d45f : 0xa8e866,
        .38
      ).setDepth(42);
      tweenAway(scene, puff, {
        x: puff.x + (Math.random() - .5) * 45,
        y: puff.y - 28 - Math.random() * 38,
        scaleX: 2.2,
        scaleY: 2.2,
        duration: 520 + Math.random() * 260
      });
    }
  } else if (weapon.id === 'fish-launcher') {
    for (let i = 0; i < 11; i += 1) {
      const drop = scene.add.ellipse(x, y, 4, 9, i % 2 ? theme.primary : theme.accent, .86)
        .setDepth(43)
        .setRotation((Math.random() - .5) * 1.5);
      tweenAway(scene, drop, {
        x: x + (Math.random() - .5) * 100,
        y: y - 30 - Math.random() * 65,
        rotation: drop.rotation + 2.5,
        duration: 390 + Math.random() * 230
      });
    }
  } else if (weapon.id === 'hairball-mortar') {
    for (let i = 0; i < 8; i += 1) {
      const splat = scene.add.circle(
        x + (Math.random() - .5) * 20,
        y + (Math.random() - .5) * 15,
        5 + Math.random() * 7,
        i % 2 ? 0x78634e : 0xa58d73,
        .72
      ).setDepth(42);
      tweenAway(scene, splat, {
        x: splat.x + (Math.random() - .5) * 70,
        y: splat.y - 18 - Math.random() * 44,
        scaleX: .25,
        scaleY: .25,
        duration: 420 + Math.random() * 230
      });
    }
  } else if (weapon.id === 'laser-pointer') {
    const ring = scene.add.circle(x, y, 15, 0xff476f, 0).setDepth(44);
    ring.setStrokeStyle?.(5, 0xff476f, .95);
    tweenAway(scene, ring, { scaleX: 4.5, scaleY: 4.5, duration: 360 });
    const cross = scene.add.graphics().setDepth(45);
    cross.lineStyle(3, 0xff9cb1, .85);
    cross.beginPath();
    cross.moveTo(x - 38, y); cross.lineTo(x + 38, y);
    cross.moveTo(x, y - 38); cross.lineTo(x, y + 38);
    cross.strokePath();
    tweenAway(scene, cross, { duration: 260 });
  } else if (weapon.id === 'roomba-ride') {
    const ring = scene.add.circle(x, y, 18, 0x6ff5f0, 0).setDepth(44);
    ring.setStrokeStyle?.(5, 0x6ff5f0, .9);
    tweenAway(scene, ring, { scaleX: 3.5, scaleY: 2.1, duration: 430 });
  } else if (weapon.id === 'dynamite') {
    impactSpark(scene, x, y, 0xffd05c, 16, 68);
  } else if (weapon.id === 'airstrike') {
    impactSpark(scene, x, y, 0xffffff, 12, 48);
  }
}

function hitExpression(scene, cat, applied, died) {
  if (!cat || !cat.sprite)
    return;
  cat.__mw08HitUntil = scene.time.now + (applied >= 45 ? 420 : 270);
  cat.__mw08HitPower = Math.min(2.1, .7 + applied / 40);

  const color = applied >= 45 ? 0xffd85d : 0xffffff;
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const mark = scene.add.rectangle(
      cat.x + Math.cos(angle) * 20,
      cat.y - 23 + Math.sin(angle) * 14,
      7,
      2,
      color,
      .9
    ).setDepth(92).setRotation(angle);
    tweenAway(scene, mark, {
      x: cat.x + Math.cos(angle) * 43,
      y: cat.y - 24 + Math.sin(angle) * 31,
      rotation: angle + 1.2,
      duration: 260 + i * 20
    });
  }

  if (died) {
    const out = scene.add.text(cat.x, cat.y - 72, 'OUT!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '20px',
      color: '#ffe36e',
      stroke: '#392333',
      strokeThickness: 6
    }).setOrigin(.5).setDepth(95).setRotation((Math.random() - .5) * .12);
    tweenAway(scene, out, { y: out.y - 42, scaleX: 1.25, scaleY: 1.25, duration: 700 });
  }
  stats.catExpress += 1;
}

function incomingMarker(scene, x, y, color, label) {
  const ring = scene.add.circle(x, y - 5, 26, color, 0).setDepth(55);
  ring.setStrokeStyle?.(3, color, .92);
  const line = scene.add.rectangle(x, Math.max(45, y / 2), 2, Math.max(20, y - 65), color, .3).setDepth(54);
  const text = scene.add.text(x, Math.max(84, y - 68), label, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: colorCss(color),
    stroke: '#162133',
    strokeThickness: 4
  }).setOrigin(.5).setDepth(56);
  tweenAway(scene, ring, { scaleX: 2.2, scaleY: 2.2, duration: 620 });
  tweenAway(scene, line, { duration: 520 });
  tweenAway(scene, text, { y: text.y - 18, duration: 520 });
}

function updateWeaponPanel(scene) {
  if (!scene.__mw08WeaponPanel || !scene.hud)
    return;
  const weapon = WEAPONS[scene.selectedWeaponIndex];
  if (!weapon)
    return;
  const theme = themeFor(weapon);
  const team = scene.activeCat().team;
  const ammo = scene.teamAmmo[team].get(weapon.id);
  const ammoLabel = ammo === Infinity ? '∞' : String(ammo == null ? 0 : ammo);
  const panel = scene.__mw08WeaponPanel;

  panel.name.setText(weapon.name.toUpperCase() + '   ' + ammoLabel);
  panel.name.setColor(colorCss(theme.accent));
  panel.desc.setText(weapon.description);
  panel.back.setStrokeStyle?.(2, theme.primary, .62);
  stats.hudRefresh += 1;

  const seconds = Math.ceil(scene.turnRemainingMs / 1000);
  if (!scene.gameOver && !scene.paused && !scene.actionLocked && seconds > 0 && seconds <= 5) {
    const pulse = 1 + Math.max(0, Math.sin(scene.time.now * .012)) * .045;
    scene.hud.centreText.setScale(pulse);
    scene.hud.centreText.setColor(seconds <= 2 ? '#ff786d' : '#ffd35a');
    if (scene.__mw08UrgentSecond !== seconds) {
      scene.__mw08UrgentSecond = seconds;
      scene.sfx.tone?.(seconds <= 2 ? 820 : 660, .045, 'square', .022, seconds <= 2 ? 980 : 760);
      stats.urgentTicks += 1;
    }
  } else {
    scene.hud.centreText.setScale(1);
    scene.hud.centreText.setColor('#ffe15c');
    if (seconds > 5)
      scene.__mw08UrgentSecond = null;
  }
}

function updateCatPolish(scene) {
  if (!scene.__mw08TurnGraphics)
    return;
  const now = scene.time.now;

  scene.__mw08TurnGraphics.clear();
  if (!scene.gameOver) {
    const active = scene.activeCat();
    if (active && active.alive) {
      const teamColor = active.team === 0 ? 0x60b9ff : 0xff6c86;
      const pulse = 35 + Math.sin(now * .006) * 2.3;
      scene.__mw08TurnGraphics.lineStyle(2.5, teamColor, .58);
      scene.__mw08TurnGraphics.strokeCircle(active.x, active.y - 5, pulse);
      scene.__mw08TurnGraphics.fillStyle(0xffe36e, .92);
      scene.__mw08TurnGraphics.fillTriangle(active.x - 7, active.y - 60, active.x + 7, active.y - 60, active.x, active.y - 49);
    }
  }

  for (const cat of scene.cats) {
    if (!cat.sprite || !cat.sprite.active)
      continue;
    if (cat.__mw08RecoilUntil > now) {
      const remain = (cat.__mw08RecoilUntil - now) / 220;
      const kick = Math.sin(Math.max(0, Math.min(1, remain)) * Math.PI) * 5.5 * (cat.__mw08RecoilPower || 1);
      cat.sprite.x -= (cat.__mw08RecoilFacing || 1) * kick;
      cat.sprite.angle -= (cat.__mw08RecoilFacing || 1) * kick * .55;
    }
    if (cat.__mw08HitUntil > now) {
      const power = cat.__mw08HitPower || 1;
      cat.sprite.x += Math.sin(now * .09 + cat.x) * 2.3 * power;
      cat.sprite.y += Math.cos(now * .075 + cat.y) * 1.6 * power;
      cat.sprite.angle += Math.sin(now * .065) * 2.5 * power;
    }
  }
}

function setupBattlePolish(scene) {
  scene.__mw08ProjectileFollowers = new Map();
  scene.__mw08TurnGraphics = scene.add.graphics().setDepth(29);

  const back = scene.add.rectangle(640, 587, 520, 43, 0x07182a, .94).setDepth(106);
  back.setStrokeStyle?.(2, 0x68cfff, .5);
  const name = scene.add.text(405, 575, '', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: '#ffe15c'
  }).setDepth(107);
  const desc = scene.add.text(650, 596, '', {
    fontFamily: 'Arial',
    fontSize: '11px',
    color: '#d8edff',
    align: 'center'
  }).setOrigin(.5).setDepth(107);

  scene.__mw08WeaponPanel = { back, name, desc };
  updateWeaponPanel(scene);
}

function celebrate(scene) {
  for (let i = 0; i < 36; i += 1) {
    const colors = [0xffd85b, 0x60c9ff, 0xff6f92, 0x7be28c, 0xffffff];
    const bit = scene.add.rectangle(
      120 + Math.random() * 1040,
      105 + Math.random() * 70,
      5 + Math.random() * 6,
      3 + Math.random() * 5,
      colors[i % colors.length],
      .92
    ).setDepth(270).setRotation(Math.random() * Math.PI);
    tweenAway(scene, bit, {
      x: bit.x + (Math.random() - .5) * 190,
      y: 520 + Math.random() * 130,
      rotation: bit.rotation + (Math.random() - .5) * 7,
      duration: 900 + Math.random() * 650
    });
  }
  stats.victoryFx += 1;
}

function closeV08Settings(scene) {
  if (!scene.__mw08Settings)
    return;
  for (const object of scene.__mw08Settings)
    object.destroy();
  scene.__mw08Settings = null;
}

function openV08Settings(scene) {
  if (scene.__mw08Settings)
    return;
  const items = [];
  const dim = scene.add.rectangle(640, 360, 1280, 720, 0x06111e, .83).setInteractive().setDepth(700);
  const panel = scene.add.rectangle(640, 350, 760, 500, 0x102a47, .99).setStrokeStyle(4, 0x63d8ff, .9).setDepth(701);
  const title = scene.add.text(640, 135, 'MEOW WARS v' + MW08_VERSION, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '34px',
    color: '#ffd253',
    stroke: '#13243d',
    strokeThickness: 5
  }).setOrigin(.5).setDepth(702);
  const copy = [
    'Build  ' + MW08_BUILD,
    '',
    'Battle polish       weapon-specific trails, impacts and recoil',
    'Destruction         terrain chunks, dust and arena-reactive debris',
    'Cat animation       hit shake, recoil, active-turn halo and KO flourish',
    'HUD                 selected-weapon detail + urgent final-5-second pulse',
    'Arena reactions     garden leaves, rooftop shards, junk sparks, river spray',
    'Environment         v0.7.1 Ha’penny Bridge / Temple Bar branding retained',
    'Art pipeline        4K source → layered HD runtime',
    '',
    'Controls',
    'A/D move   W/S aim   SPACE charge/fire   Q/E weapons',
    'ESC pause   R rematch   M main menu'
  ];
  const info = scene.add.text(330, 190, copy.join('\n'), {
    fontFamily: 'Arial',
    fontSize: '16px',
    color: '#edf9ff',
    lineSpacing: 7
  }).setDepth(702);
  const close = scene.add.rectangle(640, 566, 220, 44, 0xef5b52, 1)
    .setStrokeStyle(2, 0xffeee0, 1)
    .setInteractive({ useHandCursor: true })
    .setDepth(703);
  const closeText = scene.add.text(640, 566, 'CLOSE', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '18px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(704);

  dim.on('pointerdown', () => closeV08Settings(scene));
  close.on('pointerdown', () => closeV08Settings(scene));
  items.push(dim, panel, title, info, close, closeText);
  scene.__mw08Settings = items;
}

const v07GameCreate = GameScene.prototype.create;
GameScene.prototype.create = function() {
  v07GameCreate.call(this);
  const marker = this.children.getByName('mw-build-marker');
  if (marker && marker.setText)
    marker.setText('v' + MW08_VERSION + ' · ' + MW08_BUILD);
  setupBattlePolish(this);
};

const v07GameUpdate = GameScene.prototype.update;
GameScene.prototype.update = function(time, delta) {
  v07GameUpdate.call(this, time, delta);
  if (!this.hud || !this.cats)
    return;
  updateWeaponPanel(this);
  updateCatPolish(this);
  cleanupProjectileFollowers(this);
};

const v07MuzzleFx = GameScene.prototype.muzzleFx;
GameScene.prototype.muzzleFx = function(shooter, weapon) {
  v07MuzzleFx.call(this, shooter, weapon);
  muzzleAccent(this, shooter, weapon);
};

const v07FireHitscan = GameScene.prototype.fireHitscan;
GameScene.prototype.fireHitscan = function(shooter, weapon, offsets) {
  this.__mw08HitscanWeapon = weapon;
  try {
    return v07FireHitscan.call(this, shooter, weapon, offsets);
  } finally {
    this.__mw08HitscanWeapon = null;
  }
};

const v07DrawTracer = GameScene.prototype.drawTracer;
GameScene.prototype.drawTracer = function(x1, y1, x2, y2, color) {
  v07DrawTracer.call(this, x1, y1, x2, y2, color);
  if (this.__mw08HitscanWeapon)
    hitscanImpact(this, x2, y2, this.__mw08HitscanWeapon);
};

const v07FireProjectile = GameScene.prototype.fireProjectile;
GameScene.prototype.fireProjectile = function(shooter, weapon) {
  const result = v07FireProjectile.call(this, shooter, weapon);
  const projectile = this.projectiles[this.projectiles.length - 1];
  if (projectile && projectile.weapon === weapon) {
    const theme = themeFor(weapon);
    projectile.__mw08Theme = theme;
    if (weapon.id === 'fish-launcher')
      projectile.object.setScale(1.55, .72);
    else if (weapon.id === 'bazooka')
      projectile.object.setScale(1.28, .82);
    else if (weapon.id === 'hairball-mortar')
      projectile.object.setScale(1.22);
    else if (weapon.id === 'yarn-bomb')
      projectile.object.setStrokeStyle?.(2, theme.accent, .85);
    ensureProjectileFollower(this, projectile);
  }
  return result;
};

const v07UpdateProjectiles = GameScene.prototype.updateProjectiles;
GameScene.prototype.updateProjectiles = function(dtMs) {
  v07UpdateProjectiles.call(this, dtMs);
  for (const projectile of this.projectiles) {
    ensureProjectileFollower(this, projectile);
    projectileTrail(this, projectile);
  }
  cleanupProjectileFollowers(this);
};

const v07PlaceDeployable = GameScene.prototype.placeDeployable;
GameScene.prototype.placeDeployable = function(shooter, weapon) {
  const result = v07PlaceDeployable.call(this, shooter, weapon);
  const item = this.deployables[this.deployables.length - 1];
  if (item && item.weapon === weapon) {
    item.object.setStrokeStyle?.(2, themeFor(weapon).accent, .82);
    stats.weaponAccent += 1;
  }
  return result;
};

const v07UpdateDeployables = GameScene.prototype.updateDeployables;
GameScene.prototype.updateDeployables = function(dtMs) {
  v07UpdateDeployables.call(this, dtMs);
  for (const item of this.deployables)
    deployablePolish(this, item);
};

const v07FireAirstrike = GameScene.prototype.fireAirstrike;
GameScene.prototype.fireAirstrike = function(shooter, weapon) {
  const x = this.targetX(shooter);
  const y = surfaceY(this.terrain, x);
  incomingMarker(this, x, y, 0xffd461, 'INCOMING!');
  stats.weaponAccent += 1;
  return v07FireAirstrike.call(this, shooter, weapon);
};

const v07FireRunner = GameScene.prototype.fireRunner;
GameScene.prototype.fireRunner = function(shooter, weapon) {
  const result = v07FireRunner.call(this, shooter, weapon);
  const runner = this.runners[this.runners.length - 1];
  if (runner && runner.weapon === weapon) {
    runner.object.setStrokeStyle?.(2, themeFor(weapon).accent, .85);
    stats.weaponAccent += 1;
  }
  return result;
};

const v07UpdateRunners = GameScene.prototype.updateRunners;
GameScene.prototype.updateRunners = function(dtMs) {
  v07UpdateRunners.call(this, dtMs);
  for (const runner of this.runners)
    runnerPolish(this, runner);
};

const v07FireLaser = GameScene.prototype.fireLaser;
GameScene.prototype.fireLaser = function(shooter, weapon) {
  const x = this.targetX(shooter);
  const y = surfaceY(this.terrain, x);
  incomingMarker(this, x, y, 0xff4f73, 'LASER LOCK');
  stats.weaponAccent += 1;
  return v07FireLaser.call(this, shooter, weapon);
};

const v07Explode = GameScene.prototype.explode;
GameScene.prototype.explode = function(x, y, weapon, ownerId) {
  const result = v07Explode.call(this, x, y, weapon, ownerId);
  if (weapon && weapon.blastRadius > 0) {
    terrainDebris(this, x, y, weapon);
    arenaImpact(this, x, y, weapon);
    weaponExplosionSignature(this, x, y, weapon);
  }
  return result;
};

const v07DamageCat = GameScene.prototype.damageCat;
GameScene.prototype.damageCat = function(cat, damage, impulseX, impulseY) {
  const before = cat.health;
  const result = v07DamageCat.call(this, cat, damage, impulseX, impulseY);
  const applied = Math.max(0, before - cat.health);
  if (applied > .4)
    hitExpression(this, cat, applied, before > 0 && cat.health <= 0);
  return result;
};

const v07StartTurn = GameScene.prototype.startTurn;
GameScene.prototype.startTurn = function(initial) {
  const result = v07StartTurn.call(this, initial);
  this.__mw08UrgentSecond = null;
  if (this.__mw08WeaponPanel)
    updateWeaponPanel(this);
  return result;
};

const v07CheckWin = GameScene.prototype.checkWin;
GameScene.prototype.checkWin = function() {
  const wasOver = this.gameOver;
  const result = v07CheckWin.call(this);
  if (!wasOver && this.gameOver)
    celebrate(this);
  return result;
};

const v07MenuCreate = MenuScene.prototype.create;
MenuScene.prototype.create = function() {
  v07MenuCreate.call(this);

  for (const child of this.children.list) {
    if (typeof child.text === 'string') {
      if (child.text.includes('MEOW WARS v0.7.1'))
        child.setText(child.text.replace('MEOW WARS v0.7.1', 'MEOW WARS v' + MW08_VERSION));
      if (child.text.includes('mw-v071-dublin-brand-20260918a'))
        child.setText(child.text.replace('mw-v071-dublin-brand-20260918a', MW08_BUILD));
      if (child.text === 'SETTINGS' && Math.abs(child.x - 1160) < 3 && Math.abs(child.y - 45) < 3)
        child.setVisible(false);
    }
    if (child.input && Math.abs((child.x || 0) - 1160) < 3 && Math.abs((child.y || 0) - 45) < 3)
      child.disableInteractive?.();
  }

  const settings = this.add.rectangle(1160, 45, 170, 36, 0x173d61, .99)
    .setStrokeStyle(2, 0xffd253, .95)
    .setInteractive({ useHandCursor: true })
    .setDepth(190);
  this.add.text(1160, 45, 'SETTINGS', {
    fontFamily: 'Arial Black, Arial',
    fontSize: '13px',
    color: '#ffffff'
  }).setOrigin(.5).setDepth(191);
  settings.on('pointerdown', () => openV08Settings(this));
};

const previousBuildInfo = globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion = MW08_VERSION;
document.documentElement.dataset.meowWarsBuild = MW08_BUILD;
const gameHost = document.getElementById('game');
if (gameHost) {
  gameHost.dataset.version = MW08_VERSION;
  gameHost.dataset.build = MW08_BUILD;
}
globalThis.__MEOW_WARS_VERSION = MW08_VERSION;
globalThis.__MEOW_WARS_BUILD = MW08_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO = () => {
  const base = typeof previousBuildInfo === 'function' ? previousBuildInfo() : {};
  return {
    ...base,
    version: MW08_VERSION,
    build: MW08_BUILD,
    battlePolish: [
      'weapon-specific-trails',
      'weapon-impact-signatures',
      'terrain-debris',
      'arena-impact-reactions',
      'cat-hit-expression',
      'active-turn-halo',
      'urgent-turn-pulse',
      'selected-weapon-detail'
    ],
    v08Stats: { ...stats }
  };
};
})();
