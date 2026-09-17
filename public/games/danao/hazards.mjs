export const HAZARD_BY_ARENA=Object.freeze({
 'dublin-docks':'CraneHook',
 'london-underground':'PassingTrain',
 'mango-market':'RollingFruit',
 'temple-courtyard':'GongPulse',
 'sichuan-tea-house':'SlidingScreens',
 'ice-festival':'IceSlip',
 'house-party':'SpeakerPulse',
 'toy-factory':'ConveyorPuncher',
 'cruise-ship':'ShipSway',
 'mad-circus':'CircusBounce',
 'wrestling-arena':'WrestlingRopes'
});

export const HAZARD_RULES=Object.freeze({
 CraneHook:Object.freeze({shape:'sphere',radius:1.1,damage:7,knockback:10,cooldown:.35}),
 PassingTrain:Object.freeze({shape:'box',half:[2.6,1.2,1.3],damage:13,knockback:14,cooldown:.4}),
 RollingFruit:Object.freeze({shape:'sphere',radius:1.25,damage:9,knockback:11,cooldown:.35}),
 GongPulse:Object.freeze({pulseSeconds:4.5,centre:[0,1,3.8],radius:7,damage:5,knockback:9}),
 SlidingScreens:Object.freeze({shape:'box',half:[.5,1.5,2.6],damage:8,knockback:10,cooldown:.4}),
 IceSlip:Object.freeze({pulseSeconds:.18,velocityScale:.025}),
 SpeakerPulse:Object.freeze({pulseSeconds:3.2,centre:[0,1,5],radius:8,damage:4,knockback:10.5}),
 ConveyorPuncher:Object.freeze({shape:'box',half:[.8,.8,.8],damage:10,knockback:12,cooldown:.4}),
 ShipSway:Object.freeze({pulseSeconds:.16,force:.42}),
 CircusBounce:Object.freeze({pulseSeconds:.12,radius:2.2,up:.75}),
 WrestlingRopes:Object.freeze({knockback:5.5,up:.16,cooldown:.16})
});

const repeat=(value,length)=>((value%length)+length)%length;
const pingPong=(value,length)=>{const cycle=repeat(value,length*2);return cycle<=length?cycle:length*2-cycle;};
const vector=(x=0,y=0,z=0)=>({x,y,z});
const magnitude=v=>Math.hypot(v.x||0,v.y||0,v.z||0);
const normalise=v=>{const m=magnitude(v)||1;return{x:(v.x||0)/m,y:(v.y||0)/m,z:(v.z||0)/m};};
const fighterPosition=f=>({x:Number(f?.x)||0,y:Number(f?.y)||0,z:Number(f?.z)||0});

export function hazardKind(arenaId){return HAZARD_BY_ARENA[arenaId]||null;}
export function hazardRule(arenaId){return HAZARD_RULES[hazardKind(arenaId)]||null;}

export function hazardPose(arenaId,time=0){
 const kind=hazardKind(arenaId),t=Number(time)||0;
 switch(kind){
  case'CraneHook':return vector(Math.sin(t*1.15)*6,2.2+Math.sin(t*2.3)*.35,0);
  case'PassingTrain':return vector(repeat(t*5+12,24)-12,1.2,0);
  case'RollingFruit':return vector(Math.sin(t*.8)*7,1.2,Math.cos(t*.55)*4.5);
  case'GongPulse':return vector(0,2.4,5);
  case'SlidingScreens':return vector(Math.sin(t*1.25)*6,1.5,0);
  case'SpeakerPulse':return vector(0,1,5);
  case'ConveyorPuncher':return vector(-6+pingPong(t*5.5,12),1.1,0);
  case'CircusBounce':return vector(0,.72,0);
  default:return vector(0,0,0);
 }
}

function unityRound(value){
 const floor=Math.floor(value),fraction=value-floor;
 if(Math.abs(fraction-.5)>1e-9)return Math.round(value);
 return floor%2===0?floor:floor+1;
}

export function radialPulseEffects(fighters=[],centre,radius,damage,knockback){
 const c=fighterPosition(centre),out=[];
 for(const fighter of fighters){
  if(!fighter||fighter.alive===false)continue;
  const p=fighterPosition(fighter),delta={x:p.x-c.x,y:p.y-c.y,z:p.z-c.z},distance=magnitude(delta);
  if(distance>radius)continue;
  const falloff=1-distance/radius,dir=normalise(delta),biased=normalise({x:dir.x,y:dir.y+.18,z:dir.z});
  out.push({slot:fighter.slot,damage:Math.max(1,unityRound(damage*falloff)),knockback:knockback*falloff,impulse:{x:biased.x*knockback*falloff,y:biased.y*knockback*falloff,z:biased.z*knockback*falloff}});
 }
 return out;
}

export function sphereContactEffects(fighters=[],centre,radius,damage,knockback){
 const c=fighterPosition(centre);
 for(const fighter of fighters){
  if(!fighter||fighter.alive===false)continue;
  const p=fighterPosition(fighter),delta={x:p.x-c.x,y:p.y-c.y,z:p.z-c.z};
  if(magnitude(delta)>radius)continue;
  const dir=normalise(delta),biased=normalise({x:dir.x,y:dir.y+.2,z:dir.z});
  return[{slot:fighter.slot,damage,knockback,impulse:{x:biased.x*knockback,y:biased.y*knockback,z:biased.z*knockback}}];
 }
 return[];
}

export function boxContactEffects(fighters=[],centre,half,damage,knockback){
 const c=fighterPosition(centre),h=half||[0,0,0];
 for(const fighter of fighters){
  if(!fighter||fighter.alive===false)continue;
  const p=fighterPosition(fighter);if(Math.abs(p.x-c.x)>h[0]||Math.abs(p.y-c.y)>h[1]||Math.abs(p.z-c.z)>h[2])continue;
  const dir=normalise({x:p.x-c.x,y:p.y-c.y,z:p.z-c.z}),biased=normalise({x:dir.x,y:dir.y+.15,z:dir.z});
  return[{slot:fighter.slot,damage,knockback,impulse:{x:biased.x*knockback,y:biased.y*knockback,z:biased.z*knockback}}];
 }
 return[];
}

export function environmentVelocityDelta(arenaId,time=0,fighter={}){
 const kind=hazardKind(arenaId),t=Number(time)||0,x=Number(fighter.x)||0,z=Number(fighter.z)||0,vx=Number(fighter.vx)||0,vz=Number(fighter.vz)||0;
 if(kind==='IceSlip')return vector(vx*.025,0,vz*.025);
 if(kind==='ConveyorPuncher'&&Math.abs(x)<5.2&&Math.abs(z)<1.5)return vector(.11,0,0);
 if(kind==='ShipSway')return vector(Math.sin(t*.9)*.42,0,0);
 if(kind==='CircusBounce'&&Math.hypot(x,z)<=2.2)return vector(0,.75,0);
 return vector(0,0,0);
}

export function wrestlingRopeImpulse(position={}){
 const x=Number(position.x)||0,z=Number(position.z)||0,rope=5.65,tolerance=.4;
 const dx=Math.abs(Math.abs(x)-rope),dz=Math.abs(Math.abs(z)-rope);
 let inward=null;
 if(dx<=tolerance&&Math.abs(z)<=rope+.4&&dx<=dz)inward={x:-Math.sign(x||1),y:.16,z:0};
 else if(dz<=tolerance&&Math.abs(x)<=rope+.4)inward={x:0,y:.16,z:-Math.sign(z||1)};
 if(!inward)return null;
 const dir=normalise(inward),force=HAZARD_RULES.WrestlingRopes.knockback;
 return{x:dir.x*force,y:dir.y*force,z:dir.z*force};
}

export function pulseSchedule(arenaId){
 const rule=hazardRule(arenaId);return Number(rule?.pulseSeconds)||0;
}
