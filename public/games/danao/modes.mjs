export const MODE_RULES=Object.freeze({
 OneVsOne:Object.freeze({elimination:true,objective:false,teams:false,ringOut:false,respawnSeconds:0}),
 TwoVsTwo:Object.freeze({elimination:true,objective:false,teams:true,ringOut:false,respawnSeconds:0}),
 FreeForAll:Object.freeze({elimination:true,objective:false,teams:false,ringOut:false,respawnSeconds:0}),
 RoyalRumble:Object.freeze({elimination:true,objective:false,teams:false,ringOut:true,respawnSeconds:0}),
 MangoGrab:Object.freeze({elimination:false,objective:true,teams:false,ringOut:false,respawnSeconds:2.2}),
 HotBomb:Object.freeze({elimination:false,objective:true,teams:false,ringOut:false,respawnSeconds:2.2}),
 KingOfTheRing:Object.freeze({elimination:false,objective:true,teams:false,ringOut:false,respawnSeconds:2.2}),
 Heist:Object.freeze({elimination:false,objective:true,teams:false,ringOut:false,respawnSeconds:2.2})
});

export const OBJECTIVE_RULES=Object.freeze({
 mangoTarget:10,
 kingTargetSeconds:30,
 kingRadius:3.1,
 heistTarget:3,
 hotBombTarget:3,
 hotBombSeconds:8,
 heistPickupRadius:1.2,
 heistHomeRadius:1.6
});

const distance=(a,b)=>Math.hypot((a?.x||0)-(b?.x||0),(a?.z||0)-(b?.z||0));
const blankScores=()=>[0,0,0,0];
const blankSeconds=()=>[0,0,0,0];

export function rulesFor(kind){return MODE_RULES[kind]||MODE_RULES.OneVsOne;}

export function createModeState(kind,slots=[],options={}){
 const state={kind,scores:blankScores(),seconds:blankSeconds(),finished:false,winnerSlot:-1,winnerTeam:-1,resultText:'',respawns:{}};
 if(kind==='HotBomb')Object.assign(state,{holder:slots[0]??-1,timer:OBJECTIVE_RULES.hotBombSeconds});
 if(kind==='Heist'){
  const loot={x:Number(options.loot?.x)||0,z:Number(options.loot?.z)||0};
  Object.assign(state,{carrier:-1,loot:{...loot},lootHome:{...loot},homes:{...(options.homes||{})}});
 }
 if(kind==='MangoGrab')state.tokens=[];
 return state;
}

function finish(state,slot,text){state.finished=true;state.winnerSlot=slot;state.winnerTeam=-1;state.resultText=text||'';return state;}

export function resolveElimination(kind,fighters=[]){
 const rules=rulesFor(kind),alive=fighters.filter(f=>f?.alive!==false);
 if(!rules.elimination)return{finished:false,winnerSlot:-1,winnerTeam:-1};
 if(rules.teams){
  const teams=[...new Set(alive.map(f=>Number.isInteger(f.team)?f.team:f.slot%2))];
  return teams.length<=1?{finished:true,winnerSlot:-1,winnerTeam:teams[0]??-1}:{finished:false,winnerSlot:-1,winnerTeam:-1};
 }
 return alive.length<=1?{finished:true,winnerSlot:alive[0]?.slot??-1,winnerTeam:-1}:{finished:false,winnerSlot:-1,winnerTeam:-1};
}

export function collectMango(state,slot){
 if(!state||state.finished||slot<0||slot>=state.scores.length)return state;
 state.scores[slot]++;
 if(state.scores[slot]>=OBJECTIVE_RULES.mangoTarget)finish(state,slot,'WINS THE MANGO GRAB!');
 return state;
}

export function tickKingOfRing(state,fighters=[],deltaTime=0,centre={x:0,z:0}){
 if(!state||state.finished||deltaTime<=0)return state;
 const occupants=fighters.filter(f=>f?.alive!==false&&distance(f,centre)<=OBJECTIVE_RULES.kingRadius);
 if(occupants.length!==1)return state;
 const slot=occupants[0].slot;if(slot<0||slot>=state.seconds.length)return state;
 state.seconds[slot]+=deltaTime;
 if(state.seconds[slot]>=OBJECTIVE_RULES.kingTargetSeconds)finish(state,slot,'IS KING OF THE RING!');
 return state;
}

export function passHotBomb(state,attackerSlot,targetSlot){
 if(!state||state.finished||attackerSlot!==state.holder||targetSlot<0||targetSlot>3)return state;
 state.holder=targetSlot;state.timer=Math.max(state.timer,2.5);return state;
}

function fighterForSlot(fighters,slot){return fighters.find(f=>f?.slot===slot)||null;}
function nextAliveSlot(fighters,fromSlot){
 for(let step=1;step<=4;step++){
  const slot=(fromSlot+step+4)%4,fighter=fighterForSlot(fighters,slot);
  if(fighter&&fighter.alive!==false)return slot;
 }
 return-1;
}

export function tickHotBomb(state,fighters=[],deltaTime=0){
 if(!state||state.finished||!fighters.length)return state;
 let holder=fighterForSlot(fighters,state.holder);
 if(!holder||holder.alive===false){state.holder=nextAliveSlot(fighters,state.holder);holder=fighterForSlot(fighters,state.holder);if(!holder)return state;}
 state.timer-=Math.max(0,deltaTime);
 if(state.timer>0)return state;
 const scorer=nextAliveSlot(fighters,state.holder);if(scorer<0)return state;
 state.scores[scorer]++;
 if(state.scores[scorer]>=OBJECTIVE_RULES.hotBombTarget)return finish(state,scorer,'WINS HOT BOMB!');
 state.holder=scorer;state.timer=OBJECTIVE_RULES.hotBombSeconds;return state;
}

export function tickHeist(state,fighters=[]){
 if(!state||state.finished||!state.loot)return state;
 if(state.carrier<0){
  for(const fighter of fighters){if(fighter?.alive===false)continue;if(distance(fighter,state.loot)<OBJECTIVE_RULES.heistPickupRadius){state.carrier=fighter.slot;break;}}
  return state;
 }
 const carrier=fighterForSlot(fighters,state.carrier);
 if(!carrier){state.carrier=-1;state.loot={...state.lootHome};return state;}
 if(carrier.alive===false){state.carrier=-1;return state;}
 state.loot={x:carrier.x||0,z:carrier.z||0};
 const home=state.homes?.[state.carrier];
 if(!home)return state;
 if(distance(carrier,home)<OBJECTIVE_RULES.heistHomeRadius){
  const slot=state.carrier;state.scores[slot]++;
  if(state.scores[slot]>=OBJECTIVE_RULES.heistTarget)return finish(state,slot,'WINS THE HEIST!');
  state.carrier=-1;state.loot={...state.lootHome};
 }
 return state;
}

export function objectiveHudText(state){
 if(!state)return'';
 if(state.kind==='MangoGrab')return`MANGO GRAB · FIRST TO ${OBJECTIVE_RULES.mangoTarget} · ${state.scores.map((score,i)=>`P${i+1} ${score}`).join(' · ')}`;
 if(state.kind==='HotBomb')return`HOT BOMB · P${state.holder+1} ${Math.max(0,state.timer).toFixed(1)}s · FIRST TO ${OBJECTIVE_RULES.hotBombTarget}`;
 if(state.kind==='KingOfTheRing')return`KING OF THE RING · HOLD THE CENTRE FOR ${OBJECTIVE_RULES.kingTargetSeconds}s · ${state.seconds.map((seconds,i)=>`P${i+1} ${seconds.toFixed(1)}s`).join(' · ')}`;
 if(state.kind==='Heist')return`HEIST · RETURN THE LOOT ${OBJECTIVE_RULES.heistTarget} TIMES · ${state.scores.map((score,i)=>`P${i+1} ${score}`).join(' · ')}`;
 return'';
}
