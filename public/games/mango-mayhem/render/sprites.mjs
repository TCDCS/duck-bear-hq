/** Original vector character rigs. Every costume shares the same foot anchor. */
import {INK,path,ellipse,rect,line,poly,gradient,star,mango} from './primitives.mjs';
export const ANIMATIONS=Object.freeze(['idle','run','jump-rise','jump-fall','landing','spin','hurt','celebrate']);
export const CHARACTER_IDS=Object.freeze(['guannan','stephen','gaby','zachary','sara','mulan','mum','dad']);
const PEOPLE={
 guannan:{skin:'#efbd9e',shade:'#dba28b',hair:'#303042',shirt:'#28b9b2',pants:'#eb7b85',shoes:'#fff2c8',type:'bun',smile:true},
 stephen:{skin:'#f0c7ac',shade:'#dba78c',hair:'#78615a',shirt:'#657499',pants:'#40516e',shoes:'#eec575',type:'curly',beard:'#a76848',glasses:true},
 gaby:{skin:'#e9b596',shade:'#ca957d',hair:'#282b3c',shirt:'#b888d5',pants:'#526079',shoes:'#fff0c9',type:'long-black',noseRing:true,sunglasses:true},
 zachary:{skin:'#e8b897',shade:'#ce9e83',hair:'#67616a',shirt:'#e58862',pants:'#517789',shoes:'#f8dc85',type:'bald',beard:'#77747a'},
 sara:{skin:'#edc19e',shade:'#cd9d87',hair:'#655047',shirt:'#9090d8',pants:'#448c99',shoes:'#fff1d3',type:'long-brown'},
 mum:{skin:'#e3b49a',shade:'#c99b84',hair:'#858395',shirt:'#e58b98',pants:'#596e8b',shoes:'#ffeed4',type:'bob',older:true},
 dad:{skin:'#dfb194',shade:'#c3927c',hair:'#91909a',shirt:'#77b6c8',pants:'#556681',shoes:'#e1c39e',type:'receding',older:true,glasses:true}
};
export function poseFor(anim,tick,distance=0){
 const run=anim==='run',phase=run?distance/15:tick/8,bob=run?Math.abs(Math.sin(phase))*3:Math.sin(tick/22)*1.4;
 let leftLeg=run?Math.sin(phase)*.8:0,rightLeg=run?-Math.sin(phase)*.8:0,leftArm=run?-Math.sin(phase)*.8:.12,rightArm=run?Math.sin(phase)*.8:-.12;
 if(anim==='jump-rise'){leftLeg=.6;rightLeg=-.35;leftArm=-2.35;rightArm=2.35;}
 if(anim==='jump-fall'){leftLeg=.28;rightLeg=-.25;leftArm=-1.15;rightArm=1.15;}
 if(anim==='celebrate'){leftArm=-2.8+Math.sin(tick/9)*.12;rightArm=2.8-Math.sin(tick/9)*.12;leftLeg=-.1;rightLeg=.1;}
 if(anim==='spin'){leftLeg=.85;rightLeg=-.85;leftArm=-1.9;rightArm=1.9;}
 if(anim==='hurt'){leftArm=-1.25;rightArm=1.25;leftLeg=.2;rightLeg=-.4;}
 return {bob,leftLeg,rightLeg,leftArm,rightArm,squash:anim==='landing'?.90:1,blink:anim==='hurt'||anim==='celebrate'||tick%190>183,anim};
}
function limb(c,x,y,angle,length,colour,skin,shoe=false,white=false){
 c.save();c.translate(x,y);c.rotate(angle);
 line(c,[[0,0],[0,length]],INK,shoe?16:14);line(c,[[0,0],[0,length]],colour,shoe?12:10);
 if(shoe){rect(c,-7,length-1,22,11,5,white?'#f3fff7':skin,INK,2);line(c,[[-5,length+6],[13,length+6]],'#fff9e8',2);line(c,[[2,length+1],[6,length+1]],'#758095',1.4);}
 else{ellipse(c,0,length+2,6.5,7,skin,INK,1.7);line(c,[[3,length+1],[4,length+4]],'#bb8879',1);}
 c.restore();
}
function eye(c,x,y,closed,iris='#654840'){
 if(closed){path(c,`M${x-8} ${y+1}Q${x} ${y-7} ${x+8} ${y+1}`,null,INK,2.5);return;}
 path(c,`M${x-8} ${y}Q${x-1} ${y-10} ${x+8} ${y-1}Q${x+8} ${y+9} ${x-1} ${y+9}Q${x-8} ${y+7} ${x-8} ${y}Z`,'#fffdf5',INK,1.4);
 ellipse(c,x+1,y+1,5.3,7.5,iris);ellipse(c,x+1,y+2,3.1,5.6,'#2c2f45');ellipse(c,x-1,y-2,2.3,2.8,'#fff');ellipse(c,x+3.7,y+4.5,1.1,1.2,'#fff');
 path(c,`M${x-9} ${y-1}Q${x} ${y-10} ${x+8} ${y-1}`,null,INK,2.1);
}
function drawHead(c,id,pose,costume,accessory,tick){
 const p=PEOPLE[id]||PEOPLE.guannan,hair=gradient(c,-25,-140,25,-64,[[0,p.hair],[1,id==='guannan'?'#171f32':p.hair]]);
 const isHero=id==='guannan';
 if(p.type.startsWith('long')){
  path(c,'M-30-105Q-39-149 0-145Q43-146 36-96L41-52Q20-46 20-75L-19-73Q-27-46-42-56Z',hair,INK,2.5);
  path(c,'M-32-99Q-36-73-34-59M29-110Q34-75 30-61',null,p.type==='long-brown'?'#96715b':'#4d5062',2.5);
 }
 if(p.type==='bob')path(c,'M-34-99Q-41-145 1-145Q42-141 35-96L38-67Q22-60 18-76L-20-76Q-26-62-39-69Z',hair,INK,2.5);
 if(isHero&&costume==='rubber-duck'){
  ellipse(c,0,-108,40,47,'#ffe054',INK,2.8);ellipse(c,-13,-146,4,5,INK);ellipse(c,13,-146,4,5,INK);ellipse(c,0,-139,12,6,'#ff9c43',INK,1.8);
 }
 if(isHero&&costume==='panda'){
  ellipse(c,-29,-140,13,14,INK);ellipse(c,29,-140,13,14,INK);ellipse(c,0,-108,40,47,'#fff4dc',INK,2.8);
 }
 if(isHero&&costume==='mango-hero'){
  ellipse(c,0,-112,40,47,gradient(c,-35,-140,35,-80,[[0,'#ffdc58'],[1,'#f39a39']]),INK,2.5);
  path(c,'M-3-152Q-11-174 10-171Q15-158-3-152Z','#49b47a',INK,2);
 }
 const skin=gradient(c,-25,-130,23,-75,[[0,'#f6d2b4'],[.3,p.skin],[1,p.shade]]);
 ellipse(c,-31,-99,7,10,p.skin,INK,1.7);ellipse(c,31,-99,7,10,p.skin,INK,1.7);
 path(c,'M-31-106Q-34-139 0-140Q34-139 32-106L29-87Q24-66 0-64Q-24-66-29-87Z',skin,INK,2.3);
 if(p.type==='bun'){
  if(!['panda','rubber-duck','mango-hero'].includes(costume)){ellipse(c,-3,-145,13,11,hair,INK,2.3);path(c,'M-12-143Q-3-149 6-143',null,'#f6ca59',2.5);}
  path(c,'M-32-105Q-42-143-2-146Q39-147 33-105L25-121Q11-120-1-137Q-12-115-32-105Z',hair,INK,1.8);
  path(c,'M-27-126Q-18-138-7-138M8-136Q21-137 28-123',null,'#5a5869',2.4);
  path(c,'M-33-113Q-40-103-32-91M32-113Q38-105 33-97',null,p.hair,2);
 }else if(p.type.startsWith('long')||p.type==='bob'){
  path(c,'M-32-106Q-39-144 0-146Q38-147 33-107L24-126Q8-128 0-138Q-9-116-32-106Z',hair,INK,2);
  path(c,'M-27-123Q-15-139-4-140M11-138Q26-135 29-119',null,p.type==='long-brown'?'#947260':'#505369',2.5);
 }else if(p.type==='curly'){
  for(const [x,y,r] of [[-29,-121,11],[-26,-135,11],[-15,-141,12],[-2,-144,13],[12,-141,13],[25,-133,11],[31,-121,9]])ellipse(c,x,y,r,r,p.hair,INK,1.8);
  path(c,'M-23-133Q-30-139-19-143M-7-142Q-1-151 5-142M16-134Q25-143 28-132',null,'#b1a193',2.5);
 }else if(p.type==='receding'){
  path(c,'M-33-103L-31-127Q-25-135-20-133L-22-105M32-103L31-127Q24-136 18-131L22-106',p.hair,INK,1.4);
 }else if(p.type==='bald')path(c,'M-17-129Q-4-137 10-132',null,'#ffdfc3',3.3);
 if(p.beard){
  path(c,'M-30-94Q-22-88-20-84Q-11-92 0-84Q12-92 22-84L30-94L27-76Q22-57 0-54Q-23-60-28-77Z',p.beard,INK,1.8);
 }
 c.save();c.globalAlpha=.32;ellipse(c,-21,-87,8,4.3,'#ec7e81');ellipse(c,21,-87,8,4.3,'#ec7e81');c.restore();
 path(c,'M-23-115Q-15-119-7-115M7-115Q15-120 23-115',null,p.type==='bald'?'#655a58':p.hair,1.8);
 eye(c,-14,-105,pose.blink);eye(c,14,-105,pose.blink);
 path(c,'M0-101Q-4-91-1-90L4-90',null,'#ad7868',1.4);
 if(pose.anim==='hurt')ellipse(c,0,-78,5,7,'#99516a',INK,1.4);
 else{
  path(c,'M-15-82Q0-76 16-83Q12-66 0-67Q-11-68-15-82Z','#985169',INK,1.4);
  path(c,'M-12-81Q0-77 13-82L10-76Q0-72-10-77Z','#fffcf1',null);ellipse(c,1,-70,5,1.8,'#ef9e9f');
 }
 if(p.beard){path(c,'M-18-85Q-9-93-1-85M2-85Q10-93 19-85',null,p.beard,3.7);line(c,[[-19,-71],[-15,-63]],'#d7ac84',1);line(c,[[16,-71],[12,-62]],'#d7ac84',1);}
 if(p.glasses){rect(c,-26,-115,23,22,5,'#ecfffa18',INK,2.7);rect(c,3,-115,23,22,5,'#ecfffa18',INK,2.7);path(c,'M-3-107Q0-110 3-107',null,INK,2.3);line(c,[[-26,-109],[-33,-111]],INK,2);line(c,[[26,-109],[33,-111]],INK,2);}
 if(p.noseRing){c.beginPath();c.arc(-3,-90,2.6,-.4,Math.PI*1.6);c.strokeStyle='#efda91';c.lineWidth=1.5;c.stroke();}
 if(p.older){path(c,'M-27-98L-31-96M27-98L31-96M-22-80L-24-75M21-81L24-76',null,'#ac8177',1);}
 if(p.sunglasses){c.save();c.translate(0,-138);c.rotate(-.08);rect(c,-28,-7,24,14,5,'#384b59',INK,2);rect(c,4,-7,24,14,5,'#384b59',INK,2);line(c,[[-4,-2],[4,-2]],INK,2);line(c,[[-25,-4],[-11,-4]],'#90b5ab',2);line(c,[[8,-4],[22,-4]],'#90b5ab',2);c.restore();}
 if(isHero&&costume==='kite-cape'){
  rect(c,-29,-136,58,10,4,'#c78e4b',INK,1.5);ellipse(c,-14,-131,12,10,'#c5f1e4',INK,2);ellipse(c,14,-131,12,10,'#c5f1e4',INK,2);line(c,[[-19,-135],[-12,-132]],'#fff',2);line(c,[[9,-135],[16,-132]],'#fff',2);
 }
 if(isHero&&costume==='space-explorer'){
  ellipse(c,0,-104,43,47,'#cffafe12','#d5ffff',4.5);ellipse(c,0,-104,46,50,null,INK,2.3);path(c,'M-31-131Q-39-118-35-104',null,'#fff7e6',4);path(c,'M25-139Q35-133 37-125',null,'#fff7e699',3);
 }
 if(isHero&&accessory==='mango-clip')mango(c,29,-129,9);
 if(isHero&&accessory==='star-glasses'){star(c,-14,-103,13,'#fffec633','#ffcf57');star(c,14,-103,13,'#fffec633','#ffcf57');line(c,[[-2,-103],[2,-103]],'#e5a434',2);}
}
function cape(c,costume,tick,run){
 if(!['super-pyjamas','kite-cape','mango-hero'].includes(costume))return;
 const wave=Math.sin(tick/11)*7,back=run?25:0;
 c.save();c.translate(-back,0);
 const d=`M-16-61Q-32-44-42 ${-7+wave}Q-16 6 0-9Q21 7 39 ${-10-wave}Q25-46 15-61Z`;
 path(c,d,costume==='super-pyjamas'?'#e56889':costume==='mango-hero'?'#44b2a9':'#ef7e9f',INK,2.5);
 if(costume==='kite-cape'){
  const colours=['#ffc766','#ffdf77','#82cd9b','#70c4de','#a88adc'];c.save();c.clip(new Path2D(d));for(let i=0;i<5;i++)poly(c,[[-20+i*8,-61],[-38+i*16,18],[-22+i*16,18],[-12+i*8,-61]],colours[i],null);c.restore();path(c,d,null,INK,2.5);
 }
 c.restore();
}
function dog(c,pose,tick){
 ellipse(c,0,0,30,6,'#28324f22');
 path(c,'M-23-39Q-43-48-40-65Q-38-72-33-62Q-25-57-19-52',null,'#aa805d',10);
 ellipse(c,0,-22,13,24,'#fff2d3');
 for(const x of [-16,16]){rect(c,x-7,-20,14,22,7,'#f6e6c7',INK,2);ellipse(c,x+1,0,11,5,'#fff1d6',INK,2);}
 path(c,'M-25-79Q-47-91-42-64L-39-38Q-29-28-19-59M25-79Q47-91 42-64L39-38Q29-28 19-59','#92745b',INK,2.5);
 ellipse(c,0,-68,31,35,'#c69769',INK,2.3);
 path(c,'M-7-101L-5-79Q-22-65-18-52Q-13-35 0-34Q19-41 21-56Q20-70 5-79L8-101Z','#fff2d6',null);
 eye(c,-14,-72,pose.blink);
 eye(c,14,-72,pose.blink);
 ellipse(c,0,-52,10,7,'#a47176',INK,1.7);ellipse(c,-3,-54,3,1.8,'#eccac0');path(c,'M-13-45Q0-33 14-45',null,INK,2);
 rect(c,-5,-43,11,19,5,'#f397ab',INK,1.6);line(c,[[0,-39],[0,-31]],'#bd687f',1);
 path(c,'M-23-37Q0-26 23-37L16-20L0-24L-15-20Z','#45b5aa',INK,2);mango(c,0,-25,7);
}
export function drawCharacter(c,{id='guannan',x=0,y=0,scale=1,facing=1,anim='idle',tick=0,distance=0,costume='starter',accessory=null,shadow=true}={}){
 const p=PEOPLE[id]||PEOPLE.guannan,pose=poseFor(anim,tick,distance),hero=id==='guannan';
 c.save();c.translate(x,y);c.scale(scale*(facing<0?-1:1),scale);
 if(id==='mulan'){dog(c,pose,tick);c.restore();return;}
 if(shadow)ellipse(c,0,1,25,6,'#28324f25');
 if(anim==='spin'){c.translate(0,-62);c.rotate(tick*.42);c.scale(.82,.82);c.translate(0,62);}
 c.scale(1/pose.squash,pose.squash);
 let shirt=p.shirt,pants=p.pants,shoe=p.shoes;
 if(hero){
  if(costume==='rubber-duck'){shirt='#ffda4c';pants='#f5af41';shoe='#f39542';}
  if(costume==='super-pyjamas'){shirt='#8071d7';pants='#7e79cc';shoe='#f5c778';}
  if(costume==='space-explorer'){shirt='#e8f2ed';pants='#d3e7e6';shoe='#effcf8';}
  if(costume==='panda'){shirt='#fff2d6';pants='#363a50';shoe='#383d51';}
  if(costume==='kite-cape'){shirt='#54bcae';pants='#e8808c';shoe='#52647a';}
  if(costume==='mango-hero'){shirt='#ffbf47';pants='#429b80';shoe='#42b59c';}
  cape(c,costume,tick,anim==='run');
  if(costume==='space-explorer'){rect(c,-28,-58,18,34,6,'#afa1d6',INK,2);rect(c,-29,-51,9,19,3,'#f6bb6b',INK,1.5);}
  if(costume==='rubber-duck')poly(c,[[-21,-29],[-40,-36],[-31,-19],[-21,-13]],'#ffce4b',INK,2);
 }
 limb(c,-10,-23,pose.leftLeg,18,pants,shoe,true,hero&&costume==='space-explorer');
 limb(c,11,-23,pose.rightLeg,18,pants,shoe,true,hero&&costume==='space-explorer');
 c.save();c.translate(0,-pose.bob);
 limb(c,-19,-51,pose.leftArm,23,shirt,p.skin);
 const torso=hero&&['rubber-duck','panda','mango-hero'].includes(costume)?'M-21-59Q-37-38-27-17Q0-2 27-17Q37-39 21-59Q0-69-21-59Z':'M-19-60Q0-68 19-60L24-23Q0-11-24-23Z';
 path(c,torso,gradient(c,-25,-60,25,-15,[[0,shirt],[1,shirt]]),INK,2.5);
 if(hero&&costume==='starter'){
  path(c,'M-10-61L-6-24H6L11-61Z','#ffe59a',INK,1.3);path(c,'M-17-59L-8-46L-14-42M17-59L9-46L14-42',null,'#ddf5d4',1.7);line(c,[[-18,-30],[-10,-32]],'#117f87',2);line(c,[[12,-31],[20,-29]],'#117f87',2);
 }else if(hero&&costume==='panda')ellipse(c,0,-36,16,20,'#fffdf0');
 else if(hero&&costume==='mango-hero'){path(c,'M-10-59Q0-75 13-61L4-52Z','#62b97a',INK,1.7);star(c,0,-35,12,'#fff2a3',INK);}
 else if(hero&&costume==='super-pyjamas'){for(const [x,y,r] of [[0,-44,10],[-15,-30,4],[16,-28,4]])star(c,x,y,r,'#ffde78',null);}
 else if(hero&&costume==='space-explorer'){rect(c,-13,-51,26,23,5,'#92c6d2',INK,1.5);ellipse(c,-6,-42,3,3,'#f6b96c');ellipse(c,5,-42,3,3,'#a7e5ac');rect(c,-7,-35,15,3,1,'#fff5d8');}
 else{line(c,[[0,-59],[0,-23]],'#ffffff66',1.3);mango(c,9,-44,6);}
 ellipse(c,0,-61,8,9,p.skin,INK,1.7);
 if(hero&&costume==='starter'){
  path(c,`M-12-66Q0-58 15-66L16-58Q1-50-13-58Z`,'#ffdb61',INK,1.5);
  const wave=Math.sin(tick/9)*5;path(c,`M-9-58Q-29-58-37 ${-50+wave}L-47 ${-58+wave}Q-21-72-6-62Z`,'#ffdc6b',INK,1.7);
 }
 limb(c,19,-51,pose.rightArm,23,shirt,p.skin);
 if(hero&&accessory==='rainbow-bands')for(const x of [-21,21]){rect(c,x-6,-29,12,3,1,'#ffbc71');rect(c,x-6,-26,12,3,1,'#9ae1c2');rect(c,x-6,-23,12,3,1,'#a4baff');}
 drawHead(c,id,pose,costume,accessory,tick);
 c.restore();c.restore();
}
