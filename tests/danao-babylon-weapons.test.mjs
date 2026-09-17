import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const weaponsPath=path.join(root,'public/games/danao/weapons.mjs');
const expected=[
 ['Boxing Glove',8,'melee'],['Spring Boxing Glove',10,'melee'],['Inflatable Hammer',11,'melee'],['Rubber Chicken',7,'melee'],['Pool Noodle',6,'melee'],['Frying Pan',12,'melee'],['Folding Chair',14,'melee'],['Mop',8,'melee'],['Baguette',7,'melee'],['Giant Fish',12,'melee'],['Umbrella',9,'melee'],['Toy Guitar',13,'melee'],['Silly Sausage',8,'melee'],['Floppy Nonsense',10,'melee'],
 ['Foam Blaster',6,'ranged'],['Water Blaster',4,'ranged'],['Suction Cup Launcher',7,'ranged'],['Confetti Cannon',5,'ranged'],['Bubble Cannon',4,'ranged'],['Tennis Ball Launcher',7,'ranged'],['Magnet Gun',3,'ranged'],['Plunger Launcher',8,'ranged'],['Party Popper Blaster',5,'ranged'],['Cartoon Bazooka',24,'ranged'],
 ['Bowling Ball',16,'heavy'],['Traffic Cone',8,'heavy'],['Bin',15,'heavy'],['Suitcase',13,'heavy'],['Kettle',10,'heavy'],['Cushion',5,'heavy'],['Foam Extinguisher',11,'heavy'],['Anvil',22,'heavy'],['Giant Mango',17,'heavy'],['Wrestling Table',18,'heavy'],['Speaker',14,'heavy'],['Toy Crate',16,'heavy']
];

test('Babylon Danao ports the exact 36-item silly weapon roster',async()=>{
 assert.ok(fs.existsSync(weaponsPath),'missing public/games/danao/weapons.mjs');
 const {WEAPONS}=await import(weaponsPath+'?test='+Date.now());
 assert.equal(WEAPONS.length,36);
 assert.deepEqual(WEAPONS.map(w=>[w.name,w.damage,w.class]),expected);
 assert.equal(WEAPONS.filter(w=>w.class==='melee').length,14);
 assert.equal(WEAPONS.filter(w=>w.class==='ranged').length,10);
 assert.equal(WEAPONS.filter(w=>w.class==='heavy').length,12);
});

test('weapon stats preserve bounded arcade damage and required combat metadata',async()=>{
 assert.ok(fs.existsSync(weaponsPath),'missing public/games/danao/weapons.mjs');
 const {WEAPONS}=await import(weaponsPath+'?stats='+Date.now());
 for(const weapon of WEAPONS){
  assert.match(weapon.id,/^[a-z0-9-]+$/);
  assert.ok(weapon.damage>=3&&weapon.damage<=24,`${weapon.name} damage out of bounds`);
  assert.ok(weapon.knockback>0&&weapon.knockback<=16,`${weapon.name} knockback out of bounds`);
  assert.ok(weapon.cooldown>=.2&&weapon.cooldown<=1.1,`${weapon.name} cooldown out of bounds`);
  assert.ok(['melee','ranged','heavy'].includes(weapon.class));
  assert.match(weapon.colour,/^#[0-9a-f]{6}$/i);
  assert.ok(['box','cylinder','sphere','cone','capsule'].includes(weapon.shape));
  if(weapon.class==='ranged'){
   assert.ok(Number.isInteger(weapon.ammo)&&weapon.ammo>0);
   assert.ok(weapon.projectileSpeed>=14&&weapon.projectileSpeed<=22);
  }
 }
});

test('weapon module exposes pickup/use helpers for browser gameplay',()=>{
 assert.ok(fs.existsSync(weaponsPath),'missing public/games/danao/weapons.mjs');
 const source=fs.readFileSync(weaponsPath,'utf8');
 assert.match(source,/export function spawnWeapons/);
 assert.match(source,/export function tryPickupWeapon/);
 assert.match(source,/export function useHeldWeapon/);
 assert.match(source,/export function dropHeldWeapon/);
});

test('live Babylon match spawns pickups and routes attacks through held weapons',()=>{
 const game=fs.readFileSync(path.join(root,'public/games/danao/game.mjs'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/games/danao/index.html'),'utf8');
 assert.match(game,/from ['"]\.\/weapons\.mjs['"]/);
 assert.match(game,/weaponSpawns/);
 assert.match(game,/spawnWeapons\s*\(/);
 assert.match(game,/tryPickupWeapon\s*\(/);
 assert.match(game,/useHeldWeapon\s*\(/);
 assert.match(game,/heldWeapon/);
 assert.match(html,/id=["']p1-weapon["']/);
 assert.match(html,/id=["']p2-weapon["']/);
});
