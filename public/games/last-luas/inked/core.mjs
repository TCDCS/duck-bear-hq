import {ROUTE_LENGTH} from '../data/route.mjs';
export {ROUTE_LENGTH};
export const VERSION='1.0.0';
export const LANES=[-2.4,0,2.4];
export const DURATION=90,DOORS_CLOSE=88.5;
const STEP=1/120;
const KINDS=['bollard','bin','tourist','cyclist','umbrella','delivery','roadworks','stopper'];
const bounds={bollard:[.44,.4,.62,true],bin:[.8,.75,1.22,false],tourist:[.68,.55,1.75,false],cyclist:[.8,1.35,1.72,false],umbrella:[1.2,.65,2.05,false],delivery:[.9,1.3,1.9,false],roadworks:[1.8,.5,1.13,false],stopper:[.65,.55,1.8,false]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function makeObstacles(seed=1){
 let z=seed>>>0;const rand=()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);
 const list=[];let i=0;
 for(let s=23;s<ROUTE_LENGTH-28;s+=10.7,i++){
  const kind=KINDS[i%KINDS.length],lane=Math.floor(rand()*3),[width,depth,height,jumpable]=bounds[kind];
  list.push({id:i+1,kind,s,lane,width,depth,height,jumpable,offset:rand()*6});
 }
 return list;
}
export function createRun(seed=1,obstacles=makeObstacles(seed)){
 return {seed,phase:'menu',resumePhase:'running',elapsed:0,phaseTime:0,speed:3.55,hits:0,warning:false,events:[],
  player:{x:0,s:0,y:0,vy:0,lane:1,stumble:0,immune:0},
  obstacles:obstacles.map(o=>({...o,hit:false})),reason:'',boardTime:null};
}
function emit(r,type,detail=''){r.events.push({type,detail});if(r.events.length>32)r.events.shift();}
export function action(r,name){
 if(name==='restart'){const n=createRun(r.seed,r.obstacles);Object.assign(r,n,{phase:'running'});return;}
 if(name==='menu'){r.phase='menu';r.events=[];return;}
 if(name==='play'&&r.phase==='menu'){Object.assign(r,createRun(r.seed,r.obstacles),{phase:'running'});emit(r,'start');return;}
 if(name==='pause'&&['running','boarding'].includes(r.phase)){r.resumePhase=r.phase;r.phase='paused';r.events=[];return;}
 if(name==='resume'&&r.phase==='paused'){r.phase=r.resumePhase;return;}
 if(r.phase!=='running')return;
 if(name==='left')r.player.lane=Math.max(0,r.player.lane-1);
 if(name==='right')r.player.lane=Math.min(2,r.player.lane+1);
 if(name==='jump'&&r.player.y===0){r.player.vy=5.1;emit(r,'jump');}
}
export function obstaclePosition(o,t){
 const x=LANES[o.lane],phase=t+(o.offset||0);
 if(o.kind==='tourist')return {x:x+Math.sin(phase*.72)*.23,s:o.s};
 if(o.kind==='cyclist'||o.kind==='delivery')return {x:x+Math.sin(phase*.6)*.35,s:o.s+Math.sin(phase*.35)*1.1};
 if(o.kind==='stopper'){const p=phase%8;return {x,s:o.s+(p<4?p*.4:1.6)};}
 return {x,s:o.s};
}
/** Parametric swept player/obstacle overlap, independent from draw projection. */
export function sweptOverlap(a,b,o0,o1,halfX,halfS){
 let lo=0,hi=1;
 for(const [v0,v1,h] of [[a.x-o0.x,b.x-o1.x,halfX],[a.s-o0.s,b.s-o1.s,halfS]]){
  const d=v1-v0;if(Math.abs(d)<1e-10){if(Math.abs(v0)>h)return null;continue;}
  let l=(-h-v0)/d,u=(h-v0)/d;if(l>u)[l,u]=[u,l];lo=Math.max(lo,l);hi=Math.min(hi,u);if(lo>hi)return null;
 }
 return [lo,hi];
}
function step(r,dt){
 const p=r.player,old={x:p.x,s:p.s,y:p.y},t0=r.elapsed;
 r.elapsed=Math.min(DURATION,r.elapsed+dt);
 p.x+=(LANES[p.lane]-p.x)*(1-Math.exp(-15*dt));
 if(p.y>0||p.vy>0){p.y+=p.vy*dt-5.5*dt*dt;p.vy-=11*dt;if(p.y<=0){p.y=0;p.vy=0;}}
 p.immune=Math.max(0,p.immune-dt);p.stumble=Math.max(0,p.stumble-dt);
 const speed=p.stumble>1.25?.65:p.stumble>0?1.4:r.speed;
 p.s=Math.min(ROUTE_LENGTH+3,p.s+speed*dt);
 if(!p.immune){for(const o of r.obstacles){
  if(o.hit||Math.abs(o.s-p.s)>8)continue;
  const overlap=sweptOverlap(old,p,obstaclePosition(o,t0),obstaclePosition(o,r.elapsed),o.width*.5+.27,o.depth*.5+.22);
  if(!overlap)continue;
  const feet=Math.min(old.y+(p.y-old.y)*overlap[0],old.y+(p.y-old.y)*overlap[1]);
  if(o.jumpable&&feet>o.height+.04)continue;
  o.hit=true;r.hits++;p.stumble=1.8;p.immune=.65;emit(r,'hit',o.kind);break;
 }}
 if(!r.warning&&r.elapsed>=80){r.warning=true;emit(r,'doors');}
 if(p.s>=ROUTE_LENGTH-.18&&p.x< -1.72&&p.y===0&&r.elapsed<DOORS_CLOSE){r.phase='boarding';r.phaseTime=0;r.boardTime=r.elapsed;emit(r,'board');return;}
 if(r.elapsed>=DURATION-1e-8){r.elapsed=DURATION;r.phase='missed';r.phaseTime=0;r.reason='The last Luas has gone.';emit(r,'miss');}
}
/** Active time is integrated, never discarded. OS/tab suspension explicitly pauses. */
export function advance(r,dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 if(['running','boarding'].includes(r.phase)&&dt>.75){action(r,'pause');r.reason='Paused while the browser was away.';return;}
 if(r.phase==='boarding'){r.phaseTime+=dt;if(r.phaseTime>=1.2){r.phase='won';r.phaseTime=0;emit(r,'win');}return;}
 if(r.phase==='missed'||r.phase==='won'){r.phaseTime=Math.min(4,r.phaseTime+dt);return;}
 if(r.phase!=='running')return;
 let left=dt;while(left>1e-9&&r.phase==='running'){const d=Math.min(STEP,left,DURATION-r.elapsed);step(r,d);left-=d;}
}
export function timeText(s){s=Math.max(0,Math.ceil(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
export function departOffset(r){return r.phase==='missed'?Math.min(36,r.phaseTime*r.phaseTime*2.5):0;}
