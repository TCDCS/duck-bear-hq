/** Six original boss patterns. All expose a low, reachable target. */
import {clamp} from './collision.mjs';
const IDS=new Set(['squawks','brolly','peacock','clatter','gust','pulp']);
export function createBoss(def){
 if(!IDS.has(def.id))throw new TypeError('Unknown boss.');
 return {id:def.id,home:{...def.spawn},arena:{...def.arena},x:def.spawn.x,y:def.spawn.y,w:102,h:68,maxHp:def.id==='pulp'?4:3,hp:def.id==='pulp'?4:3,phase:'warn',age:0,cycle:0,invulnerableTicks:0,targetX:def.spawn.x-230,lastAttackId:null,dead:false,wind:0,telegraph:null,hitFlash:0};
}
export function stepBoss(b,player,{extraHelp=false}={}){
 if(b.dead)return [];
 const effects=[];if(b.invulnerableTicks>0)b.invulnerableTicks--;if(b.hitFlash>0)b.hitFlash--;
 const slow=extraHelp?1.35:1,warn=Math.round(72*slow),attack=Math.round(144*slow),weak=Math.round(240*slow);
 b.age++;b.wind=0;
 if(b.age===1){b.targetX=clamp(player.x,b.arena.x+100,b.arena.x+b.arena.w-100);b.telegraph={x:b.targetX,y:b.home.y,kind:b.id};}
 if(b.phase==='warn'){
  b.x=b.home.x;b.y=b.home.y;b.telegraph={x:b.targetX,y:b.home.y,kind:b.id};
  if(b.age>=warn){b.phase='attack';b.age=0;}
 }else if(b.phase==='attack'){
  const t=b.age/attack,sign=b.cycle%2===0?-1:1;
  if(b.id==='squawks'){
   b.x=b.home.x+(b.targetX-b.home.x)*Math.sin(Math.PI*t);b.y=b.home.y-60*Math.sin(Math.PI*t);
   if(b.age===1)effects.push({kind:'swoop',x:b.targetX,y:b.home.y});
  }else if(b.id==='brolly'){
   b.x=b.home.x-260*Math.sin(Math.PI*t);b.y=b.home.y-14-Math.sin(Math.PI*t)*20;
   b.wind=sign*(extraHelp?26:42);if(b.age===1)effects.push({kind:'umbrella-sweep'});
  }else if(b.id==='peacock'){
   if(b.age===1||b.age===Math.round(60*slow))for(const vy of [-140,-65,20])effects.push({kind:'feather',x:b.x-58,y:b.home.y-82,vx:-145/(extraHelp?1.35:1),vy});
  }else if(b.id==='clatter'){
   if(b.age===1||b.age===Math.round(65*slow))effects.push({kind:'pot',x:b.age===1?b.targetX:clamp(player.x,b.arena.x+70,b.arena.x+b.arena.w-70),y:b.home.y-340,vx:0,vy:120});
  }else if(b.id==='gust'){
   b.wind=sign*(extraHelp?65:110);if(b.age===1)effects.push({kind:'wind',direction:sign});
   if(b.age===Math.round(44*slow))effects.push({kind:'gust-puff',x:b.x-70,y:b.home.y-42,vx:-155/(extraHelp?1.4:1),vy:0});
  }else if(b.id==='pulp'){
   b.wind=sign*(extraHelp?25:42);
   if(b.age===1)effects.push({kind:'conveyor',direction:sign});
   if(b.age===1||b.age===Math.round(64*slow))effects.push({kind:'pulp',x:b.x-65,y:b.home.y-65,vx:-185/(extraHelp?1.3:1),vy:-190});
  }
  if(b.age>=attack){b.phase='vulnerable';b.age=0;b.x=b.home.x;b.y=b.home.y;b.telegraph=null;}
 }else if(b.phase==='vulnerable'){
  b.x=b.home.x;b.y=b.home.y;b.telegraph=null;
  if(b.age>=weak){b.phase='warn';b.age=0;b.cycle++;}
 }else if(b.phase==='hurt'){
  b.x=b.home.x;b.y=b.home.y;b.telegraph=null;
  if(b.age>=54){b.phase='warn';b.age=0;b.cycle++;}
 }
 return effects;
}
export function hitBoss(b,attackId){
 if(b.dead||b.phase!=='vulnerable'||b.invulnerableTicks>0||b.lastAttackId===attackId)return false;
 b.lastAttackId=attackId;b.hp--;b.hitFlash=30;b.invulnerableTicks=65;b.age=0;b.telegraph=null;
 if(b.hp<=0){b.hp=0;b.dead=true;b.phase='defeated';}else b.phase='hurt';
 return true;
}
