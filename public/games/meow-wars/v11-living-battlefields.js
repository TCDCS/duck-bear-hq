/* Meow Wars v1.1.0 — Living Battlefields.
   Fixes menu -> new battlefield transitions and adds richer destructible environment props. */
(() => {
'use strict';

const MW11_VERSION = '1.1.0';
const MW11_BUILD = 'mw-v11-living-battlefields-20260918a';

const stats = globalThis.__MEOW_WARS_V11_STATS = {
  menuReturns: 0,
  requestedArenaStarts: 0,
  confirmedArenaStarts: 0,
  propsCreated: 0,
  propsDamaged: 0,
  propsDestroyed: 0,
  propFalls: 0,
  propDebris: 0
};

const PROP_DEFS = {
  'garden-siege': [
    { type:'wheelbarrow', x:178, scale:.78, hp:52 },
    { type:'bbq', x:408, scale:.72, hp:42 },
    { type:'greenhouse', x:1030, scale:.72, hp:82 },
    { type:'garden-chair', x:744, scale:.70, hp:35 }
  ],
  'rooftop-rumble': [
    { type:'hvac', x:190, scale:.76, hp:74 },
    { type:'dish', x:520, scale:.72, hp:42 },
    { type:'water-tank', x:905, scale:.82, hp:90 },
    { type:'roof-vent', x:1160, scale:.72, hp:46 }
  ],
  'junkyard-jamboree': [
    { type:'car-shell', x:214, scale:.84, hp:90 },
    { type:'tyres', x:500, scale:.76, hp:50 },
    { type:'oil-drum', x:822, scale:.72, hp:45 },
    { type:'scrap-magnet', x:1110, scale:.78, hp:70 }
  ],
  'taj-mahal': [
    { type:'stone-bench', x:220, scale:.72, hp:72 },
    { type:'garden-lamp', x:470, scale:.68, hp:45 },
    { type:'stone-planter', x:892, scale:.75, hp:65 },
    { type:'garden-lamp', x:1120, scale:.66, hp:45 }
  ],
  'oconnell-bridge-spire': [
    { type:'dublin-lamp', x:205, scale:.74, hp:48 },
    { type:'pub-barrels', x:430, scale:.72, hp:55 },
    { type:'bike', x:760, scale:.74, hp:34 },
    { type:'wheelie-bin', x:1060, scale:.72, hp:42 }
  ],
  'westminster-bridge-big-ben': [
    { type:'westminster-lamp', x:188, scale:.78, hp:55 },
    { type:'bench', x:490, scale:.74, hp:62 },
    { type:'bollard', x:845, scale:.76, hp:55 },
    { type:'westminster-lamp', x:1120, scale:.72, hp:55 }
  ],
  'donabate-beach': [
    { type:'driftwood', x:190, scale:.85, hp:38 },
    { type:'lifebuoy', x:480, scale:.70, hp:32 },
    { type:'dune-fence', x:870, scale:.82, hp:48 },
    { type:'beach-sign', x:1120, scale:.78, hp:48 }
  ]
};

const PROP_SIZE = {
  wheelbarrow:[120,80], bbq:[90,94], greenhouse:[150,110], 'garden-chair':[90,90],
  hvac:[125,90], dish:[105,100], 'water-tank':[115,125], 'roof-vent':[90,85],
  'car-shell':[155,84], tyres:[100,88], 'oil-drum':[76,100], 'scrap-magnet':[100,110],
  'stone-bench':[130,76], 'garden-lamp':[72,130], 'stone-planter':[110,90],
  'dublin-lamp':[74,150], 'pub-barrels':[120,92], bike:[130,88], 'wheelie-bin':[78,104],
  'westminster-lamp':[78,150], bench:[135,78], bollard:[64,105],
  driftwood:[140,68], lifebuoy:[90,96], 'dune-fence':[145,92], 'beach-sign':[110,120]
};

function rounded(ctx, x, y, w, h, r) {
  const q = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+q,y);
  ctx.arcTo(x+w,y,x+w,y+h,q);
  ctx.arcTo(x+w,y+h,x,y+h,q);
  ctx.arcTo(x,y+h,x,y,q);
  ctx.arcTo(x,y,x+w,y,q);
  ctx.closePath();
}

function shadow(ctx, x, y, rx, ry, alpha=.28) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,25,31,' + alpha + ')';
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function metallic(ctx, x, y, w, h, a='#e4e9ec', b='#69737a') {
  const g = ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,a); g.addColorStop(.32,'#f7fbfc'); g.addColorStop(.58,b); g.addColorStop(1,'#394148');
  return g;
}

function wood(ctx, x, y, w, h, a='#b97a42', b='#6e3f27') {
  const g = ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,a); g.addColorStop(.48,'#8b5635'); g.addColorStop(1,b);
  return g;
}

function glass(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,'rgba(225,249,255,.72)');
  g.addColorStop(.35,'rgba(112,193,211,.32)');
  g.addColorStop(.62,'rgba(239,254,255,.62)');
  g.addColorStop(1,'rgba(78,135,151,.35)');
  return g;
}

function drawWheel(ctx,w,h) {
  ctx.fillStyle='#20252a'; ctx.beginPath(); ctx.arc(w*.35,h*.76,h*.16,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#778087'; ctx.beginPath(); ctx.arc(w*.35,h*.76,h*.075,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#543721'; ctx.lineWidth=6;
  ctx.beginPath(); ctx.moveTo(w*.58,h*.52); ctx.lineTo(w*.91,h*.76); ctx.stroke();
}

function drawProp(ctx,type,w,h) {
  ctx.clearRect(0,0,w,h);
  ctx.lineCap='round'; ctx.lineJoin='round';
  shadow(ctx,w*.5,h*.88,w*.35,h*.07,.22);

  if (type==='wheelbarrow') {
    drawWheel(ctx,w,h);
    ctx.fillStyle=metallic(ctx,w*.22,h*.28,w*.52,h*.35,'#c9d4d8','#697b77');
    ctx.beginPath(); ctx.moveTo(w*.18,h*.28); ctx.lineTo(w*.72,h*.28); ctx.lineTo(w*.61,h*.62); ctx.lineTo(w*.29,h*.62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#eef7f7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.24,h*.33);ctx.lineTo(w*.65,h*.33);ctx.stroke();
    ctx.strokeStyle='#59432e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w*.58,h*.55);ctx.lineTo(w*.93,h*.72);ctx.moveTo(w*.28,h*.58);ctx.lineTo(w*.14,h*.82);ctx.stroke();
  } else if(type==='bbq') {
    ctx.strokeStyle='#32383c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(w*.4,h*.55);ctx.lineTo(w*.28,h*.88);ctx.moveTo(w*.6,h*.55);ctx.lineTo(w*.72,h*.88);ctx.stroke();
    ctx.fillStyle='#23282c';ctx.beginPath();ctx.ellipse(w*.5,h*.46,w*.31,h*.25,0,0,Math.PI*2);ctx.fill();
    const g=ctx.createLinearGradient(0,h*.2,0,h*.55);g.addColorStop(0,'#525b61');g.addColorStop(1,'#1d2226');ctx.fillStyle=g;
    ctx.beginPath();ctx.arc(w*.5,h*.38,w*.28,Math.PI,Math.PI*2);ctx.lineTo(w*.77,h*.47);ctx.lineTo(w*.23,h*.47);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#aeb9bf';ctx.lineWidth=3;ctx.beginPath();ctx.arc(w*.5,h*.36,w*.14,Math.PI*1.08,Math.PI*1.92);ctx.stroke();
  } else if(type==='greenhouse') {
    ctx.strokeStyle='#65777d';ctx.lineWidth=5;ctx.fillStyle=glass(ctx,w*.08,h*.18,w*.84,h*.68);
    ctx.beginPath();ctx.moveTo(w*.1,h*.88);ctx.lineTo(w*.1,h*.39);ctx.lineTo(w*.34,h*.14);ctx.lineTo(w*.66,h*.14);ctx.lineTo(w*.9,h*.39);ctx.lineTo(w*.9,h*.88);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.lineWidth=3;for(const x of [.28,.5,.72]){ctx.beginPath();ctx.moveTo(w*x,h*.21);ctx.lineTo(w*x,h*.87);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(w*.1,h*.48);ctx.lineTo(w*.9,h*.48);ctx.stroke();
    ctx.fillStyle='rgba(61,129,68,.7)';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(w*(.22+i*.14),h*.72,8+i%2*3,0,Math.PI*2);ctx.fill();}
  } else if(type==='garden-chair') {
    ctx.strokeStyle='#d9e3e5';ctx.lineWidth=5;ctx.fillStyle='#487e95';rounded(ctx,w*.23,h*.34,w*.48,h*.24,5);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(w*.28,h*.56);ctx.lineTo(w*.22,h*.88);ctx.moveTo(w*.67,h*.56);ctx.lineTo(w*.75,h*.88);ctx.moveTo(w*.27,h*.36);ctx.lineTo(w*.2,h*.13);ctx.lineTo(w*.66,h*.13);ctx.lineTo(w*.7,h*.36);ctx.stroke();
  } else if(type==='hvac') {
    ctx.fillStyle=metallic(ctx,w*.12,h*.2,w*.76,h*.62,'#d4dadd','#657079');rounded(ctx,w*.12,h*.2,w*.76,h*.62,6);ctx.fill();
    ctx.strokeStyle='#434d54';ctx.lineWidth=3;ctx.stroke();
    ctx.fillStyle='#262e34';ctx.beginPath();ctx.arc(w*.5,h*.49,h*.19,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#9ca8ad';ctx.lineWidth=4;for(let a=0;a<Math.PI*2;a+=Math.PI/4){ctx.beginPath();ctx.moveTo(w*.5,h*.49);ctx.lineTo(w*.5+Math.cos(a)*h*.17,h*.49+Math.sin(a)*h*.17);ctx.stroke();}
    ctx.fillStyle='#d7b44c';ctx.fillRect(w*.17,h*.68,w*.18,h*.07);
  } else if(type==='dish') {
    ctx.strokeStyle='#50595e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w*.5,h*.5);ctx.lineTo(w*.44,h*.88);ctx.moveTo(w*.5,h*.5);ctx.lineTo(w*.68,h*.85);ctx.stroke();
    ctx.fillStyle=metallic(ctx,w*.2,h*.12,w*.58,h*.48,'#ecf2f3','#7b878e');
    ctx.beginPath();ctx.ellipse(w*.47,h*.34,w*.29,h*.18,-.42,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#404a51';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w*.55,h*.34);ctx.lineTo(w*.76,h*.24);ctx.stroke();ctx.fillStyle='#303940';ctx.beginPath();ctx.arc(w*.77,h*.235,5,0,Math.PI*2);ctx.fill();
  } else if(type==='water-tank') {
    const g=ctx.createLinearGradient(w*.22,0,w*.78,0);g.addColorStop(0,'#333a3c');g.addColorStop(.35,'#626d6e');g.addColorStop(.55,'#202729');g.addColorStop(1,'#111719');ctx.fillStyle=g;
    rounded(ctx,w*.22,h*.17,w*.56,h*.66,18);ctx.fill();
    ctx.strokeStyle='#818b8b';ctx.lineWidth=3;for(const yy of [.32,.51,.69]){ctx.beginPath();ctx.moveTo(w*.24,h*yy);ctx.lineTo(w*.76,h*yy);ctx.stroke();}
    ctx.fillStyle='#2b3437';ctx.fillRect(w*.42,h*.08,w*.16,h*.1);
  } else if(type==='roof-vent') {
    ctx.fillStyle=metallic(ctx,w*.22,h*.28,w*.55,h*.51);ctx.fillRect(w*.25,h*.36,w*.5,h*.43);
    ctx.fillStyle='#7e8b91';ctx.beginPath();ctx.ellipse(w*.5,h*.35,w*.28,h*.12,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3f494e';ctx.beginPath();ctx.ellipse(w*.5,h*.34,w*.17,h*.06,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#3d484d';ctx.lineWidth=3;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(w*.32,h*(.48+i*.07));ctx.lineTo(w*.68,h*(.48+i*.07));ctx.stroke();}
  } else if(type==='car-shell') {
    const g=ctx.createLinearGradient(0,h*.3,0,h*.75);g.addColorStop(0,'#a56442');g.addColorStop(.45,'#73432f');g.addColorStop(1,'#3f2e29');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(w*.08,h*.68);ctx.lineTo(w*.18,h*.44);ctx.lineTo(w*.38,h*.3);ctx.lineTo(w*.7,h*.31);ctx.lineTo(w*.86,h*.49);ctx.lineTo(w*.93,h*.7);ctx.closePath();ctx.fill();
    ctx.fillStyle='#87a7ad';ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(w*.37,h*.34);ctx.lineTo(w*.47,h*.34);ctx.lineTo(w*.43,h*.48);ctx.lineTo(w*.26,h*.48);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(w*.51,h*.34);ctx.lineTo(w*.68,h*.35);ctx.lineTo(w*.78,h*.48);ctx.lineTo(w*.55,h*.48);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='#1e2326';for(const x of [.25,.76]){ctx.beginPath();ctx.arc(w*x,h*.7,h*.14,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#945134';for(let i=0;i<9;i++){ctx.fillRect(w*(.14+i*.08),h*(.51+(i%3)*.05),4,3);}
  } else if(type==='tyres') {
    for(let i=0;i<4;i++){const x=w*(.35+(i%2)*.26),y=h*(.7-Math.floor(i/2)*.3);ctx.fillStyle='#202326';ctx.beginPath();ctx.ellipse(x,y,w*.2,h*.17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#61676b';ctx.beginPath();ctx.ellipse(x,y,w*.08,h*.07,0,0,Math.PI*2);ctx.fill();}
  } else if(type==='oil-drum') {
    const g=ctx.createLinearGradient(w*.2,0,w*.8,0);g.addColorStop(0,'#794b35');g.addColorStop(.3,'#bc7048');g.addColorStop(.55,'#633a2c');g.addColorStop(1,'#352d2b');ctx.fillStyle=g;rounded(ctx,w*.24,h*.13,w*.52,h*.72,10);ctx.fill();
    ctx.strokeStyle='#2d3234';ctx.lineWidth=4;for(const yy of [.25,.48,.7]){ctx.beginPath();ctx.moveTo(w*.25,h*yy);ctx.lineTo(w*.75,h*yy);ctx.stroke();}
    ctx.fillStyle='#d8a957';ctx.globalAlpha=.45;ctx.fillRect(w*.32,h*.37,w*.12,h*.18);ctx.globalAlpha=1;
  } else if(type==='scrap-magnet') {
    ctx.strokeStyle='#3f4549';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.5,h*.05);ctx.lineTo(w*.5,h*.39);ctx.stroke();
    ctx.fillStyle='#b9863f';rounded(ctx,w*.28,h*.38,w*.44,h*.28,8);ctx.fill();ctx.fillStyle='#793331';ctx.fillRect(w*.29,h*.56,w*.13,h*.18);ctx.fillRect(w*.58,h*.56,w*.13,h*.18);
    ctx.fillStyle='#cfd6d8';ctx.fillRect(w*.29,h*.67,w*.13,h*.07);ctx.fillRect(w*.58,h*.67,w*.13,h*.07);
  } else if(type==='stone-bench'||type==='bench') {
    const stone=type==='stone-bench';ctx.fillStyle=stone?metallic(ctx,w*.12,h*.2,w*.76,h*.5,'#dedbd2','#8a867f'):wood(ctx,w*.1,h*.3,w*.8,h*.34);
    rounded(ctx,w*.12,h*.35,w*.76,h*.18,5);ctx.fill();
    if(!stone){ctx.fillStyle='#49382b';ctx.fillRect(w*.13,h*.41,w*.74,h*.04);}
    ctx.strokeStyle=stone?'#77746f':'#33383c';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(w*.25,h*.52);ctx.lineTo(w*.2,h*.87);ctx.moveTo(w*.75,h*.52);ctx.lineTo(w*.8,h*.87);ctx.stroke();
    ctx.strokeStyle=stone?'#8d8981':'#4b3b2d';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(w*.18,h*.34);ctx.lineTo(w*.18,h*.13);ctx.lineTo(w*.82,h*.13);ctx.lineTo(w*.82,h*.34);ctx.stroke();
  } else if(type==='garden-lamp'||type==='dublin-lamp'||type==='westminster-lamp') {
    const ornate=type!=='garden-lamp';ctx.strokeStyle=ornate?'#1d282c':'#5c615e';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w*.5,h*.9);ctx.lineTo(w*.5,h*.25);ctx.stroke();
    if(ornate){ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w*.5,h*.45);ctx.bezierCurveTo(w*.32,h*.42,w*.28,h*.3,w*.27,h*.25);ctx.stroke();}
    ctx.fillStyle=ornate?'#263238':'#68726e';ctx.fillRect(w*.38,h*.18,w*.24,h*.13);
    ctx.fillStyle='#ffe3a3';ctx.globalAlpha=.82;ctx.fillRect(w*.415,h*.205,w*.17,h*.08);ctx.globalAlpha=1;
    ctx.fillStyle=ornate?'#202a2e':'#606965';ctx.beginPath();ctx.arc(w*.5,h*.18,w*.17,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(w*.36,h*.87,w*.28,h*.07);
  } else if(type==='stone-planter') {
    ctx.fillStyle=metallic(ctx,w*.18,h*.42,w*.64,h*.38,'#d8d4c9','#8d867b');ctx.beginPath();ctx.moveTo(w*.17,h*.47);ctx.lineTo(w*.83,h*.47);ctx.lineTo(w*.72,h*.84);ctx.lineTo(w*.28,h*.84);ctx.closePath();ctx.fill();
    ctx.fillStyle='#376e3e';for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(w*(.28+i*.075),h*(.38-(i%3)*.08),8,20,(i-3)*.14,0,Math.PI*2);ctx.fill();}
  } else if(type==='pub-barrels') {
    for(let i=0;i<2;i++){const x=w*(.35+i*.3);ctx.fillStyle=wood(ctx,x-w*.12,h*.24,w*.24,h*.55);rounded(ctx,x-w*.12,h*.24,w*.24,h*.55,9);ctx.fill();ctx.strokeStyle='#3d3631';ctx.lineWidth=3;for(const yy of [.33,.53,.72]){ctx.beginPath();ctx.moveTo(x-w*.12,h*yy);ctx.lineTo(x+w*.12,h*yy);ctx.stroke();}}
  } else if(type==='bike') {
    ctx.strokeStyle='#242d32';ctx.lineWidth=4;for(const x of [.28,.74]){ctx.beginPath();ctx.arc(w*x,h*.68,h*.2,0,Math.PI*2);ctx.stroke();}
    ctx.strokeStyle='#4c6570';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.28,h*.68);ctx.lineTo(w*.48,h*.4);ctx.lineTo(w*.6,h*.68);ctx.lineTo(w*.28,h*.68);ctx.moveTo(w*.48,h*.4);ctx.lineTo(w*.74,h*.68);ctx.stroke();
    ctx.strokeStyle='#283236';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(w*.46,h*.39);ctx.lineTo(w*.42,h*.29);ctx.moveTo(w*.68,h*.42);ctx.lineTo(w*.78,h*.32);ctx.stroke();
  } else if(type==='wheelie-bin') {
    ctx.fillStyle='#2c6e4d';rounded(ctx,w*.22,h*.23,w*.56,h*.6,7);ctx.fill();ctx.fillStyle='#1c4e38';rounded(ctx,w*.17,h*.18,w*.66,h*.13,5);ctx.fill();
    ctx.fillStyle='#cfd8d4';ctx.globalAlpha=.35;ctx.fillRect(w*.31,h*.38,w*.38,h*.16);ctx.globalAlpha=1;ctx.fillStyle='#20272a';for(const x of [.3,.7]){ctx.beginPath();ctx.arc(w*x,h*.86,6,0,Math.PI*2);ctx.fill();}
  } else if(type==='bollard') {
    const g=ctx.createLinearGradient(w*.25,0,w*.75,0);g.addColorStop(0,'#151b1e');g.addColorStop(.45,'#566065');g.addColorStop(.7,'#1f272b');g.addColorStop(1,'#0e1417');ctx.fillStyle=g;rounded(ctx,w*.32,h*.23,w*.36,h*.62,12);ctx.fill();
    ctx.fillStyle='#d4b45a';ctx.fillRect(w*.32,h*.37,w*.36,h*.08);ctx.fillStyle='#1b2428';ctx.beginPath();ctx.arc(w*.5,h*.24,w*.22,Math.PI,Math.PI*2);ctx.fill();
  } else if(type==='driftwood') {
    ctx.strokeStyle='#81664e';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(w*.1,h*.72);ctx.bezierCurveTo(w*.35,h*.4,w*.53,h*.78,w*.9,h*.45);ctx.stroke();
    ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w*.37,h*.56);ctx.lineTo(w*.27,h*.25);ctx.moveTo(w*.65,h*.61);ctx.lineTo(w*.78,h*.31);ctx.stroke();
    ctx.strokeStyle='#c2a887';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.18,h*.65);ctx.lineTo(w*.77,h*.49);ctx.stroke();
  } else if(type==='lifebuoy') {
    ctx.strokeStyle='#f4f1e8';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w*.5,h*.8);ctx.lineTo(w*.5,h*.28);ctx.stroke();ctx.fillStyle='#39494e';ctx.fillRect(w*.4,h*.25,w*.2,h*.08);
    ctx.strokeStyle='#e85043';ctx.lineWidth=11;ctx.beginPath();ctx.arc(w*.5,h*.2,w*.24,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=4;for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){ctx.beginPath();ctx.arc(w*.5,h*.2,w*.24,a,a+.35);ctx.stroke();}
  } else if(type==='dune-fence') {
    ctx.strokeStyle='#7f684e';ctx.lineWidth=5;for(let i=0;i<6;i++){const x=w*(.12+i*.15);ctx.beginPath();ctx.moveTo(x,h*.2+(i%2)*4);ctx.lineTo(x,h*.87);ctx.stroke();}
    ctx.strokeStyle='#b69d7c';ctx.lineWidth=2;for(const yy of [.38,.62]){ctx.beginPath();ctx.moveTo(w*.08,h*yy);ctx.lineTo(w*.92,h*(yy+.03));ctx.stroke();}
  } else if(type==='beach-sign') {
    ctx.strokeStyle='#7d654a';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(w*.5,h*.35);ctx.lineTo(w*.5,h*.92);ctx.stroke();ctx.fillStyle=wood(ctx,w*.12,h*.16,w*.76,h*.32);rounded(ctx,w*.12,h*.16,w*.76,h*.32,5);ctx.fill();
    ctx.fillStyle='#f4ead4';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('BEACH',w*.5,h*.31);ctx.fillStyle='#d6bf98';ctx.fillRect(w*.2,h*.38,w*.6,h*.04);
  }
}

function textureKey(type) {
  return 'mw11-prop-' + type;
}

function ensurePropTexture(scene,type) {
  const key=textureKey(type);
  if(scene.textures.exists(key)) return key;
  const size=PROP_SIZE[type]||[110,90];
  const scale=2;
  const canvas=document.createElement('canvas');
  canvas.width=size[0]*scale;canvas.height=size[1]*scale;
  const ctx=canvas.getContext('2d',{alpha:true});
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  drawProp(ctx,type,size[0],size[1]);
  scene.textures.addCanvas(key,canvas);
  return key;
}

function createLivingProps(scene) {
  scene.__mw11Props=[];
  const defs=PROP_DEFS[scene.arena.id]||[];
  for(const def of defs) {
    const key=ensurePropTexture(scene,def.type);
    const ground=surfaceY(scene.terrain,def.x);
    if(ground>=HEIGHT) continue;
    const image=scene.add.image(def.x,ground+2,key).setOrigin(.5,1).setScale(def.scale||1).setDepth(8);
    const prop={
      ...def,
      image,
      x:def.x,
      y:ground+2,
      vy:0,
      falling:false,
      hp:def.hp||50,
      maxHp:def.hp||50,
      destroyed:false,
      baseRotation:0
    };
    scene.__mw11Props.push(prop);
    stats.propsCreated+=1;
  }
}

function spawnPropDebris(scene,prop,intensity=1) {
  const count=Math.max(4,Math.min(12,Math.round(5+intensity*4)));
  for(let i=0;i<count;i++) {
    const colors=[0x9b7655,0x667077,0xd0c3ad,0x33393d];
    const piece=scene.add.rectangle(prop.x,prop.y-18,5+Math.random()*8,3+Math.random()*5,colors[i%colors.length],.9)
      .setDepth(34).setRotation(Math.random()*Math.PI);
    const side=Math.random()<.5?-1:1;
    scene.tweens.add({
      targets:piece,
      x:piece.x+side*(18+Math.random()*45)*intensity,
      y:piece.y-(18+Math.random()*45)*intensity,
      rotation:piece.rotation+side*(1.5+Math.random()*3),
      duration:170+Math.random()*130,
      ease:'Quad.Out',
      onComplete:()=>scene.tweens.add({
        targets:piece,y:prop.y+22+Math.random()*28,alpha:0,rotation:piece.rotation+side*2,
        duration:250+Math.random()*180,ease:'Quad.In',onComplete:()=>piece.destroy()
      })
    });
    stats.propDebris+=1;
  }
}

function damageLivingProps(scene,x,y,weapon) {
  if(!scene.__mw11Props||!weapon||weapon.blastRadius<=0) return;
  for(const prop of scene.__mw11Props) {
    if(prop.destroyed||!prop.image?.active) continue;
    const dx=prop.x-x,dy=(prop.y-25)-y;
    const distance=Math.hypot(dx,dy);
    const range=weapon.blastRadius*1.25;
    if(distance>range) continue;
    const factor=Math.max(.12,1-distance/range);
    const amount=weapon.damage*factor*.78;
    prop.hp=Math.max(0,prop.hp-amount);
    stats.propsDamaged+=1;
    prop.image.angle+=(dx>=0?1:-1)*(2+factor*6);
    scene.tweens.add({targets:prop.image,scaleX:(defScale(prop)*1.05),scaleY:(defScale(prop)*.94),duration:70,yoyo:true});
    spawnPropDebris(scene,prop,.45+factor*.55);
    if(prop.hp<=0) destroyLivingProp(scene,prop,1+factor);
    else {
      const ratio=prop.hp/prop.maxHp;
      prop.image.setAlpha(.62+.38*ratio);
      if(ratio<.5) prop.image.setTint?.(0xbda99a);
    }
  }
}

function defScale(prop) {
  return prop.scale||1;
}

function destroyLivingProp(scene,prop,intensity=1) {
  if(prop.destroyed) return;
  prop.destroyed=true;
  stats.propsDestroyed+=1;
  spawnPropDebris(scene,prop,intensity);
  if(prop.image?.active) {
    scene.tweens.add({
      targets:prop.image,
      angle:prop.image.angle+(Math.random()<.5?-1:1)*(18+Math.random()*24),
      alpha:0,
      scaleX:defScale(prop)*.7,
      scaleY:defScale(prop)*.7,
      duration:260,
      ease:'Quad.In',
      onComplete:()=>prop.image.destroy()
    });
  }
}

function updateLivingProps(scene,delta) {
  if(!scene.__mw11Props) return;
  const dt=Math.min(delta,40)/1000;
  for(const prop of scene.__mw11Props) {
    if(prop.destroyed||!prop.image?.active) continue;
    const ground=surfaceY(scene.terrain,prop.x);
    if(ground>=HEIGHT) {
      prop.falling=true;
    } else if(prop.y<ground-3||prop.falling) {
      prop.vy+=GRAVITY*dt*.7;
      prop.y+=prop.vy*dt;
      prop.image.y=prop.y;
      if(prop.y>=ground+2) {
        prop.y=ground+2;prop.vy=0;prop.falling=false;prop.image.y=prop.y;
      } else if(Math.abs(prop.vy)>20) {
        prop.image.angle+=dt*prop.vy*.035;
      }
    } else {
      prop.y=ground+2;
      prop.image.y=prop.y;
    }
    if(prop.falling) stats.propFalls+=1;
  }
}

function cleanupSceneState(scene) {
  for(const key of Object.keys(scene)) {
    if(!key.startsWith('__mw')) continue;
    const value=scene[key];
    if(Array.isArray(value)) {
      for(const item of value) {
        item?.destroy?.();
        item?.object?.destroy?.();
        item?.image?.destroy?.();
      }
    } else if(value && typeof value.destroy==='function') {
      value.destroy();
    }
  }
  scene.__mwHdBackdrop=null;
  scene.__mwWaterGraphics=null;
  scene.__mw07Ambient=null;
  scene.__mw08Ambient=null;
  scene.__mw08WeaponPanel=null;
  scene.__mw09AimGuide=null;
  scene.__mw09WindMarks=null;
  scene.__mw10TouchObjects=null;
  scene.__mw10Touch=null;
  scene.__mw11Props=null;
}

function requestedArena(scene) {
  return ARENAS[scene.arenaIndex] || ARENAS[0];
}

const v10MenuRefresh=MenuScene.prototype.refresh;
MenuScene.prototype.refresh=function() {
  v10MenuRefresh.call(this);
  const arena=requestedArena(this);
  this.__mw11SelectedArenaId=arena.id;
  globalThis.__MEOW_WARS_SELECTED_ARENA=arena.id;
  if(!this.__mw11SelectionNote||!this.__mw11SelectionNote.active) {
    this.__mw11SelectionNote=this.add.text(640,310,'',{
      fontFamily:'Arial Black, Arial',fontSize:'10px',color:'#d9f4ff',
      backgroundColor:'rgba(10,32,55,.78)',padding:{x:8,y:3}
    }).setOrigin(.5).setDepth(21);
  }
  this.__mw11SelectionNote.setText('SELECTED  ·  '+arena.name.toUpperCase());
};

const v10MenuStart=MenuScene.prototype.start;
MenuScene.prototype.start=function() {
  if(this.__mw11Starting) return;
  const arena=ARENAS.find((entry)=>entry.id===this.__mw11SelectedArenaId)||requestedArena(this);
  const payload={
    mode:this.mode,
    arenaId:arena.id,
    blueSquadId:SQUADS[this.blueSquadIndex].id,
    redSquadId:SQUADS[this.redSquadIndex].id
  };
  this.__mw11Starting=true;
  globalThis.__MEOW_WARS_PENDING_ARENA=arena.id;
  globalThis.__MEOW_WARS_LAST_START_REQUEST={...payload,at:Date.now()};
  stats.requestedArenaStarts+=1;
  this.sfx.unlock();
  this.sfx.click();
  try {
    this.input.keyboard?.resetKeys?.();
    const old=this.scene.get('GameScene');
    if(old&&old.scene?.isActive?.()) old.scene.stop();
    if(old) cleanupSceneState(old);
  } catch {}
  this.time.delayedCall(0,()=>this.scene.start('GameScene',payload));
};

const v10MenuCreate=MenuScene.prototype.create;
MenuScene.prototype.create=function() {
  this.__mw11Starting=false;
  v10MenuCreate.call(this);
  globalThis.__MEOW_WARS_MENU_READY=true;
};

const v10GameInit=GameScene.prototype.init;
GameScene.prototype.init=function(data) {
  const requested=data?.arenaId||globalThis.__MEOW_WARS_PENDING_ARENA;
  const next={...(data||{}),arenaId:requested};
  v10GameInit.call(this,next);
  this.__mw11RequestedArena=requested;
};

const v10GameCreate=GameScene.prototype.create;
GameScene.prototype.create=function() {
  cleanupSceneState(this);
  v10GameCreate.call(this);
  createLivingProps(this);
  globalThis.__MEOW_WARS_ACTIVE_ARENA=this.arena.id;
  globalThis.__MEOW_WARS_PENDING_ARENA=null;
  globalThis.__MEOW_WARS_LAST_CONFIRMED_ARENA=this.arena.id;
  if(this.__mw11RequestedArena===this.arena.id) stats.confirmedArenaStarts+=1;
  const marker=this.children.getByName('mw-build-marker');
  if(marker?.setText) marker.setText('v'+MW11_VERSION+' · '+MW11_BUILD);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>cleanupSceneState(this));
};

const v10GameUpdate=GameScene.prototype.update;
GameScene.prototype.update=function(time,delta) {
  v10GameUpdate.call(this,time,delta);
  updateLivingProps(this,delta);
};

const v10Explode=GameScene.prototype.explode;
GameScene.prototype.explode=function(x,y,weapon,ownerId) {
  const result=v10Explode.call(this,x,y,weapon,ownerId);
  damageLivingProps(this,x,y,weapon);
  return result;
};

const v10RestartHandler=GameScene.prototype.handleRestartInput;
GameScene.prototype.handleRestartInput=function() {
  const menuDown=!!this.keys?.menu?.isDown;
  const restartDown=!!this.keys?.restart?.isDown;

  if(restartDown&&!this.__mw11RestartHeld) {
    this.__mw11RestartHeld=true;
    this.input.keyboard?.resetKeys?.();
    this.scene.restart({
      mode:this.mode,
      arenaId:this.arena.id,
      blueSquadId:this.blueSquad.id,
      redSquadId:this.redSquad.id
    });
    return;
  }
  if(!restartDown) this.__mw11RestartHeld=false;

  if(menuDown&&!this.__mw11MenuHeld) {
    this.__mw11MenuHeld=true;
    stats.menuReturns+=1;
    globalThis.__MEOW_WARS_PENDING_ARENA=null;
    this.input.keyboard?.resetKeys?.();
    this.scene.start('MenuScene',{fromArenaId:this.arena.id});
    return;
  }
  if(!menuDown) this.__mw11MenuHeld=false;
};

const previousBuildInfo=globalThis.__MEOW_WARS_BUILD_INFO;
document.documentElement.dataset.meowWarsVersion=MW11_VERSION;
document.documentElement.dataset.meowWarsBuild=MW11_BUILD;
const host=document.getElementById('game');
if(host){host.dataset.version=MW11_VERSION;host.dataset.build=MW11_BUILD;}
globalThis.__MEOW_WARS_VERSION=MW11_VERSION;
globalThis.__MEOW_WARS_BUILD=MW11_BUILD;
globalThis.__MEOW_WARS_BUILD_INFO=()=>{
  const base=typeof previousBuildInfo==='function'?previousBuildInfo():{};
  return {
    ...base,
    version:MW11_VERSION,
    build:MW11_BUILD,
    livingBattlefields:true,
    realisticProps:Object.fromEntries(Object.entries(PROP_DEFS).map(([arena,defs])=>[arena,defs.map(d=>d.type)])),
    transitionState:{
      pending:globalThis.__MEOW_WARS_PENDING_ARENA||null,
      active:globalThis.__MEOW_WARS_ACTIVE_ARENA||null,
      lastConfirmed:globalThis.__MEOW_WARS_LAST_CONFIRMED_ARENA||null
    },
    v11Stats:{...stats}
  };
};
})();
