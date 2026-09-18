/* Meow Wars v1.5.0 — Layered Scene Depth.
   Cosmetic foreground/background separation, richer near-field detail and a guarded menu-to-arena handoff.
   Does not mutate terrain, health, weapons, ammo, turn order or online authority. */
(() => {
'use strict';

const MW15_VERSION = '1.5.0';
const MW15_BUILD = 'mw-v15-scene-depth-20260918a';

const stats = globalThis.__MEOW_WARS_V15_STATS = {
  scenesLayered: 0,
  depthFrames: 0,
  foregroundObjects: 0,
  groundDetails: 0,
  nearWaterFrames: 0,
  movingDepthObjects: 0,
  transitionAudits: 0,
  transitionConfirmed: 0,
  transitionRepairs: 0
};

const REDUCED = () => globalThis.__MEOW_WARS_SETTINGS?.fxIntensity === 'reduced';
const MOBILE = () => (globalThis.innerWidth || 1280) < 900;
const DENSITY = () => REDUCED() ? .52 : MOBILE() ? .72 : 1;

function safeDestroy(object) {
  try { object?.destroy?.(); } catch {}
}

function line(g,x1,y1,x2,y2,color,alpha,width=1) {
  g.lineStyle(width,color,alpha);
  g.beginPath();
  g.moveTo(x1,y1);
  g.lineTo(x2,y2);
  g.strokePath();
}

function track(scene, object, kind, data={}) {
  scene.__mw15Objects ||= [];
  const item={object,kind,...data};
  scene.__mw15Objects.push(item);
  stats.movingDepthObjects+=1;
  return item;
}

function cleanup(scene) {
  for(const item of scene.__mw15Objects || []) safeDestroy(item.object);
  safeDestroy(scene.__mw15Back);
  safeDestroy(scene.__mw15Mid);
  safeDestroy(scene.__mw15Ground);
  safeDestroy(scene.__mw15Front);
  safeDestroy(scene.__mw15NearWater);
  safeDestroy(scene.__mw15Motion);
  scene.__mw15Objects=[];
  scene.__mw15Back=null;
  scene.__mw15Mid=null;
  scene.__mw15Ground=null;
  scene.__mw15Front=null;
  scene.__mw15NearWater=null;
  scene.__mw15Motion=null;
}

function drawGardenDepth(scene,back,mid,front) {
  back.fillStyle(0x173b2d,.13);
  back.fillEllipse(120,420,330,125);
  back.fillEllipse(1140,430,390,140);
  back.fillStyle(0x7fb268,.09);
  for(let x=40;x<1280;x+=120) back.fillCircle(x,425+(x%240?8:-8),35+(x%3));

  mid.fillStyle(0x4b6e46,.24);
  for(const [x,y,r] of [[32,562,62],[94,575,48],[1200,566,72],[1260,578,55]]) mid.fillCircle(x,y,r);

  front.fillStyle(0x163e2f,.60);
  for(const [x,y,w,h] of [[10,664,145,42],[95,684,105,34],[1180,676,128,38],[1265,653,120,40]]) {
    front.fillEllipse(x,y,w,h);
  }

  const count=Math.max(6,Math.round(12*DENSITY()));
  for(let i=0;i<count;i++) {
    const left=i%2===0;
    const leaf=scene.add.ellipse(left?18+(i%4)*24:1262-(i%4)*24,620+(i%5)*18,28+(i%3)*6,10,0x2d6847,.58)
      .setDepth(5).setRotation((left?-.6:.6)+(i%3)*.16);
    track(scene,leaf,'leaf',{baseX:leaf.x,baseY:leaf.y,phase:i*.7,side:left?-1:1});
    stats.foregroundObjects+=1;
  }
}

function drawRooftopDepth(scene,back,mid,front) {
  back.fillStyle(0x1a2432,.16);
  for(let x=10;x<1280;x+=88) {
    const h=35+(x%176?32:72);
    back.fillRect(x,410-h,64,h);
    if(x%176===10) back.fillRect(x+12,410-h-22,7,22);
  }
  back.fillStyle(0x9bd8e8,.045);
  back.fillRect(0,405,1280,5);

  mid.fillStyle(0x252f36,.42);
  mid.fillRect(0,510,1280,12);
  for(let x=30;x<1260;x+=120) {
    mid.fillStyle(0xa5b4bc,.11);
    mid.fillRect(x,514,48,3);
    mid.fillStyle(0x1c252a,.22);
    mid.fillCircle(x+58,515,2);
  }

  line(front,0,628,225,590,0x1a2228,.54,7);
  line(front,1060,594,1280,632,0x1a2228,.54,7);
  for(const x of [60,1220]) {
    line(front,x,540,x,720,0x263139,.72,9);
    line(front,x-55,585,x+55,585,0x33414a,.62,5);
  }

  const beacon=scene.add.circle(1185,208,4,0xff5d70,.72).setDepth(-5);
  track(scene,beacon,'beacon',{phase:.7});
}

function drawJunkyardDepth(scene,back,mid,front) {
  back.fillStyle(0x342f2b,.13);
  for(let x=-20,i=0;x<1280;x+=96,i++) {
    const y=430-(i%4)*14;
    back.fillRoundedRect(x,y,110+(i%3)*24,30+(i%2)*14,7);
  }
  back.fillStyle(0x252b2e,.18);
  back.fillTriangle(900,430,1040,245,1120,430);
  line(back,1040,248,1040,420,0x2e3538,.26,8);

  for(let x=36;x<1240;x+=145) {
    mid.fillStyle(x%290?0x6c4c37:0x3b454b,.20);
    mid.fillEllipse(x,526,72,16);
    mid.fillStyle(0x151b1e,.22);
    mid.fillCircle(x+22,522,5);
  }

  front.fillStyle(0x191e20,.64);
  front.fillCircle(44,670,88);
  front.fillCircle(1234,675,92);
  front.fillStyle(0x4e3b2f,.50);
  front.fillRoundedRect(-20,650,185,38,8);
  front.fillRoundedRect(1115,648,190,42,8);

  const puffs=Math.max(4,Math.round(7*DENSITY()));
  for(let i=0;i<puffs;i++) {
    const smoke=scene.add.circle(934,420,10+i*2,0xa59b8f,.055).setDepth(-4);
    track(scene,smoke,'smoke',{phase:i/Math.max(1,puffs),baseX:934,baseY:420});
  }
}

function drawTajDepth(scene,back,mid,front) {
  back.fillStyle(0xd8b57d,.045);
  back.fillRect(0,305,1280,155);
  for(const x of [120,1160]) {
    back.fillStyle(0x2d613b,.11);
    back.fillTriangle(x-34,454,x,318,x+34,454);
  }

  mid.fillStyle(0xf1e7d1,.16);
  mid.fillRect(425,483,430,7);
  mid.fillStyle(0x638c58,.18);
  for(const x of [165,235,1045,1115]) mid.fillEllipse(x,501,42,15);

  front.fillStyle(0x294f36,.48);
  for(const [x,y,s] of [[28,666,1],[72,686,.75],[1215,682,.82],[1260,660,1.05]]) {
    front.fillTriangle(x-26*s,y+30*s,x,y-78*s,x+26*s,y+30*s);
    front.fillRect(x-5*s,y-10*s,10*s,65*s);
  }
  front.fillStyle(0xd3c3a6,.26);
  front.fillRect(0,686,180,34);
  front.fillRect(1100,686,180,34);

  const birds=Math.max(3,Math.round(5*DENSITY()));
  for(let i=0;i<birds;i++) {
    const bird=scene.add.text(120+i*240,150+(i%2)*24,'⌁',{fontFamily:'Arial',fontSize:'15px',color:'#596d74'})
      .setDepth(-8).setAlpha(.32).setOrigin(.5);
    track(scene,bird,'bird',{baseY:bird.y,phase:i*.8,speed:.005+i*.0007});
  }
}

function drawDublinDepth(scene,back,mid,front) {
  back.fillStyle(0x203846,.12);
  back.fillRect(0,325,1280,160);
  back.fillStyle(0xffdf91,.035);
  for(const x of [140,362,590,860,1090]) back.fillRect(x,340+(x%3)*8,38,16);

  mid.fillStyle(0x29383f,.18);
  mid.fillRect(0,502,1280,16);
  for(let x=15;x<1280;x+=72) {
    line(mid,x,504,x+48,504,0xe5eef0,.08,1);
    mid.fillStyle(0xbad5db,.035);
    mid.fillRoundedRect(x+6,511,44,9,3);
  }

  front.fillStyle(0x121b20,.66);
  front.fillRect(0,650,1280,12);
  for(const x of [28,92,1188,1252]) {
    front.fillRoundedRect(x-6,584,12,112,5);
    front.fillCircle(x,582,10);
  }
  line(front,0,612,150,612,0x202b30,.62,5);
  line(front,1130,612,1280,612,0x202b30,.62,5);

  const splashes=Math.max(6,Math.round(11*DENSITY()));
  for(let i=0;i<splashes;i++) {
    const splash=scene.add.ellipse(40+(i*113)%1200,520+(i%3)*18,10+(i%2)*4,2,0xd8f4ff,.12).setDepth(4);
    track(scene,splash,'rain-splash',{phase:i*.6,baseX:splash.x,baseY:splash.y});
  }
}

function drawWestminsterDepth(scene,back,mid,front) {
  back.fillStyle(0x24343c,.11);
  back.fillRect(0,320,1280,170);
  back.fillStyle(0xffd66f,.035);
  for(const x of [190,445,720,1000,1150]) back.fillRect(x,345+(x%2)*12,34,14);

  mid.fillStyle(0x5b6862,.17);
  mid.fillRect(0,496,1280,18);
  for(let x=18;x<1260;x+=70) line(mid,x,500,x+45,500,0xe3e9e4,.09,1);

  front.fillStyle(0x1c2528,.64);
  front.fillRect(0,650,1280,10);
  for(const x of [40,103,1177,1240]) {
    front.fillRoundedRect(x-7,580,14,118,5);
    front.fillStyle(0xc4a750,.35);
    front.fillRect(x-5,599,10,5);
    front.fillStyle(0x1c2528,.64);
  }
  line(front,0,615,160,615,0x263136,.58,5);
  line(front,1120,615,1280,615,0x263136,.58,5);

  const splashes=Math.max(5,Math.round(9*DENSITY()));
  for(let i=0;i<splashes;i++) {
    const splash=scene.add.ellipse(65+(i*137)%1160,518+(i%3)*17,9+(i%2)*3,2,0xd5edf4,.09).setDepth(4);
    track(scene,splash,'rain-splash',{phase:i*.7,baseX:splash.x,baseY:splash.y});
  }
}

function drawBeachDepth(scene,back,mid,front) {
  back.fillStyle(0xbfe7e7,.06);
  back.fillRect(0,360,1280,150);
  back.fillStyle(0xffffff,.055);
  back.fillRect(0,414,1280,3);

  mid.fillStyle(0x98c8c7,.09);
  mid.fillRect(0,488,1280,28);
  for(let x=10;x<1280;x+=85) line(mid,x,493,x+54,493,0xf3ffff,.12,1.5);

  front.fillStyle(0xbda57b,.36);
  front.fillEllipse(36,690,210,80);
  front.fillEllipse(1240,688,220,82);

  const grass=Math.max(12,Math.round(22*DENSITY()));
  for(let i=0;i<grass;i++) {
    const left=i%2===0;
    const x=left?8+(i%11)*15:1272-(i%11)*15;
    const y=650+(i%5)*12;
    const blade=scene.add.rectangle(x,y,2,34+(i%4)*7,0x667b43,.52)
      .setDepth(5).setOrigin(.5,1).setRotation((left?-.22:.22)+(i%3)*.08);
    track(scene,blade,'grass',{baseX:x,baseY:y,baseRot:blade.rotation,phase:i*.55});
    stats.foregroundObjects+=1;
  }
}

function drawGroundClutter(scene,g) {
  const id=scene.arena.id;
  const step=MOBILE()?104:82;
  for(let x=28,i=0;x<1260;x+=step,i++) {
    const y=surfaceY(scene.terrain,x);
    if(y>=HEIGHT) continue;

    if(id==='garden-siege') {
      g.fillStyle(i%3?0x6d895d:0x9d744a,.13);
      g.fillEllipse(x,y+6,10+(i%4)*2,3);
      if(i%3===0) line(g,x+8,y+4,x+14,y-3,0x40643c,.18,1.5);
    } else if(id==='rooftop-rumble') {
      g.fillStyle(0x273138,.20);
      g.fillCircle(x,y+5,2+(i%3));
      line(g,x+8,y+4,x+30,y+5,0xb5c0c5,.09,1);
    } else if(id==='junkyard-jamboree') {
      g.fillStyle(i%2?0x4e3d32:0x252b2f,.18);
      g.fillCircle(x,y+6,2+(i%4));
      if(i%2===0) line(g,x+9,y+5,x+18,y+2,0xa77145,.16,2);
    } else if(id==='taj-mahal') {
      line(g,x,y+4,x+42,y+4,0xfff5df,.09,1);
      if(i%3===0) g.fillCircle(x+18,y+7,2,0x7a8b62,.13);
    } else if(id==='oconnell-bridge-spire'||id==='westminster-bridge-big-ben') {
      g.fillStyle(0xe8fbff,.035);
      g.fillRoundedRect(x,y+6,34+(i%3)*7,8,3);
      line(g,x+5,y+4,x+32,y+4,0xdce6e6,.08,1);
    } else if(id==='donabate-beach') {
      g.fillStyle(i%3?0xd5c09d:0x8d9a8c,.16);
      g.fillEllipse(x,y+7,7+(i%3)*2,3+(i%2));
      if(i%4===0) line(g,x+8,y+4,x+20,y+4,0xffffff,.09,1.5);
    }
    stats.groundDetails+=1;
  }
}

function createDepthLayers(scene) {
  cleanup(scene);
  scene.__mw15Objects=[];
  const back=scene.add.graphics().setDepth(-13);
  const mid=scene.add.graphics().setDepth(-1);
  const ground=scene.add.graphics().setDepth(3);
  const front=scene.add.graphics().setDepth(5);
  const nearWater=scene.add.graphics().setDepth(-.5);
  const motion=scene.add.graphics().setDepth(4.5);
  scene.__mw15Back=back;
  scene.__mw15Mid=mid;
  scene.__mw15Ground=ground;
  scene.__mw15Front=front;
  scene.__mw15NearWater=nearWater;
  scene.__mw15Motion=motion;

  const id=scene.arena.id;
  if(id==='garden-siege') drawGardenDepth(scene,back,mid,front);
  else if(id==='rooftop-rumble') drawRooftopDepth(scene,back,mid,front);
  else if(id==='junkyard-jamboree') drawJunkyardDepth(scene,back,mid,front);
  else if(id==='taj-mahal') drawTajDepth(scene,back,mid,front);
  else if(id==='oconnell-bridge-spire') drawDublinDepth(scene,back,mid,front);
  else if(id==='westminster-bridge-big-ben') drawWestminsterDepth(scene,back,mid,front);
  else if(id==='donabate-beach') drawBeachDepth(scene,back,mid,front);

  drawGroundClutter(scene,ground);
  stats.scenesLayered+=1;
}

function updateNearWater(scene,time) {
  const g=scene.__mw15NearWater;
  const motion=scene.__mw15Motion;
  if(!g||!motion) return;
  g.clear();
  motion.clear();
  const id=scene.arena.id;
  const t=time*.001;

  if(id==='oconnell-bridge-spire'||id==='westminster-bridge-big-ben') {
    const base=id==='oconnell-bridge-spire'?430:438;
    const cold=id==='oconnell-bridge-spire'?0xbdebf4:0xc7e3e9;
    for(let row=0;row<4;row++) {
      const y=base+row*15;
      const shift=Math.sin(t*(1.6+row*.2)+row)*18;
      for(let x=-80;x<1320;x+=150) {
        line(g,x+shift,y,x+72+shift,y,cold,.055+row*.01,1.4+row*.3);
      }
    }
    const streak=((t*95)%1500)-110;
    line(motion,streak,487,streak+74,487,0xffe8ad,.075,2.4);
    line(motion,streak+20,493,streak+58,493,0xd8f5ff,.05,1.7);
    stats.nearWaterFrames+=1;
  } else if(id==='donabate-beach') {
    for(let row=0;row<3;row++) {
      const y=454+row*22;
      g.lineStyle(1.5+row*.45,0xf7ffff,.13+row*.025);
      g.beginPath();
      for(let x=0;x<=1280;x+=16) {
        const yy=y+Math.sin(x*.018+t*(1.1+row*.22)+row)*3.2+Math.sin(x*.006-t*.7)*1.6;
        if(x===0) g.moveTo(x,yy); else g.lineTo(x,yy);
      }
      g.strokePath();
    }
    const foam=((t*42)%1440)-80;
    line(motion,foam,500,foam+115,500,0xffffff,.08,2.5);
    stats.nearWaterFrames+=1;
  } else if(id==='taj-mahal') {
    for(let i=0;i<5;i++) {
      const y=458+i*7;
      const shift=Math.sin(t*1.8+i)*11;
      line(g,480+shift,y,800-shift,y,0xf9ffff,.065+(4-i)*.008,1.2);
    }
    stats.nearWaterFrames+=1;
  }
}

function updateObjects(scene,time,delta) {
  for(const item of scene.__mw15Objects || []) {
    const o=item.object;
    if(!o?.active) continue;

    if(item.kind==='leaf') {
      o.x=item.baseX+Math.sin(time*.0013+item.phase)*7*item.side;
      o.y=item.baseY+Math.cos(time*.0017+item.phase)*3;
      o.rotation+=(delta*.00008)*item.side;
    } else if(item.kind==='beacon') {
      o.alpha=.12+Math.max(0,Math.sin(time*.006+item.phase))*.72;
      o.setScale(1+Math.max(0,Math.sin(time*.006+item.phase))*.7);
    } else if(item.kind==='smoke') {
      const p=(time*.00018+item.phase)%1;
      o.x=item.baseX+Math.sin(p*6.28+item.phase)*18;
      o.y=item.baseY-p*118;
      o.alpha=.07*(1-p);
      o.setScale(.7+p*2.1);
    } else if(item.kind==='bird') {
      o.x+=item.speed*delta;
      if(o.x>1340)o.x=-60;
      o.y=item.baseY+Math.sin(time*.0014+item.phase)*10;
      o.angle=Math.sin(time*.004+item.phase)*4;
    } else if(item.kind==='rain-splash') {
      const pulse=(Math.sin(time*.006+item.phase)+1)*.5;
      o.alpha=.03+pulse*.14;
      o.scaleX=.6+pulse*.75;
      o.scaleY=.65+pulse*.45;
    } else if(item.kind==='grass') {
      o.rotation=item.baseRot+Math.sin(time*.0018+item.phase)*.10;
      o.x=item.baseX+Math.sin(time*.0013+item.phase)*1.8;
    }
  }
  stats.depthFrames+=1;
}

function setupScene(scene) {
  createDepthLayers(scene);
}

function auditMenuTransition(scene, expectedArena, payload) {
  stats.transitionAudits+=1;
  globalThis.setTimeout(()=>{
    try {
      const game=scene.scene?.get?.('GameScene');
      const actual=globalThis.__MEOW_WARS_LAST_CONFIRMED_ARENA || game?.arena?.id || null;
      if(actual===expectedArena) {
        stats.transitionConfirmed+=1;
        return;
      }

      const menuActive=scene.sys?.isActive?.() || false;
      const gameActive=game?.sys?.isActive?.() || false;
      if(!menuActive || gameActive) return;

      stats.transitionRepairs+=1;
      scene.__mw11Starting=false;
      scene.input?.keyboard?.resetKeys?.();
      globalThis.__MEOW_WARS_PENDING_ARENA=expectedArena;
      try { scene.scene.stop('GameScene'); } catch {}
      scene.scene.start('GameScene',payload);
    } catch {}
  },450);
}

const v14MenuStart=MenuScene.prototype.start;
MenuScene.prototype.start=function() {
  const arena=ARENAS[this.arenaIndex] || ARENAS[0];
  const payload={
    mode:this.mode,
    arenaId:arena.id,
    blueSquadId:SQUADS[this.blueSquadIndex].id,
    redSquadId:SQUADS[this.redSquadIndex].id
  };
  const result=v14MenuStart.call(this);
  auditMenuTransition(this,arena.id,payload);
  return result;
};

const v14GameCreate=GameScene.prototype.create;
GameScene.prototype.create=function() {
  v14GameCreate.call(this);
  setupScene(this);
  const marker=this.children.getByName('mw-build-marker');
  if(marker?.setText) marker.setText('v'+MW15_VERSION+' · '+MW15_BUILD);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>cleanup(this));
};

const v14GameUpdate=GameScene.prototype.update;
GameScene.prototype.update=function(time,delta) {
  v14GameUpdate.call(this,time,delta);
  if(!this.arena) return;
  updateObjects(this,time,Math.min(delta,50));
  updateNearWater(this,time);
};

const v14MenuCreate=MenuScene.prototype.create;
MenuScene.prototype.create=function() {
  v14MenuCreate.call(this);
  for(const child of this.children.list) {
    if(typeof child.text!=='string') continue;
    if(child.text.includes('MEOW WARS v1.4.0')) child.setText(child.text.replace('MEOW WARS v1.4.0','MEOW WARS v'+MW15_VERSION));
    if(child.text.includes('mw-v14-atmosphere-materials-20260918a')) child.setText(child.text.replace('mw-v14-atmosphere-materials-20260918a',MW15_BUILD));
  }
  this.add.text(640,359,'LAYERED SCENE DEPTH · FOREGROUND DETAIL · RICHER WATER + WEATHER',{
    fontFamily:'Arial Black, Arial',fontSize:'8.5px',color:'#d9f6ff',
    backgroundColor:'rgba(20,42,58,.64)',padding:{x:7,y:3}
  }).setOrigin(.5).setDepth(23);
};

const previousBuildInfo=globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion=MW15_VERSION;
document.documentElement.dataset.meowWarsBuild=MW15_BUILD;
const host=document.getElementById('game');
if(host){host.dataset.version=MW15_VERSION;host.dataset.build=MW15_BUILD;}
globalThis.__MEOW_WARS_VERSION=MW15_VERSION;
globalThis.__MEOW_WARS_BUILD=MW15_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO=()=>{
  const base=typeof previousBuildInfo==='function'?previousBuildInfo():{};
  return {
    ...base,
    version:MW15_VERSION,
    build:MW15_BUILD,
    sceneDepth:{
      cosmeticOnly:true,
      foregroundFraming:true,
      groundMicroDetail:true,
      nearWaterDetail:true,
      performanceAwareDensity:DENSITY(),
      menuTransitionAudit:true
    },
    v15Stats:{...stats}
  };
};
})();