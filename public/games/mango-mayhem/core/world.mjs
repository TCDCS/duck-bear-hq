/** Fixed 60 Hz platform simulation. Never reads browser state or the network. */
import {DT,clamp,resolveMotion,overlaps,surfaceAt} from './collision.mjs';
import {createBoss,stepBoss,hitBoss} from './bosses.mjs';
export const PHYSICS=Object.freeze({width:30,height:70,maxSpeed:410,acceleration:2500,braking:3000,jumpSpeed:650,gravity:1700,holdGravity:1400,coyoteTicks:7,bufferTicks:8});
const emptyInput={axis:0,jumpPressed:false,jumpHeld:false,spinPressed:false};
const approach=(v,target,step)=>v<target?Math.min(target,v+step):Math.max(target,v-step);
export function createWorld(level,{extraHelp=false,checkpointIndex=0,mangoIds=[]}={}){
 const index=clamp(Math.floor(checkpointIndex)||0,0,3),point=level.checkpoints.find(c=>c.index===index)||level.spawn;
 return {level,phase:'playing',tick:0,extraHelp:!!extraHelp,checkpointIndex:index,helperActivated:index>0,events:[],eventSerial:0,respawns:0,
  player:{x:point.x,y:point.y,w:PHYSICS.width,h:PHYSICS.height,vx:0,vy:0,grounded:false,supportId:null,facing:1,hearts:5,invulnerableTicks:0,spinTicks:0,spinCooldownTicks:0,attackId:0,jumpBuffer:0,coyote:0,shield:false,magnetTicks:0,superTicks:0,runDistance:0,landTicks:0,anim:'idle'},
  collectedIds:new Set(mangoIds),previouslyCollected:new Set(mangoIds),defeatedEnemyIds:new Set(),usedPowerUps:new Set(),enemies:level.enemies.map((e,i)=>({...e,originX:e.x,originY:e.y,dead:false,seed:i*37})),powerUps:level.powerUps.map(p=>({...p})),projectiles:[],boss:createBoss(level.boss),springCooldown:0};
}
function emit(w,type,props={}){const event={id:++w.eventSerial,type,levelId:w.level.id,...props};w.events.push(event);return event;}
export function activeSurfaces(w){return w.level.surfaces.filter(s=>(!s.requiresHelper||w.helperActivated)&&(!s.extraHelpOnly||w.extraHelp)).map(s=>s.stopsWithHelper&&w.helperActivated?{...s,kind:'one-way'}:s);}
export function respawnPlayer(w,{full=false}={}){
 const p=w.player,point=w.level.checkpoints.find(c=>c.index===w.checkpointIndex)||w.level.spawn;
 Object.assign(p,{x:point.x,y:point.y,vx:0,vy:0,grounded:false,supportId:null,invulnerableTicks:90,spinTicks:0,spinCooldownTicks:0,jumpBuffer:0,coyote:0,magnetTicks:0,superTicks:0,shield:false,landTicks:0});
 if(full||p.hearts<=0)p.hearts=5;
 if(w.phase==='boss'){w.boss=createBoss(w.level.boss);w.projectiles=[];w.phase='playing';}
 w.respawns++;emit(w,'respawn',{x:p.x,y:p.y,full});
}
export function damagePlayer(w,source='enemy'){
 const p=w.player,fall=source==='fall';
 if(!fall&&(p.invulnerableTicks>0||p.superTicks>0))return false;
 if(!fall&&p.shield){p.shield=false;p.invulnerableTicks=45;emit(w,'shield-break',{x:p.x,y:p.y-35});return false;}
 p.hearts--;p.invulnerableTicks=w.extraHelp?150:90;p.vx=-p.facing*160;p.vy=-230;p.grounded=false;
 emit(w,'hit',{source,x:p.x,y:p.y});
 if(fall||p.hearts<=0)respawnPlayer(w,{full:p.hearts<=0});
 return true;
}
function updateEnemies(w,oldY){
 const p=w.player;
 for(const e of w.enemies){
  if(e.dead)continue;
  const a=e.patrolStart??e.originX-50,b=e.patrolEnd??e.originX+50;
  const cycle=(w.tick+e.seed)/(e.kind==='flyer'?100:85);
  e.x=(a+b)/2+Math.sin(cycle)*(b-a)/2;e.y=e.originY;
  if(e.kind==='hopper')e.y-=Math.max(0,Math.sin((w.tick+e.seed)/26))*48;
  if(e.kind==='flyer')e.y+=Math.sin((w.tick+e.seed)/30)*28;
  if(Math.abs(e.x-p.x)>100)continue;
  const spin=p.spinTicks>0&&Math.hypot(e.x-p.x,(e.y-e.h/2)-(p.y-p.h/2))<75;
  const contact=overlaps(p,e);
  const stomp=contact&&p.vy>=0&&oldY<=e.y-e.h+12;
  if(spin||stomp||(contact&&p.superTicks>0)){
   e.dead=true;w.defeatedEnemyIds.add(e.id);emit(w,'enemy-defeat',{x:e.x,y:e.y,targetId:e.id});
   if(stomp){p.y=Math.min(p.y,e.y-e.h);p.vy=-440;p.grounded=false;}
  }else if(contact)damagePlayer(w,'enemy');
 }
}
function updateBoss(w,oldY){
 const p=w.player,b=w.boss;
 if(w.phase==='playing'&&p.x>w.level.boss.arena.x+45){w.phase='boss';p.hearts=5;emit(w,'boss-start',{bossId:b.id});}
 if(w.phase!=='boss')return;
 const effects=stepBoss(b,p,{extraHelp:w.extraHelp});
 for(const e of effects){
  emit(w,'boss-attack',{kind:e.kind,x:e.x,y:e.y});
  if(['feather','pot','gust-puff','pulp'].includes(e.kind))w.projectiles.push({...e,id:++w.eventSerial,life:420,w:e.kind==='pot'?34:26,h:e.kind==='pot'?38:24});
 }
 if(b.wind&&p.grounded)p.x+=b.wind*DT;
 p.x=clamp(p.x,b.arena.x+22,b.arena.x+b.arena.w-22);
 for(const q of w.projectiles){
  q.x+=q.vx*DT;q.y+=q.vy*DT;q.life--;
  if(q.kind==='pot')q.vy+=700*DT;
  if(q.kind==='pulp'){q.vy+=440*DT;if(q.y>=b.home.y){q.y=b.home.y;q.vy=-Math.abs(q.vy)*.58;}}
  if(overlaps(p,q)){damagePlayer(w,'projectile');q.life=0;}
  if(q.y>b.home.y+65||q.x<b.arena.x-70)q.life=0;
 }
 w.projectiles=w.projectiles.filter(q=>q.life>0);
 const contact=overlaps(p,b),spin=p.spinTicks>0&&Math.hypot(p.x-b.x,(p.y-p.h/2)-(b.y-b.h/2))<90;
 const stomp=contact&&p.vy>=0&&oldY<=b.y-b.h+14;
 if((spin||stomp)&&hitBoss(b,spin?'spin-'+p.attackId:'stomp-'+w.tick)){
  p.vy=-450;p.grounded=false;p.y=Math.min(p.y,b.y-b.h);p.invulnerableTicks=Math.max(p.invulnerableTicks,40);
  w.projectiles=[];emit(w,'boss-hit',{x:b.x,y:b.y,hp:b.hp});
  if(b.dead){w.phase='complete';p.vx=0;p.vy=0;p.anim='celebrate';emit(w,'level-clear',{x:b.x,y:b.y});}
 }else if(contact&&b.phase!=='hurt')damagePlayer(w,'boss');
}
export function stepWorld(w,rawInput=emptyInput){
 w.events=[];if(w.phase==='complete')return w.events;
 const input={...emptyInput,...rawInput},p=w.player;w.tick++;
 for(const key of ['invulnerableTicks','spinTicks','spinCooldownTicks','magnetTicks','superTicks','landTicks'])if(p[key]>0)p[key]--;
 if(w.springCooldown>0)w.springCooldown--;
 if(p.grounded)p.coyote=PHYSICS.coyoteTicks;else if(p.coyote>0)p.coyote--;
 if(input.jumpPressed)p.jumpBuffer=PHYSICS.bufferTicks;else if(p.jumpBuffer>0)p.jumpBuffer--;
 const axis=Number.isFinite(input.axis)?clamp(input.axis,-1,1):0;
 if(Math.abs(axis)>.08){p.facing=axis<0?-1:1;p.vx=approach(p.vx,axis*PHYSICS.maxSpeed,PHYSICS.acceleration*DT);}
 else p.vx=approach(p.vx,0,PHYSICS.braking*DT);
 if(p.jumpBuffer>0&&p.coyote>0){p.vy=-PHYSICS.jumpSpeed;p.grounded=false;p.coyote=0;p.jumpBuffer=0;p.supportId=null;emit(w,'jump',{x:p.x,y:p.y});}
 if(!input.jumpHeld&&p.vy<-210)p.vy*=.52;
 if(input.spinPressed&&p.spinCooldownTicks===0){p.spinTicks=22;p.spinCooldownTicks=48;p.attackId++;emit(w,'spin',{x:p.x,y:p.y-35});}
 p.vy=Math.min(1000,p.vy+(p.vy<0&&input.jumpHeld?PHYSICS.holdGravity:PHYSICS.gravity)*DT);
 const oldY=p.y,oldX=p.x,wasGrounded=p.grounded;
 Object.assign(p,resolveMotion(p,activeSurfaces(w),w.tick));p.x=clamp(p.x,18,w.level.width-18);p.runDistance+=Math.abs(p.x-oldX);
 if(!wasGrounded&&p.grounded)p.landTicks=8;
 if(p.y>w.level.height+90){damagePlayer(w,'fall');return w.events;}
 for(const s of w.level.springs||[]){
  if((!s.requiresHelper||w.helperActivated)&&!w.springCooldown&&p.vy>=0&&Math.abs(p.x-s.x)<27&&p.y>=s.y-5&&p.y<=s.y+8){p.vy=-820;p.grounded=false;w.springCooldown=25;emit(w,'spring',{x:s.x,y:s.y});}
 }
 const helper=w.level.helper;
 if(!w.helperActivated&&Math.abs(p.x-helper.x)<110&&Math.abs(p.y-helper.y)<110){w.helperActivated=true;emit(w,'helper',{helperId:helper.id,x:helper.x,y:helper.y});}
 for(const cp of w.level.checkpoints){
  const crossed=Math.min(oldX,p.x)<=cp.x&&Math.max(oldX,p.x)>=cp.x;
  const touched=Math.abs(p.x-cp.x)<38&&Math.abs(p.y-cp.y)<95;
  if(cp.index>w.checkpointIndex&&(crossed||touched)){w.checkpointIndex=cp.index;p.hearts=5;emit(w,'checkpoint',{checkpointIndex:cp.index,x:cp.x,y:cp.y});}
 }
 for(const m of w.level.mangoes){
  if(w.collectedIds.has(m.id))continue;
  const range=p.magnetTicks>0?160:38;
  if(Math.hypot(p.x-m.x,p.y-35-m.y)<range){w.collectedIds.add(m.id);emit(w,'pickup',{targetId:m.id,x:m.x,y:m.y});}
 }
 for(const item of w.powerUps){
  if(w.usedPowerUps.has(item.id)||Math.hypot(p.x-item.x,p.y-35-item.y)>38)continue;
  w.usedPowerUps.add(item.id);
  if(item.kind==='magnet')p.magnetTicks=600;
  if(item.kind==='shield')p.shield=true;
  if(item.kind==='super')p.superTicks=480;
  if(item.kind==='heart')p.hearts=Math.min(5,p.hearts+1);
  emit(w,'power-up',{kind:item.kind,x:item.x,y:item.y});
 }
 updateEnemies(w,oldY);
 for(const h of w.level.hazards){
  if(h.disabledByHelper&&w.helperActivated)continue;
  const hazard=h.kind==='moving'?{...h,x:h.x+Math.sin(w.tick/(h.periodTicks||120)*Math.PI*2)*(h.travelX||70)}:h;
  if(overlaps(p,{x:hazard.x+hazard.w/2,y:hazard.y+hazard.h,w:hazard.w,h:hazard.h}))damagePlayer(w,'hazard');
 }
 updateBoss(w,oldY);
 p.anim=w.phase==='complete'?'celebrate':p.invulnerableTicks>70?'hurt':p.spinTicks?'spin':!p.grounded?(p.vy<0?'jump-rise':'jump-fall'):p.landTicks?'landing':Math.abs(p.vx)>12?'run':'idle';
 return w.events;
}
