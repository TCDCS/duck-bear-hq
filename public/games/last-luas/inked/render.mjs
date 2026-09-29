import {FRONTAGES} from '../data/route.mjs';
import {ROUTE_LENGTH,obstaclePosition,departOffset,DOORS_CLOSE} from './core.mjs';
import {project,viewFor,facadeSlices} from './projection.mjs';
import {ArtAtlas,INK,oval,path,line,poly,rect} from './art.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class Renderer{
 constructor(canvas,brands,settings){this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});if(!this.c)throw Error('This browser cannot open the 2D canvas.');this.art=new ArtAtlas(brands);this.settings=settings;this.frames=[];this.resize();FRONTAGES.forEach(f=>this.art.frontage(f));this.staticItems=[];this.frontages=[...FRONTAGES];
  for(const side of [-1,1]){const list=FRONTAGES.filter(f=>f.side===side).sort((a,b)=>a.s-b.s);for(let i=1;i<list.length;i++){const a=list[i-1].s+list[i-1].w/2,b=list[i].s-list[i].w/2;if(b-a>1)this.frontages.push({id:`infill-${side}-${i}`,s:(a+b)/2,w:b-a,h:Math.min(list[i-1].h,list[i].h),side,style:i%2?'town':'stone',colour:i%2?'#b59280':'#c6bda9',floors:3,seed:30+i});}}
  this.frontages.forEach(f=>this.art.frontage(f));
  for(let s=8,i=0;s<ROUTE_LENGTH+38;s+=18,i++){for(const side of [-1,1]){this.staticItems.push({s:s+side*2,x:side*4.7,kind:'lamp',decor:true});if(i%2===0)this.staticItems.push({s:s+8,x:side*5.8,kind:'planter',decor:true});if(i%3===1)this.staticItems.push({s:s+9,x:side*5.5,kind:'tree',decor:true});if(i%2===1)this.staticItems.push({s:s+5,x:side*5.15,kind:i%3?'tourist':'stopper',ambient:true});}}
 }
 resize(){const box=this.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),cap=this.settings.quality==='low'?921600:2073600;let w=Math.max(240,box.width),h=Math.max(240,box.height),r=Math.min(ratio,Math.sqrt(cap/(w*h)));this.canvas.width=Math.round(w*r);this.canvas.height=Math.round(h*r);this.v=viewFor(w,h);this.ratio=r;}
 drawFacade(f,s){const c=this.c,cols=facadeSlices(f,s,this.v);if(!cols.length)return;const img=this.art.frontage(f);
  for(const p of cols)c.drawImage(img,p.u*img.width,0,p.uw*img.width,img.height,p.x,p.y,p.w+.15,p.h);
 }

 sprite(item,s,t){const c=this.c,v=this.v,d=item.s-s,p=project(item.x,item.y||0,d,v);if(!p||d>105||d<-2.8)return;
  const shadow=project(item.x,0,d,v);let img=this.art.sprite(item.kind,item.kind==='runner'?t*17:item.kind==='cyclist'||item.kind==='delivery'?t*7:0);
  const actorBase=v.vertical/150;let scale=actorBase*p.scale;
  // Fixed footprint anchors, shared with collision-height calibration.
  const isPerson=img.width===256,ax=isPerson?128:150,ay=isPerson?342:365;
  if(item.kind==='bollard')scale*=.94;if(item.kind==='tree')scale*=1.5;if(item.kind==='lamp')scale*=1.75;
  const w=img.width*scale;if(p.x+w<0||p.x-w>v.w)return;
  if(!item.decor){c.globalAlpha=.2;oval(c,shadow.x,shadow.y,Math.max(3,23*scale),Math.max(1,5*scale),'#344856');c.globalAlpha=1;}
  c.globalAlpha=(item.opacity??1)*(item.hit?.6:1);
  c.drawImage(img,p.x-ax*scale,p.y-ay*scale,img.width*scale,img.height*scale);c.globalAlpha=1;
 }
 drawStreet(s,t){const c=this.c,v=this.v;
  // Painted sky and distant city forms, not a panorama photographed from a map service.
  const sky=c.createLinearGradient(0,0,0,v.h*.65);sky.addColorStop(0,'#a3bed0');sky.addColorStop(.6,'#e9d4b6');sky.addColorStop(1,'#f5dfba');c.fillStyle=sky;c.fillRect(0,0,v.w,v.h);
  c.save();c.globalAlpha=.42;for(let i=0;i<6;i++){const x=(i*.22-.04)*v.w,y=v.h*(.075+(i%3)*.022);path(c,`M${x-40} ${y}q20-28 42-13q15-33 42-10q24-11 39 17q17 7 16 15Z`,'#f5e4c7',null);}c.restore();
  c.save();c.globalAlpha=.55;for(let i=0;i<20;i++){const x=v.w*(.26+i*.025),h=v.h*(.06+(i%4)*.012);rect(c,x,v.horizon-h,18,h+38,1,['#94a7b1','#b1b8b4','#819aa6'][i%3],null);}c.restore();
  poly(c,[[0,v.horizon+15],[v.w,v.horizon+15],[v.w,v.h],[0,v.h]],'#8e9b9e',null);
  const q=(x,z)=>project(x,0,z,v),near=-2.6,far=150;
  for(const side of [-1,1]){
   const a=q(side*3.65,near),b=q(side*3.65,far),d=q(side*6.8,near),e=q(side*6.8,far);
   poly(c,[[a.x,a.y],[b.x,b.y],[e.x,e.y],[d.x,d.y]],'#cecbb8',INK,2);
   for(let z=Math.floor((s-3)/2.5)*2.5;z<s+110;z+=2.5){const x=q(side*3.68,z-s),y=q(side*6.8,z-s);if(x&&y)line(c,[[x.x,x.y],[y.x,y.y]],'#8e9a9488',Math.max(.6,x.scale));}
   for(const xx of [4.35,5.15,6]){const a=q(xx*side,near),b=q(xx*side,far);line(c,[[a.x,a.y],[b.x,b.y]],'#a6aca080',1);}
   line(c,[[a.x,a.y],[b.x,b.y]],'#eee5cb',Math.max(2,v.h/220));
  }
  // Two mapped tram tracks, no fictitious painted lane markings.
  for(const x of [-2.05,-.62,.64,2.07]){const a=q(x,near),b=q(x,far);line(c,[[a.x,a.y],[b.x,b.y]],'#536575',5);line(c,[[a.x+2,a.y],[b.x,b.y]],'#d3d8c9',2);}
  // Stationary wet ink highlights anchored to street positions.
  for(let z=Math.floor(s/7)*7-4;z<s+95;z+=7){for(const x of [-3.15,3.1]){const p=q(x,z-s);if(!p)continue;const len=18*p.scale;oval(c,p.x,p.y,Math.max(1,len),Math.max(.5,3*p.scale),'#e5d3a566');line(c,[[p.x-len*.75,p.y],[p.x+len*.45,p.y+1]],'#ece4c980',Math.max(.5,p.scale));}}
  for(let z=Math.floor(s/19)*19;z<s+100;z+=19){const p=q(((z/19)%3-1)*1.5,z-s);if(!p)continue;path(c,`M${p.x-18*p.scale} ${p.y}q${22*p.scale} ${-5*p.scale} ${45*p.scale} 0q${-12*p.scale} ${5*p.scale} ${-40*p.scale} ${4*p.scale}`,null,'#b7c7c966',Math.max(.6,1.4*p.scale));}
 }
 drawPlatform(s){const c=this.c,v=this.v,start=ROUTE_LENGTH-34,end=ROUTE_LENGTH+21,near=Math.max(start-s,-2.3);if(end-s< -2.3||start-s>125)return;
  const pts=[project(-4.35,.19,near,v),project(-4.35,.19,end-s,v),project(-2.88,.19,end-s,v),project(-2.88,.19,near,v)];
  if(pts.every(Boolean)){poly(c,pts.map(p=>[p.x,p.y]),'#d9d2bc',INK,2);line(c,[[pts[2].x,pts[2].y],[pts[3].x,pts[3].y]],'#fff1cf',4);}
  const p=project(-4.5,0,ROUTE_LENGTH-10-s,v);if(!p)return;const k=v.vertical/150*p.scale;
  if(k>.04){c.save();c.translate(p.x,p.y);c.scale(k,k);poly(c,[[-95,-180],[25,-195],[50,-172],[-74,-155]],'#788d90',INK,3);poly(c,[[-78,-154],[37,-172],[36,-15],[-78,-2]],'#acc7c755',INK,2);for(const x of [-80,34])line(c,[[x,-10],[x,-166]],INK,4);rect(c,-92,-151,112,28,3,'#385c58',INK,2);c.fillStyle='#f6e7c8';c.textAlign='center';c.font='bold 14px Georgia';c.fillText('Dawson',-36,-132);rect(c,-72,-72,65,7,2,'#9a8c75',INK,2);line(c,[[-66,-65],[-66,-17],[-17,-65],[-17,-25]],INK,3);c.restore();}
 }
 drawTram(r,s){const v=this.v,c=this.c,p=project(.2,0,ROUTE_LENGTH+8+departOffset(r)-s,v);if(!p||p.scale<.01)return;
  const closing=r.elapsed>=DOORS_CLOSE?2:r.elapsed>=87.5?1:0,img=this.art.trams[closing],k=v.vertical/94*p.scale;
  c.drawImage(img,p.x-380*k,p.y-425*k,img.width*k,img.height*k);
 }
 paint(r){const begin=performance.now(),c=this.c,v=this.v,t=r.elapsed,s=r.player.s;
  c.setTransform(this.ratio,0,0,this.ratio,0,0);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  this.drawStreet(s,t);
  // Full textured facade depth ordering; each texture is an authored ink illustration.
  [...this.frontages].sort((a,b)=>b.s-a.s).forEach(f=>this.drawFacade(f,s));
  this.drawPlatform(s);
  // Sparse overhead conductors, tied to street positions instead of a screen overlay.
  for(let z=Math.floor(s/28)*28+18;z<s+115;z+=28){const a=project(-6.4,6,z-s,v),b=project(6.4,6,z-s,v);if(a&&b){path(c,`M${a.x} ${a.y}Q${v.cx} ${a.y+7*a.scale} ${b.x} ${b.y}`,null,'#57626b88',Math.max(.4,a.scale));}}
  const items=[...this.staticItems.map(o=>({...o})),...r.obstacles.map(o=>({...o,...obstaclePosition(o,t)}))];
  items.push({s:ROUTE_LENGTH+8+departOffset(r),tram:true});items.push({s:r.player.s,x:r.player.x,y:r.player.y,kind:'runner',player:true});items.sort((a,b)=>b.s-a.s);
  for(const o of items){if(o.tram){this.drawTram(r,s);continue;}if(o.player&&r.phase==='boarding'){this.sprite({...o,s:o.s+r.phaseTime*5.5,x:-2.4+clamp(r.phaseTime/1.2,0,1)*.7,y:.19,opacity:1-clamp(r.phaseTime/1.2,0,1)},s,t);}else if(o.player&&r.phase==='won'){}else this.sprite(o,s,t);}
  if(this.settings.rain&&!this.settings.reducedMotion){c.save();c.globalAlpha=.12;for(let i=0;i<24;i++){const x=(i*103.31+t*32)%v.w,y=(i*73.21+t*190)%v.h;line(c,[[x,y],[x-2,y+9]],'#e9f0e1',1);}c.restore();}
  this.frames.push(performance.now()-begin);if(this.frames.length>180)this.frames.shift();
 }
 clear(){this.c.setTransform(1,0,0,1,0,0);this.c.clearRect(0,0,this.canvas.width,this.canvas.height);this.art.dispose();}
}
