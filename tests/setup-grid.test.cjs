const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const text=f=>fs.readFileSync(__dirname+'/../src/kart-assets/'+f,'utf8');
const box={};vm.runInNewContext(text('core.js.txt'),box);const C=box.KartCore;
for(const search of ['', '?play=1', '?play=0', '?friends=1', '?room=0123&play=1']){
 test('opening '+(search||'the game')+' waits for a deliberate race start',()=>{
  let starts=0,friends=0;vm.runInNewContext(text('host.js.txt'),{WackyRaces:{startRace(){starts++;},openFriends(){friends++;}},URLSearchParams,location:{search},document:{addEventListener(){}},window:{addEventListener(){}}});
  assert.equal(starts,0);assert.equal(friends,search==='?friends=1'?1:0);
 });
}
test('all selectable drivers remain available but every grid is limited to seven',()=>{
 assert.equal(C.MAX_RACERS,7);assert.equal(C.DEFAULTS.length,8);
 for(let track=0;track<C.TRACKS.length;track++)for(let driver=0;driver<C.DEFAULTS.length;driver++)for(const mode of ['race','cup','trial']){
  const r=C.newRace({track,driver,mode});assert.equal(r.racers.length,mode==='trial'?1:7);assert.equal(r.racers[0].id,driver);
  assert.equal(new Set(r.racers.map(p=>p.id)).size,r.racers.length);
  assert.ok(r.racers.length+r.traffic.length<=7,'no extra traffic on the driving surface');
 }
});
test('cup classification excludes the unused eighth character, including when that character is selected',()=>{
 for(const driver of [0,7]){const r=C.newRace({driver,mode:'cup'}),ids=r.racers.map(p=>p.id),scores=Array(8).fill(0);C.addCupPoints(scores,ids);const sorted=C.cupOrder(scores,ids);assert.equal(sorted.length,7);assert.deepEqual(Array.from(sorted),Array.from(ids));}
});

test('homepage states the same seven-player limit as the simulation',()=>{
 const html=fs.readFileSync(__dirname+'/../public/index.html','utf8');assert.ok(html.includes('1–7 PLAYERS'));assert.ok(!html.includes('1–8 PLAYERS'));
});
