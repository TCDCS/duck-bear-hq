/** Foot-anchored swept collision. Independent of the canvas and camera. */
export const DT=1/60;
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function surfaceAt(surface,tick){
 if(surface.kind!=='moving')return surface;
 const phase=2*Math.PI*tick/(surface.periodTicks||240);
 // Start at the authored coordinates rather than jumping on the first tick.
 const wave=Math.sin(phase);
 return {...surface,x:surface.x+(surface.travelX||0)*wave,y:surface.y+(surface.travelY||0)*wave};
}
export function topAt(s,x){return s.kind==='ramp'?s.y+(s.endY-s.y)*clamp((x-s.x)/s.w,0,1):s.y;}
export function overlaps(a,b){return a.x-a.w/2<b.x+b.w/2&&a.x+a.w/2>b.x-b.w/2&&a.y>b.y-b.h&&a.y-a.h<b.y;}
export function resolveMotion(body,surfaces,tick){
 const p={...body};const current=surfaces.map(s=>surfaceAt(s,tick));
 if(p.grounded&&p.supportId){
  const raw=surfaces.find(s=>s.id===p.supportId);
  if(raw?.kind==='moving'){
   const a=surfaceAt(raw,tick-1),b=surfaceAt(raw,tick);p.x+=b.x-a.x;p.y+=b.y-a.y;
  }
 }
 const oldX=p.x,oldY=p.y,half=p.w/2,dx=p.vx*DT,stepUp=body.grounded?8:0;
 let nextX=oldX+dx;
 // A crossing test, not just final-frame overlap, catches very thin walls.
 for(const s of current){
  if(s.kind!=='solid'||oldY<=s.y+stepUp+.2||oldY-p.h>=s.y+s.h-.2)continue;
  if(dx>0&&oldX+half<=s.x+.1&&nextX+half>s.x){nextX=Math.min(nextX,s.x-half);p.vx=0;}
  if(dx<0&&oldX-half>=s.x+s.w-.1&&nextX-half<s.x+s.w){nextX=Math.max(nextX,s.x+s.w+half);p.vx=0;}
 }
 p.x=nextX;const dy=p.vy*DT;let nextY=oldY+dy;let floor=Infinity,support=null;
 for(const s of current){
  if(p.x+half<=s.x||p.x-half>=s.x+s.w)continue;
  const top=topAt(s,p.x);
  if(dy>=0){
   let canLand=oldY<=top+.6+stepUp;
   if(s.kind==='ramp'&&body.grounded){const slope=Math.abs((s.endY-s.y)/s.w);canLand=oldY<=top+Math.abs(dx)*slope+3;}
   if(s.kind==='moving'){
    const raw=surfaces.find(raw=>raw.id===s.id),before=surfaceAt(raw,tick-1);
    canLand=oldY<=before.y+Math.abs(s.y-before.y)+1;
   }
   if(canLand&&nextY>=top-.1&&top<floor){floor=top;support=s.id;}
  }else if(s.kind==='solid'){
   const bottom=s.y+s.h;
   if(oldY-p.h>=bottom-.1&&nextY-p.h<bottom){nextY=Math.max(nextY,bottom+p.h);p.vy=0;}
  }
 }
 p.grounded=support!==null;p.supportId=support;
 if(support!==null){p.y=floor;p.vy=0;}else p.y=nextY;
 return p;
}
