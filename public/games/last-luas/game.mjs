import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.22.2/build/playcanvas.mjs';

const BUILD='0.4.0';
const GAME={duration:90,streetLength:430,laneX:[-2.45,0,2.45],speed:5.25,hitSpeed:2.8,hitDuration:.66,jumpVelocity:7.1,gravity:18,laneSharpness:13,pullAwayAt:8.5,tramSpeed:3.25,catchGap:6.2,pixelRatio:1.5};
const $=id=>document.getElementById(id);
const canvas=$('application');
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:true,alpha:false,powerPreference:'high-performance'}});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,GAME.pixelRatio);
app.scene.ambientLight=new pc.Color(.48,.52,.60);

const CHARACTER_SOURCES={
  casual:'https://cdn.jsdelivr.net/gh/euuuuuuan/fatal-funnel-public@29a6bdfd01ad175c389cbd0bac80c30f926ff96b/packages/renderer/assets/models/quaternius-men/casual-character.glb',
  worker:'https://cdn.jsdelivr.net/gh/euuuuuuan/fatal-funnel-public@29a6bdfd01ad175c389cbd0bac80c30f926ff96b/packages/renderer/assets/models/quaternius-men/worker.glb'
};
const characterAssets=new Map();
const CHARACTER_CLIP_INDEX={
  Death:0,Gun_Shoot:1,HitRecieve:2,HitRecieve_2:3,Idle:4,Idle_Gun:5,
  Idle_Gun_Pointing:6,Idle_Gun_Shoot:7,Idle_Neutral:8,Idle_Sword:9,
  Interact:10,Kick_Left:11,Kick_Right:12,Punch_Left:13,Punch_Right:14,
  Roll:15,Run:16,Run_Back:17,Run_Left:18,Run_Right:19,Run_Shoot:20,
  Sword_Slash:21,Walk:22,Wave:23
};
function loadCharacterAsset(kind){
  if(characterAssets.has(kind))return Promise.resolve(characterAssets.get(kind));
  return new Promise((resolve,reject)=>{
    app.assets.loadFromUrl(CHARACTER_SOURCES[kind],'container',(err,asset)=>{
      if(err){reject(err);return;}
      characterAssets.set(kind,asset);resolve(asset);
    });
  });
}
async function preloadCharacters(){
  await Promise.all([loadCharacterAsset('casual'),loadCharacterAsset('worker')]);
}
function findCharacterClip(asset,wanted){
  const clips=asset?.resource?.animations||[];
  const index=CHARACTER_CLIP_INDEX[wanted];
  if(Number.isInteger(index)&&clips[index])return clips[index];
  const needle=String(wanted||'').toLowerCase();
  return clips.find(a=>{
    const n=String(a.resource?.name||a.name||'').toLowerCase();
    return n===needle||n.endsWith('|'+needle)||n.endsWith('/'+needle)||n.includes(needle);
  })||null;
}
function playCharacterClip(entity,asset,wanted){
  if(!wanted)return;
  const clip=findCharacterClip(asset,wanted);if(!clip)return;
  entity.addComponent('anim',{activate:true});
  entity.anim.assignAnimation('clip',clip.resource);
  entity.anim.baseLayer.transition('clip');
}
function spawnCharacter(parent,{kind='casual',clip='Idle_Neutral',scale=.92,pitch=0,yaw=180,name='Quaternius character'}={}){
  const asset=characterAssets.get(kind);if(!asset)return null;
  const model=asset.resource.instantiateRenderEntity({castShadows:true});
  model.name=name;model.setLocalScale(scale,scale,scale);model.setLocalEulerAngles(pitch,yaw,0);
  parent.addChild(model);
  for(const render of model.findComponents('render')){render.castShadows=true;render.receiveShadows=true;}
  playCharacterClip(model,asset,clip);
  return model;
}


function bendBone(model,name,x=0,y=0,z=0){
  const bone=model?.findByName?.(name);if(!bone)return false;
  bone.rotateLocal(x,y,z);return true;
}
function poseRiderCharacter(model){
  if(!model)return false;
  // Character assets face +Z before the parent yaw. Bend the unanimated skeleton into a bike pose.
  bendBone(model,'Body',-12,0,0);
  bendBone(model,'Torso',-10,0,0);
  bendBone(model,'UpperLeg.L',-68,0,0);
  bendBone(model,'UpperLeg.R',-68,0,0);
  bendBone(model,'LowerLeg.L',92,0,0);
  bendBone(model,'LowerLeg.R',92,0,0);
  bendBone(model,'UpperArm.L',-54,0,-8);
  bendBone(model,'UpperArm.R',-54,0,8);
  bendBone(model,'LowerArm.L',-34,0,0);
  bendBone(model,'LowerArm.R',-34,0,0);
  return true;
}


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

const P={road:new pc.Color(.105,.115,.13),pave:new pc.Color(.30,.31,.33),rail:new pc.Color(.62,.65,.70),brick:new pc.Color(.49,.20,.13),cream:new pc.Color(.78,.72,.62),navy:new pc.Color(.025,.13,.20),green:new pc.Color(.03,.24,.12),glass:new pc.Color(.055,.145,.19),black:new pc.Color(.018,.022,.035),white:new pc.Color(.93,.96,1),orange:new pc.Color(.95,.28,.04),yellow:new pc.Color(1,.72,.12),purple:new pc.Color(.37,.17,.62),skin:new pc.Color(.72,.47,.33)};
const M={road:mat(P.road,{gloss:.44,metal:.02}),pave:mat(P.pave,{gloss:.55}),rail:mat(P.rail,{gloss:.95,metal:.95}),brick:mat(P.brick,{gloss:.26}),cream:mat(P.cream,{gloss:.3}),navy:mat(P.navy,{gloss:.6}),green:mat(P.green,{gloss:.5}),glass:mat(P.glass,{gloss:.86,metal:.04}),black:mat(P.black,{gloss:.4}),white:mat(P.white,{gloss:.55}),orange:mat(P.orange,{gloss:.4}),yellow:mat(P.yellow,{gloss:.55}),purple:mat(P.purple,{gloss:.65}),skin:mat(P.skin,{gloss:.2}),lamp:mat(P.white,{emissive:new pc.Color(1,.56,.18),gloss:.35}),red:mat(new pc.Color(.64,.025,.03),{gloss:.55}),blue:mat(new pc.Color(.07,.30,.58),{gloss:.35}),gold:mat(new pc.Color(.72,.51,.18),{gloss:.72,metal:.28}),leaf:mat(new pc.Color(.05,.34,.15),{gloss:.22}),stone:mat(new pc.Color(.56,.55,.52),{gloss:.35}),pink:mat(new pc.Color(.66,.23,.38),{gloss:.38}),wetGlass:mat(new pc.Color(.08,.15,.22),{gloss:1,metal:.06,opacity:.42})};

const F={
  limestone:mat(new pc.Color(.82,.80,.74),{gloss:.35}),
  paleStone:mat(new pc.Color(.90,.88,.82),{gloss:.32}),
  redBrick:mat(new pc.Color(.52,.19,.12),{gloss:.24}),
  hodgesGreen:mat(new pc.Color(.025,.16,.10),{gloss:.46}),
  cafeTeal:mat(new pc.Color(.025,.18,.19),{gloss:.48}),
  ivyGreen:mat(new pc.Color(.025,.23,.12),{gloss:.48}),
  ivyCream:mat(new pc.Color(.82,.78,.66),{gloss:.34}),
  brass:mat(new pc.Color(.77,.56,.20),{gloss:.82,metal:.38}),
  warmGlass:mat(new pc.Color(.09,.19,.22),{gloss:.96,metal:.05}),
  shopGlow:mat(new pc.Color(.76,.46,.18),{emissive:new pc.Color(.55,.27,.08),gloss:.28}),
  darkWood:mat(new pc.Color(.17,.075,.045),{gloss:.40})
};

const sun=new pc.Entity('Evening light');sun.addComponent('light',{type:'directional',color:new pc.Color(1,.91,.76),intensity:1.75,castShadows:true,shadowResolution:2048,shadowDistance:55});sun.setEulerAngles(48,32,0);app.root.addChild(sun);
const fill=new pc.Entity('Warm city fill');fill.addComponent('light',{type:'directional',color:new pc.Color(.66,.79,1),intensity:.52,castShadows:false});fill.setEulerAngles(-25,-145,0);app.root.addChild(fill);

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
    cyl('Wire pole R',new pc.Vec3(4.9,3.0,-d),new pc.Vec3(.045,3.0,.045),M.black);
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
function brandMaterial(text,{bg='#ffffff',fg='#111111',font='Arial, sans-serif',weight=700,tracking=0,subline=null,subFg=null}={}){
  const key=['brand',text,bg,fg,font,weight,tracking,subline||'',subFg||''].join('|');if(signCache.has(key))return signCache.get(key);
  const c=document.createElement('canvas');c.width=1400;c.height=320;const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;
  let size=subline?128:154;ctx.font=weight+' '+size+'px '+font;
  const trackedWidth=(value,spacing)=>{
    const chars=[...value],widths=chars.map(ch=>ctx.measureText(ch).width);
    return widths.reduce((a,b)=>a+b,0)+spacing*Math.max(0,chars.length-1);
  };
  while(trackedWidth(text,tracking)>1240&&size>52){size-=4;ctx.font=weight+' '+size+'px '+font;}
  const drawTracked=(value,y,spacing)=>{
    const chars=[...value],widths=chars.map(ch=>ctx.measureText(ch).width);
    const total=widths.reduce((a,b)=>a+b,0)+spacing*Math.max(0,chars.length-1);
    let x=(c.width-total)/2;
    ctx.textAlign='left';
    chars.forEach((ch,i)=>{ctx.fillText(ch,x,y);x+=widths[i]+spacing;});
    ctx.textAlign='center';
  };
  drawTracked(text,subline?124:160,tracking);
  if(subline){
    ctx.fillStyle=subFg||fg;ctx.font='600 48px '+font;drawTracked(subline,244,10);
  }
  const texture=new pc.Texture(app.graphicsDevice,{width:c.width,height:c.height,format:pc.PIXELFORMAT_RGBA8,mipmaps:true});
  texture.minFilter=pc.FILTER_LINEAR_MIPMAP_LINEAR;texture.magFilter=pc.FILTER_LINEAR;texture.addressU=pc.ADDRESS_CLAMP_TO_EDGE;texture.addressV=pc.ADDRESS_CLAMP_TO_EDGE;texture.setSource(c);
  const m=new pc.StandardMaterial();m.diffuseMap=texture;m.emissiveMap=texture;m.emissive=new pc.Color(.28,.28,.28);m.emissiveIntensity=.22;m.gloss=.4;m.update();signCache.set(key,m);return m;
}
function facadeBand(name,z,y,length,side,material,height=.18,depth=.34){
  return box(name,new pc.Vec3(side*6.43,y,z),new pc.Vec3(depth,height,length),material);
}
function facadePier(name,z,y,height,side,material,width=.34,depth=.34){
  return box(name,new pc.Vec3(side*6.43,y,z),new pc.Vec3(depth,height,width),material);
}
function facadePlant(name,z,y,side,scale=.55){
  sphere(name,new pc.Vec3(side*6.25,y,z),new pc.Vec3(scale,scale*.86,scale),M.leaf);
}
function warmShopWindow(name,z,y,height,width,side){
  box(name+' glass',new pc.Vec3(side*6.31,y,z),new pc.Vec3(.12,height,width),F.warmGlass);
  box(name+' interior glow',new pc.Vec3(side*6.36,y,z),new pc.Vec3(.04,height*.78,width*.78),F.shopGlow);
}
function arketCurvePanel(z,xOffset,y,angle,height,width){
  const panel=box('ARKET curved glass panel',new pc.Vec3(6.25+xOffset,y,z),new pc.Vec3(.18,height,width),F.warmGlass);
  panel.setLocalEulerAngles(0,angle,0);
  const mullion=box('ARKET curved stone mullion',new pc.Vec3(6.15+xOffset,y,z-width-.16),new pc.Vec3(.28,height+.18,.16),F.paleStone);
  mullion.setLocalEulerAngles(0,angle,0);
}

function bladeSign(name,z,y,side,material,width=1.25,height=.48){
  const sign=box(name,new pc.Vec3(side*5.88,y,z),new pc.Vec3(width,height,.12),material);
  sign.setLocalEulerAngles(0,90,0);return sign;
}
function streetNumber(name,z,y,side,value){
  return box(name,new pc.Vec3(side*6.23,y,z),new pc.Vec3(.11,.30,.48),brandMaterial(String(value),{bg:'#eee9de',fg:'#222222',font:'Georgia, serif',weight:700}),app.root);
}
function genericFacadeDetail(z,length,height,side,index){
  const frontX=side*6.47;
  const stone=index%3===0?F.limestone:F.paleStone;
  box('Generic Dublin cornice',new pc.Vec3(frontX,height-.42,z),new pc.Vec3(.28,.22,length*.92),stone);
  if(height>10)box('Generic Dublin string course',new pc.Vec3(frontX,5.15,z),new pc.Vec3(.22,.12,length*.90),stone);
  const bays=Math.max(2,Math.min(4,Math.floor(length/3.1)));
  for(let b=0;b<bays;b++){
    const bz=z+(b-(bays-1)/2)*(length*.72/Math.max(1,bays-1));
    box('Generic shop glass',new pc.Vec3(side*6.42,1.45,bz),new pc.Vec3(.16,2.18,Math.min(1.45,length/(bays*2.1))),F.warmGlass);
    if((b+index)%3===0)box('Generic shop door',new pc.Vec3(side*6.30,1.35,bz),new pc.Vec3(.10,2.36,.72),F.darkWood);
  }
  box('Generic shop fascia',new pc.Vec3(side*6.38,3.08,z),new pc.Vec3(.22,.20,length*.82),index%2?M.navy:F.darkWood);
}
function buildGenericBlocks(){
  const fills=[M.brick,M.cream,mat(new pc.Color(.35,.28,.24),{gloss:.25}),mat(new pc.Color(.49,.42,.34),{gloss:.3})];
  let z=-11,i=0;
  while(z>-GAME.streetLength-15){
    const len=10+(i%4)*2.1,height=9.5+(i%5)*1.15;
    for(const side of [-1,1]){building(z,len,height,side,fills[(i+(side>0?1:0))%fills.length]);genericFacadeDetail(z,len,height,side,i+(side>0?1:0));}
    z-=len+1.35;i++;
  }
}
function buildLandmarks(){
  // ARKET, 60 Dawson Street / Grafton Place: pale curved stone frame and broad glass corner.
  const arket=box('ARKET Grafton Place mass',new pc.Vec3(10.0,7.1,-22),new pc.Vec3(6.7,14.2,23.5),F.paleStone);
  for(const [z,x,a] of [[-30.0,.34,-8],[-26.0,.10,-4],[-22,0,0],[-18.0,.10,4],[-14.0,.34,8]]){
    arketCurvePanel(z,x,2.0,a,3.15,1.72);
    arketCurvePanel(z,x,6.25,a,2.55,1.72);
    arketCurvePanel(z,x,10.0,a,2.35,1.72);
  }
  for(const y of [3.78,7.78,11.4])facadeBand('ARKET pale stone floor band',-22,y,21.0,1,F.paleStone,.20,.46);
  nameboard('ARKET real wordmark',-22,3.36,3.85,1,brandMaterial('ARKET',{bg:'#e9e7e1',fg:'#111111',font:'Arial, sans-serif',weight:500,tracking:12}));
  bladeSign('ARKET projecting sign',-17.2,3.40,1,brandMaterial('ARKET',{bg:'#f4f3ef',fg:'#111111',font:'Arial, sans-serif',weight:500,tracking:10}),1.32,.50);
  streetNumber('ARKET number 60',-30.6,3.24,1,'60');

  // Hodges Figgis, 56–58 Dawson Street: Victorian red brick, arched upper windows and curved dark-green shop bays.
  const hf=box('Hodges Figgis red brick facade',new pc.Vec3(-9.82,7.6,-55),new pc.Vec3(6.9,15.2,19.2),F.redBrick);
  for(const z of [-61.3,-57.1,-52.9,-48.7]){
    facadePier('Hodges stone window side',z,8.2,9.3,-1,F.limestone,.40,.46);
    box('Hodges upper sash',new pc.Vec3(-6.34,8.55,z),new pc.Vec3(.14,3.05,1.42),F.warmGlass);
    box('Hodges upper stone head',new pc.Vec3(-6.36,11.72,z),new pc.Vec3(.36,.28,1.75),F.limestone);
  }
  box('Hodges deep green frontage',new pc.Vec3(-6.52,1.55,-55),new pc.Vec3(.34,2.85,17.4),F.hodgesGreen);
  for(const z of [-61.2,-58.1,-51.9,-48.8])warmShopWindow('Hodges curved display',z,1.56,2.12,2.35,-1);
  facadePier('Hodges left shop pillar',-63.0,1.70,3.22,-1,F.hodgesGreen,.52,.46);
  facadePier('Hodges centre-left pillar',-59.6,1.70,3.22,-1,F.hodgesGreen,.34,.42);
  facadePier('Hodges centre-right pillar',-50.4,1.70,3.22,-1,F.hodgesGreen,.34,.42);
  facadePier('Hodges right shop pillar',-47.0,1.70,3.22,-1,F.hodgesGreen,.52,.46);
  box('Hodges central door',new pc.Vec3(-6.28,1.40,-55),new pc.Vec3(.18,2.55,2.10),F.darkWood);
  facadeBand('Hodges fascia moulding',-55,3.05,17.25,-1,F.hodgesGreen,.22,.46);
  nameboard('Hodges Figgis real logo',-55,3.42,7.65,-1,brandMaterial('HODGES FIGGIS',{bg:'#073020',fg:'#d5ae5d',font:'Georgia, serif',weight:500,tracking:17,subline:'THE BOOKSTORE',subFg:'#d8c28c'}));
  bladeSign('Hodges Figgis projecting sign',-48.1,3.55,-1,brandMaterial('HODGES FIGGIS',{bg:'#073020',fg:'#d5ae5d',font:'Georgia, serif',weight:600,tracking:7}),1.46,.52);
  streetNumber('Hodges number 56 58',-62.1,3.28,-1,'56–58');

  // Café en Seine, 39/40 Dawson Street: deep teal, brass detailing, awnings and planting.
  const cafe=box('Cafe en Seine brick upper facade',new pc.Vec3(9.80,6.2,-185),new pc.Vec3(6.85,12.4,18.4),F.redBrick);
  for(const z of [-190.3,-185,-179.7])box('Cafe upper sash',new pc.Vec3(6.35,7.2,z),new pc.Vec3(.14,3.2,2.2),F.warmGlass);
  box('Cafe en Seine teal frontage',new pc.Vec3(6.50,1.60,-185),new pc.Vec3(.35,2.95,16.2),F.cafeTeal);
  for(const z of [-190.0,-186.6,-183.4,-180.0])warmShopWindow('Cafe street window',z,1.55,2.15,2.55,1);
  for(const z of [-191.6,-188.3,-185,-181.7,-178.4])facadePier('Cafe brass upright',z,1.65,3.0,1,F.brass,.17,.40);
  facadeBand('Cafe gold fascia',-185,3.12,16.0,1,F.brass,.12,.42);
  nameboard('Cafe en Seine real logo',-185,3.38,6.55,1,brandMaterial('CAFÉ en SEINE',{bg:'#073234',fg:'#e9d5a0',font:'Georgia, serif',weight:500,tracking:8}));
  bladeSign('Cafe en Seine projecting sign',-178.8,3.62,1,brandMaterial('CAFÉ en SEINE',{bg:'#073234',fg:'#e9d5a0',font:'Georgia, serif',weight:600,tracking:4}),1.42,.52);
  streetNumber('Cafe number 39 40',-191.1,3.25,1,'39/40');
  for(const z of [-189.8,-185,-180.2])awning('Cafe awning',z,3.2,1,F.cafeTeal,3.67);
  for(const z of [-191.5,-188,-184.5,-181,-178.5])facadePlant('Cafe facade plant',z,4.25,1,.50);
  planter(181,1);planter(187,1);planter(193,1);

  // The Dawson Lounge, 25 Dawson Street: tiny basement pub with the unmistakable red door.
  const lounge=box('Dawson Lounge townhouse',new pc.Vec3(-9.78,5.45,-292),new pc.Vec3(6.85,10.9,12.4),F.redBrick);
  for(const z of [-295.1,-288.9])box('Dawson upper sash',new pc.Vec3(-6.34,6.2,z),new pc.Vec3(.14,2.65,1.7),F.warmGlass);
  box('Dawson Lounge dark base',new pc.Vec3(-6.50,1.38,-292),new pc.Vec3(.34,2.45,10.2),F.darkWood);
  box('Dawson Lounge iconic red door',new pc.Vec3(-6.26,1.34,-292),new pc.Vec3(.18,2.48,1.30),M.red);
  for(let i=0;i<4;i++)box('Dawson basement step '+i,new pc.Vec3(-5.92-i*.18,.10+i*.10,-292),new pc.Vec3(.42,.12,1.80),F.limestone);
  nameboard('Dawson Lounge real sign',-292,3.04,4.20,-1,brandMaterial('THE DAWSON LOUNGE',{bg:'#1a1612',fg:'#d0ac67',font:'Georgia, serif',weight:600,tracking:8}));
  bladeSign('Dawson Lounge projecting sign',-288.1,3.30,-1,brandMaterial('DAWSON LOUNGE',{bg:'#1a1612',fg:'#d0ac67',font:'Georgia, serif',weight:600,tracking:4}),1.30,.48);
  streetNumber('Dawson Lounge number 25',-295.2,3.15,-1,'25');

  // Royal Irish Academy, 19 Dawson Street: restrained red brick and pale stone entrance.
  const ria=box('Royal Irish Academy facade',new pc.Vec3(-9.80,6.35,-319),new pc.Vec3(6.85,12.7,13.5),F.redBrick);
  for(const z of [-323,-319,-315])box('RIA sash window',new pc.Vec3(-6.35,7.0,z),new pc.Vec3(.14,2.9,1.55),F.warmGlass);
  box('RIA pale stone entrance',new pc.Vec3(-6.48,1.65,-319),new pc.Vec3(.34,3.05,3.45),F.limestone);
  box('RIA dark door',new pc.Vec3(-6.25,1.42,-319),new pc.Vec3(.16,2.55,1.55),F.darkWood);
  facadeBand('RIA stone cornice',-319,4.05,12.0,-1,F.limestone,.18,.40);
  nameboard('RIA nameboard',-319,3.48,4.35,-1,brandMaterial('ROYAL IRISH ACADEMY',{bg:'#e4dfd3',fg:'#1d1d1b',font:'Georgia, serif',weight:600,tracking:5}));
  streetNumber('RIA number 19',-323.9,3.10,-1,'19');

  // St Ann's Church beside the Academy: tall pale stone vertical frontage.
  const stanns=box("St Ann's Church Dawson Street facade",new pc.Vec3(9.82,7.15,-330),new pc.Vec3(6.85,14.3,15.0),F.limestone);
  for(const z of [-334.4,-330,-325.6])box('St Anns tall window',new pc.Vec3(6.34,6.65,z),new pc.Vec3(.15,5.25,1.52),F.warmGlass);
  facadePier('St Anns left pier',-336.2,6.75,10.8,1,F.paleStone,.48,.48);
  facadePier('St Anns right pier',-323.8,6.75,10.8,1,F.paleStone,.48,.48);
  box('St Anns entrance',new pc.Vec3(6.24,1.70,-330),new pc.Vec3(.18,3.20,2.25),F.darkWood);
  facadeBand('St Anns parapet',-330,11.55,13.5,1,F.paleStone,.30,.48);
  nameboard('St Anns small plaque',-330,3.60,2.6,1,brandMaterial("ST ANN'S",{bg:'#e9e3d7',fg:'#222222',font:'Georgia, serif',weight:600,tracking:7}));
  streetNumber('St Anns number 18',-335.0,3.12,1,'18');

  // The Ivy, 13–17 Dawson Street: pale facade, rich green frontage and abundant planting.
  const ivy=box('The Ivy Dawson Street facade',new pc.Vec3(9.80,6.75,-354),new pc.Vec3(6.85,13.5,23.4),F.ivyCream);
  for(const z of [-362,-357,-352,-347]){
    box('Ivy upper window',new pc.Vec3(6.34,7.25,z),new pc.Vec3(.14,3.25,1.65),F.warmGlass);
    facadePlant('Ivy trailing plant',z,10.15,1,.58);
  }
  box('Ivy deep green frontage',new pc.Vec3(6.50,1.60,-354),new pc.Vec3(.34,2.85,20.0),F.ivyGreen);
  for(const z of [-361,-357,-352,-348])warmShopWindow('Ivy dining window',z,1.62,2.12,2.45,1);
  facadeBand('Ivy gold fascia',-354,3.08,19.8,1,F.brass,.11,.40);
  awning('Ivy green entrance canopy',-350.0,6.0,1,F.ivyGreen,3.45);
  nameboard('Ivy real wordmark',-350.0,3.62,3.0,1,brandMaterial('THE IVY',{bg:'#0b432d',fg:'#d8b76b',font:'Georgia, serif',weight:600,tracking:14}));
  bladeSign('Ivy projecting sign',-345.2,3.70,1,brandMaterial('THE IVY',{bg:'#0b432d',fg:'#d8b76b',font:'Georgia, serif',weight:700,tracking:12}),1.22,.52);
  streetNumber('Ivy number 13 17',-362.0,3.25,1,'13–17');
  for(const z of [-363,-359,-355,-351,-347,-343])facadePlant('Ivy frontage greenery',z,3.65,1,.50);
  planter(347,1);planter(352,1);planter(357,1);
}
function buildWetDetails(){
  // No active rain in v0.4. Keep only subtle street sheen and drains; no puddle carpet.
  for(let d=28,i=0;d<GAME.streetLength-25;d+=34,i++){
    box('Road drain '+i,new pc.Vec3((i%2?1:-1)*3.88,.022,-d),new pc.Vec3(.42,.018,1.08),M.rail);
  }
}
function ambientPerson(z,side,phase){
  const root=new pc.Entity('Pavement pedestrian');
  root.setPosition(side*(4.95+(phase%3)*.35),0,-z);app.root.addChild(root);
  const kind=phase%3===0?'worker':'casual';
  spawnCharacter(root,{kind,clip:'Walk',scale:1.12+(phase%3)*.025,yaw:phase%2?0:180,name:'Pedestrian model'});
  animated.push({type:'pavement',entity:root,baseX:root.getPosition().x,baseD:z,phase:phase*.7});
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
  {d:5,label:'ARKET · 60 DAWSON STREET'},
  {d:38,label:'HODGES FIGGIS · 56–58'},
  {d:166,label:'CAFÉ EN SEINE · 39/40'},
  {d:274,label:'THE DAWSON LOUNGE · 25'},
  {d:303,label:'ROYAL IRISH ACADEMY · 19'},
  {d:317,label:"ST ANN'S CHURCH · 18"},
  {d:336,label:'THE IVY · 13–17'},
  {d:391,label:'DAWSON LUAS STOP'}
];

function buildPlayer(){
  const root=new pc.Entity('Runner');app.root.addChild(root);
  const model=spawnCharacter(root,{kind:'casual',clip:'Run',scale:1.26,yaw:180,name:'Runner character model'});
  const groundY=.04;root.setPosition(lanes[1],groundY,0);
  return {entity:root,model,lane:1,distance:0,y:groundY,groundY,vy:0,grounded:true,hit:0};
}
let player=null;


function obstacle(kind,d,lane,{jumpable=false}={}){
  const root=new pc.Entity(kind+' '+d);root.setPosition(lanes[lane],0,-d);app.root.addChild(root);
  if(kind==='bollard'){cyl('bollard',new pc.Vec3(0,.55,0),new pc.Vec3(.38,.55,.38),M.black,root);}
  if(kind==='bin'){box('bin',new pc.Vec3(0,.72,0),new pc.Vec3(.92,1.42,.78),M.green,root);box('lid',new pc.Vec3(0,1.48,-.05),new pc.Vec3(1.0,.15,.86),M.black,root);}
  if(kind==='roadworks'){box('barrier',new pc.Vec3(0,.78,0),new pc.Vec3(1.95,1.12,.24),M.orange,root);box('barrier stripe',new pc.Vec3(0,.80,.14),new pc.Vec3(1.35,.18,.04),M.white,root);}
  if(kind==='tourist'){
    spawnCharacter(root,{kind:'casual',clip:'Idle_Neutral',scale:1.18,yaw:180,name:'Tourist character model'});
    box('phone',new pc.Vec3(.33,1.36,-.18),new pc.Vec3(.07,.24,.14),M.black,root);
    animated.push({type:'tourist',entity:root,baseX:lanes[lane],baseD:d,phase:d*.11});
  }
  if(kind==='umbrella'){
    spawnCharacter(root,{kind:'worker',clip:'Idle_Neutral',scale:1.15,yaw:180,name:'Umbrella pedestrian model'});
    box('umbrella handle',new pc.Vec3(.38,1.55,0),new pc.Vec3(.045,1.55,.045),M.black,root);
    sphere('umbrella canopy',new pc.Vec3(.38,2.43,0),new pc.Vec3(1.18,.24,1.18),M.purple,root);
    animated.push({type:'umbrella',entity:root,baseX:lanes[lane],baseD:d,phase:d*.05});
  }
  if(kind==='cyclist'||kind==='delivery'){
    cyl('Front bicycle wheel',new pc.Vec3(0,.46,-.76),new pc.Vec3(.50,.06,.50),M.black,root,new pc.Vec3(90,0,0));
    cyl('Rear bicycle wheel',new pc.Vec3(0,.46,.76),new pc.Vec3(.50,.06,.50),M.black,root,new pc.Vec3(90,0,0));
    const top=box('Bike top tube',new pc.Vec3(0,.75,-.02),new pc.Vec3(.09,.09,1.15),M.rail,root);
    const down=box('Bike down tube',new pc.Vec3(0,.62,-.08),new pc.Vec3(.09,.66,.09),M.rail,root);down.setLocalEulerAngles(38,0,0);
    const seatTube=box('Bike seat tube',new pc.Vec3(0,.67,.28),new pc.Vec3(.09,.58,.09),M.rail,root);seatTube.setLocalEulerAngles(-22,0,0);
    box('Bike seat',new pc.Vec3(0,.99,.30),new pc.Vec3(.38,.09,.28),M.black,root);
    box('Bike handlebars',new pc.Vec3(0,1.13,-.65),new pc.Vec3(.86,.07,.09),M.rail,root);
    box('Bike stem',new pc.Vec3(0,.92,-.59),new pc.Vec3(.08,.48,.08),M.rail,root).setLocalEulerAngles(-17,0,0);
    const riderPivot=new pc.Entity(kind==='delivery'?'Delivery rider hip pivot':'Cyclist rider hip pivot');
    riderPivot.setLocalPosition(0,1.03,.24);riderPivot.setLocalEulerAngles(8,0,0);root.addChild(riderPivot);
    const rider=spawnCharacter(riderPivot,{kind:kind==='delivery'?'worker':'casual',clip:null,scale:.96,yaw:180,name:kind==='delivery'?'Delivery rider model':'Cyclist rider model'});
    if(rider){rider.setLocalPosition(0,-.96,-.10);poseRiderCharacter(rider);}
    if(kind==='delivery')box('delivery box',new pc.Vec3(0,.93,.92),new pc.Vec3(.72,.58,.58),M.green,root);
    const baseYaw=kind==='delivery'?-12:12;root.setLocalEulerAngles(0,baseYaw,0);
    animated.push({type:kind,entity:root,baseX:lanes[lane],baseD:d,phase:d*.07,baseYaw});
  }
  obstacleRecords.push({kind,entity:root,d,lane,jumpable,hit:false,cleared:false});
}
function buildObstacles(){
  [[35,0,'bollard',1],[50,2,'bin'],[64,1,'tourist'],[78,0,'cyclist'],[92,2,'roadworks'],[108,1,'umbrella'],[124,0,'bin'],[139,2,'tourist'],[154,1,'delivery'],[170,0,'roadworks'],[186,2,'bollard',1],[202,1,'tourist'],[218,0,'cyclist'],[235,2,'bin'],[251,1,'roadworks'],[267,0,'umbrella'],[283,2,'delivery'],[299,1,'bollard',1],[315,0,'tourist'],[331,2,'bin'],[347,1,'roadworks'],[363,0,'cyclist'],[379,2,'umbrella'],[394,1,'tourist'],[407,0,'bollard',1]].forEach(([d,l,k,j])=>obstacle(k,d,l,{jumpable:Boolean(j)}));
  obstacle('roadworks',146,0);obstacle('roadworks',146,1);obstacle('roadworks',322,1);obstacle('roadworks',322,2);
}

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
let tram=null;
function syncTram(){if(tram)tram.entity.setPosition(0,.02,-tram.distance);}

const camera=new pc.Entity('Camera');camera.addComponent('camera',{clearColor:new pc.Color(.31,.51,.70),fov:63,nearClip:.1,farClip:720});app.root.addChild(camera);camera.setPosition(0,3.72,5.65);

function updateCamera(dt){
  const p=player.entity.getPosition(),rush=state.started&&!state.finished?Math.max(0,(10-state.timeLeft)/10):0,shake=player.hit>0?Math.sin(state.elapsed*48)*.065:0;
  const target=new pc.Vec3(p.x*.18+shake,3.72-rush*.22,p.z+6.05-rush*.48),cur=camera.getPosition(),t=1-Math.exp(-8*dt);
  camera.setPosition(pc.math.lerp(cur.x,target.x,t),pc.math.lerp(cur.y,target.y,t),pc.math.lerp(cur.z,target.z,t));
  camera.lookAt(p.x*.20,1.38,p.z-7.7-rush*1.55);camera.camera.fov=pc.math.lerp(camera.camera.fov,63+rush*6,1-Math.exp(-4*dt));
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
  if(!player.grounded){player.vy-=GAME.gravity*dt;player.y+=player.vy*dt;if(player.y<=player.groundY){player.y=player.groundY;player.vy=0;player.grounded=true;}}
  player.hit=Math.max(0,player.hit-dt);
  const urgency=1+Math.max(0,(20-state.timeLeft)/20)*.055;
  const speed=(player.hit>0?GAME.hitSpeed:GAME.speed)*urgency;
  player.distance+=speed*dt;player.entity.setPosition(x,player.y,-player.distance);
}
function prepareFacadeReview(name){
  const map={arket:12,hodges:45,cafe:173,'dawson-lounge':280,ria:308,stanns:319,ivy:341};
  const preview=map[name];if(preview===undefined)return null;
  for(const o of obstacleRecords)o.entity.enabled=false;
  for(const a of animated)a.entity.enabled=false;
  player.distance=preview;player.entity.setPosition(lanes[1],player.y,-preview);
  document.documentElement.dataset.lastLuasReviewLandmark=name;
  return preview;
}
function prepareVisualReview(focus){
  const targetMap={tourist:64,cyclist:78,umbrella:108,delivery:154};
  const targetD=targetMap[focus];
  if(!targetD)return null;
  let target=null;
  for(const o of obstacleRecords){
    const isTarget=o.kind===focus&&o.d===targetD;
    o.entity.enabled=isTarget;
    if(isTarget)target=o;
  }
  for(const a of animated){
    if(a.type==='pavement')a.entity.enabled=false;
  }
  const preview=Math.max(0,targetD-5.2);
  player.distance=preview;
  player.entity.setPosition(lanes[target?.lane??1],player.y,-preview);
  if(target){
    target.entity.setPosition(lanes[target.lane],0,-targetD);
    const baseYaw=target.kind==='delivery'?-12:target.kind==='cyclist'?12:0;target.entity.setLocalEulerAngles(0,baseYaw,0);
  }
  document.documentElement.dataset.lastLuasReviewFocus=focus;
  return preview;
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
      a.entity.setLocalEulerAngles(0,(a.baseYaw||0)+Math.sin(state.elapsed*1.1+a.phase)*7,0);
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

const playButton=$('playBtn');playButton.disabled=true;playButton.textContent='LOADING CHARACTERS…';
playButton.addEventListener('click',()=>{audio.unlock();state.started=true;ui.start.classList.remove('visible');ui.start.hidden=true;showToast('90 SECONDS. GO!');});$('pauseBtn').addEventListener('click',()=>togglePause());$('resumeBtn').addEventListener('click',()=>togglePause(false));$('restartBtn').addEventListener('click',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.started&&!state.finished)togglePause(true);});window.addEventListener('resize',()=>app.resizeCanvas());

async function boot(){
  try{
    await preloadCharacters();
    player=buildPlayer();tram=buildTram();syncTram();buildStreet();buildObstacles();updateHud();updateCamera(0);app.start();
    document.documentElement.dataset.lastLuasReady='1';
    document.documentElement.dataset.lastLuasBuild=BUILD;
    document.documentElement.dataset.lastLuasCharacterAssets=String(characterAssets.size);document.documentElement.dataset.lastLuasObstacleCount=String(obstacleRecords.length);
    document.documentElement.dataset.lastLuasCasualClips=(characterAssets.get('casual')?.resource?.animations||[]).map(a=>a.name||a.resource?.name||'').join(',');
    document.documentElement.dataset.lastLuasWorkerClips=(characterAssets.get('worker')?.resource?.animations||[]).map(a=>a.name||a.resource?.name||'').join(',');
    const smokeParams=new URLSearchParams(location.search);
    if(smokeParams.get('smoke')==='1'){
      const focus=smokeParams.get('focus'),landmark=smokeParams.get('landmark');
      let preview=landmark?prepareFacadeReview(landmark):(focus?prepareVisualReview(focus):null);
      if(preview===null){
        preview=Math.max(0,Math.min(GAME.streetLength-8,Number(smokeParams.get('distance')||18)||18));
        player.distance=preview;player.entity.setPosition(lanes[1],player.y,-preview);
      }
      ui.start.classList.remove('visible');ui.start.hidden=true;updateHud();updateCamera(1);animateWorld();
      setTimeout(()=>{state.paused=true;document.documentElement.dataset.lastLuasSmokeStopped='1';},1200);
    }else{
      playButton.disabled=false;playButton.textContent='RUN FOR IT →';
    }
  }catch(err){
    console.error('Last Luas character load failed',err);
    playButton.textContent='CHARACTERS FAILED TO LOAD';showToast('CHARACTER ASSETS FAILED TO LOAD');
    document.documentElement.dataset.lastLuasAssetError='1';
  }
}
boot();
app.on('update',dt=>{
  dt=Math.min(dt,.05);if(!state.started||state.paused||state.finished)return;
  state.elapsed+=dt;state.timeLeft-=dt;updatePlayer(dt);updateObstacles();animateWorld();updateTram(dt);updateCamera(dt);updateHud();
  if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)ui.toast.classList.remove('show');}
  const sec=Math.ceil(state.timeLeft);if(sec<=10&&sec>0)audio.beep(sec);
  const gap=tram.distance-player.distance;if(player.distance>=GAME.streetLength-23&&gap<=GAME.catchGap){finish(true);return;}if(state.timeLeft<=0)finish(false);
});
console.info('Last Luas '+BUILD+' · PlayCanvas '+(pc.version||'2.22.2'));
