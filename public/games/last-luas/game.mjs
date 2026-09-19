import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.22.2/build/playcanvas.mjs';

const BUILD='0.5.0';
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

const M2={
  granite:mat(new pc.Color(.48,.49,.49),{gloss:.42}),
  sideRoad:mat(new pc.Color(.035,.043,.054),{gloss:.74}),
  trackBed:mat(new pc.Color(.13,.14,.15),{gloss:.58}),
  tactile:mat(new pc.Color(.88,.70,.18),{gloss:.32}),
  signalGreen:mat(new pc.Color(.10,.72,.34),{emissive:new pc.Color(.05,.50,.18),gloss:.46}),
  tramSilver:mat(new pc.Color(.72,.75,.78),{gloss:.88,metal:.22}),
  tramYellow:mat(new pc.Color(.94,.62,.08),{gloss:.64}),
  tramPurple:mat(new pc.Color(.31,.18,.43),{gloss:.58}),
  stoneLight:mat(new pc.Color(.73,.70,.64),{gloss:.34}),
  taxi:mat(new pc.Color(.13,.16,.18),{gloss:.72,metal:.10}),
  van:mat(new pc.Color(.74,.76,.75),{gloss:.55,metal:.06})
};

const sun=new pc.Entity('Evening light');sun.addComponent('light',{type:'directional',color:new pc.Color(.74,.79,1),intensity:1.45,castShadows:true,shadowResolution:2048,shadowDistance:55});sun.setEulerAngles(48,32,0);app.root.addChild(sun);
const fill=new pc.Entity('Warm city fill');fill.addComponent('light',{type:'directional',color:new pc.Color(1,.57,.30),intensity:.35,castShadows:false});fill.setEulerAngles(-25,-145,0);app.root.addChild(fill);

function buildStreet(){
  box('Wet Dawson Street',new pc.Vec3(0,-.17,-GAME.streetLength/2),new pc.Vec3(8.5,.28,GAME.streetLength+35),M.road);
  box('Luas track bed',new pc.Vec3(0,-.055,-GAME.streetLength/2),new pc.Vec3(2.82,.065,GAME.streetLength+35),M2.trackBed);
  box('Left pavement',new pc.Vec3(-6.25,.02,-GAME.streetLength/2),new pc.Vec3(4.0,.25,GAME.streetLength+35),M.pave);
  box('Right pavement',new pc.Vec3(6.25,.02,-GAME.streetLength/2),new pc.Vec3(4.0,.25,GAME.streetLength+35),M.pave);
  box('Granite kerb L',new pc.Vec3(-4.16,.17,-GAME.streetLength/2),new pc.Vec3(.22,.25,GAME.streetLength+35),M2.granite);
  box('Granite kerb R',new pc.Vec3(4.16,.17,-GAME.streetLength/2),new pc.Vec3(.22,.25,GAME.streetLength+35),M2.granite);
  [-1.20,1.20].forEach((x,i)=>box('Rail '+i,new pc.Vec3(x,.015,-GAME.streetLength/2),new pc.Vec3(.095,.055,GAME.streetLength+35),M.rail));
  for(let d=7;d<GAME.streetLength;d+=7){box('Paving seam L'+d,new pc.Vec3(-4.35,.155,-d),new pc.Vec3(.055,.018,1.7),M.rail);box('Paving seam R'+d,new pc.Vec3(4.35,.155,-d),new pc.Vec3(.055,.018,1.7),M.rail);}
  for(let d=16,i=0;d<GAME.streetLength;d+=19,i++){
    for(const side of [-1,1]){
      cyl('Lamp post',new pc.Vec3(side*4.72,2.35,-d),new pc.Vec3(.10,2.35,.10),M.black);
      box('Lamp',new pc.Vec3(side*4.72,4.82,-d),new pc.Vec3(.34,.44,.34),M.lamp);
      if(i%2===0)cyl('Bollard',new pc.Vec3(side*4.15,.52,-d-4.2),new pc.Vec3(.22,.52,.22),M.black);
    }
  }
  for(let d=28;d<GAME.streetLength;d+=34){
    box('Cross wire',new pc.Vec3(0,5.85,-d),new pc.Vec3(10.0,.025,.025),M.black);
    cyl('Wire pole L',new pc.Vec3(-4.9,3.0,-d),new pc.Vec3(.07,3.0,.07),M.black);
    cyl('Wire pole R',new pc.Vec3(4.9,3.0,-d),new pc.Vec3(.07,3.0,.07),M.black);
    box('Catenary arm L',new pc.Vec3(-2.75,5.42,-d),new pc.Vec3(4.25,.035,.035),M.black);
    box('Catenary contact line',new pc.Vec3(0,5.35,-d-17),new pc.Vec3(.026,.026,34),M.black);
  }
  buildStreetGeometry();
  buildGenericBlocks();
  buildLandmarks();
  buildWetDetails();
  buildStreetLife();
  buildStreetFurniture();
  buildKerbLife();
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

function streetSign(name,text,d,side,y=4.15){
  cyl(name+' pole',new pc.Vec3(side*4.55,y/2,-d),new pc.Vec3(.055,y/2,.055),M.black);
  box(name,new pc.Vec3(side*4.38,y,-d),new pc.Vec3(.16,.34,2.25),signMaterial(text,'#22406a','#ffffff'),app.root);
}
function sideStreet(name,d,side){
  box(name+' carriageway',new pc.Vec3(side*8.05,.10,-d),new pc.Vec3(7.3,.16,5.5),M2.sideRoad);
  box(name+' building break',new pc.Vec3(side*10.1,2.30,-d),new pc.Vec3(5.9,4.55,5.2),M2.sideRoad);
  box(name+' far pavement',new pc.Vec3(side*10.2,.20,-d-2.35),new pc.Vec3(5.5,.18,.55),M2.granite);
  streetSign(name+' sign',name.toUpperCase(),d-2.45,side,3.72);
}
function crossing(d){
  for(let i=-4;i<=4;i++)box('Crossing stripe '+d+' '+i,new pc.Vec3(i*.82,.031,-d),new pc.Vec3(.48,.018,1.45),M.white);
  for(const side of [-1,1])box('Tactile crossing '+d+' '+side,new pc.Vec3(side*4.06,.165,-d),new pc.Vec3(.58,.026,2.4),M2.tactile);
}
function buildStreetGeometry(){
  sideStreet('Molesworth Street',145,1);
  sideStreet('South Anne Street',278,-1);
  sideStreet('Duke Street',369,-1);
  [18,145,278,369].forEach(crossing);
  streetSign('Dawson street plate north','DAWSON STREET · SRÁID DHÁSAIN',24,-1,4.32);
  streetSign('Dawson street plate south','DAWSON STREET · SRÁID DHÁSAIN',344,1,4.32);
  for(let d=22,i=0;d<GAME.streetLength-18;d+=26,i++){
    const side=i%2?-1:1;
    box('Drain grate '+i,new pc.Vec3(side*3.92,.038,-d),new pc.Vec3(.42,.022,1.20),M.rail);
  }
  for(const d of [62,166,236,316])cyl('Manhole '+d,new pc.Vec3((d%3-1)*2.1,.025,-d),new pc.Vec3(.62,.028,.62),M2.granite);
}
function streetBin(d,side){
  const root=new pc.Entity('Dublin street bin');root.setPosition(side*4.82,0,-d);app.root.addChild(root);
  cyl('bin body',new pc.Vec3(0,.58,0),new pc.Vec3(.35,.58,.35),M.black,root);
  box('bin gold band',new pc.Vec3(0,1.02,0),new pc.Vec3(.72,.09,.72),M.gold,root);
}
function bikeStand(d,side){
  const root=new pc.Entity('Bike stand');root.setPosition(side*5.05,0,-d);app.root.addChild(root);
  for(let i=-1;i<=1;i++){
    cyl('rack post',new pc.Vec3(i*.52,.42,0),new pc.Vec3(.055,.42,.055),M.rail,root);
    box('rack top',new pc.Vec3(i*.52,.82,0),new pc.Vec3(.42,.055,.055),M.rail,root);
  }
}
function trafficLight(d,side){
  const root=new pc.Entity('Traffic signal');root.setPosition(side*4.56,0,-d);app.root.addChild(root);
  cyl('signal pole',new pc.Vec3(0,1.68,0),new pc.Vec3(.065,1.68,.065),M.black,root);
  box('signal head',new pc.Vec3(0,3.18,0),new pc.Vec3(.34,.76,.38),M.black,root);
  sphere('green signal',new pc.Vec3(0,3.03,-.20),new pc.Vec3(.18,.18,.08),M2.signalGreen,root);
}
function buildStreetFurniture(){
  [36,92,184,248,326,401].forEach((d,i)=>streetBin(d,i%2?-1:1));
  [118,232,301,354].forEach((d,i)=>bikeStand(d,i%2?1:-1));
  [145,278,369].forEach((d,i)=>{trafficLight(d-2.4,-1);trafficLight(d+2.4,1);});
  for(const [d,side] of [[74,-1],[214,1],[340,-1]]){
    const root=new pc.Entity('Bench');root.setPosition(side*5.28,0,-d);app.root.addChild(root);
    box('seat',new pc.Vec3(0,.65,0),new pc.Vec3(.75,.10,1.55),M.gold,root);
    box('back',new pc.Vec3(side*.32,1.02,0),new pc.Vec3(.10,.78,1.55),M.black,root);
  }
}

function cornice(name,z,y,length,side,material=M.cream){
  box(name,new pc.Vec3(side*6.48,y,z),new pc.Vec3(.34,.18,length),material);
}
function pilaster(name,z,y,height,side,material=M2.stoneLight||M.cream){
  box(name,new pc.Vec3(side*6.42,y,z),new pc.Vec3(.34,height,.42),material);
}
function facadePlant(name,z,y,side,scale=.62){
  sphere(name,new pc.Vec3(side*6.24,y,z),new pc.Vec3(scale,scale*.9,scale),M.leaf);
}
function parkedVehicle(name,d,side,kind='taxi'){
  const root=new pc.Entity(name);root.setPosition(side*3.74,.08,-d);app.root.addChild(root);
  const body=kind==='taxi'?M2.taxi:M2.van;
  box(name+' body',new pc.Vec3(0,.62,0),new pc.Vec3(1.42,.74,3.20),body,root);
  box(name+' cabin',new pc.Vec3(0,1.17,-.18),new pc.Vec3(1.22,.65,1.70),M.glass,root);
  if(kind==='taxi')box(name+' roof sign',new pc.Vec3(0,1.58,-.18),new pc.Vec3(.52,.18,.72),M.yellow,root);
  if(kind==='van')box(name+' rear box',new pc.Vec3(0,1.10,.62),new pc.Vec3(1.38,1.22,1.75),body,root);
  for(const x of [-.72,.72])for(const z of [-1.03,1.03])cyl(name+' wheel',new pc.Vec3(x,.36,z),new pc.Vec3(.28,.10,.28),M.black,root,new pc.Vec3(0,0,90));
}
function buildKerbLife(){
  parkedVehicle('Dublin taxi 1',166,1,'taxi');
  parkedVehicle('Dublin taxi 2',307,-1,'taxi');
  parkedVehicle('Delivery van',231,-1,'van');
  for(const [d,side] of [[69,1],[201,-1],[345,1]]){
    const root=new pc.Entity('Locked bicycle');root.setPosition(side*5.05,0,-d);app.root.addChild(root);
    cyl('bike wheel front',new pc.Vec3(0,.42,-.54),new pc.Vec3(.43,.055,.43),M.black,root,new pc.Vec3(90,0,0));
    cyl('bike wheel rear',new pc.Vec3(0,.42,.54),new pc.Vec3(.43,.055,.43),M.black,root,new pc.Vec3(90,0,0));
    box('bike frame',new pc.Vec3(0,.72,0),new pc.Vec3(.10,.10,1.05),M.rail,root);
  }
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
  // South-to-north street order: St Stephen's Green end towards Duke Street/Nassau Street.
  box('St Stephens Green stone gate glimpse',new pc.Vec3(-8.8,2.1,-5),new pc.Vec3(7.2,4.2,6.2),M2.granite);
  box('Green railings',new pc.Vec3(-5.65,1.45,-8),new pc.Vec3(.18,2.55,8.5),M.black);

  // The Ivy, close to the Green end.
  const ivy=box('The Ivy Dawson Street',new pc.Vec3(9.80,6.75,-52),new pc.Vec3(6.85,13.5,23),M.cream);
  windows(ivy,1,13.5,23,true);
  box('Ivy glass frontage',new pc.Vec3(6.56,1.60,-52),new pc.Vec3(.20,2.80,19.5),M.glass);
  awning('Ivy green canopy',-47.5,5.8,1,M.green,3.15);
  nameboard('Ivy nameboard',-47.5,3.36,2.7,1,signMaterial('THE IVY','#123a2a','#e0bd71'));
  planter(47,1);planter(52,1);planter(57,1);
  cornice('Ivy upper cornice',-52,5.35,20.4,1,M2.stoneLight);
  for(const [z,y] of [[-59,4.4],[-55,5.9],[-49,4.8],[-45,6.4]])facadePlant('Ivy facade planting',z,y,1,.52);

  // Dawson Lounge: tiny dark frontage and red door.
  const lounge=box('Dawson Lounge',new pc.Vec3(-9.80,5.55,-90),new pc.Vec3(6.85,11.1,12),mat(new pc.Color(.20,.18,.17),{gloss:.25}));
  windows(lounge,-1,11.1,12,false);
  box('Dawson dark frontage',new pc.Vec3(-6.56,1.48,-90),new pc.Vec3(.22,2.55,9.8),M.black);
  box('Dawson red door',new pc.Vec3(-6.35,1.32,-90),new pc.Vec3(.25,2.40,1.28),M.red);
  trim('Dawson fascia',-90,2.93,9.6,-1,M.gold,.09);
  nameboard('Dawson Lounge nameboard',-90,3.08,4.1,-1,signMaterial('THE DAWSON LOUNGE','#171717','#d7b56b'));

  // Mansion House: pale civic facade with a simple portico.
  const mansion=box('Mansion House',new pc.Vec3(9.95,5.9,-128),new pc.Vec3(6.9,11.8,21),M.cream);
  windows(mansion,1,11.8,21,false);
  box('Mansion House entrance',new pc.Vec3(6.50,1.55,-128),new pc.Vec3(.22,2.75,3.7),M.black);
  for(const z of [-130.3,-125.7])cyl('Mansion House portico column',new pc.Vec3(6.22,1.80,z),new pc.Vec3(.22,1.80,.22),M2.granite);
  box('Mansion House portico',new pc.Vec3(6.20,3.58,-128),new pc.Vec3(.90,.25,6.1),M2.granite);
  nameboard('Mansion House plaque',-128,3.98,2.4,1,signMaterial('MANSION HOUSE','#e7e0cf','#252525'));
  cornice('Mansion House cornice',-128,5.25,18.8,1,M2.stoneLight);
  box('Mansion House pediment beam',new pc.Vec3(6.28,4.14,-128),new pc.Vec3(.86,.28,6.55),M2.stoneLight);
  sphere('Mansion House crest',new pc.Vec3(6.12,4.67,-128),new pc.Vec3(.34,.42,.34),M.gold);

  // Royal Irish Academy: red brick with restrained stone trim.
  const ria=box('Royal Irish Academy',new pc.Vec3(-9.82,6.35,-194),new pc.Vec3(6.85,12.7,17),M.brick);
  windows(ria,-1,12.7,17,false);
  box('RIA stone entrance',new pc.Vec3(-6.54,1.65,-194),new pc.Vec3(.22,2.95,3.3),M2.granite);
  box('RIA door',new pc.Vec3(-6.32,1.35,-194),new pc.Vec3(.20,2.45,1.55),M.black);
  nameboard('Royal Irish Academy nameboard',-194,3.35,5.6,-1,signMaterial('ROYAL IRISH ACADEMY','#ebe6d8','#1b1b1b'));
  cornice('RIA stone string course',-194,5.28,15.4,-1,M2.stoneLight);
  for(const z of [-201.2,-186.8])box('RIA stone quoin',new pc.Vec3(-6.40,5.8,z),new pc.Vec3(.38,8.6,.52),M2.stoneLight);

  // St Ann's Church: tall stone frontage with a central doorway and vertical glazing.
  const ann=box("St Ann's Church",new pc.Vec3(9.90,7.2,-215),new pc.Vec3(6.9,14.4,18),M2.granite);
  box('St Anns dark doorway',new pc.Vec3(6.48,1.65,-215),new pc.Vec3(.24,3.1,2.7),M.black);
  for(const z of [-220,-215,-210])box('St Anns tall window',new pc.Vec3(6.45,6.35,z),new pc.Vec3(.18,4.2,1.55),M.glass);
  box('St Anns parapet',new pc.Vec3(6.38,10.7,-215),new pc.Vec3(.28,.35,14.8),M.cream);
  for(const z of [-222,-208])box('St Anns pilaster',new pc.Vec3(6.37,5.8,z),new pc.Vec3(.34,9.7,.55),M2.stoneLight);
  cornice('St Anns lower cornice',-215,3.65,15.2,1,M2.stoneLight);

  // Café en Seine: blue frontage, pale striped awnings and planting.
  const cafe=box('Cafe en Seine',new pc.Vec3(9.80,6.15,-254),new pc.Vec3(6.85,12.3,18),M.brick);
  windows(cafe,1,12.3,18,false);
  box('Cafe blue frontage',new pc.Vec3(6.54,1.60,-254),new pc.Vec3(.22,2.85,15.5),M.navy);
  trim('Cafe gold fascia',-254,3.12,15.4,1,M.gold,.10);
  nameboard('Cafe en Seine nameboard',-254,3.28,6.9,1,signMaterial('CAFÉ en SEINE','#15364b','#e5cf99'));
  for(let z=-259.5;z<=-248.5;z+=3.6){awning('Cafe striped awning',z,2.7,1,M.navy,3.43);box('Cafe awning stripe',new pc.Vec3(6.13,3.50,z),new pc.Vec3(.85,.07,.18),M.white);}
  planter(249,1);planter(255,1);planter(261,1);tree(257,1);
  cornice('Cafe en Seine upper trim',-254,5.05,16.2,1,M.gold);

  // Hodges Figgis sits close to the Dawson stop end.
  const hf=box('Hodges Figgis',new pc.Vec3(-9.80,7.65,-334),new pc.Vec3(6.85,15.3,19),M.brick);
  windows(hf,-1,15.3,19,false);
  box('Hodges green frontage',new pc.Vec3(-6.55,1.62,-334),new pc.Vec3(.22,2.80,16.8),M.green);
  trim('Hodges brass fascia',-334,3.05,16.6,-1,M.gold,.14);
  nameboard('Hodges Figgis nameboard',-334,3.24,7.5,-1,signMaterial('HODGES FIGGIS','#143a2b','#e4c477'));
  for(let z=-340.2;z<=-327.8;z+=3.1)box('Hodges window bay',new pc.Vec3(-6.37,1.52,z),new pc.Vec3(.18,2.05,2.35),M.glass);
  cornice('Hodges stone cornice',-334,5.52,17.2,-1,M2.stoneLight);
  for(const z of [-341.5,-326.5])box('Hodges stone edge',new pc.Vec3(-6.40,6.9,z),new pc.Vec3(.38,9.8,.45),M2.stoneLight);

  // Modern glazed corner near Nassau Street.
  const arket=box('ARKET Grafton Place',new pc.Vec3(9.72,7.25,-359),new pc.Vec3(6.95,14.5,24),M.stone);
  windows(arket,1,14.5,24,true);
  box('ARKET glass ground floor',new pc.Vec3(6.56,1.72,-359),new pc.Vec3(.16,3.15,20.8),M.glass);
  for(let z=-368;z<=-350;z+=4.4)box('ARKET mullion',new pc.Vec3(6.38,1.75,z),new pc.Vec3(.25,3.25,.11),M.stone);
  nameboard('ARKET wordmark',-359,3.52,3.7,1,signMaterial('ARKET','#eee9df','#151515'));
  for(const y of [4.25,7.15,10.05])cornice('ARKET floor slab '+y,-359,y,21.0,1,M2.stoneLight);

  // A final stone edge gives a glimpse of the Nassau Street / Trinity end beyond the stop.
  box('Trinity College stone boundary glimpse',new pc.Vec3(-10.0,2.5,-445),new pc.Vec3(7.0,5.0,24),M2.granite);
}

function buildWetDetails(){
  // Thin glossy patches sell the rainy street without expensive planar reflections.
  for(let d=20,i=0;d<GAME.streetLength-30;d+=17,i++){
    const lane=lanes[i%3];
    const p=box('Puddle',new pc.Vec3(lane+(i%2?.35:-.25),.018,-d),new pc.Vec3(1.45,.012,2.4+(i%3)*.5),M.wetGlass);
    p.setLocalEulerAngles(0,(i%5-2)*7,0);
  }
}

function ambientPerson(z,side,phase){
  const root=new pc.Entity('Pavement pedestrian');
  root.setPosition(side*(4.95+(phase%3)*.35),0,-z);app.root.addChild(root);
  const coat=[M.blue,M.cream,M.green,M.pink][phase%4];
  box('body',new pc.Vec3(0,1.0,0),new pc.Vec3(.56,1.2,.42),coat,root);
  sphere('head',new pc.Vec3(0,1.83,0),new pc.Vec3(.43,.43,.43),M.skin,root);
  animated.push({type:'pavement',entity:root,baseX:root.getPosition().x,baseD:z,phase:phase*.7});
}
function buildStreetLife(){
  let phase=0;
  for(let d=30;d<GAME.streetLength-25;d+=23){ambientPerson(d,-1,phase++);ambientPerson(d+9,1,phase++);}
  [74,122,215,260,374].forEach((d,i)=>tree(d,i%2?1:-1));
  [42,98,234,306,387].forEach((d,i)=>planter(d,i%2?1:-1));
}

function buildLuasStop(){
  const start=382,length=45;
  for(const side of [-1,1]){
    const x=side*3.72;
    box('Dawson raised platform',new pc.Vec3(x,.18,-(start+length/2)),new pc.Vec3(2.0,.34,length),M.pave);
    box('Platform white edge',new pc.Vec3(side*2.82,.365,-(start+length/2)),new pc.Vec3(.12,.025,length),M.white);
    box('Platform tactile edge',new pc.Vec3(side*3.05,.385,-(start+length/2)),new pc.Vec3(.28,.025,length),M2.tactile);
    const shelter=new pc.Entity('Glass Luas shelter');shelter.setPosition(side*4.55,.35,-405);app.root.addChild(shelter);
    box('shelter roof',new pc.Vec3(0,2.55,0),new pc.Vec3(1.65,.16,5.0),M.stone,shelter);
    box('shelter glass',new pc.Vec3(side*.68,1.32,0),new pc.Vec3(.08,2.35,4.8),M.wetGlass,shelter);
    box('shelter bench',new pc.Vec3(-side*.15,.62,0),new pc.Vec3(.62,.10,3.4),M.gold,shelter);
    cyl('stop pole',new pc.Vec3(-side*.65,1.7,-3.8),new pc.Vec3(.08,1.7,.08),M.black,shelter);
    box('stop marker',new pc.Vec3(-side*.65,3.15,-3.8),new pc.Vec3(.38,.55,.16),M.green,shelter);
    box('Dawson stop nameboard',new pc.Vec3(-side*.59,2.72,-3.8),new pc.Vec3(.08,.30,1.28),signMaterial('DAWSON','#263133','#ffffff','#57b657'),shelter);
    box('Realtime display',new pc.Vec3(-side*.61,2.05,-3.8),new pc.Vec3(.10,.40,.78),signMaterial('NORTHBOUND · 1 MIN','#101819','#a7ffb5'),shelter);
    box('ticket machine',new pc.Vec3(-side*.70,.95,3.1),new pc.Vec3(.46,1.55,.55),M.stone,shelter);
  }
  for(let i=-3;i<=3;i++)box('Platform crossing '+i,new pc.Vec3(i*.85,.04,-380),new pc.Vec3(.52,.018,1.35),M.white);
}

const landmarkCallouts=[
  {d:8,label:"ST STEPHEN'S GREEN · DAWSON STREET"},
  {d:42,label:'THE IVY · 13–17 DAWSON STREET'},
  {d:82,label:'THE DAWSON LOUNGE · 25'},
  {d:118,label:'MANSION HOUSE'},
  {d:145,label:'MOLESWORTH STREET'},
  {d:184,label:'ROYAL IRISH ACADEMY'},
  {d:207,label:"ST ANN'S CHURCH"},
  {d:244,label:'CAFÉ EN SEINE · 39/40'},
  {d:278,label:'SOUTH ANNE STREET'},
  {d:324,label:'HODGES FIGGIS · 56–58'},
  {d:351,label:'ARKET · 60 DAWSON STREET'},
  {d:369,label:'DUKE STREET · DAWSON LUAS STOP'},
  {d:389,label:'DAWSON LUAS STOP'}
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
  if(kind==='bollard'){cyl('bollard',new pc.Vec3(0,.55,0),new pc.Vec3(.38,.55,.38),M.black,root);}
  if(kind==='bin'){box('bin',new pc.Vec3(0,.72,0),new pc.Vec3(.92,1.42,.78),M.green,root);box('lid',new pc.Vec3(0,1.48,-.05),new pc.Vec3(1.0,.15,.86),M.black,root);}
  if(kind==='roadworks'){box('barrier',new pc.Vec3(0,.78,0),new pc.Vec3(1.95,1.12,.24),M.orange,root);box('barrier stripe',new pc.Vec3(0,.80,.14),new pc.Vec3(1.35,.18,.04),M.white,root);}
  if(kind==='tourist'){box('coat',new pc.Vec3(0,1.02,0),new pc.Vec3(.72,1.30,.48),M.blue,root);sphere('head',new pc.Vec3(0,1.90,0),new pc.Vec3(.48,.48,.48),M.skin,root);box('phone',new pc.Vec3(.34,1.45,-.18),new pc.Vec3(.08,.28,.16),M.black,root);animated.push({type:'tourist',entity:root,baseX:lanes[lane],baseD:d,phase:d*.11});}
  if(kind==='umbrella'){box('person',new pc.Vec3(0,.95,0),new pc.Vec3(.60,1.2,.45),M.cream,root);sphere('umbrella',new pc.Vec3(0,2.05,0),new pc.Vec3(1.25,.28,1.25),M.purple,root);animated.push({type:'umbrella',entity:root,baseX:lanes[lane],baseD:d,phase:d*.05});}
  if(kind==='cyclist'||kind==='delivery'){const body=kind==='delivery'?M.green:M.blue;cyl('wheel1',new pc.Vec3(0,.48,-.55),new pc.Vec3(.48,.10,.48),M.black,root,new pc.Vec3(90,0,0));cyl('wheel2',new pc.Vec3(0,.48,.55),new pc.Vec3(.48,.10,.48),M.black,root,new pc.Vec3(90,0,0));box('rider',new pc.Vec3(0,1.30,0),new pc.Vec3(.60,1.05,.55),body,root);if(kind==='delivery')box('delivery box',new pc.Vec3(0,1.42,.48),new pc.Vec3(.75,.62,.58),M.green,root);animated.push({type:kind,entity:root,baseX:lanes[lane],baseD:d,phase:d*.07});}
  obstacleRecords.push({kind,entity:root,d,lane,jumpable,hit:false,cleared:false});
}
[[35,0,'bollard',1],[50,2,'bin'],[64,1,'tourist'],[78,0,'cyclist'],[92,2,'roadworks'],[108,1,'umbrella'],[124,0,'bin'],[139,2,'tourist'],[154,1,'delivery'],[170,0,'roadworks'],[186,2,'bollard',1],[202,1,'tourist'],[218,0,'cyclist'],[235,2,'bin'],[251,1,'roadworks'],[267,0,'umbrella'],[283,2,'delivery'],[299,1,'bollard',1],[315,0,'tourist'],[331,2,'bin'],[347,1,'roadworks'],[363,0,'cyclist'],[379,2,'umbrella'],[394,1,'tourist'],[407,0,'bollard',1]].forEach(([d,l,k,j])=>obstacle(k,d,l,{jumpable:Boolean(j)}));
obstacle('roadworks',146,0);obstacle('roadworks',146,1);obstacle('roadworks',322,1);obstacle('roadworks',322,2);

function buildTram(){
  const root=new pc.Entity('Last Luas');app.root.addChild(root);
  const segment=(label,z,front=false)=>{
    box(label+' silver body',new pc.Vec3(0,1.38,z),new pc.Vec3(3.16,2.72,7.45),M2.tramSilver,root);
    box(label+' purple skirt',new pc.Vec3(0,.43,z),new pc.Vec3(3.20,.30,7.50),M2.tramPurple,root);
    box(label+' yellow waist band',new pc.Vec3(0,.82,z),new pc.Vec3(3.22,.16,7.52),M2.tramYellow,root);
    for(const side of [-1,1]){
      for(const wz of [-2.35,0,2.35])box(label+' side glass',new pc.Vec3(side*1.59,1.76,z+wz),new pc.Vec3(.08,1.18,1.72),M.glass,root);
      for(const dz of [-1.17,1.17]){
        box(label+' door glass',new pc.Vec3(side*1.60,1.48,z+dz),new pc.Vec3(.075,1.58,1.02),M.glass,root);
        box(label+' door yellow edge',new pc.Vec3(side*1.65,1.45,z+dz+.52),new pc.Vec3(.04,1.78,.065),M2.tramYellow,root);
      }
      box(label+' LUAS side wordmark',new pc.Vec3(side*1.64,1.02,z+2.83),new pc.Vec3(.05,.24,.72),signMaterial('LUAS','#dfe1df','#715184'),root);
    }
    for(const wz of [-2.45,2.45])for(const side of [-1,1])cyl(label+' bogie wheel',new pc.Vec3(side*1.53,.34,z+wz),new pc.Vec3(.31,.10,.31),M.black,root,new pc.Vec3(0,0,90));
    if(front){
      box('front glass',new pc.Vec3(0,1.78,z+3.78),new pc.Vec3(2.36,1.42,.10),M.glass,root);
      box('destination display',new pc.Vec3(0,2.46,z+3.84),new pc.Vec3(1.35,.30,.08),signMaterial('BROOMBRIDGE','#071c12','#75ff9b'),root);
      box('LUAS front wordmark',new pc.Vec3(0,1.04,z+3.86),new pc.Vec3(.82,.24,.08),signMaterial('LUAS','#d9dde0','#6f4b85'),root);
      box('front yellow band',new pc.Vec3(0,.76,z+3.84),new pc.Vec3(2.75,.18,.11),M2.tramYellow,root);
      box('light l',new pc.Vec3(-.94,.58,z+3.87),new pc.Vec3(.30,.18,.11),M.lamp,root);
      box('light r',new pc.Vec3(.94,.58,z+3.87),new pc.Vec3(.30,.18,.11),M.lamp,root);
    }
  };
  segment('Front car',0,true);
  segment('Centre car',-8.25,false);
  segment('Rear car',-16.50,false);
  for(const z of [-4.13,-12.38]){
    box('Articulation bellows',new pc.Vec3(0,1.45,z),new pc.Vec3(3.05,2.40,.72),M.black,root);
    for(const x of [-1.15,-.58,0,.58,1.15])box('Bellows rib',new pc.Vec3(x,1.45,z-.38),new pc.Vec3(.055,2.22,.08),M.rail,root);
  }
  box('roof equipment',new pc.Vec3(0,2.92,-8.25),new pc.Vec3(1.25,.18,2.55),M.black,root);
  box('pantograph lower A',new pc.Vec3(-.38,3.26,-8.25),new pc.Vec3(.07,.72,1.18),M.black,root);
  box('pantograph lower B',new pc.Vec3(.38,3.26,-8.25),new pc.Vec3(.07,.72,1.18),M.black,root);
  box('pantograph collector',new pc.Vec3(0,4.02,-8.25),new pc.Vec3(1.52,.055,.12),M.black,root);
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
    }else if(a.type==='umbrella'){
      a.entity.setPosition(a.baseX+Math.sin(state.elapsed*.95+a.phase)*.12,0,-a.baseD);
      a.entity.setLocalEulerAngles(0,Math.sin(state.elapsed*.7+a.phase)*7,0);
    }else if(a.type==='pavement'){
      a.entity.setPosition(a.baseX,0,-a.baseD+((state.elapsed*.45+a.phase)%5)-2.5);
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
  const preview=Math.max(0,Math.min(GAME.streetLength-6,Number(smokeParams.get('distance')||180)||180));
  player.distance=preview;
  player.entity.setPosition(lanes[1],player.y,-preview);
  ui.start.classList.remove('visible');ui.start.hidden=true;
  updateHud();updateCamera(1);animateWorld();
}
app.on('update',dt=>{
  dt=Math.min(dt,.05);if(!state.started||state.paused||state.finished)return;
  state.elapsed+=dt;state.timeLeft-=dt;updatePlayer(dt);updateObstacles();animateWorld();updateTram(dt);updateCamera(dt);updateHud();
  if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)ui.toast.classList.remove('show');}
  const sec=Math.ceil(state.timeLeft);if(sec<=10&&sec>0)audio.beep(sec);
  const gap=tram.distance-player.distance;if(player.distance>=GAME.streetLength-23&&gap<=GAME.catchGap){finish(true);return;}if(state.timeLeft<=0)finish(false);
});
console.info('Last Luas '+BUILD+' · PlayCanvas '+(pc.version||'2.22.2'));
