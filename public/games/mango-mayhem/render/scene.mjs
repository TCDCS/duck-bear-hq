import {INK,path,ellipse,rect,line,poly,star,mango,heart} from './primitives.mjs';
import {drawBackground,drawPlatform,drawDecoration} from './scenery.mjs';
import {drawCharacter} from './sprites.mjs';
import {drawEnemy,drawBoss,drawProjectile} from './foes.mjs';
import {activeSurfaces} from '../core/world.mjs';
import {surfaceAt,clamp} from '../core/collision.mjs';
import {LEVEL_META} from '../content/catalog.mjs';
export function drawPowerUp(c,item,tick){
 const x=item.x,y=item.y+Math.sin(tick/18+item.x)*3;
 c.save();c.translate(x,y);ellipse(c,0,0,22,22,'#fff4d599',INK,1.8);ellipse(c,-5,-8,8,4,'#ffffff77');
 if(item.kind==='heart')heart(c,0,0,12);
 if(item.kind==='magnet'){path(c,'M-10-8V5Q0 17 10 5V-8',null,'#db8194',7);line(c,[[-10,-8],[-10,-2]],'#9acdc9',7);line(c,[[10,-8],[10,-2]],'#9acdc9',7);}
 if(item.kind==='shield')path(c,'M0-15L13-9L10 7L0 15L-10 7L-13-9Z','#a6dad4',INK,1.5);
 if(item.kind==='super')star(c,0,0,15,'#ffe186',INK);
 c.restore();
}
function checkpoint(c,flag,active,tick){
 c.save();c.translate(flag.x,flag.y);ellipse(c,0,2,21,5,'#28324f24');line(c,[[0,0],[0,-92]],'#6d747e',5);ellipse(c,0,-94,5,5,'#f3d37f',INK,1.5);
 const wave=Math.sin(tick/13+flag.x)*3;
 path(c,`M3-88Q24 ${-97+wave} 49-84L49-54Q23 ${-67+wave} 3-58Z`,active?'#9ed991':'#ffe0a0',INK,2);
 mango(c,26,-73,10);
 if(active){line(c,[[-8,-17],[-1,-10],[13,-24]],'#59ad88',4);}
 c.restore();
}
function spring(c,s,ready,tick){
 c.save();c.translate(s.x,s.y);rect(c,-22,-6,44,9,4,'#798b9f',INK,1.8);
 const h=ready?18+Math.sin(tick/15)*2:8;
 line(c,[[-13,-7],[13,-10],[-13,-14],[13,-18],[-13,-h-4]],ready?'#ecae6b':'#a4a8b3',4);
 rect(c,-25,-h-10,50,9,4,ready?'#ea8a86':'#b0b1b8',INK,2);c.restore();
}
function sign(c,s){
 c.save();c.translate(s.x,s.y);line(c,[[0,0],[0,-43]],'#ae8d7f',5);c.font='700 10px "Trebuchet MS", sans-serif';
 const width=Math.max(78,c.measureText(s.text).width+20);rect(c,-width/2,-70,width,29,7,'#fff0cf',INK,1.6);c.fillStyle=INK;c.textAlign='center';c.fillText(s.text,0,-52);c.restore();
}
function flowers(c,x,y,theme){
 c.save();c.translate(x,y);line(c,[[-9,0],[-9,-13]],'#429b7c',1.5);line(c,[[8,0],[8,-19]],'#429b7c',1.5);
 for(const [dx,dy,col] of [[-9,-15,'#ec96ad'],[8,-21,theme==='sichuan'?'#facd78':'#f4d679']]){
  for(let j=0;j<5;j++)ellipse(c,dx+Math.cos(j*1.256)*4,dy+Math.sin(j*1.256)*4,3.5,3.5,col);
  ellipse(c,dx,dy,2.6,2.6,'#fff1b8');
 }c.restore();
}
export class SceneRenderer{
 constructor(canvas){
  this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.camera={x:0,y:0};this.particles=[];this.shake=0;this.world=null;this.costume='starter';this.accessory=null;this.frameTimes=[];
  this.resize();
 }
 resize(){const ratio=Math.min(2,Math.max(1,this.canvas.clientWidth/960)*(globalThis.devicePixelRatio||1));this.ratio=ratio;this.canvas.width=Math.round(960*ratio);this.canvas.height=Math.round(540*ratio);}
 reset(world){this.world=world;this.camera.x=clamp(world.player.x-300,0,world.level.width-960);this.camera.y=clamp(world.player.y-430,-90,220);this.particles=[];this.shake=0;}
 receive(events,{reducedMotion=false}={}){
  for(const e of events){
   if(e.type==='hit'&&!reducedMotion)this.shake=12;
   if(!['pickup','checkpoint','enemy-defeat','boss-hit','level-clear','power-up','spring'].includes(e.type))continue;
   const count=reducedMotion?2:e.type==='level-clear'?24:e.type==='checkpoint'?10:6;
   for(let i=0;i<count&&this.particles.length<(reducedMotion?35:180);i++){
    const a=i*2.4+e.id*.7;this.particles.push({x:e.x||0,y:(e.y||0)-15,vx:Math.cos(a)*2.6,vy:Math.sin(a)*2.6-1.4,life:35+(i%4)*5,maxLife:50,colour:['#f7ce79','#e8a5b9','#acd792','#a9d8d5'][i%4],star:i%2===0});
   }
  }
 }
 paint(world,{tick=0,menu=false,title=false,reducedMotion=false,costume='starter',accessory=null,paused=false}={}){
  const begin=performance.now(),c=this.c;c.setTransform(this.ratio,0,0,this.ratio,0,0);
  if(!world||menu){
   drawBackground(c,'dublin',950,0,reducedMotion?0:tick,{motion:!reducedMotion});
   // The same in-game character rig appears on the title screen.
   if(title){
    ellipse(c,746,456,116,19,'#40526c24');
    for(let i=0;i<5;i++){const a=i*1.18;const x=741+Math.cos(a)*136,y=247+Math.sin(a)*148;mango(c,x,y+(reducedMotion?0:Math.sin(tick/30+i)*5),24);star(c,x+25,y-22,5,'#fff8da',null);}
    drawCharacter(c,{x:755,y:460,scale:2.28,tick:reducedMotion?40:tick,anim:'idle',costume,accessory,shadow:false});
   }
   return;
  }
  if(this.world!==world)this.reset(world);
  if(!paused){
   const targetX=clamp(world.player.x-315+world.player.vx*.18,0,world.level.width-960);
   this.camera.x+=(targetX-this.camera.x)*.13;
   const onScreen=world.player.y-this.camera.y;
   let targetY=this.camera.y;if(onScreen<230)targetY=world.player.y-230;if(onScreen>447&&world.player.y<650)targetY=world.player.y-447;
   this.camera.y+=(clamp(targetY,-100,240)-this.camera.y)*.09;
  }
  const cx=this.camera.x,cy=this.camera.y;
  drawBackground(c,world.level.id,cx,cy,reducedMotion?0:tick,{motion:!reducedMotion});
  c.save();if(this.shake>0&&!reducedMotion&&!paused){c.translate(Math.sin(tick*2)*this.shake*.23,Math.cos(tick*1.5)*this.shake*.15);this.shake--;}
  const surfaces=activeSurfaces(world).map(s=>surfaceAt(s,world.tick));
  for(const s of surfaces)drawPlatform(c,s,world.level.id,cx,cy);
  c.save();c.translate(-cx,-cy);
  for(const s of world.level.surfaces){
   if(!s.main||s.x+s.w<cx||s.x>cx+980||s.kind==='ramp')continue;
   if(s.w>400){const x=s.x+Math.min(200,s.w/2);if(x>cx-30&&x<cx+1000){flowers(c,x,s.y-1,world.level.id);if(s.x%3===0)drawDecoration(c,world.level.id,x+90,s.y,world.tick);}}
  }
  for(const s of world.level.signs)if(s.x>cx-180&&s.x<cx+1100)sign(c,s);
  for(const s of world.level.springs)if(s.x>cx-50&&s.x<cx+1010)spring(c,s,!s.requiresHelper||world.helperActivated,world.tick);
  for(const h of world.level.hazards){
   if(h.disabledByHelper&&world.helperActivated)continue;if(h.x+h.w<cx-80||h.x>cx+1040)continue;
   const xx=h.x+(h.kind==='moving'?Math.sin(world.tick/(h.periodTicks||120)*Math.PI*2)*(h.travelX||70):0);
   rect(c,xx-3,h.y+h.h-5,h.w+6,8,3,'#9d8396',INK,1.5);
   for(let i=0;i<3;i++)poly(c,[[xx+i*15,h.y+h.h],[xx+i*15+7,h.y-2],[xx+i*15+15,h.y+h.h]],'#b5bfcc',INK,1.5);
  }
  for(const m of world.level.mangoes){
   if(m.x<cx-30||m.x>cx+990)continue;
   if(world.collectedIds.has(m.id)&&!world.previouslyCollected.has(m.id))continue;
   mango(c,m.x,m.y+(reducedMotion?0:Math.sin(tick/19+m.x*.02)*3),14,world.previouslyCollected.has(m.id));
  }
  for(const item of world.powerUps)if(!world.usedPowerUps.has(item.id)&&item.x>cx-35&&item.x<cx+995)drawPowerUp(c,item,reducedMotion?0:tick);
  for(const cp of world.level.checkpoints)if(cp.x>cx-30&&cp.x<cx+990)checkpoint(c,cp,world.checkpointIndex>=cp.index,reducedMotion?0:tick);
  const helper=world.level.helper;
  if(helper.x>cx-140&&helper.x<cx+1110){
   const figures=LEVEL_META[world.level.id].helper.figures;
   figures.forEach((id,i)=>drawCharacter(c,{id,x:helper.x+(i-(figures.length-1)/2)*60,y:helper.y,scale:.66,tick:reducedMotion?40:tick,anim:!world.helperActivated?'celebrate':'idle'}));
   c.font='700 12px "Trebuchet MS",sans-serif';c.textAlign='center';const name=LEVEL_META[world.level.id].helper.name;
   const tw=c.measureText(name).width+18;rect(c,helper.x-tw/2,helper.y-126,tw,23,8,'#fff1d4',INK,1.4);c.fillStyle=INK;c.fillText(name,helper.x,helper.y-110);
   if(!world.helperActivated)star(c,helper.x,helper.y-143,7,'#f8d774',INK);
  }
  for(const e of world.enemies)if(e.x>cx-80&&e.x<cx+1040)drawEnemy(c,e,reducedMotion?0:tick);
  if(world.boss.x>cx-260&&world.boss.x<cx+1220){
   if(world.boss.telegraph&&world.phase==='boss'){
    const a=world.boss.telegraph;
    ellipse(c,a.x,a.y-2,38,8,'#efad9777');line(c,[[a.x-16,a.y-8],[a.x+16,a.y+5]],'#da8895',2);line(c,[[a.x+16,a.y-8],[a.x-16,a.y+5]],'#da8895',2);
   }
   drawBoss(c,world.boss,reducedMotion?40:tick,{reducedMotion});
  }
  for(const q of world.projectiles)drawProjectile(c,q);
  const p=world.player;
  if(p.shield){ellipse(c,p.x,p.y-45,40,48,'#b3efec26','#c8f9ec',2.2);}
  if(p.superTicks>0){for(let i=0;i<5;i++){const a=tick/18+i*1.256;star(c,p.x+Math.cos(a)*43,p.y-42+Math.sin(a)*45,5,'#fff3ac',null);}}
  if(p.magnetTicks>0)ellipse(c,p.x,p.y-38,44+Math.sin(tick/12)*4,44,null,'#f6c38566',2);
  c.save();if(p.invulnerableTicks>0&&!reducedMotion&&Math.floor(tick/5)%2===0)c.globalAlpha=.5;
  drawCharacter(c,{x:p.x,y:p.y,scale:.61,facing:p.facing,anim:p.anim,tick:reducedMotion&&p.anim==='idle'?40:tick,distance:p.runDistance,costume,accessory});c.restore();
  if(p.spinTicks>0){c.save();c.globalAlpha=.65;for(let i=0;i<3;i++){const a=tick*.5+i*2.1;star(c,p.x+Math.cos(a)*47,p.y-38+Math.sin(a)*40,7,'#ffe39b',null);}c.restore();}
  for(const part of this.particles){
   if(!paused){part.x+=part.vx;part.y+=part.vy;part.vy+=.065;part.life--;}
   c.save();c.globalAlpha=Math.max(0,part.life/part.maxLife);if(part.star)star(c,part.x,part.y,4,part.colour,null);else rect(c,part.x,part.y,5,5,1,part.colour);c.restore();
  }
  this.particles=this.particles.filter(p=>p.life>0);c.restore();c.restore();
  this.frameTimes.push(performance.now()-begin);if(this.frameTimes.length>180)this.frameTimes.shift();
 }
 measure(){const arr=[...this.frameTimes].sort((a,b)=>a-b);return {samples:arr.length,medianDrawMs:arr[Math.floor(arr.length*.5)]||0,p95DrawMs:arr[Math.floor(arr.length*.95)]||0,pixelRatio:this.ratio};}
}
export function drawThumbnail(canvas,levelId){const c=canvas.getContext('2d');c.save();c.scale(canvas.width/960,canvas.height/540);drawBackground(c,levelId,900,0,0,{motion:false});c.restore();}
