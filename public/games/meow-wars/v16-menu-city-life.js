/* Meow Wars v1.6.0 — Menu + City Life Polish.
   Cleans the start menu and separates city road traffic from river traffic.
   Cosmetic-only environment work; gameplay, terrain, turn order and online authority are unchanged. */
(() => {
'use strict';

const MW16_VERSION = '1.6.0';
const MW16_BUILD = 'mw-v16-menu-city-life-20260918a';

const stats = globalThis.__MEOW_WARS_V16_STATS = {
  menusCleaned: 0,
  legacyTrafficRemoved: 0,
  legacyBoatsRemoved: 0,
  patrolBoatsCreated: 0,
  roadVehiclesCreated: 0,
  cityLifeFrames: 0,
  boatFrames: 0,
  roadFrames: 0,
  onlineMenuLaunches: 0
};

const MOBILE = () => (globalThis.innerWidth || 1280) < 900;
const REDUCED = () => globalThis.__MEOW_WARS_SETTINGS?.fxIntensity === 'reduced';

function safeDestroy(object) {
  try { object?.destroy?.(); } catch {}
}

function track(scene, object, kind, data={}) {
  scene.__mw16Objects ||= [];
  const item={object,kind,...data};
  scene.__mw16Objects.push(item);
  return item;
}

function cleanup(scene) {
  for (const item of scene.__mw16Objects || []) safeDestroy(item.object);
  safeDestroy(scene.__mw16Wake);
  scene.__mw16Objects=[];
  scene.__mw16Wake=null;
}

function findText(scene, predicate) {
  return scene.children.list.find((child) =>
    typeof child?.text === 'string' && predicate(child.text, child)
  );
}

function hideMenuNoise(scene) {
  const prefixes=[
    'SELECTED  ·',
    'LIVING BATTLEFIELDS ·',
    'ATMOSPHERE + MATERIAL DETAIL',
    'LAYERED SCENE DEPTH ·'
  ];
  const sideLabels=new Set(['SAME CATS','BIGGER BOOMS','PLAN','AIM','YEET']);

  for (const child of scene.children.list) {
    if (typeof child?.text !== 'string') continue;
    const text=child.text.trim();
    if (prefixes.some((prefix)=>text.startsWith(prefix)) || sideLabels.has(text)) {
      child.setVisible(false);
    }
    if (text.includes('A/D move') && text.includes('Q/E weapons')) {
      child.setText('MOVE A/D  •  AIM W/S  •  FIRE SPACE  •  WEAPONS Q/E  •  M MENU');
      child.setFontSize?.('12px');
      child.setY?.(688);
    }
  }

  const mask=scene.add.graphics().setDepth(5);
  for (const [cx,cy,flip] of [[72,300,-1],[1208,305,1]]) {
    mask.fillStyle(0x2f8145,.98);
    mask.fillCircle(cx,cy,66);
    mask.fillCircle(cx+flip*42,cy+24,48);
    mask.fillStyle(0x5eae55,.98);
    mask.fillCircle(cx-flip*18,cy-25,38);
    mask.fillCircle(cx+flip*28,cy-12,31);
    mask.fillStyle(0x7cc45c,.85);
    mask.fillCircle(cx,cy-42,22);
  }

  scene.cpuButton?.setPosition?.(365,167)?.setDisplaySize?.(235,48);
  scene.localButton?.setPosition?.(640,167)?.setDisplaySize?.(235,48);
  const cpuText=findText(scene,(text)=>text.includes('PLAYER vs CPU'));
  const localText=findText(scene,(text)=>text.includes('LOCAL 2 PLAYER'));
  cpuText?.setPosition?.(365,167);
  localText?.setPosition?.(640,167);

  const launcher=document.getElementById('mw-online-launcher');
  if (launcher) launcher.style.display='none';

  const onlineRect=scene.add.rectangle(915,167,235,48,0x176b68,1)
    .setStrokeStyle(3,0x8fffe1,.9)
    .setInteractive({useHandCursor:true})
    .setDepth(30);
  const onlineText=scene.add.text(915,167,'ONLINE 1V1',{
    fontFamily:'Arial Black, Arial',fontSize:'15px',color:'#ffffff'
  }).setOrigin(.5).setDepth(31);
  onlineRect.on('pointerover',()=>{ onlineRect.setScale(1.025); onlineText.setScale(1.025); });
  onlineRect.on('pointerout',()=>{ onlineRect.setScale(1); onlineText.setScale(1); });
  onlineRect.on('pointerdown',()=>{
    scene.sfx?.unlock?.();
    scene.sfx?.click?.();
    stats.onlineMenuLaunches+=1;
    globalThis.__MEOW_WARS_OPEN_ONLINE?.();
  });

  scene.__mw16MenuObjects=[mask,onlineRect,onlineText];

  scene.add.text(640,314,'7 BATTLEFIELDS  •  WEATHER  •  DESTRUCTIBLE PROPS  •  ONLINE 1V1',{
    fontFamily:'Arial Black, Arial',
    fontSize:'10px',
    color:'#e7f7ff',
    backgroundColor:'rgba(13,54,82,.76)',
    padding:{x:9,y:4}
  }).setOrigin(.5).setDepth(24);

  stats.menusCleaned+=1;
}

function retireLegacyCityTraffic(scene) {
  const id=scene.arena?.id;
  if (id!=='oconnell-bridge-spire' && id!=='westminster-bridge-big-ben') return;

  for (const item of scene.__mw14Objects || []) {
    if (item.kind!=='traffic') continue;
    safeDestroy(item.object);
    item.kind='retired-city-traffic';
    stats.legacyTrafficRemoved+=1;
  }

  for (const item of scene.__mw13Ambient || []) {
    if (item.kind!=='boat' && item.kind!=='boat-left') continue;
    safeDestroy(item.object);
    item.kind='retired-city-boat';
    stats.legacyBoatsRemoved+=1;
  }
}

function makePatrolBoat(scene, x, y, {label, direction=1, london=false}) {
  const c=scene.add.container(x,y).setDepth(-3);
  const hullColor=london?0xf0f4f5:0xf5f6f2;
  const stripe=london?0x224d83:0x173f76;
  const accent=london?0xe7cf42:0x4b83c7;

  const hull=scene.add.polygon(0,0,[-54,-5,50,-5,38,13,-42,13],hullColor,.97);
  const lower=scene.add.rectangle(-2,-10,75,12,stripe,.95);
  const cabin=scene.add.rectangle(-5,-24,47,20,0xd9edf4,.95);
  const glass1=scene.add.rectangle(-15,-25,14,8,0x6fa7ba,.9);
  const glass2=scene.add.rectangle(3,-25,14,8,0x6fa7ba,.9);
  const rail=scene.add.rectangle(0,-37,72,2,0xe9eef0,.88);
  const mast=scene.add.rectangle(8,-45,2,14,0x45535a,.9);
  const beacon=scene.add.circle(8,-53,3,0x3f8cff,.95);

  c.add([hull,lower,cabin,glass1,glass2,rail,mast,beacon]);

  if (london) {
    for (const dx of [-34,-20,-6,8,22,36]) {
      c.add(scene.add.rectangle(dx,-10,8,5,dx%28===0?0xe3cf42:0x2f5c91,.9));
    }
  } else {
    c.add(scene.add.rectangle(25,-24,13,8,accent,.85));
  }

  const labelText=scene.add.text(0,-9,label,{
    fontFamily:'Arial Black, Arial',fontSize:'8px',
    color:london?'#fff6a5':'#d9ecff'
  }).setOrigin(.5);
  c.add(labelText);

  c.setScale(direction,.92);
  labelText.setScale(direction,1);
  track(scene,c,direction>0?'patrol-boat-right':'patrol-boat-left',{
    speed:london?.020:.023,
    baseY:y,
    wrap:1460,
    beacon
  });
  stats.patrolBoatsCreated+=1;
  return c;
}

function makeDoubleDecker(scene,x,y,{label,color,accent,direction=1}) {
  const c=scene.add.container(x,y).setDepth(-7);
  const lower=scene.add.rectangle(0,0,98,30,color,.94);
  const upper=scene.add.rectangle(-3,-25,84,24,color,.96);
  const belt=scene.add.rectangle(0,-10,96,5,accent,.95);
  const windows=[];
  for (const [yy,count,start] of [[-27,4,-28],[-1,4,-29]]) {
    for(let i=0;i<count;i++) windows.push(scene.add.rectangle(start+i*19,yy,14,9,0x9fc5d2,.86));
  }
  const wheels=[
    scene.add.circle(-31,15,7,0x20262a,.96),
    scene.add.circle(31,15,7,0x20262a,.96)
  ];
  const lamp=scene.add.circle(direction>0?49:-49,2,3,0xffe6a3,.95);
  const tag=scene.add.text(0,7,label,{
    fontFamily:'Arial Black, Arial',fontSize:'7px',color:'#ffffff'
  }).setOrigin(.5);

  c.add([lower,upper,belt,...windows,...wheels,lamp,tag]);
  c.setScale(direction,1);
  tag.setScale(direction,1);
  track(scene,c,direction>0?'road-right':'road-left',{speed:.020,baseY:y,wrap:1480});
  stats.roadVehiclesCreated+=1;
  return c;
}

function makeSplashTour(scene,x,y,direction=-1) {
  const c=scene.add.container(x,y).setDepth(-7);
  const body=scene.add.rectangle(0,0,94,28,0xe1a72d,.96);
  const cabin=scene.add.rectangle(-6,-18,60,18,0xe9b644,.98);
  const stripe=scene.add.rectangle(0,7,92,6,0xb34334,.92);
  const glass1=scene.add.rectangle(-20,-19,16,9,0x86b7c7,.9);
  const glass2=scene.add.rectangle(0,-19,16,9,0x86b7c7,.9);
  const glass3=scene.add.rectangle(20,-19,16,9,0x86b7c7,.9);
  const wheels=[
    scene.add.circle(-29,15,7,0x20262a,.96),
    scene.add.circle(29,15,7,0x20262a,.96)
  ];
  const horn1=scene.add.triangle(-11,-31,0,7,5,0,10,7,0xf1d59a,.9).setRotation(-.35);
  const horn2=scene.add.triangle(11,-31,0,7,5,0,10,7,0xf1d59a,.9).setRotation(.35);
  const tag=scene.add.text(0,5,'SPLASH TOUR',{
    fontFamily:'Arial Black, Arial',fontSize:'6.5px',color:'#fff8d4'
  }).setOrigin(.5);
  c.add([body,cabin,stripe,glass1,glass2,glass3,...wheels,horn1,horn2,tag]);
  c.setScale(direction,1);
  tag.setScale(direction,1);
  track(scene,c,direction>0?'road-right':'road-left',{speed:.016,baseY:y,wrap:1510});
  stats.roadVehiclesCreated+=1;
  return c;
}

function addFarRoad(scene) {
  const g=scene.add.graphics().setDepth(-8);
  const id=scene.arena.id;
  const y=id==='oconnell-bridge-spire'?416:430;
  g.fillStyle(0x4f5355,.86);
  g.fillRect(0,y,1280,22);
  g.fillStyle(0xd6d0bf,.44);
  g.fillRect(0,y+20,1280,2);
  for(let x=20;x<1280;x+=86) {
    g.fillStyle(0xeee6cf,.42);
    g.fillRect(x,y+10,43,2);
  }
  track(scene,g,'road-static');
  return y;
}

function setupCityLife(scene) {
  const id=scene.arena?.id;
  if (id!=='oconnell-bridge-spire' && id!=='westminster-bridge-big-ben') return;

  retireLegacyCityTraffic(scene);
  const roadY=addFarRoad(scene);

  scene.__mw16Wake=scene.add.graphics().setDepth(-2);

  if (id==='oconnell-bridge-spire') {
    makePatrolBoat(scene,120,466,{label:'GARDA',direction:1,london:false});
    makeDoubleDecker(scene,250,roadY-5,{
      label:'DUBLIN',
      color:0x2d67a1,
      accent:0xf0c94f,
      direction:1
    });
    makeSplashTour(scene,1040,roadY-4,-1);
  } else {
    makePatrolBoat(scene,1110,474,{label:'POLICE',direction:-1,london:true});
    makeDoubleDecker(scene,220,roadY-5,{
      label:'LONDON',
      color:0xa72e3a,
      accent:0xd84a54,
      direction:1
    });
  }
}

function updateCityLife(scene,time,delta) {
  if (!scene.__mw16Objects?.length) return;
  const wake=scene.__mw16Wake;
  wake?.clear?.();

  for (const item of scene.__mw16Objects) {
    const o=item.object;
    if (!o?.active) continue;

    if (item.kind==='patrol-boat-right') {
      o.x+=item.speed*delta;
      if(o.x>item.wrap)o.x=-170;
      o.y=item.baseY+Math.sin(time*.0018)*2.3;
      if(item.beacon) item.beacon.alpha=.2+Math.max(0,Math.sin(time*.012))*.8;
      if(wake) {
        for(let i=0;i<3;i++) {
          wake.lineStyle(1.5,0xf0fcff,.13-i*.025);
          wake.beginPath();
          wake.moveTo(o.x-45-i*15,o.y+12+i*3);
          wake.lineTo(o.x-92-i*24,o.y+14+i*3);
          wake.strokePath();
        }
      }
      stats.boatFrames+=1;
    } else if (item.kind==='patrol-boat-left') {
      o.x-=item.speed*delta;
      if(o.x<-170)o.x=item.wrap;
      o.y=item.baseY+Math.sin(time*.0017)*2.2;
      if(item.beacon) item.beacon.alpha=.2+Math.max(0,Math.sin(time*.012))*.8;
      if(wake) {
        for(let i=0;i<3;i++) {
          wake.lineStyle(1.5,0xf0fcff,.13-i*.025);
          wake.beginPath();
          wake.moveTo(o.x+45+i*15,o.y+12+i*3);
          wake.lineTo(o.x+92+i*24,o.y+14+i*3);
          wake.strokePath();
        }
      }
      stats.boatFrames+=1;
    } else if (item.kind==='road-right') {
      o.x+=item.speed*delta;
      if(o.x>item.wrap)o.x=-190;
      o.y=item.baseY;
      stats.roadFrames+=1;
    } else if (item.kind==='road-left') {
      o.x-=item.speed*delta;
      if(o.x<-190)o.x=item.wrap;
      o.y=item.baseY;
      stats.roadFrames+=1;
    }
  }

  stats.cityLifeFrames+=1;
}

const v15MenuCreate=MenuScene.prototype.create;
MenuScene.prototype.create=function() {
  v15MenuCreate.call(this);

  for(const child of this.children.list) {
    if(typeof child?.text!=='string') continue;
    if(child.text.includes('MEOW WARS v1.5.0'))
      child.setText(child.text.replace('MEOW WARS v1.5.0','MEOW WARS v'+MW16_VERSION));
    if(child.text.includes('mw-v15-scene-depth-20260918a'))
      child.setText(child.text.replace('mw-v15-scene-depth-20260918a',MW16_BUILD));
  }

  hideMenuNoise(this);
};

const v15GameCreate=GameScene.prototype.create;
GameScene.prototype.create=function() {
  v15GameCreate.call(this);
  setupCityLife(this);

  const marker=this.children.getByName('mw-build-marker');
  if(marker?.setText) marker.setText('v'+MW16_VERSION+' · '+MW16_BUILD);

  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>cleanup(this));
};

const v15GameUpdate=GameScene.prototype.update;
GameScene.prototype.update=function(time,delta) {
  v15GameUpdate.call(this,time,delta);
  if(!this.arena)return;
  updateCityLife(this,time,Math.min(delta,50));
};

const previousBuildInfo=globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion=MW16_VERSION;
document.documentElement.dataset.meowWarsBuild=MW16_BUILD;
const host=document.getElementById('game');
if(host){host.dataset.version=MW16_VERSION;host.dataset.build=MW16_BUILD;}
globalThis.__MEOW_WARS_VERSION=MW16_VERSION;
globalThis.__MEOW_WARS_BUILD=MW16_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO=()=>{
  const base=typeof previousBuildInfo==='function'?previousBuildInfo():{};
  return {
    ...base,
    version:MW16_VERSION,
    build:MW16_BUILD,
    menuPolish:{
      threeModeRow:true,
      technicalRibbonsCollapsed:true,
      sideSignClutterMasked:true,
      compactControls:true
    },
    cityLife:{
      separatedTrafficBands:true,
      dublinRiver:'GARDA patrol boat',
      dublinRoad:['Dublin-style double decker','amphibious splash-tour vehicle'],
      londonRiver:'POLICE patrol boat',
      londonRoad:['red double decker']
    },
    v16Stats:{...stats}
  };
};
})();