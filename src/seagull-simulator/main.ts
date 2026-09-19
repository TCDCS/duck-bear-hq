import Phaser from 'phaser';

const GAME_W=1280;
const GAME_H=720;
const FOOD_TYPES=[
  {key:'food-chips',name:'chips',value:20},
  {key:'food-roll',name:'chicken fillet roll',value:50},
  {key:'food-coffee',name:'coffee',value:15},
  {key:'food-ice',name:'ice cream',value:30},
  {key:'food-spice',name:'spice bag',value:75}
] as const;
const WORLD_W=8800;
const WORLD_H=1800;
const VERSION='0.3.0-alpha';

type Target = {
  person: Phaser.Physics.Arcade.Sprite;
  food: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  value: number;
  name: string;
  stolen: boolean;
  vx: number;
  vy: number;
  panicUntil: number;
  temperament: 'oblivious'|'suspicious'|'runner'|'defender';
};

type Vehicle = {
  sprite: Phaser.Physics.Arcade.Sprite;
  speed: number;
  lane: number;
  minX?: number;
  maxX?: number;
};

const controls={
  x:0,
  y:0,
  dive:false,
  diveHeld:false,
  grab:false,
  boost:false,
  consumeDive(){const v=this.dive;this.dive=false;return v;},
  consumeGrab(){const v=this.grab;this.grab=false;return v;}
};

let audioCtx:AudioContext|null=null;
let soundEnabled=localStorage.getItem('seagull-muted')!=='1';
function initAudio(){
  if(!soundEnabled)return;
  if(new URLSearchParams(location.search).has('smoke'))return;
  try{
    const Ctx=window.AudioContext||(window as any).webkitAudioContext;
    if(Ctx){audioCtx=new Ctx();audioCtx.resume().catch(()=>{});}
  }catch{}
}
function tone(freq:number,duration=.08,type:OscillatorType='sine',gain=.035,slide=0){
  if(!soundEnabled||!audioCtx)return;
  const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,now);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),now+duration);
  g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
  o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+duration+.02);
}
function sfx(name:'grab'|'dive'|'hit'|'wanted'|'target'){
  if(name==='grab'){tone(520,.06,'square',.025,220);setTimeout(()=>tone(880,.09,'triangle',.03,180),45);}
  if(name==='dive'){tone(240,.13,'sawtooth',.018,-120);}
  if(name==='hit'){tone(120,.16,'square',.035,-55);}
  if(name==='wanted'){tone(620,.07,'square',.025,0);setTimeout(()=>tone(760,.08,'square',.025,0),80);}
  if(name==='target')tone(440,.045,'triangle',.014,90);
}
function haptic(ms:number){try{navigator.vibrate?.(ms);}catch{}}

const $=(id:string)=>document.getElementById(id);
function setText(id:string,value:string){const el=$(id);if(el)el.textContent=value;}
function setWanted(level:number){
  const el=$('wantedStars');
  if(el)el.textContent='★'.repeat(level)+'☆'.repeat(5-level);
}
function setFeathers(n:number){setText('feathers','●'.repeat(n)+'○'.repeat(3-n));}

function setupStick(){
  const zone=$('stickZone') as HTMLElement|null;
  const knob=$('stickKnob') as HTMLElement|null;
  if(!zone||!knob)return;
  let active=-1;
  const update=(e:PointerEvent)=>{
    const r=zone.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;
    const max=r.width*.29;
    const len=Math.hypot(dx,dy)||1;
    if(len>max){dx=dx/len*max;dy=dy/len*max;}
    controls.x=dx/max;controls.y=dy/max;
    knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
  };
  zone.addEventListener('pointerdown',e=>{active=e.pointerId;zone.setPointerCapture(active);update(e);});
  zone.addEventListener('pointermove',e=>{if(e.pointerId===active)update(e);});
  const stop=(e:PointerEvent)=>{if(e.pointerId!==active)return;active=-1;controls.x=controls.y=0;knob.style.transform='translate(-50%,-50%)';};
  zone.addEventListener('pointerup',stop);zone.addEventListener('pointercancel',stop);
}
function bindButton(id:string,key:'dive'|'grab'|'boost'){
  const el=$(id);if(!el)return;
  if(key==='boost'){
    el.addEventListener('pointerdown',()=>controls.boost=true);
    ['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,()=>controls.boost=false));
  }else if(key==='dive'){
    el.addEventListener('pointerdown',()=>{controls.dive=true;controls.diveHeld=true;});
    ['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,()=>controls.diveHeld=false));
  }else el.addEventListener('pointerdown',()=>{controls.grab=true;});
}

class DameStreetScene extends Phaser.Scene{
  gull!:Phaser.Physics.Arcade.Sprite;
  shadow!:Phaser.GameObjects.Ellipse;
  targetMarker!:Phaser.GameObjects.Arc;
  targets:Target[]=[];
  gardai:Phaser.Physics.Arcade.Sprite[]=[];
  vehicles:Vehicle[]=[];
  keys:any;
  altitude=.7;
  altitudeTarget=.7;
  grounded=false;
  toldWaddle=false;
  score=0;
  stolen=0;
  wanted=0;
  heat=0;
  feathers=3;
  combo=1;
  lastTheftAt=0;
  lastHeatEvent=0;
  missionIndex=0;
  missionProgress=0;
  missionTarget=3;
  missionKind:'any'|'chips'|'roll'|'spice'='any';
  selected:Target|null=null;
  diveUntil=0;
  invulnerableUntil=0;
  ended=false;
  lastWanted=0;
  carryText!:Phaser.GameObjects.Text;
  districtText!:Phaser.GameObjects.Text;
  lastZone='';

  constructor(){super('DameStreet');}

  preload(){
    const base='/games/seagull-simulator/art/';
    this.load.svg('gull-0',base+'gull-up.svg',{width:140,height:100});
    this.load.svg('gull-1',base+'gull-mid.svg',{width:140,height:100});
    this.load.svg('gull-2',base+'gull-down.svg',{width:140,height:100});
    this.load.svg('gull-walk',base+'gull-walk.svg',{width:120,height:110});
    this.load.svg('garda',base+'garda.svg',{width:76,height:112});
    this.load.svg('bus',base+'dublin-bus.svg',{width:220,height:140});
    this.load.svg('luas',base+'luas.svg',{width:260,height:88});
  }

  create(){
    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.setBackgroundColor('#92d7ee');
    this.drawWorld();
    this.makeTextures();
    this.busker(5850,930);this.busker(6650,1040);
    this.spawnTraffic();
    this.spawnPeople();
    this.spawnCameos();
    this.spawnGarda(1840,610,false);
    this.spawnGarda(4210,640,false);

    this.shadow=this.add.ellipse(520,780,74,24,0x173747,.25).setDepth(39);
    this.gull=this.physics.add.sprite(520,690,'gull-1').setDepth(60).setDisplaySize(118,84);
    this.gull.setCollideWorldBounds(true);
    this.gull.body!.setCircle(28,14,12);
    this.anims.create({key:'fly',frames:[{key:'gull-0'},{key:'gull-1'},{key:'gull-2'},{key:'gull-1'}],frameRate:8,repeat:-1});
    this.gull.play('fly');
    const startArea=new URLSearchParams(location.search).get('area');
    if(startArea==='college')this.gull.setPosition(4080,690);
    if(startArea==='grafton')this.gull.setPosition(5950,760);
    if(startArea==='green')this.gull.setPosition(7700,1000);
    this.cameras.main.startFollow(this.gull,true,.09,.09);
    this.cameras.main.setFollowOffset(0,190);
    this.cameras.main.setZoom(1.02);

    this.targetMarker=this.add.circle(0,0,62,0xffd54f,.08).setStrokeStyle(5,0xffd54f,.95).setVisible(false).setDepth(30);
    this.carryText=this.add.text(0,0,'',{fontFamily:'Trebuchet MS',fontSize:'18px',fontStyle:'bold',color:'#ffffff',stroke:'#203340',strokeThickness:5}).setOrigin(.5).setDepth(80);
    this.districtText=this.add.text(70,80,'DAME STREET',{fontFamily:'Arial Black, sans-serif',fontSize:'28px',color:'#fff7d2',stroke:'#213b4d',strokeThickness:8}).setScrollFactor(0).setDepth(200);

    this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,SHIFT')||{};
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      if(p.x<GAME_W*.48)return;
      const wp=this.cameras.main.getWorldPoint(p.x,p.y);
      let best:Target|null=null,bestD=120;
      for(const t of this.targets){
        if(t.stolen)continue;
        const d=Phaser.Math.Distance.Between(wp.x,wp.y,t.person.x,t.person.y);
        if(d<bestD){best=t;bestD=d;}
      }
      if(best)this.select(best);
    });

    setText('version',VERSION);
    setText('score','0');
    setText('stolen','0');
    setWanted(0);setFeathers(3);this.setMission(0);
    this.time.delayedCall(900,()=>this.toast('Find food. Dive low. Grab it. Get out.'));
    const tutorialKey='seagull-tutorial-seen-v1';
    if(!new URLSearchParams(location.search).has('smoke')&&!localStorage.getItem(tutorialKey)){
      localStorage.setItem(tutorialKey,'1');
      this.time.delayedCall(3400,()=>this.toast('HOLD DIVE TO SWOOP DOWN · KEEP HOLDING TO LAND'));
      this.time.delayedCall(6200,()=>this.toast('GRAB UP CLOSE · FLAP TO ESCAPE OR TAKE OFF'));
    }
    document.documentElement.dataset.seagullReady='1';
    if(new URLSearchParams(location.search).has('exercise')){
      document.documentElement.dataset.seagullExerciseScheduled='1';
      try{
        const t=this.targets.find(q=>!q.stolen);
        if(!t){document.documentElement.dataset.seagullExerciseError='no-target';}
        else{
          this.gull.setPosition(t.person.x+28,t.person.y);
          this.altitude=.08;this.altitudeTarget=.08;this.selected=t;
          this.tryGrab(performance.now());
          document.documentElement.dataset.seagullExercised=t.stolen&&this.stolen===1&&this.score>0?'1':'0';
        }
      }catch(err){
        document.documentElement.dataset.seagullExerciseError=String(err).slice(0,120);
      }
    }
  }

  drawWorld(){
    const g=this.add.graphics().setDepth(0);
    g.fillStyle(0xb9e1e7);g.fillRect(0,0,WORLD_W,WORLD_H);
    // upper city blocks
    g.fillStyle(0xe6d1aa);g.fillRect(0,0,WORLD_W,490);
    g.fillStyle(0xc8b184);g.fillRect(0,455,WORLD_W,45);
    // upper pavement
    g.fillStyle(0xd8d1bf);g.fillRect(0,490,WORLD_W,250);
    for(let x=0;x<WORLD_W;x+=70){g.lineStyle(2,0xb6afa2,.55);g.lineBetween(x,490,x+45,740);}
    // road and bus lanes
    g.fillStyle(0x536b79);g.fillRect(0,740,WORLD_W,510);
    g.fillStyle(0x8d5d58,.55);g.fillRect(0,760,WORLD_W,110);
    g.fillStyle(0x8d5d58,.55);g.fillRect(0,1120,WORLD_W,110);
    g.lineStyle(5,0xf8e9bc,.9);
    g.lineBetween(0,895,WORLD_W,895);g.lineBetween(0,1095,WORLD_W,1095);
    g.lineStyle(4,0xf8f4df,.75);
    for(let x=40;x<WORLD_W;x+=95){g.lineBetween(x,990,x+50,990);}
    // lower pavement / park edge tease
    g.fillStyle(0xd6d0c0);g.fillRect(0,1250,WORLD_W,310);
    g.fillStyle(0x5fa85a);g.fillRect(0,1560,WORLD_W,240);
    for(let x=40;x<WORLD_W;x+=210){
      g.fillStyle(0x496b47);g.fillRect(x+32,1505,15,80);
      g.fillStyle(0x4d9d55);g.fillCircle(x+40,1490,50);g.fillStyle(0x72bd60);g.fillCircle(x+15,1478,30);
    }

    const shops=[
      {x:60,w:470,name:'CENTRA',c:0x167daf,s:0xffc52d},
      {x:540,w:500,name:'SuperValu',c:0xb63036,s:0xffffff},
      {x:1050,w:430,name:'INSOMNIA',c:0x8d2c34,s:0xffffff},
      {x:1490,w:520,name:"McDONALD'S",c:0x202426,s:0xffffff},
      {x:2020,w:450,name:'SPAR',c:0x327b45,s:0xffffff},
      {x:2480,w:520,name:'BOOTS',c:0x244b9d,s:0xffffff},
      {x:3010,w:520,name:'DUBLIN DELI',c:0xd17832,s:0xfff1c5}
    ];
    for(const s of shops)this.shop(s.x,70,s.w,390,s.name,s.c,s.s);
    this.collegeGreen(3600);
    this.graftonStreet(5200);
    this.stephensGreen(7000);
    // street furniture
    for(let x=160;x<5200;x+=300)this.lamp(x,610);
    for(let x=280;x<5200;x+=520)this.bin(x,680);
    for(let x=420;x<5200;x+=690)this.flowerBasket(x,545);
    for(let x=690;x<5200;x+=920)this.cafeBoard(x,676,x%1840<900?'COFFEE':'DELI');
    for(let x=120;x<5200;x+=115){g.fillStyle(0x2e3f49);g.fillRoundedRect(x,720,13,36,5);}
    // crossings
    for(const x of [980,2220,3920,4780]){
      g.fillStyle(0xf3f0dc,.9);
      for(let i=0;i<8;i++)g.fillRect(x+i*24,885,13,205);
    }
    this.add.text(110,796,'BUS LANE',{fontFamily:'Arial Black',fontSize:'28px',color:'#e9dcca'}).setDepth(2).setAngle(-2);
    this.add.text(2660,1155,'BUS LANE',{fontFamily:'Arial Black',fontSize:'28px',color:'#e9dcca'}).setDepth(2).setAngle(-2);
    g.lineStyle(5,0x293a42,.9);g.lineBetween(3600,895,WORLD_W,895);g.lineBetween(3600,955,WORLD_W,955);
    g.lineStyle(2,0xc5d1ce,.85);g.lineBetween(3600,904,WORLD_W,904);g.lineBetween(3600,946,WORLD_W,946);
    this.add.text(3890,1085,'COLLEGE GREEN',{fontFamily:'Arial Black',fontSize:'30px',color:'#f3e9c8',stroke:'#354e59',strokeThickness:5}).setDepth(3).setAngle(-2);
  }

  shop(x:number,y:number,w:number,h:number,name:string,colour:number,sign:number){
    const g=this.add.graphics().setDepth(2);
    g.fillStyle(0x5d6870,.25);g.fillRect(x+18,y+24,w,h);
    g.fillStyle(0xe7d7bb);g.fillRect(x,y,w,h);
    g.fillStyle(0xa78564);g.fillRect(x,y,w,35);
    g.fillStyle(0xf2e2c7);g.fillRect(x+8,y+38,w-16,13);
    g.lineStyle(2,0xc6ad89,.45);for(let by=y+62;by<y+175;by+=24)g.lineBetween(x+8,by,x+w-8,by);
    // upper windows
    for(let wx=x+30;wx<x+w-50;wx+=105){
      g.fillStyle(0x7294a2);g.fillRoundedRect(wx,y+55,76,105,5);
      g.lineStyle(5,0xf0dfbf,.9);g.lineBetween(wx+38,y+58,wx+38,y+157);
    }
    g.fillStyle(colour);g.fillRect(x+12,y+185,w-24,80);
    g.fillStyle(0xf2efe1);for(let ax=x+22;ax<x+w-34;ax+=72)g.fillTriangle(ax,y+265,ax+62,y+265,ax+31,y+288);
    g.fillStyle(0x456474);g.fillRect(x+25,y+285,w-50,155);
    for(let wx=x+35;wx<x+w-70;wx+=125){
      g.fillStyle(0xb9e4e5,.75);g.fillRect(wx,y+300,96,119);
      g.fillStyle(0xffffff,.26);g.fillTriangle(wx+7,y+307,wx+77,y+307,wx+7,y+370);
      g.fillStyle(0xf8e7aa,.38);g.fillRect(wx+8,y+385,80,22);
    }
    this.add.text(x+w/2,y+225,name,{fontFamily:'Arial Black, sans-serif',fontSize:Math.min(42,Math.max(24,w/name.length*.9))+'px',color:'#'+sign.toString(16).padStart(6,'0')}).setOrigin(.5).setDepth(4);
  }
  lamp(x:number,y:number){
    const g=this.add.graphics().setDepth(8);g.fillStyle(0x263c48);g.fillRoundedRect(x,y-105,10,125,5);g.fillCircle(x+5,y-110,16);g.fillStyle(0xffe6a3);g.fillCircle(x+5,y-110,8);
  }
  bin(x:number,y:number){
    const g=this.add.graphics().setDepth(8);g.fillStyle(0x263e45);g.fillRoundedRect(x,y-42,34,52,5);g.fillStyle(0x101e23);g.fillRect(x+5,y-33,24,8);
  }

  collegeGreen(x:number){
    const g=this.add.graphics().setDepth(2);
    // Bank-style classical frontage: recognisable civic Dublin without pulling the game into full architectural simulation.
    g.fillStyle(0xd8c39e);g.fillRect(x+28,62,720,408);
    g.fillStyle(0xb79b72);g.fillRect(x+28,62,720,28);
    g.fillStyle(0xe8d9bb);g.fillTriangle(x+70,150,x+388,58,x+706,150);
    g.lineStyle(5,0xb59c76,.7);g.lineBetween(x+70,150,x+706,150);
    for(let i=0;i<8;i++){
      const px=x+92+i*82;
      g.fillStyle(0xe7d8bb);g.fillRect(px,155,31,290);
      g.fillStyle(0xb49a75);g.fillRect(px-5,145,41,14);g.fillRect(px-5,445,41,12);
    }
    g.fillStyle(0x627f87);for(let wx=x+142;wx<x+680;wx+=164)g.fillRoundedRect(wx,205,80,105,4);
    g.fillStyle(0x3b565f);g.fillRoundedRect(x+337,335,104,135,5);
    this.add.text(x+388,119,'BANK OF IRELAND',{fontFamily:'Arial Black',fontSize:'24px',color:'#47505a'}).setOrigin(.5).setDepth(4);
    this.add.text(x+388,323,'BANK OF IRELAND',{fontFamily:'Arial Black',fontSize:'15px',color:'#55483b',backgroundColor:'#eadbbce6',padding:{x:10,y:5}}).setOrigin(.5).setDepth(5);
    // Open College Green edge and secondary frontage.
    g.fillStyle(0xe6d4b6);g.fillRect(x+790,105,760,365);
    g.fillStyle(0xc5a980);g.fillRect(x+790,105,760,30);
    for(let wx=x+830;wx<x+1500;wx+=118){
      g.fillStyle(0x81a2aa);g.fillRoundedRect(wx,170,75,92,4);
      g.fillStyle(0x5d6f73);g.fillRoundedRect(wx,325,75,112,4);
    }
    this.add.text(x+1165,145,'COLLEGE GREEN',{fontFamily:'Arial Black',fontSize:'26px',color:'#5b4d42'}).setOrigin(.5).setDepth(4);
    // Stone planters and open-space details.
    for(let px=x+810;px<x+1510;px+=220){
      g.fillStyle(0x9b927e);g.fillRoundedRect(px,675,72,28,6);
      g.fillStyle(0x4d9853);g.fillCircle(px+18,668,18);g.fillCircle(px+48,665,20);
    }
  }

  graftonStreet(x:number){
    const g=this.add.graphics().setDepth(6);
    // Cover the road completely: this section is pedestrian-first.
    g.fillStyle(0xcbbda2);g.fillRect(x,490,1800,1070);
    for(let px=x;px<x+1800;px+=82){
      g.lineStyle(2,0xa99b84,.45);g.lineBetween(px,490,px+120,1560);
    }
    for(let py=560;py<1530;py+=86){
      g.lineStyle(2,0xe1d6c3,.5);g.lineBetween(x,py,x+1800,py);
    }
    // Retail facades
    this.shop(x+20,70,490,390,'BROWN THOMAS',0x6c655e,0xffffff);
    this.shop(x+520,70,430,390,"BEWLEY'S",0x6a2b2d,0xf0d6a2);
    this.shop(x+960,70,390,390,'BUTLERS',0x3b2a26,0xf4d9a3);
    this.shop(x+1360,70,410,390,'SPORTS',0x263a58,0xffffff);
    this.add.text(x+900,1160,'GRAFTON STREET',{fontFamily:'Arial Black',fontSize:'42px',color:'#81745f',stroke:'#f1e6d2',strokeThickness:5}).setOrigin(.5).setDepth(8).setAngle(-2);
    // Planters, benches and busking spots.
    for(let px=x+180;px<x+1700;px+=310){
      g.fillStyle(0x8c806c);g.fillRoundedRect(px,730,70,28,6);
      g.fillStyle(0x4d9853);g.fillCircle(px+18,721,18);g.fillCircle(px+49,720,21);
    }
    for(let px=x+280;px<x+1650;px+=430){
      g.fillStyle(0x6b4d35);g.fillRoundedRect(px,1300,105,14,5);g.fillRect(px+12,1310,7,24);g.fillRect(px+84,1310,7,24);
    }
    this.cafeBoard(x+1040,850,'COFFEE');
    this.cafeBoard(x+1570,1240,'TREATS');
  }

  stephensGreen(x:number){
    const g=this.add.graphics().setDepth(7);
    g.fillStyle(0x62a95d);g.fillRect(x,0,1800,1800);
    // Main park path
    g.fillStyle(0xd8c9a8);g.fillRoundedRect(x+60,650,1680,520,90);
    g.fillStyle(0xc9b792);g.fillRoundedRect(x+650,420,420,1100,75);
    g.lineStyle(3,0xf0e4ca,.45);
    for(let px=x+100;px<x+1700;px+=130)g.lineBetween(px,670,px+75,1150);
    // Pond moved into the main play camera rather than hidden below it.
    g.fillStyle(0x76bfd0);g.fillEllipse(x+1390,1080,560,280);
    g.lineStyle(10,0x8d795d,.55);g.strokeEllipse(x+1390,1080,570,290);
    g.fillStyle(0x9ed8da,.42);g.fillEllipse(x+1335,1040,250,70);
    // Trees around, not through, the main path.
    for(const [tx,ty,s] of [[170,260,1],[430,350,.8],[1200,250,1.1],[1580,310,.9],[170,670,.72],[480,620,.68],[1200,610,.72],[1650,650,.7],[220,1370,.9],[620,1510,1],[1040,1510,.8],[1660,1450,1]] as any[]){
      g.fillStyle(0x5e4a35);g.fillRect(x+tx-9,ty,18,85*s);
      g.fillStyle(0x397f45);g.fillCircle(x+tx,ty-5,55*s);
      g.fillStyle(0x67b557);g.fillCircle(x+tx-30*s,ty+2,34*s);g.fillCircle(x+tx+30*s,ty-12,38*s);
    }
    // Flower beds
    for(const [fx,fy] of [[360,760],[760,690],[1120,760],[1600,820]] as any[]){
      g.fillStyle(0x537e45);g.fillEllipse(x+fx,fy,120,46);
      for(let j=0;j<7;j++){g.fillStyle([0xe86575,0xf0cf4f,0xf39cc4,0xf8eee1][j%4]);g.fillCircle(x+fx-42+j*14,fy-5+(j%2)*8,5);}
    }
    // Benches and picnic blankets
    for(const [bx,by] of [[250,880],[500,1110],[1080,820],[1510,880]] as any[]){
      g.fillStyle(0x684b36);g.fillRoundedRect(x+bx,by,110,15,5);g.fillRect(x+bx+12,by+12,8,26);g.fillRect(x+bx+88,by+12,8,26);
    }
    g.fillStyle(0xd95858,.85);g.fillRect(x+720,1000,145,90);g.fillStyle(0xf4e3a9,.9);g.fillRect(x+900,1150,135,82);
    this.add.text(x+905,595,"ST STEPHEN'S GREEN",{fontFamily:'Arial Black',fontSize:'20px',color:'#fff8da',backgroundColor:'#376d43e8',padding:{x:12,y:7}}).setOrigin(.5).setDepth(10);
    this.dog(x+520,930,false);this.dog(x+1540,760,true);
    // Ducks on the pond
    for(const [dx,dy,flip] of [[1270,1040,0],[1450,1110,1],[1530,1020,0],[1360,1160,1]] as any[])this.duck(x+dx,dy,Boolean(flip));
  }

  busker(x:number,y:number){
    const p=this.add.sprite(x,y,'person-tan').setDepth(25);
    p.setScale(1.05);
    const g=this.add.graphics().setDepth(26);
    g.fillStyle(0xb7783f);g.fillEllipse(x+25,y+8,20,27);g.fillStyle(0x5b3b29);g.fillRect(x+30,y-25,5,34);g.fillCircle(x+25,y+8,4);
    g.fillStyle(0x333e43);g.fillEllipse(x+60,y+35,70,20);g.lineStyle(3,0x8d6f4c);g.strokeEllipse(x+60,y+35,70,20);
    this.add.text(x+59,y+35,'€',{fontFamily:'Arial Black',fontSize:'10px',color:'#f6d85c'}).setOrigin(.5).setDepth(27);
  }

  dog(x:number,y:number,flip=false){
    const g=this.add.graphics().setDepth(19);
    const dir=flip?-1:1;
    g.fillStyle(0x9c6b42);g.fillEllipse(x,y,52,26);
    g.fillStyle(0x865735);g.fillRoundedRect(x-17,y+8,7,19,3);g.fillRoundedRect(x+9,y+8,7,19,3);
    g.fillStyle(0x9c6b42);g.fillCircle(x+dir*25,y-8,15);
    g.fillStyle(0x6e472f);g.fillEllipse(x+dir*31,y+1,17,10);
    g.fillTriangle(x+dir*22,y-18,x+dir*35,y-29,x+dir*14,y-19);
    g.lineStyle(4,0x795138);g.lineBetween(x-dir*23,y-5,x-dir*38,y-19);
    g.lineStyle(3,0x4aa3a1);g.lineBetween(x+dir*14,y-2,x+dir*34,y-2);
    g.fillStyle(0x24343b);g.fillCircle(x+dir*29,y-10,2);g.fillCircle(x+dir*39,y+1,2);
  }

  duck(x:number,y:number,flip=false){
    const g=this.add.graphics().setDepth(16);
    g.fillStyle(0x75583b);g.fillEllipse(x,y,34,20);g.fillStyle(0x3f7447);g.fillCircle(x+(flip?-13:13),y-8,10);
    g.fillStyle(0xe5a52b);if(flip)g.fillTriangle(x-21,y-8,x-32,y-4,x-21,y);else g.fillTriangle(x+21,y-8,x+32,y-4,x+21,y);
  }

  flowerBasket(x:number,y:number){
    const g=this.add.graphics().setDepth(10);
    g.lineStyle(3,0x263c48);g.lineBetween(x,y-50,x,y-18);
    g.fillStyle(0x6a4b32);g.fillRoundedRect(x-22,y-20,44,18,6);
    g.fillStyle(0x3e914d);g.fillCircle(x-13,y-22,12);g.fillCircle(x+10,y-23,13);
    for(const [dx,dy,col] of [[-15,-25,0xe9556d],[0,-20,0xf2cf4d],[13,-26,0xf17ab0],[-4,-30,0xffffff]] as any[]){
      g.fillStyle(col);g.fillCircle(x+dx,y+dy,5);
    }
  }
  cafeBoard(x:number,y:number,label:string){
    const g=this.add.graphics().setDepth(13);
    g.fillStyle(0x2a363b);g.fillRoundedRect(x-22,y-44,44,46,4);
    g.lineStyle(3,0x76563d);g.lineBetween(x-14,y+1,x-20,y+18);g.lineBetween(x+14,y+1,x+20,y+18);
    this.add.text(x,y-22,label,{fontFamily:'Arial Black',fontSize:'9px',color:'#fff2cf',align:'center'}).setOrigin(.5).setDepth(14);
  }

  makeTextures(){
    const gull=(key:string,wing:number)=>{
      const g=this.make.graphics({x:0,y:0},false);
      g.fillStyle(0x000000,.14);g.fillEllipse(47,48,66,20);
      g.fillStyle(0xf8f7ef);g.fillEllipse(48,40,60,34);
      g.fillStyle(0xd6dde0);
      g.beginPath();g.moveTo(42,40);g.lineTo(5,40-wing);g.lineTo(30,49);g.closePath();g.fillPath();
      g.beginPath();g.moveTo(54,40);g.lineTo(91,40-wing);g.lineTo(66,49);g.closePath();g.fillPath();
      g.fillStyle(0x55636c);g.fillTriangle(9,40-wing,23,43-wing*.55,14,48-wing*.45);g.fillTriangle(87,40-wing,73,43-wing*.55,82,48-wing*.45);
      g.fillStyle(0xf8f7ef);g.fillCircle(69,34,15);
      g.fillStyle(0xf0a92f);g.fillTriangle(79,34,98,38,79,42);
      g.fillStyle(0x1d2c35);g.fillCircle(72,30,3);
      g.generateTexture(key,104,76);g.destroy();
    };
    if(!this.textures.exists('gull-0')){gull('gull-0',21);gull('gull-1',7);gull('gull-2',-13);}

    const person=(key:string,coat:number,skin:number=0xd99d75,hat:number|null=null,accent:number=0xc99b55)=>{
      const g=this.make.graphics({x:0,y:0},false);
      g.fillStyle(0x000000,.15);g.fillEllipse(31,76,46,12);
      g.fillStyle(0x182a35);g.fillRoundedRect(16,52,10,22,4);g.fillRoundedRect(37,52,10,22,4);
      g.fillStyle(0xffffff);g.fillRoundedRect(16,70,10,4,2);g.fillRoundedRect(37,70,10,4,2);
      g.fillStyle(coat);g.fillRoundedRect(12,30,39,31,10);
      g.fillStyle(coat);g.fillRoundedRect(7,33,9,25,4);g.fillRoundedRect(47,33,9,25,4);
      g.fillStyle(skin);g.fillCircle(11,57,5);g.fillCircle(52,57,5);
      g.fillStyle(0x453127);g.fillCircle(31,19,13);g.fillStyle(skin);g.fillCircle(31,23,11);g.fillStyle(0x453127);g.fillRoundedRect(18,10,26,8,3);
      g.fillStyle(0x233742);g.fillCircle(27,23,1.5);g.fillCircle(35,23,1.5);
      g.fillStyle(accent);g.fillRoundedRect(43,40,13,19,3);g.lineStyle(2,0x5c4937,.8);g.lineBetween(44,41,34,31);
      if(hat!==null){g.fillStyle(hat);g.fillRect(17,10,28,7);g.fillRoundedRect(21,4,20,9,4);}
      g.generateTexture(key,64,86);g.destroy();
    };
    person('person-blue',0x335b87,0xd99d75,null,0xc88c48);
    person('person-red',0xa63f52,0xe0ae88,null,0x473d67);
    person('person-green',0x39795d,0xd39b74,null,0xd7b05b);
    person('person-tan',0xa56e49,0xb97755,null,0x316a8a);
    person('person-dark',0x2f3b4c,0x8f5d42,null,0xbe7a45);
    person('person-office',0x263d61,0xe0ad86,null,0x171d25);
    person('person-tourist',0x4b7ba5,0xe3b58d,0xd9b13d,0xd65b49);
    person('person-builder',0x4f5961,0xc98962,0xf0cc38,0xe8793c);
    person('person-runner',0x7a3d85,0xa96c50,null,0x44c4c9);
    // Garda - SVG is preferred; this fallback keeps the game playable if an art file ever fails.
    if(!this.textures.exists('garda')){
      const gd=this.make.graphics({x:0,y:0},false);
      gd.fillStyle(0x000000,.15);gd.fillEllipse(32,79,45,12);gd.fillStyle(0x172a3b);gd.fillRoundedRect(18,51,9,26,3);gd.fillRoundedRect(37,51,9,26,3);
      gd.fillStyle(0xf2d83a);gd.fillRoundedRect(12,27,40,34,7);gd.lineStyle(4,0xb7c8ce);gd.lineBetween(14,38,50,38);gd.lineBetween(14,49,50,49);
      gd.fillStyle(0xd79a73);gd.fillCircle(32,19,12);gd.fillStyle(0x1e3650);gd.fillRoundedRect(18,7,28,9,4);gd.fillRect(22,3,20,8);
      gd.generateTexture('garda',64,88);gd.destroy();
    }

    const michael=this.make.graphics({x:0,y:0},false);
    michael.fillStyle(0x000000,.14);michael.fillEllipse(34,82,46,12);michael.fillStyle(0x243653);michael.fillRoundedRect(16,45,10,32,3);michael.fillRoundedRect(41,45,10,32,3);
    michael.fillStyle(0x293e61);michael.fillRoundedRect(13,28,41,34,8);michael.fillStyle(0xffffff);michael.fillTriangle(28,29,40,29,34,44);michael.fillStyle(0x9b2b35);michael.fillTriangle(32,31,36,31,34,45);
    michael.fillStyle(0xe9e4d9);michael.fillCircle(34,17,13);michael.fillStyle(0xe3b28a);michael.fillCircle(34,22,11);michael.fillStyle(0xe9e4d9);michael.fillRoundedRect(22,8,24,7,3);michael.fillRoundedRect(23,24,22,4,2);
    michael.generateTexture('michael',68,92);michael.destroy();

    const food=(key:string,kind:'chips'|'roll'|'coffee'|'ice'|'spice')=>{
      const g=this.make.graphics({x:0,y:0},false);
      if(kind==='chips'){g.fillStyle(0xd7373f);g.fillRoundedRect(8,14,30,31,5);g.fillStyle(0xf5d34f);for(let i=0;i<5;i++)g.fillRoundedRect(10+i*6,4+(i%2)*4,5,21,2);}
      if(kind==='roll'){g.fillStyle(0xc98d48);g.fillRoundedRect(4,14,42,22,11);g.fillStyle(0x70a756);g.fillRect(14,16,18,4);g.fillStyle(0xf6d8a2);g.fillEllipse(25,15,38,8);}
      if(kind==='coffee'){g.fillStyle(0xead7bd);g.fillRoundedRect(9,10,28,36,5);g.fillStyle(0x6c3928);g.fillRect(10,19,26,16);g.fillStyle(0xffffff);g.fillRect(12,8,22,5);}
      if(kind==='ice'){g.fillStyle(0xd5a168);g.fillTriangle(13,23,37,23,25,48);g.fillStyle(0xf1b4d1);g.fillCircle(25,18,13);}
      if(kind==='spice'){g.fillStyle(0x402d26);g.fillRoundedRect(5,12,40,32,5);g.fillStyle(0xf5c650);for(let i=0;i<6;i++)g.fillCircle(12+(i%3)*11,19+Math.floor(i/3)*12,6);}
      g.generateTexture(key,50,54);g.destroy();
    };
    food('food-chips','chips');food('food-roll','roll');food('food-coffee','coffee');food('food-ice','ice');food('food-spice','spice');

    const vehicle=(key:string,c:number,w:number,h:number)=>{
      const g=this.make.graphics({x:0,y:0},false);
      g.fillStyle(0x000000,.18);g.fillEllipse(w/2,h-7,w*.8,18);g.fillStyle(0x26313a);g.fillRoundedRect(5,h-24,13,20,4);g.fillRoundedRect(w-18,h-24,13,20,4);
      g.fillStyle(c);g.fillRoundedRect(7,9,w-14,h-18,12);g.fillStyle(0xbfe0e6);g.fillRoundedRect(17,13,w-34,18,5);g.fillStyle(0xf4d85c);g.fillRect(12,h-22,8,6);g.fillRect(w-20,h-22,8,6);
      g.generateTexture(key,w,h);g.destroy();
    };
    vehicle('taxi',0x24292c,100,58);
    vehicle('van',0xd9d4c8,122,64);
    if(!this.textures.exists('luas')){
      const tram=this.make.graphics({x:0,y:0},false);
      tram.fillStyle(0xdfe5e2);tram.fillRoundedRect(5,8,190,58,12);tram.fillStyle(0x63a856);tram.fillRect(8,48,184,12);
      tram.fillStyle(0xa9d8df);for(let tx=18;tx<176;tx+=35)tram.fillRoundedRect(tx,16,28,24,4);
      tram.generateTexture('luas',200,74);tram.destroy();
    }
    if(!this.textures.exists('bus')){
      const bus=this.make.graphics({x:0,y:0},false);
      bus.fillStyle(0x000000,.18);bus.fillEllipse(82,67,136,18);
      bus.fillStyle(0x26313a);bus.fillRoundedRect(10,48,15,21,4);bus.fillRoundedRect(139,48,15,21,4);
      bus.fillStyle(0x2f80b9);bus.fillRoundedRect(7,8,150,57,10);
      bus.fillStyle(0xf2c844);bus.fillRect(7,42,150,14);
      bus.fillStyle(0xbfe0e6);for(let bx=18;bx<142;bx+=31)bus.fillRoundedRect(bx,15,25,20,4);
      bus.fillStyle(0x172c3a);bus.fillRoundedRect(49,45,67,9,3);
      bus.generateTexture('bus',164,74);bus.destroy();
    }
  }

  spawnTraffic(){
    const add=(key:string,x:number,y:number,speed:number,lane:number,minX?:number,maxX?:number)=>{
      const s=this.physics.add.sprite(x,y,key).setDepth(26);if(key==='bus')s.setDisplaySize(188,120);if(key==='luas')s.setDisplaySize(235,80);s.body!.setImmovable(true);this.vehicles.push({sprite:s,speed,lane,minX,maxX});
    };
    for(let i=0;i<5;i++)add(i%3===0?'bus':i%3===1?'taxi':'van',450+i*680,835,100+Math.random()*30,0,0,5200);
    for(let i=0;i<5;i++){add(i%2?'taxi':'bus',260+i*720,1165,-105-Math.random()*25,1,0,5200);this.vehicles[this.vehicles.length-1].sprite.setFlipX(true);}
    add('luas',3900,925,72,2,3600,5200);add('luas',4920,925,-68,2,3600,5200);this.vehicles[this.vehicles.length-1].sprite.setFlipX(true);
  }

  spawnPeople(){
    const tex=['person-blue','person-red','person-green','person-tan','person-dark','person-office','person-tourist','person-builder','person-runner'];

    for(let i=0;i<78;i++){
      const upper=i<35;
      const x=120+Math.random()*(WORLD_W-240);
      let y:number;
      if(x>=7000)y=690+Math.random()*760;
      else if(x>=5200)y=610+Math.random()*830;
      else y=upper?535+Math.random()*160:1300+Math.random()*210;
      const p=this.physics.add.sprite(x,y,tex[i%tex.length]).setDepth(22);
      p.body!.setCircle(16,14,42);p.setData('baseSpeed',18+Math.random()*22);
      const f=FOOD_TYPES[i%FOOD_TYPES.length];
      const fi=this.add.image(x+24,y-20,f.key).setScale(.66).setDepth(23);
      const ring=this.add.circle(x,y,34,0xffe784,0).setStrokeStyle(3,0xffe784,0).setDepth(18);
      const temperament=(['oblivious','suspicious','runner','defender'] as const)[i%4];
      this.targets.push({person:p,food:fi,ring,value:f.value,name:f.name,stolen:false,vx:(Math.random()-.5),vy:(Math.random()-.5)*.4,panicUntil:0,temperament});
    }
  }

  spawnCameos(){
    const m=this.physics.add.sprite(3180,1375,'michael').setDepth(22);
    this.add.text(m.x,m.y-62,'Michael D.',{fontFamily:'Trebuchet MS',fontSize:'13px',fontStyle:'bold',color:'#22384b',backgroundColor:'#fff3cfcc',padding:{x:7,y:4}}).setOrigin(.5).setDepth(23);
    m.setData('cameo',true);
  }

  spawnGarda(x:number,y:number,chaser=true){
    const g=this.physics.add.sprite(x,y,'garda').setDepth(25).setDisplaySize(66,98);g.setData('chaser',chaser);g.setData('homeX',x);g.setData('homeY',y);this.gardai.push(g);
  }

  select(t:Target){
    if(this.selected)this.selected.ring.setStrokeStyle(3,0xffe784,0);
    this.selected=t;t.ring.setStrokeStyle(3,0xffe784,.9);
    this.toast(t.name.toUpperCase()+' TARGETED');sfx('target');
  }

  update(time:number,delta:number){
    if(this.ended)return;
    const dt=Math.min(delta,50)/1000;
    let dx=controls.x,dy=controls.y;
    if(this.keys){
      if(this.keys.A?.isDown||this.keys.LEFT?.isDown)dx-=1;
      if(this.keys.D?.isDown||this.keys.RIGHT?.isDown)dx+=1;
      if(this.keys.W?.isDown||this.keys.UP?.isDown)dy-=1;
      if(this.keys.S?.isDown||this.keys.DOWN?.isDown)dy+=1;
      if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE))controls.dive=true;
      if(Phaser.Input.Keyboard.JustDown(this.keys.E))controls.grab=true;
    }
    const len=Math.hypot(dx,dy)||1;dx/=Math.max(1,len);dy/=Math.max(1,len);
    const boost=controls.boost||this.keys?.SHIFT?.isDown;
    const diveHeld=controls.diveHeld||Boolean(this.keys?.SPACE?.isDown);
    if(boost&&this.grounded){this.grounded=false;this.altitudeTarget=.74;this.gull.play('fly');this.toast('BACK IN THE AIR');}
    if(diveHeld&&!boost&&this.altitude<.16){this.grounded=true;this.altitudeTarget=.045;}
    if(this.grounded&&!boost)this.altitudeTarget=.045;
    const speed=this.grounded?115:(boost?430:315);
    this.gull.setVelocity(dx*speed,dy*speed);
    if(Math.abs(dx)>.08)this.gull.setFlipX(dx<0);
    this.gull.setAngle(Phaser.Math.Clamp(dy*10,-10,10));

    if(controls.consumeDive())this.startDive(time);
    if(controls.consumeGrab())this.tryGrab(time);
    if(!diveHeld&&!this.grounded&&time>this.diveUntil&&this.altitudeTarget<.6)this.altitudeTarget=.7;
    if(this.grounded){
      if(this.gull.texture.key!=='gull-walk'){this.gull.anims.stop();this.gull.setTexture('gull-walk');}
      if(!this.toldWaddle){this.toldWaddle=true;this.toast('WADDLE MODE · FLAP TO TAKE OFF');}
    }else if(this.gull.texture.key==='gull-walk'&&!this.gull.anims.isPlaying)this.gull.play('fly');
    this.altitude=Phaser.Math.Linear(this.altitude,this.altitudeTarget,Math.min(1,dt*4.8));
    const sc=this.grounded ? .78 : (.82+this.altitude*.5);this.gull.setScale(sc);
    if(this.grounded)this.gull.setAngle(0);
    this.gull.setDepth(45+Math.round(this.altitude*28));
    this.shadow.setPosition(this.gull.x+16,this.gull.y+28+this.altitude*58);
    this.shadow.setScale(1.15-this.altitude*.38,.9-this.altitude*.25);
    this.shadow.setAlpha(.36-this.altitude*.18);
    this.carryText.setPosition(this.gull.x,this.gull.y-58*sc);

    this.updateTargets(time,dt);
    this.updateTraffic(dt);
    this.updateGardai(time,dt);
    this.updateHeat(time,dt);
    this.updateSelection();

    const zone=this.gull.x<3400?'DAME STREET':this.gull.x<5200?'COLLEGE GREEN':this.gull.x<7000?'GRAFTON STREET':"ST STEPHEN'S GREEN";
    this.districtText.setText(zone);
    if(this.lastZone&&zone!==this.lastZone)this.toast('ENTERING '+zone);
    this.lastZone=zone;
    const cameraBias=this.gull.x>=7000?0:(this.gull.x>=5200?330:190);
    this.cameras.main.setFollowOffset(0,cameraBias);
  }

  startDive(time:number){
    if(this.grounded)return;
    this.altitudeTarget=.08;this.diveUntil=time+850;sfx('dive');
    if(this.selected&&!this.selected.stolen){
      const dist=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,this.selected.person.x,this.selected.person.y);
      this.selected.panicUntil=Math.max(this.selected.panicUntil,time+(this.selected.temperament==='oblivious'?350:1200));
      if(dist<145&&this.wanted>=2&&this.selected.temperament==='defender'&&Math.random()<.42){
        this.emote(this.selected.person,'!');
        this.hit('Umbrella! Pick a softer target.',time);
        return;
      }
      if(dist<260&&this.selected.temperament!=='oblivious')this.emote(this.selected.person,'!');
    }
    this.tweens.add({targets:this.cameras.main,zoom:1.08,duration:180,yoyo:true,ease:'Sine.easeOut'});
    if(this.selected&&!this.selected.stolen){
      const a=Phaser.Math.Angle.Between(this.gull.x,this.gull.y,this.selected.person.x,this.selected.person.y);
      this.gull.setVelocity(Math.cos(a)*520,Math.sin(a)*520);
    }
  }

  tryGrab(time:number){
    let t=this.selected;
    if(!t||t.stolen){
      let best:Target|null=null,d=95;
      for(const q of this.targets){if(q.stolen)continue;const nd=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,q.person.x,q.person.y);if(nd<d){best=q;d=nd;}}
      t=best;
    }
    if(!t){this.toast('Nothing to grab.');return;}
    const d=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,t.person.x,t.person.y);
    if(this.altitude>.34||d>92){this.toast(this.altitude>.34?'Dive lower first.':'Too far away.');return;}
    t.stolen=true;t.food.setVisible(false);t.ring.setVisible(false);t.panicUntil=time+3200;
    this.combo=this.lastTheftAt>0&&time-this.lastTheftAt<8000?Math.min(4,this.combo+1):1;
    this.lastTheftAt=time;
    const earned=Math.round(t.value*this.combo*(1+this.wanted*.12));
    this.score+=earned;this.stolen++;
    this.altitudeTarget=.82;this.diveUntil=time;
    this.carryText.setText(this.combo>1?`${t.name.toUpperCase()} · x${this.combo}`:t.name.toUpperCase()+'!');
    this.time.delayedCall(1150,()=>this.carryText.setText(''));
    setText('score',Math.floor(this.score).toLocaleString());setText('stolen',String(this.stolen));setText('combo','x'+this.combo);
    this.scorePop('+'+earned+(this.combo>1?'  x'+this.combo:''));
    this.toast('STOLEN: '+t.name.toUpperCase()+'  +'+earned);sfx('grab');haptic(30);
    this.emote(t.person,t.temperament==='defender'?'OI!':'!');
    this.addHeat(13+(t.value>=50?5:0),time);
    this.advanceMission(t.name);
    this.time.delayedCall(Phaser.Math.Between(8500,14500),()=>this.recycleTarget(t));
    if(this.selected===t)this.selected=null;
  }

  addHeat(amount:number,time:number){
    this.heat=Phaser.Math.Clamp(this.heat+amount,0,100);
    this.lastHeatEvent=time;
    this.syncWanted();
  }

  updateHeat(time:number,dt:number){
    if(time-this.lastHeatEvent>2800&&this.heat>0){
      this.heat=Math.max(0,this.heat-dt*(this.altitude>.55?3.2:1.35));
      this.syncWanted();
    }
    if(time-this.lastTheftAt>8000&&this.combo!==1){this.combo=1;setText('combo','x1');}
    setText('heat',Math.round(this.heat)+'%');
  }

  syncWanted(){
    const level=Phaser.Math.Clamp(Math.ceil(this.heat/20),0,5);
    if(level===this.wanted){setWanted(level);return;}
    const rising=level>this.wanted;
    this.wanted=level;setWanted(level);
    if(rising){
      sfx('wanted');
      this.toast(level>=4?'DUBLIN HAS HAD ENOUGH.':'WANTED LEVEL '+level);
      if(level>=2&&level>this.lastWanted){
        const sx=this.gull.x+(Math.random()>.5?430:-430),sy=this.gull.y+(Math.random()-.5)*280;
        this.spawnGarda(Phaser.Math.Clamp(sx,80,WORLD_W-80),Phaser.Math.Clamp(sy,520,1480),true);
      }
      this.lastWanted=Math.max(this.lastWanted,level);
    }
  }

  recycleTarget(t:Target){
    if(this.ended)return;
    const f=FOOD_TYPES[Phaser.Math.Between(0,FOOD_TYPES.length-1)];
    t.name=f.name;t.value=f.value;t.food.setTexture(f.key).setVisible(true);
    const rx=Phaser.Math.Between(80,WORLD_W-80);
    let ry:number;
    if(rx>=7000)ry=Phaser.Math.Between(690,1460);
    else if(rx>=5200)ry=Phaser.Math.Between(620,1420);
    else ry=Math.random()>.35?Phaser.Math.Between(530,700):Phaser.Math.Between(1300,1515);
    t.person.setPosition(rx,ry);
    t.food.setPosition(t.person.x+24,t.person.y-20);
    t.stolen=false;t.panicUntil=0;t.ring.setVisible(true);
  }

  setMission(index:number){
    const missions=[
      {kind:'any' as const,target:3,text:'Steal 3 snacks'},
      {kind:'chips' as const,target:2,text:'Steal 2 bags of chips'},
      {kind:'roll' as const,target:1,text:'Steal a chicken fillet roll'},
      {kind:'spice' as const,target:1,text:'Steal a spice bag'},
      {kind:'any' as const,target:5,text:'Steal 5 snacks without getting caught'}
    ];
    this.missionIndex=index%missions.length;const m=missions[this.missionIndex];
    this.missionKind=m.kind;this.missionTarget=m.target;this.missionProgress=0;
    setText('mission',m.text);setText('missionProgress',`0/${m.target}`);
  }

  advanceMission(foodName:string){
    const match=this.missionKind==='any'||(this.missionKind==='chips'&&foodName==='chips')||(this.missionKind==='roll'&&foodName==='chicken fillet roll')||(this.missionKind==='spice'&&foodName==='spice bag');
    if(!match)return;
    this.missionProgress++;
    setText('missionProgress',`${Math.min(this.missionProgress,this.missionTarget)}/${this.missionTarget}`);
    if(this.missionProgress>=this.missionTarget){
      const bonus=150+this.missionIndex*50;this.score+=bonus;setText('score',Math.floor(this.score).toLocaleString());
      this.toast('MISSION COMPLETE  +'+bonus);this.scorePop('MISSION +'+bonus,'#ffe66f');tone(740,.08,'square',.025,160);haptic(45);
      this.time.delayedCall(900,()=>this.setMission(this.missionIndex+1));
    }
  }

  updateTargets(time:number,dt:number){
    for(const t of this.targets){
      if(t.stolen){
        const panic=time<t.panicUntil;
        if(panic){
          const a=Phaser.Math.Angle.Between(this.gull.x,this.gull.y,t.person.x,t.person.y);
          t.person.x+=Math.cos(a)*92*dt;t.person.y+=Math.sin(a)*92*dt;
        }
      }else{
        const s=Number(t.person.getData('baseSpeed')||24);
        if(time<t.panicUntil&&t.temperament!=='oblivious'){
          const a=Phaser.Math.Angle.Between(this.gull.x,this.gull.y,t.person.x,t.person.y);
          const flee=t.temperament==='runner'?125:78;
          t.person.x+=Math.cos(a)*flee*dt;t.person.y+=Math.sin(a)*flee*dt;
        }else{
          t.person.x+=t.vx*s*dt;t.person.y+=t.vy*s*dt;
        }
        if(t.person.x<80||t.person.x>WORLD_W-80)t.vx*=-1;
        let minY:number,maxY:number;
        if(t.person.x>=7000){minY=670;maxY=1500;}
        else if(t.person.x>=5200){minY=590;maxY=1450;}
        else if(t.person.y<900){minY=515;maxY=715;}
        else{minY=1285;maxY=1530;}
        if(t.person.y<minY||t.person.y>maxY)t.vy*=-1;
        t.person.y=Phaser.Math.Clamp(t.person.y,minY,maxY);
        t.food.setPosition(t.person.x+24,t.person.y-20);
        t.ring.setPosition(t.person.x,t.person.y+4);
      }
    }
  }

  updateTraffic(dt:number){
    for(const v of this.vehicles){
      v.sprite.x+=v.speed*dt;
      const min=v.minX??-180,max=v.maxX??WORLD_W+180;
      if(v.speed>0&&v.sprite.x>max+180)v.sprite.x=min-180;
      if(v.speed<0&&v.sprite.x<min-180)v.sprite.x=max+180;
      if(this.altitude<.2&&Phaser.Math.Distance.Between(this.gull.x,this.gull.y,v.sprite.x,v.sprite.y)<72)this.hit('Ouch. Dublin traffic.',performance.now());
    }
  }

  updateGardai(time:number,dt:number){
    for(const g of this.gardai){
      const chase=g.getData('chaser')&&this.wanted>=2;
      if(chase){
        const a=Phaser.Math.Angle.Between(g.x,g.y,this.gull.x,this.gull.y);
        const sp=80+this.wanted*22;g.x+=Math.cos(a)*sp*dt;g.y+=Math.sin(a)*sp*dt;
        g.setFlipX(Math.cos(a)<0);
        if(this.altitude<.27&&Phaser.Math.Distance.Between(g.x,g.y,this.gull.x,this.gull.y)<58)this.hit('Caught by Gardaí.',time,true);
      }else{
        const hx=Number(g.getData('homeX')),hy=Number(g.getData('homeY'));
        g.x=Phaser.Math.Linear(g.x,hx,.01);g.y=Phaser.Math.Linear(g.y,hy,.01);
      }
    }
  }

  hit(message:string,time:number,hard=false){
    if(time<this.invulnerableUntil||this.ended)return;
    this.invulnerableUntil=time+1300;this.feathers-=hard?2:1;setFeathers(Math.max(0,this.feathers));
    this.cameras.main.shake(160,.008);this.gull.setVelocity((Math.random()-.5)*450,-240);this.altitudeTarget=.75;
    this.toast(message);sfx('hit');haptic(80);
    if(this.missionIndex===4&&this.missionProgress>0){this.missionProgress=0;setText('missionProgress','0/'+this.missionTarget);this.toast('MISSION STREAK RESET');}
    if(this.feathers<=0)this.gameOver();
  }

  scorePop(text:string,color='#ffffff'){
    const pop=this.add.text(this.gull.x,this.gull.y-70,text,{fontFamily:'Arial Black',fontSize:'24px',color,stroke:'#17384b',strokeThickness:6}).setOrigin(.5).setDepth(120);
    this.tweens.add({targets:pop,y:pop.y-70,alpha:0,scale:1.16,duration:850,ease:'Cubic.easeOut',onComplete:()=>pop.destroy()});
  }

  emote(at:Phaser.GameObjects.Sprite,text:string){
    const bubble=this.add.text(at.x,at.y-64,text,{fontFamily:'Arial Black',fontSize:'18px',color:'#17384b',backgroundColor:'#fff4d9',padding:{x:7,y:4}}).setOrigin(.5).setDepth(90);
    this.tweens.add({targets:bubble,y:bubble.y-18,alpha:0,duration:850,ease:'Quad.easeOut',onComplete:()=>bubble.destroy()});
  }

  updateSelection(){
    if(this.selected&&!this.selected.stolen){
      this.targetMarker.setVisible(true).setPosition(this.selected.person.x,this.selected.person.y);
      const d=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,this.selected.person.x,this.selected.person.y);
      this.targetMarker.setStrokeStyle(5,d<100?0x64e69a:0xffd54f,.95);
    }else{
      this.targetMarker.setVisible(false);
      let best:Target|null=null,d=155;
      for(const t of this.targets){if(t.stolen)continue;const nd=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,t.person.x,t.person.y);if(nd<d){best=t;d=nd;}}
      if(best)this.select(best);
    }
  }

  toast(message:string){
    const el=$('toast');if(!el)return;el.textContent=message;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  }

  gameOver(){
    if(this.ended)return;this.ended=true;this.physics.pause();
    const best=Number(localStorage.getItem('seagull-best')||0);if(this.score>best)localStorage.setItem('seagull-best',String(Math.floor(this.score)));
    window.dispatchEvent(new CustomEvent('seagull-gameover',{detail:{score:Math.floor(this.score),stolen:this.stolen,best:Math.max(best,Math.floor(this.score))}}));
  }
}

function startGame(){
  if((window as any).__seagullGame)return;
  initAudio();
  $('startScreen')?.classList.add('hidden');
  $('hud')?.classList.remove('hidden');
  $('missionBar')?.classList.remove('hidden');
  $('controls')?.classList.remove('hidden');
  setupStick();bindButton('diveBtn','dive');bindButton('grabBtn','grab');bindButton('boostBtn','boost');
  const smoke=new URLSearchParams(location.search).has('smoke');
  (window as any).__seagullGame=new Phaser.Game({
    type:smoke?Phaser.CANVAS:Phaser.AUTO,
    parent:'game',
    width:GAME_W,
    height:GAME_H,
    backgroundColor:'#9ad8ef',
    physics:{default:'arcade',arcade:{gravity:{x:0,y:0},debug:false}},
    scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH,width:GAME_W,height:GAME_H},
    input:{activePointers:3},
    scene:[DameStreetScene],
    render:{antialias:true,pixelArt:false,roundPixels:false}
  });
}
setText('startBest',Number(localStorage.getItem('seagull-best')||0).toLocaleString());
function syncSoundButton(){const b=$('soundBtn');if(!b)return;b.textContent=soundEnabled?'SFX':'MUTE';b.classList.toggle('muted',!soundEnabled);b.setAttribute('aria-pressed',String(!soundEnabled));}
$('soundBtn')?.addEventListener('click',()=>{soundEnabled=!soundEnabled;localStorage.setItem('seagull-muted',soundEnabled?'0':'1');if(soundEnabled)initAudio();syncSoundButton();});
syncSoundButton();
$('playBtn')?.addEventListener('click',startGame);
if(new URLSearchParams(location.search).has('autostart'))startGame();
$('restartBtn')?.addEventListener('click',()=>location.reload());
window.addEventListener('seagull-gameover',(ev:any)=>{
  $('controls')?.classList.add('hidden');$('gameOver')?.classList.remove('hidden');
  setText('finalScore',Number(ev.detail.score).toLocaleString());
  setText('finalStolen',String(ev.detail.stolen));setText('bestScore',Number(ev.detail.best).toLocaleString());
});
