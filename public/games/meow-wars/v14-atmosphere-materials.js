/* Meow Wars v1.4.0 — Atmosphere + Materials.
   Cosmetic-only lighting, wet-surface realism and material-specific prop reactions.
   Does not mutate terrain, health, weapons, ammo, turn order or online authority. */
(() => {
'use strict';

const MW14_VERSION = '1.4.0';
const MW14_BUILD = 'mw-v14-atmosphere-materials-20260918a';

const stats = globalThis.__MEOW_WARS_V14_STATS = {
  scenesLit: 0,
  lightingFrames: 0,
  surfaceFrames: 0,
  materialHits: 0,
  materialBursts: 0,
  damageStates: 0,
  trafficPasses: 0,
  mistFrames: 0,
  cloudShadowFrames: 0,
  propMaterialDetails: 0
};

const REDUCED = () => globalThis.__MEOW_WARS_SETTINGS?.fxIntensity === 'reduced';
const MOBILE = () => (globalThis.innerWidth || 1280) < 900;
const DENSITY = () => REDUCED() ? .5 : MOBILE() ? .72 : 1;

const PROP_MATERIAL = Object.freeze({
  wheelbarrow:'metal', bbq:'metal', greenhouse:'glass', 'garden-chair':'metal',
  hvac:'metal', dish:'metal', 'water-tank':'metal', 'roof-vent':'metal',
  'car-shell':'metal', tyres:'rubber', 'oil-drum':'metal', 'scrap-magnet':'metal',
  'stone-bench':'stone', 'garden-lamp':'metal', 'stone-planter':'stone',
  'dublin-lamp':'metal', 'pub-barrels':'wood', bike:'metal', 'wheelie-bin':'plastic',
  'westminster-lamp':'metal', bench:'wood', bollard:'metal',
  driftwood:'wood', lifebuoy:'plastic', 'dune-fence':'wood', 'beach-sign':'wood'
});

const ARENA_MOOD = Object.freeze({
  'garden-siege': { name:'Warm Afternoon', tint:0xffe2a2, alpha:.055, glow:0xfff1b0 },
  'rooftop-rumble': { name:'Neon Dusk', tint:0x5b65a6, alpha:.095, glow:0x7fe8ff },
  'junkyard-jamboree': { name:'Rust Sunset', tint:0xd88745, alpha:.07, glow:0xffc86f },
  'taj-mahal': { name:'Golden Hour', tint:0xffcf82, alpha:.072, glow:0xffe4a3 },
  'oconnell-bridge-spire': { name:'Rainy Evening', tint:0x42687b, alpha:.105, glow:0xffd58f },
  'westminster-bridge-big-ben': { name:'Thames Evening', tint:0x566b78, alpha:.095, glow:0xffcd73 },
  'donabate-beach': { name:'Sea Mist', tint:0x8dc7d2, alpha:.068, glow:0xe9fbff }
});

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
  scene.__mw14Objects ||= [];
  const item={object,kind,...data};
  scene.__mw14Objects.push(item);
  return item;
}

function cleanup(scene) {
  for(const item of scene.__mw14Objects || []) safeDestroy(item.object);
  for(const entry of scene.__mw14DamagePresentation || []) {
    safeDestroy(entry.cracks);
    safeDestroy(entry.scuff);
    safeDestroy(entry.materialDetail);
  }
  safeDestroy(scene.__mw14Surface);
  safeDestroy(scene.__mw14Lighting);
  safeDestroy(scene.__mw14Front);
  scene.__mw14Objects=[];
  scene.__mw14DamagePresentation=[];
  scene.__mw14Surface=null;
  scene.__mw14Lighting=null;
  scene.__mw14Front=null;
}

function setupLighting(scene) {
  const mood=ARENA_MOOD[scene.arena.id] || ARENA_MOOD['garden-siege'];
  scene.__mw14Mood=mood;
  const lighting=scene.add.graphics().setDepth(-9);
  scene.__mw14Lighting=lighting;

  // Broad atmospheric tint; kept deliberately light so gameplay silhouettes stay readable.
  lighting.fillStyle(mood.tint,mood.alpha);
  lighting.fillRect(0,0,1280,720);

  const id=scene.arena.id;
  if(id==='garden-siege') {
    lighting.fillStyle(0xfff1b0,.055);
    lighting.fillCircle(1110,92,180);
  } else if(id==='rooftop-rumble') {
    lighting.fillStyle(0x414a8b,.08); lighting.fillRect(0,0,1280,370);
    lighting.fillStyle(0xff6bb5,.025); lighting.fillRect(0,270,1280,210);
  } else if(id==='junkyard-jamboree') {
    lighting.fillStyle(0xf6a45d,.055); lighting.fillCircle(1180,150,220);
  } else if(id==='taj-mahal') {
    // Soft diagonal golden shafts.
    lighting.fillStyle(0xffe8ae,.035);
    lighting.fillTriangle(1050,0,1280,0,760,720);
    lighting.fillTriangle(860,0,1010,0,590,720);
  } else if(id==='oconnell-bridge-spire') {
    lighting.fillStyle(0x243b4a,.06); lighting.fillRect(0,0,1280,720);
  } else if(id==='westminster-bridge-big-ben') {
    lighting.fillStyle(0x314651,.055); lighting.fillRect(0,0,1280,720);
  } else if(id==='donabate-beach') {
    lighting.fillStyle(0xdaf6f7,.035); lighting.fillRect(0,120,1280,440);
  }

  stats.scenesLit+=1;
}

function setupAtmosphere(scene) {
  const id=scene.arena.id;
  const d=DENSITY();

  if(id==='garden-siege') {
    for(let i=0;i<Math.max(2,Math.round(4*d));i++) {
      const shadow=scene.add.ellipse(-180-i*280,505+(i%2)*18,240+i*25,35,0x284b39,.055).setDepth(3);
      track(scene,shadow,'cloud-shadow',{speed:.008+i*.0015,baseY:shadow.y,phase:i*.7});
    }
    for(let i=0;i<Math.round(5*d);i++) {
      const bee=scene.add.text(160+i*230,365+(i%3)*35,'•',{fontFamily:'Arial Black',fontSize:'12px',color:'#e0b43e'}).setDepth(4).setAlpha(.72);
      track(scene,bee,'bee',{baseX:bee.x,baseY:bee.y,phase:i*.9});
    }
  } else if(id==='rooftop-rumble') {
    for(const [x,y,c] of [[240,300,0x5df3dc],[590,342,0xff6eb0],[910,300,0x7ee8ff],[1130,346,0xffca61]]) {
      const glow=scene.add.circle(x,y,12,c,.06).setDepth(-4);
      track(scene,glow,'neon',{phase:x*.01});
    }
    const plane=scene.add.container(-120,135).setDepth(-12).setAlpha(.42);
    const body=scene.add.rectangle(0,0,54,4,0xc5d7e1,.8);
    const wing=scene.add.rectangle(-2,0,19,12,0xaabdc8,.72);
    const lamp=scene.add.circle(26,0,2.2,0xff6f6f,.9);
    plane.add([body,wing,lamp]);
    track(scene,plane,'plane',{speed:.014,baseY:135});
  } else if(id==='junkyard-jamboree') {
    for(let i=0;i<Math.round(14*d);i++) {
      const mote=scene.add.circle((i*97)%1280,250+(i*43)%280,1.5+(i%3),i%2?0xe7b272:0xb99369,.18).setDepth(-2);
      track(scene,mote,'dust',{phase:i*.6,baseX:mote.x,baseY:mote.y});
    }
  } else if(id==='taj-mahal') {
    for(let i=0;i<Math.round(8*d);i++) {
      const petal=scene.add.ellipse(160+i*137,290+(i%4)*42,7,3,i%2?0xf6e4ce:0xffcbd7,.45).setDepth(5).setRotation(i*.4);
      track(scene,petal,'petal',{phase:i*.8,baseY:petal.y,speed:.009+i*.0007});
    }
  } else if(id==='oconnell-bridge-spire') {
    setupDublinLightLife(scene,d);
  } else if(id==='westminster-bridge-big-ben') {
    setupWestminsterLightLife(scene,d);
  } else if(id==='donabate-beach') {
    for(let i=0;i<Math.round(8*d);i++) {
      const mist=scene.add.ellipse(-180+i*210,430+(i%3)*30,220+(i%2)*80,34,0xe7f8fa,.035).setDepth(-2);
      track(scene,mist,'mist',{speed:.005+i*.0006,baseY:mist.y,phase:i*.5});
    }
  }
}

function setupDublinLightLife(scene,d) {
  // Warm shop/pub/window pools and moving headlight reflections across wet paving.
  const glows=[
    [185,354,0xffdc84,22],[460,336,0xffb96e,28],[685,326,0xffd68e,24],[918,345,0xffe6b0,20],[1090,348,0xffc76b,22]
  ];
  for(const [x,y,c,r] of glows) {
    const glow=scene.add.circle(x,y,r,c,.045).setDepth(-3);
    track(scene,glow,'window-glow',{phase:x*.013});
  }
  const taxi=scene.add.container(-140,407).setDepth(-5);
  taxi.add([
    scene.add.rectangle(0,0,82,25,0x40494e,.78),
    scene.add.rectangle(-7,-14,48,13,0x66757d,.7),
    scene.add.circle(-26,12,6,0x20262a,.9),
    scene.add.circle(26,12,6,0x20262a,.9),
    scene.add.circle(42,-1,3,0xffe8aa,.95)
  ]);
  track(scene,taxi,'traffic',{speed:.026,baseY:407,wrap:1430});
  stats.trafficPasses+=1;
}

function setupWestminsterLightLife(scene,d) {
  for(const [x,y] of [[140,350],[300,340],[730,330],[980,345],[1140,335]]) {
    const glow=scene.add.circle(x,y,17,0xffd27f,.045).setDepth(-4);
    track(scene,glow,'window-glow',{phase:x*.011});
  }
  const bus=scene.add.container(-160,401).setDepth(-5);
  bus.add([
    scene.add.rectangle(0,0,90,31,0xa32c38,.76),
    scene.add.rectangle(-5,-24,76,22,0xb63543,.78),
    scene.add.rectangle(-22,-25,19,10,0x8fb0bd,.72),
    scene.add.rectangle(2,-25,19,10,0x8fb0bd,.72),
    scene.add.rectangle(26,-25,19,10,0x8fb0bd,.72),
    scene.add.circle(-28,14,6,0x20262a,.9),
    scene.add.circle(28,14,6,0x20262a,.9),
    scene.add.circle(44,-2,3,0xffe6a3,.95)
  ]);
  track(scene,bus,'traffic',{speed:.020,baseY:401,wrap:1450});
  stats.trafficPasses+=1;
}

function setupSurface(scene) {
  scene.__mw14Surface=scene.add.graphics().setDepth(4);
  scene.__mw14Front=scene.add.graphics().setDepth(6);
}

function updateSurface(scene,time) {
  const g=scene.__mw14Surface;
  const front=scene.__mw14Front;
  if(!g||!front||!scene.terrain)return;
  g.clear();
  front.clear();
  const id=scene.arena.id;
  const t=time*.001;

  if(id==='oconnell-bridge-spire'||id==='westminster-bridge-big-ben') {
    const colors=id==='oconnell-bridge-spire'
      ? [0xffd776,0xc9efff,0xffb36b]
      : [0xffd275,0xd9edf7,0xffb966];
    for(let x=35,i=0;x<1260;x+=82,i++) {
      const y=surfaceY(scene.terrain,x);
      if(y>=HEIGHT)continue;
      const w=18+Math.sin(t*2+i)*8;
      line(g,x-w,y+5,x+w,y+5,colors[i%colors.length],.045,2);
      if(i%2===0) line(g,x-w*.55,y+9,x+w*.55,y+9,colors[i%colors.length],.025,1.5);
    }
    // Headlight streaks are deliberately surface-only and cosmetic.
    const travel=((t*62)%1480)-100;
    const y=surfaceY(scene.terrain,Math.max(0,Math.min(1279,travel)));
    if(y<HEIGHT) {
      line(front,travel-38,y+4,travel+25,y+4,0xffe7ad,.11,3);
      line(front,travel-28,y+8,travel+16,y+8,0xffbd6c,.055,2);
    }
  } else if(id==='donabate-beach') {
    for(let x=25,i=0;x<1260;x+=72,i++) {
      const y=surfaceY(scene.terrain,x);
      if(y>=HEIGHT)continue;
      const shift=Math.sin(t*1.6+i)*9;
      line(g,x+shift,y+3,x+38+shift,y+3,0xe9fdff,.06,2);
    }
  } else if(id==='taj-mahal') {
    for(const x of [470,530,590,650,710,770]) {
      const shimmer=Math.sin(t*2+x*.03)*7;
      line(g,x-14+shimmer,480,x+14+shimmer,480,0xfff6df,.05,2);
    }
  } else if(id==='rooftop-rumble') {
    for(let x=80;x<1220;x+=140) {
      const y=surfaceY(scene.terrain,x);
      if(y>=HEIGHT)continue;
      line(g,x,y+3,x+55,y+3,x%280?0x8eeeff:0xff79b9,.035,2);
    }
  }

  stats.surfaceFrames+=1;
}

function materialFor(prop) {
  return PROP_MATERIAL[prop?.type] || 'stone';
}

function burstPalette(material, prop) {
  if(material==='glass') return [0xdffaff,0x8fd8e8,0xffffff];
  if(material==='metal') return [0xffd768,0xe9f1f4,0x7f8a90];
  if(material==='wood') return [0xd5a06d,0x8b5738,0x5f3b27];
  if(material==='rubber') return [0x2b2d31,0x565b61,0x17191c];
  if(material==='plastic') {
    if(prop?.type==='wheelie-bin') return [0x2f8058,0x82b99c,0x183f2e];
    if(prop?.type==='lifebuoy') return [0xef5a4f,0xffffff,0xb43b35];
    return [0x6daec5,0xd9f0f6,0x3a7185];
  }
  return [0xd9d0bd,0x9f9584,0x746d63];
}

function spawnMaterialBurst(scene,prop,intensity=1) {
  if(!prop||!scene)return;
  const material=materialFor(prop);
  const palette=burstPalette(material,prop);
  const count=Math.max(4,Math.round((material==='glass'?12:material==='metal'?9:7)*DENSITY()*intensity));

  for(let i=0;i<count;i++) {
    const color=palette[i%palette.length];
    let object;
    if(material==='glass') {
      const g=scene.add.triangle(prop.x,prop.y-25,0,8,5,0,10,8,color,.72).setDepth(48);
      object=g;
    } else if(material==='metal') {
      object=scene.add.rectangle(prop.x,prop.y-24,8+Math.random()*8,2,color,.9).setDepth(48);
    } else if(material==='wood') {
      object=scene.add.rectangle(prop.x,prop.y-20,9+Math.random()*11,2.8,color,.82).setDepth(47);
    } else {
      object=scene.add.rectangle(prop.x,prop.y-20,5+Math.random()*8,4+Math.random()*5,color,.72).setDepth(47);
    }

    const angle=-Math.PI+Math.random()*Math.PI*1.5;
    const dist=(20+Math.random()*45)*intensity;
    scene.tweens.add({
      targets:object,
      x:prop.x+Math.cos(angle)*dist,
      y:prop.y-24+Math.sin(angle)*dist*.72-10,
      rotation:(object.rotation||0)+(Math.random()-.5)*4,
      alpha:0,
      duration:250+Math.random()*330,
      ease:'Cubic.Out',
      onComplete:()=>object.destroy()
    });
  }

  if(material==='metal') {
    const flash=scene.add.circle(prop.x,prop.y-24,5,0xffe6a0,.75).setDepth(49);
    scene.tweens.add({targets:flash,alpha:0,scale:2.2,duration:120,onComplete:()=>flash.destroy()});
  } else if(material==='glass') {
    const flash=scene.add.circle(prop.x,prop.y-30,8,0xe8fbff,.16).setDepth(49);
    scene.tweens.add({targets:flash,alpha:0,scale:2.7,duration:180,onComplete:()=>flash.destroy()});
  }

  stats.materialBursts+=1;
}

function snapshotProps(scene) {
  return (scene.__mw11Props || []).map((prop)=>({
    prop,
    hp:Number(prop.hp||0),
    destroyed:Boolean(prop.destroyed)
  }));
}

function reactToPropChanges(scene,before,source='blast') {
  const after=scene.__mw11Props || [];
  for(let i=0;i<Math.min(before.length,after.length);i++) {
    const was=before[i];
    const prop=after[i];
    if(!prop)continue;
    const damage=Math.max(0,was.hp-Number(prop.hp||0));
    const destroyedNow=!was.destroyed&&Boolean(prop.destroyed);
    if(damage>.2||destroyedNow) {
      spawnMaterialBurst(scene,prop,destroyedNow?1.5:Math.min(1,.45+damage/50));
      stats.materialHits+=1;
    }
  }
}

function drawPropMaterialDetail(graphics,prop) {
  graphics.clear();
  if(!prop?.image?.active||prop.destroyed)return;

  const material=materialFor(prop);
  const w=Math.max(26,prop.image.displayWidth||60);
  const h=Math.max(30,prop.image.displayHeight||70);
  const x=prop.x;
  const y=prop.y;

  if(material==='metal') {
    // Narrow seams, rivets and a restrained specular edge make metal read as fabricated rather than flat.
    graphics.lineStyle(1.1,0xeaf2f4,.22);
    graphics.beginPath(); graphics.moveTo(x-w*.22,y-h*.64); graphics.lineTo(x+w*.18,y-h*.64); graphics.strokePath();
    graphics.lineStyle(1,0x1f292e,.24);
    graphics.beginPath(); graphics.moveTo(x-w*.20,y-h*.33); graphics.lineTo(x+w*.22,y-h*.33); graphics.strokePath();
    graphics.fillStyle(0xd7e0e3,.38);
    for(const dx of [-.18,.18]) graphics.fillCircle(x+w*dx,y-h*.49,1.6);
  } else if(material==='glass') {
    // Multi-angle highlights suggest panes and thickness without obscuring the greenhouse.
    graphics.lineStyle(1.5,0xf3fdff,.34);
    graphics.beginPath(); graphics.moveTo(x-w*.31,y-h*.73); graphics.lineTo(x-w*.06,y-h*.42); graphics.strokePath();
    graphics.lineStyle(1,0x9ed8e8,.22);
    graphics.beginPath(); graphics.moveTo(x+w*.03,y-h*.75); graphics.lineTo(x+w*.29,y-h*.46); graphics.strokePath();
    graphics.fillStyle(0xffffff,.11); graphics.fillRect(x-w*.28,y-h*.66,w*.09,h*.26);
  } else if(material==='wood') {
    graphics.lineStyle(1,0x4c301f,.22);
    for(let i=0;i<3;i++){
      const yy=y-h*(.56-i*.13);
      graphics.beginPath(); graphics.moveTo(x-w*.28,yy); graphics.lineTo(x+w*.28,yy+Math.sin(i+prop.x)*2); graphics.strokePath();
    }
    graphics.lineStyle(1,0xe0b783,.16);
    graphics.beginPath(); graphics.moveTo(x-w*.18,y-h*.69); graphics.lineTo(x+w*.12,y-h*.67); graphics.strokePath();
  } else if(material==='rubber') {
    // Tyre-like diagonal tread marks.
    graphics.lineStyle(1.4,0x81878b,.18);
    for(let i=-2;i<=2;i++){
      const xx=x+i*w*.09;
      graphics.beginPath(); graphics.moveTo(xx-w*.05,y-h*.58); graphics.lineTo(xx+w*.05,y-h*.44); graphics.strokePath();
    }
  } else if(material==='plastic') {
    graphics.lineStyle(1,0xe4fbff,.18);
    graphics.beginPath(); graphics.moveTo(x-w*.24,y-h*.62); graphics.lineTo(x+w*.22,y-h*.62); graphics.strokePath();
    graphics.lineStyle(1,0x163d47,.18);
    graphics.beginPath(); graphics.moveTo(x,y-h*.60); graphics.lineTo(x,y-h*.25); graphics.strokePath();
  } else {
    // Stone gets edge lines plus tiny chips.
    graphics.lineStyle(1,0xf4efe5,.17);
    graphics.beginPath(); graphics.moveTo(x-w*.27,y-h*.57); graphics.lineTo(x+w*.25,y-h*.57); graphics.strokePath();
    graphics.fillStyle(0x6f685f,.16);
    graphics.fillCircle(x-w*.15,y-h*.38,2); graphics.fillCircle(x+w*.19,y-h*.46,1.6);
  }
}

function setupDamagePresentation(scene) {
  scene.__mw14DamagePresentation=[];
  for(const prop of scene.__mw11Props || []) {
    if(!prop.image?.active)continue;
    const materialDetail=scene.add.graphics().setDepth(9);
    const cracks=scene.add.graphics().setDepth(10);
    const scuff=scene.add.ellipse(prop.x,prop.y-18,18,7,0x201b18,0).setDepth(10);
    drawPropMaterialDetail(materialDetail,prop);
    scene.__mw14DamagePresentation.push({prop,materialDetail,cracks,scuff,lastBand:0});
    stats.propMaterialDetails+=1;
  }
}

function updateDamagePresentation(scene) {
  for(const entry of scene.__mw14DamagePresentation || []) {
    const prop=entry.prop;
    const visible=!prop.destroyed&&prop.image?.active;
    entry.materialDetail?.setVisible(visible);
    entry.cracks.setVisible(visible);
    entry.scuff.setVisible(visible);
    if(!visible)continue;
    drawPropMaterialDetail(entry.materialDetail,prop);

    const ratio=Math.max(0,Math.min(1,(prop.hp||0)/(prop.maxHp||1)));
    const band=ratio<.25?3:ratio<.5?2:ratio<.75?1:0;
    entry.cracks.clear();
    entry.scuff.setPosition(prop.x,prop.y-18);
    entry.scuff.alpha=band===0?0:.035+.035*band;
    if(!band)continue;

    const color=materialFor(prop)==='glass'?0xd7f6ff:materialFor(prop)==='metal'?0x222b30:0x443126;
    entry.cracks.lineStyle(1.4,color,.22+.11*band);
    for(let i=0;i<band+1;i++) {
      const x=prop.x+(i-1)*7;
      const y=prop.y-30-i*4;
      entry.cracks.beginPath();
      entry.cracks.moveTo(x,y);
      entry.cracks.lineTo(x+8,y+7);
      entry.cracks.lineTo(x+3,y+15);
      entry.cracks.strokePath();
    }
    if(band!==entry.lastBand) {
      entry.lastBand=band;
      stats.damageStates+=1;
    }
  }
}

function updateAtmosphere(scene,time,delta) {
  for(const item of scene.__mw14Objects || []) {
    const o=item.object;
    if(!o?.active)continue;

    if(item.kind==='cloud-shadow') {
      o.x+=item.speed*delta;
      if(o.x>1460)o.x=-240;
      o.y=item.baseY+Math.sin(time*.0008+item.phase)*8;
      stats.cloudShadowFrames+=1;
    } else if(item.kind==='bee') {
      o.x=item.baseX+Math.sin(time*.0016+item.phase)*35;
      o.y=item.baseY+Math.cos(time*.0023+item.phase)*11;
    } else if(item.kind==='neon'||item.kind==='window-glow') {
      o.alpha=.025+Math.max(0,Math.sin(time*.0025+item.phase))*.065;
    } else if(item.kind==='plane') {
      o.x+=item.speed*delta;
      if(o.x>1420)o.x=-160;
      o.y=item.baseY+Math.sin(time*.0008)*4;
    } else if(item.kind==='dust') {
      o.x=item.baseX+Math.sin(time*.0007+item.phase)*22;
      o.y=item.baseY-Math.sin(time*.00045+item.phase)*18;
      o.alpha=.08+Math.max(0,Math.sin(time*.001+item.phase))*.15;
    } else if(item.kind==='petal') {
      o.x+=item.speed*delta;
      if(o.x>1320)o.x=-30;
      o.y=item.baseY+Math.sin(time*.0013+item.phase)*18;
      o.rotation+=delta*.00035;
    } else if(item.kind==='traffic') {
      o.x+=item.speed*delta;
      if(o.x>item.wrap)o.x=-170;
      o.y=item.baseY+Math.sin(time*.003)*1.2;
    } else if(item.kind==='mist') {
      o.x+=item.speed*delta;
      if(o.x>1450)o.x=-250;
      o.y=item.baseY+Math.sin(time*.0007+item.phase)*6;
      stats.mistFrames+=1;
    }
  }
  stats.lightingFrames+=1;
}

function setupScene(scene) {
  cleanup(scene);
  scene.__mw14Objects=[];
  setupLighting(scene);
  setupAtmosphere(scene);
  setupSurface(scene);
  setupDamagePresentation(scene);
  scene.__mw14MoodName=ARENA_MOOD[scene.arena.id]?.name || 'Atmospheric';
}

const v13Create=GameScene.prototype.create;
GameScene.prototype.create=function() {
  v13Create.call(this);
  setupScene(this);
  const marker=this.children.getByName('mw-build-marker');
  if(marker?.setText)marker.setText('v'+MW14_VERSION+' · '+MW14_BUILD);
  const badge=this.add.text(1245,171,this.__mw14MoodName.toUpperCase(),{
    fontFamily:'Arial Black, Arial',fontSize:'9px',color:'#fff4d8',
    backgroundColor:'rgba(23,30,42,.62)',padding:{x:6,y:3}
  }).setOrigin(1,.5).setDepth(119);
  track(this,badge,'static-ui');
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>cleanup(this));
};

const v13Update=GameScene.prototype.update;
GameScene.prototype.update=function(time,delta) {
  v13Update.call(this,time,delta);
  if(!this.arena)return;
  updateAtmosphere(this,time,Math.min(delta,50));
  updateSurface(this,time);
  updateDamagePresentation(this);
};

const v13Explode=GameScene.prototype.explode;
GameScene.prototype.explode=function(x,y,weapon,ownerId) {
  const before=snapshotProps(this);
  const result=v13Explode.call(this,x,y,weapon,ownerId);
  reactToPropChanges(this,before,'blast');
  return result;
};

const v13DrawTracer=GameScene.prototype.drawTracer;
GameScene.prototype.drawTracer=function(x1,y1,x2,y2,color) {
  const before=snapshotProps(this);
  const result=v13DrawTracer.call(this,x1,y1,x2,y2,color);
  reactToPropChanges(this,before,'bullet');
  return result;
};

const v13MenuCreate=MenuScene.prototype.create;
MenuScene.prototype.create=function() {
  v13MenuCreate.call(this);
  for(const child of this.children.list) {
    if(typeof child.text!=='string')continue;
    if(child.text.includes('MEOW WARS v1.3.0'))
      child.setText(child.text.replace('MEOW WARS v1.3.0','MEOW WARS v'+MW14_VERSION));
    if(child.text.includes('mw-v13-environment-depth-20260918a'))
      child.setText(child.text.replace('mw-v13-environment-depth-20260918a',MW14_BUILD));
  }
  this.add.text(640,344,'ATMOSPHERE + MATERIAL DETAIL · GLASS · METAL · WOOD · WET SURFACES',{
    fontFamily:'Arial Black, Arial',fontSize:'8.5px',color:'#fff4d8',
    backgroundColor:'rgba(70,51,39,.66)',padding:{x:7,y:3}
  }).setOrigin(.5).setDepth(23);
};

const previousBuildInfo=globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion=MW14_VERSION;
document.documentElement.dataset.meowWarsBuild=MW14_BUILD;
const host=document.getElementById('game');
if(host){host.dataset.version=MW14_VERSION;host.dataset.build=MW14_BUILD;}
globalThis.__MEOW_WARS_VERSION=MW14_VERSION;
globalThis.__MEOW_WARS_BUILD=MW14_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO=()=>{
  const base=typeof previousBuildInfo==='function'?previousBuildInfo():{};
  return {
    ...base,
    version:MW14_VERSION,
    build:MW14_BUILD,
    atmosphereMaterials:{
      cosmeticOnly:true,
      materials:['glass','metal','wood','rubber','plastic','stone'],
      mapMoods:Object.fromEntries(Object.entries(ARENA_MOOD).map(([id,m])=>[id,m.name])),
      wetSurfaceLight:true,
      materialDamageStates:true,
      propMaterialMicroDetail:true,
      mobileDensity:DENSITY()
    },
    v14Stats:{...stats}
  };
};
})();
