/* Meow Wars v0.6 HD environment upgrade. Load after battle-d.js, before game-4-menu.js. */
(() => {
const V='0.6.0',B='20260918-HD1',SW=3840,DW=1360,T=Math.PI*2;
globalThis.MEOW_WARS_VERSION=V;globalThis.MEOW_WARS_BUILD=B;globalThis.__MEOW_WARS_BUILD__=V+'+'+B;
const extra=[
{id:'taj-mahal',name:'Taj Mahal',tagline:'Marble, fountains and zero respect for symmetry.',seed:1632,windMultiplier:.78,terrainSkin:'taj-garden',water:{y:414,height:68},terrainProfile:{baseRatio:.71,waveAAmplitudeRatio:.028,waveAFrequency:.014,waveBAmplitudeRatio:.012,waveBFrequency:.033,moundAmplitudeRatio:.018,minSurfaceRatio:.56,maxSurfaceRatio:.82},spawnFractions:[.08,.23,.38,.62,.77,.92],palette:{skyTop:'#72cdf4',skyBottom:'#d9f4ff',sun:'#fff0aa',terrainTop:'#896641',terrainDeep:'#5d452e',grass:'#5daa52',accent:'#f2d3a3'}},
{id:'oconnell-bridge',name:'O’Connell Bridge + Spire',tagline:'Across the Liffey, under the Spire, into trouble.',seed:1916,windMultiplier:1.12,terrainSkin:'dublin-quay',water:{y:400,height:112},terrainProfile:{baseRatio:.69,waveAAmplitudeRatio:.022,waveAFrequency:.013,waveBAmplitudeRatio:.011,waveBFrequency:.039,moundAmplitudeRatio:.01,minSurfaceRatio:.55,maxSurfaceRatio:.82},spawnFractions:[.08,.22,.36,.64,.78,.92],palette:{skyTop:'#70bddf',skyBottom:'#dcecf2',sun:'#fff1bd',terrainTop:'#676f72',terrainDeep:'#404a4d',grass:'#68895a',accent:'#4dd6b1'}},
{id:'westminster-bridge',name:'Westminster Bridge + Big Ben',tagline:'Mind the clock. Mind the bridge. Mind the bazooka.',seed:1859,windMultiplier:1.18,terrainSkin:'westminster-stone',water:{y:402,height:112},terrainProfile:{baseRatio:.69,waveAAmplitudeRatio:.021,waveAFrequency:.012,waveBAmplitudeRatio:.012,waveBFrequency:.036,moundAmplitudeRatio:.012,minSurfaceRatio:.54,maxSurfaceRatio:.82},spawnFractions:[.08,.23,.38,.62,.77,.92],palette:{skyTop:'#6ab9dc',skyBottom:'#d9edf5',sun:'#fff0b1',terrainTop:'#74726d',terrainDeep:'#4f4e4a',grass:'#75905c',accent:'#7ecf9b'}},
{id:'donabate-beach',name:'Donabate Beach',tagline:'Dunes, sea spray and artillery absolutely everywhere.',seed:1965,windMultiplier:1.42,terrainSkin:'beach-sand',water:{y:396,height:150},terrainProfile:{baseRatio:.68,waveAAmplitudeRatio:.042,waveAFrequency:.016,waveBAmplitudeRatio:.018,waveBFrequency:.043,moundAmplitudeRatio:.035,minSurfaceRatio:.48,maxSurfaceRatio:.84},spawnFractions:[.07,.21,.36,.64,.79,.93],palette:{skyTop:'#67c4ea',skyBottom:'#e4f6fb',sun:'#fff1a8',terrainTop:'#d4b27a',terrainDeep:'#9b7b4d',grass:'#6d9a58',accent:'#f0d59b'}}];
extra.forEach(a=>{if(!ARENAS.some(x=>x.id===a.id))ARENAS.push(a)});
const oldskins={'garden-siege':'garden-soil','rooftop-rumble':'rooftop-brick','junkyard-jamboree':'junkyard-earth'};ARENAS.forEach(a=>a.terrainSkin=a.terrainSkin||oldskins[a.id]||'garden-soil');
safeArena=id=>ARENAS.find(a=>a.id===id)||ARENAS[0];
const hx=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255]},shade=(h,d)=>{const c=hx(h).map(v=>Math.max(0,Math.min(255,v+d)));return'rgb('+c.join(',')+')'},mix=(a,b,t)=>{const x=hx(a),y=hx(b);return'rgb('+x.map((v,i)=>Math.round(v+(y[i]-v)*t)).join(',')+')'};
function rr(c,x,y,w,h,r){c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):(c.rect(x,y,w,h));}
function cloud(c,x,y,s,a=.7){c.save();c.globalAlpha=a;c.fillStyle='#fff';c.beginPath();[[0,0,190,48],[-85,-35,75,62],[10,-55,98,82],[110,-28,70,58]].forEach(p=>c.ellipse(x+p[0]*s,y+p[1]*s,p[2]*s,p[3]*s,0,0,T));c.fill();c.restore()}
function tree(c,x,y,s){
 c.fillStyle='#6e4930';rr(c,x-22*s,y-172*s,44*s,190*s,12*s);c.fill();
 c.strokeStyle='rgba(75,45,28,.45)';c.lineWidth=4*s;c.beginPath();c.moveTo(x-8*s,y-158*s);c.lineTo(x+5*s,y-20*s);c.stroke();
 c.fillStyle='#377d42';c.beginPath();c.arc(x-68*s,y-177*s,72*s,0,T);c.arc(x+62*s,y-190*s,82*s,0,T);c.arc(x-8*s,y-235*s,94*s,0,T);c.fill();
 c.fillStyle='#69b958';c.beginPath();c.arc(x-35*s,y-246*s,54*s,0,T);c.arc(x+55*s,y-238*s,48*s,0,T);c.arc(x-82*s,y-202*s,34*s,0,T);c.fill();
 c.fillStyle='rgba(255,255,220,.18)';c.beginPath();c.arc(x-28*s,y-270*s,28*s,0,T);c.fill()
}
function hill(c,y,color,amp,phase=0){
 c.fillStyle=color;c.beginPath();c.moveTo(0,1080);
 for(let x=0;x<=SW;x+=80)c.lineTo(x,y+Math.sin(x*.0032+phase)*amp+Math.sin(x*.007+phase*.7)*amp*.25);
 c.lineTo(SW,1080);c.closePath();c.fill()
}
function windows(c,x,y,w,h,cols,rows,on='#f5d885',off='#50677d'){
 const gapX=w/(cols+1),gapY=h/(rows+1),ww=Math.min(24,gapX*.32),hh=Math.min(34,gapY*.34);
 for(let r=1;r<=rows;r++)for(let k=1;k<=cols;k++){c.fillStyle=((r*7+k*5+Math.floor(x))%4===0)?on:off;c.fillRect(x+k*gapX-ww/2,y+r*gapY-hh/2,ww,hh)}
}
function lamp(c,x,y,s=1){
 c.strokeStyle='#263942';c.lineWidth=8*s;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-125*s);c.quadraticCurveTo(x,y-154*s,x+28*s,y-158*s);c.stroke();
 c.fillStyle='#21343c';c.beginPath();c.ellipse(x+31*s,y-155*s,24*s,13*s,0,0,T);c.fill();
 c.fillStyle='rgba(255,232,156,.88)';c.beginPath();c.ellipse(x+31*s,y-155*s,13*s,7*s,0,0,T);c.fill()
}
function bush(c,x,y,s=1,a='#376f42',b='#5ca953'){
 c.fillStyle=a;c.beginPath();c.arc(x-28*s,y,34*s,0,T);c.arc(x+25*s,y-4*s,38*s,0,T);c.arc(x,y-28*s,36*s,0,T);c.fill();
 c.fillStyle=b;c.beginPath();c.arc(x-9*s,y-35*s,22*s,0,T);c.arc(x+34*s,y-20*s,18*s,0,T);c.fill()
}
function birds(c,x,y,s=1){
 c.strokeStyle='rgba(49,78,96,.55)';c.lineWidth=4*s;
 for(let i=0;i<5;i++){let xx=x+i*75*s,yy=y+(i%2)*22*s;c.beginPath();c.arc(xx,yy,18*s,Math.PI*1.08,Math.PI*1.9);c.arc(xx+34*s,yy,18*s,Math.PI*1.1,Math.PI*1.92);c.stroke()}
}
function water(c,y,h,a='#62b1cb',b='#357d9a'){const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(0,y,SW,h);c.globalAlpha=.22;c.fillStyle='#fff';for(let r=0;r<7;r++)for(let x=(r%2)*90;x<SW;x+=260)c.fillRect(x,y+18+r*26,120,4);c.globalAlpha=1}
function sky(c,a,b,sun){const g=c.createLinearGradient(0,0,0,1080);g.addColorStop(0,a);g.addColorStop(1,b);c.fillStyle=g;c.fillRect(0,0,SW,1080);if(sun){c.fillStyle=sun;c.beginPath();c.arc(3210,220,125,0,T);c.fill()}}
function garden(f,m,n){
 sky(f,'#5ec3ef','#e9fbff','#ffe790');hill(f,805,'#a8d9b0',135,.8);hill(f,880,'#80c59a',105,2.3);
 [350,1120,2080,3070].forEach((x,i)=>cloud(f,x,215+(i%2)*95,.82+(i%3)*.12,.56));birds(f,2600,260,1.1);
 const wc=['#f4b96e','#ea8f87','#aebfe7','#e8c48b','#bfa5d7'];
 for(let i=0;i<12;i++){let x=-90+i*340,y=1012-(i%3)*35,w=245,h=250+(i%2)*34;
   m.fillStyle='rgba(57,81,104,.18)';m.fillRect(x+14,y-h+14,w,h);
   m.fillStyle=wc[i%wc.length];m.fillRect(x,y-h,w,h);
   m.fillStyle=i%2?'#4e6686':'#b95649';m.beginPath();m.moveTo(x-28,y-h);m.lineTo(x+w*.5,y-h-132);m.lineTo(x+w+28,y-h);m.closePath();m.fill();
   m.fillStyle='#f7f2df';m.fillRect(x+18,y-h+28,w-36,12);
   for(let xx=x+32;xx<x+w-35;xx+=68){m.fillStyle='#6ea4c4';m.fillRect(xx,y-h+72,34,47);m.fillStyle='#dff6ff';m.fillRect(xx+5,y-h+77,10,14)}
   m.fillStyle='#875441';m.fillRect(x+w*.43,y-82,42,82);m.fillStyle='#fff0c9';m.fillRect(x+w*.43+7,y-70,11,16);
   if(i%3===0){m.fillStyle='#7d5443';m.fillRect(x+w*.72,y-h-88,28,92);m.fillStyle='#9f6450';m.fillRect(x+w*.69,y-h-94,34,12)}
 }
 for(let x=90;x<SW;x+=510)tree(m,x,1060,1.05);
 for(let x=115;x<SW;x+=350)bush(m,x,1050,.72);
 n.fillStyle='#f5eedb';for(let x=0;x<SW;x+=108){n.fillRect(x,92,26,238);n.beginPath();n.moveTo(x,92);n.lineTo(x+13,60);n.lineTo(x+26,92);n.fill()}
 n.fillRect(0,160,SW,24);n.fillRect(0,275,SW,24);
 for(let x=55;x<SW;x+=180){let col=['#fa647f','#ffd84e','#ffffff','#72bfff'][Math.floor(x/180)%4];n.strokeStyle='#3a8844';n.lineWidth=5;n.beginPath();n.moveTo(x,345);n.lineTo(x,303);n.stroke();n.fillStyle=col;for(let a=0;a<4;a++){let an=a*Math.PI/2;n.beginPath();n.arc(x+Math.cos(an)*13,300+Math.sin(an)*13,13,0,T);n.fill()}n.fillStyle='#f0b83b';n.beginPath();n.arc(x,300,7,0,T);n.fill()}
}
function roof(f,m,n){
 sky(f,'#10152f','#a85878','#ffdda5');cloud(f,570,235,.72,.18);cloud(f,2950,180,.8,.15);
 f.fillStyle='rgba(255,225,180,.95)';f.beginPath();f.arc(3220,190,105,0,T);f.fill();hill(f,850,'#252b45',120,1.2);
 let x=-80,i=0,p=['#252d48','#303a57','#3c4663','#222940','#47465f'];
 while(x<SW){let w=165+(i*67%145),h=330+(i*91%430),y=1060-h;m.fillStyle='rgba(14,18,35,.22)';m.fillRect(x+14,y+15,w,h);m.fillStyle=p[i%p.length];m.fillRect(x,y,w,h);m.fillStyle=i%3?'#59627a':'#777088';m.fillRect(x,y,w,14);windows(m,x,y,w,h,Math.max(2,Math.floor(w/65)),Math.max(3,Math.floor(h/95)),'#ffd67d','#42516d');if(i%4===1){m.fillStyle='#1d2437';m.fillRect(x+w*.62,y-70,16,70);m.fillRect(x+w*.62-9,y-73,34,8)}x+=w+20;i++}
 m.fillStyle='#67717f';m.beginPath();m.ellipse(2050,405,190,70,0,0,T);m.fill();m.fillRect(1860,405,380,125);m.fillStyle='#48515e';m.fillRect(1885,420,330,16);m.strokeStyle='#4b5360';m.lineWidth=24;m.beginPath();m.moveTo(1910,530);m.lineTo(1860,785);m.moveTo(2190,530);m.lineTo(2250,785);m.moveTo(1915,620);m.lineTo(2220,620);m.stroke();
 n.fillStyle='#8e4c3d';n.fillRect(220,70,150,340);n.fillStyle='#b66c53';n.fillRect(205,70,180,24);n.fillRect(3040,24,160,386);n.fillRect(3025,24,190,24);
 for(let x=520;x<2860;x+=620){n.fillStyle='#3e4d5f';n.fillRect(x,210,180,92);n.fillStyle='#263446';n.fillRect(x+18,227,144,18)}
 n.strokeStyle='#26313f';n.lineWidth=7;n.beginPath();n.moveTo(430,265);n.quadraticCurveTo(1900,350,3360,235);n.stroke();
 for(let x=520;x<3340;x+=190){n.fillStyle=(Math.floor(x/190)%3===0)?'#ffcf65':(Math.floor(x/190)%3===1?'#ff6c91':'#75d8ff');n.beginPath();n.arc(x,274+Math.sin(x*.007)*22,10,0,T);n.fill()}
}
function junk(f,m,n){
 sky(f,'#e77e43','#ffd28c','#fff0ad');hill(f,820,'#bb7654',130,.3);hill(f,895,'#885f50',110,1.7);birds(f,2820,260,.9);
 m.fillStyle='#514b47';m.fillRect(0,870,SW,220);
 m.strokeStyle='#b68a2e';m.lineWidth=30;[470,3020].forEach(x=>{m.beginPath();m.moveTo(x,910);m.lineTo(x,300);m.lineTo(x+(x<1000?570:-570),300);m.stroke();m.strokeStyle='#826426';m.lineWidth=7;m.beginPath();m.moveTo(x,335);m.lineTo(x+(x<1000?500:-500),335);m.stroke();m.strokeStyle='#b68a2e';m.lineWidth=30});
 let q=['#8f5745','#b36d43','#47717f','#77604c','#3f474d','#966d59'];
 for(let i=0;i<27;i++){let x=i*150,y=820+(i%4)*34;m.fillStyle=q[i%q.length];m.beginPath();m.moveTo(x,1020);m.lineTo(x+70,y-230-(i%3)*30);m.lineTo(x+166,1020);m.fill();m.fillStyle='rgba(255,230,180,.14)';m.fillRect(x+47,y-166,56,8)}
 for(let i=0;i<18;i++){let x=55+i*220,yy=245+(i%3)*43;n.fillStyle='#3a3e43';n.beginPath();n.arc(x,yy,58,0,T);n.fill();n.fillStyle='#17191c';n.beginPath();n.arc(x,yy,25,0,T);n.fill();n.strokeStyle='#696f73';n.lineWidth=6;n.stroke()}
 for(let x=260;x<SW;x+=650){n.fillStyle='#9a5742';rr(n,x,70,115,145,15);n.fill();n.fillStyle='#c88a56';n.fillRect(x-8,103,131,13);n.fillRect(x-8,175,131,13)}
 for(let x=510;x<SW;x+=900){n.fillStyle='#54636a';rr(n,x,220,320,86,32);n.fill();n.fillStyle='#75919e';n.beginPath();n.moveTo(x+65,220);n.lineTo(x+120,155);n.lineTo(x+235,155);n.lineTo(x+285,220);n.fill();n.fillStyle='#262c31';n.beginPath();n.arc(x+70,304,38,0,T);n.arc(x+255,304,38,0,T);n.fill()}
 n.fillStyle='rgba(255,203,66,.9)';for(let x=0;x<SW;x+=160){n.save();n.translate(x,390);n.rotate(-.55);n.fillRect(0,0,85,18);n.restore()}
}
function taj(f,m,n){
 sky(f,'#62c5ef','#effbff','#ffe99b');cloud(f,520,210,.78,.42);cloud(f,3140,270,.68,.32);birds(f,2750,260,.85);hill(f,950,'#b9d9bb',60,1.6);
 m.fillStyle='rgba(91,82,71,.14)';m.fillRect(1110,668,1620,300);m.fillStyle='#e9e3d7';m.fillRect(1080,650,1680,310);m.fillStyle='#faf8f0';m.fillRect(1310,500,1220,460);m.fillStyle='#f4efe5';m.fillRect(1600,390,640,160);
 m.fillStyle='#fbf8ef';m.beginPath();m.moveTo(1645,398);m.bezierCurveTo(1680,235,1805,118,1920,92);m.bezierCurveTo(2035,118,2160,235,2195,398);m.quadraticCurveTo(1920,500,1645,398);m.fill();
 m.strokeStyle='#b9b2a5';m.lineWidth=10;m.beginPath();m.moveTo(1920,94);m.lineTo(1920,22);m.stroke();m.fillStyle='#b79c60';m.beginPath();m.arc(1920,18,10,0,T);m.fill();
 [1490,2350].forEach(x=>{m.fillStyle='#f7f3e9';m.fillRect(x-115,470,230,180);m.beginPath();m.arc(x,470,115,Math.PI,0);m.fill();m.fillStyle='#d7cfc1';m.fillRect(x-92,510,184,12)});
 [1040,1245,2595,2800].forEach(x=>{m.fillStyle='#eee9df';m.fillRect(x-38,340,76,590);m.fillStyle='#d5cec0';m.fillRect(x-54,485,108,19);m.fillRect(x-54,670,108,19);m.fillRect(x-54,805,108,17);m.fillStyle='#faf7ef';m.beginPath();m.arc(x,332,55,Math.PI,0);m.fill();m.fillStyle='#bda76c';m.fillRect(x-4,260,8,80);m.beginPath();m.arc(x,258,8,0,T);m.fill()});
 m.fillStyle='#384d53';for(let x=1435;x<=2405;x+=194){rr(m,x-38,690,76,148,38);m.fill();m.fillStyle='#88a7aa';m.fillRect(x-4,690,8,148);m.fillStyle='#384d53'}
 m.fillStyle='#d5cdc0';for(let x=1400;x<2470;x+=88)m.fillRect(x,575,4,52);
 n.fillStyle='#4a814d';n.fillRect(0,342,SW,120);for(let x=80;x<SW;x+=260){bush(n,x,350,.7,'#356c42','#4e9650');n.fillStyle='#316f42';n.beginPath();n.moveTo(x+80,350);n.lineTo(x+118,155);n.lineTo(x+156,350);n.fill()}
 water(n,105,226,'#75bfd5','#438ba5');n.fillStyle='#dccca5';n.fillRect(1260,90,1320,22);n.fillRect(1260,322,1320,22);n.fillStyle='rgba(255,255,255,.25)';for(let y=142;y<300;y+=32)n.fillRect(1340,y,1160,4);
}
function dub(f,m,n){sky(f,'#6cb7d8','#e8f3f6');cloud(f,480,250,.95,.55);cloud(f,1900,190,1.2,.42);let cs=['#b76b55','#d2a06f','#9d6d58','#c7b397','#8f7e72'];for(let i=0;i<16;i++){let x=i*250,h=260+(i%4)*55;m.fillStyle=cs[i%5];m.fillRect(x,620-h,220,h)}m.strokeStyle='#e2eaec';m.lineWidth=14;m.beginPath();m.moveTo(2270,605);m.lineTo(2270,20);m.stroke();water(m,640,350,'#5d9fb4','#386f86');n.fillStyle='#d3c8b5';n.fillRect(900,70,2040,155);n.fillStyle='#a69a86';n.fillRect(900,70,2040,24);n.fillRect(900,205,2040,24);n.fillStyle='#4d8fa6';for(let i=0;i<6;i++){let x=1090+i*330;n.beginPath();n.arc(x,226,112,Math.PI,T);n.lineTo(x+112,230);n.lineTo(x-112,230);n.fill()}}
function west(f,m,n){sky(f,'#69b8da','#e6f2f6');cloud(f,520,245,.95,.45);m.fillStyle='#b78b50';m.fillRect(1200,500,1840,420);m.fillStyle='#c79a5b';m.fillRect(1340,385,1550,540);m.fillStyle='#b38a50';m.fillRect(720,195,330,735);m.fillStyle='#e9dfc9';m.beginPath();m.arc(885,420,108,0,T);m.fill();m.strokeStyle='#4b4438';m.lineWidth=12;m.stroke();m.strokeStyle='#5d5549';m.lineWidth=8;m.beginPath();m.moveTo(885,420);m.lineTo(885,350);m.moveTo(885,420);m.lineTo(945,447);m.stroke();m.fillStyle='#5d4b34';m.beginPath();m.moveTo(720,195);m.lineTo(885,18);m.lineTo(1050,195);m.fill();water(m,630,360,'#619ab0','#3d7085');n.fillStyle='#6d8f78';n.fillRect(520,95,2770,115);n.fillStyle='#557765';n.fillRect(500,72,2810,30);n.fillStyle='#54869a';for(let i=0;i<7;i++){let x=720+i*390;n.beginPath();n.arc(x,210,145,Math.PI,T);n.lineTo(x+145,230);n.lineTo(x-145,230);n.fill()}}
function beach(f,m,n){sky(f,'#67c2e8','#e9f8fb','#fff0a4');cloud(f,590,230,.8,.5);m.fillStyle='#6d8d77';m.beginPath();m.moveTo(0,650);m.quadraticCurveTo(520,420,1050,640);m.quadraticCurveTo(1600,520,2080,650);m.lineTo(2080,780);m.lineTo(0,780);m.fill();m.fillStyle='#789682';m.beginPath();m.moveTo(2800,650);m.quadraticCurveTo(3280,485,3840,635);m.lineTo(3840,780);m.lineTo(2800,780);m.fill();water(m,650,430);let g=n.createLinearGradient(0,0,0,500);g.addColorStop(0,'#e3ca91');g.addColorStop(1,'#c2a46d');n.fillStyle=g;n.fillRect(0,160,SW,500);n.fillStyle='#7a9a59';for(let x=0;x<SW;x+=260){n.beginPath();n.moveTo(x,300);n.quadraticCurveTo(x+120,80,x+260,300);n.lineTo(x+260,430);n.lineTo(x,430);n.fill()}}
const draw={'garden-siege':garden,'rooftop-rumble':roof,'junkyard-jamboree':junk,'taj-mahal':taj,'oconnell-bridge':dub,'westminster-bridge':west,'donabate-beach':beach};
function layer(s,k,h,d){if(s.textures.exists(k))s.textures.remove(k);let t=s.textures.createCanvas(k,SW,h),c=t.getContext();c.clearRect(0,0,SW,h);return{t,c,d}}
GameScene.prototype.createSky=function(){let p=this.arena.palette;this.cameras.main.setBackgroundColor(p.skyTop);let f=layer(this,'mw-hd-far',1080,-30),m=layer(this,'mw-hd-mid',1080,-27),n=layer(this,'mw-hd-near',720,-18);(draw[this.arena.id]||garden)(f.c,m.c,n.c);f.t.refresh();m.t.refresh();n.t.refresh();this.environmentLayers=[this.add.image(-40,-4,'mw-hd-far').setOrigin(0).setDepth(f.d).setDisplaySize(DW,382),this.add.image(-40,110,'mw-hd-mid').setOrigin(0).setDepth(m.d).setDisplaySize(DW,382),this.add.image(-40,360,'mw-hd-near').setOrigin(0).setDepth(n.d).setDisplaySize(DW,255)];this.environmentLayerBaseX=[-40,-40,-40];this.waterFx=this.add.graphics().setDepth(-17);this.environmentClock=0;let r=this.add.rectangle(154,88,268,44,0x10223e,.86).setDepth(90);r.setStrokeStyle(2,hexNumber(p.accent),.88);this.add.text(154,82,this.arena.name.toUpperCase(),{fontFamily:'Arial Black, Arial',fontSize:'14px',color:'#fff'}).setOrigin(.5).setDepth(91);this.add.text(154,101,'v'+V+'  •  '+B,{fontFamily:'Arial',fontSize:'10px',color:'#a9dfff'}).setOrigin(.5).setDepth(91)};
const os=GameScene.prototype.syncSprites;GameScene.prototype.syncSprites=function(){os.call(this);if(!this.environmentLayers)return;let x=this.cats.length?(this.activeCat()?.x??WIDTH/2):WIDTH/2,n=x/WIDTH-.5,fs=[18,34,56];this.environmentLayers.forEach((o,i)=>o.x=this.environmentLayerBaseX[i]-n*fs[i]);if(!this.arena.water)return;this.environmentClock+=.018;this.waterFx.clear();let w=this.arena.water;for(let r=0;r<5;r++){let y=w.y+7+r*Math.max(7,w.height/7);this.waterFx.lineStyle(2,0xe9fbff,.22-r*.025);this.waterFx.beginPath();for(let x=-30;x<=WIDTH+30;x+=24){let yy=y+Math.sin(x*.045+this.environmentClock*(1.7+r*.12))*(2.5+r*.3);x<0?this.waterFx.moveTo(x,yy):this.waterFx.lineTo(x,yy)}this.waterFx.strokePath()}};
GameScene.prototype.paintTerrainTexture=function(){let t=this.terrainTexture,c=t.getContext(),q=this.terrain,{rows,cols,cellSize,data}=q,skin=this.arena.terrainSkin,top=this.arena.palette.terrainTop,deep=this.arena.palette.terrainDeep;c.clearRect(0,0,WIDTH,HEIGHT);for(let y=0;y<rows;y++){let r=y/rows;c.fillStyle=r<.74?top:r<.88?mix(top,deep,.55):deep;let st=-1;for(let x=0;x<=cols;x++){let solid=x<cols&&data[y*cols+x]===1;if(solid&&st<0)st=x;if((!solid||x===cols)&&st>=0){c.fillRect(st*cellSize,y*cellSize,(x-st)*cellSize,cellSize+.7);st=-1}}}let grass=['garden-soil','taj-garden'].includes(skin),sand=skin==='beach-sand',stone=['rooftop-brick','dublin-quay','westminster-stone'].includes(skin),edge=sand?'#ead5a1':stone?shade(top,22):this.arena.palette.grass;c.fillStyle=shade(edge,-20);for(let x=0;x<cols;x++){let px=x*cellSize,py=surfaceY(q,px);if(py<HEIGHT)c.fillRect(px,py+6,cellSize+.6,6)}c.fillStyle=edge;for(let x=0;x<cols;x++){let px=x*cellSize,py=surfaceY(q,px);if(py>=HEIGHT)continue;c.fillRect(px,py,cellSize+.6,stone?8:7);let h=(x*31+this.arena.seed)%37;if(grass&&h%9===0){c.fillStyle=shade(edge,18);c.fillRect(px+1,py-5,2,6);c.fillStyle=edge}if(sand&&h%7===0){c.fillStyle='#b99662';c.fillRect(px+1,py+12,3,2);c.fillStyle=edge}}for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){if(data[y*cols+x]!==1)continue;let px=x*cellSize,py=y*cellSize;if(py<surfaceY(q,px)+16)continue;let h=(x*67+y*43+this.arena.seed)%211;if(h)continue;if(skin==='rooftop-brick'){c.fillStyle='#4e515b';c.fillRect(px,py,11,4)}else if(skin==='dublin-quay'||skin==='westminster-stone'){c.fillStyle='#899092';c.fillRect(px,py,10,4)}else if(skin==='junkyard-earth'){c.fillStyle='#626b6c';c.fillRect(px,py,8,4)}else if(sand){c.fillStyle='#8c744f';c.fillRect(px,py,5,3)}else{c.fillStyle=shade(top,24);c.fillRect(px,py,6,3)}}t.refresh()};
})();
