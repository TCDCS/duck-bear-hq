import {hazardKind,hazardRule,hazardPose,sphereContactEffects,boxContactEffects,radialPulseEffects,environmentVelocityDelta,wrestlingRopeImpulse,pulseSchedule} from './hazards.mjs';

function mat(BABYLON,scene,name,colour,emissive=.06){
 const m=new BABYLON.StandardMaterial(name,scene);m.diffuseColor=BABYLON.Color3.FromHexString(colour);m.specularColor=new BABYLON.Color3(.06,.06,.07);m.emissiveColor=m.diffuseColor.scale(emissive);return m;
}
function outline(BABYLON,mesh){mesh.renderOutline=true;mesh.outlineColor=BABYLON.Color3.Black();mesh.outlineWidth=.035;return mesh;}
function box(BABYLON,scene,name,size,colour){const mesh=outline(BABYLON,BABYLON.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene));mesh.material=mat(BABYLON,scene,`${name}-mat`,colour);return mesh;}
function cylinder(BABYLON,scene,name,diameter,height,colour){const mesh=outline(BABYLON,BABYLON.MeshBuilder.CreateCylinder(name,{diameter,height,tessellation:18},scene));mesh.material=mat(BABYLON,scene,`${name}-mat`,colour);return mesh;}
function sphere(BABYLON,scene,name,diameter,colour){const mesh=outline(BABYLON,BABYLON.MeshBuilder.CreateSphere(name,{diameter,segments:14},scene));mesh.material=mat(BABYLON,scene,`${name}-mat`,colour,.14);return mesh;}

function makeProp(active,BABYLON){
 const {kind}=active.hazardState,scene=active.scene,secondary=active.arenaDef.secondary;
 if(kind==='CraneHook')return cylinder(BABYLON,scene,'hazard-crane-hook',.9,1.4,secondary);
 if(kind==='PassingTrain')return box(BABYLON,scene,'hazard-passing-train',[5,2.2,2.3],'#b92a39');
 if(kind==='RollingFruit')return sphere(BABYLON,scene,'hazard-rolling-mango',1.6,'#ff941f');
 if(kind==='GongPulse'){const mesh=cylinder(BABYLON,scene,'hazard-gong',3.4,.18,secondary);mesh.rotation.x=Math.PI/2;return mesh;}
 if(kind==='SlidingScreens')return box(BABYLON,scene,'hazard-sliding-screen',[.7,2.5,5],'#d3bd92');
 if(kind==='SpeakerPulse')return box(BABYLON,scene,'hazard-party-speaker',[1.5,2,1.2],'#14131a');
 if(kind==='ConveyorPuncher')return box(BABYLON,scene,'hazard-boxing-machine',[1.2,1.2,1.2],secondary);
 if(kind==='CircusBounce')return cylinder(BABYLON,scene,'hazard-bounce-pad',4.2,.3,'#292832');
 return null;
}

function fighterView(fighter){const p=fighter.body.translation(),v=fighter.body.linvel();return{slot:fighter.slot,alive:fighter.alive,x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z};}
function nonZero(v){return Boolean(v&&(Math.abs(v.x||0)>1e-9||Math.abs(v.y||0)>1e-9||Math.abs(v.z||0)>1e-9));}
function addVelocity(fighter,delta){const v=fighter.body.linvel();fighter.body.setLinvel({x:v.x+(delta.x||0),y:v.y+(delta.y||0),z:v.z+(delta.z||0)},true);}

export function hazardAuthority(active){return Boolean(active?.hazardEnabled&&(!active.online||active.isHost));}

export function applyHazardEffects(active,effects=[]){
 for(const effect of effects){const fighter=active.fighters.find(f=>f.slot===effect.slot);if(!fighter?.alive)continue;fighter.applyDamage(effect.damage||0,effect.impulse||null);}
}

export function setupArenaHazard(active,{BABYLON}){
 const kind=hazardKind(active.arenaDef.id),rule=hazardRule(active.arenaDef.id);
 active.hazardEnabled=active.arenaHazards!==false;
 active.hazardState={kind,rule,clock:0,nextPulse:0,nextContact:0,ropeCooldown:{},ropeTouch:{}};
 active.hazardProp=makeProp(active,BABYLON);syncHazardVisual(active);
 return active.hazardState;
}

export function syncHazardVisual(active){
 if(!active?.hazardState||!active.hazardEnabled||!active.hazardProp)return;
 const p=hazardPose(active.arenaDef.id,active.hazardState.clock);active.hazardProp.position.set(p.x,p.y,p.z);
 if(active.hazardState.kind==='RollingFruit')active.hazardProp.rotation.z+=.045;
 if(active.hazardState.kind==='ConveyorPuncher')active.hazardProp.rotation.y+=.03;
}

function tickContacts(active,views){
 const state=active.hazardState,rule=state.rule;if(!rule?.shape||state.clock<state.nextContact)return;
 const centre=hazardPose(active.arenaDef.id,state.clock);
 const effects=rule.shape==='sphere'?sphereContactEffects(views,centre,rule.radius,rule.damage,rule.knockback):boxContactEffects(views,centre,rule.half,rule.damage,rule.knockback);
 if(effects.length){applyHazardEffects(active,effects);state.nextContact=state.clock+rule.cooldown;}
}

function tickPulse(active,views){
 const state=active.hazardState,seconds=pulseSchedule(active.arenaDef.id);if(!seconds||state.clock<state.nextPulse)return;
 const rule=state.rule,kind=state.kind;state.nextPulse=state.clock+seconds;
 if(kind==='GongPulse'||kind==='SpeakerPulse')applyHazardEffects(active,radialPulseEffects(views,{x:rule.centre[0],y:rule.centre[1],z:rule.centre[2]},rule.radius,rule.damage,rule.knockback));
 else for(const view of views){const delta=environmentVelocityDelta(active.arenaDef.id,state.clock,view);if(nonZero(delta)){const fighter=active.fighters.find(f=>f.slot===view.slot);if(fighter?.alive)addVelocity(fighter,delta);}}
}

function tickContinuousEnvironment(active,views){
 if(active.hazardState.kind!=='ConveyorPuncher')return;
 for(const view of views){const delta=environmentVelocityDelta(active.arenaDef.id,active.hazardState.clock,view);if(nonZero(delta)){const fighter=active.fighters.find(f=>f.slot===view.slot);if(fighter?.alive)addVelocity(fighter,delta);}}
}

function tickWrestlingRopes(active,views){
 if(active.hazardState.kind!=='WrestlingRopes')return;
 const state=active.hazardState,ropeCooldown=state.ropeCooldown;
 for(const view of views){
  const impulse=wrestlingRopeImpulse(view),touching=Boolean(impulse),wasTouching=Boolean(state.ropeTouch[view.slot]);
  if(touching&&!wasTouching&&state.clock>=(ropeCooldown[view.slot]||0)){
   const fighter=active.fighters.find(f=>f.slot===view.slot);if(fighter?.alive){fighter.body.applyImpulse(impulse,true);ropeCooldown[view.slot]=state.clock+state.rule.cooldown;}
  }
  state.ropeTouch[view.slot]=touching;
 }
}

export function tickArenaHazard(active,dt){
 if(!active?.hazardState)return;active.hazardState.clock+=Math.max(0,dt||0);if(!hazardAuthority(active))return;
 const views=active.fighters.map(fighterView);tickContacts(active,views);tickPulse(active,views);tickContinuousEnvironment(active,views);tickWrestlingRopes(active,views);
}

export function captureHazardState(active){
 const state=active?.hazardState;if(!state)return null;
 return{kind:state.kind,clock:state.clock,nextPulse:state.nextPulse,nextContact:state.nextContact,ropeCooldown:{...state.ropeCooldown},ropeTouch:{...state.ropeTouch}};
}

export function hydrateHazardState(active,snapshot){
 const state=active?.hazardState;if(!state||!snapshot||snapshot.kind!==state.kind)return;
 state.clock=Math.max(state.clock,Number(snapshot.clock)||0);state.nextPulse=Math.max(0,Number(snapshot.nextPulse)||0);state.nextContact=Math.max(0,Number(snapshot.nextContact)||0);state.ropeCooldown={...(snapshot.ropeCooldown||{})};state.ropeTouch={...(snapshot.ropeTouch||{})};
}
