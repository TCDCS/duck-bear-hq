import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('public/games/seagull-simulator/index.html','utf8');
const css=readFileSync('public/games/seagull-simulator/game.css','utf8');
const source=readFileSync('src/seagull-simulator/main.ts','utf8');
const release=JSON.parse(readFileSync('public/games/seagull-simulator/release.json','utf8'));
const hub=readFileSync('public/games/index.html','utf8');
const home=readFileSync('public/index.html','utf8');

test('Seagull Simulator is locally bundled and CSP-friendly',()=>{
  assert.match(html,/\/games\/seagull-simulator\/game\.js/);
  assert.doesNotMatch(html,/https?:\/\//);
  assert.match(source,/from 'phaser'/);
});

test('Seagull Simulator keeps the locked Dublin route',()=>{
  assert.deepEqual(release.nextAreas,[]);
  assert.equal(release.area,"Dame Street + College Green + Grafton Street + St Stephen's Green");
  assert.match(source,/CENTRA/);
  assert.match(source,/SuperValu/);
  assert.match(source,/Michael D\./);
  assert.match(source,/garda/);
  assert.match(source,/COLLEGE GREEN/);
  assert.match(source,/luas/);
  assert.match(source,/GRAFTON STREET/);
  assert.match(source,/ST STEPHEN'S GREEN/);
  assert.match(source,/BROWN THOMAS/);
  assert.match(source,/BEWLEY'S/);
});

test('Seagull Simulator exposes mobile and desktop controls',()=>{
  for(const id of ['stickZone','diveBtn','grabBtn','boostBtn'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(source,/W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,SHIFT/);
  assert.match(css,/touch-action:none/);
});

test('Duck & Bear surfaces the new game',()=>{
  assert.match(hub,/\/games\/seagull-simulator\//);
  assert.match(home,/\/games\/seagull-simulator\//);
});

test('Seagull Simulator has replayable progression systems',()=>{
  assert.match(source,/recycleTarget\(t:Target\)/);
  assert.match(source,/updateHeat\(time:number,dt:number\)/);
  assert.match(source,/lastTheftAt>0&&time-this\.lastTheftAt<8000/);
  assert.match(source,/setMission\(index:number\)/);
  assert.match(html,/id="missionBar"/);
  assert.match(html,/id="combo"/);
  assert.match(html,/id="heat"/);
});

test('Seagull can land and waddle without another control button',()=>{
  assert.match(source,/diveHeld/);
  assert.match(source,/grounded/);
  assert.match(source,/gull-walk/);
  assert.match(source,/WADDLE MODE/);
});

test('Seagull progression is local-only and bounded',()=>{
  assert.match(source,/seagull-progress-v1/);
  assert.match(source,/type BirdId='dublin'\|'big-lad'\|'sneaky'\|'absolute-unit'/);
  assert.match(source,/UPGRADE_COSTS=\[40,70,110,160,230\]/);
  assert.match(source,/Math\.Clamp\(Math\.floor\(Number\(raw\.upgrades\?\.wings\)\|\|0\),0,5\)/);
  assert.match(source,/progress\.coins\+=coins;/);
  assert.match(source,/progress\.stats\.runs\+\+;/);
  assert.match(source,/saveProgress\(\);/);
  assert.match(html,/id="birdsBtn"/);
  assert.match(html,/id="upgradesBtn"/);
  assert.match(html,/id="coinsEarned"/);
  assert.equal(release.progression.paidCurrency,false);
  assert.equal(release.progression.birds,4);
});

test('Seagull flight and pursuit use arcade smoothing rather than hard snapping',()=>{
  assert.match(source,/steerRate=this\.grounded\?12:\(swooping\?9\.5:7\.2\)/);
  assert.match(source,/diveAssistUntil=time\+760/);
  assert.match(source,/desiredX=Phaser\.Math\.Linear/);
  assert.match(source,/lostSightSince/);
  assert.match(source,/cooldownUntil/);
  assert.match(source,/time-lostSince>1900/);
  assert.match(source,/HEAT CLEAR · YOU LOST THEM/);
  assert.equal(release.tuning.gardaCooldownMs,3200);
});

test('Seagull risk feedback matches visible gameplay',()=>{
  assert.match(source,/defendChance=Math\.min\(\.43,\.10\+this\.wanted\*\.065\)/);
  assert.match(source,/const reach=this\.bird\.grab\+progress\.upgrades\.beak\*5/);
  assert.match(source,/texture\.key==='luas'\?118:v\.sprite\.texture\.key==='bus'\?102:70/);
});

test('Seagull supports safe pause and backgrounding',()=>{
  assert.match(html,/id="pauseBtn"/);
  assert.match(html,/id="pausePanel"/);
  assert.match(source,/game\.scene\.pause\('DameStreet'\)/);
  assert.match(source,/game\.scene\.resume\('DameStreet'\)/);
  assert.match(source,/visibilitychange/);
  assert.match(source,/e\.key==='Escape'\|\|e\.key\.toLowerCase\(\)==='p'/);
});

test('Road traffic is bounded before pedestrian Grafton Street',()=>{
  assert.match(source,/0,0,5200/);
  assert.match(source,/3600,5200/);
  assert.match(source,/const bounded=v\.minX!==undefined\|\|v\.maxX!==undefined/);
  assert.match(source,/pad=bounded\?0:180/);
});

test('Seagull local storage failures do not block startup',()=>{
  assert.match(source,/function storageGet\(key:string\)\{try\{return localStorage\.getItem\(key\);\}catch\{return null;\}\}/);
  assert.match(source,/function storageSet\(key:string,value:string\)\{try\{localStorage\.setItem/);
  assert.doesNotMatch(source,/localStorage\.getItem\('seagull-best'\)/);
  assert.doesNotMatch(source,/localStorage\.setItem\('seagull-muted'/);
});

test('Seagull trophies and lifetime stats migrate old local saves safely',()=>{
  assert.match(source,/type AchievementId='mine-now'\|'spice-raider'\|'combo-four'\|'public-menace'\|'ground-job'\|'full-tour'\|'mission-machine'\|'feeding-frenzy'/);
  assert.match(source,/achievements:\(Array\.isArray\(raw\.achievements\)\?raw\.achievements:\[\]\)/);
  assert.match(source,/runs:Math\.max\(0,Math\.floor\(Number\(raw\.stats\?\.runs\)\|\|0\)\)/);
  assert.match(source,/progress\.stats\.totalFood\+=this\.stolen/);
  assert.match(source,/this\.areasVisited\.size===4/);
  assert.match(source,/this\.stolen>=25/);
  assert.match(html,/id="trophiesBtn"/);
  assert.match(html,/id="trophyGrid"/);
  assert.match(html,/id="finalBestTheft"/);
  assert.equal(release.achievements.count,8);
});

test('Seagull run summary uses active gameplay time and tracked milestones',()=>{
  assert.match(source,/this\.activeRunMs\+=delta/);
  assert.match(source,/bestTheft:this\.bestTheftName/);
  assert.match(source,/highestWanted:this\.highestWanted/);
  assert.match(source,/runSeconds:Math\.max\(1,Math\.round\(this\.activeRunMs\/1000\)\)/);
  assert.match(source,/finalRunTime/);
});

test('Seagull areas have distinct food and crowd flavour',()=>{
  assert.match(source,/foodForArea\(x:number/);
  assert.match(source,/pedestrianForArea\(x:number/);
  assert.match(source,/food-sandwich/);
  assert.match(source,/food-doughnut/);
  assert.match(source,/food-takeaway/);
  assert.match(source,/t\.value>=90\?10:t\.value>=50\?5:0/);
  assert.equal(release.food.count,8);
  assert.equal(release.food.highestValue,'takeaway bag');
  assert.equal(release.areaFlavour["Grafton Street"],'café/treat-heavy');
});

test('Seagull keeps background actors out of Arcade Physics',()=>{
  assert.match(source,/person: Phaser\.GameObjects\.Sprite/);
  assert.match(source,/gardai:Phaser\.GameObjects\.Sprite\[\]/);
  assert.match(source,/const p=this\.add\.sprite\(x,y,pedestrianForArea/);
  assert.match(source,/const s=this\.add\.sprite\(x,y,key\)/);
  assert.match(source,/const nearby=Math\.abs\(t\.person\.x-this\.gull\.x\)<1650&&Math\.abs\(t\.person\.y-this\.gull\.y\)<1100/);
  assert.equal(release.performance.arcadePhysicsBodies,1);
});
