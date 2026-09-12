const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box={};vm.runInNewContext(fs.readFileSync(__dirname+'/../src/kart-assets/core.js.txt','utf8'),box);
const file=__dirname+'/../src/kart-assets/race-order.js.txt';if(fs.existsSync(file))vm.runInNewContext(fs.readFileSync(file,'utf8'),box);
function rows(r){assert.ok(box.KartRaceOrder,'race order module is required');return box.KartRaceOrder.rows(r,box.KartCore.cleanProfiles(null),r.racers[0].id);}
test('live race order includes every racer from first to last and marks you',()=>{
 const r=box.KartCore.newRace({driver:7});r.racers.forEach((p,i)=>p.s=i*50);const result=rows(r);
 assert.equal(result.length,7);assert.equal(result[0].id,r.racers[6].id);assert.equal(result[6].id,7);assert.equal(result[6].you,true);assert.equal(result[0].position,1);assert.equal(result[6].position,7);
});
test('overtaking changes the order without changing the driver identity',()=>{
 const r=box.KartCore.newRace();r.racers[0].s=500;assert.equal(rows(r)[0].id,0);r.racers[1].s=600;assert.equal(rows(r)[0].id,r.racers[1].id);
});
test('finished racers use finish order before unfinished progress',()=>{
 const r=box.KartCore.newRace();r.racers[0].finished=true;r.racers[0].finishTime=80;r.racers[1].s=99999;const result=rows(r);assert.equal(result[0].id,0);assert.equal(result[0].finished,true);
});
test('online final order follows the server classification even for a local-first array',()=>{
 const r=box.KartCore.newRace();r.phase='results';r.order=r.racers.map(p=>p.id).reverse();assert.deepEqual(Array.from(rows(r),p=>p.id),Array.from(r.order));
});
