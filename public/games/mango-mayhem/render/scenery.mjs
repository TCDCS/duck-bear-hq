/** Layered original cartoon scenery. Landmarks are scenery, never damage targets. */
import {INK,path,ellipse,rect,line,poly,gradient,star,mango} from './primitives.mjs';
export const PALETTES=Object.freeze({
 dublin:{sky:'#8adbea',horizon:'#fff1c9',far:'#85babe',grass:'#73bc8a',earth:'#b79587',trim:'#f5d89b',ink:'#496477'},
 london:{sky:'#a8ccef',horizon:'#ffe6c4',far:'#9aa9cc',grass:'#91b9a4',earth:'#ad99b5',trim:'#efd5a1',ink:'#55637f'},
 taj:{sky:'#d9c4ef',horizon:'#ffe2be',far:'#bdaccb',grass:'#9bbd96',earth:'#dfbbac',trim:'#fff3dc',ink:'#81658d'},
 sichuan:{sky:'#9edecd',horizon:'#fbf1b3',far:'#89bbb1',grass:'#62b68a',earth:'#aab67c',trim:'#e8d29a',ink:'#416d68'},
 neimenggu:{sky:'#75cbe9',horizon:'#e7f3c3',far:'#83b7a0',grass:'#83be70',earth:'#c4a272',trim:'#ead290',ink:'#47706d'},
 liaoning:{sky:'#f2c49d',horizon:'#fff0c1',far:'#bab1b8',grass:'#9bb88a',earth:'#c59c95',trim:'#efd5ad',ink:'#775c79'}
});
const bgCache=new Map();
function cloud(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);path(c,'M-53 12Q-75 6-64-8Q-55-22-37-17Q-34-45-8-42Q17-43 23-23Q47-32 54-9Q77-7 73 8Q67 20 38 17H-42Z','#fff8e9',null);path(c,'M-56 9Q-13 19 60 9',null,'#f4e8d955',3);c.restore();}
function roundTree(c,x,y,s=1,colour='#65af8c'){
 c.save();c.translate(x,y);c.scale(s,s);path(c,'M-5 0L-4-75L5-76L7 0Z','#b28d76',null);path(c,'M0-32L-24-57M2-47L26-75',null,'#b28d76',5);
 ellipse(c,-23,-82,28,31,colour);ellipse(c,19,-95,35,35,colour);ellipse(c,-1,-111,36,33,colour);ellipse(c,-20,-110,24,23,'#ffffff18');ellipse(c,35,-76,21,24,colour);
 path(c,'M-29-101Q-24-114-10-117',null,'#f2f6c944',4);c.restore();
}
function window(c,x,y,w=16,h=25,arch=false){
 if(arch){path(c,`M${x} ${y+h}V${y+7}Q${x+w/2} ${y-6} ${x+w} ${y+7}V${y+h}Z`,'#526e87','#fff2d6',2);}
 else rect(c,x,y,w,h,2,'#617c94','#fcebd2',2);
 line(c,[[x+w/2,y+3],[x+w/2,y+h-2]],'#f8dfbf',1.3);line(c,[[x+2,y+h/2],[x+w-2,y+h/2]],'#f8dfbf',1.3);
}
function house(c,x,y,w,h,colour,roof='#737c9c',door='#dd8c81'){
 rect(c,x,y-h,w,h,2,colour,'#607088',1.5);
 for(let by=y-h+10;by<y;by+=18)line(c,[[x+3,by],[x+w-3,by]],'#ffffff20',1);
 poly(c,[[x-7,y-h],[x+w/2,y-h-30],[x+w+7,y-h]],roof,'#607088',1.5);
 rect(c,x+w-21,y-h-40,10,25,1,colour,'#607088',1.4);
 for(let yy=y-h+17;yy<y-45;yy+=39)for(let xx=x+13;xx<x+w-12;xx+=30)window(c,xx,yy,15,25);
 rect(c,x+w/2-11,y-40,22,40,8,door,'#fff1d6',3);ellipse(c,x+w/2+5,y-17,1.5,1.5,'#ffde79');
 rect(c,x-4,y-4,w+8,8,2,'#e6ddc7','#607088',1);
}
function river(c,y,colour='#89cdd8'){
 c.fillStyle=gradient(c,0,y,0,540,[[0,colour],[1,'#bce8df']]);c.fillRect(0,y,1800,540-y);
 for(let i=0;i<55;i++){const x=(i*113)%1780,yy=y+12+(i*31)%110;line(c,[[x,yy],[x+30+(i%4)*16,yy]],'#f4f8d85c',2.2);}
}
function dublin(c){
 path(c,'M0 300Q180 228 420 290Q780 215 1020 291Q1390 210 1800 283V540H0Z','#9bc7ac',null);
 const colours=['#eeb2a1','#c9c396','#e7c59c','#d4abd0','#b5cdcb'];
 for(let i=0;i<13;i++)house(c,i*138-30,365,75+(i%3)*16,118+(i%4)*22,colours[i%5],['#688499','#ae858b','#729588'][i%3],['#d87180','#65a6aa','#8c91be'][i%3]);
 // Dublin's slender Spire, a warm Georgian streetscape and the Liffey.
 poly(c,[[943,359],[951,95],[958,359]],'#f5f5dd','#95b7b8',1);poly(c,[[951,95],[951,359],[958,359]],'#cbded9',null);
 river(c,382);
 c.save();c.translate(535,388);
 path(c,'M-246 11Q0-139 245 11L245 32Q0-94-246 32Z','#f3e8cc','#6f8996',3);
 path(c,'M-246 2Q0-149 245 2',null,'#fff0d1',7);
 for(let x=-220;x<=220;x+=28){const yy=-74*(1-(x*x)/(240*240));line(c,[[x,yy-10],[x,yy+16]],'#6c8b94',2);}
 c.restore();
 for(const x of [90,760,1260,1640])roundTree(c,x,385,.66,'#73b597');
 c.save();c.translate(1370,414);path(c,'M-65-9L60-9L39 14H-45Z','#b38090','#617c8f',2);rect(c,-20,-28,49,18,3,'#f8e3b5','#617c8f',2);rect(c,-8,-23,11,10,2,'#88b5c5');rect(c,9,-23,11,10,2,'#88b5c5');c.restore();
}
function bigBen(c,x,y,s=1){
 c.save();c.translate(x,y);c.scale(s,s);
 rect(c,-33,-219,66,219,2,'#efd497','#aa9d84',2);rect(c,-40,-229,80,62,2,'#f8dea0','#a3937a',2);
 poly(c,[[-43,-230],[0,-305],[43,-230]],'#748d9a','#647b89',2);poly(c,[[-26,-265],[0,-312],[26,-265]],'#526f87',null);
 rect(c,-8,-321,16,25,1,'#b8b5a2','#65798b',1.5);line(c,[[0,-321],[0,-340]],'#fff0c3',3);
 ellipse(c,0,-199,25,25,'#fff8da','#7c939a',3);ellipse(c,0,-199,21,21,null,'#d2b57c',1.2);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;line(c,[[Math.sin(a)*18,-199+Math.cos(a)*18],[Math.sin(a)*21,-199+Math.cos(a)*21]],'#69798b',1.5);}
 line(c,[[0,-216],[0,-199],[12,-192]],'#506176',2.5);
 for(let xx=-21;xx<=21;xx+=14){rect(c,xx-3,-147,7,118,2,'#cab380');line(c,[[xx,-143],[xx,-39]],'#fae5af',2);}
 for(let yy=-165;yy<0;yy+=32)line(c,[[-34,yy],[34,yy]],'#d0b484',3);
 c.restore();
}
function london(c){
 path(c,'M0 326L100 305L180 311L218 250L256 315L370 301L510 318L555 253L591 319L698 300L841 321L935 296L1080 310L1220 298L1500 306L1670 291L1800 311V540H0Z','#adbed0',null);
 // An illustrated wheel; geometry is decorative and cannot affect the player.
 c.save();c.translate(1150,250);ellipse(c,0,0,111,111,null,'#f7ecdb',6);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;line(c,[[0,0],[Math.cos(a)*111,Math.sin(a)*111]],'#eef1df',2);ellipse(c,Math.cos(a)*113,Math.sin(a)*113,9,6,'#97afc3','#f3e7d2',2);}
 line(c,[[-55,132],[0,0],[55,132]],'#ebdfc7',7);ellipse(c,0,0,10,10,'#e7ddc7');c.restore();
 for(let i=0;i<8;i++)house(c,i*205-20,380,115,92+(i%3)*22,['#c7b4c6','#e4c7a4','#a7bfc9','#d8b9ba'][i%4],'#7d86a4','#9d89b4');
 bigBen(c,430,385,.82);river(c,401,'#9ebbd6');
 // Parked background double-decker: a place marker, not a gameplay obstacle.
 c.save();c.translate(1460,390);rect(c,-76,-68,146,63,13,'#d78484','#69788d',2);rect(c,-63,-56,119,20,4,'#aacbd7','#f5d6ba',2);rect(c,-63,-26,90,18,3,'#b4c9d6','#f3d4b9',2);for(let x=-43;x<56;x+=26)line(c,[[x,-55],[x,-37]],'#ead3bf',2);ellipse(c,-45,-4,12,12,'#64718b');ellipse(c,45,-4,12,12,'#64718b');ellipse(c,-45,-4,5,5,'#d9d6c5');ellipse(c,45,-4,5,5,'#d9d6c5');c.restore();
 for(const x of [42,900,1720])roundTree(c,x,399,.78,'#90b4a0');
}
function dome(c,x,y,w,h,fill='#fff5df'){
 path(c,`M${x-w/2} ${y}Q${x-w*.61} ${y-h*.44} ${x-w*.27} ${y-h*.70}Q${x-4} ${y-h*.91} ${x} ${y-h}Q${x+4} ${y-h*.91} ${x+w*.27} ${y-h*.70}Q${x+w*.61} ${y-h*.44} ${x+w/2} ${y}Z`,fill,'#b29fbb',1.5);
 line(c,[[x,y-h],[x,y-h-19]],'#bfa477',2);ellipse(c,x,y-h-14,3,4,'#dec287');
}
function taj(c){
 path(c,'M0 325Q250 282 485 318Q845 265 1100 312Q1440 270 1800 316V540H0Z','#c7c3b0',null);
 c.save();c.translate(855,367);
 rect(c,-244,-15,488,18,1,'#dfcdca','#b49dad',1.5);
 for(const x of [-235,235]){
  rect(c,x-12,-174,24,163,1,'#fff0dc','#b6a5b7',1.5);
 }
 for(const x of [-235,235]){
  for(const yy of [-145,-100,-55])rect(c,x-15,yy,30,6,1,'#e6d5c7','#b7a6b4',1);
  dome(c,x,-177,35,30);rect(c,x-17,-177,34,7,1,'#eee0cd','#b8a6b6',1);
 }
 rect(c,-165,-141,330,126,1,'#f5e5d3','#bca6b6',1.7);
 rect(c,-83,-172,166,157,1,'#fff5df','#b39fb5',2);
 dome(c,0,-176,155,104);
 for(const x of [-122,122]){dome(c,x,-148,65,45);rect(c,x-32,-146,64,6,1,'#e8d4c4');}
 path(c,'M-40-17V-105Q0-161 40-105V-17Z','#b0a9bf','#dfcbb9',3);
 path(c,'M-27-17V-99Q0-139 27-99V-17Z','#7e89a7','#f5e8d5',2);
 for(const x of [-143,-100,100,143]){window(c,x-9,-115,18,37,true);window(c,x-9,-57,18,32,true);}
 for(const x of [-62,62]){window(c,x-8,-119,16,35,true);window(c,x-8,-61,16,33,true);}
 for(const x of [-164,-85,85,164])line(c,[[x,-145],[x,-16]],'#fdf6df',3);
 c.restore();
 c.fillStyle='#b9cba0';c.fillRect(0,382,1800,158);
 poly(c,[[835,380],[875,380],[1110,540],[600,540]],'#91c6d1','#ddd8c0',4);
 for(let i=0;i<11;i++)line(c,[[811-i*13,401+i*12],[904+i*17,401+i*12]],'#e9eee18a',2);
 for(let i=0;i<12;i++){const x=i*158;roundTree(c,x,400,.55,'#83b099');ellipse(c,x+72,400,44,11,'#b5b681');}
 for(const x of [575,1140]){
  rect(c,x-3,330,6,80,2,'#d2af8d');for(let a=-3;a<=3;a++)path(c,`M${x} 340Q${x+a*20} 309 ${x+a*26} 350`,null,'#78b491',6);
 }
 // A decorative garden fountain, not a part of the monument.
 c.save();c.translate(283,412);ellipse(c,0,0,73,14,'#d5cfbd','#ababb1',2);ellipse(c,0,-3,63,9,'#9acbd4');rect(c,-6,-54,12,52,3,'#e7d9ca');ellipse(c,0,-54,28,7,'#f4e6d3','#aba8b6',1.5);for(let i=-2;i<=2;i++)path(c,`M0-56Q${i*20} -103 ${i*25} -9`,null,'#c5e5df',2);c.restore();
}
function mountain(c,x,y,w,h,fill){path(c,`M${x-w} ${y}Q${x-w*.56} ${y-h*.35} ${x-w*.34} ${y-h*.76}Q${x-w*.14} ${y-h*1.09} ${x} ${y-h}Q${x+w*.2} ${y-h*1.03} ${x+w*.4} ${y-h*.57}Q${x+w*.52} ${y-h*.15} ${x+w} ${y}Z`,fill,null);}
function tileRoof(c,x,y,w,fill='#6c8c96'){
 path(c,`M${x-w/2-16} ${y+9}Q${x-w/2+4} ${y+14} ${x-w/2+25} ${y-6}L${x+w/2-25} ${y-6}Q${x+w/2-4} ${y+14} ${x+w/2+16} ${y+9}Q${x+w/2-2} ${y+27} ${x+w/2-21} ${y+26}H${x-w/2+21}Q${x-w/2+2} ${y+27} ${x-w/2-16} ${y+9}Z`,fill,'#607a82',2);
 for(let xx=x-w/2+25;xx<x+w/2-20;xx+=14)line(c,[[xx,y-3],[xx+6,y+21]],'#d4ded377',1.4);
 line(c,[[x-w/2+25,y-7],[x+w/2-25,y-7]],'#d6d2b0',3);
}
function lantern(c,x,y,s=1){
 c.save();c.translate(x,y);c.scale(s,s);line(c,[[0,-23],[0,-7]],'#a58b83',1.5);ellipse(c,0,7,15,19,'#ea9c87','#bf8d84',1.5);
 path(c,'M-7-9Q-12 6-6 23M7-9Q12 6 6 23',null,'#f1c17e',1.3);rect(c,-9,-11,18,4,1,'#cfbd87');rect(c,-8,24,16,4,1,'#c5b282');line(c,[[0,28],[0,41]],'#d7af7e',2);c.restore();
}
function bamboo(c,x,y,s=1){
 c.save();c.translate(x,y);c.scale(s,s);
 for(const [dx,h] of [[-12,109],[0,155],[16,128]]){
  rect(c,dx-4,-h,8,h,4,'#83b98b','#6b9e83',1);for(let yy=-h+20;yy<0;yy+=28)line(c,[[dx-5,yy],[dx+5,yy]],'#cee0a4',2);
  for(const yy of [-h+20,-h+51,-h+83]){
   path(c,`M${dx} ${yy}Q${dx-27} ${yy-30} ${dx-39} ${yy-18}Q${dx-19} ${yy-12} ${dx} ${yy}Z`,'#69a888',null);
   path(c,`M${dx} ${yy+3}Q${dx+19} ${yy-30} ${dx+36} ${yy-25}Q${dx+30} ${yy-7} ${dx} ${yy+3}Z`,'#8bc294',null);
  }
 }
 c.restore();
}
function sichuan(c){
 mountain(c,90,383,350,243,'#9bc3bc');mountain(c,540,383,340,275,'#9bc5bb');mountain(c,1080,383,460,211,'#a3ccc0');mountain(c,1600,383,400,290,'#9cc4bc');
 mountain(c,180,418,300,170,'#84b6a6');mountain(c,960,418,340,185,'#85b6aa');mountain(c,1610,418,380,179,'#90c1ac');
 for(let i=0;i<7;i++){
  const x=180+i*254,y=391,h=86+(i%3)*18;
  rect(c,x-60,y-h,120,h,2,'#eacbb0','#9b9c94',1.5);tileRoof(c,x,y-h-14,165,i%2?'#789990':'#7791a0');
  for(const dx of [-38,8]){rect(c,x+dx,y-62,28,42,2,'#a9bcc0','#eee0bf',3);line(c,[[x+dx+14,y-60],[x+dx+14,y-21]],'#e2c7a5',2);}
  for(const dx of [-52,52])lantern(c,x+dx,y-h+8,.63);
 }
 for(let i=0;i<10;i++)bamboo(c,i*192+30,416,.72+(i%3)*.14);
 path(c,'M0 415Q360 393 600 425Q1100 393 1800 418V540H0Z','#a8ce9c',null);
 for(let i=0;i<19;i++)ellipse(c,i*108,441,58,25,i%2?'#8abd91':'#aad29c');
}
function yurt(c,x,y,s=1){
 c.save();c.translate(x,y);c.scale(s,s);rect(c,-67,-51,134,53,4,'#f5ead0','#9fb5a2',1.5);
 poly(c,[[-72,-51],[0,-96],[72,-51]],'#fff1d4','#9daf9d',1.8);line(c,[[-64,-50],[64,-50]],'#91bfc1',6);
 for(let x=-51;x<60;x+=26){poly(c,[[x,-35],[x+9,-26],[x,-17],[x-9,-26]],null,'#cdaa7d',1.5);}
 rect(c,-15,-41,30,43,7,'#9bb7b9','#e4c291',3);rect(c,-21,0,42,6,1,'#c8b599');c.restore();
}
function kite(c,x,y,s=1,colour='#e898a2',phase=0){
 c.save();c.translate(x,y);c.rotate(phase);c.scale(s,s);poly(c,[[0,-30],[22,0],[0,38],[-22,0]],colour,'#b29498',1.5);poly(c,[[0,-30],[0,38],[22,0]],'#f7d284',null);line(c,[[0,-30],[0,38]],'#e6e4c6',1);line(c,[[-22,0],[22,0]],'#e6e4c6',1);
 path(c,'M0 38Q24 54 2 71Q-15 83 6 101',null,'#bfbc99',1.5);
 poly(c,[[-6,60],[9,55],[8,68]],'#94c3c6',null);poly(c,[[-6,84],[8,79],[9,92]],'#dfa0b1',null);c.restore();
}
function neimenggu(c){
 path(c,'M0 291Q310 201 660 295Q1000 209 1380 274Q1640 238 1800 290V540H0Z','#b2cea1',null);
 path(c,'M0 358Q290 266 579 340Q1060 282 1380 350Q1650 304 1800 343V540H0Z','#99c78d',null);
 path(c,'M0 419Q320 341 651 396Q1030 324 1460 402Q1700 350 1800 401V540H0Z','#b1d28a',null);
 for(const [x,y,s] of [[400,363,.66],[1230,383,.94],[1430,366,.72]])yurt(c,x,y,s);
 for(const [x,y,s,col] of [[240,170,1.05,'#dfb3c7'],[840,208,.7,'#a9b9d3'],[1450,144,.85,'#d8a7bd'],[1650,237,.5,'#ddcb86']])kite(c,x,y,s,col,.12);
 for(let i=0;i<47;i++){const x=i*39,y=432+(i*23)%89;line(c,[[x-5,y],[x,y-14],[x+5,y]],'#79aa75',1.5);if(i%4===0){ellipse(c,x,y-15,3,3,'#f3d78e');ellipse(c,x+4,y-11,3,3,'#f4da91');}}
 // A small city-edge pavilion before the open grasslands.
 rect(c,72,292,125,86,3,'#e5cfae','#b0b297',1.5);tileRoof(c,135,283,163,'#91a8a7');window(c,98,317,21,35,true);window(c,150,317,21,35,true);
}
function factory(c,x,y,s=1){
 c.save();c.translate(x,y);c.scale(s,s);
 rect(c,-145,-128,290,132,5,'#d6b0ab','#9b8199',2);rect(c,-107,-211,160,87,6,'#e8c9ac','#a38da0',2);
 for(let xx=-113;xx<130;xx+=60){rect(c,xx,-106,33,55,7,'#9abcc8','#f2dbbb',3);line(c,[[xx+16,-103],[xx+16,-53]],'#efd9bd',2);}
 rect(c,77,-242,32,161,8,'#baafc7','#93879f',2);for(let yy=-219;yy<-80;yy+=38)rect(c,72,yy,42,8,3,'#d2c1ca','#9d8b9f',1.5);
 rect(c,-78,-193,90,63,10,'#b2d0cd','#ead7b8',3);mango(c,-35,-160,18);
 line(c,[[-155,-55],[-188,-55],[-188,-182],[-105,-182]],'#af98b6',18);line(c,[[-155,-55],[-188,-55],[-188,-182],[-105,-182]],'#d7b8c4',11);
 for(let i=0;i<3;i++)cloud(c,94+i*30,-257-i*35,.28+i*.1);
 rect(c,18,-65,57,69,8,'#f4cc86','#b69b9b',2);rect(c,25,-55,43,15,3,'#b4b9b7');c.restore();
}
function liaoning(c,factoryMode){
 path(c,'M0 328Q350 230 651 308Q1000 253 1290 320Q1570 258 1800 317V540H0Z','#c8c4b4',null);
 if(factoryMode){factory(c,410,390,.95);factory(c,1080,391,.80);factory(c,1600,393,.73);}
 else{
  for(let i=0;i<7;i++){
   const x=130+i*268;rect(c,x-80,278,160,110,3,'#dbaa9d','#a99099',1.5);tileRoof(c,x,260,203,'#8c9fa2');rect(c,x-22,310,44,78,12,'#c0ad96','#ead5b2',3);
   for(const dx of [-58,37])window(c,x+dx,306,22,36);
   for(const dx of [-67,67])lantern(c,x+dx,282,.62);
  }
  for(const x of [380,920,1510])roundTree(c,x,403,.83,'#bbc18c');
 }
 c.fillStyle='#d7ceb0';c.fillRect(0,411,1800,129);
 for(let i=0;i<35;i++){const x=(i*107)%1800,y=430+(i*23)%100;line(c,[[x,y],[x+50,y]],'#bfaf9c88',2);}
}
function panorama(theme,industrial=false){
 const key=theme+(industrial?'-factory':'');if(bgCache.has(key))return bgCache.get(key);
 const cv=document.createElement('canvas');cv.width=2700;cv.height=810;const c=cv.getContext('2d');c.scale(1.5,1.5);
 if(theme==='dublin')dublin(c);if(theme==='london')london(c);if(theme==='taj')taj(c);if(theme==='sichuan')sichuan(c);if(theme==='neimenggu')neimenggu(c);if(theme==='liaoning')liaoning(c,industrial);
 bgCache.set(key,cv);if(bgCache.size>7)bgCache.delete(bgCache.keys().next().value);return cv;
}
export function drawBackground(c,theme,cameraX=0,cameraY=0,tick=0,{motion=true}={}){
 const p=PALETTES[theme]||PALETTES.dublin;
 c.fillStyle=gradient(c,0,0,0,540,[[0,p.sky],[.72,p.horizon],[1,p.horizon]]);c.fillRect(0,0,960,540);
 ellipse(c,790,92,46,46,'#fff2bd');ellipse(c,790,92,57,57,'#fff4c729');
 for(let i=0;i<8;i++){const x=((i*237-cameraX*.08+(motion?tick*.028:0))%1500+1500)%1500-190;cloud(c,x,75+(i*53)%154,.4+(i%3)*.18);}
 const image=panorama(theme,theme==='liaoning'&&cameraX>6100);
 const offset=-(cameraX*.19)%1800,yy=-cameraY*.10;
 c.drawImage(image,offset,yy,1800,540);c.drawImage(image,offset+1800,yy,1800,540);
 // A nearer layer of foliage adds depth while leaving the landing area uncluttered.
 c.save();c.globalAlpha=.82;
 for(let i=-1;i<6;i++){
  const x=i*290-((cameraX*.38)%290),y=438-cameraY*.15;
  if(theme==='sichuan')bamboo(c,x,y,.59);
  else if(theme==='neimenggu'){ellipse(c,x,y+20,72,17,'#9bc676');}
  else if(theme==='taj')roundTree(c,x,y,.43,'#85b098');
  else roundTree(c,x,y,.37,theme==='liaoning'?'#b5be84':'#82b79b');
 }
 c.restore();
}
export function drawPlatform(c,s,theme,cameraX,cameraY){
 const p=PALETTES[theme],x=s.x-cameraX,y=s.y-cameraY,w=s.w;
 if(x+w<-40||x>1000)return;
 const top=theme==='taj'?'#fff2d5':theme==='london'?'#aca5d0':theme==='liaoning'&&s.x>7000?'#e9b65e':p.grass;
 const floor=s.kind==='solid'||s.kind==='ramp';
 if(s.kind==='ramp'){
  const endY=s.endY-cameraY;
  poly(c,[[x,y],[x+w,endY],[x+w,600],[x,600]],p.earth,INK,2.5);
  poly(c,[[x,y],[x+w,endY],[x+w,endY+14],[x,y+14]],top,INK,2.2);
  line(c,[[x+2,y+3],[x+w-2,endY+3]],'#fff0c7',2.5);return;
 }
 if(floor){
  const h=Math.max(0,Math.min(600-y,s.h));rect(c,x,y,w,h,3,gradient(c,x,y,x,y+240,[[0,p.earth],[1,theme==='sichuan'?'#789a7c':'#9c8490']]),INK,2.8);
  // Brick and stone seams; deterministic world positions keep them still under scrolling.
  c.save();c.beginPath();c.rect(x+2,y+16,w-4,Math.max(0,h-17));c.clip();
  for(let yy=y+35;yy<Math.min(y+h,570);yy+=31){line(c,[[x,yy],[x+w,yy]],'#f8dfb63a',1.8);const offset=Math.floor((yy-y)/31)%2*30;for(let xx=x+offset;xx<x+w;xx+=64)line(c,[[xx,yy],[xx,yy+31]],'#634e6b25',1.6);}
  c.restore();
  rect(c,x-2,y,w+4,16,4,top,INK,2.8);line(c,[[x+3,y+4],[x+w-3,y+4]],'#fff2cc',2.2);
  if(theme==='dublin'||theme==='sichuan'||theme==='neimenggu'){
   for(let xx=Math.max(x,Math.floor(-x/37)*37+x);xx<x+w&&xx<1000;xx+=37){if(xx<-20)continue;poly(c,[[xx+5,y+10],[xx+11,y+21],[xx+17,y+10]],top,null);}
  }
 }else{
  const trim=s.secret?'#e9c26b':s.extraHelpOnly?'#f5cc80':p.trim;
  rect(c,x-2,y+5,w+4,18,6,'#31415325');rect(c,x,y,w,20,6,trim,INK,2.4);rect(c,x+3,y+3,w-6,5,2,'#fff1c7');
  for(let xx=x+18;xx<x+w;xx+=27)line(c,[[xx,y+8],[xx,y+17]],'#947b753d',1.5);
  if(s.kind==='moving'){ellipse(c,x+14,y+21,5,5,'#798e9b',INK,1.4);ellipse(c,x+w-14,y+21,5,5,'#798e9b',INK,1.4);}
  if(s.extraHelpOnly){c.save();c.globalAlpha=.6;star(c,x+w/2,y+11,7,'#fff6cc',null);c.restore();}
 }
}
export function drawDecoration(c,theme,x,y,tick){
 c.save();c.translate(x,y);
 if(theme==='sichuan'){lantern(c,0,-74,.63);line(c,[[-3,0],[-3,-90],[12,-90]],'#628676',4);}
 else if(theme==='neimenggu')kite(c,0,-102,.75,'#dca4c1',Math.sin(tick/110)*.08);
 else{
  line(c,[[0,0],[0,-95]],'#54667d',4);path(c,'M0-94Q1-111 16-108L23-101',null,'#53677b',3);rect(c,13,-100,19,24,5,'#f9db91',INK,1.5);rect(c,10,-103,25,5,2,'#69788d',INK,1.2);
 }
 c.restore();
}
