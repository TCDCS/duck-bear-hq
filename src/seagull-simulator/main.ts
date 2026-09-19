import Phaser from 'phaser';

const GAME_W=1280;
const GAME_H=720;
const FOOD_TYPES=[
  {key:'food-chips',name:'chips',value:20},
  {key:'food-roll',name:'chicken fillet roll',value:50},
  {key:'food-coffee',name:'coffee',value:15},
  {key:'food-ice',name:'ice cream',value:30},
  {key:'food-spice',name:'spice bag',value:75},
  {key:'food-sandwich',name:'sandwich',value:35},
  {key:'food-doughnut',name:'doughnut',value:25},
  {key:'food-takeaway',name:'takeaway bag',value:100}
] as const;
type FoodDef=(typeof FOOD_TYPES)[number];
function foodForArea(x:number,seed:number=Math.random()*1000):FoodDef{
  const pools=x>=7000
    ? ['food-sandwich','food-sandwich','food-ice','food-chips','food-takeaway','food-coffee']
    : x>=5200
      ? ['food-coffee','food-coffee','food-ice','food-doughnut','food-doughnut','food-roll']
      : x>=3400
        ? ['food-coffee','food-coffee','food-roll','food-chips','food-doughnut','food-ice']
        : ['food-chips','food-chips','food-roll','food-spice','food-coffee','food-takeaway'];
  const key=pools[Math.abs(Math.floor(seed))%pools.length];
  return FOOD_TYPES.find(f=>f.key===key)!;
}
function pedestrianForArea(x:number,seed:number){
  const pools=x>=7000
    ? ['person-runner','person-green','person-tan','person-blue','person-dark']
    : x>=5200
      ? ['person-tourist','person-red','person-tan','person-office','person-blue']
      : x>=3400
        ? ['person-office','person-blue','person-dark','person-tourist','person-green']
        : ['person-tourist','person-builder','person-office','person-tan','person-blue','person-red','person-dark'];
  return pools[Math.abs(Math.floor(seed))%pools.length];
}
const WORLD_W=8800;
const WORLD_H=1800;
const VERSION='1.1.0';
const UPDATE_LOG=[
  {
    version:'1.1.0',
    date:'19 September 2026',
    title:'Dublin Detail & Identity Update',
    changes:[
      'Rebuilt College Green around Trinity College Dublin’s West Front and Front Gate.',
      'Replaced Insomnia with Tesco on Dame Street.',
      'Replaced Dublin Deli with Yeeros using the supplied Yeeros artwork.',
      'Added current Grafton Street storefronts including LEGO Store and Disney Store.',
      'Upgraded shop façades, paving, railings and street furniture with more geometry.',
      'Added Settings and a clickable Update Log.'
    ]
  },
  {
    version:'1.0',
    date:'19 September 2026',
    title:'Initial Live Release',
    changes:[
      'Launched the four-area Dublin route from Dame Street to St Stephen’s Green.',
      'Added free flight, diving, grabbing, landing, waddling and wanted/Garda gameplay.',
      'Added local progression, gull unlocks, upgrades, missions, trophies and run statistics.',
      'Added mobile performance, pause, accessibility and persistence hardening.'
    ]
  }
] as const;

type BirdId='dublin'|'big-lad'|'sneaky'|'absolute-unit';
type UpgradeKey='wings'|'beak'|'nerve';
type AchievementId='mine-now'|'spice-raider'|'combo-four'|'public-menace'|'ground-job'|'full-tour'|'mission-machine'|'feeding-frenzy';
type LifetimeStats={runs:number;totalFood:number;totalScore:number;bestCombo:number;highestWanted:number;missionsCompleted:number};
type ProgressState={
  coins:number;
  selectedBird:BirdId;
  unlockedBirds:BirdId[];
  upgrades:Record<UpgradeKey,number>;
  achievements:AchievementId[];
  stats:LifetimeStats;
};
const BIRDS:Record<BirdId,{name:string;cost:number;speed:number;grab:number;heat:number;feathers:number;scale:number;tint?:number;previewFilter:string;blurb:string}>={
  dublin:{name:'Dublin Gull',cost:0,speed:1,grab:92,heat:1,feathers:3,scale:1,previewFilter:'none',blurb:'Balanced. Loud. Completely shameless.'},
  'big-lad':{name:'Big Lad',cost:180,speed:.94,grab:106,heat:1.08,feathers:4,scale:1.12,tint:0xffefd2,previewFilter:'sepia(.25) saturate(.8)',blurb:'Tougher and better at grabbing, but harder to ignore.'},
  sneaky:{name:'Sneaky Gull',cost:350,speed:1.08,grab:88,heat:.82,feathers:3,scale:.94,tint:0xd9eef3,previewFilter:'hue-rotate(155deg) saturate(.6)',blurb:'Quick and less suspicious. Smaller reach.'},
  'absolute-unit':{name:'Absolute Unit',cost:650,speed:.98,grab:116,heat:1.18,feathers:5,scale:1.2,tint:0xc8ced0,previewFilter:'grayscale(.45) brightness(.9)',blurb:'Huge reach and five feathers. Everyone notices.'}
};
const UPGRADE_COSTS=[40,70,110,160,230];
const UPGRADE_META:Record<UpgradeKey,{name:string;blurb:string}>={
  wings:{name:'Wings',blurb:'A little more flight and waddle speed.'},
  beak:{name:'Beak',blurb:'A little more reach when grabbing food.'},
  nerve:{name:'Nerve',blurb:'Wanted heat builds slightly more slowly.'}
};
const ACHIEVEMENTS:Record<AchievementId,{name:string;desc:string;icon:string}>={
  'mine-now':{name:'Mine Now',desc:'Steal your first snack.',icon:'01'},
  'spice-raider':{name:'Spice Raider',desc:'Steal a spice bag.',icon:'SB'},
  'combo-four':{name:'Four on the Floor',desc:'Reach a x4 theft combo.',icon:'x4'},
  'public-menace':{name:'Public Menace',desc:'Reach five-star wanted heat.',icon:'★'},
  'ground-job':{name:'Ground Job',desc:'Steal food while waddling on the ground.',icon:'G'},
  'full-tour':{name:'Full Tour',desc:'Visit all four Dublin areas in one run.',icon:'4'},
  'mission-machine':{name:'Mission Machine',desc:'Complete three missions in one run.',icon:'M'},
  'feeding-frenzy':{name:'Feeding Frenzy',desc:'Steal 25 items in one run.',icon:'25'}
};
function loadProgress():ProgressState{
  const fallback:ProgressState={coins:0,selectedBird:'dublin',unlockedBirds:['dublin'],upgrades:{wings:0,beak:0,nerve:0},achievements:[],stats:{runs:0,totalFood:0,totalScore:0,bestCombo:1,highestWanted:0,missionsCompleted:0}};
  try{
    const raw=JSON.parse(storageGet('seagull-progress-v1')||'null');
    if(!raw||typeof raw!=='object')return fallback;
    const unlocked=(Array.isArray(raw.unlockedBirds)?raw.unlockedBirds:[]).filter((id:any)=>id in BIRDS) as BirdId[];
    if(!unlocked.includes('dublin'))unlocked.unshift('dublin');
    const selected=(typeof raw.selectedBird==='string'&&raw.selectedBird in BIRDS&&unlocked.includes(raw.selectedBird as BirdId))?raw.selectedBird as BirdId:'dublin';
    return {
      coins:Math.max(0,Math.floor(Number(raw.coins)||0)),
      selectedBird:selected,
      unlockedBirds:[...new Set(unlocked)],
      upgrades:{
        wings:Phaser.Math.Clamp(Math.floor(Number(raw.upgrades?.wings)||0),0,5),
        beak:Phaser.Math.Clamp(Math.floor(Number(raw.upgrades?.beak)||0),0,5),
        nerve:Phaser.Math.Clamp(Math.floor(Number(raw.upgrades?.nerve)||0),0,5)
      },
      achievements:[...new Set((Array.isArray(raw.achievements)?raw.achievements:[]).filter((id:any)=>id in ACHIEVEMENTS))] as AchievementId[],
      stats:{
        runs:Math.max(0,Math.floor(Number(raw.stats?.runs)||0)),
        totalFood:Math.max(0,Math.floor(Number(raw.stats?.totalFood)||0)),
        totalScore:Math.max(0,Math.floor(Number(raw.stats?.totalScore)||0)),
        bestCombo:Phaser.Math.Clamp(Math.floor(Number(raw.stats?.bestCombo)||1),1,4),
        highestWanted:Phaser.Math.Clamp(Math.floor(Number(raw.stats?.highestWanted)||0),0,5),
        missionsCompleted:Math.max(0,Math.floor(Number(raw.stats?.missionsCompleted)||0))
      }
    };
  }catch{return fallback;}
}
let progress=loadProgress();
function saveProgress(){storageSet('seagull-progress-v1',JSON.stringify(progress));}
function selectedBird(){return BIRDS[progress.selectedBird];}
function unlockAchievement(id:AchievementId){
  if(progress.achievements.includes(id))return false;
  progress.achievements.push(id);saveProgress();renderProgression();return true;
}


type Target = {
  person: Phaser.GameObjects.Sprite;
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
  sprite: Phaser.GameObjects.Sprite;
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
function resetControls(){
  controls.x=0;controls.y=0;controls.dive=false;controls.diveHeld=false;controls.grab=false;controls.boost=false;
  const knob=document.getElementById('stickKnob');
  if(knob)knob.style.transform='translate(-50%,-50%)';
}

function storageGet(key:string){try{return localStorage.getItem(key);}catch{return null;}}
function storageSet(key:string,value:string){try{localStorage.setItem(key,value);return true;}catch{return false;}}
const reducedMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const deviceMemory=Number((navigator as any).deviceMemory||0);
const coreCount=Number(navigator.hardwareConcurrency||0);
const lowPowerMode=new URLSearchParams(location.search).has('lowpower')||(deviceMemory>0&&deviceMemory<=4)||(innerWidth<1000&&coreCount>0&&coreCount<=4);
let audioCtx:AudioContext|null=null;
let soundEnabled=storageGet('seagull-muted')!=='1';
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
function sfx(name:'grab'|'dive'|'hit'|'wanted'|'target'|'bell'){
  if(name==='grab'){tone(520,.06,'square',.025,220);setTimeout(()=>tone(880,.09,'triangle',.03,180),45);}
  if(name==='dive'){tone(240,.13,'sawtooth',.018,-120);}
  if(name==='hit'){tone(120,.16,'square',.035,-55);}
  if(name==='wanted'){tone(620,.07,'square',.025,0);setTimeout(()=>tone(760,.08,'square',.025,0),80);}
  if(name==='target')tone(440,.045,'triangle',.014,90);
  if(name==='bell'){tone(920,.06,'sine',.018,70);setTimeout(()=>tone(1080,.08,'sine',.016,-80),95);}
}
function haptic(ms:number){try{navigator.vibrate?.(ms);}catch{}}

const $=(id:string)=>document.getElementById(id);
function setText(id:string,value:string){const el=$(id);if(el)el.textContent=value;}
function setWanted(level:number){
  const el=$('wantedStars');
  if(el)el.textContent='★'.repeat(level)+'☆'.repeat(5-level);
}
function setFeathers(n:number,total=3){setText('feathers','●'.repeat(Math.max(0,n))+'○'.repeat(Math.max(0,total-n)));}

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
  gardai:Phaser.GameObjects.Sprite[]=[];
  vehicles:Vehicle[]=[];
  pigeons:Phaser.GameObjects.Sprite[]=[];
  lastLuasBellAt=0;
  keys:any;
  altitude=.7;
  altitudeTarget=.7;
  grounded=false;
  toldWaddle=false;
  score=0;
  stolen=0;
  wanted=0;
  heat=0;
  bird=selectedBird();
  maxFeathers=this.bird.feathers;
  feathers=this.maxFeathers;
  completedMissions=0;
  highestWanted=0;
  bestCombo=1;
  bestTheftName='—';
  bestTheftValue=0;
  activeRunMs=0;
  areasVisited=new Set<string>();
  combo=1;
  lastTheftAt=0;
  lastHeatEvent=0;
  missionIndex=0;
  missionProgress=0;
  missionTarget=3;
  missionKind:'any'|'chips'|'roll'|'spice'='any';
  selected:Target|null=null;
  diveTarget:Target|null=null;
  diveAssistUntil=0;
  diveUntil=0;
  wasHeatLevel=0;
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
    const brand='/games/seagull-simulator/brands/';
    this.load.svg('brand-centra',brand+'centra.svg');
    this.load.svg('brand-supervalu',brand+'supervalu.svg');
    this.load.svg('brand-tesco',brand+'tesco.svg');
    this.load.svg('brand-mcdonalds',brand+'mcdonalds.svg');
    this.load.svg('brand-spar',brand+'spar.svg');
    this.load.svg('brand-boots',brand+'boots.svg');
    this.load.svg('brand-brown-thomas',brand+'brown-thomas.svg');
    this.load.svg('brand-bewleys',brand+'bewleys.svg');
    this.load.svg('brand-lego',brand+'lego.svg');
    this.load.svg('brand-disney-store',brand+'disney-store.svg');
    this.load.image('brand-yeeros',brand+'yeeros.jpg');
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
    this.spawnAmbientPigeons();
    this.spawnCameos();
    this.spawnGarda(1840,610,false);
    this.spawnGarda(4210,640,false);

    this.shadow=this.add.ellipse(520,780,74,24,0x173747,.25).setDepth(39);
    this.gull=this.physics.add.sprite(520,690,'gull-1').setDepth(60).setDisplaySize(118,84);
    if(this.bird.tint)this.gull.setTint(this.bird.tint);else this.gull.clearTint();
    this.gull.setCollideWorldBounds(true);
    this.gull.body!.setCircle(28,14,12);
    this.anims.create({key:'fly',frames:[{key:'gull-0'},{key:'gull-1'},{key:'gull-2'},{key:'gull-1'}],frameRate:8,repeat:-1});
    this.gull.play('fly');
    const startArea=new URLSearchParams(location.search).get('area');
    if(startArea==='dame-east')this.gull.setPosition(2200,690);
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
    setWanted(0);setFeathers(this.feathers,this.maxFeathers);this.setMission(0);
    this.time.delayedCall(900,()=>this.toast('Find food. Dive low. Grab it. Get out.'));
    const tutorialKey='seagull-tutorial-seen-v1';
    if(!new URLSearchParams(location.search).has('smoke')&&!storageGet(tutorialKey)){
      storageSet(tutorialKey,'1');
      this.time.delayedCall(3400,()=>this.toast('HOLD DIVE TO SWOOP DOWN · KEEP HOLDING TO LAND'));
      this.time.delayedCall(6200,()=>this.toast('GRAB UP CLOSE · FLAP TO ESCAPE OR TAKE OFF'));
    }
    document.documentElement.dataset.seagullReady='1';
    if(new URLSearchParams(location.search).has('smoke')){
      const actors:any[]=[this.gull,...this.targets.map(t=>t.person),...this.gardai,...this.vehicles.map(v=>v.sprite),...this.pigeons];
      document.documentElement.dataset.seagullPhysicsBodies=String(actors.filter(a=>Boolean(a?.body)).length);
      document.documentElement.dataset.seagullLowPower=lowPowerMode?'1':'0';
      document.documentElement.dataset.seagullPigeons=String(this.pigeons.length);
    }
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
    if(new URLSearchParams(location.search).has('feelcheck')){
      document.documentElement.dataset.seagullFeelScheduled='1';
      try{
        this.heat=60;this.wanted=3;setWanted(3);
        const g=this.gardai.find(q=>q.getData('chaser'))||this.spawnAndReturnGarda(this.gull.x+260,this.gull.y+40);
        this.altitude=.86;this.altitudeTarget=.86;
        g.setData('lostSightSince',1000);g.setData('cooldownUntil',0);
        this.updateGardai(3100,.016);
        const cooldown=Number(g.getData('cooldownUntil')||0);
        document.documentElement.dataset.seagullFeelExercised=cooldown>3100?'1':'0';
      }catch(err){
        document.documentElement.dataset.seagullFeelError=String(err).slice(0,120);
      }
    }
    if(new URLSearchParams(location.search).has('summarycheck')){
      document.documentElement.dataset.seagullSummaryScheduled='1';
      try{
        this.score=1240;this.stolen=12;this.bestCombo=4;this.combo=4;
        this.bestTheftName='spice bag';this.bestTheftValue=75;this.highestWanted=4;
        this.completedMissions=2;this.activeRunMs=93500;
        ['DAME STREET','COLLEGE GREEN','GRAFTON STREET',"ST STEPHEN'S GREEN"].forEach(z=>this.areasVisited.add(z));
        this.gameOver();
        document.documentElement.dataset.seagullSummaryExercised='1';
      }catch(err){
        document.documentElement.dataset.seagullSummaryError=String(err).slice(0,120);
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
      {x:60,w:470,name:'CENTRA',c:0x167daf,s:0xffc52d,brand:'brand-centra'},
      {x:540,w:500,name:'SuperValu',c:0xb63036,s:0xffffff,brand:'brand-supervalu'},
      {x:1050,w:430,name:'TESCO',c:0xffffff,s:0xe31837,brand:'brand-tesco'},
      {x:1490,w:520,name:"McDONALD'S",c:0x202426,s:0xffffff,brand:'brand-mcdonalds'},
      {x:2020,w:450,name:'SPAR',c:0xffffff,s:0xd5222b,brand:'brand-spar'},
      {x:2480,w:520,name:'DUBLIN CITY',c:0x34536a,s:0xffffff,brand:undefined},
      {x:3010,w:520,name:'YEEROS',c:0x29479c,s:0xffffff,brand:'brand-yeeros'}
    ];
    for(const s of shops)this.shop(s.x,70,s.w,390,s.name,s.c,s.s,s.brand);
    this.collegeGreen(3600);
    this.graftonStreet(5200);
    this.stephensGreen(7000);
    // street furniture
    for(let x=160;x<5200;x+=300)this.lamp(x,610);
    for(let x=280;x<5200;x+=520)this.bin(x,680);
    for(let x=420;x<5200;x+=690)this.flowerBasket(x,545);
    for(let x=690;x<5200;x+=920)this.cafeBoard(x,676,x%1840<900?'COFFEE':'DELI');
    for(let x=120;x<5200;x+=115){g.fillStyle(0x2e3f49);g.fillRoundedRect(x,720,13,36,5);}
    for(const x of [920,2190,3900,4790])this.trafficLight(x,720);
    for(const x of [430,2670,5480,6400])this.bikeRack(x,690);
    this.busStop(1780,688,'DAME ST');this.busStop(4320,688,'COLLEGE GREEN');
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

  shop(x:number,y:number,w:number,h:number,name:string,colour:number,sign:number,brandKey?:string){
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
    // deep fascia / cornice
    g.fillStyle(0x5f5043,.28);g.fillRect(x+17,y+273,w-34,12);
    g.fillStyle(colour);g.fillRoundedRect(x+12,y+182,w-24,84,4);
    g.fillStyle(0xe9dcc3);g.fillRect(x+8,y+272,w-16,17);
    g.fillStyle(0xc0a985);g.fillRect(x+8,y+286,w-16,5);
    // projecting awning teeth
    g.fillStyle(0xf2efe1);for(let ax=x+22;ax<x+w-34;ax+=72)g.fillTriangle(ax,y+265,ax+62,y+265,ax+31,y+291);
    // lower shop front with pilasters and mullions
    g.fillStyle(0x456474);g.fillRect(x+25,y+295,w-50,145);
    for(let px=x+22;px<x+w-20;px+=124){g.fillStyle(0x8b755c);g.fillRect(px,y+289,9,157);g.fillStyle(0xd2bd98);g.fillRect(px+2,y+289,4,157);}
    for(let wx=x+35;wx<x+w-70;wx+=125){
      g.fillStyle(0xb9e4e5,.78);g.fillRect(wx,y+305,96,112);
      g.fillStyle(0xffffff,.28);g.fillTriangle(wx+7,y+311,wx+77,y+311,wx+7,y+370);
      g.lineStyle(3,0x58717a,.7);g.lineBetween(wx+48,y+306,wx+48,y+417);g.lineBetween(wx+2,y+361,wx+94,y+361);
      g.fillStyle(0xf8e7aa,.38);g.fillRect(wx+8,y+388,80,20);
    }
    // recessed entrance and brass/stone sill
    const doorX=x+w-82;g.fillStyle(0x273c47);g.fillRoundedRect(doorX,y+314,43,126,4);
    g.fillStyle(0xaed1d5,.7);g.fillRect(doorX+6,y+322,31,71);g.fillStyle(0xc9a65f);g.fillCircle(doorX+32,y+407,3);
    g.fillStyle(0xb8a17e);g.fillRect(x+18,y+439,w-36,8);
    // upper façade corner blocks and shallow cornice shadow
    g.fillStyle(0x9c8265,.5);g.fillRect(x+4,y+48,13,132);g.fillRect(x+w-17,y+48,13,132);
    g.fillStyle(0x7f684f,.3);g.fillRect(x+12,y+174,w-24,9);
    const fallback=this.add.text(x+w/2,y+225,name,{fontFamily:'Arial Black, sans-serif',fontSize:Math.min(42,Math.max(24,w/name.length*.9))+'px',color:'#'+sign.toString(16).padStart(6,'0')}).setOrigin(.5).setDepth(4);
    if(brandKey&&this.textures.exists(brandKey)){
      const logo=this.add.image(x+w/2,y+225,brandKey).setDepth(5);
      const maxW=w-52,maxH=64;
      const scale=Math.min(maxW/Math.max(1,logo.width),maxH/Math.max(1,logo.height));
      logo.setScale(scale);
      fallback.setVisible(false);
    }
  }
  lamp(x:number,y:number){
    const g=this.add.graphics().setDepth(8);g.fillStyle(0x263c48);g.fillRoundedRect(x,y-105,10,125,5);g.fillCircle(x+5,y-110,16);g.fillStyle(0xffe6a3);g.fillCircle(x+5,y-110,8);
  }
  bin(x:number,y:number){
    const g=this.add.graphics().setDepth(8);g.fillStyle(0x263e45);g.fillRoundedRect(x,y-42,34,52,5);g.fillStyle(0x101e23);g.fillRect(x+5,y-33,24,8);
  }

  trafficLight(x:number,y:number){
    const g=this.add.graphics().setDepth(15);
    g.fillStyle(0x24343d);g.fillRoundedRect(x,y-144,9,145,4);g.fillRoundedRect(x-12,y-145,34,74,6);
    g.fillStyle(0x151f24);g.fillCircle(x+5,y-130,8);g.fillCircle(x+5,y-109,8);g.fillCircle(x+5,y-88,8);
    g.fillStyle(0xe64b48);g.fillCircle(x+5,y-130,5);g.fillStyle(0xe7b83e,.35);g.fillCircle(x+5,y-109,5);g.fillStyle(0x55b968,.28);g.fillCircle(x+5,y-88,5);
    g.fillStyle(0xd9e3e1);g.fillRoundedRect(x-18,y-64,46,30,4);
    this.add.text(x+5,y-49,'WAIT',{fontFamily:'Arial Black',fontSize:'8px',color:'#24343d'}).setOrigin(.5).setDepth(16);
  }
  bikeRack(x:number,y:number){
    const g=this.add.graphics().setDepth(10);g.lineStyle(4,0x67777d,.9);
    for(let i=0;i<4;i++)g.strokeRoundedRect(x+i*24,y-35,20,36,9);
  }
  busStop(x:number,y:number,label:string){
    const g=this.add.graphics().setDepth(12);g.fillStyle(0x2e4d5c);g.fillRoundedRect(x,y-105,8,110,4);
    g.fillStyle(0x3c78a2);g.fillRoundedRect(x-13,y-116,34,32,6);g.fillStyle(0xf3cf45);g.fillCircle(x+4,y-100,8);
    this.add.text(x+31,y-103,label,{fontFamily:'Arial Black',fontSize:'8px',color:'#29404c',backgroundColor:'#f4f1e6',padding:{x:5,y:3}}).setOrigin(0,.5).setDepth(13);
  }

  collegeGreen(x:number){
    const g=this.add.graphics().setDepth(6);
    const left=x+24,right=x+1570,top=62,base=468,centre=x+790;

    // Trinity College Dublin West Front: long grey-granite wings.
    g.fillStyle(0xa7a69f);g.fillRect(left,top,right-left,base-top);
    g.fillStyle(0x7f817e,.35);g.fillRect(left+12,top+20,right-left-24,10);
    g.fillStyle(0xd0ccc0);g.fillRect(left,top,right-left,18);
    g.fillStyle(0x72746f,.35);g.fillRect(left,base-20,right-left,20);

    // Stone coursing and dressed corner blocks.
    g.lineStyle(2,0x8f918c,.42);
    for(let sy=top+48;sy<base-24;sy+=31)g.lineBetween(left+8,sy,right-8,sy);
    for(const ex of [left+8,right-26]){
      for(let sy=top+30;sy<base-28;sy+=38){g.fillStyle(0xc1beb3);g.fillRect(ex,sy,18,22);}
    }

    // Regular Georgian windows on both wings.
    for(const side of [-1,1]){
      const wingStart=side<0?left+55:centre+244;
      const wingEnd=side<0?centre-245:right-55;
      for(let wx=wingStart;wx<wingEnd;wx+=105){
        for(const wy of [142,260]){
          g.fillStyle(0x596d78);g.fillRoundedRect(wx,wy,54,76,3);
          g.fillStyle(0xbfc8c5,.16);g.fillTriangle(wx+6,wy+7,wx+46,wy+7,wx+6,wy+58);
          g.lineStyle(3,0xd8d4c8,.85);g.lineBetween(wx+27,wy+2,wx+27,wy+74);g.lineBetween(wx+2,wy+38,wx+52,wy+38);
          g.lineStyle(5,0x87877f,.65);g.strokeRect(wx-5,wy-6,64,87);
        }
      }
    }

    // Projecting central pavilion.
    g.fillStyle(0x969791);g.fillRect(centre-230,104,460,364);
    g.fillStyle(0xbebbb0);g.fillRect(centre-245,112,490,18);
    g.fillStyle(0x7c7d78,.35);g.fillRect(centre-245,452,490,16);

    // Pediment and roofline.
    g.fillStyle(0xaaa89f);g.fillTriangle(centre-226,104,centre,34,centre+226,104);
    g.lineStyle(7,0xd2cec2,.9);g.lineBetween(centre-230,105,centre,30);g.lineBetween(centre,30,centre+230,105);
    g.lineStyle(5,0x777974,.7);g.lineBetween(centre-205,106,centre+205,106);

    // Four monumental columns with stepped bases/capitals.
    for(const cx of [centre-158,centre-55,centre+55,centre+158]){
      g.fillStyle(0xc7c3b8);g.fillRect(cx-19,165,38,246);
      g.fillStyle(0xd9d5c8);g.fillRect(cx-27,151,54,17);g.fillRect(cx-24,405,48,13);
      g.fillStyle(0x8e8f89,.28);g.fillRect(cx+10,170,7,229);
      g.lineStyle(2,0x9c9b94,.5);for(let fl=0;fl<4;fl++)g.lineBetween(cx-12+fl*8,176,cx-12+fl*8,398);
    }

    // Circular clock in the pediment.
    g.fillStyle(0xeee9da);g.fillCircle(centre,76,25);g.lineStyle(5,0x6b6d69);g.strokeCircle(centre,76,25);
    g.lineStyle(3,0x343b3e);g.lineBetween(centre,76,centre,60);g.lineBetween(centre,76,centre+12,82);
    for(let a=0;a<12;a++){const rad=a*Math.PI/6;g.fillStyle(0x42494b);g.fillCircle(centre+Math.cos(rad)*19,76+Math.sin(rad)*19,1.8);}

    // Front Gate: deep arched opening with a glimpse toward Front Square/Campanile.
    g.fillStyle(0x253238);g.fillRect(centre-72,295,144,173);g.fillCircle(centre,297,72);
    g.fillStyle(0x6fa36a);g.fillRect(centre-57,323,114,139);
    g.fillStyle(0xd6caa9);g.fillRect(centre-8,330,16,94);g.fillStyle(0xede3c9);g.fillRect(centre-22,326,44,10);
    g.fillStyle(0x8f8a7d);g.fillRect(centre-28,414,56,8);g.fillStyle(0x4a6c66);g.fillCircle(centre,324,14);
    g.fillStyle(0x272f31);g.fillRoundedRect(centre-69,339,9,127,4);g.fillRoundedRect(centre+60,339,9,127,4);

    // Entrance keystone / moulding.
    g.lineStyle(9,0xd0ccc0);g.strokeCircle(centre,299,79);g.fillStyle(0xd7d2c6);g.fillRect(centre-83,296,166,12);

    // Trinity boundary lawns / biodiversity strips.
    g.fillStyle(0x6da35e);g.fillRect(left,505,right-left,115);
    g.fillStyle(0x51884d);g.fillRect(left,608,right-left,28);
    for(let fx=left+30;fx<right-30;fx+=31){
      g.fillStyle([0xf1d45c,0xe77b9b,0xf4eee3,0x8bc6dd][Math.floor(fx/31)%4]);g.fillCircle(fx,552+(fx%3)*13,4);
    }

    // Black iron perimeter railings with the central gates opened toward Front Gate.
    g.lineStyle(6,0x26343a);g.lineBetween(left,648,right,648);
    for(let rx=left;rx<centre-108;rx+=18){g.lineStyle(3,0x26343a);g.lineBetween(rx,557,rx,650);g.fillStyle(0x26343a);g.fillTriangle(rx-4,557,rx+4,557,rx,546);}
    for(let rx=centre+108;rx<right;rx+=18){g.lineStyle(3,0x26343a);g.lineBetween(rx,557,rx,650);g.fillStyle(0x26343a);g.fillTriangle(rx-4,557,rx+4,557,rx,546);}
    // Open gate leaves.
    g.lineStyle(5,0x26343a);for(let i=0;i<7;i++){g.lineBetween(centre-110+i*14,563,centre-195+i*7,646);g.lineBetween(centre+110-i*14,563,centre+195-i*7,646);}
    g.fillStyle(0x5a5b56);g.fillRoundedRect(centre-118,548,18,105,5);g.fillRoundedRect(centre+100,548,18,105,5);

    // Subtle landmark plaque, avoiding a giant fictional sign on the historic front.
    this.add.text(centre,492,'TRINITY COLLEGE DUBLIN',{fontFamily:'Georgia, serif',fontSize:'15px',fontStyle:'bold',color:'#404945',backgroundColor:'#e9e3d4d9',padding:{x:9,y:5}}).setOrigin(.5).setDepth(10);
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
    g.lineStyle(5,0xb3a58b,.6);g.lineBetween(x+580,500,x+580,1550);g.lineBetween(x+1220,500,x+1220,1550);
    g.lineStyle(3,0x8d816f,.45);for(let px=x+60;px<x+1760;px+=170)g.lineBetween(px,520,px+95,1535);
    // Grafton Street businesses, ordered as a recognisable high-street run.
    this.shop(x+18,70,275,390,'BOOTS',0x123d8d,0xffffff,'brand-boots');
    this.shop(x+302,70,286,390,'LEGO',0xf00000,0xffffff,'brand-lego');
    this.shop(x+598,70,324,390,'DISNEY STORE',0xf7f8fb,0x0a1d5a,'brand-disney-store');
    this.shop(x+932,70,340,390,"BEWLEY'S",0x6a2b2d,0xf0d6a2,'brand-bewleys');
    this.shop(x+1282,70,490,390,'BROWN THOMAS',0x1f2022,0xffffff,'brand-brown-thomas');
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
    const noteCount=lowPowerMode?1:3;
    for(let i=0;i<noteCount;i++){
      const note=this.add.text(x+12+i*16,y-32-i*7,i%2?'♫':'♪',{fontFamily:'Arial',fontSize:'15px',color:'#6a355d',stroke:'#fff5d0',strokeThickness:2}).setDepth(28).setAlpha(.1);
      if(reducedMotion||lowPowerMode)note.setAlpha(.55);else this.tweens.add({targets:note,y:note.y-42,alpha:{from:.15,to:.9},duration:1100+i*180,delay:i*330,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    }
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
    if(!this.textures.exists('gull-walk')){
      const gw=this.make.graphics({x:0,y:0},false);
      gw.fillStyle(0x000000,.12);gw.fillEllipse(48,78,60,12);
      gw.fillStyle(0xf7f7f0);gw.fillEllipse(48,48,58,34);
      gw.fillStyle(0xd4dadd);gw.fillEllipse(32,51,30,19);
      gw.fillStyle(0xf7f7f0);gw.fillCircle(73,39,17);
      gw.fillStyle(0xf0a92f);gw.fillTriangle(87,39,108,44,87,48);
      gw.fillStyle(0x1d2c35);gw.fillCircle(78,34,3);
      gw.lineStyle(4,0xe5a62b);gw.lineBetween(41,64,41,85);gw.lineBetween(60,64,60,85);
      gw.generateTexture('gull-walk',116,92);gw.destroy();
    }

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
    const pg=this.make.graphics({x:0,y:0},false);
    pg.fillStyle(0x000000,.12);pg.fillEllipse(24,34,32,8);
    pg.fillStyle(0x697780);pg.fillEllipse(24,24,30,20);
    pg.fillStyle(0x55636c);pg.fillCircle(36,18,10);
    pg.fillStyle(0x3e8a7c);pg.fillEllipse(31,20,11,8);
    pg.fillStyle(0xd9954a);pg.fillTriangle(45,18,55,21,45,24);
    pg.fillStyle(0xf2a0a4);pg.fillRoundedRect(17,32,3,8,1);pg.fillRoundedRect(28,32,3,8,1);
    pg.fillStyle(0x172830);pg.fillCircle(39,15,2);
    pg.generateTexture('pigeon',58,44);pg.destroy();
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

    const food=(key:string,kind:'chips'|'roll'|'coffee'|'ice'|'spice'|'sandwich'|'doughnut'|'takeaway')=>{
      const g=this.make.graphics({x:0,y:0},false);
      if(kind==='chips'){g.fillStyle(0xd7373f);g.fillRoundedRect(8,14,30,31,5);g.fillStyle(0xf5d34f);for(let i=0;i<5;i++)g.fillRoundedRect(10+i*6,4+(i%2)*4,5,21,2);}
      if(kind==='roll'){g.fillStyle(0xc98d48);g.fillRoundedRect(4,14,42,22,11);g.fillStyle(0x70a756);g.fillRect(14,16,18,4);g.fillStyle(0xf6d8a2);g.fillEllipse(25,15,38,8);}
      if(kind==='coffee'){g.fillStyle(0xead7bd);g.fillRoundedRect(9,10,28,36,5);g.fillStyle(0x6c3928);g.fillRect(10,19,26,16);g.fillStyle(0xffffff);g.fillRect(12,8,22,5);}
      if(kind==='ice'){g.fillStyle(0xd5a168);g.fillTriangle(13,23,37,23,25,48);g.fillStyle(0xf1b4d1);g.fillCircle(25,18,13);}
      if(kind==='spice'){g.fillStyle(0x402d26);g.fillRoundedRect(5,12,40,32,5);g.fillStyle(0xf5c650);for(let i=0;i<6;i++)g.fillCircle(12+(i%3)*11,19+Math.floor(i/3)*12,6);}
      if(kind==='sandwich'){g.fillStyle(0xf0d3a0);g.fillTriangle(5,13,44,13,25,44);g.fillStyle(0x66a657);g.fillTriangle(9,17,40,17,25,38);g.fillStyle(0xd85e55);g.fillRect(14,20,22,5);}
      if(kind==='doughnut'){g.fillStyle(0xd89356);g.fillCircle(25,27,18);g.fillStyle(0xf19abd);g.fillCircle(25,23,15);g.fillStyle(0x72513c);g.fillCircle(25,25,6);for(const [sx,sy,col] of [[16,18,0xffe256],[31,16,0x69b6d7],[35,28,0xffffff],[18,31,0x78c777]] as any[]){g.fillStyle(col);g.fillRoundedRect(sx,sy,5,2,1);}}
      if(kind==='takeaway'){g.fillStyle(0xc9945a);g.fillRoundedRect(8,13,34,36,5);g.lineStyle(3,0x7c5635);g.strokeCircle(18,14,7);g.strokeCircle(32,14,7);g.fillStyle(0x3d7b46);g.fillRoundedRect(13,24,24,9,3);g.fillStyle(0xf4e4b7);g.fillRect(16,26,18,5);}
      g.generateTexture(key,50,54);g.destroy();
    };
    food('food-chips','chips');food('food-roll','roll');food('food-coffee','coffee');food('food-ice','ice');food('food-spice','spice');food('food-sandwich','sandwich');food('food-doughnut','doughnut');food('food-takeaway','takeaway');

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
      const s=this.add.sprite(x,y,key).setDepth(26);if(key==='bus')s.setDisplaySize(188,120);if(key==='luas')s.setDisplaySize(235,80);this.vehicles.push({sprite:s,speed,lane,minX,maxX});
    };
    for(let i=0;i<5;i++)add(i%3===0?'bus':i%3===1?'taxi':'van',450+i*680,835,100+Math.random()*30,0,0,5200);
    for(let i=0;i<5;i++){add(i%2?'taxi':'bus',260+i*720,1165,-105-Math.random()*25,1,0,5200);this.vehicles[this.vehicles.length-1].sprite.setFlipX(true);}
    add('luas',3900,925,72,2,3600,5200);add('luas',4920,925,-68,2,3600,5200);this.vehicles[this.vehicles.length-1].sprite.setFlipX(true);
  }

  spawnPeople(){
    for(let i=0;i<78;i++){
      const upper=i<35;
      const x=120+Math.random()*(WORLD_W-240);
      let y:number;
      if(x>=7000)y=690+Math.random()*760;
      else if(x>=5200)y=610+Math.random()*830;
      else y=upper?535+Math.random()*160:1300+Math.random()*210;
      const p=this.add.sprite(x,y,pedestrianForArea(x,i)).setDepth(22);
      p.setData('baseSpeed',18+Math.random()*22);
      const f=foodForArea(x,i);
      const fi=this.add.image(x+24,y-20,f.key).setScale(.66).setDepth(23);
      const ring=this.add.circle(x,y,34,0xffe784,0).setStrokeStyle(3,0xffe784,0).setDepth(18);
      const temperament=(['oblivious','suspicious','runner','defender'] as const)[i%4];
      this.targets.push({person:p,food:fi,ring,value:f.value,name:f.name,stolen:false,vx:(Math.random()-.5),vy:(Math.random()-.5)*.4,panicUntil:0,temperament});
    }
  }

  spawnAmbientPigeons(){
    const zones=[
      {minX:220,maxX:3200,minY:540,maxY:700,count:6},
      {minX:5350,maxX:6900,minY:700,maxY:1320,count:7},
      {minX:7200,maxX:8580,minY:720,maxY:1320,count:7}
    ];
    let n=0;
    for(const z of zones){
      const count=lowPowerMode?Math.max(2,Math.ceil(z.count*.5)):z.count;
      for(let i=0;i<count;i++){
      const x=Phaser.Math.Linear(z.minX,z.maxX,(i+1)/(count+1));
      const y=Phaser.Math.Linear(z.minY,z.maxY,((i*37)%count+1)/(count+1));
      const p=this.add.sprite(x,y,'pigeon').setDepth(20).setScale(.76+(i%3)*.08);
      p.setData('homeX',x);p.setData('homeY',y);p.setData('minX',z.minX);p.setData('maxX',z.maxX);p.setData('minY',z.minY);p.setData('maxY',z.maxY);p.setData('phase',n++*.83);
      this.pigeons.push(p);
      }
    }
  }

  updateAmbient(time:number,dt:number){
    for(const p of this.pigeons){
      if(Math.abs(p.x-this.gull.x)>(lowPowerMode?1100:1550))continue;
      const d=Phaser.Math.Distance.Between(p.x,p.y,this.gull.x,this.gull.y);
      if(d<175&&this.altitude<.48){
        const a=Phaser.Math.Angle.Between(this.gull.x,this.gull.y,p.x,p.y);
        p.x+=Math.cos(a)*190*dt;p.y+=Math.sin(a)*190*dt;
        p.setFlipX(Math.cos(a)<0);p.setAngle(Math.sin(time*.02+Number(p.getData('phase')))*7);
      }else{
        const hx=Number(p.getData('homeX')),hy=Number(p.getData('homeY')),phase=Number(p.getData('phase'));
        const tx=hx+Math.sin(time*.00055+phase)*34,ty=hy+Math.cos(time*.0007+phase)*18;
        p.x=Phaser.Math.Linear(p.x,tx,Math.min(1,dt*.9));p.y=Phaser.Math.Linear(p.y,ty,Math.min(1,dt*.9));
        p.setAngle(Math.sin(time*.001+phase)*2);
      }
      p.x=Phaser.Math.Clamp(p.x,Number(p.getData('minX')),Number(p.getData('maxX')));
      p.y=Phaser.Math.Clamp(p.y,Number(p.getData('minY')),Number(p.getData('maxY')));
    }
  }

  spawnCameos(){
    const m=this.add.sprite(3180,1375,'michael').setDepth(22);
    this.add.text(m.x,m.y-62,'Michael D.',{fontFamily:'Trebuchet MS',fontSize:'13px',fontStyle:'bold',color:'#22384b',backgroundColor:'#fff3cfcc',padding:{x:7,y:4}}).setOrigin(.5).setDepth(23);
    m.setData('cameo',true);
  }

  spawnGarda(x:number,y:number,chaser=true){
    const g=this.add.sprite(x,y,'garda').setDepth(25).setDisplaySize(66,98);
    g.setData('chaser',chaser);g.setData('homeX',x);g.setData('homeY',y);
    g.setData('lostSightSince',0);g.setData('cooldownUntil',0);g.setData('lostEmoted',false);
    this.gardai.push(g);
  }

  spawnAndReturnGarda(x:number,y:number){
    this.spawnGarda(x,y,true);
    return this.gardai[this.gardai.length-1];
  }

  select(t:Target){
    if(this.selected)this.selected.ring.setStrokeStyle(3,0xffe784,0);
    this.selected=t;t.ring.setStrokeStyle(3,0xffe784,.9);
    this.toast(t.name.toUpperCase()+' TARGETED');sfx('target');
  }

  update(time:number,delta:number){
    if(this.ended)return;
    this.activeRunMs+=delta;
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
    const speedBoost=this.bird.speed*(1+progress.upgrades.wings*.025);
    const swooping=!this.grounded&&this.altitudeTarget<.22&&time<this.diveUntil;
    const speed=(this.grounded?115:(boost?430:(swooping?360:315)))*speedBoost;
    let desiredX=dx*speed,desiredY=dy*speed;

    if(this.diveTarget&&(time>=this.diveAssistUntil||this.diveTarget.stolen))this.diveTarget=null;
    if(this.diveTarget&&!this.grounded){
      const a=Phaser.Math.Angle.Between(this.gull.x,this.gull.y,this.diveTarget.person.x,this.diveTarget.person.y);
      const assist=Math.min(.56,Math.max(.22,(this.diveAssistUntil-time)/900*.56));
      desiredX=Phaser.Math.Linear(desiredX,Math.cos(a)*speed*1.22,assist);
      desiredY=Phaser.Math.Linear(desiredY,Math.sin(a)*speed*1.22,assist);
    }

    const body=this.gull.body as Phaser.Physics.Arcade.Body;
    const hasInput=Math.abs(dx)+Math.abs(dy)>.08;
    if(!hasInput&&!this.grounded){
      desiredX=body.velocity.x*.76;
      desiredY=body.velocity.y*.76;
    }
    const steerRate=this.grounded?12:(swooping?9.5:7.2);
    const steer=Math.min(1,dt*steerRate);
    this.gull.setVelocity(Phaser.Math.Linear(body.velocity.x,desiredX,steer),Phaser.Math.Linear(body.velocity.y,desiredY,steer));
    if(Math.abs(body.velocity.x)>.08)this.gull.setFlipX(body.velocity.x<0);
    const targetAngle=this.grounded?0:Phaser.Math.Clamp((body.velocity.y/Math.max(1,speed))*9+(body.velocity.x/Math.max(1,speed))*4,-14,14);
    this.gull.setAngle(Phaser.Math.Linear(this.gull.angle,targetAngle,Math.min(1,dt*8)));

    if(controls.consumeDive())this.startDive(time);
    if(controls.consumeGrab())this.tryGrab(time);
    if(!diveHeld&&!this.grounded&&time>this.diveUntil&&this.altitudeTarget<.6)this.altitudeTarget=.7;
    if(this.grounded){
      if(this.gull.texture.key!=='gull-walk'){this.gull.anims.stop();this.gull.setTexture('gull-walk');}
      if(!this.toldWaddle){this.toldWaddle=true;this.toast('WADDLE MODE · FLAP TO TAKE OFF');}
    }else if(this.gull.texture.key==='gull-walk'&&!this.gull.anims.isPlaying)this.gull.play('fly');
    this.altitude=Phaser.Math.Linear(this.altitude,this.altitudeTarget,Math.min(1,dt*4.8));
    const sc=(this.grounded ? .78 : (.82+this.altitude*.5))*this.bird.scale;this.gull.setScale(sc);
    if(this.grounded)this.gull.setAngle(0);
    this.gull.setDepth(45+Math.round(this.altitude*28));
    this.shadow.setPosition(this.gull.x+16,this.gull.y+28+this.altitude*58);
    this.shadow.setScale(1.15-this.altitude*.38,.9-this.altitude*.25);
    this.shadow.setAlpha(.36-this.altitude*.18);
    this.carryText.setPosition(this.gull.x,this.gull.y-58*sc);

    this.updateTargets(time,dt);
    this.updateTraffic(time,dt);
    this.updateAmbient(time,dt);
    this.updateGardai(time,dt);
    this.updateHeat(time,dt);
    this.updateSelection();

    const zone=this.gull.x<3400?'DAME STREET':this.gull.x<5200?'COLLEGE GREEN':this.gull.x<7000?'GRAFTON STREET':"ST STEPHEN'S GREEN";
    this.districtText.setText(zone);
    if(this.lastZone&&zone!==this.lastZone)this.toast('ENTERING '+zone);
    this.lastZone=zone;
    this.areasVisited.add(zone);
    if(this.areasVisited.size===4)this.award('full-tour');
    const cameraBias=this.gull.x>=7000?0:(this.gull.x>=5200?330:190);
    this.cameras.main.setFollowOffset(0,cameraBias);
  }

  startDive(time:number){
    if(this.grounded)return;
    this.altitudeTarget=.08;this.diveUntil=time+900;sfx('dive');
    this.diveTarget=null;this.diveAssistUntil=0;
    if(this.selected&&!this.selected.stolen){
      const dist=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,this.selected.person.x,this.selected.person.y);
      this.selected.panicUntil=Math.max(this.selected.panicUntil,time+(this.selected.temperament==='oblivious'?350:1200));
      const defendChance=Math.min(.43,.10+this.wanted*.065);
      if(dist<145&&this.wanted>=2&&this.selected.temperament==='defender'&&Math.random()<defendChance){
        this.emote(this.selected.person,'!');
        this.hit('Umbrella! Pick a softer target.',time);
        return;
      }
      if(dist<390){this.diveTarget=this.selected;this.diveAssistUntil=time+760;}
      if(dist<260&&this.selected.temperament!=='oblivious')this.emote(this.selected.person,'!');
    }
    if(!reducedMotion)this.tweens.add({targets:this.cameras.main,zoom:1.075,duration:170,yoyo:true,ease:'Sine.easeOut'});
  }

  tryGrab(time:number){
    let t=this.selected;
    if(!t||t.stolen){
      let best:Target|null=null,d=this.bird.grab+progress.upgrades.beak*5;
      for(const q of this.targets){if(q.stolen)continue;const nd=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,q.person.x,q.person.y);if(nd<d){best=q;d=nd;}}
      t=best;
    }
    if(!t){this.toast('Nothing to grab.');return;}
    const d=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,t.person.x,t.person.y);
    const grabReach=this.bird.grab+progress.upgrades.beak*5;
    if(this.altitude>.34||d>grabReach){this.toast(this.altitude>.34?'Dive lower first.':'Too far away.');return;}
    t.stolen=true;t.food.setVisible(false);t.ring.setVisible(false);t.panicUntil=time+3200;
    this.combo=this.lastTheftAt>0&&time-this.lastTheftAt<8000?Math.min(4,this.combo+1):1;
    this.lastTheftAt=time;
    const earned=Math.round(t.value*this.combo*(1+this.wanted*.12));
    this.score+=earned;this.stolen++;
    this.bestCombo=Math.max(this.bestCombo,this.combo);
    if(t.value>this.bestTheftValue){this.bestTheftValue=t.value;this.bestTheftName=t.name;}
    this.award('mine-now');
    if(t.name==='spice bag')this.award('spice-raider');
    if(this.combo>=4)this.award('combo-four');
    if(this.grounded)this.award('ground-job');
    if(this.stolen>=25)this.award('feeding-frenzy');
    this.altitudeTarget=.82;this.diveUntil=time;this.diveTarget=null;this.diveAssistUntil=0;
    this.carryText.setText(this.combo>1?`${t.name.toUpperCase()} · x${this.combo}`:t.name.toUpperCase()+'!');
    this.time.delayedCall(1150,()=>this.carryText.setText(''));
    setText('score',Math.floor(this.score).toLocaleString());setText('stolen',String(this.stolen));setText('combo','x'+this.combo);
    this.scorePop('+'+earned+(this.combo>1?'  x'+this.combo:''));
    this.toast('STOLEN: '+t.name.toUpperCase()+'  +'+earned);sfx('grab');haptic(30);
    this.emote(t.person,t.temperament==='defender'?'OI!':'!');
    const heatGain=(13+(t.value>=90?10:t.value>=50?5:0))*this.bird.heat*(1-progress.upgrades.nerve*.04);
    this.addHeat(heatGain,time);
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
      this.heat=Math.max(0,this.heat-dt*(this.altitude>.72?4.4:this.altitude>.55?3.35:1.45));
      this.syncWanted();
    }
    if(time-this.lastTheftAt>8000&&this.combo!==1){this.combo=1;setText('combo','x1');}
    setText('heat',Math.round(this.heat)+'%');
  }

  syncWanted(){
    const level=Phaser.Math.Clamp(Math.ceil(this.heat/20),0,5);
    if(level===this.wanted){setWanted(level);return;}
    const previous=this.wanted,rising=level>previous;
    this.wanted=level;this.highestWanted=Math.max(this.highestWanted,level);setWanted(level);
    if(level>=5)this.award('public-menace');
    if(rising){
      sfx('wanted');
      this.toast(level>=4?'DUBLIN HAS HAD ENOUGH.':'WANTED LEVEL '+level);
      if(level>=2&&level>this.lastWanted){
        const sx=this.gull.x+(Math.random()>.5?430:-430),sy=this.gull.y+(Math.random()-.5)*280;
        this.spawnGarda(Phaser.Math.Clamp(sx,80,WORLD_W-80),Phaser.Math.Clamp(sy,520,1480),true);
      }
      this.lastWanted=Math.max(this.lastWanted,level);
    }else if(level===0&&previous>0){
      this.toast('HEAT CLEAR · YOU LOST THEM');
      tone(410,.08,'triangle',.018,-120);
    }else if(previous-level>=1){
      this.toast('HEAT DROPPING');
    }
  }

  recycleTarget(t:Target){
    if(this.ended)return;
    const rx=Phaser.Math.Between(80,WORLD_W-80);
    const f=foodForArea(rx,Phaser.Math.Between(0,9999));
    t.name=f.name;t.value=f.value;t.food.setTexture(f.key).setVisible(true);
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
      const bonus=150+this.missionIndex*50;this.score+=bonus;this.completedMissions++;if(this.completedMissions>=3)this.award('mission-machine');setText('score',Math.floor(this.score).toLocaleString());
      this.toast('MISSION COMPLETE  +'+bonus);this.scorePop('MISSION +'+bonus,'#ffe66f');tone(740,.08,'square',.025,160);haptic(45);
      this.time.delayedCall(900,()=>this.setMission(this.missionIndex+1));
    }
  }

  updateTargets(time:number,dt:number){
    for(const t of this.targets){
      const nearby=Math.abs(t.person.x-this.gull.x)<(lowPowerMode?1250:1650)&&Math.abs(t.person.y-this.gull.y)<(lowPowerMode?900:1100);
      if(!nearby)continue;
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

  updateTraffic(time:number,dt:number){
    for(const v of this.vehicles){
      v.sprite.x+=v.speed*dt;
      const bounded=v.minX!==undefined||v.maxX!==undefined;
      const min=v.minX??-180,max=v.maxX??WORLD_W+180,pad=bounded?0:180;
      if(v.speed>0&&v.sprite.x>max+pad)v.sprite.x=min-180;
      if(v.speed<0&&v.sprite.x<min-180)v.sprite.x=max+180;
      const distance=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,v.sprite.x,v.sprite.y);
      if(v.sprite.texture.key==='luas'&&distance<330&&time-this.lastLuasBellAt>6500){this.lastLuasBellAt=time;sfx('bell');}
      const collisionRadius=v.sprite.texture.key==='luas'?118:v.sprite.texture.key==='bus'?102:70;
      if(this.altitude<.2&&distance<collisionRadius)this.hit('Ouch. Dublin traffic.',performance.now());
    }
  }

  updateGardai(time:number,dt:number){
    for(const g of this.gardai){
      const dist=Phaser.Math.Distance.Between(g.x,g.y,this.gull.x,this.gull.y);
      if(!g.getData('chaser')&&dist>2200)continue;
      const cooldownUntil=Number(g.getData('cooldownUntil')||0);
      const canSee=this.altitude<.62||dist<190;
      let lostSince=Number(g.getData('lostSightSince')||0);
      const chase=Boolean(g.getData('chaser'))&&this.wanted>=2&&time>=cooldownUntil;

      if(chase&&canSee){
        g.setData('lostSightSince',0);g.setData('lostEmoted',false);
        const a=Phaser.Math.Angle.Between(g.x,g.y,this.gull.x,this.gull.y);
        let sp=84+this.wanted*13;
        if(dist<125)sp*=.78;
        g.x+=Math.cos(a)*sp*dt;g.y+=Math.sin(a)*sp*dt;
        g.setFlipX(Math.cos(a)<0);
        if(this.altitude<.25&&dist<56)this.hit('Caught by Gardaí.',time,true);
      }else if(chase&&!canSee){
        if(!lostSince){lostSince=time;g.setData('lostSightSince',time);}
        if(time-lostSince>1900){
          g.setData('cooldownUntil',time+3200);g.setData('lostSightSince',0);
          if(!g.getData('lostEmoted')){this.emote(g,'?');g.setData('lostEmoted',true);}
        }
      }else{
        const hx=Number(g.getData('homeX')),hy=Number(g.getData('homeY'));
        g.x=Phaser.Math.Linear(g.x,hx,Math.min(1,dt*1.9));g.y=Phaser.Math.Linear(g.y,hy,Math.min(1,dt*1.9));
      }
    }
  }

  hit(message:string,time:number,hard=false){
    if(time<this.invulnerableUntil||this.ended)return;
    this.invulnerableUntil=time+1300;this.feathers-=hard?2:1;setFeathers(Math.max(0,this.feathers),this.maxFeathers);
    if(!reducedMotion)this.cameras.main.shake(160,.008);this.gull.setVelocity((Math.random()-.5)*450,-240);this.altitudeTarget=.75;this.diveTarget=null;this.diveAssistUntil=0;
    this.toast(message);sfx('hit');haptic(80);
    if(this.missionIndex===4&&this.missionProgress>0){this.missionProgress=0;setText('missionProgress','0/'+this.missionTarget);this.toast('MISSION STREAK RESET');}
    if(this.feathers<=0)this.gameOver();
  }

  award(id:AchievementId){
    if(!unlockAchievement(id))return;
    const a=ACHIEVEMENTS[id];
    this.toast('TROPHY · '+a.name.toUpperCase());
    this.scorePop('TROPHY UNLOCKED','#ffe66f');
    tone(660,.07,'square',.02,110);setTimeout(()=>tone(920,.1,'triangle',.024,140),75);haptic(45);
  }

  scorePop(text:string,color='#ffffff'){
    const pop=this.add.text(this.gull.x,this.gull.y-70,text,{fontFamily:'Arial Black',fontSize:'24px',color,stroke:'#17384b',strokeThickness:6}).setOrigin(.5).setDepth(120);
    if(reducedMotion)this.time.delayedCall(520,()=>pop.destroy());
    else this.tweens.add({targets:pop,y:pop.y-70,alpha:0,scale:1.16,duration:850,ease:'Cubic.easeOut',onComplete:()=>pop.destroy()});
  }

  emote(at:Phaser.GameObjects.Sprite,text:string){
    const bubble=this.add.text(at.x,at.y-64,text,{fontFamily:'Arial Black',fontSize:'18px',color:'#17384b',backgroundColor:'#fff4d9',padding:{x:7,y:4}}).setOrigin(.5).setDepth(90);
    if(reducedMotion)this.time.delayedCall(600,()=>bubble.destroy());
    else this.tweens.add({targets:bubble,y:bubble.y-18,alpha:0,duration:850,ease:'Quad.easeOut',onComplete:()=>bubble.destroy()});
  }

  updateSelection(){
    if(this.selected&&!this.selected.stolen){
      this.targetMarker.setVisible(true).setPosition(this.selected.person.x,this.selected.person.y);
      const d=Phaser.Math.Distance.Between(this.gull.x,this.gull.y,this.selected.person.x,this.selected.person.y);
      const reach=this.bird.grab+progress.upgrades.beak*5;
      this.targetMarker.setStrokeStyle(5,d<reach?0x64e69a:0xffd54f,.95);
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
    const best=Number(storageGet('seagull-best')||0);if(this.score>best)storageSet('seagull-best',String(Math.floor(this.score)));
    const coins=Math.max(5,Math.floor(this.score/50)+Math.floor(this.stolen/3)+this.completedMissions*8);
    progress.coins+=coins;
    progress.stats.runs++;
    progress.stats.totalFood+=this.stolen;
    progress.stats.totalScore+=Math.floor(this.score);
    progress.stats.bestCombo=Math.max(progress.stats.bestCombo,this.bestCombo);
    progress.stats.highestWanted=Math.max(progress.stats.highestWanted,this.highestWanted);
    progress.stats.missionsCompleted+=this.completedMissions;
    saveProgress();
    window.dispatchEvent(new CustomEvent('seagull-gameover',{detail:{
      score:Math.floor(this.score),stolen:this.stolen,best:Math.max(best,Math.floor(this.score)),coins,
      bestTheft:this.bestTheftName,bestCombo:this.bestCombo,highestWanted:this.highestWanted,
      areas:this.areasVisited.size,runSeconds:Math.max(1,Math.round(this.activeRunMs/1000))
    }}));
  }
}

function renderProgression(){
  setText('coinCount',progress.coins.toLocaleString());setText('birdsCoinCount',progress.coins.toLocaleString());setText('upgradesCoinCount',progress.coins.toLocaleString());
  setText('selectedBirdName',selectedBird().name);
  setText('trophyCount',progress.achievements.length+'/'+Object.keys(ACHIEVEMENTS).length);
  setText('lifetimeRuns',progress.stats.runs.toLocaleString());
  setText('lifetimeFood',progress.stats.totalFood.toLocaleString());
  setText('lifetimeScore',progress.stats.totalScore.toLocaleString());
  setText('lifetimeCombo','x'+progress.stats.bestCombo);
  const trophies=$('trophyGrid');if(trophies){
    trophies.replaceChildren();
    for(const [id,a] of Object.entries(ACHIEVEMENTS) as [AchievementId,(typeof ACHIEVEMENTS)[AchievementId]][]){
      const unlocked=progress.achievements.includes(id);
      const card=document.createElement('article');card.className='trophy-card'+(unlocked?'':' locked');
      const icon=document.createElement('div');icon.className='trophy-icon';icon.textContent=a.icon;
      const copy=document.createElement('div');const name=document.createElement('h3');name.textContent=a.name;
      const desc=document.createElement('p');desc.textContent=a.desc;
      const state=document.createElement('small');state.textContent=unlocked?'UNLOCKED':'LOCKED';
      copy.append(name,desc,state);card.append(icon,copy);trophies.append(card);
    }
  }
  const birds=$('birdGrid');if(birds){
    birds.replaceChildren();
    for(const [id,bird] of Object.entries(BIRDS) as [BirdId,(typeof BIRDS)[BirdId]][]){
      const unlocked=progress.unlockedBirds.includes(id),selected=progress.selectedBird===id;
      const card=document.createElement('article');card.className='bird-card'+(selected?' selected':'');
      const img=document.createElement('img');img.className='bird-preview';img.src='/games/seagull-simulator/art/gull-mid.svg';img.alt='';img.style.filter=bird.previewFilter;
      const copy=document.createElement('div');copy.className='bird-copy';
      const name=document.createElement('h3');name.textContent=bird.name;
      const blurb=document.createElement('p');blurb.textContent=bird.blurb;
      const stats=document.createElement('div');stats.className='stats';
      for(const txt of [`Speed ${Math.round(bird.speed*100)}`,`Grab ${bird.grab}`,`Feathers ${bird.feathers}`]){const s=document.createElement('span');s.textContent=txt;stats.append(s);}
      copy.append(name,blurb,stats);
      const action=document.createElement('button');action.type='button';action.className='bird-action';
      if(selected){action.textContent='SELECTED';action.disabled=true;}
      else if(unlocked){action.textContent='SELECT';action.addEventListener('click',()=>{progress.selectedBird=id;saveProgress();renderProgression();});}
      else{
        action.textContent=progress.coins>=bird.cost?`UNLOCK · ${bird.cost} COINS`:`LOCKED · ${bird.cost} COINS`;
        action.disabled=progress.coins<bird.cost;
        action.addEventListener('click',()=>{if(progress.coins<bird.cost)return;progress.coins-=bird.cost;progress.unlockedBirds.push(id);progress.selectedBird=id;saveProgress();renderProgression();});
      }
      card.append(img,copy,action);birds.append(card);
    }
  }
  const upgrades=$('upgradeGrid');if(upgrades){
    upgrades.replaceChildren();
    for(const key of ['wings','beak','nerve'] as UpgradeKey[]){
      const meta=UPGRADE_META[key],level=progress.upgrades[key],cost=level<5?UPGRADE_COSTS[level]:0;
      const card=document.createElement('article');card.className='upgrade-card';
      const name=document.createElement('h3');name.textContent=meta.name;
      const dots=document.createElement('div');dots.className='level-dots';for(let i=0;i<5;i++){const dot=document.createElement('i');if(i<level)dot.className='on';dots.append(dot);}
      const blurb=document.createElement('p');blurb.textContent=meta.blurb;
      const buy=document.createElement('button');buy.type='button';buy.className='buy-upgrade';
      if(level>=5){buy.textContent='MAX LEVEL';buy.disabled=true;}
      else{buy.textContent=progress.coins>=cost?`UPGRADE · ${cost} COINS`:`NEED ${cost} COINS`;buy.disabled=progress.coins<cost;buy.addEventListener('click',()=>{if(progress.coins<cost||progress.upgrades[key]>=5)return;progress.coins-=cost;progress.upgrades[key]++;saveProgress();renderProgression();});}
      card.append(name,dots,blurb,buy);upgrades.append(card);
    }
  }
}
function openPanel(id:string){$(id)?.classList.remove('hidden');renderProgression();}
function closePanel(id:string){$(id)?.classList.add('hidden');}
$('birdsBtn')?.addEventListener('click',()=>openPanel('birdsPanel'));
$('upgradesBtn')?.addEventListener('click',()=>openPanel('upgradesPanel'));
$('trophiesBtn')?.addEventListener('click',()=>openPanel('trophiesPanel'));
document.querySelectorAll<HTMLElement>('[data-close-panel]').forEach(b=>b.addEventListener('click',()=>closePanel(String(b.dataset.closePanel))));
renderProgression();
const persistCheck=new URLSearchParams(location.search).get('persistcheck');
if(persistCheck==='seed'){
  progress={coins:321,selectedBird:'big-lad',unlockedBirds:['dublin','big-lad'],upgrades:{wings:2,beak:1,nerve:3},achievements:['mine-now','combo-four'],stats:{runs:4,totalFood:31,totalScore:2480,bestCombo:4,highestWanted:5,missionsCompleted:6}};
  saveProgress();renderProgression();
  document.documentElement.dataset.seagullPersistSeeded='1';
}
if(persistCheck==='verify'){
  const ok=progress.coins===321&&progress.selectedBird==='big-lad'&&progress.upgrades.wings===2&&progress.achievements.includes('combo-four')&&progress.stats.runs===4;
  document.documentElement.dataset.seagullPersistVerified=ok?'1':'0';
}
const previewPanel=new URLSearchParams(location.search).get('panel');
if(previewPanel==='birds')openPanel('birdsPanel');
if(previewPanel==='upgrades')openPanel('upgradesPanel');
if(previewPanel==='trophies')openPanel('trophiesPanel');

let paused=false;
let orientationPaused=false;
function setGamePaused(next:boolean){
  const game=(window as any).__seagullGame as Phaser.Game|undefined;
  if(!game||paused===next)return;
  paused=next;
  if(next){
    resetControls();
    game.scene.pause('DameStreet');
    $('pausePanel')?.classList.remove('hidden');
    $('controls')?.classList.add('hidden');
  }else{
    game.scene.resume('DameStreet');
    $('pausePanel')?.classList.add('hidden');
    $('controls')?.classList.remove('hidden');
  }
}
$('pauseBtn')?.addEventListener('click',()=>{orientationPaused=false;setGamePaused(true);});
$('resumeBtn')?.addEventListener('click',()=>{orientationPaused=false;setGamePaused(false);});
const restartRun=()=>{resetControls();location.href=location.pathname+'?autostart=1';};
$('restartRunBtn')?.addEventListener('click',restartRun);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&!new URLSearchParams(location.search).has('smoke')&&(window as any).__seagullGame)setGamePaused(true);
});
window.addEventListener('blur',()=>{
  resetControls();
  if(!new URLSearchParams(location.search).has('smoke')&&(window as any).__seagullGame)setGamePaused(true);
});
function syncOrientationPause(){
  const params=new URLSearchParams(location.search);
  if(params.has('smoke')&&!params.has('orientationcheck'))return;
  const phonePortrait=innerWidth<=900&&innerHeight>innerWidth;
  if(phonePortrait&&(window as any).__seagullGame&&!paused){
    orientationPaused=true;setGamePaused(true);
  }else if(!phonePortrait&&orientationPaused){
    orientationPaused=false;setGamePaused(false);
  }
  if(params.has('orientationcheck'))document.documentElement.dataset.seagullOrientationPaused=orientationPaused?'1':'0';
}
window.addEventListener('resize',syncOrientationPause);
window.addEventListener('orientationchange',()=>setTimeout(syncOrientationPause,80));
window.addEventListener('keydown',e=>{
  if((e.key==='Escape'||e.key.toLowerCase()==='p')&&(window as any).__seagullGame&&$('gameOver')?.classList.contains('hidden')){
    e.preventDefault();setGamePaused(!paused);
  }
});

function startGame(){
  if((window as any).__seagullGame)return;
  initAudio();
  $('startScreen')?.classList.add('hidden');
  $('hud')?.classList.remove('hidden');
  $('missionBar')?.classList.remove('hidden');
  $('controls')?.classList.remove('hidden');
  resetControls();
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
  setTimeout(syncOrientationPause,120);
}
setText('startBest',Number(storageGet('seagull-best')||0).toLocaleString());
function syncSoundButton(){const b=$('soundBtn');if(!b)return;b.textContent=soundEnabled?'SFX':'MUTE';b.classList.toggle('muted',!soundEnabled);b.setAttribute('aria-pressed',String(!soundEnabled));}
$('soundBtn')?.addEventListener('click',()=>{soundEnabled=!soundEnabled;storageSet('seagull-muted',soundEnabled?'0':'1');if(soundEnabled)initAudio();syncSoundButton();});
syncSoundButton();
window.addEventListener('seagull-gameover',(ev:any)=>{
  paused=false;$('pausePanel')?.classList.add('hidden');$('controls')?.classList.add('hidden');$('gameOver')?.classList.remove('hidden');
  setText('finalScore',Number(ev.detail.score).toLocaleString());
  setText('finalStolen',String(ev.detail.stolen));setText('bestScore',Number(ev.detail.best).toLocaleString());setText('coinsEarned',String(ev.detail.coins||0));setText('finalBird',selectedBird().name);
  setText('finalBestTheft',String(ev.detail.bestTheft||'—'));setText('finalBestCombo','x'+String(ev.detail.bestCombo||1));
  setText('finalWanted',String(ev.detail.highestWanted||0)+'/5');setText('finalAreas',String(ev.detail.areas||1)+'/4');
  const secs=Math.max(0,Number(ev.detail.runSeconds)||0);setText('finalRunTime',Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'));
  renderProgression();
});
$('playBtn')?.addEventListener('click',startGame);
$('restartBtn')?.addEventListener('click',restartRun);
if(new URLSearchParams(location.search).has('autostart'))startGame();
