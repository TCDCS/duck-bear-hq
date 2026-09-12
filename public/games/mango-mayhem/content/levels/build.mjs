/** Turn authored course tables into stable, testable level records. No random levels. */
import {LEVEL_META,MANGO_IDS} from '../catalog.mjs';
import {topAt} from '../../core/collision.mjs';
export function buildLevel(spec){
 const meta=LEVEL_META[spec.id],width=spec.width;
 const main=spec.roads.map((r,i)=>({id:`${spec.id}-road-${i}`,x:r[0],w:r[1]-r[0],y:r[2],h:1000-r[2],kind:r[3]!=null?'ramp':r[4]?'one-way':'solid',...(r[3]!=null?{endY:r[3]}:{}),...(r[4]?{requiresHelper:true,h:24}:{}),main:true}));
 function onRoad(x){
  let s=main.find(s=>x>=s.x+15&&x<=s.x+s.w-15);
  if(!s){s=main.reduce((a,b)=>Math.abs(a.x+a.w/2-x)<Math.abs(b.x+b.w/2-x)?a:b);x=Math.min(s.x+s.w-30,Math.max(s.x+30,x));}
  return {x,y:topAt(s,x),surface:s};
 }
 const surfaces=[...main],mangoes=[];
 for(let i=0;i<84;i++){const p=onRoad(250+i*(width-1550)/84);mangoes.push({id:MANGO_IDS[i],x:p.x,y:p.y-(i%9===5?90:46)});}
 const secretRoutes=spec.secrets.map((x,index)=>{
  const base=onRoad(x),platformIds=[];
  for(let j=0;j<3;j++){
   const s={id:`${spec.id}-secret-${index}-${j}`,x:base.x+j*178,y:base.y-[88,163,108][j],w:158,h:18,kind:j===1?'moving':'one-way',secret:true,travelX:j===1?20:0,travelY:j===1?-10:0,periodTicks:240};
   surfaces.push(s);platformIds.push(s.id);
   for(let m=0;m<6;m++)mangoes.push({id:MANGO_IDS[84+index*18+j*6+m],x:s.x+20+m*23,y:s.y-34});
  }
  return {id:`secret-${index+1}`,x:base.x,y:base.y,name:index===0?'The scenic route':'The mango hideout',platformIds};
 });
 // Optional moving shortcuts are authored per location, not required for basic jumps.
 for(const [i,p] of (spec.lifts||[]).entries())surfaces.push({id:`${spec.id}-lift-${i}`,x:p[0],y:p[1],w:p[2],h:18,kind:'moving',travelX:p[3],travelY:p[4],periodTicks:240,requiresHelper:i===0});
 for(let i=1;i<main.length;i++){
  const a=main[i-1],b=main[i],gap=b.x-a.x-a.w;
  if(gap>0)surfaces.push({id:`${spec.id}-catch-${i}`,x:a.x+a.w-12,y:Math.max(a.endY??a.y,b.y)+95,w:gap+24,h:18,kind:'one-way',extraHelpOnly:true});
 }
 const checkpointXs=[...spec.flags,width-1110];
 const checkpoints=checkpointXs.map((x,i)=>{const p=onRoad(x);return {id:`flag-${i+1}`,index:i+1,x:p.x,y:p.y};});
 const helperPoint=onRoad(spec.helperX);
 const helper={id:meta.helper.id,figureIds:meta.helper.figures,x:helperPoint.x,y:helperPoint.y,opensSurfaceIds:surfaces.filter(s=>s.requiresHelper).map(s=>s.id)};
 const enemies=spec.enemyXs.map((x,i)=>{
  const p=onRoad(x),kind=i%5===3?'flyer':i%3===1?'hopper':'roller';
  return {id:`enemy-${i+1}`,kind,x:p.x,y:p.y-(kind==='flyer'?100:0),w:36,h:32,patrolStart:Math.max(p.surface.x+35,p.x-45),patrolEnd:Math.min(p.surface.x+p.surface.w-35,p.x+45)};
 });
 const hazards=spec.spikes.map((x,i)=>{const p=onRoad(x);return {id:`hazard-${i+1}`,kind:'spikes',x:p.x,y:p.y-17,w:44,h:17};});
 if(spec.id==='liaoning')hazards.push({id:'conveyor',kind:'moving',x:helperPoint.x+130,y:helperPoint.y-23,w:50,h:23,travelX:35,periodTicks:110,disabledByHelper:true});
 const powerUps=[];
 const kinds=['magnet','shield','heart','super','heart','magnet','shield','heart','super','heart'];
 for(let i=0;i<kinds.length;i++){const p=onRoad(650+i*(width-2100)/10);powerUps.push({id:`power-${i+1}`,x:p.x,y:p.y-45,kind:kinds[i]});}
 const spring=onRoad(spec.springX??spec.helperX+250);
 return {id:spec.id,width,height:880,spawn:{x:130,y:main[0].y},surfaces,hazards,mangoes,enemies,powerUps,checkpoints,secretRoutes,helper,
  springs:[{id:'helper-spring',x:spring.x,y:spring.y,requiresHelper:true}],
  boss:{id:meta.boss.id,arena:{x:width-990,y:450,w:940,h:540},spawn:{x:width-325,y:450}},
  districts:spec.districts.map(([x,name])=>({x,name})),
  signs:[{x:360,y:main[0].y,text:'Hold a direction to run'},{x:820,y:main[0].y,text:'Hold jump for a bigger hop'},...secretRoutes.map(r=>({x:r.x-45,y:r.y,text:'Secret route ↑'})),{x:width-1170,y:450,text:'Boss ahead · Flag first!'}]
 };
}
