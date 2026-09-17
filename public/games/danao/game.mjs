import {ARENAS,CHARACTERS,MODES,byId} from './catalog.mjs';
import {createFighter} from './fighter.mjs';
import {createBotInput} from './bot.mjs';

export const FIXED_STEP=1/60;

const $=id=>document.getElementById(id);
const ui={
 main:$('main-menu'),setup:$('local-setup'),game:$('game-screen'),hud:$('game-hud'),canvas:$('game-canvas'),loading:$('loading'),loadingText:$('loading-text'),error:$('fatal'),errorText:$('fatal-text'),
 arena:$('arena-select'),character:$('character-select'),mode:$('mode-select'),round:$('round-over'),p1Name:$('p1-name'),p2Name:$('p2-name'),p1Hp:$('p1-hp'),p2Hp:$('p2-hp'),p1Fill:$('p1-fill'),p2Fill:$('p2-fill'),pad:$('padState'),status:$('compatibility')
};

let BABYLON=null,RAPIER=null,active=null,lastConfig=null;
const keys=new Set();

function showOnly(section){for(const node of [ui.main,ui.setup,ui.game])if(node)node.hidden=node!==section;}
function setLoading(on,text='Loading Babylon + Rapier…'){if(ui.loading){ui.loading.hidden=!on;if(ui.loadingText)ui.loadingText.textContent=text;}}
function setFatal(message){if(ui.error){ui.error.hidden=false;if(ui.errorText)ui.errorText.textContent=message||'The game could not start.';}}
function clearFatal(){if(ui.error)ui.error.hidden=true;}
function fillSelect(select,items){if(!select)return;select.replaceChildren(...items.map(item=>{const o=document.createElement('option');o.value=item.id;o.textContent=item.name;return o;}));}

fillSelect(ui.arena,ARENAS);fillSelect(ui.character,CHARACTERS);fillSelect(ui.mode,MODES);

function updatePadState(){
 const pads=typeof navigator.getGamepads==='function'?[...navigator.getGamepads()].filter(Boolean):[];
 if(ui.pad){ui.pad.textContent=pads.length?`CONTROLLER: ${pads.length} READY`:'CONTROLLER: KEYBOARD';ui.pad.classList.toggle('ready',pads.length>0);}
}
addEventListener('gamepadconnected',updatePadState);addEventListener('gamepaddisconnected',updatePadState);updatePadState();

const gameKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','Escape']);
addEventListener('keydown',event=>{keys.add(event.code);if(active&&gameKeys.has(event.code))event.preventDefault();if(event.code==='Escape'&&active)stopMatch();},{passive:false});
addEventListener('keyup',event=>{keys.delete(event.code);if(active&&gameKeys.has(event.code))event.preventDefault();},{passive:false});

function padInput(index){
 const pads=typeof navigator.getGamepads==='function'?navigator.getGamepads():[];const pad=pads?.[index];
 if(!pad?.connected)return null;
 const dead=v=>Math.abs(v)<.16?0:v;
 let x=dead(pad.axes?.[0]||0),z=dead(pad.axes?.[1]||0);
 if(pad.buttons?.[14]?.pressed)x=-1;if(pad.buttons?.[15]?.pressed)x=1;if(pad.buttons?.[12]?.pressed)z=-1;if(pad.buttons?.[13]?.pressed)z=1;
 return{x,z,attack:Boolean(pad.buttons?.[0]?.pressed),dash:Boolean(pad.buttons?.[4]?.pressed||pad.buttons?.[5]?.pressed)};
}

export function readPlayerInput(slot){
 const pad=padInput(slot);
 if(slot>0)return pad||{x:0,z:0,attack:false,dash:false};
 const keyboard={
  x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),
  z:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),
  attack:keys.has('Space'),dash:keys.has('ShiftLeft')||keys.has('ShiftRight')
 };
 if(!pad)return keyboard;
 return{x:Math.abs(pad.x)>Math.abs(keyboard.x)?pad.x:keyboard.x,z:Math.abs(pad.z)>Math.abs(keyboard.z)?pad.z:keyboard.z,attack:pad.attack||keyboard.attack,dash:pad.dash||keyboard.dash};
}

export async function initRuntime(){
 if(!BABYLON)BABYLON=await import('@babylonjs/core');
 if(!RAPIER){const mod=await import('@dimforge/rapier3d-compat');RAPIER=mod.default||mod;await RAPIER.init();}
 return{BABYLON,RAPIER};
}

function makeMat(scene,name,hex,emissive=.04){const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(hex);m.specularColor=new BABYLON.Color3(.06,.06,.07);m.emissiveColor=m.diffuseColor.scale(emissive);return m;}
function decorate(mesh){mesh.renderOutline=true;mesh.outlineColor=BABYLON.Color3.Black();mesh.outlineWidth=.035;return mesh;}
function visualBox(scene,name,pos,size,colour,parent=null){const m=decorate(BABYLON.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene));m.position.set(...pos);m.material=makeMat(scene,`${name}-mat`,colour);if(parent)m.parent=parent;return m;}
function visualCylinder(scene,name,pos,diameter,height,colour){const m=decorate(BABYLON.MeshBuilder.CreateCylinder(name,{diameter,height,tessellation:16},scene));m.position.set(...pos);m.material=makeMat(scene,`${name}-mat`,colour);return m;}
function fixedBox(world,pos,half){const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...pos));world.createCollider(RAPIER.ColliderDesc.cuboid(...half).setFriction(.9),body);return body;}

function buildArena(scene,world,definition){
 const [w,d]=definition.size;const meshes=[],bodies=[];
 meshes.push(visualBox(scene,'arena-floor',[0,-.35,0],[w,.7,d],definition.primary));bodies.push(fixedBox(world,[0,-.35,0],[w/2,.35,d/2]));
 const wall='#171020';
 const walls=[[0,.7,d/2,w,.9,.45],[0,.7,-d/2,w,.9,.45],[w/2,.7,0,.45,.9,d],[-w/2,.7,0,.45,.9,d]];
 for(const [x,y,z,sx,sy,sz] of walls){meshes.push(visualBox(scene,`wall-${meshes.length}`,[x,y,z],[sx,sy,sz],wall));bodies.push(fixedBox(world,[x,y,z],[sx/2,sy/2,sz/2]));}
 const spawnPoints=[{x:-w*.24,y:1.45,z:0},{x:w*.24,y:1.45,z:0},{x:0,y:1.45,z:-d*.25},{x:0,y:1.45,z:d*.25}];
 if(definition.id==='wrestling-arena'){
  meshes.push(visualBox(scene,'ring-mat',[0,.18,0],[14,.36,10],'#f3dfb0'));bodies.push(fixedBox(world,[0,.18,0],[7,.18,5]));
  for(const x of [-6.7,6.7])for(const z of [-4.7,4.7])meshes.push(visualCylinder(scene,`post-${x}-${z}`,[x,1.7,z],.34,3.4,definition.secondary));
  for(const y of [1.05,1.55,2.05]){meshes.push(visualBox(scene,`rope-n-${y}`,[0,y,4.72],[13.4,.08,.08],'#e74f53'));meshes.push(visualBox(scene,`rope-s-${y}`,[0,y,-4.72],[13.4,.08,.08],'#e74f53'));meshes.push(visualBox(scene,`rope-e-${y}`,[6.72,y,0],[.08,.08,9.4],'#e74f53'));meshes.push(visualBox(scene,`rope-w-${y}`,[-6.72,y,0],[.08,.08,9.4],'#e74f53'));}
 }else if(definition.id==='dublin-docks'){
  meshes.push(visualBox(scene,'container-a',[-6,1,5],[4,2,2],definition.secondary),visualBox(scene,'container-b',[6,1,-5],[4,2,2],'#ca4d47'));
 }else if(definition.id==='london-underground'){
  meshes.push(visualBox(scene,'platform-stripe',[0,.03,0],[w*.75,.08,1.1],definition.secondary),visualBox(scene,'roundel',[0,2.2,d/2-.7],[3,1,.2],'#2c5bbb'));
 }else if(definition.id==='mango-market'){
  for(const x of [-6,0,6])meshes.push(visualBox(scene,`stall-${x}`,[x,1,d/2-2],[3.3,2,1.5],x===0?definition.secondary:'#ffd04b'));
 }else if(definition.id==='temple-courtyard'){
  for(const x of [-7,7])for(const z of [-5,5])meshes.push(visualCylinder(scene,`pillar-${x}-${z}`,[x,2,z],1,4,definition.secondary));
 }else if(definition.id==='sichuan-tea-house'){
  meshes.push(visualBox(scene,'tea-counter',[0,.9,d/2-1.5],[7,1.7,1.2],definition.secondary),visualBox(scene,'screen',[-w/2+1,1.5,0],[.3,3,5],'#e6d0a1'));
 }else if(definition.id==='ice-festival'){
  for(const x of [-6,-3,0,3,6])meshes.push(visualBox(scene,`ice-${x}`,[x,.8,d/2-1.6],[1.7,1.5,1.4],x===0?'#effcff':'#8edcea'));
 }else if(definition.id==='house-party'){
  meshes.push(visualBox(scene,'sofa',[-5,.8,d/2-1.4],[4,1.4,1.5],'#4f95a8'),visualBox(scene,'party-table',[4,.65,d/2-1.4],[3.3,.22,1.8],definition.secondary));
 }else if(definition.id==='toy-factory'){
  meshes.push(visualBox(scene,'conveyor',[0,.35,0],[11,.45,2.4],'#27303a'));for(const x of [-7,7])meshes.push(visualBox(scene,`crate-${x}`,[x,.8,d/2-1.6],[1.7,1.7,1.7],definition.secondary));
 }else if(definition.id==='cruise-ship'){
  meshes.push(visualBox(scene,'pool',[0,.03,d/2-3],[7,.08,3.2],'#38aeda'),visualBox(scene,'bar',[-6,.8,-d/2+1.5],[4,1.5,1.2],definition.secondary));
 }else if(definition.id==='mad-circus'){
  for(let i=0;i<8;i++){const a=i*Math.PI/4;meshes.push(visualCylinder(scene,`tent-${i}`,[Math.cos(a)*8,2,Math.sin(a)*6],.45,4,i%2?definition.secondary:definition.primary));}
  meshes.push(visualCylinder(scene,'trampoline',[0,.25,0],4.5,.35,'#28232f'));
 }
 return{meshes,bodies,spawnPoints,bounds:{w,d}};
}

function createScene(engine,definition){
 const scene=new BABYLON.Scene(engine);scene.clearColor=BABYLON.Color4.FromHexString('#12091fff');
 const hemi=new BABYLON.HemisphericLight('soft-light',new BABYLON.Vector3(.1,1,.2),scene);hemi.intensity=1.05;hemi.diffuse=new BABYLON.Color3(1,.92,.82);hemi.groundColor=new BABYLON.Color3(.18,.12,.24);
 const key=new BABYLON.DirectionalLight('key-light',new BABYLON.Vector3(-.4,-1,.35),scene);key.intensity=1.1;key.diffuse=BABYLON.Color3.FromHexString(definition.secondary);
 const camera=new BABYLON.ArcRotateCamera('arcade-camera',-Math.PI/2,1.05,25,new BABYLON.Vector3(0,1,0),scene);camera.lowerRadiusLimit=18;camera.upperRadiusLimit=32;camera.fov=.78;
 return{scene,camera};
}

function hitBurst(scene,pos,hex){const ring=BABYLON.MeshBuilder.CreateTorus('hit-burst',{diameter:1.2,thickness:.18,tessellation:18},scene);ring.position.set(pos.x,pos.y+1,pos.z);ring.rotation.x=Math.PI/2;const mat=makeMat(scene,'hit-burst-mat',hex,.8);ring.material=mat;let n=0;const obs=scene.onBeforeRenderObservable.add(()=>{n++;ring.scaling.scaleInPlace(1.08);ring.visibility=Math.max(0,1-n/8);if(n>=8){scene.onBeforeRenderObservable.remove(obs);ring.dispose();mat.dispose();}});}

function updateHud(fighters){const [a,b]=fighters;if(!a||!b)return;ui.p1Name.textContent=a.definition.name;ui.p2Name.textContent=b.definition.name;ui.p1Hp.textContent=`${Math.ceil(a.hp)} HP`;ui.p2Hp.textContent=`${Math.ceil(b.hp)} HP`;ui.p1Fill.style.width=`${a.hp}%`;ui.p2Fill.style.width=`${b.hp}%`;}

function attemptAttack(attacker,target,input,scene){
 if(!attacker.alive||!target.alive||!input.attack||attacker.attackCooldown>0||active?.roundOver)return;
 attacker.attackCooldown=.46;
 const a=attacker.body.translation(),b=target.body.translation(),dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz)||.001;if(dist>2.5)return;
 const damage=input.dash?16:12,force=input.dash?7.5:5.6;
 target.applyDamage(damage,{x:dx/dist*force,y:2.8,z:dz/dist*force});hitBurst(scene,b,attacker.definition.accent);updateHud(active.fighters);
}

function simulate(dt){
 const {fighters,scene}=active;if(active.roundOver)return;
 const p1=readPlayerInput(0);const secondPad=padInput(1);const p2=secondPad||createBotInput(fighters[1],fighters[0]);
 fighters[0].update(p1,dt);fighters[1].update(p2,dt);attemptAttack(fighters[0],fighters[1],p1,scene);attemptAttack(fighters[1],fighters[0],p2,scene);
 for(const f of fighters){const p=f.body.translation();if(p.y<-3.5&&f.alive){f.applyDamage(25,{x:0,y:0,z:0});f.body.setTranslation(f.spawn,true);f.body.setLinvel({x:0,y:0,z:0},true);}}
 const alive=fighters.filter(f=>f.alive);if(alive.length<=1){active.roundOver=true;ui.round.hidden=false;ui.round.textContent=alive[0]?`${alive[0].definition.name.toUpperCase()} WINS!`:'DOUBLE KNOCKOUT!';}
 updateHud(fighters);
}

export async function startLocalMatch(config){
 lastConfig=config;stopMatch(false);showOnly(ui.game);clearFatal();setLoading(true,'Loading the new browser-native Dǎnào engine…');
 try{
  await initRuntime();
  const engine=new BABYLON.Engine(ui.canvas,true,{antialias:true,adaptToDeviceRatio:true,preserveDrawingBuffer:false,stencil:false});
  const arenaDef=byId(ARENAS,config.arena),characterDef=byId(CHARACTERS,config.character);const opponentDef=CHARACTERS[(CHARACTERS.indexOf(characterDef)+1)%CHARACTERS.length];
  const {scene,camera}=createScene(engine,arenaDef);const world=new RAPIER.World({x:0,y:-18,z:0});world.timestep=FIXED_STEP;const arena=buildArena(scene,world,arenaDef);
  const fighters=[createFighter({BABYLON,RAPIER,scene,world,definition:characterDef,position:arena.spawnPoints[0],slot:0}),createFighter({BABYLON,RAPIER,scene,world,definition:opponentDef,position:arena.spawnPoints[1],slot:1})];
  active={engine,scene,camera,world,arena,fighters,roundOver:false};ui.round.hidden=true;updateHud(fighters);setLoading(false);
  let previous=performance.now()/1000,accumulator=0;
  engine.runRenderLoop(()=>{
   if(!active)return;const now=performance.now()/1000,frame=Math.min(.1,Math.max(0,now-previous));previous=now;accumulator=Math.min(.25,accumulator+frame);
   while(accumulator>=FIXED_STEP){simulate(FIXED_STEP);world.step();accumulator-=FIXED_STEP;}
   fighters.forEach(f=>f.sync());const a=fighters[0].root.position,b=fighters[1].root.position;const target=new BABYLON.Vector3((a.x+b.x)/2,1.1,(a.z+b.z)/2);camera.setTarget(BABYLON.Vector3.Lerp(camera.target,target,.08));scene.render();
  });
  engine.resize();
 }catch(error){console.error(error);setLoading(false);setFatal(error?.message||String(error));}
}

export function stopMatch(showMenu=true){
 if(active){try{active.engine.stopRenderLoop();}catch{}try{active.fighters.forEach(f=>f.dispose());}catch{}try{active.scene.dispose();}catch{}try{active.engine.dispose();}catch{}active=null;}
 keys.clear();setLoading(false);clearFatal();if(ui.round)ui.round.hidden=true;if(showMenu)showOnly(ui.main);
}

function selectedConfig(){return{arena:ui.arena.value,character:ui.character.value,mode:ui.mode.value};}

$('local-play')?.addEventListener('click',()=>{clearFatal();showOnly(ui.setup);ui.status.textContent='LOCAL SETUP READY · NO UNITY LOAD REQUIRED';ui.status.className='compatibility ok';});
$('setup-back')?.addEventListener('click',()=>showOnly(ui.main));
$('start-local')?.addEventListener('click',()=>startLocalMatch(selectedConfig()));
$('return-menu')?.addEventListener('click',()=>stopMatch(true));
$('retry')?.addEventListener('click',()=>lastConfig?startLocalMatch(lastConfig):showOnly(ui.main));
$('online-play')?.addEventListener('click',()=>{ui.status.textContent='ONLINE ROOMS ARE BEING RECONNECTED TO THE EXISTING CLOUDFLARE BACKEND.';ui.status.className='compatibility';});
$('how-to-play')?.addEventListener('click',()=>{$('how-panel').hidden=!$('how-panel').hidden;});
$('fullscreen')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
addEventListener('resize',()=>active?.engine.resize());

ui.status.textContent='BABYLON + RAPIER BROWSER BUILD READY';ui.status.className='compatibility ok';showOnly(ui.main);
