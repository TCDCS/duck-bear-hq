import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.22.2/build/playcanvas.mjs';

const BUILD='0.4.0';
const GAME={duration:90,streetLength:430,laneX:[-2.45,0,2.45],speed:5.25,hitSpeed:2.8,hitDuration:.66,jumpVelocity:7.1,gravity:18,laneSharpness:13,pullAwayAt:8.5,tramSpeed:3.25,catchGap:6.2,pixelRatio:1.5};
const $=id=>document.getElementById(id);
const canvas=$('application');
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:true,alpha:false,powerPreference:'high-performance'}});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,GAME.pixelRatio);
app.scene.ambientLight=new pc.Color(.30,.34,.46);

const ui={shell:$('gameShell'),time:$('timeValue'),distance:$('distanceValue'),callout:$('streetCallout'),toast:$('toast'),timerCard:document.querySelector('.timer-card'),start:$('startPanel'),pause:$('pausePanel'),result:$('resultPanel'),resultTitle:$('resultTitle'),resultText:$('resultText'),resultDistance:$('resultDistance'),resultTime:$('resultTime')};

const state={started:false,paused:false,finished:false,timeLeft:GAME.duration,elapsed:0,lastSecond:91,toastTimer:0,doorsWarned:false,pullAwayWarned:false};
const obstacleRecords=[];
const animated=[];
const lanes=GAME.laneX;

function mat(color,{gloss=.35,metal=0,emissive=null,opacity=1}={}){
  const m=new pc.StandardMaterial();
  m.diffuse=color;
  m.gloss=gloss;
  if(metal){m.useMetalness=true;m.metalness=metal;}
  if(emissive){m.emissive=emissive;m.emissiveIntensity=1.15;}
  if(opacity<1){m.opacity=opacity;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;}
  m.update();return m;
}
function box(name,pos,scale,material,parent=app.root){
  const e=new pc.Entity(name);e.addComponent('render',{type:'box'});e.setPosition(pos);e.setLocalScale(scale);e.render.material=material;parent.addChild(e);return e;
}
function cyl(name,pos,scale,material,parent=app.root,rot=null){
  const e=new pc.Entity(name);e.addComponent('render',{type:'cylinder'});e.setPosition(pos);e.setLocalScale(scale);if(rot)e.setLocalEulerAngles(rot.x,rot.y,rot.z);e.render.material=material;parent.addChild(e);return e;
}
function sphere(name,pos,scale,material,parent=app.root){
  const e=new pc.Entity(name);e.addComponent('render',{type:'sphere'});e.setPosition(pos);e.setLocalScale(scale);e.render.material=material;parent.addChild(e);return e;
}

const P={road:new pc.Color(.045,.055,.075),pave:new pc.Color(.30,.31,.33),rail:new pc.Color(.62,.65,.70),brick:new pc.Color(.49,.20,.13),cream:new pc.Color(.78,.72,.62),navy:new pc.Color(.025,.13,.20),green:new pc.Color(.03,.24,.12),glass:new pc.Color(.025,.075,.11),black:new pc.Color(.018,.022,.035),white:new pc.Color(.93,.96,1),orange:new pc.Color(.95,.28,.04),yellow:new pc.Color(1,.72,.12),purple:new pc.Color(.37,.17,.62),skin:new pc.Color(.72,.47,.33)};
const M={road:mat(P.road,{gloss:.88,metal:.08}),pave:mat(P.pave,{gloss:.55}),rail:mat(P.rail,{gloss:.95,metal:.95}),brick:mat(P.brick,{gloss:.26}),cream:mat(P.cream,{gloss:.3}),navy:mat(P.navy,{gloss:.6}),green:mat(P.green,{gloss:.5}),glass:mat(P.glass,{gloss:.98,metal:.08}),black:mat(P.black,{gloss:.4}),white:mat(P.white,{gloss:.55}),orange:mat(P.orange,{gloss:.4}),yellow:mat(P.yellow,{gloss:.55}),purple:mat(P.purple,{gloss:.65}),skin:mat(P.skin,{gloss:.2}),lamp:mat(P.white,{emissive:new pc.Color(1,.56,.18),gloss:.35}),red:mat(new pc.Color(.64,.025,.03),{gloss:.55}),blue:mat(new pc.Color(.07,.30,.58),{gloss:.35}),gold:mat(new pc.Color(.72,.51,.18),{gloss:.72,metal:.28}),leaf:mat(new pc.Color(.05,.34,.15),{gloss:.22}),stone:mat(new pc.Color(.56,.55,.52),{gloss:.35}),pink:mat(new pc.Color(.66,.23,.38),{gloss:.38}),wetGlass:mat(new pc.Color(.08,.15,.22),{gloss:1,metal:.06,opacity:.42})};

const sun=new pc.Entity('Evening light');sun.addComponent('light',{type:'directional',color:new pc.Color(.74,.79,1),intensity:1.45,castShadows:true,shadowResolution:2048,shadowDistance:55});sun.setEulerAngles(48,32,0);app.root.addChild(sun);
const fill=new pc.Entity('Warm city fill');fill.addComponent('light',{type:'directional',color:new pc.Color(1,.57,.30),intensity:.35,castShadows:false});fill.setEulerAngles(-25,-145,0);app.root.addChild(fill);

function buildStreet(){
  box('Wet Dawson Street',new pc.Vec3(0,-.17,-GAME.streetLength/2),new pc.Vec3(8.5,.28,GAME.streetLength+35),M.road);
  box('Left pavement',new pc.Vec3(-6.25,.02,-GAME.streetLength/2),new pc.Vec3(4.0,.25,GAME.streetLength+35),M.pave);
  box('Right pavement',new pc.Vec3(6.25,.02,-GAME.streetLength/2),new pc.Vec3(4.0,.25,GAME.streetLength+35),M.pave);
  [-1.20,1.20].forEach((x,i)=>box('Rail '+i,new pc.Vec3(x,.015,-GAME.streetLength/2),new pc.Vec3(.095,.055,GAME.streetLength+35),M.rail));
  for(let d=7;d<GAME.streetLength;d+=7){box('Paving seam L'+d,new pc.Vec3(-4.35,.155,-d),new pc.Vec3(.055,.018,1.7),M.rail);box('Paving seam R'+d,new pc.Vec3(4.35,.155,-d),new pc.Vec3(.055,.018,1.7),M.rail);}
  for(let d=16,i=0;d<GAME.streetLength;d+=19,i++){
    for(const side of [-1,1]){
      cyl('Lamp post',new pc.Vec3(side*4.72,2.35,-d),new pc.Vec3(.065,2.35,.065),M.black);
      box('Lamp',new pc.Vec3(side*4.72,4.82,-d),new pc.Vec3(.34,.44,.34),M.lamp);
      if(i%2===0)cyl('Bollard',new pc.Vec3(side*4.15,.52,-d-4.2),new pc.Vec3(.22,.52,.22),M.black);
    }
  }
  for(let d=28;d<GAME.streetLength;d+=34){
    box('Cross wire',new pc.Vec3(0,5.85,-d),new pc.Vec3(10.0,.025,.025),M.black);
    cyl('Wire pole L',new pc.Vec3(-4.9,3.0,-d),new pc.Vec3(.045,3.0,.045),M.black);
    cyl('Wire pole R',new pc.Vec3(4.9,3.0,-d),new pc.Vec3(.07,3.0,.07),M.black);
  }
  buildGenericBlocks();
  buildLandmarks();
  buildWetDetails();
  buildStreetLife();
  buildLuasStop();
}

function windows(parent,side,height,length,modern=false){
  const cols=Math.max(2,Math.floor(length/2.4)),rows=Math.max(2,Math.floor((height-3)/2.1));
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const z=(c-(cols-1)/2)*2.15,y=3.1+r*2.05,x=side*6.76;
    box('Window',new pc.Vec3(x,y,parent.getPosition().z+z),new pc.Vec3(.07,modern?1.35:1.0,1.25),M.glass);
  }
}
function building(z,length,height,side,material,modern=false){
  const root=box('Building',new pc.Vec3(side*10.05,height/2,z),new pc.Vec3(6.55,height,length),material);
  windows(root,side,height,length,modern);return root;
}
function shopfront(z,length,side,material=M.glass){
  box('Shopfront',new pc.Vec3(side*6.74,1.45,z),new pc.Vec3(.10,2.35,length*.78),material);
}
function trim(name,z,y,length,side,material=M.gold,height=.10){
  return box(name,new pc.Vec3(side*6.58,y,z),new pc.Vec3(.18,height,length),material);
}
function awning(name,z,width,side,material=M.navy,y=3.12){
  const a=box(name,new pc.Vec3(side*6.42,y,z),new pc.Vec3(.75,.15,width),material);
  a.setLocalEulerAngles(0,0,side*10);return a;
}
function planter(z,side,offset=0){
  const root=new pc.Entity('Planter');root.setPosition(side*5.10,.0,-z+offset);app.root.addChild(root);
  box('Planter box',new pc.Vec3(0,.38,0),new pc.Vec3(.78,.76,.78),M.black,root);
  sphere('Plant',new pc.Vec3(0,1.06,0),new pc.Vec3(.82,.90,.82),M.leaf,root);
}
function tree(z,side){
  const root=new pc.Entity('Street tree');root.setPosition(side*5.30,0,-z);app.root.addChild(root);
  cyl('Tree trunk',new pc.Vec3(0,1.65,0),new pc.Vec3(.19,1.65,.19),mat(new pc.Color(.28,.18,.10),{gloss:.12}),root);
  sphere('Tree crown',new pc.Vec3(0,3.55,0),new pc.Vec3(1.25,1.45,1.15),M.leaf,root);
}
const signCache=new Map();
function signMaterial(text,bg='#102235',fg='#ffffff',accent=null){
  const key=[text,bg,fg,accent||''].join('|');if(signCache.has(key))return signCache.get(key);
  const c=document.createElement('canvas');c.width=1024;c.height=192;const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
  if(accent){ctx.fillStyle=accent;ctx.fillRect(0,0,22,c.height);ctx.fillRect(c.width-22,0,22,c.height);}
  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=5;ctx.strokeRect(3,3,c.width-6,c.height-6);
  let size=104;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 '+size+'px Arial, sans-serif';
  while(ctx.measureText(text).width>900&&size>48){size-=4;ctx.font='900 '+size+'px Arial, sans-serif';}
  ctx.fillStyle=fg;ctx.fillText(text,c.width/2,c.height/2+4);
  const texture=new pc.Texture(app.graphicsDevice,{width:c.width,height:c.height,format:pc.PIXELFORMAT_RGBA8,mipmaps:true});
  texture.minFilter=pc.FILTER_LINEAR_MIPMAP_LINEAR;texture.magFilter=pc.FILTER_LINEAR;texture.addressU=pc.ADDRESS_CLAMP_TO_EDGE;texture.addressV=pc.ADDRESS_CLAMP_TO_EDGE;texture.setSource(c);
  const m=new pc.StandardMaterial();m.diffuseMap=texture;m.diffuse=new pc.Color(1,1,1);m.emissiveMap=texture;m.emissive=new pc.Color(.48,.48,.48);m.emissiveIntensity=.32;m.gloss=.42;m.update();signCache.set(key,m);return m;
}
function nameboard(name,z,y,halfLength,side,material){
  return box(name,new pc.Vec3(side*6.30,y,z),new pc.Vec3(.15,.52,halfLength),material);
}
function buildGenericBlocks(){
  const fills=[M.brick,M.cream,mat(new pc.Color(.35,.28,.24),{gloss:.25}),mat(new pc.Color(.49,.42,.34),{gloss:.3})];
  let z=-11,i=0;
  while(z>-GAME.streetLength-15){
    const len=10+(i%4)*2.1,height=9.5+(i%5)*1.15;
    for(const side of [-1,1]){building(z,len,height,side,fills[(i+(side>0?1:0))%fills.length]);shopfront(z,len,side,i%3===0?M.navy:M.glass);}
    z-=len+1.35;i++;
  }
}
function buildLandmarks(){
  // Modern glazed Grafton Place corner at the Nassau Street end.
  const arket=box('ARKET Grafton Place',new pc.Vec3(9.72,7.25,-22),new pc.Vec3(6.95,14.5,24),M.stone);
  windows(arket,1,14.5,24,true);
  box('ARKET glass ground floor',new pc.Vec3(6.56,1.72,-22),new pc.Vec3(.16,3.15,20.8),M.glass);
  for(let z=-31;z<=-13;z+=4.4)box('ARKET mullion',new pc.Vec3(6.38,1.75,z),new pc.Vec3(.25,3.25,.11),M.stone);
  nameboard('ARKET wordmark',-22,3.52,3.7,1,signMaterial('ARKET','#eee9df','#151515'));

  // Hodges Figgis: tall red-brick facade with a deep green, brass-trimmed shopfront.
  const hf=box('Hodges Figgis',new pc.Vec3(-9.80,7.65,-55),new pc.Vec3(6.85,15.3,19),M.brick);
  windows(hf,-1,15.3,19,false);
  box('Hodges green frontage',new pc.Vec3(-6.55,1.62,-55),new pc.Vec3(.22,2.80,16.8),M.green);
  trim('Hodges brass fascia',-55,3.05,16.6,-1,M.gold,.14);
  nameboard('Hodges Figgis nameboard',-55,3.24,7.5,-1,signMaterial('HODGES FIGGIS','#143a2b','#e4c477'));
  for(let z=-61.2;z<=-48.8;z+=3.1)box('Hodges window bay',new pc.Vec3(-6.37,1.52,z),new pc.Vec3(.18,2.05,2.35),M.glass);

  // Café en Seine: dark blue facade, pale stripes and planted outdoor edge.
  const cafe=box('Cafe en Seine',new pc.Vec3(9.80,6.15,-185),new pc.Vec3(6.85,12.3,18),M.brick);
  windows(cafe,1,12.3,18,false);
  box('Cafe blue frontage',new pc.Vec3(6.54,1.60,-185),new pc.Vec3(.22,2.85,15.5),M.navy);
  trim('Cafe gold fascia',-185,3.12,15.4,1,M.gold,.10);
  nameboard('Cafe en Seine nameboard',-185,3.28,6.9,1,signMaterial('CAFÉ en SEINE','#15364b','#e5cf99'));
  for(let z=-190.5;z<=-179.5;z+=3.6){awning('Cafe striped awning',z,2.7,1,M.navy,3.43);box('Cafe awning stripe',new pc.Vec3(6.13,3.50,z),new pc.Vec3(.85,.07,.18),M.white);}
  planter(181,1);planter(187,1);planter(193,1);tree(188,1);

  // Dawson Lounge: darker townhouse treatment and a strong red entrance.
  const lounge=box('Dawson Lounge',new pc.Vec3(-9.80,5.55,-292),new pc.Vec3(6.85,11.1,12),mat(new pc.Color(.20,.18,.17),{gloss:.25}));
  windows(lounge,-1,11.1,12,false);
  box('Dawson dark frontage',new pc.Vec3(-6.56,1.48,-292),new pc.Vec3(.22,2.55,9.8),M.black);
  box('Dawson red door',new pc.Vec3(-6.35,1.32,-292),new pc.Vec3(.25,2.40,1.28),M.red);
  trim('Dawson fascia',-292,2.93,9.6,-1,M.gold,.09);
  nameboard('Dawson Lounge nameboard',-292,3.08,4.1,-1,signMaterial('THE DAWSON LOUNGE','#171717','#d7b56b'));

  // Ivy: pale modern facade, deep green entrance canopy and planting.
  const ivy=box('The Ivy Dawson Street',new pc.Vec3(9.80,6.75,-354),new pc.Vec3(6.85,13.5,23),M.cream);
  windows(ivy,1,13.5,23,true);
  box('Ivy glass frontage',new pc.Vec3(6.56,1.60,-354),new pc.Vec3(.20,2.80,19.5),M.glass);
  awning('Ivy green canopy',-348.5,5.8,1,M.green,3.15);
  nameboard('Ivy nameboard',-348.5,3.36,2.7,1,signMaterial('THE IVY','#123a2a','#e0bd71'));
  planter(347,1);planter(352,1);planter(357,1);
}

function buildWetDetails(){
  // Thin glossy patches sell the rainy street without expensive planar reflections.
  for(let d=20,i=0;d<GAME.streetLength-30;d+=17,i++){
    const lane=lanes[i%3];
    const p=box('Puddle',new pc.Vec3(lane+(i%2?.35:-.25),.018,-d),new pc.Vec3(1.45,.012,2.4+(i%3)*.5),M.wetGlass);
    p.setLocalEulerAngles(0,(i%5-2)*7,0);
  }
}

function humanoid(root,{coat=M.blue,pants=M.black,skin=M.skin,hair=M.black,shoes=M.white,scale=1,pose='walk',bag=null}={}){
  const torso=box('Torso',new pc.Vec3(0,1.12*scale,0),new pc.Vec3(.62*scale,.86*scale,.40*scale),coat,root);
  box('Neck',new pc.Vec3(0,1.65*scale,0),new pc.Vec3(.16*scale,.18*scale,.16*scale),skin,root);
  sphere('Head',new pc.Vec3(0,1.92*scale,-.01),new pc.Vec3(.42*scale,.46*scale,.40*scale),skin,root);
  box('Hair',new pc.Vec3(0,2.18*scale,.02),new pc.Vec3(.44*scale,.16*scale,.40*scale),hair,root);
  const legL=box('Left leg',new pc.Vec3(-.18*scale,.52*scale,.02),new pc.Vec3(.22*scale,.66*scale,.26*scale),pants,root);
  const legR=box('Right leg',new pc.Vec3(.18*scale,.52*scale,.02),new pc.Vec3(.22*scale,.66*scale,.26*scale),pants,root);
  box('Left shoe',new pc.Vec3(-.18*scale,.13*scale,-.09*scale),new pc.Vec3(.27*scale,.16*scale,.44*scale),shoes,root);
  box('Right shoe',new pc.Vec3(.18*scale,.13*scale,-.09*scale),new pc.Vec3(.27*scale,.16*scale,.44*scale),shoes,root);
  const armL=box('Left arm',new pc.Vec3(-.43*scale,1.16*scale,0),new pc.Vec3(.18*scale,.68*scale,.20*scale),coat,root);
  const armR=box('Right arm',new pc.Vec3(.43*scale,1.16*scale,0),new pc.Vec3(.18*scale,.68*scale,.20*scale),coat,root);
  sphere('Left hand',new pc.Vec3(-.43*scale,.79*scale,-.01),new pc.Vec3(.16*scale,.16*scale,.16*scale),skin,root);
  sphere('Right hand',new pc.Vec3(.43*scale,.79*scale,-.01),new pc.Vec3(.16*scale,.16*scale,.16*scale),skin,root);
  if(bag)box('Backpack',new pc.Vec3(0,1.18*scale,.30*scale),new pc.Vec3(.50*scale,.60*scale,.22*scale),bag,root);
  if(pose==='phone'){
    armR.setLocalEulerAngles(-54,0,-16);
    box('Phone',new pc.Vec3(.54*scale,1.48*scale,-.20*scale),new pc.Vec3(.08*scale,.23*scale,.14*scale),M.black,root);
  }else if(pose==='umbrella'){
    armR.setLocalEulerAngles(-72,0,-7);
  }else if(pose==='ride'){
    torso.setLocalEulerAngles(12,0,0);
    armL.setLocalEulerAngles(-58,0,18);
    armR.setLocalEulerAngles(-58,0,-18);
    legL.setLocalEulerAngles(38,0,0);
    legR.setLocalEulerAngles(-24,0,0);
  }
  return {torso,legL,legR,armL,armR};
}

function ambientPerson(z,side,phase){
  const root=new pc.Entity('Pavement pedestrian');
  root.setPosition(side*(4.95+(phase%3)*.35),0,-z);app.root.addChild(root);
  const coats=[M.blue,M.cream,M.green,M.pink],pants=[M.black,M.navy,M.black,M.blue];
  const rig=humanoid(root,{coat:coats[phase%coats.length],pants:pants[phase%pants.length],hair:phase%3===0?M.black:M.brick,shoes:M.white,scale:.88+(phase%3)*.04,bag:phase%4===0?M.gold:null});
  animated.push({type:'pavement',entity:root,rig,baseX:root.getPosition().x,baseD:z,phase:phase*.7});
}
function buildStreetLife(){
  let phase=0;
  for(let d=30;d<GAME.streetLength-25;d+=23){ambientPerson(d,-1,phase++);ambientPerson(d+9,1,phase++);}
  [74,122,215,260,374].forEach((d,i)=>tree(d,i%2?1:-1));
  [42,98,234,306,387].forEach((d,i)=>planter(d,i%2?1:-1));
}

function buildLuasStop(){
  const start=389,length=37;
  for(const side of [-1,1]){
    const x=side*3.72;
    box('Dawson raised platform',new pc.Vec3(x,.18,-(start+length/2)),new pc.Vec3(2.0,.34,length),M.pave);
    box('Platform white edge',new pc.Vec3(side*2.82,.365,-(start+length/2)),new pc.Vec3(.12,.025,length),M.white);
    const shelter=new pc.Entity('Glass Luas shelter');shelter.setPosition(side*4.55,.35,-407);app.root.addChild(shelter);
    box('shelter roof',new pc.Vec3(0,2.55,0),new pc.Vec3(1.65,.16,5.0),M.stone,shelter);
    box('shelter glass',new pc.Vec3(side*.68,1.32,0),new pc.Vec3(.08,2.35,4.8),M.wetGlass,shelter);
    cyl('stop pole',new pc.Vec3(-side*.65,1.7,-3.8),new pc.Vec3(.08,1.7,.08),M.black,shelter);
    box('stop marker',new pc.Vec3(-side*.65,3.15,-3.8),new pc.Vec3(.38,.55,.16),M.green,shelter);
    box('Dawson stop nameboard',new pc.Vec3(-side*.59,2.72,-3.8),new pc.Vec3(.08,.30,1.28),signMaterial('DAWSON','#263133','#ffffff','#57b657'),shelter);
    box('ticket machine',new pc.Vec3(-side*.70,.95,3.1),new pc.Vec3(.46,1.55,.55),M.stone,shelter);
  }
}

const landmarkCallouts=[
  {d:15,label:'ARKET · 60 DAWSON STREET'},
  {d:47,label:'HODGES FIGGIS · 56–58'},
  {d:175,label:'CAFÉ EN SEINE · 39/40'},
  {d:282,label:'THE DAWSON LOUNGE · 25'},
  {d:342,label:'THE IVY · 13–17'},
  {d:395,label:'DAWSON LUAS STOP'}
];

function buildPlayer(){
  const root=new pc.Entity('Runner');app.root.addChild(root);
  const hoodie=mat(new pc.Color(.035,.55,.24),{gloss:.28}),pants=mat(new pc.Color(.025,.035,.055),{gloss:.18}),bag=mat(new pc.Color(.45,.25,.10),{gloss:.25}),shoe=mat(new pc.Color(.92,.92,.88),{gloss:.22});
  const body=box('Body',new pc.Vec3(0,.05,0),new pc.Vec3(.92,1.2,.56),hoodie,root);
  sphere('Head',new pc.Vec3(0,.93,-.01),new pc.Vec3(.58,.58,.58),M.skin,root);
  const legL=box('Leg L',new pc.Vec3(-.21,-.87,0),new pc.Vec3(.26,.72,.30),pants,root),legR=box('Leg R',new pc.Vec3(.21,-.87,0),new pc.Vec3(.26,.72,.30),pants,root);
  const armL=box('Arm L',new pc.Vec3(-.57,.02,0),new pc.Vec3(.22,.78,.24),hoodie,root),armR=box('Arm R',new pc.Vec3(.57,.02,0),new pc.Vec3(.22,.78,.24),hoodie,root);
  box('Shoe L',new pc.Vec3(-.21,-1.28,-.08),new pc.Vec3(.31,.20,.52),shoe,root);box('Shoe R',new pc.Vec3(.21,-1.28,-.08),new pc.Vec3(.31,.20,.52),shoe,root);
  box('Bag',new pc.Vec3(0,.10,.38),new pc.Vec3(.69,.82,.27),bag,root);
  root.setPosition(lanes[1],1.02,0);return {entity:root,body,legL,legR,armL,armR,lane:1,distance:0,y:1.02,vy:0,grounded:true,hit:0};
}
const player=buildPlayer();

function obstacle(kind,d,lane,{jumpable=false}={}){
  const root=new pc.Entity(kind+' '+d);root.setPosition(lanes[lane],0,-d);app.root.addChild(root);
  let rig=null;
  if(kind==='bollard'){cyl('bollard',new pc.Vec3(0,.55,0),new pc.Vec3(.30,.55,.30),M.black,root);box('bollard cap',new pc.Vec3(0,1.08,0),new pc.Vec3(.38,.10,.38),M.gold,root);}
  if(kind==='bin'){box('bin',new pc.Vec3(0,.72,0),new pc.Vec3(.92,1.42,.78),M.green,root);box('lid',new pc.Vec3(0,1.48,-.05),new pc.Vec3(1.0,.15,.86),M.black,root);}
  if(kind==='roadworks'){box('barrier',new pc.Vec3(0,.78,0),new pc.Vec3(1.95,1.12,.24),M.orange,root);box('barrier stripe',new pc.Vec3(0,.80,.14),new pc.Vec3(1.35,.18,.04),M.white,root);}
  if(kind==='tourist'){
    rig=humanoid(root,{coat:M.blue,pants:M.black,hair:M.brick,shoes:M.white,pose:'phone',bag:M.gold});
    animated.push({type:'tourist',entity:root,rig,baseX:lanes[lane],baseD:d,phase:d*.11});
  }
  if(kind==='umbrella'){
    rig=humanoid(root,{coat:M.cream,pants:M.navy,hair:M.black,shoes:M.white,pose:'umbrella'});
    box('Umbrella handle',new pc.Vec3(.40,1.78,-.04),new pc.Vec3(.05,1.20,.05),M.black,root);
    sphere('Umbrella canopy',new pc.Vec3(.40,2.55,-.04),new pc.Vec3(1.22,.24,1.22),M.purple,root);
    animated.push({type:'umbrella',entity:root,rig,baseX:lanes[lane],baseD:d,phase:d*.05});
  }
  if(kind==='cyclist'||kind==='delivery'){
    const riderRoot=new pc.Entity(kind==='delivery'?'Delivery rider':'Cyclist rider');root.addChild(riderRoot);riderRoot.setLocalPosition(0,.28,-.08);
    rig=humanoid(riderRoot,{coat:kind==='delivery'?M.green:M.blue,pants:M.black,hair:M.black,shoes:M.white,scale:.86,pose:'ride',bag:kind==='delivery'?M.green:null});
    cyl('Front bicycle wheel',new pc.Vec3(0,.48,-.72),new pc.Vec3(.48,.07,.48),M.black,root,new pc.Vec3(90,0,0));
    cyl('Rear bicycle wheel',new pc.Vec3(0,.48,.72),new pc.Vec3(.48,.07,.48),M.black,root,new pc.Vec3(90,0,0));
    box('Bike top tube',new pc.Vec3(0,.72,0),new pc.Vec3(.10,.10,1.12),M.rail,root);
    box('Bike down tube',new pc.Vec3(0,.60,-.08),new pc.Vec3(.10,.68,.10),M.rail,root).setLocalEulerAngles(38,0,0);
    box('Handlebars',new pc.Vec3(0,1.02,-.58),new pc.Vec3(.82,.07,.08),M.rail,root);
    if(kind==='delivery')box('Delivery box',new pc.Vec3(0,1.12,.70),new pc.Vec3(.82,.70,.64),M.green,root);
    animated.push({type:kind,entity:root,rig,baseX:lanes[lane],baseD:d,phase:d*.07});
  }
  obstacleRecords.push({kind,entity:root,d,lane,jumpable,hit:false,cleared:false});
}
[[35,0,'bollard',1],[50,2,'bin'],[64,1,'tourist'],[78,0,'cyclist'],[92,2,'roadworks'],[108,1,'umbrella'],[124,0,'bin'],[139,2,'tourist'],[154,1,'delivery'],[170,0,'roadworks'],[186,2,'bollard',1],[202,1,'tourist'],[218,0,'cyclist'],[235,2,'bin'],[251,1,'roadworks'],[267,0,'umbrella'],[283,2,'delivery'],[299,1,'bollard',1],[315,0,'tourist'],[331,2,'bin'],[347,1,'roadworks'],[363,0,'cyclist'],[379,2,'umbrella'],[394,1,'tourist'],[407,0,'bollard',1]].forEach(([d,l,k,j])=>obstacle(k,d,l,{jumpable:Boolean(j)}));
obstacle('roadworks',146,0);obstacle('roadworks',146,1);obstacle('roadworks',322,1);obstacle('roadworks',322,2);

function buildTram(){
  const root=new pc.Entity('Last Luas');app.root.addChild(root);const silver=mat(new pc.Color(.74,.77,.81),{gloss:.84,metal:.18});
  box('tram body',new pc.Vec3(0,1.38,0),new pc.Vec3(3.16,2.72,11.2),silver,root);
  box('purple lower',new pc.Vec3(0,.54,0),new pc.Vec3(3.19,.48,11.25),M.purple,root);
  box('front glass',new pc.Vec3(0,1.76,5.64),new pc.Vec3(2.35,1.38,.10),M.glass,root);
  box('destination',new pc.Vec3(0,2.46,5.70),new pc.Vec3(1.35,.30,.08),M.yellow,root);
  box('light l',new pc.Vec3(-.94,.63,5.72),new pc.Vec3(.30,.18,.11),M.lamp,root);box('light r',new pc.Vec3(.94,.63,5.72),new pc.Vec3(.30,.18,.11),M.lamp,root);
  for(let z=-4.25;z<=4.25;z+=2.85){box('tram side glass L',new pc.Vec3(-1.59,1.65,z),new pc.Vec3(.08,1.28,2.25),M.glass,root);box('tram side glass R',new pc.Vec3(1.59,1.65,z),new pc.Vec3(.08,1.28,2.25),M.glass,root);}
  box('roof equipment',new pc.Vec3(0,2.92,-.5),new pc.Vec3(1.15,.18,2.1),M.black,root);
  return {entity:root,distance:GAME.streetLength,pulling:false};
}
const tram=buildTram();
function syncTram(){tram.entity.setPosition(0,.02,-tram.distance);}syncTram();

const camera=new pc.Entity('Camera');camera.addComponent('camera',{clearColor:new pc.Color(.028,.045,.09),fov:67,nearClip:.1,farClip:720});app.root.addChild(camera);camera.setPosition(0,4.2,7.2);

function updateCamera(dt){
  const p=player.entity.getPosition(),rush=state.started&&!state.finished?Math.max(0,(10-state.timeLeft)/10):0,shake=player.hit>0?Math.sin(state.elapsed*48)*.065:0;
  const target=new pc.Vec3(p.x*.16+shake,4.25-rush*.30,p.z+7.15-rush*.62),cur=camera.getPosition(),t=1-Math.exp(-8*dt);
  camera.setPosition(pc.math.lerp(cur.x,target.x,t),pc.math.lerp(cur.y,target.y,t),pc.math.lerp(cur.z,target.z,t));
  camera.lookAt(p.x*.18,1.22,p.z-9.2-rush*1.8);camera.camera.fov=pc.math.lerp(camera.camera.fov,67+rush*7,1-Math.exp(-4*dt));
}

const input={queue:new Set(),downX:0,downY:0,tracking:false};
function enqueue(action){if(state.finished||!state.started)return;input.queue.add(action);}
window.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP'){togglePause();return;}if(['ArrowLeft','KeyA'].includes(e.code))enqueue('left');if(['ArrowRight','KeyD'].includes(e.code))enqueue('right');if(['ArrowUp','KeyW','Space'].includes(e.code))enqueue('jump');});
canvas.addEventListener('pointerdown',e=>{input.downX=e.clientX;input.downY=e.clientY;input.tracking=true;},{passive:true});
canvas.addEventListener('pointerup',e=>{if(!input.tracking)return;input.tracking=false;const dx=e.clientX-input.downX,dy=e.clientY-input.downY,dist=Math.hypot(dx,dy);if(dist<22)enqueue('jump');else if(Math.abs(dx)>Math.abs(dy))enqueue(dx<0?'left':'right');else if(dy<-20)enqueue('jump');},{passive:true});
canvas.addEventListener('pointercancel',()=>input.tracking=false,{passive:true});
$('leftBtn').addEventListener('click',()=>enqueue('left'));$('rightBtn').addEventListener('click',()=>enqueue('right'));$('jumpBtn').addEventListener('click',()=>enqueue('jump'));

const audio={ctx:null,lastBeep:-1,unlock(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();},tone(freq=.1,dur=.08,type='sine',vol=.045){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+dur);o.connect(g).connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+dur);},hit(){this.tone(105,.12,'square',.04);},jump(){this.tone(390,.06,'triangle',.026);},beep(sec){if(sec===this.lastBeep)return;this.lastBeep=sec;this.tone(sec<=3?820:610,.055,'square',.025);},bell(){this.tone(740,.16,'sine',.042);setTimeout(()=>this.tone(990,.28,'sine',.036),120);},warning(){this.tone(620,.065,'square',.024);setTimeout(()=>this.tone(620,.065,'square',.024),145);setTimeout(()=>this.tone(620,.065,'square',.024),290);},win(){this.tone(523,.12,'triangle',.035);setTimeout(()=>this.tone(659,.15,'triangle',.035),120);setTimeout(()=>this.tone(784,.22,'triangle',.035),250);}};

function updatePlayer(dt){
  if(input.queue.has('left'))player.lane=Math.max(0,player.lane-1);if(input.queue.has('right'))player.lane=Math.min(2,player.lane+1);if(input.queue.has('jump')&&player.grounded){player.grounded=false;player.vy=GAME.jumpVelocity;audio.jump();}input.queue.clear();
  const pos=player.entity.getPosition(),tx=lanes[player.lane],x=pc.math.lerp(pos.x,tx,1-Math.exp(-GAME.laneSharpness*dt));
  if(!player.grounded){player.vy-=GAME.gravity*dt;player.y+=player.vy*dt;if(player.y<=1.02){player.y=1.02;player.vy=0;player.grounded=true;}}
  player.hit=Math.max(0,player.hit-dt);
  const urgency=1+Math.max(0,(20-state.timeLeft)/20)*.055;
  const speed=(player.hit>0?GAME.hitSpeed:GAME.speed)*urgency;
  player.distance+=speed*dt;player.entity.setPosition(x,player.y,-player.distance);
  const cycle=player.distance*6.8,swing=player.grounded?Math.sin(cycle)*34:0,bob=player.grounded?Math.abs(Math.sin(cycle))*-.035:0;
  player.legL.setLocalEulerAngles(swing,0,0);player.legR.setLocalEulerAngles(-swing,0,0);player.armL.setLocalEulerAngles(-swing*.72,0,0);player.armR.setLocalEulerAngles(swing*.72,0,0);player.body.setLocalPosition(0,.05+bob,0);
}
function updateObstacles(){
  const px=player.entity.getPosition().x;
  for(const o of obstacleRecords){
    if(o.cleared)continue;
    const op=o.entity.getPosition(),obstacleDistance=-op.z,dz=obstacleDistance-player.distance;
    if(dz<-3){o.cleared=true;continue;}
    const lateral=Math.abs(op.x-px);
    if(Math.abs(dz)>.92||lateral>.82)continue;
    if(o.jumpable&&!player.grounded){o.cleared=true;continue;}
    if(!o.hit){
      o.hit=true;player.hit=GAME.hitDuration;audio.hit();
      if(o.kind==='umbrella'){ui.shell.classList.add('umbrella-hit');setTimeout(()=>ui.shell.classList.remove('umbrella-hit'),420);}
      showToast(o.kind==='tourist'?'SORRY!':o.kind==='cyclist'||o.kind==='delivery'?'WATCH THE BIKE!':o.kind==='umbrella'?'UMBRELLA!':'OUCH!');
    }
  }
}
function animateWorld(){
  for(const a of animated){
    if(a.type==='tourist'){
      const near=Math.max(0,1-Math.abs(a.baseD-player.distance)/26);
      a.entity.setPosition(a.baseX+Math.sin(state.elapsed*1.35+a.phase)*(.16+near*.34),0,-a.baseD);
      if(a.rig){const sway=Math.sin(state.elapsed*2+a.phase)*5;a.rig.torso.setLocalEulerAngles(0,0,sway);}
    }else if(a.type==='umbrella'){
      a.entity.setPosition(a.baseX+Math.sin(state.elapsed*.95+a.phase)*.12,0,-a.baseD);
      a.entity.setLocalEulerAngles(0,Math.sin(state.elapsed*.7+a.phase)*7,0);
    }else if(a.type==='pavement'){
      a.entity.setPosition(a.baseX,0,-a.baseD+((state.elapsed*.45+a.phase)%5)-2.5);
      if(a.rig){
        const swing=Math.sin(state.elapsed*4.2+a.phase)*18;
        a.rig.legL.setLocalEulerAngles(swing,0,0);a.rig.legR.setLocalEulerAngles(-swing,0,0);
        a.rig.armL.setLocalEulerAngles(-swing*.65,0,0);a.rig.armR.setLocalEulerAngles(swing*.65,0,0);
      }
    }else{
      const direction=a.type==='delivery'?-1:1;
      a.entity.setPosition(a.baseX+Math.sin(state.elapsed*1.1+a.phase)*.28,0,-a.baseD+Math.sin(state.elapsed*1.45+a.phase)*1.25*direction);
      a.entity.setLocalEulerAngles(0,Math.sin(state.elapsed*1.1+a.phase)*4,0);
    }
  }
}
function updateTram(dt){
  if(state.timeLeft<=10&&!state.doorsWarned){state.doorsWarned=true;audio.warning();showToast('DOORS CLOSING!');}
  if(state.timeLeft<=GAME.pullAwayAt&&!tram.pulling){tram.pulling=true;if(!state.pullAwayWarned){state.pullAwayWarned=true;audio.bell();showToast('THE LUAS IS MOVING!');}}
  if(tram.pulling){tram.distance+=GAME.tramSpeed*dt;syncTram();}
}
function formatTime(seconds){const v=Math.max(0,Math.ceil(seconds)),m=String(Math.floor(v/60)).padStart(2,'0'),s=String(v%60).padStart(2,'0');return m+':'+s;}
function currentCallout(){let label='DAWSON STREET';for(const item of landmarkCallouts)if(player.distance>=item.d)label=item.label;return label;}
function updateHud(){ui.time.textContent=formatTime(state.timeLeft);ui.distance.textContent=String(Math.floor(player.distance));const gap=Math.max(0,tram.distance-player.distance);ui.shell.classList.toggle('final-sprint',state.started&&!state.finished&&state.timeLeft<=10);if(state.timeLeft<=GAME.pullAwayAt&&state.timeLeft>0){ui.callout.textContent="IT'S PULLING AWAY · "+Math.ceil(gap)+' m';ui.timerCard.classList.add('danger');}else if(player.distance>390){ui.callout.textContent='LUAS AHEAD · '+Math.ceil(gap)+' m';ui.timerCard.classList.remove('danger');}else{ui.callout.textContent=currentCallout();ui.timerCard.classList.remove('danger');}}
function showToast(value){ui.toast.textContent=value;ui.toast.classList.add('show');state.toastTimer=.7;}
function finish(won){
  if(state.finished)return;state.finished=true;state.paused=false;ui.shell.classList.remove('final-sprint');ui.result.hidden=false;ui.result.classList.add('visible');
  let copy=won?'Last Luas secured. Same panic tomorrow?':'The doors won this round.';
  if(won){try{const key='last-luas-best-v1',old=Number(localStorage.getItem(key)||-1);if(state.timeLeft>old){localStorage.setItem(key,String(state.timeLeft));copy='NEW BEST · You caught it with '+formatTime(state.timeLeft)+' left.';}}catch{}audio.win();}
  ui.resultTitle.textContent=won?'YOU MADE IT!':'MISSED IT!';ui.resultText.textContent=copy;ui.resultDistance.textContent=Math.floor(player.distance)+' m';ui.resultTime.textContent=formatTime(state.timeLeft);
}
function reset(){location.reload();}
function togglePause(force){if(!state.started||state.finished)return;state.paused=typeof force==='boolean'?force:!state.paused;ui.pause.hidden=!state.paused;ui.pause.classList.toggle('visible',state.paused);$('pauseBtn').textContent=state.paused?'▶':'Ⅱ';}

$('playBtn').addEventListener('click',()=>{audio.unlock();state.started=true;ui.start.classList.remove('visible');ui.start.hidden=true;showToast('90 SECONDS. GO!');});$('pauseBtn').addEventListener('click',()=>togglePause());$('resumeBtn').addEventListener('click',()=>togglePause(false));$('restartBtn').addEventListener('click',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.started&&!state.finished)togglePause(true);});window.addEventListener('resize',()=>app.resizeCanvas());

buildStreet();updateHud();updateCamera(0);app.start();
document.documentElement.dataset.lastLuasReady='1';
document.documentElement.dataset.lastLuasBuild=BUILD;
const smokeParams=new URLSearchParams(location.search);
if(smokeParams.get('smoke')==='1'){
  const preview=Math.max(0,Math.min(GAME.streetLength-8,Number(smokeParams.get('distance')||80)||80));
  player.distance=preview;player.entity.setPosition(lanes[1],player.y,-preview);
  ui.start.classList.remove('visible');ui.start.hidden=true;updateHud();updateCamera(1);animateWorld();
}
app.on('update',dt=>{
  dt=Math.min(dt,.05);if(!state.started||state.paused||state.finished)return;
  state.elapsed+=dt;state.timeLeft-=dt;updatePlayer(dt);updateObstacles();animateWorld();updateTram(dt);updateCamera(dt);updateHud();
  if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)ui.toast.classList.remove('show');}
  const sec=Math.ceil(state.timeLeft);if(sec<=10&&sec>0)audio.beep(sec);
  const gap=tram.distance-player.distance;if(player.distance>=GAME.streetLength-23&&gap<=GAME.catchGap){finish(true);return;}if(state.timeLeft<=0)finish(false);
});
console.info('Last Luas '+BUILD+' · PlayCanvas '+(pc.version||'2.22.2'));
