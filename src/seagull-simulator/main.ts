import Phaser from 'phaser';

const GAME_W=1280;
const GAME_H=720;
const WORLD_W=3600;
const WORLD_H=1800;
const VERSION='0.1.0-alpha';

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
};

type Vehicle = {
  sprite: Phaser.Physics.Arcade.Sprite;
  speed: number;
  lane: number;
};

const controls={
  x:0,
  y:0,
  dive:false,
  grab:false,
  boost:false,
  consumeDive(){const v=this.dive;this.dive=false;return v;},
  consumeGrab(){const v=this.grab;this.grab=false;return v;}
};

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
  }else el.addEventListener('pointerdown',()=>{controls[key]=true;});
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
  score=0;
  stolen=0;
  wanted=0;
  feathers=3;
  selected:Target|null=null;
  diveUntil=0;
  invulnerableUntil=0;
  ended=false;
  lastWanted=0;
  carryText!:Phaser.GameObjects.Text;
  districtText!:Phaser.GameObjects.Text;

  constructor(){super('DameStreet');}

  create(){
    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.setBackgroundColor('#92d7ee');
    this.drawWorld();
    this.makeTextures();
    this.spawnTraffic();
    this.spawnPeople();
    this.spawnCameos();
    this.spawnGarda(1840,610,false);

    this.shadow=this.add.ellipse(520,780,74,24,0x173747,.25).setDepth(39);
    this.gull=this.physics.add.sprite(520,690,'gull-1').setDepth(60);
    this.gull.setCollideWorldBounds(true);
    this.gull.body!.setCircle(28,14,12);
    this.anims.create({key:'fly',frames:[{key:'gull-0'},{key:'gull-1'},{key:'gull-2'},{key:'gull-1'}],frameRate:8,repeat:-1});
    this.gull.play('fly');
    this.cameras.main.startFollow(this.gull,true,.09,.09);
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
    setWanted(0);setFeathers(3);
    this.time.delayedCall(900,()=>this.toast('Find food. Dive low. Grab it. Get out.'));
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
    // street furniture
    for(let x=160;x<WORLD_W;x+=300)this.lamp(x,610);
    for(let x=280;x<WORLD_W;x+=520)this.bin(x,680);
    for(let x=120;x<WORLD_W;x+=115){g.fillStyle(0x2e3f49);g.fillRoundedRect(x,720,13,36,5);}
    // crossings
    for(const x of [980,2220]){
      g.fillStyle(0xf3f0dc,.9);
      for(let i=0;i<8;i++)g.fillRect(x+i*24,885,13,205);
    }
    this.add.text(110,796,'BUS LANE',{fontFamily:'Arial Black',fontSize:'28px',color:'#e9dcca'}).setDepth(2).setAngle(-2);
    this.add.text(2660,1155,'BUS LANE',{fontFamily:'Arial Black',fontSize:'28px',color:'#e9dcca'}).setDepth(2).setAngle(-2);
  }

  shop(x:number,y:number,w:number,h:number,name:string,colour:number,sign:number){
    const g=this.add.graphics().setDepth(2);
    g.fillStyle(0x5d6870,.25);g.fillRect(x+18,y+24,w,h);
    g.fillStyle(0xe7d7bb);g.fillRect(x,y,w,h);
    g.fillStyle(0x9b7e61);g.fillRect(x,y,w,35);
    // upper windows
    for(let wx=x+30;wx<x+w-50;wx+=105){
      g.fillStyle(0x7294a2);g.fillRoundedRect(wx,y+55,76,105,5);
      g.lineStyle(5,0xf0dfbf,.9);g.lineBetween(wx+38,y+58,wx+38,y+157);
    }
    g.fillStyle(colour);g.fillRect(x+12,y+185,w-24,80);
    g.fillStyle(0x456474);g.fillRect(x+25,y+285,w-50,155);
    for(let wx=x+35;wx<x+w-70;wx+=125){
      g.fillStyle(0xb9e4e5,.75);g.fillRect(wx,y+300,96,119);
      g.fillStyle(0xffffff,.26);g.fillTriangle(wx+7,y+307,wx+77,y+307,wx+7,y+370);
    }
    this.add.text(x+w/2,y+225,name,{fontFamily:'Arial Black, sans-serif',fontSize:Math.min(42,Math.max(24,w/name.length*.9))+'px',color:'#'+sign.toString(16).padStart(6,'0')}).setOrigin(.5).setDepth(4);
  }
  lamp(x:number,y:number){
    const g=this.add.graphics().setDepth(8);g.fillStyle(0x263c48);g.fillRoundedRect(x,y-105,10,125,5);g.fillCircle(x+5,y-110,16);g.fillStyle(0xffe6a3);g.fillCircle(x+5,y-110,8);
  }
  bin(x:number,y:number){
    const g=this.add.graphics().setDepth(8);g.fillStyle(0x263e45);g.fillRoundedRect(x,y-42,34,52,5);g.fillStyle(0x101e23);g.fillRect(x+5,y-33,24,8);
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
    gull('gull-0',21);gull('gull-1',7);gull('gull-2',-13);

    const person=(key:string,coat:number,skin:number=0xd99d75,hat:number|null=null)=>{
      const g=this.make.graphics({x:0,y:0},false);
      g.fillStyle(0x000000,.15);g.fillEllipse(30,72,42,12);
      g.fillStyle(0x2f3f49);g.fillRoundedRect(18,49,8,22,3);g.fillRoundedRect(34,49,8,22,3);
      g.fillStyle(coat);g.fillRoundedRect(13,29,34,29,9);
      g.fillStyle(0x453127);g.fillCircle(30,19,12);g.fillStyle(skin);g.fillCircle(30,23,11);g.fillStyle(0x453127);g.fillRoundedRect(18,11,24,7,3);
      if(hat!==null){g.fillStyle(hat);g.fillRect(17,10,26,7);g.fillRoundedRect(21,5,18,8,4);}
      g.generateTexture(key,60,82);g.destroy();
    };
    person('person-blue',0x335b87);person('person-red',0xa63f52);person('person-green',0x39795d);person('person-tan',0xa56e49);person('person-dark',0x2f3b4c,0x8f5d42);
    // Garda - stylised Irish uniform/high-vis
    const gd=this.make.graphics({x:0,y:0},false);
    gd.fillStyle(0x000000,.15);gd.fillEllipse(32,79,45,12);gd.fillStyle(0x172a3b);gd.fillRoundedRect(18,51,9,26,3);gd.fillRoundedRect(37,51,9,26,3);
    gd.fillStyle(0xf2d83a);gd.fillRoundedRect(12,27,40,34,7);gd.lineStyle(4,0xb7c8ce);gd.lineBetween(14,38,50,38);gd.lineBetween(14,49,50,49);
    gd.fillStyle(0xd79a73);gd.fillCircle(32,19,12);gd.fillStyle(0x1e3650);gd.fillRoundedRect(18,7,28,9,4);gd.fillRect(22,3,20,8);
    gd.generateTexture('garda',64,88);gd.destroy();

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
    vehicle('bus',0x2f80b9,164,74);
    vehicle('van',0xd9d4c8,122,64);
  }

  spawnTraffic(){
    const add=(key:string,x:number,y:number,speed:number,lane:number)=>{
      const s=this.physics.add.sprite(x,y,key).setDepth(26);s.body!.setImmovable(true);this.vehicles.push({sprite:s,speed,lane});
    };
    for(let i=0;i<5;i++)add(i%3===0?'bus':i%3===1?'taxi':'van',450+i*680,835,100+Math.random()*30,0);
    for(let i=0;i<5;i++){add(i%2?'taxi':'bus',260+i*720,1165,-105-Math.random()*25,1);this.vehicles[this.vehicles.length-1].sprite.setFlipX(true);}
  }

  spawnPeople(){
    const tex=['person-blue','person-red','person-green','person-tan','person-dark'];
    const food=[
      {key:'food-chips',name:'chips',value:20},
      {key:'food-roll',name:'chicken fillet roll',value:50},
      {key:'food-coffee',name:'coffee',value:15},
      {key:'food-ice',name:'ice cream',value:30},
      {key:'food-spice',name:'spice bag',value:75}
    ];
    for(let i=0;i<34;i++){
      const upper=i<20;
      const x=120+Math.random()*(WORLD_W-240);
      const y=upper?535+Math.random()*160:1300+Math.random()*210;
      const p=this.physics.add.sprite(x,y,tex[i%tex.length]).setDepth(22);
      p.body!.setCircle(16,14,42);p.setData('baseSpeed',18+Math.random()*22);
      const f=food[i%food.length];
      const fi=this.add.image(x+24,y-20,f.key).setScale(.66).setDepth(23);
      const ring=this.add.circle(x,y,34,0xffe784,0).setStrokeStyle(3,0xffe784,0).setDepth(18);
      this.targets.push({person:p,food:fi,ring,value:f.value,name:f.name,stolen:false,vx:(Math.random()-.5),vy:(Math.random()-.5)*.4,panicUntil:0});
    }
  }

  spawnCameos(){
    const m=this.physics.add.sprite(3180,1375,'michael').setDepth(22);
    this.add.text(m.x,m.y-62,'Michael D.',{fontFamily:'Trebuchet MS',fontSize:'13px',fontStyle:'bold',color:'#22384b',backgroundColor:'#fff3cfcc',padding:{x:7,y:4}}).setOrigin(.5).setDepth(23);
    m.setData('cameo',true);
  }

  spawnGarda(x:number,y:number,chaser=true){
    const g=this.physics.add.sprite(x,y,'garda').setDepth(25);g.setData('chaser',chaser);g.setData('homeX',x);g.setData('homeY',y);this.gardai.push(g);
  }

  select(t:Target){
    if(this.selected)this.selected.ring.setStrokeStyle(3,0xffe784,0);
    this.selected=t;t.ring.setStrokeStyle(3,0xffe784,.9);
    this.toast(t.name.toUpperCase()+' TARGETED');
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
    const speed=boost?430:315;
    this.gull.setVelocity(dx*speed,dy*speed);
    if(Math.abs(dx)>.08)this.gull.setFlipX(dx<0);
    this.gull.setAngle(Phaser.Math.Clamp(dy*10,-10,10));

    if(controls.consumeDive())this.startDive(time);
    if(controls.consumeGrab())this.tryGrab(time);
    if(time>this.diveUntil&&this.altitudeTarget<.6)this.altitudeTarget=.7;
    this.altitude=Phaser.Math.Linear(this.altitude,this.altitudeTarget,Math.min(1,dt*4.8));
    const sc=.72+this.altitude*.42;this.gull.setScale(sc);
    this.gull.setDepth(45+Math.round(this.altitude*28));
    this.shadow.setPosition(this.gull.x+16,this.gull.y+28+this.altitude*58);
    this.shadow.setScale(1.15-this.altitude*.38,.9-this.altitude*.25);
    this.shadow.setAlpha(.36-this.altitude*.18);
    this.carryText.setPosition(this.gull.x,this.gull.y-58*sc);

    this.updateTargets(time,dt);
    this.updateTraffic(dt);
    this.updateGardai(time,dt);
    this.updateSelection();

    const zone=this.gull.x<900?'DAME STREET':this.gull.x<1750?'DAME STREET · EAST':this.gull.x<2650?'COLLEGE GREEN APPROACH':'CITY CENTRE';
    this.districtText.setText(zone);
  }

  startDive(time:number){
    this.altitudeTarget=.08;this.diveUntil=time+850;
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
    this.score+=t.value*(1+this.wanted*.2);this.stolen++;
    this.altitudeTarget=.82;this.diveUntil=time;
    this.carryText.setText(t.name.toUpperCase()+'!');
    this.time.delayedCall(1150,()=>this.carryText.setText(''));
    setText('score',Math.floor(this.score).toLocaleString());setText('stolen',String(this.stolen));
    this.toast('STOLEN: '+t.name.toUpperCase()+'  +'+t.value);
    this.raiseWanted();
    if(this.selected===t)this.selected=null;
  }

  raiseWanted(){
    const level=Phaser.Math.Clamp(Math.floor((this.stolen+1)/3),0,5);
    if(level===this.wanted)return;
    this.wanted=level;setWanted(level);
    this.toast(level>=4?'DUBLIN HAS HAD ENOUGH.':'WANTED LEVEL '+level);
    if(level>=2&&level>this.lastWanted){
      const sx=this.gull.x+(Math.random()>.5?430:-430),sy=this.gull.y+(Math.random()-.5)*280;
      this.spawnGarda(Phaser.Math.Clamp(sx,80,WORLD_W-80),Phaser.Math.Clamp(sy,520,1480),true);
    }
    this.lastWanted=level;
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
        t.person.x+=t.vx*s*dt;t.person.y+=t.vy*s*dt;
        if(t.person.x<80||t.person.x>WORLD_W-80)t.vx*=-1;
        const minY=t.person.y<900?515:1285,maxY=t.person.y<900?715:1530;
        if(t.person.y<minY||t.person.y>maxY)t.vy*=-1;
        t.food.setPosition(t.person.x+24,t.person.y-20);
        t.ring.setPosition(t.person.x,t.person.y+4);
      }
    }
  }

  updateTraffic(dt:number){
    for(const v of this.vehicles){
      v.sprite.x+=v.speed*dt;
      if(v.speed>0&&v.sprite.x>WORLD_W+180)v.sprite.x=-180;
      if(v.speed<0&&v.sprite.x<-180)v.sprite.x=WORLD_W+180;
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
    this.toast(message);
    if(this.feathers<=0)this.gameOver();
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
  $('startScreen')?.classList.add('hidden');
  $('hud')?.classList.remove('hidden');
  $('controls')?.classList.remove('hidden');
  setupStick();bindButton('diveBtn','dive');bindButton('grabBtn','grab');bindButton('boostBtn','boost');
  (window as any).__seagullGame=new Phaser.Game({
    type:Phaser.AUTO,
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
$('playBtn')?.addEventListener('click',startGame);
$('restartBtn')?.addEventListener('click',()=>location.reload());
window.addEventListener('seagull-gameover',(ev:any)=>{
  $('controls')?.classList.add('hidden');$('gameOver')?.classList.remove('hidden');
  setText('finalScore',Number(ev.detail.score).toLocaleString());
  setText('finalStolen',String(ev.detail.stolen));setText('bestScore',Number(ev.detail.best).toLocaleString());
});
