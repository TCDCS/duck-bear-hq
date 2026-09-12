import {INK,path,ellipse,rect,line,poly,gradient,star,mango} from './primitives.mjs';
function bolts(c,points){for(const [x,y]of points){ellipse(c,x,y,3.2,3.2,'#eaf1d9',INK,1);line(c,[[x-1.5,y],[x+1.5,y]],'#8391a3',.8);}}
function eyes(c,x,y,w=12){for(const dx of [-w,w]){ellipse(c,x+dx,y,8,11,'#fffbe5',INK,1.8);ellipse(c,x+dx+2,y+2,3.5,6,'#34445b');ellipse(c,x+dx+1,y,1.4,2,'#fff');}}
export function drawEnemy(c,e,tick){
 if(e.dead)return;c.save();c.translate(e.x,e.y);const hop=e.kind==='hopper',fly=e.kind==='flyer';
 ellipse(c,0,1,21,5,'#28324f24');
 if(hop){line(c,[[-12,-4],[-16,-11],[-9,-14],[-15,-18]],'#b1a4c6',3);line(c,[[12,-4],[16,-11],[9,-14],[15,-18]],'#b1a4c6',3);ellipse(c,-15,0,10,4,'#79859c',INK,1.6);ellipse(c,15,0,10,4,'#79859c',INK,1.6);}
 else if(!fly){ellipse(c,-12,-4,8,8,'#56657f',INK,2);ellipse(c,12,-4,8,8,'#56657f',INK,2);ellipse(c,-12,-4,3,3,'#d3d9c4');ellipse(c,12,-4,3,3,'#d3d9c4');}
 if(fly){const wave=Math.sin(tick/3)*8;ellipse(c,-25,-24,16,5+wave*.25,'#bee9df',INK,1.5);ellipse(c,25,-24,16,5-wave*.25,'#bee9df',INK,1.5);line(c,[[0,-31],[0,-40]],INK,2);ellipse(c,0,-41,22,3,'#f3d37a',INK,1.4);}
 ellipse(c,0,-22,22,18,gradient(c,-19,-37,20,-6,[[0,hop?'#c3a4eb':fly?'#92d8cf':'#f0ac6f'],[1,hop?'#9484ca':fly?'#66b0b4':'#d78768']]),INK,2);
 rect(c,-15,-30,30,17,6,'#fff5db',INK,1.3);ellipse(c,-6,-22,3,4,INK);ellipse(c,6,-22,3,4,INK);path(c,'M-4-11Q0-8 5-11',null,INK,1.5);
 line(c,[[0,-38],[5,-48]],'#596880',1.7);ellipse(c,5,-48,4,4,'#f5d36f',INK,1.4);bolts(c,[[-17,-20],[17,-20]]);c.restore();
}
function wheel(c,x,y){ellipse(c,x,y,15,15,'#42566e',INK,2);ellipse(c,x,y,8,8,'#d8ddce',INK,1.4);ellipse(c,x,y,3,3,'#6e7b90');}
function switchButton(c,b,tick){
 const weak=b.phase==='vulnerable';
 if(weak){const pulse=1+Math.sin(tick/7)*.1;ellipse(c,0,-68,27*pulse,19*pulse,'#dfff9444');}
 rect(c,-24,-75,48,18,8,weak?'#b7e77b':'#c2c8c8',INK,2.6);rect(c,-18,-72,36,9,4,weak?'#e4ffc0':'#e3e4d1');
 if(weak){poly(c,[[-9,-100],[0,-91],[9,-100]],'#8bd26e',INK,2);star(c,33,-90,6,'#ffe68c',null);}
}
export function drawBoss(c,b,tick,{reducedMotion=false}={}){
 c.save();c.translate(b.x,b.y);if(b.hitFlash&&!reducedMotion)c.translate(Math.sin(tick*1.2)*4,0);
 if(b.dead){c.globalAlpha=.55;c.rotate(-.12);}
 ellipse(c,0,5,b.id==='pulp'?92:76,12,'#29314e22');
 const weak=b.phase==='vulnerable',attack=b.phase==='attack',wave=Math.sin(tick/7);
 if(b.id==='squawks'){
  const spread=attack?1.4:1;
  c.save();c.translate(-30,-74);c.rotate(attack?wave*.15:0);c.scale(spread,1);
  path(c,'M0 0Q-47-50-94-22L-70-12L-84 0L-60-4L-64 12Q-22 23 2 12Z','#dfe9e4',INK,2.7);c.restore();
  c.save();c.translate(30,-74);c.scale(-spread,1);c.rotate(attack?-wave*.15:0);path(c,'M0 0Q-47-50-94-22L-70-12L-84 0L-60-4L-64 12Q-22 23 2 12Z','#dfe9e4',INK,2.7);c.restore();
  line(c,[[-25,-20],[-30,-1],[-46,0]],'#c59c58',7);line(c,[[25,-20],[30,-1],[46,0]],'#c59c58',7);
  ellipse(c,0,-57,50,40,gradient(c,-30,-95,40,-20,[[0,'#fbfae6'],[1,'#bdcbd0']]),INK,3);ellipse(c,5,-106,32,31,'#fff7df',INK,2.7);
  eyes(c,5,-113,13);path(c,'M-5-99Q6-110 21-98L11-88Z','#f3bd64',INK,2);
  rect(c,-23,-143,53,7,3,'#6d87a1',INK,2);poly(c,[[-17,-144],[4,-163],[25,-144]],'#f0cb73',INK,2);
  bolts(c,[[-39,-56],[36,-56]]);switchButton(c,b,tick);
 }else if(b.id==='brolly'){
  c.save();c.translate(0,-159);c.rotate(weak?-.26:Math.sin(tick/35)*.08);
  path(c,'M-105 32Q-98-40 0-53Q98-40 105 32Q78 10 52 32Q25 9 0 32Q-27 8-53 32Q-80 9-105 32Z','#b69be3',INK,3);
  path(c,'M0-53Q-41-29-53 32Q-26 8 0 32Z','#f2b19c',INK,1.4);path(c,'M0-53Q42-28 52 32Q27 10 0 32Z','#9dd9d7',INK,1.4);
  line(c,[[0,-62],[0,104]],'#74829a',6);path(c,'M0 97Q0 119 16 112',null,'#f2ca70',7);c.restore();
  wheel(c,-39,-10);wheel(c,39,-10);rect(c,-50,-69,100,53,18,'#de9bb9',INK,3);rect(c,-33,-115,66,59,23,'#b4e0dd',INK,3);eyes(c,0,-91,13);path(c,'M-10-77Q0-71 10-77',null,INK,2);
  bolts(c,[[-40,-44],[40,-44]]);switchButton(c,b,tick);
 }else if(b.id==='peacock'){
  c.save();c.translate(0,-72);
  for(let i=-3;i<=3;i++){
   c.save();c.rotate(i*(weak?.12:.35));ellipse(c,0,-70,22,82,i%2?'#79c4b9':'#8cb8d5',INK,2.2);ellipse(c,0,-122,12,21,'#e9c273',INK,1.3);ellipse(c,0,-122,7,14,'#7283b5');ellipse(c,0,-122,3,7,'#e7dfaa');c.restore();
  }c.restore();
  line(c,[[-23,-24],[-27,0],[-42,0]],'#c69d65',6);line(c,[[23,-24],[27,0],[42,0]],'#c69d65',6);
  ellipse(c,0,-55,48,40,'#99c9d4',INK,3);rect(c,-16,-128,32,76,14,'#8ba8d0',INK,2.4);ellipse(c,0,-139,25,25,'#a8cbd7',INK,2.5);eyes(c,0,-144,10);poly(c,[[-8,-133],[11,-132],[0,-120]],'#f4cc76',INK,1.8);
  for(const x of [-10,0,10]){line(c,[[x*.5,-160],[x,-174]],'#8396bd',2);ellipse(c,x,-177,4,5,'#d5b3d4',INK,1.2);}switchButton(c,b,tick);
 }else if(b.id==='clatter'){
  wheel(c,-43,-10);wheel(c,43,-10);
  path(c,'M-60-96H60L51-26Q0-9-51-26Z',gradient(c,-60,-80,60,-20,[[0,'#a8d3cb'],[.5,'#e6e9d5'],[1,'#8eafb8']]),INK,3);
  for(const side of [-1,1]){c.save();c.scale(side,1);path(c,'M58-80Q87-92 86-61L61-60',null,'#758c9e',7);c.restore();}
  c.save();c.translate(0,-100);c.rotate(weak?-.4:attack?wave*.07:0);ellipse(c,0,0,68,12,'#b8cbd1',INK,2.5);path(c,'M-13-10V-21Q0-35 13-21V-10',null,'#687e98',7);c.restore();
  eyes(c,0,-48,14);path(c,'M-10-32Q0-26 11-32',null,INK,2);switchButton(c,b,tick);
  if(weak)for(let i=0;i<3;i++){c.save();c.globalAlpha=.5;path(c,`M${-20+i*20}-125Q${-30+i*20}-143 ${-14+i*20}-153`,null,'#fff4d3',4);c.restore();}
 }else if(b.id==='gust'){
  rect(c,-16,-112,32,83,8,'#bdabd3',INK,2.6);rect(c,-61,-29,122,23,10,'#8dbdc7',INK,3);wheel(c,-41,-9);wheel(c,41,-9);
  ellipse(c,0,-123,65,65,'#d3dedb',INK,3);ellipse(c,0,-123,57,57,'#8bafc2',INK,2);
  c.save();c.translate(0,-123);c.rotate(weak?tick*.012:tick*(attack?.18:.04));for(let i=0;i<5;i++){c.rotate(Math.PI*2/5);path(c,'M0 0Q-14-38 10-51Q36-49 23-17Z','#bddee0',INK,1.7);}c.restore();
  ellipse(c,0,-123,17,17,'#edca77',INK,2.5);ellipse(c,-5,-125,2,3,INK);ellipse(c,5,-125,2,3,INK);path(c,'M-5-117Q0-114 5-117',null,INK,1.5);
  for(let i=-1;i<=1;i++)line(c,[[i*21,-183],[i*21,-64]],'#e6e5d26e',1.4);switchButton(c,b,tick);
 }else{
  wheel(c,-70,-10);wheel(c,70,-10);rect(c,-88,-91,176,70,17,gradient(c,-80,-90,80,-20,[[0,'#f0b577'],[1,'#dc9387']]),INK,3);
  rect(c,-45,-198,106,111,14,'#bae0d5',INK,3);path(c,'M-30-188V-111Q0-100 44-112V-188Z','#fff4b345',null);
  for(const [x,y]of[[-17,-151],[21,-132],[4,-176]])mango(c,x,y,16);
  rect(c,-54,-209,124,16,6,'#aba8ce',INK,2.5);rect(c,-53,-100,124,14,5,'#939bbd',INK,2.5);
  line(c,[[75,-133],[100,-133],[100,-53],[72,-53]],INK,15);line(c,[[75,-133],[100,-133],[100,-53],[72,-53]],'#93bcb9',10);
  // Doctor Pulp, an original, overconfident little inventor in the side cockpit.
  rect(c,-113,-138,65,65,13,'#a7d5d6',INK,2.5);ellipse(c,-80,-124,20,23,'#e3af91',INK,2);path(c,'M-100-132Q-105-155-80-152Q-58-154-60-132L-67-141L-80-137L-93-141Z','#8e79a9',INK,2);
  rect(c,-99,-134,17,13,4,'#f7e9c1',INK,2);rect(c,-78,-134,17,13,4,'#f7e9c1',INK,2);line(c,[[-82,-128],[-78,-128]],INK,2);ellipse(c,-90,-127,2.5,3,INK);ellipse(c,-69,-127,2.5,3,INK);path(c,'M-91-115Q-80-106-68-116',null,INK,2);
  bolts(c,[[-70,-62],[70,-62]]);switchButton(c,b,tick);
 }
 if(b.phase==='warn'){c.save();c.translate(0,b.id==='pulp'?-245:-240);rect(c,-13,-25,26,35,10,'#ffe5a6',INK,2);line(c,[[0,-17],[0,-7]],INK,3);ellipse(c,0,1,2,2,INK);c.restore();}
 if(b.dead){for(let i=0;i<6;i++)star(c,Math.cos(i)*80,-80+Math.sin(i*2)*80,8,i%2?'#ffca79':'#c7e799',null);}
 c.restore();
}
export function drawProjectile(c,q){
 c.save();c.translate(q.x,q.y-q.h/2);
 if(q.kind==='pot'){rect(c,-18,-12,36,28,8,'#d6b7d6',INK,2);ellipse(c,0,-12,21,6,'#b7d2d4',INK,1.6);line(c,[[-5,-18],[5,-18]],INK,3);}
 else if(q.kind==='feather'){c.rotate(-.4);ellipse(c,0,0,21,8,'#98d1bd',INK,1.5);line(c,[[-19,0],[20,0]],'#f4dba8',2);ellipse(c,-4,0,5,4,'#8388bd');}
 else if(q.kind==='pulp'){ellipse(c,0,0,16,13,'#eeac67',INK,2);ellipse(c,-5,-4,5,3,'#ffdd95');}
 else{ellipse(c,0,0,21,14,'#e0f1d888',INK,1.5);path(c,'M-12-2Q0-9 12-2M-7 5Q2 0 13 5',null,'#79b5b4',2);}
 c.restore();
}
