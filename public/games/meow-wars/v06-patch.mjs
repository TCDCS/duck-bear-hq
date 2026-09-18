export const VERSION = '0.6.0';
export const BUILD = 'mw-v06-env-20260918a';

function replaceOnce(source, needle, replacement, label) {
  const index = source.indexOf(needle);
  if (index < 0) throw new Error('Meow Wars v0.6 patch anchor missing: ' + label);
  if (source.indexOf(needle, index + needle.length) >= 0) {
    throw new Error('Meow Wars v0.6 patch anchor is ambiguous: ' + label);
  }
  return source.slice(0, index) + replacement + source.slice(index + needle.length);
}


function replacePatternOnce(source, pattern, replacement, label) {
  const matches = [...source.matchAll(pattern)];
  if (!matches.length) throw new Error('Meow Wars v0.6 patch anchor missing: ' + label);
  if (matches.length !== 1) throw new Error('Meow Wars v0.6 patch anchor is ambiguous: ' + label);
  const match = matches[0];
  const index = match.index;
  return source.slice(0, index) + replacement + source.slice(index + match[0].length);
}

const ARENA_PATCH = String.raw`
Object.assign(ARENAS[0], { terrainSkin: 'garden-loam', environment: 'garden', waterStyle: null, artPipeline: 'vector-4k' });
Object.assign(ARENAS[1], { terrainSkin: 'roof-gravel', environment: 'rooftop', waterStyle: null, artPipeline: 'vector-4k' });
Object.assign(ARENAS[2], { terrainSkin: 'rust-earth', environment: 'junkyard', waterStyle: null, artPipeline: 'vector-4k' });
ARENAS.push(
    {
        id: 'taj-mahal',
        name: 'Taj Mahal',
        tagline: 'Marble, gardens and one very dangerous reflecting pool.',
        seed: 1632,
        windMultiplier: 0.78,
        terrainProfile: {
            baseRatio: 0.70, waveAAmplitudeRatio: 0.042, waveAFrequency: 0.013,
            waveBAmplitudeRatio: 0.019, waveBFrequency: 0.031, moundAmplitudeRatio: 0.035,
            minSurfaceRatio: 0.52, maxSurfaceRatio: 0.82
        },
        spawnFractions: [0.08, 0.22, 0.37, 0.63, 0.78, 0.92],
        palette: {
            skyTop: '#79c9ef', skyBottom: '#f2d8bc', sun: '#fff1bd',
            terrainTop: '#b58c68', terrainDeep: '#765440', grass: '#5f9b52', accent: '#e8f4f4'
        },
        terrainSkin: 'garden-sandstone', environment: 'taj', waterStyle: 'reflecting-pool', artPipeline: 'vector-4k'
    },
    {
        id: 'oconnell-bridge-spire',
        name: 'O’Connell Bridge + Spire',
        tagline: 'The Liffey, the Spire and absolutely no respect for rush hour.',
        seed: 1916,
        windMultiplier: 1.18,
        terrainProfile: {
            baseRatio: 0.66, waveAAmplitudeRatio: 0.038, waveAFrequency: 0.012,
            waveBAmplitudeRatio: 0.024, waveBFrequency: 0.034, moundAmplitudeRatio: 0.012,
            minSurfaceRatio: 0.49, maxSurfaceRatio: 0.80
        },
        spawnFractions: [0.07, 0.21, 0.39, 0.61, 0.79, 0.94],
        palette: {
            skyTop: '#73b8dc', skyBottom: '#cdd9dd', sun: '#fff1c2',
            terrainTop: '#77736b', terrainDeep: '#514d49', grass: '#698257', accent: '#84d5ef'
        },
        terrainSkin: 'dublin-stone', environment: 'dublin', waterStyle: 'liffey', artPipeline: 'vector-4k'
    },
    {
        id: 'westminster-bridge-big-ben',
        name: 'Westminster Bridge + Big Ben',
        tagline: 'Clock towers, Thames spray and very poor parliamentary behaviour.',
        seed: 1859,
        windMultiplier: 1.12,
        terrainProfile: {
            baseRatio: 0.655, waveAAmplitudeRatio: 0.034, waveAFrequency: 0.011,
            waveBAmplitudeRatio: 0.021, waveBFrequency: 0.029, moundAmplitudeRatio: 0.008,
            minSurfaceRatio: 0.50, maxSurfaceRatio: 0.79
        },
        spawnFractions: [0.07, 0.23, 0.40, 0.60, 0.77, 0.93],
        palette: {
            skyTop: '#78b7d6', skyBottom: '#d9d5c8', sun: '#fff0b8',
            terrainTop: '#746e64', terrainDeep: '#4c4945', grass: '#72845f', accent: '#d7b56d'
        },
        terrainSkin: 'london-stone', environment: 'westminster', waterStyle: 'thames', artPipeline: 'vector-4k'
    },
    {
        id: 'donabate-beach',
        name: 'Donabate Beach',
        tagline: 'Sea air, dunes and sand in absolutely everything.',
        seed: 1975,
        windMultiplier: 1.42,
        terrainProfile: {
            baseRatio: 0.72, waveAAmplitudeRatio: 0.026, waveAFrequency: 0.010,
            waveBAmplitudeRatio: 0.017, waveBFrequency: 0.027, moundAmplitudeRatio: 0.025,
            minSurfaceRatio: 0.56, maxSurfaceRatio: 0.83
        },
        spawnFractions: [0.07, 0.22, 0.38, 0.62, 0.79, 0.94],
        palette: {
            skyTop: '#64bce8', skyBottom: '#ccebf1', sun: '#fff3b5',
            terrainTop: '#d5b676', terrainDeep: '#97754c', grass: '#8ca56a', accent: '#58c9d7'
        },
        terrainSkin: 'beach-sand', environment: 'donabate', waterStyle: 'irish-sea', artPipeline: 'vector-4k'
    }
);
`;

const RUNTIME_PATCH = String.raw`
const __mw_v06_version = '0.6.0';
const __mw_v06_build = 'mw-v06-env-20260918a';

function v06Hex(value) {
    return Number.parseInt(String(value).replace('#', ''), 16);
}
function v06Rgb(value) {
    const n = v06Hex(value);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function v06Mix(a, b, t) {
    const aa = v06Rgb(a), bb = v06Rgb(b);
    const r = Math.round(aa[0] + (bb[0] - aa[0]) * t);
    const g = Math.round(aa[1] + (bb[1] - aa[1]) * t);
    const bl = Math.round(aa[2] + (bb[2] - aa[2]) * t);
    return (r << 16) | (g << 8) | bl;
}
function v06Layer(scene, depth, factor) {
    const g = scene.add.graphics().setDepth(depth);
    g.__mwParallaxFactor = factor;
    scene.v06ParallaxLayers.push(g);
    return g;
}
function v06Cloud(g, x, y, s, alpha = 0.7) {
    g.fillStyle(0xffffff, alpha);
    g.fillEllipse(x, y, 120 * s, 30 * s);
    g.fillCircle(x - 33 * s, y - 12 * s, 24 * s);
    g.fillCircle(x + 5 * s, y - 19 * s, 32 * s);
    g.fillCircle(x + 39 * s, y - 8 * s, 22 * s);
}
function v06Tree(g, x, y, s, leaf = 0x458c48) {
    g.fillStyle(0x745037, 1);
    g.fillRoundedRect(x - 7 * s, y - 61 * s, 14 * s, 64 * s, 4 * s);
    g.fillStyle(leaf, 1);
    g.fillCircle(x - 20 * s, y - 68 * s, 24 * s);
    g.fillCircle(x + 20 * s, y - 70 * s, 26 * s);
    g.fillStyle(0x6caf55, 1);
    g.fillCircle(x, y - 88 * s, 29 * s);
}
function v06House(g, x, y, s, body, roof) {
    g.fillStyle(body, 0.96);
    g.fillRect(x - 38 * s, y - 70 * s, 76 * s, 72 * s);
    g.fillStyle(roof, 1);
    g.fillTriangle(x - 48 * s, y - 70 * s, x, y - 104 * s, x + 48 * s, y - 70 * s);
    g.fillStyle(0x8cc9df, 0.82);
    g.fillRect(x - 24 * s, y - 48 * s, 14 * s, 19 * s);
    g.fillRect(x + 10 * s, y - 48 * s, 14 * s, 19 * s);
    g.fillStyle(0x694b3e, 1);
    g.fillRect(x - 7 * s, y - 27 * s, 14 * s, 29 * s);
}
function v06CityBlock(g, x, baseY, w, h, color, roof = 0x555d66) {
    g.fillStyle(color, 0.92);
    g.fillRect(x, baseY - h, w, h);
    g.fillStyle(roof, 0.95);
    g.fillRect(x - 3, baseY - h - 7, w + 6, 8);
    g.fillStyle(0xf4ce73, 0.55);
    const cols = Math.max(2, Math.floor(w / 28));
    const rows = Math.max(2, Math.floor(h / 31));
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            g.fillRect(x + 10 + col * 27, baseY - h + 17 + row * 28, 8, 11);
        }
    }
}
function v06Bridge(g, y, color, archColor, count = 7) {
    g.fillStyle(color, 1);
    g.fillRect(-40, y - 18, 1360, 42);
    g.fillStyle(archColor, 1);
    const step = 1280 / count;
    for (let i = 0; i < count; i += 1) {
        const x = i * step + step / 2;
        g.fillEllipse(x, y + 27, step * 0.72, 62);
    }
    g.lineStyle(3, 0xe6dfd0, 0.6);
    g.beginPath();
    g.moveTo(0, y - 15);
    g.lineTo(1280, y - 15);
    g.strokePath();
}
function v06WaterBase(g, y, color) {
    g.fillStyle(color, 0.92);
    g.fillRect(-30, y, 1340, 210);
    g.fillStyle(0xffffff, 0.12);
    for (let x = -20; x < 1300; x += 78) g.fillRect(x, y + 18 + (x % 3) * 5, 45, 2);
}
function v06Taj(g, x, y, s) {
    const marble = 0xf3efe6, shadow = 0xcfc9bd, dark = 0x858174;
    g.fillStyle(shadow, 0.9);
    g.fillRect(x - 190 * s, y - 92 * s, 380 * s, 94 * s);
    g.fillStyle(marble, 1);
    g.fillRect(x - 160 * s, y - 132 * s, 320 * s, 132 * s);
    g.fillStyle(dark, 0.45);
    for (const dx of [-112, -66, 66, 112]) g.fillRoundedRect(x + dx * s - 12 * s, y - 86 * s, 24 * s, 86 * s, 10 * s);
    g.fillStyle(marble, 1);
    g.fillCircle(x, y - 176 * s, 68 * s);
    g.fillRect(x - 68 * s, y - 176 * s, 136 * s, 58 * s);
    g.fillStyle(0xd8d2c7, 1);
    g.fillTriangle(x - 76 * s, y - 171 * s, x, y - 235 * s, x + 76 * s, y - 171 * s);
    g.fillStyle(marble, 1);
    g.fillCircle(x, y - 182 * s, 62 * s);
    for (const dx of [-196, 196]) {
        g.fillRect(x + dx * s - 11 * s, y - 191 * s, 22 * s, 191 * s);
        g.fillCircle(x + dx * s, y - 196 * s, 17 * s);
        g.fillTriangle(x + dx * s - 14 * s, y - 202 * s, x + dx * s, y - 229 * s, x + dx * s + 14 * s, y - 202 * s);
    }
    g.fillStyle(dark, 0.35);
    g.fillRoundedRect(x - 20 * s, y - 82 * s, 40 * s, 82 * s, 18 * s);
}
function v06Spire(g, x, y, s) {
    g.lineStyle(7 * s, 0xdbe5e8, 0.9);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 265 * s); g.strokePath();
    g.lineStyle(2 * s, 0xffffff, 0.9);
    g.beginPath(); g.moveTo(x + 1, y); g.lineTo(x + 1, y - 265 * s); g.strokePath();
}
function v06BigBen(g, x, y, s) {
    const stone = 0xc3a86e, dark = 0x6f654f, roof = 0x45535c;
    g.fillStyle(stone, 1);
    g.fillRect(x - 34 * s, y - 208 * s, 68 * s, 208 * s);
    g.fillStyle(dark, 1);
    g.fillRect(x - 41 * s, y - 216 * s, 82 * s, 18 * s);
    g.fillStyle(stone, 1);
    g.fillRect(x - 44 * s, y - 267 * s, 88 * s, 55 * s);
    g.fillStyle(0xf3e6c5, 1);
    g.fillCircle(x, y - 239 * s, 23 * s);
    g.lineStyle(3 * s, 0x303336, 1);
    g.strokeCircle(x, y - 239 * s, 23 * s);
    g.beginPath(); g.moveTo(x, y - 239 * s); g.lineTo(x + 1 * s, y - 253 * s); g.moveTo(x, y - 239 * s); g.lineTo(x + 12 * s, y - 233 * s); g.strokePath();
    g.fillStyle(roof, 1);
    g.fillTriangle(x - 46 * s, y - 267 * s, x, y - 333 * s, x + 46 * s, y - 267 * s);
    g.fillRect(x - 5 * s, y - 347 * s, 10 * s, 24 * s);
}
function v06DrawGarden(scene, far, mid, near) {
    for (const [x, y, s] of [[90,110,.9],[360,145,.65],[690,92,.95],[1010,130,.72],[1210,82,.62]]) v06Cloud(far,x,y,s);
    const colors = [0xf7c778,0xed9f8b,0xc7d3ef,0xe4c49a,0xd8b8df];
    for (let i=0;i<8;i+=1) v06House(far,45+i*170,410+(i%2)*18,.95,colors[i%colors.length],i%2?0x6d7891:0xbd6257);
    for (const [x,s] of [[110,1.15],[320,.82],[540,1.02],[815,.9],[1060,1.1],[1220,.85]]) v06Tree(mid,x,470,s);
    near.fillStyle(0xf4ead1,1);
    for (let x=0;x<1280;x+=36) { near.fillRect(x,476,7,63); near.fillTriangle(x,476,x+3.5,467,x+7,476); }
    near.fillRect(0,498,1280,7); near.fillRect(0,526,1280,7);
    near.fillStyle(0x4d9e48,.95);
    for (let x=15;x<1280;x+=47) near.fillCircle(x,520+(x%4)*3,14+(x%3)*4);
    near.fillStyle(0xffd34d,1);
    for (let x=30;x<1260;x+=73) near.fillCircle(x,519+(x%5)*4,3);
}
function v06DrawRooftop(scene, far, mid, near) {
    for (const [x,y,s] of [[120,100,.6],[520,132,.7],[1010,88,.62]]) v06Cloud(far,x,y,s,.28);
    const colors=[0x485677,0x576784,0x394866,0x66718b,0x4a5270];
    for(let i=0;i<12;i+=1){const w=96+(i%3)*18,h=125+(i%5)*26;v06CityBlock(far,i*112-25,480,w,h,colors[i%colors.length]);}
    mid.fillStyle(0x6f7c8b,1); mid.fillEllipse(700,282,108,52); mid.fillRect(646,281,108,42);
    mid.lineStyle(7,0x4f5968,1); mid.beginPath(); mid.moveTo(660,323);mid.lineTo(646,382);mid.moveTo(740,323);mid.lineTo(754,382);mid.strokePath();
    for(const x of [170,400,930,1110]){near.fillStyle(0x8c5549,1);near.fillRect(x,402,38,90);near.fillStyle(0x563d3a,1);near.fillRect(x-5,396,48,12);}
    near.lineStyle(4,0x59616f,1);near.beginPath();near.moveTo(1040,430);near.lineTo(1040,345);near.moveTo(1000,373);near.lineTo(1084,360);near.strokePath();
    near.lineStyle(2,0x3a4451,.9);near.beginPath();near.moveTo(475,455);near.lineTo(850,435);near.strokePath();
    for(let i=0;i<10;i+=1){near.fillStyle(i%2?0xffd75a:0xff8774,1);near.fillCircle(500+i*37,452-i*2,4);}
}
function v06DrawJunkyard(scene, far, mid, near) {
    for (const [x,y,s] of [[120,105,.65],[535,92,.55],[1050,118,.75]]) v06Cloud(far,x,y,s,.42);
    for(const x of [190,1040]){far.lineStyle(8,0xc8962f,1);far.beginPath();far.moveTo(x,410);far.lineTo(x,235);far.lineTo(x+145,235);far.strokePath();far.lineStyle(3,0x4b4a45,1);far.beginPath();far.moveTo(x+115,238);far.lineTo(x+115,325);far.strokePath();}
    for(let i=0;i<5;i+=1){const x=95+i*265;mid.fillStyle(i%2?0xa06a49:0x84634b,1);mid.fillTriangle(x-75,492,x-12,420,x+60,492);mid.fillStyle(0x59777d,1);mid.fillRect(x-42,455,72,12);mid.fillCircle(x+27,472,17);}
    for(const x of [210,760,1090]){near.fillStyle(0xc75f4d,1);near.fillRoundedRect(x-48,466,96,29,9);near.fillStyle(0x2f3940,1);near.fillCircle(x-30,492,14);near.fillCircle(x+31,492,14);}
    for(let i=0;i<9;i+=1){const x=55+i*145;near.fillStyle(0x323842,1);near.fillCircle(x,515,20);near.fillStyle(0x12161b,1);near.fillCircle(x,515,9);}
}
function v06DrawTaj(scene, far, mid, near) {
    for (const [x,y,s] of [[105,100,.65],[370,128,.5],[980,95,.58],[1190,135,.45]]) v06Cloud(far,x,y,s,.5);
    far.fillStyle(0x6d9562,.6); for(let x=0;x<1280;x+=45) far.fillCircle(x,410+(x%3)*4,35);
    v06Taj(mid,640,455,1.08);
    for(const x of [80,190,1085,1200]) v06Tree(mid,x,470,.86,0x397f48);
    v06WaterBase(near,492,0x62afbf);
    near.fillStyle(0xe3c9a4,1); near.fillRect(0,478,1280,18);
    near.fillStyle(0x356c43,1); for(let x=20;x<1260;x+=58) near.fillCircle(x,480,10);
    scene.v06Water = { y: 493, color: 0xd9f7f7, amplitude: 2.4, speed: 0.0022, spacing: 48, depth: -7 };
}
function v06DrawDublin(scene, far, mid, near) {
    for (const [x,y,s] of [[100,95,.65],[450,120,.52],[890,88,.58],[1180,130,.5]]) v06Cloud(far,x,y,s,.48);
    const colors=[0xb88f72,0xc5a27f,0x9f826d,0xc0ad98,0x967b69,0xbba58f];
    for(let i=0;i<14;i+=1){const w=88+(i%2)*8,h=112+(i%4)*17;v06CityBlock(far,i*94-18,420,w,h,colors[i%colors.length],0x54575b);}
    v06Spire(mid,640,426,1.02);
    v06WaterBase(mid,448,0x456f7f);
    v06Bridge(near,464,0xa9a39a,0x456f7f,7);
    near.fillStyle(0x66625b,1); near.fillRect(0,502,1280,24);
    scene.v06Water = { y: 446, color: 0xb7d9df, amplitude: 3, speed: 0.0026, spacing: 56, depth: -8 };
}
function v06DrawWestminster(scene, far, mid, near) {
    for (const [x,y,s] of [[110,100,.65],[510,128,.48],[940,91,.58],[1200,133,.46]]) v06Cloud(far,x,y,s,.45);
    far.fillStyle(0xbfa86e,1); far.fillRect(110,315,690,130);
    far.fillStyle(0x8b7954,1); for(let x=130;x<780;x+=52){far.fillRect(x,337,23,73);far.fillTriangle(x-4,337,x+11,310,x+27,337);}
    v06BigBen(mid,915,449,1.02);
    v06WaterBase(mid,458,0x557f8a);
    v06Bridge(near,478,0x9eb8a6,0x557f8a,8);
    near.fillStyle(0x5e625d,1); near.fillRect(0,517,1280,20);
    scene.v06Water = { y: 456, color: 0xc3e0dd, amplitude: 2.7, speed: 0.0024, spacing: 53, depth: -8 };
}
function v06DrawDonabate(scene, far, mid, near) {
    for (const [x,y,s] of [[120,90,.7],[490,125,.5],[860,78,.6],[1160,120,.52]]) v06Cloud(far,x,y,s,.6);
    far.fillStyle(0x719aa2,.55); far.fillEllipse(1010,365,420,92);
    v06WaterBase(mid,355,0x4d9fc0);
    mid.fillStyle(0xf7f1d0,.7); for(let x=-20;x<1300;x+=95) mid.fillRect(x,410+(x%4)*3,58,2);
    near.fillStyle(0xd5bb7a,1); near.fillRect(-20,470,1320,120);
    near.fillStyle(0x9bac68,1);
    for(let x=0;x<1280;x+=38){const h=12+(x%5)*3;near.fillTriangle(x,487,x+8,487-h,x+16,487);near.fillTriangle(x+14,488,x+24,488-h*.8,x+31,488);}
    near.fillStyle(0xf4ddb1,.8); for(let x=12;x<1270;x+=67) near.fillEllipse(x,526+(x%4)*5,22,5);
    scene.v06Water = { y: 356, color: 0xd9f4f5, amplitude: 3.5, speed: 0.0030, spacing: 44, depth: -8 };
}
function v06DrawEnvironment(scene, far, mid, near) {
    const id = scene.arena.id;
    if (id === 'garden-siege') return v06DrawGarden(scene,far,mid,near);
    if (id === 'rooftop-rumble') return v06DrawRooftop(scene,far,mid,near);
    if (id === 'junkyard-jamboree') return v06DrawJunkyard(scene,far,mid,near);
    if (id === 'taj-mahal') return v06DrawTaj(scene,far,mid,near);
    if (id === 'oconnell-bridge-spire') return v06DrawDublin(scene,far,mid,near);
    if (id === 'westminster-bridge-big-ben') return v06DrawWestminster(scene,far,mid,near);
    return v06DrawDonabate(scene,far,mid,near);
}
const __mwV05CreateSky = GameScene.prototype.createSky;
GameScene.prototype.createSky = function() {
    const p = this.arena.palette;
    this.v06ParallaxLayers = [];
    this.v06Water = null;
    this.v06WaterGraphics = null;
    this.cameras.main.setBackgroundColor(p.skyTop);
    for (let i=0;i<12;i+=1) {
        const t=i/11;
        this.add.rectangle(WIDTH/2,(i+.5)*(HEIGHT/12),WIDTH+4,HEIGHT/12+2,v06Mix(p.skyTop,p.skyBottom,t),1).setDepth(-40);
    }
    this.add.circle(1090,105,this.arena.id==='rooftop-rumble'?48:59,v06Hex(p.sun),0.92).setDepth(-36);
    const far=v06Layer(this,-30,0.10);
    const mid=v06Layer(this,-20,0.28);
    const near=v06Layer(this,-6,0.62);
    v06DrawEnvironment(this,far,mid,near);
    const labelBack=this.add.rectangle(132,88,224,42,0x10223e,0.84).setDepth(90);
    labelBack.setStrokeStyle?.(2,v06Hex(p.accent),0.9);
    this.add.text(132,88,this.arena.name.toUpperCase(),{fontFamily:'Arial Black, Arial',fontSize:'13px',color:'#ffffff'}).setOrigin(0.5).setDepth(91);
    this.add.text(1264,12,__mw_v06_version+' • '+__mw_v06_build,{fontFamily:'Arial',fontSize:'11px',color:'#f4fbff',backgroundColor:'#10223ecc',padding:{x:6,y:3}}).setOrigin(1,0).setDepth(92);
};
GameScene.prototype.updateEnvironmentV06 = function(time) {
    let focus=WIDTH/2;
    try { const cat=this.activeCat?.(); if(cat && Number.isFinite(cat.x)) focus=cat.x; } catch {}
    const n=(focus/WIDTH)-0.5;
    for(let i=0;i<(this.v06ParallaxLayers?.length||0);i+=1){
        const layer=this.v06ParallaxLayers[i];
        const factor=layer.__mwParallaxFactor||0;
        layer.x=-n*54*factor+Math.sin(time*0.00018+i)*3.5*factor;
    }
    if(!this.v06Water) return;
    if(!this.v06WaterGraphics) this.v06WaterGraphics=this.add.graphics().setDepth(this.v06Water.depth);
    const g=this.v06WaterGraphics,w=this.v06Water;
    g.clear(); g.lineStyle(2,v06Hex('#'+w.color.toString(16).padStart(6,'0')),0.45);
    for(let row=0;row<4;row+=1){
        const y=w.y+15+row*22;
        g.beginPath();
        for(let x=-20;x<=1300;x+=16){
            const yy=y+Math.sin(x*0.027+time*w.speed+row)*w.amplitude;
            if(x<0)g.moveTo(x,yy);else g.lineTo(x,yy);
        }
        g.strokePath();
    }
};
const v06BaseUpdate=GameScene.prototype.update;
GameScene.prototype.update=function(time,delta){
    v06BaseUpdate.call(this,time,delta);
    this.updateEnvironmentV06(time);
};
const v06BasePaintTerrain=GameScene.prototype.paintTerrainTexture;
GameScene.prototype.paintTerrainTexture=function(){
    v06BasePaintTerrain.call(this);
    const texture=this.terrainTexture,ctx=texture.getContext();
    const skin=this.arena.terrainSkin||'earth';
    const {rows,cols,cellSize,data}=this.terrain;
    if(skin==='beach-sand'){
        ctx.fillStyle='#f1d594';
        for(let cy=0;cy<rows;cy+=1)for(let cx=0;cx<cols;cx+=1)if(data[cy*cols+cx]===1&&((cx*19+cy*13+this.arena.seed)%97===0))ctx.fillRect(cx*cellSize,cy*cellSize,6,2);
    }else if(skin.includes('stone')||skin.includes('roof')){
        ctx.strokeStyle=skin.includes('roof')?'#4d5361':'#918a7f';ctx.lineWidth=1;
        for(let x=0;x<WIDTH;x+=44){const y=surfaceY(this.terrain,x)+12;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+25,y+2);ctx.stroke();}
    }else{
        ctx.fillStyle=skin==='rust-earth'?'#b27a52':'#8b664b';
        for(let cy=0;cy<rows;cy+=1)for(let cx=0;cx<cols;cx+=1)if(data[cy*cols+cx]===1&&((cx*23+cy*17+this.arena.seed)%131===0))ctx.fillRect(cx*cellSize,cy*cellSize,4,3);
    }
    texture.refresh();
};
`;


const ART_PASS_PATCH = String.raw`
function v06HdTrackObject(scene, obj, factor) {
    if (!obj || !Number.isFinite(obj.x)) return;
    obj.__mwParallaxBaseX = obj.x;
    obj.__mwParallaxFactor = factor;
    scene.v06ParallaxObjects.push(obj);
}
function v06HdTrackLegacy(scene) {
    for (const obj of scene.children?.list || []) {
        if (obj.depth === -27) v06HdTrackObject(scene, obj, 0.10);
        else if (obj.depth === -21) v06HdTrackObject(scene, obj, 0.28);
        else if (obj.depth === -4) v06HdTrackObject(scene, obj, 0.58);
        else if (obj.depth === -28 && Number.isFinite(obj.radius)) v06HdTrackObject(scene, obj, 0.035);
    }
}
function v06HdGardenExtras(scene) {
    const far=v06Layer(scene,-28.5,0.06), mid=v06Layer(scene,-20,0.23), near=v06Layer(scene,-3.5,0.56);
    far.fillStyle(0x4f8a65,0.46);
    far.fillEllipse(170,474,560,155); far.fillEllipse(635,468,700,170); far.fillEllipse(1120,478,560,145);
    far.fillStyle(0x397552,0.28);
    far.fillEllipse(390,493,680,120); far.fillEllipse(980,495,720,130);
    mid.fillStyle(0xf3ead4,0.98);
    for(let x=710;x<1260;x+=37){mid.fillRect(x,474,7,65);mid.fillTriangle(x,474,x+3.5,464,x+7,474);}
    mid.fillRect(700,495,570,7); mid.fillRect(700,526,570,7);
    mid.fillStyle(0x327b42,0.96);
    for(let x=725;x<1260;x+=50){mid.fillCircle(x,520,16);mid.fillCircle(x+15,524,12);}
    const petals=[0xff6f89,0xffd45a,0x85cfff,0xffffff];
    for(let i=0;i<34;i+=1){const x=20+((i*83)%1230),y=505+((i*31)%45);near.lineStyle(2,0x2f7a3d,.9);near.beginPath();near.moveTo(x,y+8);near.lineTo(x,y-2);near.strokePath();near.fillStyle(petals[i%petals.length],1);near.fillCircle(x-3,y-4,3);near.fillCircle(x+3,y-4,3);near.fillCircle(x,y-8,3);}
}
function v06HdRooftopExtras(scene) {
    const far=v06Layer(scene,-28.5,0.07), mid=v06Layer(scene,-20,0.25), near=v06Layer(scene,-3.5,0.60);
    far.fillStyle(0xffffff,0.34);
    for(let i=0;i<34;i+=1){const x=(i*149)%1280,y=150+((i*83)%205);far.fillCircle(x,y,i%5===0?2:1);}
    const blocks=[0x1f2946,0x27314f,0x202c4b];
    for(let i=0;i<18;i+=1){const w=70+(i%4)*18,h=85+(i%6)*28,x=i*82-40;far.fillStyle(blocks[i%blocks.length],.72);far.fillRect(x,505-h,w,h);far.fillStyle(0xe9c66d,.35);for(let yy=505-h+18;yy<490;yy+=27)for(let xx=x+12;xx<x+w-8;xx+=25)far.fillRect(xx,yy,6,9);}
    mid.fillStyle(0x66717f,1);mid.fillRoundedRect(175,428,115,54,8);mid.fillStyle(0x303b49,1);mid.fillRect(188,440,90,8);mid.fillRect(188,457,90,8);
    mid.lineStyle(5,0x596574,1);mid.beginPath();mid.moveTo(1018,472);mid.lineTo(1018,387);mid.moveTo(977,416);mid.lineTo(1062,398);mid.strokePath();
    mid.lineStyle(3,0x758290,1);mid.beginPath();mid.moveTo(810,455);mid.lineTo(850,420);mid.lineTo(891,455);mid.strokePath();mid.fillStyle(0x7d8997,1);mid.fillEllipse(850,420,72,24);
    near.lineStyle(3,0x505c6b,.95);near.beginPath();near.moveTo(70,501);near.lineTo(420,488);near.moveTo(860,490);near.lineTo(1235,475);near.strokePath();
    for(let i=0;i<16;i+=1){near.fillStyle(i%3===0?0xffcc55:0xf27d61,1);near.fillCircle(95+i*72,500-(i%5)*3,3.5);}
}
function v06HdJunkyardExtras(scene) {
    const far=v06Layer(scene,-28.5,0.07), mid=v06Layer(scene,-20,0.25), near=v06Layer(scene,-3.5,0.60);
    far.fillStyle(0x765c48,.52);far.fillRect(0,430,1280,95);
    for(const x of [130,430,915,1160]){far.fillStyle(0x514b45,.68);far.fillRect(x,280,36,160);far.fillStyle(0x3b3b39,.58);far.fillEllipse(x+18,270,65,22);}
    far.lineStyle(9,0xb07c2f,.9);for(const x of [260,1010]){far.beginPath();far.moveTo(x,450);far.lineTo(x,260);far.lineTo(x+165,260);far.strokePath();far.lineStyle(3,0x393d40,.85);far.beginPath();far.moveTo(x+130,262);far.lineTo(x+130,365);far.strokePath();far.lineStyle(9,0xb07c2f,.9);}
    mid.lineStyle(2,0x59605f,.7);for(let x=0;x<1280;x+=42){mid.beginPath();mid.moveTo(x,410);mid.lineTo(x+84,520);mid.moveTo(x+84,410);mid.lineTo(x,520);mid.strokePath();}mid.lineStyle(5,0x565956,.8);mid.beginPath();mid.moveTo(0,418);mid.lineTo(1280,418);mid.moveTo(0,515);mid.lineTo(1280,515);mid.strokePath();
    for(const [x,c] of [[150,0xb95e4f],[540,0x557f8d],[950,0xd09a45]]){near.fillStyle(c,.95);near.fillRoundedRect(x,468,118,30,9);near.fillStyle(0x2a3034,1);near.fillCircle(x+25,499,17);near.fillCircle(x+93,499,17);}
    for(const x of [340,780,1180]){near.fillStyle(0x282d31,1);near.fillCircle(x,505,24);near.fillStyle(0x101417,1);near.fillCircle(x,505,11);near.fillStyle(0x3d4348,1);near.fillCircle(x+25,510,18);near.fillStyle(0x101417,1);near.fillCircle(x+25,510,8);}
}
function v06HdTajMonument(g,x,y,s){
    const marble=0xf7f4ea,shade=0xd9d5cb,line=0xb8b3a8,arch=0x6f7771;
    g.fillStyle(0xc7bda9,.75);g.fillRect(x-275*s,y-14*s,550*s,18*s);
    g.fillStyle(marble,1);g.fillRect(x-195*s,y-137*s,390*s,137*s);g.fillRect(x-245*s,y-106*s,50*s,106*s);g.fillRect(x+195*s,y-106*s,50*s,106*s);
    g.fillStyle(shade,1);g.fillRect(x-203*s,y-145*s,406*s,12*s);
    g.fillStyle(arch,.54);g.fillRoundedRect(x-30*s,y-88*s,60*s,88*s,28*s);
    for(const dx of [-135,-88,88,135]){g.fillStyle(arch,.38);g.fillRoundedRect(x+dx*s-13*s,y-69*s,26*s,69*s,12*s);}
    g.lineStyle(2*s,line,.75);for(const dx of [-166,-55,55,166]){g.beginPath();g.moveTo(x+dx*s,y-130*s);g.lineTo(x+dx*s,y-4*s);g.strokePath();}
    g.fillStyle(marble,1);g.fillRect(x-73*s,y-169*s,146*s,42*s);g.fillEllipse(x,y-187*s,150*s,110*s);g.fillTriangle(x-70*s,y-192*s,x,y-245*s,x+70*s,y-192*s);
    g.lineStyle(3*s,0xc6b686,.9);g.beginPath();g.moveTo(x,y-244*s);g.lineTo(x,y-266*s);g.strokePath();g.fillStyle(0xc6b686,1);g.fillCircle(x,y-269*s,4*s);
    for(const dx of [-116,116]){g.fillStyle(marble,1);g.fillRect(x+dx*s-32*s,y-143*s,64*s,50*s);g.fillEllipse(x+dx*s,y-151*s,62*s,48*s);g.fillTriangle(x+dx*s-28*s,y-154*s,x+dx*s,y-180*s,x+dx*s+28*s,y-154*s);}
    const towers=[[-252,.84,190],[-213,.70,166],[213,.70,166],[252,.84,190]];
    for(const [dx,ss,h] of towers){g.fillStyle(dx===-213||dx===213?0xe7e2d8:marble,1);g.fillRect(x+dx*s-10*s*ss,y-h*s,20*s*ss,h*s);g.fillStyle(shade,1);for(let k=1;k<4;k+=1)g.fillRect(x+dx*s-14*s*ss,y-(h-k*42)*s,28*s*ss,6*s);g.fillStyle(marble,1);g.fillEllipse(x+dx*s,y-h*s,34*s*ss,21*s*ss);g.fillTriangle(x+dx*s-13*s*ss,y-(h+4)*s,x+dx*s,y-(h+28)*s,x+dx*s+13*s*ss,y-(h+4)*s);}
}
function v06HdDrawTaj(scene,far,mid,near){
    for(const [x,y,s] of [[105,98,.62],[360,132,.46],[940,92,.56],[1180,126,.44]])v06Cloud(far,x,y,s,.56);
    far.fillStyle(0x4a7d4b,.48);for(let x=0;x<1280;x+=52)far.fillCircle(x,425+(x%4)*4,34);
    v06HdTajMonument(mid,640,452,.94);
    mid.fillStyle(0x2f7040,.95);for(const x of [70,150,230,1050,1130,1210]){mid.fillTriangle(x-14,490,x,430,x+14,490);mid.fillRect(x-5,486,10,25);}
    near.fillStyle(0xd7c4a2,1);near.fillRect(295,456,690,18);near.fillRect(295,563,690,15);
    near.fillStyle(0x4ca6b9,.92);near.fillRoundedRect(340,474,600,90,10);
    near.fillStyle(0xeaf7f2,.25);for(let y=489;y<558;y+=18)near.fillRect(370,y,540,3);
    near.fillStyle(0x3c7d46,1);for(const x of [315,965])for(let y=482;y<556;y+=24)near.fillCircle(x,y,10);
    scene.v06Water={y:482,color:0xd9f7f7,amplitude:1.7,speed:.0022,depth:-5,x0:350,x1:930};
}
function v06HdCityFacade(g,x,base,w,h,body,roof){
    g.fillStyle(body,.96);g.fillRect(x,base-h,w,h);g.fillStyle(roof,1);g.fillRect(x-3,base-h-8,w+6,9);
    g.fillStyle(0xe9c36d,.52);for(let yy=base-h+22;yy<base-22;yy+=28)for(let xx=x+12;xx<x+w-10;xx+=24)g.fillRect(xx,yy,8,11);
    g.fillStyle(0x3e4449,.9);g.fillRect(x+8,base-18,w-16,18);
}
function v06HdDublinBridge(g,y,water){
    const stone=0xb9b2a5,dark=0x7f796e;
    g.fillStyle(stone,1);g.fillRect(-20,y,1320,94);
    g.fillStyle(water,1);const step=1280/5;for(let i=0;i<5;i+=1)g.fillEllipse(i*step+step/2,y+82,step*.70,125);
    g.fillStyle(dark,1);g.fillRect(-20,y-15,1320,18);g.fillStyle(0xd9d2c5,1);g.fillRect(-20,y-24,1320,10);
    g.lineStyle(2,0x69645d,.7);for(let x=0;x<1280;x+=48){g.beginPath();g.moveTo(x,y-24);g.lineTo(x,y-3);g.strokePath();}
    for(let x=80;x<1240;x+=185){g.fillStyle(0x3b4248,1);g.fillRect(x-2,y-62,4,40);g.fillCircle(x,y-67,6);g.fillStyle(0xffe6a0,.9);g.fillCircle(x,y-67,3);}
}
function v06HdDrawDublin(scene,far,mid,near){
    for(const [x,y,s] of [[95,98,.62],[430,127,.48],[860,92,.54],[1160,128,.47]])v06Cloud(far,x,y,s,.52);
    const colors=[0xb99275,0xc6a783,0x9b806c,0xd0b9a0,0x947867,0xbfa78f,0x8f9aa0];
    let x=-24;for(let i=0;i<14;i+=1){const w=88+(i%3)*10,h=120+(i%4)*24;v06HdCityFacade(far,x,421,w,h,colors[i%colors.length],0x4d5155);x+=w-2;}
    v06Spire(mid,640,430,1.12);mid.fillStyle(0xd8e4e8,.65);mid.fillCircle(640,165,5);
    v06WaterBase(mid,430,0x3f7180);mid.fillStyle(0x82aab0,.28);for(let y=455;y<550;y+=23)mid.fillRect(0,y,1280,2);
    v06HdDublinBridge(near,450,0x3f7180);
    scene.v06Water={y:438,color:0xc7e3e4,amplitude:2.2,speed:.0026,depth:-7,x0:0,x1:1280};
}
function v06HdPalace(g,x,base,s){
    const stone=0xb79a62,dark=0x655a45,roof=0x585a54;
    g.fillStyle(stone,1);g.fillRect(x,base-151*s,705*s,151*s);
    g.fillStyle(dark,.72);for(let xx=x+18*s;xx<x+690*s;xx+=47*s){g.fillRect(xx,base-116*s,21*s,83*s);g.fillTriangle(xx-4*s,base-116*s,xx+10*s,base-143*s,xx+25*s,base-116*s);}
    g.fillStyle(stone,1);for(let xx=x+4*s;xx<x+700*s;xx+=92*s){g.fillRect(xx,base-184*s,33*s,34*s);g.fillTriangle(xx-5*s,base-184*s,xx+16*s,base-216*s,xx+38*s,base-184*s);}
    g.fillStyle(roof,1);g.fillRect(x-5*s,base-158*s,715*s,9*s);
    g.fillStyle(0xe7c777,.5);for(let xx=x+23*s;xx<x+690*s;xx+=48*s)for(let yy=base-97*s;yy<base-36*s;yy+=29*s)g.fillRect(xx,yy,7*s,11*s);
}
function v06HdBigBen(g,x,y,s){
    const stone=0xc2a66b,dark=0x78694d,trim=0xd0b56e,roof=0x48535a;
    g.fillStyle(stone,1);g.fillRect(x-37*s,y-208*s,74*s,208*s);
    g.fillStyle(dark,1);g.fillRect(x-45*s,y-219*s,90*s,17*s);
    g.fillStyle(stone,1);g.fillRect(x-48*s,y-275*s,96*s,61*s);
    g.fillStyle(trim,1);g.fillRect(x-52*s,y-281*s,104*s,8*s);
    g.fillStyle(0xf3e8c9,1);g.fillCircle(x,y-246*s,25*s);g.lineStyle(4*s,0x2f3437,1);g.strokeCircle(x,y-246*s,25*s);g.beginPath();g.moveTo(x,y-246*s);g.lineTo(x-2*s,y-262*s);g.moveTo(x,y-246*s);g.lineTo(x+14*s,y-238*s);g.strokePath();
    g.fillStyle(roof,1);g.fillTriangle(x-49*s,y-281*s,x,y-350*s,x+49*s,y-281*s);g.fillRect(x-5*s,y-368*s,10*s,25*s);g.fillStyle(trim,1);g.fillCircle(x,y-372*s,4*s);
    g.fillStyle(dark,.75);for(let yy=y-188*s;yy<y-35*s;yy+=34*s){g.fillRoundedRect(x-16*s,yy,12*s,21*s,5*s);g.fillRoundedRect(x+4*s,yy,12*s,21*s,5*s);}
}
function v06HdWestminsterBridge(g,y,water){
    const green=0x6f907d,dark=0x4e6e5e;
    g.fillStyle(green,1);g.fillRect(-20,y,1320,78);
    g.fillStyle(water,1);const step=1280/7;for(let i=0;i<7;i+=1)g.fillEllipse(i*step+step/2,y+70,step*.72,105);
    g.fillStyle(dark,1);g.fillRect(-20,y-17,1320,18);g.fillStyle(0x98ad9f,1);g.fillRect(-20,y-25,1320,8);
    for(let x=65;x<1260;x+=150){g.fillStyle(0x3d5449,1);g.fillRect(x-2,y-54,4,31);g.fillCircle(x,y-57,5);}
}
function v06HdDrawWestminster(scene,far,mid,near){
    for(const [x,y,s] of [[105,102,.60],[450,130,.46],[890,95,.54],[1175,130,.44]])v06Cloud(far,x,y,s,.50);
    v06HdPalace(far,75,447,.96);v06HdBigBen(mid,940,449,.98);
    v06WaterBase(mid,438,0x557f8a);mid.fillStyle(0xa9c9cc,.22);for(let y=458;y<550;y+=24)mid.fillRect(0,y,1280,2);
    v06HdWestminsterBridge(near,466,0x557f8a);
    scene.v06Water={y:443,color:0xd0e5e3,amplitude:2.1,speed:.0024,depth:-7,x0:0,x1:1280};
}
function v06HdDrawDonabate(scene,far,mid,near){
    for(const [x,y,s] of [[110,92,.68],[430,128,.48],[815,84,.58],[1140,124,.50]])v06Cloud(far,x,y,s,.62);
    far.fillStyle(0x6e9299,.58);far.fillEllipse(1050,366,470,95);far.fillStyle(0x5a7b82,.38);far.fillEllipse(920,372,260,52);
    far.lineStyle(3,0x3f6170,.55);for(const [x,y] of [[260,205],[315,180],[760,215]]){far.beginPath();far.moveTo(x-10,y);far.lineTo(x,y-6);far.lineTo(x+10,y);far.strokePath();}
    v06WaterBase(mid,350,0x4698b8);mid.fillStyle(0x9ed4dd,.34);for(let y=378;y<515;y+=24){for(let x=(y%48)-40;x<1280;x+=105)mid.fillRoundedRect(x,y,65,3,2);}
    near.fillStyle(0xe5ca91,1);near.fillRect(-20,500,1320,115);near.fillStyle(0xcab477,.9);near.fillEllipse(180,505,470,95);near.fillEllipse(680,510,650,100);near.fillEllipse(1150,505,520,92);
    near.fillStyle(0x879b5f,1);for(let x=0;x<1280;x+=31){const h=11+(x%7)*2;near.fillTriangle(x,513,x+8,513-h,x+15,513);near.fillTriangle(x+11,516,x+21,516-h*.75,x+28,516);}
    near.fillStyle(0xf2e1bb,.72);for(let x=10;x<1270;x+=61)near.fillEllipse(x,563+(x%4)*5,24,5);
    scene.v06Water={y:355,color:0xd8f1f2,amplitude:3.1,speed:.0030,depth:-7,x0:0,x1:1280};
}
function v06HdDrawNewEnvironment(scene,far,mid,near){
    if(scene.arena.id==='taj-mahal')return v06HdDrawTaj(scene,far,mid,near);
    if(scene.arena.id==='oconnell-bridge-spire')return v06HdDrawDublin(scene,far,mid,near);
    if(scene.arena.id==='westminster-bridge-big-ben')return v06HdDrawWestminster(scene,far,mid,near);
    return v06HdDrawDonabate(scene,far,mid,near);
}
GameScene.prototype.createSky=function(){
    const p=this.arena.palette,id=this.arena.id;
    this.v06ParallaxLayers=[];this.v06ParallaxObjects=[];this.v06Water=null;this.v06WaterGraphics=null;
    if(id==='garden-siege'||id==='rooftop-rumble'||id==='junkyard-jamboree'){
        __mwV05CreateSky.call(this);
        v06HdTrackLegacy(this);
        if(id==='garden-siege')v06HdGardenExtras(this);else if(id==='rooftop-rumble')v06HdRooftopExtras(this);else v06HdJunkyardExtras(this);
        this.add.text(1264,12,__mw_v06_version+' • '+__mw_v06_build,{fontFamily:'Arial',fontSize:'11px',color:'#f4fbff',backgroundColor:'#10223ecc',padding:{x:6,y:3}}).setOrigin(1,0).setDepth(92);
        return;
    }
    this.cameras.main.setBackgroundColor(p.skyTop);
    for(let i=0;i<18;i+=1){const t=i/17;this.add.rectangle(WIDTH/2,(i+.5)*(HEIGHT/18),WIDTH+6,HEIGHT/18+2,v06Mix(p.skyTop,p.skyBottom,t),1).setDepth(-40);}
    this.add.circle(1090,105,58,v06Hex(p.sun),.92).setDepth(-36);
    const far=v06Layer(this,-30,.09),mid=v06Layer(this,-20,.27),near=v06Layer(this,-6,.58);
    v06HdDrawNewEnvironment(this,far,mid,near);
    const labelBack=this.add.rectangle(142,88,244,42,0x10223e,.86).setDepth(90);labelBack.setStrokeStyle?.(2,v06Hex(p.accent),.9);
    this.add.text(142,88,this.arena.name.toUpperCase(),{fontFamily:'Arial Black, Arial',fontSize:'13px',color:'#ffffff'}).setOrigin(.5).setDepth(91);
    this.add.text(1264,12,__mw_v06_version+' • '+__mw_v06_build,{fontFamily:'Arial',fontSize:'11px',color:'#f4fbff',backgroundColor:'#10223ecc',padding:{x:6,y:3}}).setOrigin(1,0).setDepth(92);
};
GameScene.prototype.updateEnvironmentV06=function(time){
    let focus=WIDTH/2;try{const cat=this.activeCat?.();if(cat&&Number.isFinite(cat.x))focus=cat.x;}catch{}
    const n=(focus/WIDTH)-.5;
    for(let i=0;i<(this.v06ParallaxLayers?.length||0);i+=1){const layer=this.v06ParallaxLayers[i],factor=layer.__mwParallaxFactor||0;layer.x=-n*72*factor+Math.sin(time*.00018+i)*4*factor;}
    for(let i=0;i<(this.v06ParallaxObjects?.length||0);i+=1){const obj=this.v06ParallaxObjects[i],factor=obj.__mwParallaxFactor||0,base=obj.__mwParallaxBaseX;obj.x=base-n*72*factor+Math.sin(time*.00018+i*.7)*4*factor;}
    if(!this.v06Water)return;
    if(!this.v06WaterGraphics)this.v06WaterGraphics=this.add.graphics().setDepth(this.v06Water.depth);
    const g=this.v06WaterGraphics,w=this.v06Water,x0=w.x0??-20,x1=w.x1??1300;
    g.clear();g.lineStyle(2,w.color,.52);
    for(let row=0;row<4;row+=1){const y=w.y+15+row*22;g.beginPath();let first=true;for(let x=x0;x<=x1;x+=16){const yy=y+Math.sin(x*.027+time*w.speed+row)*w.amplitude;if(first){g.moveTo(x,yy);first=false;}else g.lineTo(x,yy);}g.strokePath();}
};
`;

const MENU_PATCH = String.raw`
const __mw_v06_MenuScene = __mw_game_MenuScene_js.MenuScene;
const __mw_v06_menuCreate = __mw_v06_MenuScene.prototype.create;
__mw_v06_MenuScene.prototype.create = function() {
    __mw_v06_menuCreate.call(this);
    this.add.text(18, 14, 'v0.6.0  •  mw-v06-env-20260918a', {
        fontFamily: 'Arial', fontSize: '11px', color: '#f5fbff',
        backgroundColor: '#153555cc', padding: { x: 7, y: 4 }
    }).setDepth(60);
    const settings = this.add.text(1262, 14, '⚙  SETTINGS', {
        fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#ffffff',
        backgroundColor: '#153555dd', padding: { x: 9, y: 5 }
    }).setOrigin(1,0).setDepth(60).setInteractive({ useHandCursor: true });
    settings.on('pointerdown', () => this.showV06Settings());
};
__mw_v06_MenuScene.prototype.showV06Settings = function() {
    if (this.v06SettingsPanel) { this.v06SettingsPanel.destroy(true); this.v06SettingsPanel = null; return; }
    const c = this.add.container(0,0).setDepth(1000);
    c.add(this.add.rectangle(640,360,1280,720,0x07111f,0.72).setInteractive());
    c.add(this.add.rectangle(640,350,590,420,0x122c4b,0.98).setStrokeStyle(4,0x70d9ff,0.9));
    c.add(this.add.text(640,190,'SETTINGS / BUILD INFO',{fontFamily:'Arial Black, Arial',fontSize:'27px',color:'#ffd253'}).setOrigin(.5));
    c.add(this.add.text(390,245,'VERSION\nBUILD\nGRAPHICS\nART PIPELINE\nBATTLEFIELDS\nCONTROLS',{fontFamily:'Arial Black, Arial',fontSize:'15px',color:'#9edcff',lineSpacing:15}));
    c.add(this.add.text(545,245,'0.6.0\nmw-v06-env-20260918a\nAdaptive HD → 4K render scale\nVector / procedural 4K-source layers\n7\nA/D move · W/S aim · Q/E weapons · Space fire',{fontFamily:'Arial',fontSize:'15px',color:'#ffffff',lineSpacing:15}));
    const close=this.add.text(640,505,'CLOSE',{fontFamily:'Arial Black, Arial',fontSize:'18px',color:'#ffffff',backgroundColor:'#e1544f',padding:{x:24,y:10}}).setOrigin(.5).setInteractive({useHandCursor:true});
    close.on('pointerdown',()=>{c.destroy(true);this.v06SettingsPanel=null;});
    c.add(close); this.v06SettingsPanel=c;
};
`;

export function patchSource(input) {
  if (typeof input !== 'string' || input.length < 1000) throw new Error('Invalid Meow Wars production source');

  let source = input;

  source = replaceOnce(
    source,
    "const BY_ID = new Map(ARENAS.map((arena) => [arena.id, arena]));",
    ARENA_PATCH + "\nconst BY_ID = new Map(ARENAS.map((arena) => [arena.id, arena]));",
    'arena catalogue'
  );

  source = replaceOnce(
    source,
    "// --- game/MenuScene.js ---",
    RUNTIME_PATCH + "\n\n" + ART_PASS_PATCH + "\n\n// --- game/MenuScene.js ---",
    'runtime patch insertion'
  );

  source = replaceOnce(
    source,
    "const __mw_main_js = (() => {",
    MENU_PATCH + "\n\nconst __mw_main_js = (() => {",
    'menu patch insertion'
  );

  source = replaceOnce(
    source,
    "3 BATTLEFIELDS",
    "$" + "{ARENAS.length} BATTLEFIELDS",
    'battlefield count'
  );

  source = replacePatternOnce(
    source,
    /function preferredRenderResolution\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g,
    "function preferredRenderResolution(devicePixelRatio = 1) {\n    const viewportScale = Math.max((globalThis.innerWidth || 1280) / 1280, (globalThis.innerHeight || 720) / 720);\n    const mobileCap = (globalThis.innerWidth || 1280) < 800 ? 2 : 3;\n    return Math.min(mobileCap, 3, Math.max(1, devicePixelRatio, viewportScale));\n}",
    'adaptive HD/4K render resolution'
  );

  return source;
}
