/* Wacky Races v3. Deterministic road-relative arcade physics; no network or rendering dependencies. */
(() => {
  'use strict';
  const TAU=Math.PI*2, clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), mod=(v,n)=>((v%n)+n)%n;
  const finite=(v,f=0)=>Number.isFinite(v)?v:f;
  const TRACKS=[
    {name:'London - Westminster Wobble',country:'GB',area:'WESTMINSTER · RIVERSIDE',tag:'The classic London lap',description:'Big clocks. Red buses. Absolutely no sense of occasion.',width:18,sky:'#53bef2',ground:'#67b945',accent:'#df523e',points:[[0,175],[-110,170],[-200,90],[-185,-70],[-90,-160],[70,-165],[200,-100],[225,65],[115,160]]},
    {name:'London - Camden Caper',country:'GB',area:'CAMDEN · MARKET QUARTER',tag:'A proper twisty one',description:'Market stalls, canal-side corners and questionable overtaking.',width:17,sky:'#53bef2',ground:'#67b945',accent:'#b365bb',points:[[10,150],[-160,145],[-210,30],[-165,-80],[-70,-80],[-30,-170],[120,-180],[190,-70],[115,20],[190,120]]},
    {name:'London - Docklands Dash',country:'GB',area:'DOCKLANDS · BRIDGE RUN',tag:'Room to put your foot down',description:'Towering skylines. Bridge-side battles. Tea at full throttle.',width:19,sky:'#53bef2',ground:'#67b945',accent:'#448fa6',points:[[0,190],[-210,160],[-240,-10],[-160,-170],[-20,-160],[65,-60],[170,-170],[250,-75],[235,110],[120,195]]},
    {name:'London - Hyde Park Hustle',country:'GB',area:'HYDE PARK · THE SERPENTINE',tag:'A breath of fresh exhaust',description:'Lakeside sweepers, tree-lined avenues and a very British picnic.',width:16,sky:'#53bef2',ground:'#67b945',accent:'#67944b',points:[[0,145],[-120,145],[-210,85],[-220,-30],[-145,-115],[-30,-145],[130,-110],[215,-25],[175,95],[85,125]]},
    {name:'London - Regent Street Rush',country:'GB',area:'WEST END · REGENT STREET',tag:'The big London street race',description:'Grand terraces, black cabs, shopfronts and double-decker trouble.',width:18,sky:'#53bef2',ground:'#67b945',accent:'#bc6350',points:[[0,185],[-140,185],[-185,120],[-185,-80],[-110,-175],[35,-190],[165,-115],[190,25],[145,160]]},
    {name:'Dublin - Liffey Lunacy',country:'IE',area:'DUBLIN · LIFFEY LOOP',tag:'Grand stretch in the lead',description:'The Spire, Georgian doors, harp bridges and a sheep with right of way.',width:19,sky:'#4ebdf1',ground:'#69b844',accent:'#ff9e38',points:[[0,180],[-140,175],[-220,95],[-230,-30],[-150,-140],[-10,-170],[135,-155],[225,-65],[215,85],[120,175]]}
  ];
  const DEFAULTS=[['Zachary','#b94535','bald-beard'],['Guannan','#367e56','long-hair'],['Sara','#8179b0','long-hair'],['Samy','#d5ae58','dark-beard'],['Mulan','#bd8060','dog'],['The Cabbie','#343e53','cap'],['Tea Bandit','#e4b43c','helmet'],['Queue Jumper','#d780a0','helmet']];
  const VEHICLES={
    kart:{name:'Racing kart',mass:180,top:36,accel:18,grip:6.2,width:1.7,length:2.8},
    police:{name:'Police / Garda',mass:350,top:37,accel:16.5,grip:5.7,width:1.85,length:3.4},
    ambulance:{name:'Ambulance',mass:560,top:32,accel:14,grip:5.1,width:1.95,length:3.7},
    bus:{name:'Double-decker',mass:820,top:30,accel:12.5,grip:4.5,width:2.05,length:4.0}
  };
  const SNACKS={mango:{name:'Mango',icon:'🥭',points:2},icecream:{name:'Chocolate ice cream',icon:'🍦',points:1},blueberry:{name:'Blueberries',icon:'🫐',points:3},strawberry:{name:'Strawberry',icon:'🍓',points:1}};
  const ITEMS={mango:{name:'Mango turbo',icon:'🥭',short:'Four seconds of extra speed.'},icecream:{name:'Chocolate shell',icon:'🍦',short:'A shield that absorbs one hit for eight seconds.'},pizza:{name:'Pizza skid',icon:'🍕',short:'Drop a slippery slice behind your vehicle.'},whiskey:{name:'Whiskey spill',icon:'🥃',short:'Drop a bottle and an amber skid patch. No drinking involved.'}};
  function cleanProfiles(input){
    return DEFAULTS.map(([name,color,avatar],i)=>{
      const p=Array.isArray(input)&&input[i]&&typeof input[i]==='object'?input[i]:{};
      // An explicit null means the player removed a photo. Never restore it silently.
      const source=Object.hasOwn(p,'photo')?p.photo:(globalThis.KartPortraits?.[i]||null);
      const photo=typeof source==='string'&&source.length<=150000&&(globalThis.KartPortraits?.includes(source)||/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(source))?source:null;
      return {name:typeof p.name==='string'&&p.name.trim()?p.name.replace(/[<>\x00-\x1f]/g,'').trim().slice(0,24):name,color:/^#[a-f\d]{6}$/i.test(p.color||'')?p.color:color,photo,avatar:['bald-beard','long-hair','dark-beard','dog','cap','helmet'].includes(p.avatar)?p.avatar:avatar};
    });
  }
  function rng(r){let x=r.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;r.seed=x>>>0;return r.seed/4294967296;}
  function curve(points,t){const n=points.length,k=Math.floor(t),f=t-k,a=points[mod(k-1,n)],b=points[k%n],c=points[(k+1)%n],d=points[(k+2)%n];return [0,1].map(i=>.5*((2*b[i])+(-a[i]+c[i])*f+(2*a[i]-5*b[i]+4*c[i]-d[i])*f*f+(-a[i]+3*b[i]-3*c[i]+d[i])*f*f*f));}
  function buildTrack(id=0){id=clamp(Math.floor(finite(id)),0,TRACKS.length-1);const def=TRACKS[id],raw=[];let length=0;for(let i=0;i<=def.points.length*80;i++){const p=curve(def.points,mod(i/(def.points.length*80)*def.points.length,def.points.length));if(i)length+=Math.hypot(p[0]-raw[i-1].x,p[1]-raw[i-1].z);raw.push({x:p[0],z:p[1],d:length});}const count=Math.ceil(length/3);const samples=[];let j=0;for(let i=0;i<count;i++){const d=i/count*length;while(j<raw.length-2&&raw[j+1].d<d)j++;const q=(d-raw[j].d)/(raw[j+1].d-raw[j].d||1);samples.push({x:raw[j].x+(raw[j+1].x-raw[j].x)*q,z:raw[j].z+(raw[j+1].z-raw[j].z)*q});}for(let i=0;i<count;i++){const a=samples[mod(i-1,count)],b=samples[(i+1)%count],p=samples[i],l=Math.hypot(b.x-a.x,b.z-a.z);p.tx=(b.x-a.x)/l;p.tz=(b.z-a.z)/l;}for(let i=0;i<count;i++){const a=samples[mod(i-1,count)],b=samples[(i+1)%count];let angle=Math.atan2(b.tx,b.tz)-Math.atan2(a.tx,a.tz);angle=mod(angle+Math.PI,TAU)-Math.PI;samples[i].bend=angle/(length/count*2);}return {...def,id,length,samples};}
  // Positive lateral x is screen-right: forward cross world-up = (-tz,0,tx).
  function sampleTrack(t,s,x=0){const k=mod(s,t.length)/t.length*t.samples.length,i=Math.floor(k),f=k-i,a=t.samples[i],b=t.samples[(i+1)%t.samples.length];let tx=a.tx+(b.tx-a.tx)*f,tz=a.tz+(b.tz-a.tz)*f;const l=Math.hypot(tx,tz)||1;tx/=l;tz/=l;return {x:a.x+(b.x-a.x)*f-tz*x,y:0,z:a.z+(b.z-a.z)*f+tx*x,tx,tz,bend:a.bend+(b.bend-a.bend)*f};}
  function newRace(options={}) {
    const mode=['race','cup','trial'].includes(options.mode)?options.mode:'race';
    const driver=clamp(Math.floor(finite(options.driver)),0,7),track=buildTrack(options.track);
    const r={track,mode,difficulty:['easy','normal','hard'].includes(options.difficulty)?options.difficulty:'normal',assist:options.assist!==false,seed:(options.seed||Date.now())>>>0||1,phase:'race',countdown:3,time:0,laps:3,racers:[],pickups:[],traps:[],traffic:[],projectiles:[],events:[],eventId:0,nextId:0};
    const ids=[driver,...DEFAULTS.map((_,i)=>i).filter(i=>i!==driver)];
    for(let i=0;i<(mode==='trial'?1:8);i++)r.racers.push({id:ids[i],ai:i>0,vehicle:i?['kart','police','kart','ambulance','kart','bus','kart'][i-1]:(VEHICLES[options.vehicle]?options.vehicle:'kart'),s:-8-Math.floor(i/2)*6,x:i%2?3:-3,speed:0,vx:0,heading:0,roll:0,rollV:0,pitch:0,pitchV:0,heave:0,heaveV:0,lane:(i%3-1)*3,skill:rng(r),item:null,boost:0,shield:0,spin:0,slip:0,immune:0,contact:0,driftCharge:0,drifting:false,coins:0,lapTimes:[],lapStart:0,finished:false,finishTime:null,steer:0,stuck:0,recoveries:0,completedLaps:0});
    if(mode!=='trial'){
      const snacks=Object.keys(SNACKS);let k=0;
      for(let s=65;s<track.length-35;s+=58){for(const x of [-5,0,5])r.pickups.push({id:r.nextId++,s,x,type:k%5===4?'box':snacks[(k+Math.round(x/5)+4)%4],cooldown:0});k++;}
      for(let s=205;s<track.length-50;s+=225)r.traps.push({id:r.nextId++,s,x:(k++%2?1:-1)*4,type:k%2?'pizza':'whiskey',owner:-1,life:1e9,permanent:true,cooldown:0});
      for(let i=0;i<6;i++)r.traffic.push({id:100+i,vehicle:['police','ambulance','bus'][i%3],s:135+i*track.length/6,x:-4.4,speed:9+i%3*2,contact:0});
    }
    return r;
  }
  const lapOf=(r,p)=>clamp(p.completedLaps+1,1,r.laps);
  const rank=r=>[...r.racers].sort((a,b)=>(a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.s-a.s)||a.id-b.id);
  const gap=(r,a,b)=>mod(a-b+r.track.length/2,r.track.length)-r.track.length/2;
  function event(r,text,kind='info'){r.events.push({id:++r.eventId,text,kind,t:r.time});if(r.events.length>24)r.events.shift();}
  function hit(r,p,type='pizza'){
    if(p.immune>0||p.finished)return false;
    if(p.shield>0){p.shield=0;p.immune=1;if(!p.ai)event(r,'Chocolate shell saved you.','shield');return false;}
    p.slip=type==='whiskey'?2.1:1.35;p.spin=.65;p.speed*=.62;p.vx+=(p.x>=0?1:-1)*4;p.immune=2.3;p.driftCharge=0;p.heaveV=.8;
    if(!p.ai)event(r,type==='whiskey'?'Whiskey spill! Mind the grip.':'Pizza under the tyres!','hit');return true;
  }
  function useItem(r,p){
    const item=p.item;if(!ITEMS[item]||p.finished)return false;p.item=null;
    if(item==='mango')p.boost=Math.max(p.boost,4);
    if(item==='icecream')p.shield=8;
    if(item==='pizza'||item==='whiskey')r.traps.push({id:r.nextId++,s:p.s-6,x:p.x,type:item,owner:p.id,life:22,cooldown:0});
    if(!p.ai)event(r,ITEMS[item].name+'!','item');return true;
  }
  function recover(r,p){
    // Recovery never advances s or rewinds a checkpoint: no shortcut or lap exploit.
    const lanes=[0,3,-3,5,-5];p.x=lanes.find(x=>![...r.racers,...r.traffic].some(q=>q!==p&&Math.abs(gap(r,q.s,p.s))<9&&Math.abs(q.x-x)<2.4))??0;
    p.vx=p.heading=p.roll=p.rollV=p.pitch=p.pitchV=p.heave=p.heaveV=0;
    p.speed=6;p.slip=p.spin=p.driftCharge=0;p.immune=2;p.contact=1.5;p.stuck=0;p.recoveries++;
    if(!p.ai)event(r,'Back on track. Facing forward.','recover');
  }
  function collect(r,p,o){
    if(o.type==='box'){
      if(p.item)return;p.item=Object.keys(ITEMS)[Math.floor(rng(r)*4)];o.cooldown=6;
      if(!p.ai)event(r,ITEMS[p.item].name+' collected.','pickup');
    }else{
      const snack=SNACKS[o.type];if(!snack)return;p.coins=Math.min(10,p.coins+snack.points);o.cooldown=8;
      if(o.type==='mango')p.boost=Math.max(p.boost,1.15);
      if(o.type==='icecream')p.shield=Math.max(p.shield,3);
      if(o.type==='strawberry'){p.slip=0;p.spin=0;}
      if(!p.ai)event(r,snack.name+' +'+snack.points,'coin');
    }
  }
  function collision(r,a,b){
    if(a.finished||b.finished||a.contact>0||b.contact>0||a.immune>0||b.immune>0)return;
    const va=VEHICLES[a.vehicle],vb=VEHICLES[b.vehicle],ds=gap(r,a.s,b.s),dx=a.x-b.x;
    const length=(va.length+vb.length)*.48,width=(va.width+vb.width)*.52;
    if(Math.abs(ds)>=length||Math.abs(dx)>=width)return;
    const lateral=Math.abs(dx)/width>Math.abs(ds)/length;
    const sign=(lateral?dx:ds)>=0?1:-1,ia=1/va.mass,ib=b.ai===undefined?0:1/vb.mass;
    const relative=lateral?(a.vx-(b.vx||0))*sign:(a.speed-b.speed)*sign;
    if(relative<0){const impulse=-(1+.22)*relative/(ia+ib);if(lateral){a.vx+=impulse*ia*sign;if(ib)b.vx-=impulse*ib*sign;}else{a.speed=Math.max(0,a.speed+impulse*ia*sign);if(ib)b.speed=Math.max(0,b.speed-impulse*ib*sign);}}
    if(lateral){const overlap=width-Math.abs(dx)+.03;a.x+=sign*overlap*ia/(ia+ib);if(ib)b.x-=sign*overlap*ib/(ia+ib);}else{a.vx+=(dx>=0?1:-1)*2.8;if(ib)b.vx-=(dx>=0?1:-1)*1.6;}
    a.contact=.32;if(ib)b.contact=.32;a.heaveV=.7;if(ib)b.heaveV=.5;
    if(!a.ai||b.ai===false)event(r,'Bumper to bumper!','collision');
  }
  function substep(r,input,dt){
    r.time+=dt;
    for(const o of r.pickups)o.cooldown=Math.max(0,o.cooldown-dt);
    for(const o of r.traps){o.life-=dt;o.cooldown=Math.max(0,(o.cooldown||0)-dt);}
    for(const t of r.traffic){t.s+=t.speed*dt;t.contact=Math.max(0,t.contact-dt);}
    for(const p of r.racers){
      if(p.finished)continue;const pt=sampleTrack(r.track,p.s),v=VEHICLES[p.vehicle];
      for(const key of ['boost','shield','spin','slip','immune','contact'])p[key]=Math.max(0,p[key]-dt);
      const control=r.multiplayer?(r.inputs?.[p.id]||{}):input;
      let gas=clamp(finite(control.gas),0,1),brake=clamp(finite(control.brake),0,1),steer=clamp(finite(control.steer),-1,1),drift=!!control.drift;
      if(p.ai){gas=1;brake=0;let target=p.lane+Math.sin(p.s*.01+p.id)*.8;
        const obstacle=[...r.traffic,...r.traps.filter(t=>t.cooldown<=0)].find(o=>gap(r,o.s,p.s)>0&&gap(r,o.s,p.s)<27&&Math.abs(o.x-target)<2.6);
        if(obstacle)target=obstacle.x<0?3.7:-3.7;
        steer=clamp((target-p.x)*.17-p.vx*.08,-.85,.85);drift=false;
        if(p.item&&rng(r)<dt*.22)useItem(r,p);
      }
      if(brake>.05)gas=0;
      if(p.spin>0){steer*=.25;drift=false;}
      p.steer=steer;p.drifting=drift&&p.speed>12&&Math.abs(steer)>.08&&p.slip===0;
      if(p.drifting)p.driftCharge=Math.min(2.6,p.driftCharge+dt);
      else if(!drift&&p.driftCharge>.65){p.boost=Math.max(p.boost,Math.min(2,p.driftCharge*.8));p.driftCharge=0;if(!p.ai)event(r,'Drift turbo!','boost');}
      else if(!drift)p.driftCharge=0;
      const outside=Math.abs(p.x)>r.track.width/2-v.width*.45;
      let top=v.top*(p.ai?{easy:.78,normal:.88,hard:.99}[r.difficulty]+p.skill*.015:1)+p.coins*.16;
      if(p.boost>0)top*=1.36;if(outside)top*=.62;
      const previousSpeed=p.speed;
      const drag=1.0+.0065*p.speed*p.speed+(outside?3:0);
      const force=gas*v.accel*(p.boost>0?1.5:1)-brake*36-drag;
      p.speed=clamp(p.speed+force*dt,0,52);
      if(p.speed>top)p.speed=Math.max(top,p.speed-(p.speed-top)*3.5*dt);
      let desired=steer*(.62-Math.min(p.speed,40)*.005)*(p.drifting?1.2:1);
      if((p.ai||r.assist)&&Math.abs(steer)<.08&&!drift)desired-=clamp(p.x*.035,-.28,.28);
      p.heading+=(desired-p.heading)*Math.min(1,dt*(p.slip>0?1.8:8));
      const grip=p.slip>0?.65:p.drifting?v.grip*.4:v.grip;
      const desiredV=p.speed*Math.sin(p.heading),centrifugal=pt.bend*p.speed*p.speed*.18;
      const oldV=p.vx;p.vx+=((desiredV-p.vx)*grip+centrifugal)*dt;
      p.x+=p.vx*dt;p.s+=Math.max(0,p.speed*Math.cos(p.heading))*dt;
      const edge=r.track.width/2+2.6;
      const wall=Math.abs(p.x)>=edge;
      if(wall){p.x=clamp(p.x,-edge,edge);if(p.vx*Math.sign(p.x)>0)p.vx*=-.18;p.speed=Math.max(0,p.speed-9*dt);p.heaveV+=.07;}
      // Damped suspension and chassis attitude, shared by every renderer.
      const lateralA=(p.vx-oldV)/dt,forwardA=(p.speed-previousSpeed)/dt;
      const rollTarget=clamp(-lateralA*.012,-.18,.18),pitchTarget=clamp(-forwardA*.007,-.10,.10);
      p.rollV+=((rollTarget-p.roll)*65-p.rollV*13)*dt;p.roll+=p.rollV*dt;
      p.pitchV+=((pitchTarget-p.pitch)*60-p.pitchV*12)*dt;p.pitch+=p.pitchV*dt;
      p.heaveV+=(-p.heave*90-p.heaveV*15)*dt;p.heave+=p.heaveV*dt;
      const distressed=wall||Math.abs(p.heading)>1.6||(p.speed<1&&gas>.4)||Math.abs(p.x)>r.track.width/2+2;
      p.stuck=gas>.2&&brake<.1&&distressed?p.stuck+dt:Math.max(0,p.stuck-dt*2);
      if(p.stuck>1.6)recover(r,p);
      const move=p.speed*dt;
      for(const o of r.pickups)if(o.cooldown<=0&&Math.abs(gap(r,p.s,o.s))<2.2+move&&Math.abs(p.x-o.x)<1.9)collect(r,p,o);
      for(const o of r.traps)if(o.cooldown<=0&&o.life>0&&!(o.owner===p.id&&gap(r,p.s,o.s)<12)&&Math.abs(gap(r,p.s,o.s))<2.3+move&&Math.abs(p.x-o.x)<2){hit(r,p,o.type);if(o.permanent)o.cooldown=5;else o.life=0;}
      const completed=Math.min(r.laps,Math.floor(Math.max(0,p.s)/r.track.length));
      if(completed>p.completedLaps){p.completedLaps=completed;p.lapTimes.push(r.time-p.lapStart);p.lapStart=r.time;if(!p.ai&&completed<r.laps)event(r,completed===2?'Final lap!':'Lap '+(completed+1)+'!','lap');}
      if(completed>=r.laps){p.finished=true;p.finishTime=r.time;p.s=r.laps*r.track.length;}
    }
    for(let i=0;i<r.racers.length;i++){const p=r.racers[i];for(let j=i+1;j<r.racers.length;j++)collision(r,p,r.racers[j]);for(const t of r.traffic)collision(r,p,t);}
    r.traps=r.traps.filter(o=>o.life>0);
    if(!r.multiplayer&&r.racers[0].finished){r.phase='results';r.order=rank(r).map(p=>p.id);}
  }
  function stepRace(r,input={},dt=1/60){
    if(r.phase!=='race')return;dt=clamp(finite(dt),0,.1);if(!dt)return;
    if(r.countdown>0){r.countdown=Math.max(0,r.countdown-dt);return;}
    if(r.multiplayer){for(const p of r.racers){if(p.ai)continue;const c=r.inputs?.[p.id]||{};if(c.reset&&!p.finished)recover(r,p);if(c.use)useItem(r,p);c.reset=c.use=false;}}
    else{if(input.reset)recover(r,r.racers[0]);if(input.use)useItem(r,r.racers[0]);}
    const steps=Math.ceil(dt*120-1e-8),h=dt/steps;
    for(let i=0;i<steps&&r.phase==='race';i++)substep(r,input,h);
  }
  function addCupPoints(scores,order){const points=[15,12,10,8,6,4,2,1];const seen=new Set();order.forEach((id,i)=>{if(Number.isInteger(id)&&id>=0&&id<8&&!seen.has(id)){scores[id]=(Number(scores[id])||0)+(points[i]||0);seen.add(id);}});return scores;}
  function cupOrder(scores){return DEFAULTS.map((_,i)=>i).sort((a,b)=>(scores[b]||0)-(scores[a]||0)||a-b);}
  function formatTime(n){if(!Number.isFinite(n))return '—';const ms=Math.max(0,Math.round(n*1000)),m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000);return `${m}:${String(s).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
  globalThis.KartCore={TRACKS,DEFAULTS,ITEMS,SNACKS,VEHICLES,recover,cleanProfiles,buildTrack,sampleTrack,newRace,stepRace,useItem,hit,lapOf,rank,addCupPoints,cupOrder,formatTime,clamp,mod};
})();

export default globalThis.KartCore;
