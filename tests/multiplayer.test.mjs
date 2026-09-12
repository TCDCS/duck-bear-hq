import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const path=new URL('../src/multiplayer/room-state.mjs',import.meta.url);
const exists=fs.existsSync(path);
const M=exists?await import(path):{};
function room(){assert.ok(M.makeRoom,'room state implementation is missing');return M.makeRoom('0123',{name:'Host',avatar:0,track:5,vehicle:'kart'},1000);}
function two(){const r=room();M.joinRoom(r,{name:'Friend',avatar:1,vehicle:'bus'},1001);r.players.forEach(p=>{p.connected=true;p.ready=true;});return r;}
test('four-digit codes retain a leading zero and host gets a secret token',()=>{const r=room();assert.equal(r.code,'0123');assert.equal(r.players.length,1);assert.ok(r.players[0].token.length>=32);});
test('names are bounded and never accepted as HTML',()=>{const r=room();const p=M.joinRoom(r,{name:'<img src=x onerror=alert(1)>'.repeat(5)},1100);assert.ok(p.name.length<=24);assert.doesNotMatch(p.name,/[<>]/);});
test('room is capped at eight real players',()=>{const r=room();for(let i=1;i<8;i++)M.joinRoom(r,{name:'Player '+i},1000+i);assert.throws(()=>M.joinRoom(r,{},1100),/full/i);});
test('only a host can start and all connected friends must be ready',()=>{const r=two();assert.throws(()=>M.startRoom(r,1,1200),/host/i);r.players[1].ready=false;assert.throws(()=>M.startRoom(r,0,1200),/ready/i);r.players[1].ready=true;M.startRoom(r,0,1200);assert.equal(r.phase,'race');assert.equal(r.race.track.id,5);});
test('live races reject late joining',()=>{const r=two();M.startRoom(r,0,1200);assert.throws(()=>M.joinRoom(r,{},1201),/started|lobby|locked/i);});
test('both humans drive independently under authoritative physics',()=>{const r=two();M.startRoom(r,0,1200);r.race.countdown=0;r.race.traps=[];r.race.traffic=[];M.setControl(r,0,{seq:1,gas:1,steer:1},1300);M.setControl(r,1,{seq:1,gas:1,steer:-1},1300);for(let i=0;i<20;i++)M.tickRoom(r,1/30,1300+i*10);assert.ok(r.race.racers.find(p=>p.id===0).vx>0);assert.ok(r.race.racers.find(p=>p.id===1).vx<0);});
test('invalid client positions and repeated input sequences cannot teleport or repeat an item',()=>{const r=two();M.startRoom(r,0,1200);const before=r.race.racers[0].s;M.setControl(r,0,{seq:1,s:999999,speed:999,steer:99,gas:2,use:true},1300);assert.equal(r.race.racers[0].s,before);assert.equal(r.controls[0].steer,1);assert.equal(r.controls[0].gas,1);assert.equal(M.setControl(r,0,{seq:1,steer:-1},1301),false);});
test('a stale input stops accelerating rather than driving forever',()=>{const r=two();M.startRoom(r,0,1200);M.setControl(r,0,{seq:1,gas:1},1300);M.tickRoom(r,1/30,4000);assert.equal(r.race.inputs[0].gas,0);assert.equal(r.race.inputs[0].brake,1);});
test('finishing one human does not end the other player race',()=>{const r=two();M.startRoom(r,0,1200);r.race.countdown=0;const p=r.race.racers[0];p.s=r.race.track.length*3;p.completedLaps=3;p.finished=true;p.finishTime=4;M.tickRoom(r,1/30,1300);assert.equal(r.phase,'race');assert.equal(r.race.phase,'race');});
test('host departure transfers control and a disconnected car becomes AI',()=>{const r=two();M.startRoom(r,0,1200);M.disconnect(r,0,1300);assert.equal(r.hostId,1);M.tickRoom(r,1/30,8000);assert.equal(r.race.racers.find(p=>p.id===0).ai,true);});
test('broadcast state excludes room tokens, controls and private photos',()=>{const r=two();const out=JSON.stringify(M.publicRoom(r));for(const p of r.players)assert.ok(!out.includes(p.token));assert.doesNotMatch(out,/"token"|"controls"|data:image|photo/);});
test('room expiry blocks new members',()=>{const r=room();assert.throws(()=>M.joinRoom(r,{},r.expiresAt+1),/expired/i);});
test('server/browser core is the same implementation',()=>{assert.ok(fs.existsSync(new URL('../src/multiplayer/core.mjs',import.meta.url)));const body=fs.readFileSync(new URL('../src/kart-assets/core.js.txt',import.meta.url),'utf8');const server=fs.readFileSync(new URL('../src/multiplayer/core.mjs',import.meta.url),'utf8');assert.equal(server,body+'\nexport default globalThis.KartCore;\n');});
test('equal finish times rank identically when the client puts its own car first',()=>{const r=two();M.startRoom(r,0,1200);r.race.racers.forEach(p=>{p.finished=true;p.finishTime=100;});const a=M.C.rank(r.race).map(p=>p.id);r.race.racers.reverse();assert.deepEqual(M.C.rank(r.race).map(p=>p.id),a);});
test('a new connected player inherits hosting from an absent host',()=>{const r=room();const p=M.joinRoom(r,{name:'Friend'},1100);M.connect(r,p.id,1200);assert.equal(r.hostId,p.id);});
test('a vacated lobby can appoint a new host rather than becoming unusable',()=>{const r=room();M.leaveRoom(r,0,1200);const p=M.joinRoom(r,{name:'New host'},1300);assert.equal(r.hostId,p.id);assert.equal(p.ready,true);});
