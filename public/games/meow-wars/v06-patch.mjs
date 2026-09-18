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

const ARENA_PATCH = String.raw\`
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
\`;

const RUNTIME_PATCH = String.raw\`
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
    for(let i=0;i<12;i+=1) v06CityBlock(far,-0+i*0+480,i*108-22,0,0,0);
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
GameScene.prototype.createSky = function() {
    const p = this.arena.palette;
    this.v06ParallaxLayers = [];
    this.v06Water = null;
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
\`;

const MENU_PATCH = String.raw\`
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
    c.add(this.add.text(390,245,'VERSION\\nBUILD\\nGRAPHICS\\nART PIPELINE\\nBATTLEFIELDS\\nCONTROLS',{fontFamily:'Arial Black, Arial',fontSize:'15px',color:'#9edcff',lineSpacing:15}));
    c.add(this.add.text(545,245,'0.6.0\\nmw-v06-env-20260918a\\nAdaptive HD → 4K render scale\\nVector / procedural 4K-source layers\\n7\\nA/D move · W/S aim · Q/E weapons · Space fire',{fontFamily:'Arial',fontSize:'15px',color:'#ffffff',lineSpacing:15}));
    const close=this.add.text(640,505,'CLOSE',{fontFamily:'Arial Black, Arial',fontSize:'18px',color:'#ffffff',backgroundColor:'#e1544f',padding:{x:24,y:10}}).setOrigin(.5).setInteractive({useHandCursor:true});
    close.on('pointerdown',()=>{c.destroy(true);this.v06SettingsPanel=null;});
    c.add(close); this.v06SettingsPanel=c;
};
\`;

export function patchSource(input) {
  if (typeof input !== 'string' || input.length < 1000) throw new Error('Invalid Meow Wars production source');

  let source = input;

  source = replaceOnce(
    source,
    "const BY_ID = new Map(ARENAS.map((arena) => [arena.id, arena]));",
    ARENA_PATCH + "\\nconst BY_ID = new Map(ARENAS.map((arena) => [arena.id, arena]));",
    'arena catalogue'
  );

  source = replaceOnce(
    source,
    "// --- game/MenuScene.js ---",
    RUNTIME_PATCH + "\\n\\n// --- game/MenuScene.js ---",
    'runtime patch insertion'
  );

  source = replaceOnce(
    source,
    "const __mw_main_js = (() => {",
    MENU_PATCH + "\\n\\nconst __mw_main_js = (() => {",
    'menu patch insertion'
  );

  source = replaceOnce(
    source,
    "3 BATTLEFIELDS",
    "$" + "{ARENAS.length} BATTLEFIELDS",
    'battlefield count'
  );

  source = replaceOnce(
    source,
    "return Math.min(2, Math.max(1, devicePixelRatio));",
    "const viewportScale = Math.max((globalThis.innerWidth || 1280) / 1280, (globalThis.innerHeight || 720) / 720);\\n    const mobileCap = (globalThis.innerWidth || 1280) < 800 ? 2 : 3;\\n    return Math.min(mobileCap, 3, Math.max(1, devicePixelRatio, viewportScale));",
    'adaptive HD/4K render resolution'
  );

  return source;
}
