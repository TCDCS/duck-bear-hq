import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.22.2/build/playcanvas.mjs';

const BUILD='0.1.0';
const GAME={duration:90,streetLength:430,laneX:[-2.45,0,2.45],speed:5.25,hitSpeed:2.8,hitDuration:.66,jumpVelocity:7.1,gravity:18,laneSharpness:13,pullAwayAt:8.5,tramSpeed:3.25,catchGap:6.2,pixelRatio:1.5};
const $=id=>document.getElementById(id);
const canvas=$('application');
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:true,alpha:false,powerPreference:'high-performance'}});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,GAME.pixelRatio);
app.scene.ambientLight=new pc.Color(.30,.34,.46);

const ui={time:$('timeValue'),distance:$('distanceValue'),callout:$('streetCallout'),toast:$('toast'),timerCard:document.querySelector('.timer-card'),start:$('startPanel'),pause:$('pausePanel'),result:$('resultPanel'),resultTitle:$('resultTitle'),resultText:$('resultText'),resultDistance:$('resultDistance'),resultTime:$('resultTime')};

const state={started:false,paused:false,finished:false,timeLeft:GAME.duration,elapsed:0,lastSecond:91,toastTimer:0};
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
const M={road:mat(P.road,{gloss:.88,metal:.08}),pave:mat(P.pave,{gloss:.55}),rail:mat(P.rail,{gloss:.95,metal:.95}),brick:mat(P.brick,{gloss:.26}),cream:mat(P.cream,{gloss:.3}),navy:mat(P.navy,{gloss:.6}),green:mat(P.green,{gloss:.5}),glass:mat(P.glass,{gloss:.98,metal:.08}),black:mat(P.black,{gloss:.4}),white:mat(P.white,{gloss:.55}),orange:mat(P.orange,{gloss:.4}),yellow:mat(P.yellow,{gloss:.55}),purple:mat(P.purple,{gloss:.65}),skin:mat(P.skin,{gloss:.2}),lamp:mat(P.white,{emissive:new pc.Color(1,.56,.18),gloss:.35}),red:mat(new pc.Color(.64,.025,.03),{gloss:.55}),blue:mat(new pc.Color(.07,.30,.58),{gloss:.35})};

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
      cyl('Lamp post',new pc.Vec3(side*4.72,2.35,-d),new pc.Vec3(.10,2.35,.10),M.black);
      box('Lamp',new pc.Vec3(side*4.72,4.82,-d),new pc.Vec3(.34,.44,.34),M.lamp);
      if(i%2===0)cyl('Bollard',new pc.Vec3(side*4.15,.52,-d-4.2),new pc.Vec3(.22,.52,.22),M.black);
    }
  }
  for(let d=28;d<GAME.streetLength;d+=34){
    box('Cross wire',new pc.Vec3(0,5.85,-d),new pc.Vec3(10.0,.025,.025),M.black);
    cyl('Wire pole L',new pc.Vec3(-4.9,3.0,-d),new pc.Vec3(.07,3.0,.07),M.black);
    cyl('Wire pole R',new pc.Vec3(4.9,3.0,-d),new pc.Vec3(.07,3.0,.07),M.black);
  }
  buildGenericBlocks();
  buildLandmarks();
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
  const arket=box('ARKET Grafton Place',new pc.Vec3(9.78,7.0,-22),new pc.Vec3(6.9,14,24),M.cream);windows(arket,1,14,24,true);shopfront(-22,18,1,M.glass);
  const hf=box('Hodges Figgis',new pc.Vec3(-9.82,7.3,-55),new pc.Vec3(6.8,14.6,19),M.brick);windows(hf,-1,14.6,19,false);box('Hodges frontage',new pc.Vec3(-6.72,1.55,-55),new pc.Vec3(.13,2.55,16),M.green);
  const cafe=box('Cafe en Seine',new pc.Vec3(9.82,6.0,-185),new pc.Vec3(6.8,12,17),M.brick);windows(cafe,1,12,17,false);box('Cafe blue front',new pc.Vec3(6.70,1.75,-185),new pc.Vec3(.14,3.0,14),M.navy);for(let k=-5;k<=5;k+=2)box('Cafe awning stripe',new pc.Vec3(6.55,3.35,-185+k),new pc.Vec3(.28,.12,.75),k%4===0?M.white:M.black);
  const lounge=box('Dawson Lounge',new pc.Vec3(-9.82,5.4,-292),new pc.Vec3(6.8,10.8,11),mat(new pc.Color(.20,.18,.17),{gloss:.25}));windows(lounge,-1,10.8,11,false);box('Dawson red door',new pc.Vec3(-6.66,1.25,-292),new pc.Vec3(.15,2.35,1.25),M.red);
  const ivy=box('The Ivy Dawson Street',new pc.Vec3(9.82,6.6,-354),new pc.Vec3(6.8,13.2,22),M.cream);windows(ivy,1,13.2,22,true);box('Ivy green front',new pc.Vec3(6.66,1.55,-354),new pc.Vec3(.14,2.6,18),M.green);
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
  const hoodie=mat(new pc.Color(.035,.55,.24),{gloss:.28}),pants=mat(new pc.Color(.025,.035,.055),{gloss:.18}),bag=mat(new pc.Color(.45,.25,.10),{gloss:.25});
  box('Body',new pc.Vec3(0,.05,0),new pc.Vec3(.92,1.2,.56),hoodie,root);sphere('Head',new pc.Vec3(0,.93,-.01),new pc.Vec3(.58,.58,.58),M.skin,root);box('Leg L',new pc.Vec3(-.21,-.87,0),new pc.Vec3(.26,.72,.30),pants,root);box('Leg R',new pc.Vec3(.21,-.87,0),new pc.Vec3(.26,.72,.30),pants,root);box('Bag',new pc.Vec3(0,.10,.38),new pc.Vec3(.69,.82,.27),bag,root);
  root.setPosition(lanes[1],1.02,0);return {entity:root,lane:1,distance:0,y:1.02,vy:0,grounded:true,hit:0};
}
const player=buildPlayer();

function obstacle(kind,d,lane,{jumpable=false}={}){
  const root=new pc.Entity(kind+' '+d);root.setPosition(lanes[lane],0,-d);app.root.addChild(root);
  if(kind==='bollard'){cyl('bollard',new pc.Vec3(0,.55,0),new pc.Vec3(.38,.55,.38),M.black,root);}
  if(kind==='bin'){box('bin',new pc.Vec3(0,.72,0),new pc.Vec3(.92,1.42,.78),M.green,root);box('lid',new pc.Vec3(0,1.48,-.05),new pc.Vec3(1.0,.15,.86),M.black,root);}
  if(kind==='roadworks'){box('barrier',new pc.Vec3(0,.78,0),new pc.Vec3(1.95,1.12,.24),M.orange,root);box('barrier stripe',new pc.Vec3(0,.80,.14),new pc.Vec3(1.35,.18,.04),M.white,root);}
  if(kind==='tourist'){box('coat',new pc.Vec3(0,1.02,0),new pc.Vec3(.72,1.30,.48),M.blue,root);sphere('head',new pc.Vec3(0,1.90,0),new pc.Vec3(.48,.48,.48),M.skin,root);box('phone',new pc.Vec3(.34,1.45,-.18),new pc.Vec3(.08,.28,.16),M.black,root);animated.push({type:'tourist',entity:root,baseX:lanes[lane],baseD:d,phase:d*.11});}
  if(kind==='umbrella'){box('person',new pc.Vec3(0,.95,0),new pc.Vec3(.60,1.2,.45),M.cream,root);sphere('umbrella',new pc.Vec3(0,2.05,0),new pc.Vec3(1.25,.28,1.25),M.purple,root);}
  if(kind==='cyclist'||kind==='delivery'){const body=kind==='delivery'?M.green:M.blue;cyl('wheel1',new pc.Vec3(0,.48,-.55),new pc.Vec3(.48,.10,.48),M.black,root,new pc.Vec3(90,0,0));cyl('wheel2',new pc.Vec3(0,.48,.55),new pc.Vec3(.48,.10,.48),M.black,root,new pc.Vec3(90,0,0));box('rider',new pc.Vec3(0,1.30,0),new pc.Vec3(.60,1.05,.55),body,root);if(kind==='delivery')box('delivery box',new pc.Vec3(0,1.42,.48),new pc.Vec3(.75,.62,.58),M.green,root);animated.push({type:kind,entity:root,baseX:lanes[lane],baseD:d,phase:d*.07});}
  obstacleRecords.push({kind,entity:root,d,lane,jumpable,hit:false,cleared:false});
}
[[35,0,'bollard',1],[50,2,'bin'],[64,1,'tourist'],[78,0,'cyclist'],[92,2,'roadworks'],[108,1,'umbrella'],[124,0,'bin'],[139,2,'tourist'],[154,1,'delivery'],[170,0,'roadworks'],[186,2,'bollard',1],[202,1,'tourist'],[218,0,'cyclist'],[235,2,'bin'],[251,1,'roadworks'],[267,0,'umbrella'],[283,2,'delivery'],[299,1,'bollard',1],[315,0,'tourist'],[331,2,'bin'],[347,1,'roadworks'],[363,0,'cyclist'],[379,2,'umbrella'],[394,1,'tourist'],[407,0,'bollard',1]].forEach(([d,l,k,j])=>obstacle(k,d,l,{jumpable:Boolean(j)}));
obstacle('roadworks',146,0);obstacle('roadworks',146,1);obstacle('roadworks',322,1);obstacle('roadworks',322,2);

function buildTram(){
  const root=new pc.Entity('Last Luas');app.root.addChild(root);const silver=mat(new pc.Color(.72,.75,.80),{gloss:.78,metal:.16});
  box('tram body',new pc.Vec3(0,1.35,0),new pc.Vec3(3.15,2.68,10),silver,root);box('purple lower',new pc.Vec3(0,.54,0),new pc.Vec3(3.18,.48,10.05),M.purple,root);box('front glass',new pc.Vec3(0,1.72,5.04),new pc.Vec3(2.35,1.34,.08),M.glass,root);box('destination',new pc.Vec3(0,2.38,5.09),new pc.Vec3(1.25,.28,.06),M.yellow,root);box('light l',new pc.Vec3(-.92,.62,5.10),new pc.Vec3(.28,.18,.10),M.lamp,root);box('light r',new pc.Vec3(.92,.62,5.10),new pc.Vec3(.28,.18,.10),M.lamp,root);return {entity:root,distance:GAME.streetLength,pulling:false};
}
const tram=buildTram();
function syncTram(){tram.entity.setPosition(0,.02,-tram.distance);}syncTram();

const camera=new pc.Entity('Camera');camera.addComponent('camera',{clearColor:new pc.Color(.028,.045,.09),fov:67,nearClip:.1,farClip:720});app.root.addChild(camera);camera.setPosition(0,4.2,7.2);

function updateCamera(dt){const p=player.entity.getPosition(),target=new pc.Vec3(p.x*.16,4.25,p.z+7.15),cur=camera.getPosition(),t=1-Math.exp(-8*dt);camera.setPosition(pc.math.lerp(cur.x,target.x,t),pc.math.lerp(cur.y,target.y,t),pc.math.lerp(cur.z,target.z,t));camera.lookAt(p.x*.18,1.22,p.z-9.2);}

const input={queue:new Set(),downX:0,downY:0,tracking:false};
function enqueue(action){if(state.finished||!state.started)return;input.queue.add(action);}
window.addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP'){togglePause();return;}if(['ArrowLeft','KeyA'].includes(e.code))enqueue('left');if(['ArrowRight','KeyD'].includes(e.code))enqueue('right');if(['ArrowUp','KeyW','Space'].includes(e.code))enqueue('jump');});
canvas.addEventListener('pointerdown',e=>{input.downX=e.clientX;input.downY=e.clientY;input.tracking=true;},{passive:true});
canvas.addEventListener('pointerup',e=>{if(!input.tracking)return;input.tracking=false;const dx=e.clientX-input.downX,dy=e.clientY-input.downY,dist=Math.hypot(dx,dy);if(dist<22)enqueue('jump');else if(Math.abs(dx)>Math.abs(dy))enqueue(dx<0?'left':'right');else if(dy<-20)enqueue('jump');},{passive:true});
canvas.addEventListener('pointercancel',()=>input.tracking=false,{passive:true});
$('leftBtn').addEventListener('click',()=>enqueue('left'));$('rightBtn').addEventListener('click',()=>enqueue('right'));$('jumpBtn').addEventListener('click',()=>enqueue('jump'));

const audio={ctx:null,lastBeep:-1,unlock(){if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();},tone(freq=.1,dur=.08,type='sine',vol=.045){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+dur);o.connect(g).connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+dur);},hit(){this.tone(105,.12,'square',.04);},jump(){this.tone(390,.06,'triangle',.026);},beep(sec){if(sec===this.lastBeep)return;this.lastBeep=sec;this.tone(sec<=3?820:610,.055,'square',.025);},win(){this.tone(523,.12,'triangle',.035);setTimeout(()=>this.tone(659,.15,'triangle',.035),120);setTimeout(()=>this.tone(784,.22,'triangle',.035),250);}};

function updatePlayer(dt){
  if(input.queue.has('left'))player.lane=Math.max(0,player.lane-1);if(input.queue.has('right'))player.lane=Math.min(2,player.lane+1);if(input.queue.has('jump')&&player.grounded){player.grounded=false;player.vy=GAME.jumpVelocity;audio.jump();}input.queue.clear();
  const pos=player.entity.getPosition(),tx=lanes[player.lane],x=pc.math.lerp(pos.x,tx,1-Math.exp(-GAME.laneSharpness*dt));
  if(!player.grounded){player.vy-=GAME.gravity*dt;player.y+=player.vy*dt;if(player.y<=1.02){player.y=1.02;player.vy=0;player.grounded=true;}}
  player.hit=Math.max(0,player.hit-dt);const speed=player.hit>0?GAME.hitSpeed:GAME.speed;player.distance+=speed*dt;player.entity.setPosition(x,player.y,-player.distance);const bob=player.grounded?Math.sin(player.distance*7.8)*1.4:0;player.entity.setLocalEulerAngles(bob,0,0);
}
function updateObstacles(){
  for(const o of obstacleRecords){if(o.cleared)continue;const dz=o.d-player.distance;if(dz<-3){o.cleared=true;continue;}if(Math.abs(dz)>.92||o.lane!==player.lane)continue;if(o.jumpable&&!player.grounded){o.cleared=true;continue;}if(!o.hit){o.hit=true;player.hit=GAME.hitDuration;audio.hit();showToast(o.kind==='tourist'?'SORRY!':o.kind==='cyclist'||o.kind==='delivery'?'WATCH THE BIKE!':'OUCH!');}}
}
function animateWorld(){for(const a of animated){if(a.type==='tourist')a.entity.setPosition(a.baseX+Math.sin(state.elapsed*1.7+a.phase)*.13,0,-a.baseD);else a.entity.setPosition(a.baseX+Math.sin(state.elapsed*1.2+a.phase)*.18,0,-a.baseD+Math.sin(state.elapsed*1.9+a.phase)*.8);}}
function updateTram(dt){if(state.timeLeft<=GAME.pullAwayAt)tram.pulling=true;if(tram.pulling){tram.distance+=GAME.tramSpeed*dt;syncTram();}}
function formatTime(seconds){const v=Math.max(0,Math.ceil(seconds)),m=String(Math.floor(v/60)).padStart(2,'0'),s=String(v%60).padStart(2,'0');return m+':'+s;}
function currentCallout(){let label='DAWSON STREET';for(const item of landmarkCallouts)if(player.distance>=item.d)label=item.label;return label;}
function updateHud(){ui.time.textContent=formatTime(state.timeLeft);ui.distance.textContent=String(Math.floor(player.distance));const gap=Math.max(0,tram.distance-player.distance);if(state.timeLeft<=GAME.pullAwayAt&&state.timeLeft>0){ui.callout.textContent="IT'S PULLING AWAY · "+Math.ceil(gap)+' m';ui.timerCard.classList.add('danger');}else if(player.distance>390){ui.callout.textContent='LUAS AHEAD · '+Math.ceil(gap)+' m';ui.timerCard.classList.remove('danger');}else{ui.callout.textContent=currentCallout();ui.timerCard.classList.remove('danger');}}
function showToast(value){ui.toast.textContent=value;ui.toast.classList.add('show');state.toastTimer=.7;}
function finish(won){if(state.finished)return;state.finished=true;state.paused=false;ui.result.hidden=false;ui.result.classList.add('visible');ui.resultTitle.textContent=won?'YOU MADE IT!':'MISSED IT!';ui.resultText.textContent=won?'Last Luas secured. Same panic tomorrow?':'The doors won this round.';ui.resultDistance.textContent=Math.floor(player.distance)+' m';ui.resultTime.textContent=formatTime(state.timeLeft);if(won)audio.win();}
function reset(){location.reload();}
function togglePause(force){if(!state.started||state.finished)return;state.paused=typeof force==='boolean'?force:!state.paused;ui.pause.hidden=!state.paused;ui.pause.classList.toggle('visible',state.paused);$('pauseBtn').textContent=state.paused?'▶':'Ⅱ';}

$('playBtn').addEventListener('click',()=>{audio.unlock();state.started=true;ui.start.classList.remove('visible');ui.start.hidden=true;showToast('90 SECONDS. GO!');});$('pauseBtn').addEventListener('click',()=>togglePause());$('resumeBtn').addEventListener('click',()=>togglePause(false));$('restartBtn').addEventListener('click',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.started&&!state.finished)togglePause(true);});window.addEventListener('resize',()=>app.resizeCanvas());

buildStreet();updateHud();updateCamera(0);app.start();
app.on('update',dt=>{
  dt=Math.min(dt,.05);if(!state.started||state.paused||state.finished)return;
  state.elapsed+=dt;state.timeLeft-=dt;updatePlayer(dt);updateObstacles();animateWorld();updateTram(dt);updateCamera(dt);updateHud();
  if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)ui.toast.classList.remove('show');}
  const sec=Math.ceil(state.timeLeft);if(sec<=10&&sec>0)audio.beep(sec);
  const gap=tram.distance-player.distance;if(player.distance>=GAME.streetLength-23&&gap<=GAME.catchGap){finish(true);return;}if(state.timeLeft<=0)finish(false);
});
console.info('Last Luas '+BUILD+' · PlayCanvas '+(pc.version||'2.22.2'));
