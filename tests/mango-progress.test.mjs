import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVEL_IDS,COSTUME_IDS,MANGO_IDS,LEVEL_META} from '../public/games/mango-mayhem/content/catalog.mjs';
import {emptyProgress,normaliseProgress,recordPickup,recordCheckpoint,clearLevel,unlockedLevelIds,unlockedCostumeIds,mergeProgress,collectionTotal,equipCostume,equipAccessory,unlockedAccessories} from '../public/games/mango-mayhem/core/progress.mjs';

test('six ordered locations, seven costumes and 120 stable mango IDs',()=>{
 assert.deepEqual(LEVEL_IDS,['dublin','london','taj','sichuan','neimenggu','liaoning']);
 assert.equal(COSTUME_IDS.length,7); assert.equal(new Set(MANGO_IDS).size,120);
 assert.deepEqual(LEVEL_IDS.map(id=>LEVEL_META[id].helper.id),['stephen','zachary','mulan','gaby','sara','parents']);
});
test('a fresh profile opens Dublin only, has no collection or costume requirement',()=>{
 const p=emptyProgress(); assert.deepEqual(unlockedLevelIds(p),['dublin']);
 assert.deepEqual(unlockedCostumeIds(p),['starter']); assert.equal(collectionTotal(p),0);
});
test('each clear always gives its own costume and opens the next level',()=>{
 let p=emptyProgress();for(let i=0;i<6;i++){
  const before=structuredClone(p); p=clearLevel(p,LEVEL_IDS[i]);
  assert.equal(before.levels[LEVEL_IDS[i]].cleared,false);
  assert.equal(unlockedLevelIds(p).length,Math.min(i+2,6));
  assert.equal(unlockedCostumeIds(p).length,i+2);
  assert.equal(collectionTotal(p),0);
  assert.deepEqual(clearLevel(p,LEVEL_IDS[i]),p);
 }
 assert.throws(()=>clearLevel(emptyProgress(),'london'),/locked/i);
});
test('pickups are unique, sorted, bounded and immutable',()=>{
 let p=emptyProgress();const before=structuredClone(p);
 p=recordPickup(p,'dublin','m002');p=recordPickup(p,'dublin','m001');p=recordPickup(p,'dublin','m002');
 assert.deepEqual(p.levels.dublin.mangoIds,['m001','m002']);assert.deepEqual(before,emptyProgress());
 assert.throws(()=>recordPickup(p,'dublin','m121'));assert.throws(()=>recordPickup(p,'wrong','m001'));
});
test('checkpoint progress is monotonic and rejects invalid indices',()=>{
 let p=recordCheckpoint(emptyProgress(),'dublin',2);p=recordCheckpoint(p,'dublin',1);
 assert.equal(p.levels.dublin.checkpointIndex,2); assert.throws(()=>recordCheckpoint(p,'dublin',4));
});
test('strict validation rejects malformed or impossible progress',()=>{
 for(const bad of [null,{},[],{schemaVersion:8}, {...emptyProgress(),evil:true}]) assert.throws(()=>normaliseProgress(bad,{strict:true}));
 let bad=emptyProgress();bad.levels.london.cleared=true;assert.throws(()=>normaliseProgress(bad,{strict:true}),/order|locked/i);
 bad=emptyProgress();bad.levels.dublin.mangoIds=['m999'];assert.throws(()=>normaliseProgress(bad,{strict:true}));
 bad=emptyProgress();bad.equippedCostume='panda';assert.throws(()=>normaliseProgress(bad,{strict:true}));
 bad=emptyProgress();bad.levels.dublin.checkpointIndex=99;assert.throws(()=>normaliseProgress(bad,{strict:true}));
});
test('tolerant recovery filters broken fields without inventing progress',()=>{
 const p=emptyProgress();p.levels.dublin.mangoIds=['m001','bad','m001'];p.levels.dublin.checkpointIndex=99;
 const n=normaliseProgress(p);assert.deepEqual(n.levels.dublin.mangoIds,['m001']);assert.equal(n.levels.dublin.checkpointIndex,0);
 assert.deepEqual(normaliseProgress(null),emptyProgress());
});
test('merge retains both collections, completed levels and furthest checkpoint',()=>{
 let a=recordPickup(emptyProgress(),'dublin','m001');a=recordCheckpoint(a,'dublin',2);
 let b=clearLevel(recordPickup(emptyProgress(),'dublin','m002'),'dublin');
 const m=mergeProgress(a,b); assert.deepEqual(m.levels.dublin.mangoIds,['m001','m002']);
 assert.equal(m.levels.dublin.cleared,true);assert.equal(m.levels.dublin.checkpointIndex,3);
 assert.deepEqual(mergeProgress(m,b),m);
});
test('wardrobe never changes physics or unlocks a locked costume',()=>{
 assert.throws(()=>equipCostume(emptyProgress(),'panda'));
 const p=equipCostume(clearLevel(emptyProgress(),'dublin'),'rubber-duck');assert.equal(p.equippedCostume,'rubber-duck');
 assert.throws(()=>equipAccessory(p,'star-glasses'));assert.deepEqual(unlockedAccessories(p),[]);
});
test('720 unique ordinary mangos is the collection maximum, accessories are milestones',()=>{
 let p=emptyProgress();for(const id of LEVEL_IDS){ for(const m of MANGO_IDS) p=recordPickup(p,id,m);p=clearLevel(p,id); }
 assert.equal(collectionTotal(p),720);assert.equal(unlockedAccessories(p).length,3);
 assert.equal(equipAccessory(p,'star-glasses').accessory,'star-glasses');
});
