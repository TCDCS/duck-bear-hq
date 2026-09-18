/* Meow Wars v1.3.0 — Environment Depth.
   Purely visual living-world atmosphere layered over v1.2 online/local gameplay. */
(() => {
'use strict';

const MW13_VERSION = '1.3.0';
const MW13_BUILD = 'mw-v13-environment-depth-20260918a';

const stats = globalThis.__MEOW_WARS_V13_STATS = {
  scenesEnhanced: 0,
  ambientFrames: 0,
  waterFrames: 0,
  weatherFrames: 0,
  propShadows: 0,
  movingDetails: 0,
  reflections: 0
};

const MOBILE = (globalThis.innerWidth || 1280) < 900;
const REDUCED = () => globalThis.__MEOW_WARS_SETTINGS?.fxIntensity === 'reduced';
const DETAIL_FACTOR = () => REDUCED() ? .55 : MOBILE ? .72 : 1;

function addAmbient(scene, object, kind, data = {}) {
  scene.__mw13Ambient.push({ object, kind, ...data });
  return object;
}

function safeDestroy(object) {
  try { object?.destroy?.(); } catch {}
}

function cleanup(scene) {
  for (const item of scene.__mw13Ambient || []) safeDestroy(item.object);
  for (const item of scene.__mw13PropPresentation || []) {
    safeDestroy(item.shadow);
    safeDestroy(item.glow);
    safeDestroy(item.detail);
  }
  safeDestroy(scene.__mw13Water);
  safeDestroy(scene.__mw13Weather);
  safeDestroy(scene.__mw13Static);
  safeDestroy(scene.__mw13Surface);
  safeDestroy(scene.__mw13Front);
  safeDestroy(scene.__mw13Steam);
  scene.__mw13Ambient = [];
  scene.__mw13PropPresentation = [];
  scene.__mw13Water = null;
  scene.__mw13Weather = null;
  scene.__mw13Static = null;
  scene.__mw13Surface = null;
  scene.__mw13Front = null;
  scene.__mw13Steam = null;
}

function line(g, x1, y1, x2, y2, color, alpha, width) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.strokePath();
}

function drawGardenStatic(scene, g) {
  // Clothes line and domestic garden clutter sit behind cats but above background.
  line(g, 850, 372, 850, 505, 0x5c4c3e, .9, 5);
  line(g, 1110, 365, 1110, 505, 0x5c4c3e, .9, 5);
  line(g, 850, 392, 1110, 386, 0xe9edf0, .72, 2);
  const fabrics = [
    [887,389,36,30,0xe95f73],[936,387,42,27,0x72bce7],[993,386,30,34,0xf0dc62],[1042,384,46,28,0xf2f1e8]
  ];
  for (const [x,y,w,h,c] of fabrics) {
    g.fillStyle(c,.88); g.fillRoundedRect(x,y,w,h,3);
    g.fillStyle(0xffffff,.18); g.fillRect(x+4,y+4,w-8,3);
  }
  // Hose reel and garden edging.
  g.fillStyle(0x3f765f,.9); g.fillCircle(705,491,21);
  g.fillStyle(0x173e34,.95); g.fillCircle(705,491,11);
  line(g,705,491,750,515,0x426f5c,.95,4);
}

function drawRooftopStatic(scene, g) {
  // Pipes, conduit, rooftop safety rails and more industrial detail.
  g.fillStyle(0x515a63,.92); g.fillRect(18,478,315,8);
  for (let x=26;x<330;x+=52) {
    g.fillStyle(0x6c767f,.9); g.fillRect(x,440,5,42);
  }
  line(g,26,443,327,443,0xaeb8bf,.72,3);
  g.fillStyle(0x4c555e,.85); g.fillRoundedRect(1004,428,160,46,7);
  for(let x=1018;x<1150;x+=22){line(g,x,435,x,467,0x252c31,.55,2);}
  // Roof access door.
  g.fillStyle(0x59626b,.95); g.fillRoundedRect(585,390,72,91,5);
  g.fillStyle(0x252b30,.9); g.fillRect(598,405,45,53);
  g.fillStyle(0xc3cdd3,.8); g.fillCircle(637,442,3);
}

function drawJunkyardStatic(scene, g) {
  // Chains and layered scrap outlines.
  for (let i=0;i<7;i++) {
    const x=90+i*168;
    g.fillStyle(i%2?0x77624f:0x616b70,.54);
    g.fillRoundedRect(x,462-(i%3)*7,84+(i%2)*18,31+(i%3)*6,5);
  }
  for (let y=300;y<450;y+=14) {
    g.lineStyle(2,0x32373b,.65);
    g.strokeCircle(1035,y,6);
  }
  g.fillStyle(0x282e32,.88); g.fillRoundedRect(1000,447,74,18,6);
  // Hazard stripes.
  for (let i=0;i<6;i++) {
    g.fillStyle(i%2?0xe4a63c:0x2a2d30,.9);
    g.fillRect(690+i*18,468,18,9);
  }
}

function drawTajStatic(scene, g) {
  // Formal garden path edging, pool lip and flower beds.
  g.fillStyle(0xcdbd9d,.8); g.fillRect(430,468,420,5);
  g.fillStyle(0xf2eadb,.72); g.fillRect(440,474,400,3);
  for (const x of [260,330,950,1020]) {
    g.fillStyle(0x3f7f49,.78); g.fillCircle(x,468,24);
    g.fillStyle(0x62a85e,.68); g.fillCircle(x-10,458,14);
    g.fillCircle(x+11,459,13);
    g.fillStyle(0xf2c964,.88); g.fillCircle(x,456,3);
  }
  // Distant path lamps.
  for (const x of [395,885]) {
    line(g,x,390,x,463,0x55565a,.65,3);
    g.fillStyle(0xf9e8ba,.65); g.fillCircle(x,386,6);
  }
}

function drawDublinStatic(scene, g) {
  // Wet quay paving joins, kerb detail, bollards and realistic road markings.
  g.fillStyle(0x5e5a57,.46); g.fillRect(0,496,1280,70);
  for(let x=0;x<1280;x+=78) line(g,x,500,x+42,562,0xa9a29c,.16,1);
  g.fillStyle(0xd7d0c6,.62); g.fillRect(0,496,1280,5);
  for (const x of [34,302,1218]) {
    g.fillStyle(0x252d31,.92); g.fillRoundedRect(x,461,13,40,4);
    g.fillStyle(0xb7b7a8,.68); g.fillRect(x+2,465,9,3);
  }
  // Road lane markings behind foreground terrain.
  for(let x=70;x<1210;x+=110){g.fillStyle(0xf1e9d8,.34);g.fillRect(x,535,55,4);}
}

function drawWestminsterStatic(scene, g) {
  // Bridge railing/kerb micro-detail and pavement blocks.
  g.fillStyle(0x65736d,.38); g.fillRect(0,487,1280,72);
  for(let x=0;x<1280;x+=64) line(g,x,490,x+35,558,0xc5cec9,.12,1);
  for (const x of [90,330,950,1190]) {
    g.fillStyle(0x272d31,.85); g.fillRoundedRect(x,452,11,46,4);
    g.fillStyle(0xd7bc60,.72); g.fillRect(x+2,460,7,4);
  }
}

function drawBeachStatic(scene, g) {
  // Wet-sand bands, shells and dune grass.
  g.fillStyle(0x9cc7c5,.12); g.fillRect(0,492,1280,54);
  g.fillStyle(0xffffff,.12); g.fillRect(0,495,1280,3);
  const shells=[[330,519],[612,531],[1010,521],[1180,542],[85,528]];
  for(const [x,y] of shells){
    g.fillStyle(0xf0d2b2,.65);g.fillEllipse(x,y,10,5);
    line(g,x-3,y,x+3,y,0x9f7b62,.45,1);
  }
  for(let i=0;i<22;i++){
    const x=16+i*59;
    const y=472+(i%4)*5;
    line(g,x,y,x-5+(i%3)*4,y-24-(i%5)*3,0x728d4c,.62,2);
  }
}

function drawSurfaceDetail(scene,g) {
  const id=scene.arena.id;
  const sample=(x)=>surfaceY(scene.terrain,x);

  if(id==='garden-siege'){
    for(let x=35;x<1260;x+=78){
      const y=sample(x);
      if(y>=HEIGHT)continue;
      g.fillStyle(x%3?0x87a96c:0xd8c8a2,.16);
      g.fillEllipse(x,y+5,14+(x%4),4);
    }
  }else if(id==='rooftop-rumble'){
    for(let x=30;x<1260;x+=74){
      const y=sample(x);
      if(y>=HEIGHT)continue;
      line(g,x,y+3,x+42,y+4,0xd5dbe0,.16,1);
      line(g,x+42,y+4,x+58,y+16,0x38434b,.14,1);
    }
  }else if(id==='junkyard-jamboree'){
    for(let x=28;x<1260;x+=83){
      const y=sample(x);
      if(y>=HEIGHT)continue;
      g.fillStyle(x%2?0x6e4f3c:0xb16d3d,.13);
      g.fillEllipse(x,y+7,28+(x%17),7);
      g.fillStyle(0x262d31,.18);g.fillCircle(x+12,y+5,2+(x%3));
    }
  }else if(id==='taj-mahal'){
    for(let x=35;x<1260;x+=68){
      const y=sample(x);
      if(y>=HEIGHT)continue;
      line(g,x,y+4,x+48,y+4,0xfff5df,.18,1);
      line(g,x+24,y+4,x+24,y+11,0xb9a98c,.12,1);
    }
  }else if(id==='oconnell-bridge-spire'){
    for(let x=20;x<1270;x+=58){
      const y=sample(x);
      if(y>=HEIGHT)continue;
      line(g,x,y+3,x+40,y+3,0xe8eef0,.13,1);
      line(g,x+18,y+3,x+8,y+15,0x292f33,.12,1);
      g.fillStyle(0xd9f7ff,.045);g.fillRoundedRect(x,y+6,36,7,3);
    }
  }else if(id==='westminster-bridge-big-ben'){
    for(let x=24;x<1260;x+=62){
      const y=sample(x);
      if(y>=HEIGHT)continue;
      line(g,x,y+3,x+44,y+3,0xdde5e0,.14,1);
      line(g,x+22,y+3,x+22,y+13,0x39433f,.12,1);
    }
  }else if(id==='donabate-beach'){
    for(let x=10;x<1280;x+=52){
      const y=sample(x);
      if(y>=HEIGHT)continue;
      const shimmer=.035+((x/52)%3)*.012;
      line(g,x,y+3,x+34+(x%19),y+3,0xffffff,shimmer,2);
      if(x%104===10){
        g.fillStyle(0xe8d0ae,.22);g.fillEllipse(x+18,y+7,7,3);
      }
    }
  }
}

function createStaticDetail(scene) {
  const g=scene.add.graphics().setDepth(-2);
  const surface=scene.add.graphics().setDepth(2);
  scene.__mw13Static=g;
  scene.__mw13Surface=surface;
  const id=scene.arena.id;
  if(id==='garden-siege') drawGardenStatic(scene,g);
  else if(id==='rooftop-rumble') drawRooftopStatic(scene,g);
  else if(id==='junkyard-jamboree') drawJunkyardStatic(scene,g);
  else if(id==='taj-mahal') drawTajStatic(scene,g);
  else if(id==='oconnell-bridge-spire') drawDublinStatic(scene,g);
  else if(id==='westminster-bridge-big-ben') drawWestminsterStatic(scene,g);
  else if(id==='donabate-beach') drawBeachStatic(scene,g);
  drawSurfaceDetail(scene,surface);
}

function makeBoat(scene, x, y, scale, palette, direction=1) {
  const c=scene.add.container(x,y).setDepth(-6);
  const hull=scene.add.polygon(0,0,[-44,0,44,0,31,15,-34,15],palette.hull,.95);
  const cabin=scene.add.rectangle(-3,-11,40,18,palette.cabin,.95);
  const glass1=scene.add.rectangle(-11,-12,12,8,palette.glass,.82);
  const glass2=scene.add.rectangle(6,-12,12,8,palette.glass,.82);
  const rail=scene.add.rectangle(0,-23,58,2,0xe8eef0,.7);
  const mast=scene.add.rectangle(4,-31,2,18,0x465059,.8);
  c.add([hull,cabin,glass1,glass2,rail,mast]);
  c.setScale(scale * direction,scale);
  return c;
}

function setupMovingDetails(scene) {
  const id=scene.arena.id;
  const d=DETAIL_FACTOR();

  if(id==='garden-siege') {
    // Sprinkler head + moving droplets.
    const head=scene.add.circle(620,505,6,0x65737a,.9).setDepth(-1);
    addAmbient(scene,head,'sprinkler-head',{baseX:620,baseY:505});
    for(let i=0;i<Math.round(12*d);i++){
      const drop=scene.add.circle(620,497,2.1,0xaeeeff,.62).setDepth(-1);
      addAmbient(scene,drop,'sprinkler',{phase:i/Math.max(1,Math.round(12*d)),baseX:620,baseY:500});
    }
  } else if(id==='rooftop-rumble') {
    // Steam from pipe stacks + warning beacons.
    for(let i=0;i<Math.round(7*d);i++){
      const puff=scene.add.circle(883,430,8+i*.7,0xd9edf3,.14).setDepth(-7);
      addAmbient(scene,puff,'steam',{phase:i/Math.max(1,Math.round(7*d)),baseX:883,baseY:430});
    }
    for(const [x,y] of [[200,333],[735,286],[1118,315]]){
      const light=scene.add.circle(x,y,3.2,0xff5268,.68).setDepth(-5);
      addAmbient(scene,light,'beacon',{phase:x*.01});
    }
  } else if(id==='junkyard-jamboree') {
    // Slowly swaying crane hook and occasional welding glow.
    const hook=scene.add.container(1040,265).setDepth(-5);
    const cable=scene.add.rectangle(0,39,2,78,0x242b2e,.75);
    const magnet=scene.add.ellipse(0,82,38,13,0x4c5457,.9);
    const rim=scene.add.ellipse(0,84,28,8,0x24292c,.9);
    hook.add([cable,magnet,rim]);
    addAmbient(scene,hook,'crane-hook',{baseX:1040,baseY:265});
    const weld=scene.add.circle(710,445,5,0xffcf65,.0).setDepth(-3);
    addAmbient(scene,weld,'weld',{phase:.3,baseX:710,baseY:445});
  } else if(id==='taj-mahal') {
    // Fountain jets and tiny distant birds.
    for(let i=0;i<Math.round(14*d);i++){
      const drop=scene.add.circle(640,452,2.2,0xe9ffff,.72).setDepth(-4);
      addAmbient(scene,drop,'taj-fountain',{phase:i/Math.max(1,Math.round(14*d)),baseX:640,baseY:452});
    }
    for(let i=0;i<Math.round(5*d);i++){
      const bird=scene.add.text(180+i*210,180+(i%2)*30,'⌁',{fontFamily:'Arial',fontSize:'16px',color:'#5f7580'}).setOrigin(.5).setDepth(-8).setAlpha(.48);
      addAmbient(scene,bird,'bird',{baseY:bird.y,speed:.009+i*.0015,phase:i*.7});
    }
  } else if(id==='oconnell-bridge-spire') {
    const boat=makeBoat(scene,-120,448,.78,{hull:0x244e61,cabin:0xf1ead7,glass:0x78b4c8},1);
    addAmbient(scene,boat,'boat',{speed:.025,baseY:448,wrap:1430});
    for(let i=0;i<Math.round(26*d);i++){
      const drop=scene.add.rectangle((i*53)%1280,-(i*31)%720,1.3,11,0xcdefff,.24).setDepth(7).setRotation(.12);
      addAmbient(scene,drop,'rain',{speed:440+(i%5)*35,wind:38,seed:i});
    }
  } else if(id==='westminster-bridge-big-ben') {
    const boat=makeBoat(scene,1360,458,.72,{hull:0x39434a,cabin:0xf4f0e5,glass:0x78a7ba},-1);
    addAmbient(scene,boat,'boat-left',{speed:.022,baseY:458,wrap:1470});
    for(let i=0;i<Math.round(16*d);i++){
      const drop=scene.add.rectangle((i*79)%1280,-(i*47)%720,1.2,9,0xdaf3ff,.15).setDepth(7).setRotation(.08);
      addAmbient(scene,drop,'rain',{speed:390+(i%4)*30,wind:28,seed:i+30});
    }
  } else if(id==='donabate-beach') {
    for(let i=0;i<Math.round(7*d);i++){
      const gull=scene.add.text(80+i*190,125+(i%3)*38,'⌁',{fontFamily:'Arial',fontSize:'22px',color:'#f6fbff'}).setOrigin(.5).setDepth(-6).setAlpha(.72);
      addAmbient(scene,gull,'gull',{baseY:gull.y,speed:.014+i*.0014,phase:i*.8});
    }
  }

  stats.movingDetails += scene.__mw13Ambient.length;
}

function setupPropPresentation(scene) {
  scene.__mw13PropPresentation=[];
  const shiny=new Set(['wheelbarrow','bbq','greenhouse','hvac','dish','water-tank','roof-vent','oil-drum','scrap-magnet','bike','wheelie-bin','dublin-lamp','westminster-lamp','bollard','lifebuoy']);
  const glowing=new Set(['garden-lamp','dublin-lamp','westminster-lamp']);

  for(const prop of scene.__mw11Props || []){
    if(!prop.image?.active) continue;
    const shadow=scene.add.ellipse(prop.x,prop.y+1,Math.max(24,prop.image.displayWidth*.55),9,0x10171c,.20).setDepth(7);
    const glow=glowing.has(prop.type)
      ? scene.add.circle(prop.x,prop.y-prop.image.displayHeight*.62,16,0xffe3a1,.08).setDepth(7)
      : null;
    const detail=shiny.has(prop.type)
      ? scene.add.ellipse(prop.x-prop.image.displayWidth*.12,prop.y-prop.image.displayHeight*.58,8,3,0xffffff,.18).setDepth(9)
      : null;
    scene.__mw13PropPresentation.push({prop,shadow,glow,detail});
    stats.propShadows+=1;
  }
}

function updatePropPresentation(scene,time) {
  for(const item of scene.__mw13PropPresentation || []){
    const p=item.prop;
    const active=!p.destroyed && p.image?.active;
    item.shadow?.setVisible(active);
    item.glow?.setVisible(active);
    item.detail?.setVisible(active);
    if(!active) continue;
    item.shadow.setPosition(p.x,p.y+1);
    item.shadow.setScale(Math.max(.4,1-Math.min(.35,Math.abs(p.vy||0)/1200)),1);
    if(item.glow){
      item.glow.setPosition(p.x,p.y-p.image.displayHeight*.62);
      item.glow.alpha=.06+Math.max(0,Math.sin(time*.004+p.x*.01))*.08;
      item.glow.scale=1+Math.sin(time*.003+p.x)*.1;
    }
    if(item.detail){
      item.detail.setPosition(p.x-p.image.displayWidth*.12,p.y-p.image.displayHeight*.58);
      item.detail.alpha=.10+Math.max(0,Math.sin(time*.0025+p.x*.02))*.12;
    }
  }
}

function createWaterGraphics(scene) {
  const ids=new Set(['taj-mahal','oconnell-bridge-spire','westminster-bridge-big-ben','donabate-beach']);
  if(!ids.has(scene.arena.id)) return;
  scene.__mw13Water=scene.add.graphics().setDepth(-3);
  stats.reflections+=1;
}

function updateWater(scene,time) {
  const g=scene.__mw13Water;
  if(!g) return;
  g.clear();
  const id=scene.arena.id;
  const t=time*.001;

  if(id==='oconnell-bridge-spire'){
    // Liffey: alternating soft streaks + distorted building lights.
    for(let y=420;y<493;y+=13){
      const alpha=.10+((y/13)%2)*.035;
      line(g,0,y+Math.sin(t*1.8+y*.08)*2.2,1280,y+Math.sin(t*1.6+y*.08)*2.2,0xd8f9ff,alpha,1.4);
    }
    const lights=[[165,0xffd56e],[446,0xd2f1ff],[716,0xffb56d],[912,0xd7ffe3],[1080,0xffd56e]];
    for(const [x,c] of lights){
      for(let i=0;i<5;i++){
        const yy=426+i*11;
        const w=13+i*2+Math.sin(t*2+x)*4;
        line(g,x-w,yy,x+w,yy,c,.065+(4-i)*.012,2);
      }
    }
  } else if(id==='westminster-bridge-big-ben'){
    for(let y=428;y<500;y+=12){
      line(g,0,y+Math.sin(t*1.7+y*.09)*2,1280,y+Math.sin(t*1.4+y*.07)*2,0xcdeef5,.105,1.3);
    }
    for(const [x,c] of [[225,0xffd66f],[705,0xf0f4d0],[1045,0xffc455]]){
      for(let i=0;i<6;i++) line(g,x-15-i*2,430+i*10,x+15+i*2,430+i*10,c,.05+(5-i)*.01,2);
    }
  } else if(id==='taj-mahal'){
    // Reflecting pool shimmer.
    g.fillStyle(0xa9d6cf,.10);g.fillRoundedRect(445,449,390,48,4);
    for(let y=454;y<494;y+=8){
      const shift=Math.sin(t*2.1+y*.2)*8;
      line(g,468+shift,y,812-shift,y,0xf7ffff,.14,1);
    }
    // Soft inverted marble strips.
    for(let i=0;i<7;i++){
      const x=560+i*27;
      line(g,x,456,x+Math.sin(t+i)*4,487,0xfff7e8,.055,3);
    }
  } else if(id==='donabate-beach'){
    // Three separate wave sets with moving foam.
    const base=[416,439,465];
    base.forEach((y,row)=>{
      g.lineStyle(row===0?1.5:2.2,0xf3fdff,.24-row*.035);
      g.beginPath();
      for(let x=0;x<=1280;x+=12){
        const yy=y+Math.sin(x*.019+t*(1.2+row*.22)+row)*3.5+Math.sin(x*.007-t)*2;
        if(x===0)g.moveTo(x,yy);else g.lineTo(x,yy);
      }
      g.strokePath();
    });
    // Wet sand sheen.
    for(let i=0;i<8;i++){
      const x=((i*173+t*25)%1480)-100;
      line(g,x,492+i*5,x+70,492+i*5,0xffffff,.05,2);
    }
  }
  stats.waterFrames+=1;
}

function updateAmbient(scene,time,delta) {
  const width=1280,height=720;
  for(const item of scene.__mw13Ambient || []){
    const o=item.object;
    if(!o?.active) continue;
    if(item.kind==='sprinkler'){
      const p=(time*.00042+item.phase)%1;
      const a=Math.PI*(.92+.95*p);
      const radius=118*Math.sin(Math.PI*p);
      o.x=item.baseX+Math.cos(a)*radius;
      o.y=item.baseY-Math.sin(Math.PI*p)*72;
      o.alpha=.35+Math.sin(Math.PI*p)*.55;
    }else if(item.kind==='steam'){
      const p=(time*.00022+item.phase)%1;
      o.x=item.baseX+Math.sin(p*6.28+item.phase)*12;
      o.y=item.baseY-p*92;
      o.alpha=.18*(1-p);
      o.setScale(.7+p*1.6);
    }else if(item.kind==='beacon'){
      o.alpha=.12+Math.max(0,Math.sin(time*.004+item.phase))*.72;
    }else if(item.kind==='crane-hook'){
      o.x=item.baseX+Math.sin(time*.00065)*26;
      o.y=item.baseY+Math.cos(time*.0008)*3;
      o.angle=Math.sin(time*.00075)*2.2;
    }else if(item.kind==='weld'){
      const pulse=Math.sin(time*.017+item.phase);
      o.alpha=pulse>.82?.9:pulse>.55?.32:0;
      o.setScale(pulse>.82?1.7:1);
    }else if(item.kind==='taj-fountain'){
      const p=(time*.00055+item.phase)%1;
      const side=item.phase>.5?1:-1;
      o.x=item.baseX+side*Math.sin(Math.PI*p)*(18+Math.abs(item.phase-.5)*45);
      o.y=item.baseY-Math.sin(Math.PI*p)*(38+item.phase*16);
      o.alpha=.25+Math.sin(Math.PI*p)*.65;
    }else if(item.kind==='bird'||item.kind==='gull'){
      o.x+=item.speed*delta*(item.kind==='gull'?1.9:1);
      if(o.x>width+60)o.x=-60;
      o.y=item.baseY+Math.sin(time*.0015+item.phase)*13;
      o.angle=Math.sin(time*.005+item.phase)*5;
    }else if(item.kind==='boat'){
      o.x+=item.speed*delta;
      if(o.x>item.wrap)o.x=-150;
      o.y=item.baseY+Math.sin(time*.002)*2.3;
    }else if(item.kind==='boat-left'){
      o.x-=item.speed*delta;
      if(o.x<-150)o.x=item.wrap;
      o.y=item.baseY+Math.sin(time*.0018)*2;
    }else if(item.kind==='rain'){
      o.y+=item.speed*delta/1000;
      o.x+=item.wind*delta/1000;
      if(o.y>height+20){o.y=-30-(item.seed%7)*15;o.x=(item.seed*97+time*.03)%width;}
      if(o.x>width+20)o.x-=width+40;
    }
  }
  stats.ambientFrames+=1;
  if((scene.arena.id==='oconnell-bridge-spire'||scene.arena.id==='westminster-bridge-big-ben') && !REDUCED()) stats.weatherFrames+=1;
}

function drawWake(scene, time) {
  const front=scene.__mw13Front;
  if(!front) return;
  front.clear();
  const id=scene.arena.id;
  const boatItem=(scene.__mw13Ambient||[]).find(i=>i.kind==='boat'||i.kind==='boat-left');
  if(boatItem?.object?.active){
    const b=boatItem.object;
    const dir=boatItem.kind==='boat-left'?-1:1;
    for(let i=0;i<4;i++){
      const x1=b.x-dir*(35+i*17), y=b.y+16+i*3;
      line(front,x1,y,x1-dir*(45+i*22),y+Math.sin(time*.003+i)*2,0xf0fcff,.12-i*.018,1.5);
    }
  }
  if(id==='donabate-beach'){
    // Foreground foam fragments that make the surf read as breaking waves.
    for(let i=0;i<9;i++){
      const x=((i*157+time*.018)%1420)-70;
      const y=477+(i%3)*5+Math.sin(time*.002+i)*2;
      line(front,x,y,x+28+(i%4)*7,y,0xffffff,.09,2);
    }
  }
}

function setupScene(scene) {
  cleanup(scene);
  scene.__mw13Ambient=[];
  scene.__mw13PropPresentation=[];
  scene.__mw13Front=scene.add.graphics().setDepth(-1);
  createStaticDetail(scene);
  createWaterGraphics(scene);
  setupMovingDetails(scene);
  setupPropPresentation(scene);
  scene.__mw13EnvironmentName={
    'garden-siege':'Bright Garden',
    'rooftop-rumble':'City Dusk',
    'junkyard-jamboree':'Industrial Haze',
    'taj-mahal':'Golden Garden',
    'oconnell-bridge-spire':'Rainy Liffey',
    'westminster-bridge-big-ben':'Thames Overcast',
    'donabate-beach':'Breezy Tide'
  }[scene.arena.id]||'Living World';
  stats.scenesEnhanced+=1;
}

const v12Create=GameScene.prototype.create;
GameScene.prototype.create=function(){
  v12Create.call(this);
  setupScene(this);
  const marker=this.children.getByName('mw-build-marker');
  if(marker?.setText)marker.setText('v'+MW13_VERSION+' · '+MW13_BUILD);
  const badge=this.add.text(1245,681,this.__mw13EnvironmentName.toUpperCase(),{
    fontFamily:'Arial Black, Arial',fontSize:'9px',color:'#dff5ff',
    backgroundColor:'rgba(7,25,43,.62)',padding:{x:6,y:3}
  }).setOrigin(1,.5).setDepth(118);
  sceneTrack(this,badge);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>cleanup(this));
};

function sceneTrack(scene,object){
  scene.__mw13Ambient ||= [];
  scene.__mw13Ambient.push({object,kind:'static-ui'});
  return object;
}

const v12Update=GameScene.prototype.update;
GameScene.prototype.update=function(time,delta){
  v12Update.call(this,time,delta);
  if(!this.arena)return;
  updateAmbient(this,time,Math.min(delta,50));
  updateWater(this,time);
  updatePropPresentation(this,time);
  drawWake(this,time);
};

const v12MenuCreate=MenuScene.prototype.create;
MenuScene.prototype.create=function(){
  v12MenuCreate.call(this);
  for(const child of this.children.list){
    if(typeof child.text!=='string')continue;
    if(child.text.includes('MEOW WARS v1.2.0')) child.setText(child.text.replace('MEOW WARS v1.2.0','MEOW WARS v'+MW13_VERSION));
    if(child.text.includes('mw-v12-online-rooms-20260918a')) child.setText(child.text.replace('mw-v12-online-rooms-20260918a',MW13_BUILD));
  }
  this.add.text(640,325,'LIVING BATTLEFIELDS · DEEPER WATER, WEATHER & WORLD DETAIL',{
    fontFamily:'Arial Black, Arial',fontSize:'9px',color:'#e7f7ff',
    backgroundColor:'rgba(13,54,82,.72)',padding:{x:7,y:3}
  }).setOrigin(.5).setDepth(22);
};

const previousBuildInfo=globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion=MW13_VERSION;
document.documentElement.dataset.meowWarsBuild=MW13_BUILD;
const host=document.getElementById('game');
if(host){host.dataset.version=MW13_VERSION;host.dataset.build=MW13_BUILD;}
globalThis.__MEOW_WARS_VERSION=MW13_VERSION;
globalThis.__MEOW_WARS_BUILD=MW13_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO=()=>{
  const base=typeof previousBuildInfo==='function'?previousBuildInfo():{};
  return {
    ...base,
    version:MW13_VERSION,
    build:MW13_BUILD,
    environmentDepth:{
      water:true,
      weather:['Dublin rain','Westminster drizzle'],
      atmosphere:true,
      propContactShadows:true,
      mapSpecificMotion:true,
      performanceDensity:DETAIL_FACTOR()
    },
    v13Stats:{...stats}
  };
};
})();