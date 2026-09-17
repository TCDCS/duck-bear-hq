import {ARENAS,CHARACTERS,MODES,byId} from './catalog.mjs';
import {createFighter} from './fighter.mjs';
import {createBotInput} from './bot.mjs';
import {spawnWeapons,tryPickupWeapon,useHeldWeapon,dropHeldWeapon} from './weapons.mjs';
import {MODE_RULES,OBJECTIVE_RULES,createModeState,resolveElimination,collectMango,tickKingOfRing,passHotBomb,tickHotBomb,tickHeist,objectiveHudText} from './modes.mjs';
import {setupArenaHazard,tickArenaHazard,syncHazardVisual,captureHazardState,hydrateHazardState} from './hazard-runtime.mjs';
import {createRoom,joinRoom,connectRoom,sendReady,sendChoice,sendSetup,sendStart,sendInput,sendHostState,sendResult,leaveRoom,roomSession} from './online.mjs';

export const FIXED_STEP=1/60;
const SNAPSHOT_STEP=1/15;
const INPUT_STEP=1/30;
const ZERO_INPUT=Object.freeze({x:0,z:0,attack:false,dash:false});

const $=id=>document.getElementById(id);
const ui={
 main:$('main-menu'),setup:$('local-setup'),online:$('online-lobby'),game:$('game-screen'),hud:$('game-hud'),canvas:$('game-canvas'),loading:$('loading'),loadingText:$('loading-text'),error:$('fatal'),errorText:$('fatal-text'),
 arena:$('arena-select'),character:$('character-select'),mode:$('mode-select'),round:$('round-over'),objective:$('objective-status'),p1Name:$('p1-name'),p2Name:$('p2-name'),p1Hp:$('p1-hp'),p2Hp:$('p2-hp'),p1Fill:$('p1-fill'),p2Fill:$('p2-fill'),p1Weapon:$('p1-weapon'),p2Weapon:$('p2-weapon'),pad:$('padState'),status:$('compatibility'),
 onlineName:$('online-name'),onlineCode:$('online-code'),onlineCharacter:$('online-character'),onlineArena:$('online-arena'),onlineMode:$('online-mode'),onlineStatus:$('online-status'),roomCode:$('room-code'),roomPlayers:$('room-players'),roomReady:$('room-ready'),roomStart:$('room-start'),roomLeave:$('room-leave')
};

let BABYLON=null,RAPIER=null,active=null,lastConfig=null,onlineRoom=null,onlineStarting=false,onlineBusy=false;
const keys=new Set();

function showOnly(section){for(const node of [ui.main,ui.setup,ui.online,ui.game])if(node)node.hidden=node!==section;}
function setLoading(on,text='Loading Babylon + Rapier…'){if(ui.loading){ui.loading.hidden=!on;if(ui.loadingText)ui.loadingText.textContent=text;}}
function setFatal(message){if(ui.error){ui.error.hidden=false;if(ui.errorText)ui.errorText.textContent=message||'The game could not start.';}}
function clearFatal(){if(ui.error)ui.error.hidden=true;}
function setOnlineStatus(text,error=false){if(!ui.onlineStatus)return;ui.onlineStatus.textContent=text;ui.onlineStatus.className=`compatibility${error?' error':''}`;}
function fillSelect(select,items){if(!select)return;select.replaceChildren(...items.map(item=>{const o=document.createElement('option');o.value=item.id;o.textContent=item.name;return o;}));}
function arenaNetworkId(definition){return definition.name.replace(/\s+/g,'');}
function arenaFromNetwork(id){return ARENAS.find(item=>arenaNetworkId(item)===id)||ARENAS[0];}
function characterFromNetwork(name){return CHARACTERS.find(item=>item.name===name)||CHARACTERS[0];}
function fighterForSlot(slot){return active?.fighters?.find(f=>f.slot===slot)||null;}
function modeKindFromId(id){return byId(MODES,id)?.kind||'OneVsOne';}
export function localPlayerCount(modeKind){return modeKind==='OneVsOne'?2:4;}

fillSelect(ui.arena,ARENAS);fillSelect(ui.character,CHARACTERS);fillSelect(ui.mode,MODES);
fillSelect(ui.onlineCharacter,CHARACTERS.map(item=>({id:item.name,name:item.name})));
fillSelect(ui.onlineArena,ARENAS.map(item=>({id:arenaNetworkId(item),name:item.name})));
fillSelect(ui.onlineMode,MODES.map(item=>({id:item.kind,name:item.name})));

function updatePadState(){
 const pads=typeof navigator.getGamepads==='function'?[...navigator.getGamepads()].filter(Boolean):[];
 if(ui.pad){ui.pad.textContent=pads.length?`CONTROLLER: ${pads.length} READY`:'CONTROLLER: KEYBOARD';ui.pad.classList.toggle('ready',pads.length>0);}
}
addEventListener('gamepadconnected',updatePadState);addEventListener('gamepaddisconnected',updatePadState);updatePadState();

const gameKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight','Escape']);
addEventListener('keydown',event=>{keys.add(event.code);if(active&&gameKeys.has(event.code))event.preventDefault();if(event.code==='Escape'&&active)leaveActiveMatch();},{passive:false});
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
 const weaponSpawns=[
  {x:spawnPoints[0].x+.85,y:.95,z:.65},{x:spawnPoints[1].x-.85,y:.95,z:-.65},
  {x:-w*.18,y:.95,z:-d*.28},{x:w*.18,y:.95,z:d*.28},{x:0,y:.95,z:-d*.3},{x:0,y:.95,z:d*.3},
  {x:-w*.3,y:.95,z:0},{x:w*.3,y:.95,z:0}
 ];
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
 return{meshes,bodies,spawnPoints,weaponSpawns,bounds:{w,d}};
}

function createScene(engine,definition){
 const scene=new BABYLON.Scene(engine);scene.clearColor=BABYLON.Color4.FromHexString('#12091fff');
 const hemi=new BABYLON.HemisphericLight('soft-light',new BABYLON.Vector3(.1,1,.2),scene);hemi.intensity=1.05;hemi.diffuse=new BABYLON.Color3(1,.92,.82);hemi.groundColor=new BABYLON.Color3(.18,.12,.24);
 const key=new BABYLON.DirectionalLight('key-light',new BABYLON.Vector3(-.4,-1,.35),scene);key.intensity=1.1;key.diffuse=BABYLON.Color3.FromHexString(definition.secondary);
 const camera=new BABYLON.ArcRotateCamera('arcade-camera',-Math.PI/2,1.05,25,new BABYLON.Vector3(0,1,0),scene);camera.lowerRadiusLimit=18;camera.upperRadiusLimit=32;camera.fov=.78;
 return{scene,camera};
}

function hitBurst(scene,pos,hex){const ring=BABYLON.MeshBuilder.CreateTorus('hit-burst',{diameter:1.2,thickness:.18,tessellation:18},scene);ring.position.set(pos.x,pos.y+1,pos.z);ring.rotation.x=Math.PI/2;const mat=makeMat(scene,'hit-burst-mat',hex,.8);ring.material=mat;let n=0;const obs=scene.onBeforeRenderObservable.add(()=>{n++;ring.scaling.scaleInPlace(1.08);ring.visibility=Math.max(0,1-n/8);if(n>=8){scene.onBeforeRenderObservable.remove(obs);ring.dispose();mat.dispose();}});}

function heldText(fighter){
 const held=fighter?.heldWeapon;if(!held)return'FISTS';
 const ammo=held.definition.class==='ranged'?` · ${held.ammo} LEFT`:'';
 return`${held.definition.name.toUpperCase()}${ammo}`;
}

function hudFighters(fighters){
 if(!active?.online)return[fighters[0],fighters[1]];
 const local=fighters.find(f=>f.slot===active.localSlot)||fighters[0];
 const opponent=fighters.find(f=>f!==local)||fighters[1]||local;
 return[local,opponent];
}

function updateObjectiveHud(){
 if(!ui.objective)return;
 const text=active?.modeRules?.objective?objectiveHudText(active.modeState):'';
 ui.objective.hidden=!text;ui.objective.textContent=text;
}

function updateHud(fighters){
 const [a,b]=hudFighters(fighters);if(!a||!b)return;
 ui.p1Name.textContent=a.definition.name;ui.p2Name.textContent=b.definition.name;ui.p1Hp.textContent=`${Math.ceil(a.hp)} HP`;ui.p2Hp.textContent=`${Math.ceil(b.hp)} HP`;ui.p1Fill.style.width=`${a.hp}%`;ui.p2Fill.style.width=`${b.hp}%`;
 if(ui.p1Weapon)ui.p1Weapon.textContent=heldText(a);if(ui.p2Weapon)ui.p2Weapon.textContent=heldText(b);updateObjectiveHud();
}

function fighterModeView(fighter){const p=fighter.body.translation();return{slot:fighter.slot,alive:fighter.alive,x:p.x,z:p.z,team:fighter.team};}
function modeViews(fighters){return fighters.map(fighterModeView);}
function distance2d(a,b){return Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));}

function mangoPosition(index,serial=0){
 const angle=index*(Math.PI*2/7)+serial*.91,ring=serial%3;
 return{x:Math.cos(angle)*active.arena.bounds.w*(.17+ring*.035),z:Math.sin(angle)*active.arena.bounds.d*(.17+ring*.035)};
}

function setupModeObjectives(){
 const slots=active.fighters.map(f=>f.slot),homes={};for(const f of active.fighters){const spawn=active.arena.spawnPoints[f.slot%active.arena.spawnPoints.length];homes[f.slot]={x:spawn.x,z:spawn.z};}
 active.modeState=createModeState(active.modeKind,slots,{loot:{x:0,z:0},homes});active.objectiveProps={mangos:[],ring:null,bomb:null,loot:null,homes:[]};active.respawnTimers=new Map();
 if(active.modeKind==='MangoGrab'){
  active.modeState.mangoSerial=0;active.modeState.tokens=Array.from({length:7},(_,i)=>mangoPosition(i,0));
  for(let i=0;i<7;i++){const mesh=decorate(BABYLON.MeshBuilder.CreateSphere(`mango-${i}`,{diameter:.58,segments:10},active.scene));mesh.material=makeMat(active.scene,`mango-${i}-mat`,'#f5bd2d',.28);active.objectiveProps.mangos.push(mesh);}
 }else if(active.modeKind==='KingOfTheRing'){
  const ring=decorate(BABYLON.MeshBuilder.CreateTorus('king-ring',{diameter:OBJECTIVE_RULES.kingRadius*2,thickness:.18,tessellation:44},active.scene));ring.rotation.x=Math.PI/2;ring.position.y=.12;const mat=makeMat(active.scene,'king-ring-mat','#f5d64c',.32);mat.alpha=.72;ring.material=mat;active.objectiveProps.ring=ring;
 }else if(active.modeKind==='HotBomb'){
  const bomb=decorate(BABYLON.MeshBuilder.CreateSphere('hot-bomb',{diameter:.62,segments:12},active.scene));bomb.material=makeMat(active.scene,'hot-bomb-mat','#ff5c4f',.48);active.objectiveProps.bomb=bomb;
 }else if(active.modeKind==='Heist'){
  const loot=decorate(BABYLON.MeshBuilder.CreateBox('heist-loot',{size:.72},active.scene));loot.material=makeMat(active.scene,'heist-loot-mat','#f4ca43',.35);active.objectiveProps.loot=loot;
  for(const f of active.fighters){const home=homes[f.slot],ring=decorate(BABYLON.MeshBuilder.CreateTorus(`heist-home-${f.slot}`,{diameter:OBJECTIVE_RULES.heistHomeRadius*2,thickness:.13,tessellation:30},active.scene));ring.rotation.x=Math.PI/2;ring.position.set(home.x,.11,home.z);const mat=makeMat(active.scene,`heist-home-${f.slot}-mat`,f.definition.accent,.25);mat.alpha=.6;ring.material=mat;active.objectiveProps.homes.push(ring);}
 }
 syncObjectiveVisuals();updateObjectiveHud();
}

function syncObjectiveVisuals(){
 if(!active?.objectiveProps||!active.modeState)return;
 if(active.modeKind==='MangoGrab')for(let i=0;i<active.objectiveProps.mangos.length;i++){const pos=active.modeState.tokens?.[i];if(pos)active.objectiveProps.mangos[i].position.set(pos.x,.78,pos.z);}
 if(active.modeKind==='HotBomb'&&active.objectiveProps.bomb){const holder=fighterForSlot(active.modeState.holder);active.objectiveProps.bomb.setEnabled(Boolean(holder));if(holder){const p=holder.body.translation();active.objectiveProps.bomb.position.set(p.x,p.y+1.8,p.z);active.objectiveProps.bomb.rotation.y+=.05;}}
 if(active.modeKind==='Heist'&&active.objectiveProps.loot&&active.modeState.loot)active.objectiveProps.loot.position.set(active.modeState.loot.x,.78,active.modeState.loot.z);
}

function repositionMango(index){active.modeState.mangoSerial=(active.modeState.mangoSerial||0)+1;active.modeState.tokens[index]=mangoPosition(index,active.modeState.mangoSerial);}

function finishMatch({winnerSlot=-1,winnerTeam=-1,text='',reason='finished'}={}){
 if(!active||active.roundOver)return;active.roundOver=true;ui.round.hidden=false;
 const winner=fighterForSlot(winnerSlot);ui.round.textContent=text||(winner?`${winner.definition.name.toUpperCase()} WINS!`:winnerTeam>=0?`TEAM ${winnerTeam+1} WINS!`:'DOUBLE KNOCKOUT!');
 if(active.online&&active.isHost&&!active.resultSent){active.resultSent=true;sendResult({winner:winnerSlot,winnerTeam,interrupted:false,reason});}
}

function notifySuccessfulHit(attacker,target){if(active?.modeKind==='HotBomb'&&active.modeState){passHotBomb(active.modeState,attacker.slot,target.slot);syncObjectiveVisuals();updateObjectiveHud();}}

function attemptAttack(attacker,target,input,scene){
 if(!attacker?.alive||!target?.alive||!input.attack||attacker.attackCooldown>0||active?.roundOver)return false;
 if(!attacker.heldWeapon){
  const picked=tryPickupWeapon(attacker,active.pickups);
  if(picked){attacker.attackCooldown=.25;updateHud(active.fighters);return false;}
 }
 if(attacker.heldWeapon){
  const result=useHeldWeapon({BABYLON,scene,attacker,target});
  if(result.hit){const p=target.body.translation();hitBurst(scene,p,result.weapon?.colour||attacker.definition.accent);notifySuccessfulHit(attacker,target);}
  updateHud(active.fighters);return Boolean(result.hit);
 }
 attacker.attackCooldown=.46;
 const a=attacker.body.translation(),b=target.body.translation(),dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz)||.001;if(dist>2.5)return false;
 const damage=input.dash?16:12,force=input.dash?7.5:5.6;
 target.applyDamage(damage,{x:dx/dist*force,y:2.8,z:dz/dist*force});hitBurst(scene,b,attacker.definition.accent);notifySuccessfulHit(attacker,target);updateHud(active.fighters);return true;
}

function nearestTarget(attacker,fighters){
 let best=null,distance=Infinity;const a=attacker.body.translation();
 for(const fighter of fighters){if(fighter===attacker||!fighter.alive)continue;if(active?.modeRules?.teams&&fighter.team===attacker.team)continue;const b=fighter.body.translation(),d=Math.hypot(b.x-a.x,b.z-a.z);if(d<distance){distance=d;best=fighter;}}
 return best;
}

function respawnFighter(fighter){if(fighter.heldWeapon){const p=fighter.body.translation();dropHeldWeapon(fighter,{x:p.x,y:Math.max(.9,p.y),z:p.z});}fighter.reset();}

function handleRespawns(dt){
 if(!active?.modeRules?.objective)return;
 for(const fighter of active.fighters){
  if(fighter.alive){active.respawnTimers.delete(fighter.slot);continue;}
  const remaining=active.respawnTimers.has(fighter.slot)?active.respawnTimers.get(fighter.slot)-dt:active.modeRules.respawnSeconds;
  if(remaining<=0){respawnFighter(fighter);active.respawnTimers.delete(fighter.slot);}else active.respawnTimers.set(fighter.slot,remaining);
 }
}

function handleArenaBounds(fighters){
 for(const f of fighters){
  const p=f.body.translation();
  if(p.y<-3.5&&f.alive){
   if(active.modeRules.ringOut||active.modeRules.objective)f.applyDamage(100,{x:0,y:0,z:0});
   else{f.applyDamage(25,{x:0,y:0,z:0});if(f.alive){f.body.setTranslation(f.spawn,true);f.body.setLinvel({x:0,y:0,z:0},true);}}
  }
  if(!f.alive&&f.heldWeapon)dropHeldWeapon(f,{x:p.x,y:Math.max(.9,p.y),z:p.z});
 }
}

function completeRoundIfNeeded(fighters){
 if(active?.modeRules?.objective)return;
 const result=resolveElimination(active.modeKind,modeViews(fighters));if(!result.finished)return;
 finishMatch({winnerSlot:result.winnerSlot,winnerTeam:result.winnerTeam,reason:active.modeRules.ringOut?'ring-out':'knockout'});
}

export function tickModeObjectives(dt){
 if(!active?.modeRules?.objective||active.roundOver)return;
 const views=modeViews(active.fighters);
 if(active.modeKind==='MangoGrab'){
  for(let i=0;i<(active.modeState.tokens?.length||0);i++){const token=active.modeState.tokens[i],collector=views.find(f=>f.alive&&distance2d(f,token)<=1.05);if(collector){collectMango(active.modeState,collector.slot);repositionMango(i);}}
 }else if(active.modeKind==='KingOfTheRing')tickKingOfRing(active.modeState,views,dt,{x:0,z:0});
 else if(active.modeKind==='HotBomb')tickHotBomb(active.modeState,views,dt);
 else if(active.modeKind==='Heist')tickHeist(active.modeState,views);
 syncObjectiveVisuals();updateObjectiveHud();
 if(active.modeState.finished)finishMatch({winnerSlot:active.modeState.winnerSlot,winnerTeam:active.modeState.winnerTeam,text:active.modeState.resultText,reason:active.modeKind});
}

function networkInput(frame){if(!frame)return ZERO_INPUT;return{x:Number(frame.moveX)||0,z:Number(frame.moveY)||0,attack:Boolean(frame.punch||frame.fire||frame.grab),dash:Boolean(frame.dodge)};}

function localInputFor(fighter,fighters){
 if(fighter.slot===0)return readPlayerInput(0);
 const pad=padInput(fighter.slot);if(pad)return pad;
 const target=nearestTarget(fighter,fighters);return target?createBotInput(fighter,target):ZERO_INPUT;
}

function simulateLocal(dt){
 const {fighters,scene}=active;if(active.roundOver)return;
 const inputs=new Map();for(const fighter of fighters){const input=localInputFor(fighter,fighters);inputs.set(fighter.slot,input);fighter.update(input,dt);}
 for(const fighter of fighters){const target=nearestTarget(fighter,fighters);if(target)attemptAttack(fighter,target,inputs.get(fighter.slot),scene);}
 tickArenaHazard(active,dt);handleArenaBounds(fighters);handleRespawns(dt);tickModeObjectives(dt);completeRoundIfNeeded(fighters);updateHud(fighters);
}

function simulateOnline(dt){
 const {fighters,scene,isHost,localSlot}=active;if(active.roundOver)return;
 const localInput=readPlayerInput(0),local=fighterForSlot(localSlot);
 if(!isHost){if(local)local.update(localInput,dt);tickArenaHazard(active,dt);updateHud(fighters);return;}
 const inputs=new Map();for(const fighter of fighters){const input=fighter.slot===localSlot?localInput:networkInput(active.remoteInputs.get(fighter.slot));inputs.set(fighter.slot,input);fighter.update(input,dt);}
 for(const fighter of fighters){const target=nearestTarget(fighter,fighters);if(target)attemptAttack(fighter,target,inputs.get(fighter.slot),scene);}
 tickArenaHazard(active,dt);handleArenaBounds(fighters);handleRespawns(dt);tickModeObjectives(dt);completeRoundIfNeeded(fighters);updateHud(fighters);
}

function simulate(dt){if(!active)return;if(active.online)simulateOnline(dt);else simulateLocal(dt);}

function copyModeState(){try{return JSON.parse(JSON.stringify(active.modeState));}catch{return null;}}
function captureNetworkSnapshot(){
 return{seq:++active.snapshotSeq,matchId:onlineRoom?.matchId||0,phase:active.roundOver?'results':'fight',objective:active.modeState?{kind:active.modeKind,state:copyModeState()}:null,hazard:captureHazardState(active),fighters:active.fighters.map(f=>{const p=f.body.translation(),q=f.body.rotation(),v=f.body.linvel(),av=f.body.angvel();return{slot:f.slot,x:p.x,y:p.y,z:p.z,qx:q.x,qy:q.y,qz:q.z,qw:q.w,vx:v.x,vy:v.y,vz:v.z,avx:av.x,avy:av.y,avz:av.z,hp:Math.max(0,Math.min(100,Math.round(f.hp))),eliminated:!f.alive,weaponId:f.heldWeapon?.definition?.id||''};})};
}

function lerp(a,b,t){return a+(b-a)*t;}
export function applyNetworkSnapshot(snapshot,exact=false){
 if(!active?.online||!snapshot?.fighters)return;
 if(!exact&&Number.isInteger(snapshot.seq)&&snapshot.seq<=active.appliedSnapshotSeq)return;
 if(Number.isInteger(snapshot.seq))active.appliedSnapshotSeq=Math.max(active.appliedSnapshotSeq,snapshot.seq);
 for(const state of snapshot.fighters){
  const fighter=fighterForSlot(state.slot);if(!fighter)continue;const p=fighter.body.translation();const isLocal=fighter.slot===active.localSlot&&!active.isHost;const blend=exact?1:(isLocal?.22:.48);
  const position={x:lerp(p.x,Number(state.x)||0,blend),y:lerp(p.y,Number(state.y)||0,blend),z:lerp(p.z,Number(state.z)||0,blend)};fighter.body.setTranslation(position,true);
  const v=fighter.body.linvel();fighter.body.setLinvel({x:lerp(v.x,Number(state.vx)||0,blend),y:lerp(v.y,Number(state.vy)||0,blend),z:lerp(v.z,Number(state.vz)||0,blend)},true);
  if(Number.isFinite(state.qw))fighter.body.setRotation({x:Number(state.qx)||0,y:Number(state.qy)||0,z:Number(state.qz)||0,w:Number(state.qw)||1},true);
  fighter.hp=Math.max(0,Math.min(100,Number(state.hp)??fighter.hp));fighter.alive=!state.eliminated&&fighter.hp>0;
 }
 if(snapshot.objective?.state&&snapshot.objective.kind===active.modeKind){try{active.modeState=JSON.parse(JSON.stringify(snapshot.objective.state));}catch{}}
 hydrateHazardState(active,snapshot.hazard);syncObjectiveVisuals();syncHazardVisual(active);updateHud(active.fighters);
}

function tickNetwork(now){
 if(!active?.online)return;
 const input=readPlayerInput(0);
 if(!active.isHost){
  active.inputLatch.attack=active.inputLatch.attack||input.attack;active.inputLatch.dash=active.inputLatch.dash||input.dash;
  if(now>=active.nextInputAt){active.nextInputAt=now+INPUT_STEP;sendInput({seq:++active.inputSeq,moveX:input.x,moveY:input.z,jump:false,punch:active.inputLatch.attack,grab:false,dodge:active.inputLatch.dash,fire:false,block:false});active.inputLatch.attack=false;active.inputLatch.dash=false;}
  if(active.latestSnapshot)applyNetworkSnapshot(active.latestSnapshot,false);
 }else if(now>=active.nextSnapshotAt){active.nextSnapshotAt=now+SNAPSHOT_STEP;sendHostState(captureNetworkSnapshot());}
}

function cameraTarget(fighters){
 const alive=fighters.filter(f=>f.alive),source=alive.length?alive:fighters;if(!source.length)return new BABYLON.Vector3(0,1.1,0);
 let x=0,z=0;for(const f of source){x+=f.root.position.x;z+=f.root.position.z;}return new BABYLON.Vector3(x/source.length,1.1,z/source.length);
}

async function launchMatch({arenaDef,fighterSpecs,modeKind='OneVsOne',onlineData=null}){
 await initRuntime();
 const engine=new BABYLON.Engine(ui.canvas,true,{antialias:true,adaptToDeviceRatio:true,preserveDrawingBuffer:false,stencil:false});
 const {scene,camera}=createScene(engine,arenaDef);const world=new RAPIER.World({x:0,y:-18,z:0});world.timestep=FIXED_STEP;const arena=buildArena(scene,world,arenaDef);
 const fighters=fighterSpecs.map(spec=>createFighter({BABYLON,RAPIER,scene,world,definition:spec.definition,position:arena.spawnPoints[spec.slot%arena.spawnPoints.length],slot:spec.slot}));
 for(const fighter of fighters)fighter.team=modeKind==='TwoVsTwo'?fighter.slot%2:-1;
 const pickups=spawnWeapons({BABYLON,scene,positions:arena.weaponSpawns,arenaId:arenaDef.id});
 active={engine,scene,camera,world,arena,arenaDef,fighters,pickups,roundOver:false,modeKind,modeRules:MODE_RULES[modeKind]||MODE_RULES.OneVsOne,arenaHazards:onlineData?.arenaHazards??true,online:Boolean(onlineData),...(onlineData||{})};setupModeObjectives();setupArenaHazard(active,{BABYLON});
 if(active.online){active.remoteInputs=new Map();active.latestSnapshot=null;active.snapshotSeq=0;active.appliedSnapshotSeq=-1;active.inputSeq=0;active.nextInputAt=0;active.nextSnapshotAt=0;active.inputLatch={attack:false,dash:false};active.resultSent=false;}
 ui.round.hidden=true;updateHud(fighters);setLoading(false);
 let previous=performance.now()/1000,accumulator=0;
 engine.runRenderLoop(()=>{
  if(!active)return;const now=performance.now()/1000,frame=Math.min(.1,Math.max(0,now-previous));previous=now;accumulator=Math.min(.25,accumulator+frame);
  while(accumulator>=FIXED_STEP){simulate(FIXED_STEP);world.step();accumulator-=FIXED_STEP;}
  if(active?.online)tickNetwork(now);
  fighters.forEach(f=>f.sync());
  pickups.forEach((pickup,index)=>{if(pickup.available){pickup.mesh.rotation.y+=.012;pickup.mesh.position.y=pickup.home.y+Math.sin(now*2.3+index)*.08;}});
  syncObjectiveVisuals();syncHazardVisual(active);camera.setTarget(BABYLON.Vector3.Lerp(camera.target,cameraTarget(fighters),.08));scene.render();
 });
 engine.resize();ui.canvas?.focus();
}

export async function startLocalMatch(config){
 lastConfig=config;stopMatch(false);showOnly(ui.game);clearFatal();setLoading(true,'Loading the new browser-native Dǎnào engine…');
 try{
  const arenaDef=byId(ARENAS,config.arena),characterDef=byId(CHARACTERS,config.character),modeKind=modeKindFromId(config.mode),count=localPlayerCount(modeKind),startIndex=Math.max(0,CHARACTERS.indexOf(characterDef));
  const fighterSpecs=Array.from({length:count},(_,slot)=>({slot,definition:CHARACTERS[(startIndex+slot)%CHARACTERS.length]}));
  await launchMatch({arenaDef,fighterSpecs,modeKind});
 }catch(error){console.error(error);setLoading(false);setFatal(error?.message||String(error));}
}

export async function startOnlineMatch(room=onlineRoom){
 if(onlineStarting||active?.online||!room||room.phase!=='fight')return;onlineStarting=true;stopMatch(false);showOnly(ui.game);clearFatal();setLoading(true,'Joining the online brawl…');
 try{
  const session=roomSession();if(!session||!Number.isInteger(session.id))throw new Error('Online room session was lost.');
  const players=[...(room.players||[])].sort((a,b)=>a.id-b.id);if(players.length<2)throw new Error('The online room needs at least two players.');
  const arenaDef=arenaFromNetwork(room.settings?.arena),modeKind=room.settings?.mode||'FreeForAll';const fighterSpecs=players.map(player=>({slot:player.id,definition:characterFromNetwork(player.character)}));
  await launchMatch({arenaDef,fighterSpecs,modeKind,onlineData:{localSlot:session.id,isHost:room.hostId===session.id,hostId:room.hostId,arenaHazards:room.settings?.arenaHazards!==false}});
  setOnlineStatus(`ROOM ${room.code} · FIGHT IN PROGRESS`);
 }catch(error){console.error(error);setLoading(false);setFatal(error?.message||String(error));}finally{onlineStarting=false;}
}

export function stopMatch(showMenu=true){
 if(active){try{active.engine.stopRenderLoop();}catch{}try{active.fighters.forEach(f=>f.dispose());}catch{}try{active.scene.dispose();}catch{}try{active.engine.dispose();}catch{}active=null;}
 keys.clear();setLoading(false);clearFatal();if(ui.round)ui.round.hidden=true;if(ui.objective){ui.objective.hidden=true;ui.objective.textContent='';}if(showMenu)showOnly(ui.main);
}

function selectedConfig(){return{arena:ui.arena.value,character:ui.character.value,mode:ui.mode.value};}
function selfPlayer(){const session=roomSession();return onlineRoom?.players?.find(player=>player.id===session?.id)||null;}

function renderRoom(room=onlineRoom){
 if(room)onlineRoom=room;const session=roomSession(),host=Boolean(onlineRoom&&session&&onlineRoom.hostId===session.id),self=selfPlayer();
 if(ui.roomCode)ui.roomCode.textContent=onlineRoom?.code||'----';
 if(ui.roomPlayers){ui.roomPlayers.replaceChildren();if(!onlineRoom?.players?.length){const p=document.createElement('p');p.className='room-empty';p.textContent='Create or join a room to see players here.';ui.roomPlayers.append(p);}else for(const player of onlineRoom.players){const row=document.createElement('div');row.className='room-player';const slot=document.createElement('span');slot.className='player-slot';slot.textContent=`P${player.id+1}`;const copy=document.createElement('span');copy.className='player-copy';const name=document.createElement('strong');name.textContent=player.name;const detail=document.createElement('small');detail.textContent=`${player.character} · ${player.costume}`;copy.append(name,detail);const state=document.createElement('span');state.className=`player-state${player.ready?' ready':''}${!player.connected?' offline':''}`;state.textContent=player.id===onlineRoom.hostId?'★ HOST':!player.connected?'OFFLINE':player.ready?'✓ READY':'NOT READY';row.append(slot,copy,state);ui.roomPlayers.append(row);}}
 if(ui.roomReady){ui.roomReady.disabled=!onlineRoom||!self||self.id===onlineRoom.hostId||onlineRoom.phase==='fight'||onlineBusy;ui.roomReady.textContent=self?.ready?'NOT READY':'READY';}
 const connected=onlineRoom?.players?.filter(p=>p.connected)||[],allReady=connected.length>=2&&connected.every(p=>p.ready);
 if(ui.roomStart)ui.roomStart.disabled=!host||onlineRoom?.phase!=='lobby'||!allReady||onlineBusy;
 if(ui.roomLeave)ui.roomLeave.disabled=!session||onlineBusy;
 if(ui.onlineArena){if(onlineRoom?.settings?.arena)ui.onlineArena.value=onlineRoom.settings.arena;ui.onlineArena.disabled=!host||onlineRoom?.phase==='fight'||onlineBusy;}
 if(ui.onlineMode){if(onlineRoom?.settings?.mode)ui.onlineMode.value=onlineRoom.settings.mode;ui.onlineMode.disabled=!host||onlineRoom?.phase==='fight'||onlineBusy;}
 if(active?.online&&active.isHost&&onlineRoom?.players)for(const player of onlineRoom.players)if(!player.connected)active.remoteInputs.set(player.id,null);
 if(onlineRoom?.phase==='fight'&&!active&&!onlineStarting)void startOnlineMatch(onlineRoom);
 else if(onlineRoom?.phase==='results')setOnlineStatus(`ROOM ${onlineRoom.code} · MATCH FINISHED`);
 else if(onlineRoom)setOnlineStatus(`ROOM ${onlineRoom.code} · ${host?'YOU ARE HOST':'WAITING FOR HOST'} · ${connected.length}/4 CONNECTED`);
}

function roomHandlers(){return{
 onConnection:connected=>setOnlineStatus(connected?`ROOM ${onlineRoom?.code||'----'} · CONNECTED`:'ROOM CONNECTION CLOSED',!connected),
 onRoom:room=>{onlineRoom=room;renderRoom(room);},
 onInput:(id,frame)=>{if(active?.online&&active.isHost)active.remoteInputs.set(id,frame);},
 onSnapshot:state=>{if(active?.online&&!active.isHost)active.latestSnapshot=state;},
 onHost:(hostId,state)=>{if(onlineRoom)onlineRoom.hostId=hostId;if(active?.online){const session=roomSession(),becomingHost=session?.id===hostId;if(becomingHost&&state)applyNetworkSnapshot(state,true);active.isHost=becomingHost;active.hostId=hostId;if(state)active.snapshotSeq=Math.max(active.snapshotSeq,state.seq||0);}renderRoom();},
 onResult:result=>{if(active?.online){active.roundOver=true;ui.round.hidden=false;const winner=fighterForSlot(result?.winner);ui.round.textContent=winner?`${winner.definition.name.toUpperCase()} WINS!`:result?.winnerTeam>=0?`TEAM ${result.winnerTeam+1} WINS!`:'ROUND OVER';}setOnlineStatus('MATCH FINISHED');},
 onError:message=>setOnlineStatus(message||'Online room error.',true)
};}

async function enterRoom(action){
 if(onlineBusy)return;onlineBusy=true;renderRoom();setOnlineStatus(action==='create'?'CREATING ROOM…':'JOINING ROOM…');
 try{
  const profile={name:ui.onlineName?.value||'Player',character:ui.onlineCharacter?.value||'Hero',costume:'Arcade'};
  const response=action==='create'?await createRoom(profile):await joinRoom(ui.onlineCode?.value,profile);onlineRoom=response.room;connectRoom(response,roomHandlers());renderRoom(response.room);
 }catch(error){setOnlineStatus(error?.message||String(error),true);}finally{onlineBusy=false;renderRoom();}
}

function leaveOnlineToMain(){stopMatch(false);leaveRoom();onlineRoom=null;renderRoom();showOnly(ui.main);ui.status.textContent='BABYLON + RAPIER BROWSER BUILD READY';ui.status.className='compatibility ok';}
function leaveActiveMatch(){if(active?.online)leaveOnlineToMain();else stopMatch(true);}
function sendOnlineSetup(){if(!onlineRoom||roomSession()?.id!==onlineRoom.hostId)return;sendSetup({mode:ui.onlineMode.value,arena:ui.onlineArena.value,healthDamage:true,visibleBruising:true,arenaHazards:true,friendlyFire:false});}

$('local-play')?.addEventListener('click',()=>{clearFatal();showOnly(ui.setup);ui.status.textContent='LOCAL SETUP READY · NO UNITY LOAD REQUIRED';ui.status.className='compatibility ok';});
$('setup-back')?.addEventListener('click',()=>showOnly(ui.main));
$('start-local')?.addEventListener('click',()=>startLocalMatch(selectedConfig()));
$('return-menu')?.addEventListener('click',leaveActiveMatch);
$('retry')?.addEventListener('click',()=>lastConfig?startLocalMatch(lastConfig):showOnly(ui.main));
$('online-play')?.addEventListener('click',()=>{clearFatal();showOnly(ui.online);const invite=new URLSearchParams(location.search).get('room');if(/^\d{4}$/.test(invite||''))ui.onlineCode.value=invite;renderRoom();});
$('create-room')?.addEventListener('click',()=>enterRoom('create'));
$('join-room')?.addEventListener('click',()=>enterRoom('join'));
$('room-ready')?.addEventListener('click',()=>{const self=selfPlayer();if(self)sendReady(!self.ready);});
$('room-start')?.addEventListener('click',()=>{sendOnlineSetup();sendStart();});
$('room-leave')?.addEventListener('click',leaveOnlineToMain);
$('online-back')?.addEventListener('click',()=>{if(roomSession())leaveOnlineToMain();else showOnly(ui.main);});
ui.onlineCharacter?.addEventListener('change',()=>{if(roomSession())sendChoice(ui.onlineCharacter.value,'Arcade');});
ui.onlineArena?.addEventListener('change',sendOnlineSetup);ui.onlineMode?.addEventListener('change',sendOnlineSetup);
ui.onlineCode?.addEventListener('input',()=>{ui.onlineCode.value=ui.onlineCode.value.replace(/\D/g,'').slice(0,4);});
$('how-to-play')?.addEventListener('click',()=>{$('how-panel').hidden=!$('how-panel').hidden;});
$('fullscreen')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
addEventListener('resize',()=>active?.engine.resize());

ui.status.textContent='BABYLON + RAPIER BROWSER BUILD READY';ui.status.className='compatibility ok';showOnly(ui.main);renderRoom();