/* Meow Wars v0.6.0 HD environment layer.
   Original 4K-source procedural artwork is drawn at 3840x2160, then
   high-quality downsampled into layered 1280x720 Phaser textures. */
(() => {
'use strict';

const MW_VERSION = '0.6.0';
const MW_BUILD = 'mw-v06-env-20260918b';
const MW_SOURCE_W = 3840;
const MW_SOURCE_H = 2160;
const MW_VIEW_W = 1280;
const MW_VIEW_H = 720;
const MW_SOURCE_SCALE = 3;
const MW_TERRAIN_SCALE = 2;
const MW_BACKGROUND_SCALE = (globalThis.innerWidth || 1280) < 800
  ? 1.5
  : Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1, Math.max((globalThis.innerWidth || 1280) / 1280, (globalThis.innerHeight || 720) / 720)));

const newArenas = [
  {
    id: 'taj-mahal',
    name: 'Taj Mahal',
    tagline: 'Marble, fountains and very bad decisions.',
    seed: 1631,
    windMultiplier: 0.78,
    terrainProfile: {
      baseRatio: 0.70, waveAAmplitudeRatio: 0.042, waveAFrequency: 0.012,
      waveBAmplitudeRatio: 0.018, waveBFrequency: 0.031,
      moundAmplitudeRatio: 0.025, minSurfaceRatio: 0.52, maxSurfaceRatio: 0.82
    },
    spawnFractions: [0.08, 0.22, 0.38, 0.62, 0.78, 0.92],
    palette: {
      skyTop: '#70ccff', skyBottom: '#d7f4ff', sun: '#fff0aa',
      terrainTop: '#83624a', terrainDeep: '#513b31', grass: '#4f9a45', accent: '#e7c15e'
    },
    terrainSkin: 'taj-garden',
    water: { kind: 'pool', x: 440, width: 400, y: 414, height: 118, color: '#65c8dc', amplitude: 2.3, speed: 0.0015 }
  },
  {
    id: 'oconnell-bridge-spire',
    name: 'O’Connell Bridge + Spire',
    tagline: 'Dublin skyline, Liffey wind and catastrophic aim.',
    seed: 1916,
    windMultiplier: 1.12,
    terrainProfile: {
      baseRatio: 0.67, waveAAmplitudeRatio: 0.038, waveAFrequency: 0.014,
      waveBAmplitudeRatio: 0.020, waveBFrequency: 0.039,
      moundAmplitudeRatio: -0.012, minSurfaceRatio: 0.50, maxSurfaceRatio: 0.80
    },
    spawnFractions: [0.07, 0.22, 0.38, 0.62, 0.79, 0.93],
    palette: {
      skyTop: '#62bce8', skyBottom: '#d3edf3', sun: '#ffe6a0',
      terrainTop: '#776c62', terrainDeep: '#48443f', grass: '#847d70', accent: '#63d0ff'
    },
    terrainSkin: 'dublin-stone',
    water: { kind: 'river', x: 0, width: 1280, y: 405, height: 150, color: '#4f9fb2', amplitude: 3.2, speed: 0.0018 }
  },
  {
    id: 'westminster-bridge-big-ben',
    name: 'Westminster Bridge + Big Ben',
    tagline: 'Tea, towers and questionable trajectories.',
    seed: 1859,
    windMultiplier: 1.18,
    terrainProfile: {
      baseRatio: 0.66, waveAAmplitudeRatio: 0.034, waveAFrequency: 0.012,
      waveBAmplitudeRatio: 0.018, waveBFrequency: 0.033,
      moundAmplitudeRatio: -0.008, minSurfaceRatio: 0.50, maxSurfaceRatio: 0.79
    },
    spawnFractions: [0.07, 0.23, 0.39, 0.61, 0.77, 0.93],
    palette: {
      skyTop: '#70bce6', skyBottom: '#daeef4', sun: '#fff0ae',
      terrainTop: '#756b61', terrainDeep: '#49413d', grass: '#71806b', accent: '#7fd3b2'
    },
    terrainSkin: 'london-stone',
    water: { kind: 'river', x: 0, width: 1280, y: 414, height: 148, color: '#5a9eac', amplitude: 2.8, speed: 0.00165 }
  },
  {
    id: 'donabate-beach',
    name: 'Donabate Beach',
    tagline: 'Sand, sea air and absolutely nowhere to hide.',
    seed: 1972,
    windMultiplier: 1.42,
    terrainProfile: {
      baseRatio: 0.69, waveAAmplitudeRatio: 0.060, waveAFrequency: 0.011,
      waveBAmplitudeRatio: 0.024, waveBFrequency: 0.027,
      moundAmplitudeRatio: 0.045, minSurfaceRatio: 0.49, maxSurfaceRatio: 0.84
    },
    spawnFractions: [0.07, 0.22, 0.37, 0.63, 0.79, 0.94],
    palette: {
      skyTop: '#62c8ef', skyBottom: '#d5f5f5', sun: '#fff0aa',
      terrainTop: '#d2ad73', terrainDeep: '#98714e', grass: '#6c9957', accent: '#55cadd'
    },
    terrainSkin: 'beach-sand',
    water: { kind: 'sea', x: 0, width: 1280, y: 335, height: 188, color: '#46a9bb', amplitude: 4.0, speed: 0.0019 }
  }
];

for (const arena of newArenas) {
  if (!ARENAS.some((entry) => entry.id === arena.id)) ARENAS.push(arena);
}

const skinByArena = {
  'garden-siege': 'garden-soil',
  'rooftop-rumble': 'rooftop',
  'junkyard-jamboree': 'scrap-earth',
  'taj-mahal': 'taj-garden',
  'oconnell-bridge-spire': 'dublin-stone',
  'westminster-bridge-big-ben': 'london-stone',
  'donabate-beach': 'beach-sand'
};

for (const arena of ARENAS) {
  arena.terrainSkin = arena.terrainSkin || skinByArena[arena.id] || 'garden-soil';
}

const existingPalette = {
  'garden-siege': {
    skyTop: '#56c8f2', skyBottom: '#d9f6ff', sun: '#fff2a6',
    terrainTop: '#74513d', terrainDeep: '#4b3128', grass: '#56b84b', accent: '#ff6c9f'
  },
  'rooftop-rumble': {
    skyTop: '#181939', skyBottom: '#7b4779', sun: '#ffe7b0',
    terrainTop: '#555966', terrainDeep: '#31323b', grass: '#8f95a0', accent: '#49f0d3'
  },
  'junkyard-jamboree': {
    skyTop: '#ef9253', skyBottom: '#ffd69b', sun: '#fff2c2',
    terrainTop: '#6f5546', terrainDeep: '#43332d', grass: '#968854', accent: '#ffd13f'
  }
};
for (const arena of ARENAS) {
  if (existingPalette[arena.id]) arena.palette = { ...arena.palette, ...existingPalette[arena.id] };
}

function rr(c, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}

function poly(c, points, fill, stroke, width) {
  if (!points.length) return;
  c.beginPath();
  c.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) c.lineTo(points[i][0], points[i][1]);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 2; c.stroke(); }
}

function line(c, points, stroke, width, alpha) {
  c.save();
  c.globalAlpha = alpha == null ? 1 : alpha;
  c.beginPath();
  c.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) c.lineTo(points[i][0], points[i][1]);
  c.strokeStyle = stroke;
  c.lineWidth = width || 2;
  c.stroke();
  c.restore();
}

function circle(c, x, y, r, fill, alpha) {
  c.save();
  c.globalAlpha = alpha == null ? 1 : alpha;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.restore();
}

function ellipse(c, x, y, rx, ry, fill, alpha) {
  c.save();
  c.globalAlpha = alpha == null ? 1 : alpha;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.restore();
}

function sky(c, top, bottom, horizon) {
  const g = c.createLinearGradient(0, 0, 0, horizon || 560);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(0, 0, 1280, 720);
}

function cloud(c, x, y, s, alpha) {
  c.save();
  c.globalAlpha = alpha == null ? 0.82 : alpha;
  c.fillStyle = '#ffffff';
  ellipse(c, x, y, 60 * s, 18 * s, '#ffffff', 1);
  circle(c, x - 30 * s, y - 12 * s, 22 * s, '#ffffff', 1);
  circle(c, x + 5 * s, y - 18 * s, 29 * s, '#ffffff', 1);
  circle(c, x + 38 * s, y - 8 * s, 20 * s, '#ffffff', 1);
  c.restore();
}

function birds(c, x, y, count, spacing, color) {
  c.save();
  c.strokeStyle = color || 'rgba(38,70,90,.55)';
  c.lineWidth = 1.5;
  for (let i = 0; i < count; i += 1) {
    const bx = x + i * (spacing || 34);
    const by = y + Math.sin(i * 2.2) * 10;
    c.beginPath();
    c.arc(bx - 5, by, 6, Math.PI * 1.1, Math.PI * 1.85);
    c.arc(bx + 5, by, 6, Math.PI * 1.15, Math.PI * 1.9);
    c.stroke();
  }
  c.restore();
}

function windows(c, x, y, cols, rows, dx, dy, w, h, lit, dark) {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const on = ((row * 7 + col * 11 + Math.floor(x)) % 5) !== 1;
      c.fillStyle = on ? lit : dark;
      c.fillRect(x + col * dx, y + row * dy, w, h);
    }
  }
}

function tree(c, x, y, s, leafA, leafB) {
  c.fillStyle = '#785338';
  rr(c, x - 7 * s, y - 55 * s, 14 * s, 62 * s, 4 * s);
  c.fill();
  circle(c, x - 19 * s, y - 58 * s, 25 * s, leafA || '#3f9947');
  circle(c, x + 18 * s, y - 61 * s, 28 * s, leafA || '#3f9947');
  circle(c, x, y - 82 * s, 30 * s, leafB || '#62b64d');
  circle(c, x + 27 * s, y - 79 * s, 17 * s, leafB || '#62b64d');
}

function hedge(c, x, y, w, h, a, b) {
  c.fillStyle = a;
  rr(c, x, y, w, h, 14);
  c.fill();
  for (let px = x + 12; px < x + w; px += 24) {
    circle(c, px, y + 8 + ((px / 24) % 2) * 7, 15, b, 0.9);
  }
}

function house(c, x, y, w, h, body, roof) {
  c.fillStyle = body;
  c.fillRect(x, y, w, h);
  poly(c, [[x - 8, y], [x + w * 0.5, y - 45], [x + w + 8, y]], roof, '#694a46', 2);
  c.fillStyle = '#81b6ca';
  c.fillRect(x + 17, y + 25, 18, 25);
  c.fillRect(x + w - 35, y + 25, 18, 25);
  c.fillStyle = '#a85b50';
  c.fillRect(x + w * 0.5 - 12, y + h - 42, 24, 42);
}

function lamp(c, x, y, s, warm) {
  c.strokeStyle = '#1e2933';
  c.lineWidth = 5 * s;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - 92 * s);
  c.stroke();
  c.fillStyle = '#273540';
  rr(c, x - 13 * s, y - 104 * s, 26 * s, 23 * s, 4 * s);
  c.fill();
  c.fillStyle = warm || '#ffeab3';
  rr(c, x - 8 * s, y - 100 * s, 16 * s, 14 * s, 3 * s);
  c.fill();
  circle(c, x, y - 109 * s, 4 * s, '#1e2933');
}

function taj(c, x, baseY, s) {
  c.save();
  c.translate(x, baseY);
  c.scale(s, s);
  c.fillStyle = '#f4f0e8';
  c.strokeStyle = '#c8c0ae';
  c.lineWidth = 2;
  c.fillRect(-155, -104, 310, 104);
  c.strokeRect(-155, -104, 310, 104);
  c.fillStyle = '#e8e2d7';
  c.fillRect(-182, -20, 364, 20);
  for (const side of [-1, 1]) {
    const mx = side * 195;
    c.fillStyle = '#f8f5ed';
    c.fillRect(mx - 14, -168, 28, 168);
    c.fillStyle = '#e2dccf';
    c.fillRect(mx - 18, -88, 36, 10);
    c.fillRect(mx - 18, -139, 36, 9);
    c.fillStyle = '#faf7ef';
    c.beginPath();
    c.moveTo(mx - 19, -168);
    c.quadraticCurveTo(mx, -202, mx + 19, -168);
    c.closePath();
    c.fill();
    circle(c, mx, -201, 3, '#9a7f45');
  }
  c.fillStyle = '#faf8f2';
  c.beginPath();
  c.moveTo(-69, -104);
  c.bezierCurveTo(-72, -167, -48, -211, 0, -223);
  c.bezierCurveTo(48, -211, 72, -167, 69, -104);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#f7f3eb';
  c.fillRect(-16, -239, 32, 24);
  poly(c, [[-10, -239], [0, -258], [10, -239]], '#f7f3eb', '#c8c0ae', 1.5);
  circle(c, 0, -263, 3.5, '#a88943');
  c.fillStyle = '#d5cdbd';
  for (const dx of [-108, -58, 58, 108]) {
    c.beginPath();
    c.arc(dx, -68, 17, Math.PI, 0);
    c.lineTo(dx + 17, 0);
    c.lineTo(dx - 17, 0);
    c.closePath();
    c.fill();
  }
  c.fillStyle = '#4c4a46';
  c.beginPath();
  c.arc(0, -61, 21, Math.PI, 0);
  c.lineTo(21, -7);
  c.lineTo(-21, -7);
  c.closePath();
  c.fill();
  c.restore();
}

function spire(c, x, baseY, h) {
  const g = c.createLinearGradient(x - 5, 0, x + 8, 0);
  g.addColorStop(0, '#8f9ca4');
  g.addColorStop(0.5, '#eef4f4');
  g.addColorStop(1, '#68777f');
  c.fillStyle = g;
  poly(c, [[x - 5, baseY], [x + 5, baseY], [x + 1.2, baseY - h], [x - 1.2, baseY - h]], g, null, 0);
  circle(c, x, baseY - h, 2, '#e6f1f3');
}

function dublinBridge(c, x, y, w, h) {
  c.fillStyle = '#c9b08b';
  c.fillRect(x, y, w, 25);
  c.fillStyle = '#ad9273';
  c.fillRect(x, y + 22, w, 9);
  c.fillStyle = '#bda580';
  const gap = w / 3;
  for (let i = 0; i < 3; i += 1) {
    const cx = x + gap * (i + 0.5);
    c.beginPath();
    c.moveTo(x + i * gap, y + h);
    c.lineTo(x + i * gap, y + 28);
    c.quadraticCurveTo(cx, y + h - 58, x + (i + 1) * gap, y + 28);
    c.lineTo(x + (i + 1) * gap, y + h);
    c.closePath();
    c.fill();
  }
  c.fillStyle = '#8d735e';
  for (let px = x + 10; px < x + w; px += 35) c.fillRect(px, y + 6, 18, 5);
}

function elizabethTower(c, x, baseY, s) {
  c.save();
  c.translate(x, baseY);
  c.scale(s, s);
  c.fillStyle = '#c9a968';
  c.fillRect(-31, -218, 62, 218);
  c.fillStyle = '#ddc283';
  c.fillRect(-38, -238, 76, 54);
  c.fillStyle = '#9c8356';
  for (let y = -174; y < -20; y += 32) {
    c.fillRect(-22, y, 10, 17);
    c.fillRect(12, y, 10, 17);
  }
  c.fillStyle = '#f6f1d5';
  circle(c, 0, -211, 23, '#f6f1d5');
  c.strokeStyle = '#3c4f45';
  c.lineWidth = 3;
  c.beginPath(); c.arc(0, -211, 23, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.moveTo(0, -211); c.lineTo(0, -225); c.moveTo(0, -211); c.lineTo(13, -204); c.stroke();
  c.fillStyle = '#4e6b58';
  poly(c, [[-36, -238], [0, -302], [36, -238]], '#4e6b58', '#35493c', 2);
  poly(c, [[-20, -281], [0, -322], [20, -281]], '#3c5849', null, 0);
  circle(c, 0, -326, 3, '#b6944f');
  c.restore();
}

function westminsterBridge(c, x, y, w, h) {
  c.fillStyle = '#5e8f70';
  c.fillRect(x, y, w, 19);
  c.fillStyle = '#45745b';
  c.fillRect(x, y + 17, w, 11);
  const spans = 7;
  const span = w / spans;
  for (let i = 0; i < spans; i += 1) {
    const left = x + i * span;
    c.fillStyle = '#4c7e61';
    c.beginPath();
    c.moveTo(left, y + h);
    c.lineTo(left, y + 25);
    c.quadraticCurveTo(left + span / 2, y + h - 35, left + span, y + 25);
    c.lineTo(left + span, y + h);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = '#b6c6b7';
  c.lineWidth = 2;
  for (let px = x + 8; px < x + w; px += 23) {
    c.beginPath(); c.moveTo(px, y - 7); c.lineTo(px, y + 15); c.stroke();
  }
  line(c, [[x, y - 5], [x + w, y - 5]], '#d8e0d8', 3, 0.9);
}

function martello(c, x, baseY, s) {
  c.save();
  c.translate(x, baseY);
  c.scale(s, s);
  c.fillStyle = '#9b8b78';
  c.beginPath();
  c.moveTo(-34, 0);
  c.lineTo(-28, -57);
  c.quadraticCurveTo(0, -72, 28, -57);
  c.lineTo(34, 0);
  c.closePath();
  c.fill();
  c.strokeStyle = '#6f6255';
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = '#4a4540';
  rr(c, -7, -30, 14, 18, 2); c.fill();
  c.fillStyle = '#716556';
  c.fillRect(-38, -61, 76, 9);
  c.restore();
}

function drawGarden(layer, c) {
  if (layer === 0) {
    sky(c, '#55c9f3', '#d7f6ff', 550);
    circle(c, 1092, 96, 60, '#fff0a3', 0.92);
    cloud(c, 110, 100, 1.0, 0.82); cloud(c, 365, 145, 0.72, 0.7); cloud(c, 890, 103, 0.85, 0.7); cloud(c, 1190, 150, 0.62, 0.65);
    birds(c, 720, 118, 4, 31);
    const colors = [['#f4cb82','#b95b52'],['#efb5a6','#425e80'],['#c8d8f0','#9c5c4c'],['#f3d0a6','#456782'],['#dac1eb','#a75555'],['#c6e0bd','#866048']];
    for (let i = 0; i < 7; i += 1) house(c, 15 + i * 190, 305 + (i % 2) * 28, 128, 130, colors[i % colors.length][0], colors[i % colors.length][1]);
  } else if (layer === 1) {
    for (const [x,s] of [[75,1.1],[230,.82],[485,1.05],[770,.92],[1040,1.0],[1215,.78]]) tree(c,x,405,s,'#3d9848','#65bc52');
    hedge(c,0,425,1280,72,'#388c43','#58aa48');
    c.fillStyle = '#f5ead0';
    c.fillRect(0, 474, 1280, 9);
    for (let x = 10; x < 1280; x += 37) {
      c.fillStyle = '#f7efd9';
      c.fillRect(x, 435, 7, 82);
      poly(c, [[x,435],[x+3.5,426],[x+7,435]], '#f7efd9', null, 0);
    }
  } else {
    c.fillStyle = 'rgba(57,136,54,.35)';
    c.fillRect(0, 518, 1280, 78);
    const flowers = ['#ff6684','#ffd351','#ffffff','#79c9ff','#bb83e8'];
    for (let i = 0; i < 92; i += 1) {
      const x = 8 + ((i * 137) % 1260);
      const y = 520 + ((i * 61) % 72);
      c.strokeStyle = '#2c7a36'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(x,y+9); c.lineTo(x,y-2); c.stroke();
      circle(c,x,y-3,3.2,flowers[i%flowers.length]);
      circle(c,x+4,y,3.0,flowers[(i+1)%flowers.length]);
      circle(c,x-4,y,3.0,flowers[(i+2)%flowers.length]);
      circle(c,x,y,2.2,'#ffd95c');
    }
    c.fillStyle = '#b57746';
    rr(c, 94, 505, 58, 35, 7); c.fill();
    c.fillStyle = '#6e9baa';
    rr(c, 1110, 505, 62, 29, 7); c.fill();
  }
}

function drawRooftop(layer, c) {
  if (layer === 0) {
    sky(c, '#171833', '#74446f', 600);
    circle(c, 1094, 95, 48, '#ffe6aa', 0.9);
    const glow = c.createRadialGradient(1094,95,12,1094,95,135);
    glow.addColorStop(0,'rgba(255,226,162,.20)'); glow.addColorStop(1,'rgba(255,226,162,0)');
    c.fillStyle=glow; c.fillRect(950,0,300,260);
    cloud(c, 150, 120, .8, .22); cloud(c, 560, 80, .65, .16);
    for (let i = 0; i < 14; i += 1) {
      const x = i * 100 - 25;
      const h = 150 + ((i * 47) % 135);
      const y = 480 - h;
      c.fillStyle = i % 3 === 0 ? '#2f3552' : i % 3 === 1 ? '#3d3a58' : '#30384d';
      c.fillRect(x, y, 92, h);
      windows(c,x+12,y+24,3,5,24,30,9,13,'#ffd173','#20283d');
      if (i % 4 === 0) { c.fillStyle='#313746'; c.fillRect(x+30,y-45,32,45); }
    }
  } else if (layer === 1) {
    c.fillStyle='#2c303b'; c.fillRect(0,470,1280,78);
    c.fillStyle='#6d4140'; c.fillRect(0,466,1280,9);
    for (const [x,h] of [[165,82],[350,58],[910,74],[1120,95]]) {
      c.fillStyle='#824c42'; c.fillRect(x,470-h,34,h);
      c.fillStyle='#4b3132'; c.fillRect(x-5,470-h-10,44,12);
    }
    c.fillStyle='#7c8996'; ellipse(c,685,360,54,24,'#7c8996'); c.fillRect(631,360,108,45);
    c.strokeStyle='#505963'; c.lineWidth=7;
    line(c,[[650,405],[635,468]],'#505963',7); line(c,[[720,405],[736,468]],'#505963',7);
    c.strokeStyle='#27303e'; c.lineWidth=3;
    line(c,[[652,438],[719,438]],'#27303e',3);
    c.strokeStyle='#283241'; c.lineWidth=3;
    line(c,[[1060,470],[1110,360],[1160,470]],'#283241',3);
    line(c,[[1080,407],[1140,407]],'#283241',2);
  } else {
    c.fillStyle='rgba(21,24,31,.75)'; c.fillRect(0,532,1280,70);
    for (const x of [105,300,770,1190]) {
      c.fillStyle='#a95f43'; rr(c,x-18,505,36,29,5); c.fill();
      circle(c,x,501,17,'#4d9a52'); circle(c,x+11,494,11,'#62b45b');
    }
    c.fillStyle='#7f8b95'; rr(c,415,508,55,29,4); c.fill();
    line(c,[[442,508],[442,493],[482,493]],'#aeb8be',4);
    c.fillStyle='#a87243'; rr(c,865,505,62,34,3); c.fill();
    c.strokeStyle='#60452f'; c.lineWidth=3; c.strokeRect(865,505,62,34);
    c.fillStyle='#2b3240'; rr(c,1040,500,85,26,5); c.fill();
    c.fillStyle='#49f0d3'; c.fillRect(1060,505,46,5);
  }
}

function drawJunkyard(layer, c) {
  if (layer === 0) {
    sky(c, '#ed8e51', '#ffd498', 560);
    circle(c, 1085, 105, 63, '#fff0bd', 0.85);
    cloud(c, 160, 118, .75, .35); cloud(c, 550, 86, .65, .28); cloud(c, 940, 152, .82, .30);
    c.fillStyle='#7b6757';
    c.fillRect(0,410,1280,60);
    for (const x of [135,950]) {
      c.strokeStyle='#6c513b'; c.lineWidth=8;
      line(c,[[x,410],[x,220],[x+110,220]],'#6c513b',8);
      line(c,[[x+35,410],[x+35,250],[x+108,250]],'#6c513b',5);
      line(c,[[x+105,220],[x+105,330]],'#6c513b',4);
      c.fillStyle='#45484b'; rr(c,x+92,326,26,34,3); c.fill();
    }
    for (const [x,w,h] of [[350,190,125],[590,155,95],[790,180,145]]) {
      c.fillStyle='#715f50'; c.fillRect(x,410-h,w,h);
      c.fillStyle='#a88059'; c.fillRect(x,410-h,w,12);
      c.fillStyle='#403f3e'; for(let px=x+20;px<x+w-10;px+=38)c.fillRect(px,410-h+34,18,28);
    }
  } else if (layer === 1) {
    const piles = [[60,470,1.0],[270,460,1.1],[540,475,.9],[790,458,1.05],[1050,470,1.0]];
    for (const [x,y,s] of piles) {
      c.fillStyle='#795b49';
      poly(c,[[x,y],[x+72*s,y-77*s],[x+154*s,y]],'#795b49','#59463b',2);
      for(let i=0;i<9;i++){
        const px=x+16+((i*31)%130)*s, py=y-12-((i*23)%52)*s;
        c.fillStyle=['#9d684b','#596f72','#b77947','#5b5d61'][i%4];
        rr(c,px,py,28*s,12*s,3); c.fill();
      }
    }
    for(const x of [180,690,1110]){
      c.fillStyle='#b85e48'; rr(c,x,438,92,35,12); c.fill();
      c.fillStyle='#34414a'; rr(c,x+12,430,52,17,7); c.fill();
      circle(c,x+18,474,11,'#272c30'); circle(c,x+72,474,11,'#272c30');
    }
  } else {
    for(const x of [55,130,390,890,980]){
      c.strokeStyle='#1f2529';c.lineWidth=8;c.beginPath();c.arc(x,520,18,0,Math.PI*2);c.stroke();
      c.strokeStyle='#596168';c.lineWidth=3;c.beginPath();c.arc(x,520,12,0,Math.PI*2);c.stroke();
    }
    for(const x of [260,510,1180]){
      c.fillStyle='#4d737d'; rr(c,x,493,30,47,3); c.fill();
      c.fillStyle='#dda94a'; c.fillRect(x,507,30,8);
      c.strokeStyle='#2e454c'; c.lineWidth=2; c.strokeRect(x,493,30,47);
    }
    c.fillStyle='#9b693f'; rr(c,650,498,60,40,3); c.fill();
    line(c,[[650,498],[710,538]],'#5c402b',4); line(c,[[710,498],[650,538]],'#5c402b',4);
    c.fillStyle='#f3d5a7'; rr(c,24,430,118,43,4); c.fill();
    c.fillStyle='#503b31'; c.font='bold 16px Arial'; c.fillText('CAT SCRAP',42,457);
  }
}

function drawTaj(layer, c) {
  if (layer === 0) {
    sky(c, '#70ccff', '#dff7ff', 560);
    circle(c, 1100, 92, 59, '#fff0a7', 0.88);
    cloud(c, 155, 105, .75, .55); cloud(c, 450, 75, .5, .40); cloud(c, 980, 145, .65, .46);
    birds(c, 785, 105, 4, 27);
    c.fillStyle='#cdd7c7'; c.fillRect(0,420,1280,80);
    taj(c,640,420,1.23);
  } else if (layer === 1) {
    c.fillStyle='#d9c39d'; c.fillRect(0,434,1280,15);
    c.fillStyle='#4f8b43'; c.fillRect(0,449,1280,92);
    for (const x of [135,220,305,385,895,975,1055,1140]) {
      c.fillStyle='#3d7940'; rr(c,x-8,350,16,105,8); c.fill();
      c.fillStyle='#5d9b49'; circle(c,x,350,18,'#5d9b49');
    }
    for (const x of [60,430,850,1180]) tree(c,x,485,.75,'#3f8741','#569d48');
    c.fillStyle='#d8c49c';
    c.fillRect(455,448,370,11);
    c.fillRect(455,527,370,12);
    c.fillRect(455,448,10,90);
    c.fillRect(815,448,10,90);
  } else {
    const pool = c.createLinearGradient(0,445,0,540);
    pool.addColorStop(0,'rgba(103,202,218,.78)'); pool.addColorStop(1,'rgba(55,151,179,.80)');
    c.fillStyle=pool; c.fillRect(465,458,350,69);
    for(let y=468;y<525;y+=12) line(c,[[478,y],[802,y]],'rgba(240,254,255,.28)',1.6);
    c.fillStyle='rgba(50,112,45,.65)'; c.fillRect(0,535,1280,65);
    for(let i=0;i<54;i++){
      const x=14+((i*113)%1250), y=545+((i*47)%45);
      circle(c,x,y,3.2,['#ff766d','#ffd75b','#f4f1ed','#d48ce1'][i%4]);
    }
  }
}

function drawOconnell(layer, c) {
  if (layer === 0) {
    sky(c, '#62bce8', '#d9eff4', 560);
    circle(c, 1105, 96, 55, '#ffe7a1', .72);
    cloud(c, 120, 95, .8, .6); cloud(c, 500, 145, .66, .5); cloud(c, 1000, 130, .56, .46);
    birds(c, 260, 140, 3, 34);
    c.fillStyle='#8d8b82'; c.fillRect(0,320,1280,120);
    const fronts=['#d2c1a5','#c9b197','#b9aa99','#d7c4ad','#cbb9a3','#aeb0ad','#d1b69d','#c6c2b9'];
    for(let i=0;i<10;i++){
      const x=i*135-20, h=116+((i*37)%50), y=420-h;
      c.fillStyle=fronts[i%fronts.length]; c.fillRect(x,y,128,h);
      c.fillStyle='#6d6761'; c.fillRect(x,y,128,8);
      windows(c,x+15,y+24,4,3,26,30,12,18,'#8eb0b7','#6d716f');
      c.fillStyle='#5b4a42'; c.fillRect(x+52,390,26,30);
    }
    spire(c,852,393,315);
  } else if (layer === 1) {
    const river=c.createLinearGradient(0,400,0,560);
    river.addColorStop(0,'#67aabd');river.addColorStop(1,'#397e91');
    c.fillStyle=river;c.fillRect(0,397,1280,170);
    for(let y=415;y<555;y+=19)line(c,[[0,y],[1280,y]],'rgba(234,251,255,.18)',1.4);
    dublinBridge(c,76,350,1128,128);
    c.fillStyle='#9c8b79'; c.fillRect(0,522,1280,23);
    for(const x of [105,390,680,960,1180]) lamp(c,x,350,.72,'#ffe7a7');
  } else {
    c.fillStyle='#6e6963'; c.fillRect(0,542,1280,54);
    c.fillStyle='#90877e'; c.fillRect(0,542,1280,8);
    for(let x=0;x<1280;x+=44){
      c.strokeStyle='rgba(48,44,42,.22)';c.lineWidth=1;
      c.strokeRect(x,551,41,21); c.strokeRect(x+20,573,41,21);
    }
    c.fillStyle='#2c373a';rr(c,78,510,86,25,4);c.fill();
    c.fillStyle='#e4d15f';c.fillRect(96,514,50,7);
  }
}

function drawWestminster(layer, c) {
  if (layer === 0) {
    sky(c, '#70bce6', '#deeff4', 560);
    circle(c, 1080, 95, 58, '#fff0ae', .74);
    cloud(c, 140, 120, .84, .62); cloud(c, 510, 94, .56, .42); cloud(c, 910, 146, .65, .43);
    birds(c, 300, 95, 4, 28);
    c.fillStyle='#b99d66'; c.fillRect(70,286,850,134);
    c.fillStyle='#8f7958'; for(let x=92;x<900;x+=45)c.fillRect(x,313,18,34);
    c.fillStyle='#c1a56b'; for(let x=80;x<910;x+=70)poly(c,[[x,286],[x+20,260],[x+40,286]],'#c1a56b','#8c744b',1.5);
    c.fillStyle='#7c6748'; c.fillRect(70,410,850,12);
    elizabethTower(c,1038,420,1.20);
  } else if (layer === 1) {
    const river=c.createLinearGradient(0,410,0,570);
    river.addColorStop(0,'#6aa9b6');river.addColorStop(1,'#467f8a');
    c.fillStyle=river;c.fillRect(0,405,1280,175);
    for(let y=420;y<570;y+=20)line(c,[[0,y],[1280,y]],'rgba(240,253,255,.17)',1.5);
    westminsterBridge(c,40,358,1200,124);
    for(const x of [150,380,620,860,1100]) lamp(c,x,358,.65,'#ffe8a6');
  } else {
    c.fillStyle='#716961';c.fillRect(0,550,1280,48);
    c.fillStyle='#9b9185';c.fillRect(0,550,1280,9);
    for(let x=12;x<1280;x+=70){c.fillStyle='#5c6d65';rr(c,x,525,45,18,5);c.fill();}
    c.fillStyle='#ba2f3d';rr(c,920,503,50,38,6);c.fill();
    c.fillStyle='#f2d7a6';c.fillRect(928,510,34,9);
  }
}

function drawDonabate(layer, c) {
  if (layer === 0) {
    sky(c, '#62c8ef', '#d9f6f6', 500);
    circle(c, 1090, 94, 58, '#fff0a7', .82);
    cloud(c, 115, 118, .9, .68); cloud(c, 490, 80, .58, .52); cloud(c, 970, 140, .65, .50);
    birds(c, 250, 110, 5, 35);
    const sea=c.createLinearGradient(0,278,0,515);
    sea.addColorStop(0,'#55b4c7');sea.addColorStop(.65,'#3096ad');sea.addColorStop(1,'#7bc3ca');
    c.fillStyle=sea;c.fillRect(0,278,1280,260);
    poly(c,[[725,300],[790,275],[855,282],[920,307],[725,307]],'#66836e',null,0);
    c.fillStyle='#829481'; ellipse(c,823,284,75,13,'#829481',.65);
    for(let y=305;y<510;y+=22) line(c,[[0,y],[1280,y]],'rgba(238,254,255,.25)',1.7);
  } else if (layer === 1) {
    const sand=c.createLinearGradient(0,470,0,650);
    sand.addColorStop(0,'#e4c68e');sand.addColorStop(1,'#cda26b');
    c.fillStyle=sand;
    poly(c,[[0,490],[180,450],[355,470],[540,440],[720,472],[900,445],[1110,455],[1280,425],[1280,650],[0,650]],sand,null,0);
    c.fillStyle='#75995d';
    for(let x=0;x<1280;x+=54){
      const y=472+Math.sin(x*.022)*18;
      c.fillRect(x,y,4,22);
      line(c,[[x+2,y],[x-8,y-12]],'#6f9656',2);line(c,[[x+2,y],[x+11,y-14]],'#7da05f',2);
    }
    poly(c,[[1010,446],[1080,390],[1180,400],[1280,355],[1280,460]],'#807c68',null,0);
    martello(c,1160,402,.85);
  } else {
    const wet=c.createLinearGradient(0,510,0,630);
    wet.addColorStop(0,'rgba(94,176,183,.55)');wet.addColorStop(.38,'rgba(217,207,172,.85)');wet.addColorStop(1,'rgba(194,151,102,.95)');
    c.fillStyle=wet;c.fillRect(0,510,1280,125);
    line(c,[[0,520],[190,515],[360,523],[520,516],[700,524],[880,516],[1050,522],[1280,514]],'rgba(255,255,244,.8)',4);
    for(let i=0;i<46;i++){
      const x=14+((i*167)%1245),y=552+((i*53)%65);
      ellipse(c,x,y,5+(i%4)*2,2.2+(i%2),['#8e7561','#c3b08d','#746d68','#d8c4a1'][i%4],.78);
    }
    c.fillStyle='rgba(68,126,139,.45)';
    for(const [x,y,w] of [[170,570,75],[615,555,95],[960,590,62]])ellipse(c,x,y,w,10,'rgba(62,132,145,.34)',1);
  }
}

const drawers = {
  'garden-siege': drawGarden,
  'rooftop-rumble': drawRooftop,
  'junkyard-jamboree': drawJunkyard,
  'taj-mahal': drawTaj,
  'oconnell-bridge-spire': drawOconnell,
  'westminster-bridge-big-ben': drawWestminster,
  'donabate-beach': drawDonabate
};

function makeSourceCanvas(arenaId, layer) {
  const canvas = document.createElement('canvas');
  canvas.width = MW_SOURCE_W;
  canvas.height = MW_SOURCE_H;
  const c = canvas.getContext('2d', { alpha: true });
  c.setTransform(MW_SOURCE_SCALE, 0, 0, MW_SOURCE_SCALE, 0, 0);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  const draw = drawers[arenaId] || drawGarden;
  draw(layer, c);
  return canvas;
}

function textureKey(arenaId, layer) {
  return 'mw06-bg-' + arenaId + '-' + layer;
}

function ensureBackgroundTextures(scene, arenaId) {
  for (let layer = 0; layer < 3; layer += 1) {
    const key = textureKey(arenaId, layer);
    if (scene.textures.exists(key)) continue;
    const source = makeSourceCanvas(arenaId, layer);
    const texture = scene.textures.createCanvas(key, Math.round(MW_VIEW_W * MW_BACKGROUND_SCALE), Math.round(MW_VIEW_H * MW_BACKGROUND_SCALE));
    const c = texture.getContext();
    c.clearRect(0, 0, texture.width, texture.height);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(source, 0, 0, MW_SOURCE_W, MW_SOURCE_H, 0, 0, texture.width, texture.height);
    texture.refresh();
    source.width = 1;
    source.height = 1;
  }
}

function makeBackdrop(scene, arena, menu) {
  ensureBackgroundTextures(scene, arena.id);
  const depths = menu ? [5, 6, 7] : [-30, -24, -9];
  const scales = [1.055, 1.045, 1.035];
  const images = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const image = scene.add.image(640, 360, textureKey(arena.id, layer))
      .setDepth(depths[layer])
      .setDisplaySize(MW_VIEW_W * scales[layer], MW_VIEW_H * scales[layer]);
    images.push(image);
  }
  scene.__mwHdBackdrop = images;
  scene.__mwHdArenaId = arena.id;
  return images;
}

function releaseOtherBackgroundTextures(scene, keepArenaId) {
  for (const arena of ARENAS) {
    if (arena.id === keepArenaId) continue;
    for (let layer = 0; layer < 3; layer += 1) {
      const key = textureKey(arena.id, layer);
      if (scene.textures.exists(key)) scene.textures.remove(key);
    }
  }
}

function updateBackdropTextures(scene, arena) {
  ensureBackgroundTextures(scene, arena.id);
  if (!scene.__mwHdBackdrop || scene.__mwHdBackdrop.some((image) => !image || !image.active)) {
    makeBackdrop(scene, arena, true);
  } else {
    scene.__mwHdBackdrop.forEach((image, layer) => image.setTexture(textureKey(arena.id, layer)));
    scene.__mwHdArenaId = arena.id;
  }
  releaseOtherBackgroundTextures(scene, arena.id);
}

function waterFx(scene) {
  if (!scene.arena || !scene.arena.water) return;
  if (!scene.__mwWaterGraphics || !scene.__mwWaterGraphics.active) {
    scene.__mwWaterGraphics = scene.add.graphics().setDepth(-7);
  }
  const g = scene.__mwWaterGraphics;
  const w = scene.arena.water;
  const t = scene.time.now * w.speed;
  g.clear();
  const color = Number.parseInt(w.color.slice(1), 16);
  for (let band = 0; band < 7; band += 1) {
    const y = w.y + 8 + band * Math.max(9, w.height / 9);
    const alpha = 0.18 + (band % 3) * 0.055;
    g.lineStyle(band % 2 ? 2 : 1.25, 0xe9fbff, alpha);
    g.beginPath();
    const start = w.x + 6;
    const end = w.x + w.width - 6;
    for (let x = start; x <= end; x += 12) {
      const waveY = y + Math.sin(t + x * 0.024 + band * 1.7) * w.amplitude;
      if (x === start) g.moveTo(x, waveY); else g.lineTo(x, waveY);
    }
    g.strokePath();
  }
  g.fillStyle(color, w.kind === 'pool' ? 0.045 : 0.03);
  g.fillRect(w.x, w.y, w.width, w.height);
}

function parallax(scene) {
  if (!scene.__mwHdBackdrop) return;
  let focus = 0;
  try {
    const cat = scene.activeCat ? scene.activeCat() : null;
    if (cat) focus = (cat.x / MW_VIEW_W) - 0.5;
  } catch {}
  const drift = Math.sin(scene.time.now * 0.00013);
  const offsets = [7, 15, 27];
  scene.__mwHdBackdrop.forEach((image, i) => {
    image.x = 640 - focus * offsets[i] + drift * (i + 1) * 0.6;
    image.y = 360 + Math.cos(scene.time.now * 0.00011 + i) * (i * 0.35);
  });
}

function terrainColors(arena) {
  const skin = arena.terrainSkin;
  if (skin === 'rooftop') return { top:'#555963', mid:'#434650', deep:'#2e3038', edge:'#a1a7ae', fleck:'#777d85' };
  if (skin === 'scrap-earth') return { top:'#715748', mid:'#594336', deep:'#3b2d28', edge:'#948657', fleck:'#aa7552' };
  if (skin === 'taj-garden') return { top:'#86654b', mid:'#674936', deep:'#493429', edge:'#54a146', fleck:'#bd9670' };
  if (skin === 'dublin-stone') return { top:'#77706a', mid:'#5f5a55', deep:'#423f3c', edge:'#a6a098', fleck:'#89827a' };
  if (skin === 'london-stone') return { top:'#786f66', mid:'#5d554f', deep:'#433d39', edge:'#a29a90', fleck:'#8a8177' };
  if (skin === 'beach-sand') return { top:'#d7b47d', mid:'#bd925f', deep:'#916a49', edge:'#ead09e', fleck:'#ae835c' };
  return { top:'#76533e', mid:'#5f3e31', deep:'#442d25', edge:'#5fba4f', fleck:'#a67a5b' };
}

function hash2(x, y, seed) {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) >>> 0;
  n = (n ^ (n >>> 13)) * 1274126177 >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}

GameScene.prototype.createTerrainTexture = function() {
  if (this.textures.exists('terrain-live')) this.textures.remove('terrain-live');
  this.terrainTexture = this.textures.createCanvas('terrain-live', WIDTH * MW_TERRAIN_SCALE, HEIGHT * MW_TERRAIN_SCALE);
  this.paintTerrainTexture();
  this.terrainImage = this.add.image(0, 0, 'terrain-live').setOrigin(0, 0).setDepth(1);
  this.terrainImage.setDisplaySize(WIDTH, HEIGHT);
};

GameScene.prototype.paintTerrainTexture = function() {
  const texture = this.terrainTexture;
  const ctx = texture.getContext();
  const scale = MW_TERRAIN_SCALE;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,WIDTH*scale,HEIGHT*scale);
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const { rows, cols, cellSize, data } = this.terrain;
  const colors = terrainColors(this.arena);

  for (let cy = 0; cy < rows; cy += 1) {
    const ratio = cy / rows;
    ctx.fillStyle = ratio < 0.72 ? colors.top : ratio < 0.85 ? colors.mid : colors.deep;
    let start = -1;
    for (let cx = 0; cx <= cols; cx += 1) {
      const solid = cx < cols && data[cy * cols + cx] === 1;
      if (solid && start < 0) start = cx;
      if ((!solid || cx === cols) && start >= 0) {
        ctx.fillRect(start * cellSize, cy * cellSize, (cx - start) * cellSize + .2, cellSize + .35);
        start = -1;
      }
    }
  }

  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = this.arena.terrainSkin === 'rooftop' ? 7 : this.arena.terrainSkin.includes('stone') ? 6 : 8;
  ctx.beginPath();
  let drawing = false;
  for (let x = 0; x < WIDTH; x += 3) {
    const y = surfaceY(this.terrain, x);
    if (y >= HEIGHT) { drawing = false; continue; }
    if (!drawing) { ctx.moveTo(x, y + 1); drawing = true; } else ctx.lineTo(x, y + 1);
  }
  ctx.stroke();

  for (let cy = 0; cy < rows; cy += 2) {
    for (let cx = 0; cx < cols; cx += 2) {
      if (data[cy * cols + cx] !== 1) continue;
      const x = cx * cellSize, y = cy * cellSize;
      const surface = surfaceY(this.terrain, x);
      if (y < surface + 12) continue;
      const h = hash2(cx, cy, this.arena.seed);
      if (h % 31 === 0) {
        ctx.fillStyle = colors.fleck;
        ctx.globalAlpha = .48;
        ctx.fillRect(x, y, 2 + (h % 5), 1 + ((h >>> 5) % 3));
      }
      if (h % 211 === 0) {
        ctx.strokeStyle = 'rgba(34,29,26,.18)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+8,y+5); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;

  const skin = this.arena.terrainSkin;
  if (skin === 'garden-soil' || skin === 'taj-garden') {
    ctx.strokeStyle = skin === 'taj-garden' ? '#4f9f46' : '#56b84b';
    ctx.lineWidth = 1.5;
    for (let x = 4; x < WIDTH; x += 9) {
      const y = surfaceY(this.terrain, x);
      if (y >= HEIGHT) continue;
      const h = hash2(x, 1, this.arena.seed);
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-2-(h%3),y-7-(h%6)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+2,y); ctx.lineTo(x+4+(h%3),y-5-((h>>>4)%5)); ctx.stroke();
    }
  } else if (skin === 'rooftop') {
    ctx.strokeStyle='rgba(190,198,204,.20)';ctx.lineWidth=1.1;
    for(let y=520;y<HEIGHT;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);ctx.stroke();}
    for(let x=0;x<WIDTH;x+=65){ctx.beginPath();ctx.moveTo(x,530);ctx.lineTo(x,HEIGHT);ctx.stroke();}
  } else if (skin.includes('stone')) {
    ctx.strokeStyle='rgba(42,39,36,.22)';ctx.lineWidth=1.2;
    for(let y=515;y<HEIGHT;y+=24){
      const offset=((y/24)&1)*22;
      for(let x=-offset;x<WIDTH;x+=44){ctx.strokeRect(x,y,42,22);}
    }
  } else if (skin === 'scrap-earth') {
    for(let i=0;i<115;i++){
      const x=(i*97+this.arena.seed)%WIDTH;
      const y=surfaceY(this.terrain,x)+18+((i*53)%150);
      if(isSolidWorld(this.terrain,x,y)){
        ctx.fillStyle=['#815d46','#5c7377','#9d6d4e','#4c5052'][i%4];
        ctx.globalAlpha=.35;ctx.fillRect(x,y,7+(i%8),3+(i%4));ctx.globalAlpha=1;
      }
    }
  } else if (skin === 'beach-sand') {
    ctx.strokeStyle='rgba(113,80,52,.13)';ctx.lineWidth=1;
    for(let y=535;y<HEIGHT;y+=19){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WIDTH,y+Math.sin(y*.1)*3);ctx.stroke();}
    for(let i=0;i<130;i++){
      const x=(i*83+19)%WIDTH,y=surfaceY(this.terrain,x)+10+((i*47)%130);
      if(isSolidWorld(this.terrain,x,y)){ctx.fillStyle=i%3?'#c59d6d':'#ead1a1';ctx.globalAlpha=.45;ellipse(ctx,x,y,2+(i%3),1.2,'#c59d6d',.45);}
    }
  }
  ctx.globalAlpha=1;
  ctx.setTransform(1,0,0,1,0,0);
  texture.refresh();
};

const originalInit = GameScene.prototype.init;
GameScene.prototype.init = function(data) {
  originalInit.call(this, data);
  const requested = data && data.arenaId;
  const arena = ARENAS.find((entry) => entry.id === requested);
  if (arena) this.arena = arena;
};

GameScene.prototype.createSky = function() {
  const p = this.arena.palette;
  this.cameras.main.setBackgroundColor(p.skyTop);
  makeBackdrop(this, this.arena, false);
  waterFx(this);
  const labelBack = this.add.rectangle(122, 88, 204, 42, 0x10223e, 0.86).setDepth(90);
  labelBack.setStrokeStyle(2, Number.parseInt(p.accent.slice(1),16), .9);
  this.add.text(122, 88, this.arena.name.toUpperCase(), {
    fontFamily:'Arial Black, Arial', fontSize:'13px', color:'#ffffff', align:'center',
    wordWrap:{width:188}
  }).setOrigin(.5).setDepth(91);
};

const originalGameCreate = GameScene.prototype.create;
GameScene.prototype.create = function() {
  originalGameCreate.call(this);
  globalThis.__MEOW_WARS_ACTIVE_ARENA = this.arena.id;
  this.add.text(1270, 708, 'v' + MW_VERSION + ' · ' + MW_BUILD, {
    fontFamily:'Arial', fontSize:'10px', color:'#d9f3ff',
    backgroundColor:'rgba(11,25,43,.72)', padding:{x:5,y:3}
  }).setOrigin(1,1).setDepth(490).setName('mw-build-marker');
};

const originalGameUpdate = GameScene.prototype.update;
GameScene.prototype.update = function(time, delta) {
  originalGameUpdate.call(this, time, delta);
  parallax(this);
  waterFx(this);
};

function menuBackdrop(scene) {
  const arena = ARENAS[scene.arenaIndex] || ARENAS[0];
  globalThis.__MEOW_WARS_SELECTED_ARENA = arena.id;
  updateBackdropTextures(scene, arena);
  scene.__mwHdBackdrop.forEach((image, i) => {
    image.x = 640 + Math.sin(scene.time.now * .0001 + i) * (i + 1);
    image.y = 360;
  });
}

function destroyOverlay(scene) {
  if (!scene.__mwSettingsObjects) return;
  for (const item of scene.__mwSettingsObjects) item.destroy();
  scene.__mwSettingsObjects = null;
}

function settingsOverlay(scene) {
  if (scene.__mwSettingsObjects) return;
  const list = [];
  const dim = scene.add.rectangle(640,360,1280,720,0x07111f,.76).setInteractive().setDepth(510);
  const panel = scene.add.rectangle(640,350,650,440,0x102a47,.98).setStrokeStyle(4,0x63d8ff,.9).setDepth(511);
  const title = scene.add.text(640,175,'SETTINGS',{
    fontFamily:'Arial Black, Arial',fontSize:'34px',color:'#ffd253',stroke:'#13243d',strokeThickness:5
  }).setOrigin(.5).setDepth(512);
  const details = [
    'MEOW WARS  v' + MW_VERSION,
    'Build  ' + MW_BUILD,
    '',
    'Visual pipeline     4K source → HD layered runtime',
    'Parallax layers     3',
    'Terrain detail      HD destructible skin',
    'Water animation     Scene based',
    '',
    'Controls',
    'A/D move   W/S aim   SPACE charge/fire   Q/E weapons',
    'ESC pause   R rematch   M main menu'
  ];
  const info = scene.add.text(400,225,details.join('\n'),{
    fontFamily:'Arial',fontSize:'17px',color:'#e9f7ff',lineSpacing:9
  }).setDepth(512);
  const closeRect = scene.add.rectangle(640,532,210,48,0xef5b52,1).setStrokeStyle(2,0xffeee0,1).setInteractive({useHandCursor:true}).setDepth(513);
  const closeText = scene.add.text(640,532,'CLOSE',{fontFamily:'Arial Black, Arial',fontSize:'19px',color:'#ffffff'}).setOrigin(.5).setDepth(514);
  closeRect.on('pointerdown',()=>destroyOverlay(scene));
  dim.on('pointerdown',()=>destroyOverlay(scene));
  list.push(dim,panel,title,info,closeRect,closeText);
  scene.__mwSettingsObjects=list;
}

const originalMenuCreate = MenuScene.prototype.create;
MenuScene.prototype.create = function() {
  originalMenuCreate.call(this);
  for (const child of this.children.list) {
    if (typeof child.text === 'string' && child.text.includes('3 BATTLEFIELDS')) {
      child.setText(child.text.replace('3 BATTLEFIELDS','7 BATTLEFIELDS'));
    }
  }
  const settings = this.add.rectangle(1160,45,170,36,0x173d61,.94).setStrokeStyle(2,0x8fe6ff,.8).setInteractive({useHandCursor:true}).setDepth(60);
  this.add.text(1160,45,'SETTINGS',{fontFamily:'Arial Black, Arial',fontSize:'13px',color:'#ffffff'}).setOrigin(.5).setDepth(61);
  settings.on('pointerdown',()=>settingsOverlay(this));
  this.add.text(12,708,'MEOW WARS v' + MW_VERSION,{
    fontFamily:'Arial Black, Arial',fontSize:'10px',color:'#ffffff',
    backgroundColor:'rgba(12,29,47,.72)',padding:{x:5,y:3}
  }).setOrigin(0,1).setDepth(70);
  this.add.text(1268,708,MW_BUILD,{
    fontFamily:'Arial',fontSize:'10px',color:'#d5f5ff',
    backgroundColor:'rgba(12,29,47,.72)',padding:{x:5,y:3}
  }).setOrigin(1,1).setDepth(70);
};

document.documentElement.dataset.meowWarsVersion = MW_VERSION;
document.documentElement.dataset.meowWarsBuild = MW_BUILD;
globalThis.__MEOW_WARS_VERSION = MW_VERSION;
globalThis.__MEOW_WARS_BUILD = MW_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO = () => ({
  version: MW_VERSION,
  build: MW_BUILD,
  sourceArt: MW_SOURCE_W + 'x' + MW_SOURCE_H,
  backgroundTextureScale: MW_BACKGROUND_SCALE,
  terrainTexture: (MW_VIEW_W * MW_TERRAIN_SCALE) + 'x' + (MW_VIEW_H * MW_TERRAIN_SCALE),
  parallaxLayers: 3,
  arenas: ARENAS.map((arena) => arena.id)
});
})();