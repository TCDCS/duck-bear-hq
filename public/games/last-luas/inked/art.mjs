/* Original editable ink drawings. Background, linework, shading and brand placements
 * are separate passes. All art is cached before play; no random per-frame ink jitter.
 * Brand images are supplied by the authenticated loader, never generated lettering.
 */
export const INK='#30394b',PAPER='#fff2d7';
const paths=new Map();
export function path(c,d,fill,stroke=INK,w=2){let p=paths.get(d);if(!p){p=new Path2D(d);if(paths.size<1500)paths.set(d,p);}if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.stroke(p);}}
export function rect(c,x,y,w,h,r,fill,stroke=INK,lw=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
export function oval(c,x,y,rx,ry,fill,stroke=null,lw=2){c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
export function line(c,pts,col=INK,lw=2){c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.strokeStyle=col;c.lineWidth=lw;c.lineCap='round';c.lineJoin='round';c.stroke();}
export function poly(c,p,fill,stroke=INK,lw=2){c.beginPath();c.moveTo(...p[0]);for(const a of p.slice(1))c.lineTo(...a);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}}
function surface(w,h,draw){const a=document.createElement('canvas');a.width=w;a.height=h;const c=a.getContext('2d');c.lineJoin='round';c.lineCap='round';draw(c);return a;}
function seeded(seed){let n=seed;return()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
function imageContain(c,img,x,y,w,h){const r=Math.min(w/img.width,h/img.height);c.drawImage(img,x+(w-img.width*r)/2,y+(h-img.height*r)/2,img.width*r,img.height*r);}
function windowBay(c,x,y,w,h,lit,arch=false){
 rect(c,x-7,y-8,w+14,h+17,3,'#dfcfb2',INK,2.5);
 if(arch){path(c,`M${x} ${y+22}Q${x+w/2} ${y-15} ${x+w} ${y+22}V${y+h}H${x}Z`,lit?'#ecc789':'#6a8190',INK,2.3);}else rect(c,x,y,w,h,1,lit?'#e8c58e':'#718898',INK,2);
 rect(c,x+5,y+5,w*.27,h-10,1,lit?'#fbe4b3':'#a9c1c6',null);
 path(c,`M${x+5} ${y+h-8}L${x+w-5} ${y+10}`,null,'#fff1cf66',4);
 line(c,[[x+w/2,y],[x+w/2,y+h]],'#eee0bd',4);
 line(c,[[x,y+h*.48],[x+w,y+h*.48]],'#eadbb8',4);
 line(c,[[x,y+h*.5+4],[x+w,y+h*.5+4]],INK,1);
 rect(c,x-11,y+h+6,w+22,9,2,'#e4d8c0',INK,2);
 if(lit){path(c,`M${x+4} ${y+4}Q${x+20} ${y+20} ${x+12} ${y+h-2}L${x+3} ${y+h-2}Z`,'#d59681',null);}
}
function door(c,x,y,w,h,colour){
 path(c,`M${x} ${y+20}Q${x+w/2} ${y-23} ${x+w} ${y+20}V${y+h}H${x}Z`,colour,INK,3);
 path(c,`M${x+5} ${y+20}Q${x+w/2} ${y-11} ${x+w-5} ${y+20}Z`,'#d3c19c',INK,1.5);
 for(const k of [.23,.48,.73])line(c,[[x+w/2,y+18],[x+w*k,y+1]],INK,1.5);
 rect(c,x+7,y+34,w-14,h*.32,2,colour, '#ecdbb499',2);rect(c,x+7,y+h*.58,w-14,h*.31,2,colour,'#ecdbb499',2);
 oval(c,x+w-11,y+h*.49,3,3,'#d8b068',INK,1.5);
}
function railing(c,x,y,w){line(c,[[x,y],[x+w,y]],INK,3);for(let dx=0;dx<=w;dx+=12){line(c,[[x+dx,y-4],[x+dx,y+37]],INK,2);oval(c,x+dx,y-6,2.5,3.5,INK);}line(c,[[x,y+28],[x+w,y+28]],INK,2);}
export function facadeArt(f,brands){
 const W=Math.round(Math.min(1000,Math.max(480,f.w*39))),H=860,rnd=seeded(f.seed);
 return surface(W,H,c=>{
  // Mass, ink edge, masonry and cornice are deliberately authored texture passes.
  rect(c,0,15,W,H-15,1,f.colour,INK,6);
  c.save();c.globalAlpha=.25;
  if(['town','cafe','hodges','academy'].includes(f.style)){
   for(let y=50,row=0;y<H-190;y+=15,row++)for(let x=(row%2)*26-26;x<W;x+=52){line(c,[[x+2,y],[x+50,y]],'#734f4b',1);line(c,[[x+51,y],[x+51,y+14]],'#754f49',1);}
  }else{for(let y=85;y<H-190;y+=58){line(c,[[0,y],[W,y]],'#756f68',1.5);for(let x=(y%2)*35;x<W;x+=125)line(c,[[x,y],[x,y+58]],'#9b9180',1);}}
  for(let i=0;i<42;i++){const x=rnd()*W,y=80+rnd()*500;line(c,[[x,y],[x+5+rnd()*12,y-2]],'#fff1d0',1);}
  c.restore();
  rect(c,0,31,W,16,2,'#d4bea0',INK,3);rect(c,0,12,W,22,3,'#ead8b5',INK,3);
  for(let x=8;x<W;x+=28)rect(c,x,47,12,9,1,'#a38670',INK,1);
  const rows=Math.max(2,f.floors-1),cols=f.style==='ivy'?8:f.style==='mansion'?6:Math.max(2,Math.round(f.w/3.5));
  const gap=W/cols,bayW=gap*.48,rowH=490/rows;
  for(let r=0;r<rows;r++)for(let n=0;n<cols;n++){const x=(n+.5)*gap-bayW/2,y=90+r*rowH;windowBay(c,x,y,bayW,rowH*.66,(f.seed+n+r)%4===0,r===rows-1&&['cafe','stone'].includes(f.style));}
  // Georgian plinths and individual doorways for non-retail frontages.
  const baseY=620;
  if(['mansion','academy','town','stone'].includes(f.style)){
   rect(c,0,baseY,W,H-baseY,1,f.style==='stone'?'#aaaea5':'#c6b295',INK,3);
   const dW=Math.min(80,W*.17),dx=W*.22;door(c,dx,baseY+48,dW,165,f.style==='mansion'?'#486868':f.seed%2?'#743d44':'#405964');
   for(let x=W*.47;x<W-35;x+=112){windowBay(c,x,baseY+46,60,113,false);railing(c,x-10,H-32,84);}
   rect(c,0,H-18,W,18,1,'#c0bba9',INK,2);
   if(f.style==='mansion'){poly(c,[[W*.14,620],[W*.36,580],[W*.57,620]],'#e5d5b2',INK,4);for(const x of [W*.18,W*.5]){rect(c,x,620,19,205,1,'#e8dec5',INK,3);rect(c,x-4,614,27,12,1,'#c3b59d',INK,2);}}
   if(f.style==='academy'){rect(c,W*.61,650,98,38,3,'#ded4b8',INK,2);c.fillStyle=INK;c.textAlign='center';c.font='bold 10px Georgia';c.fillText('ROYAL IRISH',W*.61+49,667);c.fillText('ACADEMY',W*.61+49,682);}
  }else{
   const colour=f.style==='hodges'?'#255b4b':f.style==='cafe'?'#254b5b':f.style==='ivy'?'#31554d':'#612932';
   rect(c,0,baseY-13,W,H-baseY+13,1,colour,INK,4);rect(c,0,baseY-18,W,11,1,'#d5b77b',INK,2);
   const shopCols=f.style==='ivy'?7:f.style==='pret'?2:4,sw=W/shopCols;
   for(let i=0;i<shopCols;i++){
    const x=i*sw+15,w=sw-30;rect(c,x,baseY+59,w,155,4,'#3d515a',INK,3);
    rect(c,x+5,baseY+65,w-10,142,1,'#f1d5a1',null);
    // Window interior artwork: book stacks or cafe lamps/tables, not a 3D room.
    if(f.style==='hodges'){for(let row=0;row<3;row++){for(let b=0;b<Math.floor(w/15);b++){const bw=9+(b%3)*2;rect(c,x+8+b*15,baseY+75+row*40,bw,28+(b%3)*3,1,['#c17a66','#708787','#b19b61','#7e6a75'][b%4],INK,1);line(c,[[x+10+b*15,baseY+80+row*40],[x+10+b*15,baseY+93+row*40]],'#e9d4a9',1);}rect(c,x+3,baseY+107+row*40,w-6,5,1,'#705949',INK,1);}}
    else{line(c,[[x+w*.5,baseY+60],[x+w*.5,baseY+105]],INK,2);path(c,`M${x+w*.5-17} ${baseY+111}Q${x+w*.5} ${baseY+86} ${x+w*.5+17} ${baseY+111}Z`,'#d7ab64',INK,2);oval(c,x+w*.5,baseY+116,13,4,'#ffedbb');rect(c,x+10,baseY+162,w-20,6,2,'#796259',INK,2);line(c,[[x+w*.5,baseY+168],[x+w*.5,baseY+200]],INK,3);}
    rect(c,x+w*.44,baseY+58,7,159,1,colour,INK,1.5);line(c,[[x+5,baseY+155],[x+w-5,baseY+95]],'#fff5d177',3);
   }
   for(let x=2;x<W;x+=sw)rect(c,x,baseY+48,11,182,1,colour,INK,2);
   rect(c,0,baseY+4,W,46,1,colour,INK,2);
   const img=brands[f.brand];if(!img)throw new Error('Missing genuine shop artwork: '+f.brand);
   if(f.style==='cafe'){rect(c,W*.26,baseY-10,W*.48,74,7,'#efe8d6',INK,2);imageContain(c,img,W*.29,baseY-4,W*.42,60);}
   else if(f.style==='pret'){rect(c,W*.13,baseY-2,W*.74,58,2,'#faf1e4',INK,2);imageContain(c,img,W*.17,baseY+4,W*.66,47);}
   else if(f.style==='hodges'){rect(c,W*.22,baseY-19,W*.56,80,3,colour,INK,2);imageContain(c,img,W*.24,baseY-15,W*.52,71);}else imageContain(c,img,W*.1,baseY+8,W*.8,35);
   if(f.style==='ivy'||f.style==='cafe'){
    for(let x=0;x<W;x+=sw){poly(c,[[x+4,baseY+48],[x+sw-4,baseY+48],[x+sw+4,baseY+75],[x-4,baseY+75]],colour,INK,2);if(f.style==='cafe')for(let a=x+12;a<x+sw;a+=25)poly(c,[[a,baseY+50],[a+9,baseY+50],[a+12,baseY+75],[a-2,baseY+75]],'#e4d3af',null);}
   }
   rect(c,0,H-16,W,16,1,'#aaa797',INK,2);
  }
  // Individual drainpipes, irregular subtle ink accents and stone corners.
  for(const x of [9,W-10]){line(c,[[x,59],[x+2,824]],'#494f52',5);line(c,[[x-1,62],[x+1,815]],'#969891',1.5);for(let y=90;y<810;y+=148)line(c,[[x-4,y],[x+5,y]],INK,2);}
  for(let r=0;r<3;r++)line(c,[[W-21-r*5,52],[W-30-r*5,72]],'#62595477',1);
 });
}
function skinHead(c,back=false,hat=false){
 path(c,'M-26-204Q-27-228-3-233Q29-233 28-207L25-178Q4-159-22-179Z','#d29b78',INK,3);
 oval(c,-26,-195,5,9,'#dba786',INK,2);oval(c,27,-196,5,9,'#dba786',INK,2);
 path(c,'M-27-210Q-34-233-17-236Q-8-247 6-239Q24-244 29-228L29-204Q17-210 16-219Q-6-209-27-210Z','#493c3d',INK,3);
 if(!back){oval(c,-9,-198,2.5,3,INK);oval(c,12,-198,2.5,3,INK);path(c,'M-1-196L-3-185L3-184',null,'#916d60',1.5);path(c,'M-9-178Q2-172 12-180',null,INK,2);}
 if(hat){path(c,'M-30-221Q-34-248-8-252Q20-255 30-231L30-218Z','#df9962',INK,3);path(c,'M-29-221Q0-215 31-220L29-211Q0-207-28-213Z','#edb57d',INK,3);for(let x=-20;x<25;x+=9)line(c,[[x,-237],[x+1,-223]],'#9e6253',1.5);oval(c,-2,-254,9,7,'#e6ae7a',INK,2);}
}
export function personArt(kind='runner',frame=0){
 return surface(256,360,c=>{c.translate(128,340);c.scale(1.14,1.14);
 const phase=frame/16*Math.PI*2,swing=Math.sin(phase),runner=kind==='runner',coat=runner?'#397c67':kind==='stopper'?'#bc6f77':'#d5a34b';
 // Curved trouser legs and carefully outlined soles, with real foot contact.
 for(const side of [-1,1]){const lift=runner?Math.max(0,swing*side)*22:0,dx=side*20+(runner?swing*side*8:0);
  path(c,`M${side*5}-79Q${side*25}-87 ${side*31}-66L${dx+9} ${-20-lift}Q${dx+13} ${-7-lift} ${dx-4} ${-4-lift}L${dx-15} ${-10-lift}L${side*6} -48Z`,'#48576c',INK,3);
  path(c,`M${dx-15} ${-15-lift}Q${dx-3} ${-22-lift} ${dx+9} ${-12-lift}L${dx+18} ${-4-lift}Q${dx+20} ${3-lift} ${dx-16} ${2-lift}Z`,'#f6e5c1',INK,3);line(c,[[dx-12,1-lift],[dx+15,1-lift]],'#a98468',3);line(c,[[dx-7,-11-lift],[dx+4,-9-lift]],'#b6aaa0',2);
 }
 // Sleeves are bent, with hands protruding from cuffs.
 for(const side of [-1,1]){const ay=runner?swing*side*13:0;
  path(c,`M${side*27}-151Q${side*43}-151 ${side*47}-127L${side*54} ${-108+ay}Q${side*63} ${-96+ay} ${side*46} ${-90+ay}Q${side*35} ${-99+ay} ${side*30}-119Z`,coat,INK,3);
  oval(c,side*52,-89+ay,9,12,'#d7a080',INK,2.5);
 }
 path(c,'M-26-168Q-43-158-38-133L-43-85Q-15-68 34-82L35-132Q40-153 25-164Z',coat,INK,3.5);
 path(c,'M-29-144Q-21-136-28-99L-31-90L-37-91Z',runner?'#286051':'#b28647',null);
 path(c,'M28-140Q20-118 28-85L35-88L33-136Z',runner?'#64a28a':'#e1b864',null);
 line(c,[[-33,-86],[-10,-80],[17,-81],[30,-86]],'#1f4b4d88',2);
 skinHead(c,runner,runner);
 if(runner){
  path(c,'M-25-164Q-37-175-23-183Q3-172 24-181Q37-169 26-159Q2-154-25-164Z','#568e75',INK,3);
  path(c,'M-26-151Q-40-119-26-86M27-151Q39-120 28-85',null,'#cba273',7);
  path(c,'M-18-151Q5-164 25-148Q35-135 31-96Q15-78-23-92Q-30-113-25-139Z','#ba8659',INK,3.5);
  path(c,'M-19-148Q5-153 24-143L26-123Q0-116-23-124Z','#d0a16b',INK,2.5);
  rect(c,-15,-118,35,23,6,'#d8b478',INK,2);rect(c,-5,-145,12,15,3,'#79594c',INK,2);
  // Original little duck badge; not a commercial mark.
  oval(c,4,-109,7,5,'#f1cb68',INK,1);oval(c,6,-115,4,4,'#f1cb68',INK,1);poly(c,[[9,-114],[14,-112],[10,-110]],'#d78c4c',INK,1);
 }else if(kind==='tourist'){
  path(c,'M-31-142L7-134L32-147L35-105L6-95L-34-103Z','#f3e7c9',INK,2.5);line(c,[[7,-133],[6,-99]],'#b2ad98',1.5);path(c,'M-26-129L-13-122L-21-116L-2-109M14-126L28-121L21-110',null,'#92b4af',3);oval(c,-10,-198,8,6,null,INK,2);oval(c,12,-198,8,6,null,INK,2);line(c,[[-3,-198],[5,-198]],INK,1.5);
 }else{rect(c,24,-149,15,27,3,'#354b59',INK,2);rect(c,27,-146,9,16,1,'#acd0d1',null);}
 });
}
export function propArt(kind,frame=0){
 if(['runner','tourist','stopper'].includes(kind))return personArt(kind,frame);
 return surface(300,390,c=>{c.translate(150,365);c.scale(1.13,1.13);
 if(kind==='bollard'){
  oval(c,0,-3,25,8,'#526069',INK,3);path(c,'M-13-83L-17-12Q0-4 16-12L12-83Z','#505e62',INK,3);oval(c,0,-83,13,10,'#67787b',INK,3);rect(c,-12,-66,24,11,2,'#edda9b',INK,2);line(c,[[-9,-46],[-10,-18]],'#a3b1ac',3);
 }else if(kind==='bin'){
  oval(c,-28,-5,9,12,'#34404b',INK,2);oval(c,28,-5,9,12,'#34404b',INK,2);path(c,'M-42-118L40-119L33-14Q0-7-35-15Z','#4f7566',INK,3.5);path(c,'M-42-118L-29-129L37-129L44-118Z','#72917a',INK,3);rect(c,-45,-120,90,10,3,'#708b72',INK,3);rect(c,-18,-87,37,24,4,'#e9ddb1',INK,2);path(c,'M-9-77L-4-86L4-78M6-77L14-71L5-65M2-65L-9-65L-10-74',null,'#5a7968',2);line(c,[[-27,-97],[-24,-25]],'#92ad8d',3);line(c,[[30,-95],[25,-21]],'#34594f',3);
 }else if(kind==='roadworks'){
  for(const x of [-58,58]){poly(c,[[x-13,-10],[x+18,-10],[x+12,1],[x-20,1]],'#565b61',INK,3);line(c,[[x,-6],[x,-126]],'#a37b56',6);}
  rect(c,-77,-123,154,71,5,'#f1d3ab',INK,3.5);
  c.save();c.beginPath();c.roundRect(-73,-119,146,63,3);c.clip();for(let x=-110;x<130;x+=39)poly(c,[[x,-123],[x+19,-123],[x-20,-50],[x-39,-50]],'#c86b50',null);c.restore();
  rect(c,-77,-123,154,71,5,null,INK,3);oval(c,-54,-136,10,9,'#d6974e',INK,2);oval(c,53,-136,10,9,'#d6974e',INK,2);
 }else if(kind==='umbrella'){
  // Person and scalloped fabric canopy are separate layers.
  path(c,'M-22-91L-24-18L-7-8L0-69L9-9L25-14L23-91Z','#5b566d',INK,3);path(c,'M-31-182Q0-202 32-179L39-86Q-3-71-38-89Z','#b98384',INK,3);line(c,[[4,-259],[3,-132]],INK,4);path(c,'M-92-215Q-73-285 0-289Q73-285 93-215Q64-231 48-208Q24-227 0-207Q-24-227-47-208Q-63-229-92-215Z','#907997',INK,3.5);path(c,'M0-289Q-38-268-47-208M0-289Q33-266 48-208M0-289V-207',null,'#c4a6ba',3);path(c,'M-89-216Q-61-249-35-259',null,'#dbc0c7',2);line(c,[[0,-289],[1,-300]],INK,3);
 }else if(kind==='cyclist'||kind==='delivery'){
  const coat=kind==='delivery'?'#508891':'#b87768';
  for(const [x,y] of [[-38,-37],[39,-38]]){oval(c,x,y,29,34,'#c9c9b5',INK,6);oval(c,x,y,22,26,null,'#78848b',2);for(let a=0;a<6;a++){const q=a*Math.PI/3+frame*.4;line(c,[[x,y],[x+21*Math.cos(q),y+26*Math.sin(q)]],'#747984',1.3);}}
  line(c,[[-38,-38],[-9,-94],[39,-38],[-38,-38],[0,-59],[-9,-94]],'#d2a754',5);line(c,[[39,-38],[24,-101],[40,-115],[48,-111]],INK,4);line(c,[[-9,-94],[-17,-109],[-29,-109]],INK,5);
  path(c,'M-10-145L19-137L15-96L-2-60L-14-67L-8-105L-36-115Z','#536177',INK,3);path(c,'M-28-188Q-3-201 11-184L28-144L5-127L-31-145Z',coat,INK,3);path(c,'M10-176L23-141L40-116L30-110L6-137Z',coat,INK,3);oval(c,39,-115,7,6,'#d6a37e',INK,2);
  oval(c,-8,-212,23,24,'#d6a37e',INK,3);path(c,'M-32-218Q-31-248-7-244Q17-243 18-215Z','#54788a',INK,3);line(c,[[-20,-233],[-16,-220],[-7,-235],[0,-222],[8,-232]],'#b8cdcc',2);
  if(kind==='delivery'){path(c,'M-44-188L-11-196L1-153L-35-145Z','#d8ae67',INK,3);line(c,[[-36,-179],[-18,-183],[-12,-162],[-29,-158],[-36,-179]],'#f2d693',2);}
 }else if(kind==='lamp'){
  path(c,'M-12-6L12-6L9-27L5-270Q7-291 29-285',null,'#394c56',8);line(c,[[-5,-8],[-3,-273]],'#a3b6b4',2);
  path(c,'M14-291L41-291L38-257L19-257Z','#f3dba1',INK,3);poly(c,[[10,-291],[29,-304],[45,-291]],'#3f555c',INK,3);line(c,[[28,-291],[28,-258]],INK,2);oval(c,28,-277,7,14,'#ffebbb');
 }else if(kind==='tree'){
  path(c,'M-12-6L-8-196L9-200L15-6Z','#a08065',INK,3);line(c,[[1,-97],[-24,-160],[4,-142],[30,-193]],INK,4);
  for(const [x,y,r,col]of [[-40,-210,47,'#6d927a'],[21,-247,55,'#8eaa7c'],[48,-202,49,'#719a7e'],[-18,-265,45,'#95ae80'],[-30,-183,45,'#759d7c']]){path(c,`M${x-r} ${y}Q${x-r-9} ${y-r*.6} ${x-r*.4} ${y-r}Q${x+r*.2} ${y-r-16} ${x+r*.65} ${y-r*.5}Q${x+r+21} ${y-r*.1} ${x+r*.7} ${y+r*.55}Q${x} ${y+r+8} ${x-r*.7} ${y+r*.4}Z`,col,INK,2.5);}
  for(let i=0;i<9;i++)path(c,`M${-51+i*12} ${-207-(i%3)*20}q6-8 12-4`,null,'#c2cb9a',2);
  oval(c,0,-1,31,7,'#7e9287',INK,2);
 }else if(kind==='planter'){
  path(c,'M-36-56L35-56L28-5L-28-5Z','#746755',INK,3);rect(c,-39,-60,78,10,2,'#ad9270',INK,3);
  for(let i=0;i<7;i++){const x=-25+i*8;path(c,`M${x}-62Q${x-30}-108 ${x-11}-121Q${x+9}-109 ${x}-62Z`,'#73977a',INK,1.5);}
 }
 });
}
export function tramArt(open=1){return surface(640,480,c=>{
 c.translate(640,0);c.scale(-1,1);c.translate(55,28); // Original rear three-quarter Dublin-tram illustration, not a photograph.
 poly(c,[[150,380],[470,248],[477,63],[166,173]],'#c1c7c6',INK,4);
 path(c,'M139 168Q156 140 196 152L277 173Q312 180 316 217L325 356Q326 385 295 395L154 396Q126 391 127 363L122 215Q122 185 139 168Z','#e6e1d0',INK,4.5);
 poly(c,[[153,395],[478,263],[477,231],[154,365]],'#877a9c',INK,3);
 for(let i=0;i<5;i++){const x=301+i*29,y=177-i*12;poly(c,[[x,y],[x+22,y-9],[x+23,y+79],[x+1,y+90]],'#577988',INK,2.5);line(c,[[x+4,y+5],[x+18,y+1]],'#b7d4cd',2);}
 path(c,'M149 202Q150 190 162 190L276 210Q289 213 290 228L296 291L146 285Z','#4c7282',INK,3);path(c,'M157 211L272 227L278 257L153 247Z','#8cafb6',null);
 path(c,'M166 275L228 252M213 282L252 270',null,'#d4e4d799',4);
 rect(c,156,171,113,21,4,'#374853',INK,2);c.font='bold 12px monospace';c.textAlign='center';c.fillStyle='#f9d28b';c.save();c.translate(212,0);c.scale(-1,1);c.fillText('LAST TRAM',0,187);c.restore();
 rect(c,132,329,184,40,5,'#8b779b',INK,3);oval(c,153,321,9,6,'#c67c79',INK,2);oval(c,289,326,9,6,'#c67c79',INK,2);
 for(const x of [158,285]){rect(c,x,395,18,11,4,'#39454c',INK,2);}
 line(c,[[300,355],[470,283]],'#e8dfc8',3);
 // Side doors remain visibly open until closing; no moving-tram boarding.
 const xx=355,yy=183;
 poly(c,[[xx,yy],[xx+40,yy-17],[xx+43,yy+119],[xx+2,yy+137]],'#ecce96',INK,3);
 const cut=21*(1-open);
 poly(c,[[xx,yy],[xx+cut,yy-cut*.43],[xx+cut+2,yy+137-cut*.43],[xx+2,yy+137]],'#a7b7b9',INK,2);
 poly(c,[[xx+40-cut,yy-17+cut*.43],[xx+40,yy-17],[xx+43,yy+119],[xx+43-cut,yy+119+cut*.43]],'#a7b7b9',INK,2);
 poly(c,[[168,153],[474,42],[477,64],[277,178]],'#b9c2c0',INK,3);poly(c,[[281,103],[348,78],[381,88],[313,115]],'#73848d',INK,2);
 line(c,[[350,73],[388,32],[440,35],[405,60]],'#3b4a55',4);
});}
export class ArtAtlas{
 constructor(brands){this.facades=new Map();this.sprites=new Map();this.brands=brands;for(const kind of ['runner','tourist','stopper','bollard','bin','roadworks','umbrella','cyclist','delivery','lamp','tree','planter']){
 const frames=kind==='runner'?16:kind==='cyclist'||kind==='delivery'?4:1;this.sprites.set(kind,Array.from({length:frames},(_,i)=>propArt(kind,i)));}
 this.trams=[tramArt(1),tramArt(.5),tramArt(0)];}
 frontage(f){if(!this.facades.has(f.id))this.facades.set(f.id,facadeArt(f,this.brands));return this.facades.get(f.id);}
 sprite(kind,frame=0){const list=this.sprites.get(kind)||this.sprites.get('tourist');return list[((Math.floor(frame)%list.length)+list.length)%list.length];}
 dispose(){this.facades.clear();this.sprites.clear();this.brands={};this.trams=[];}
}
