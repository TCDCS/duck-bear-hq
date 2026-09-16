import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/danao/room-state.mjs';

const player=(name='Player')=>({name,character:'Hero',costume:'Arcade'});

test('Danao rooms cap at four and public state never exposes tokens',()=>{
 const room=R.makeRoom('0123',player('Host'),1000);
 R.joinRoom(room,player('Two'),1001);R.joinRoom(room,player('Three'),1002);R.joinRoom(room,player('Four'),1003);
 assert.equal(room.players.length,4);
 assert.throws(()=>R.joinRoom(room,player('Five'),1004),e=>e.status===409);
 const pub=R.publicRoom(room);assert.equal(pub.players.length,4);assert.equal(JSON.stringify(pub).includes('token'),false);
});

test('vacated player slots are reused and never exceed slot three',()=>{
 const room=R.makeRoom('0101',player('Host'),1000);const two=R.joinRoom(room,player('Two'),1001);const three=R.joinRoom(room,player('Three'),1002);
 assert.deepEqual([two.id,three.id],[1,2]);R.leaveRoom(room,two.id,1003);const replacement=R.joinRoom(room,player('Replacement'),1004);assert.equal(replacement.id,1);
 R.joinRoom(room,player('Four'),1005);assert.deepEqual(room.players.map(p=>p.id).sort((a,b)=>a-b),[0,1,2,3]);
});

test('only host can configure, start, publish state and finish',()=>{
 const room=R.makeRoom('1234',player('Host'),1000);const p=R.joinRoom(room,player('Friend'),1001);
 assert.throws(()=>R.configureRoom(room,p.id,{arena:'MadCircus'}),e=>e.status===403);
 R.connect(room,0,1010);R.connect(room,p.id,1011);R.setReady(room,p.id,true);
 R.configureRoom(room,0,{mode:'FreeForAll',arena:'MadCircus',healthDamage:false,visibleBruising:true,arenaHazards:true});
 assert.throws(()=>R.startRoom(room,p.id,1020),e=>e.status===403);R.startRoom(room,0,1020);assert.equal(room.phase,'fight');
 assert.throws(()=>R.setHostState(room,p.id,{seq:1,fighters:[]},1030),e=>e.status===403);
 assert.equal(R.setHostState(room,0,{seq:1,fighters:[{slot:0,hp:100}]},1030),true);
 assert.throws(()=>R.finishRoom(room,p.id,{winner:1}),e=>e.status===403);
 R.finishRoom(room,0,{winner:0});assert.equal(room.phase,'results');
});

test('all connected players must be ready before online start',()=>{
 const room=R.makeRoom('2222',player('Host'),1000);const p=R.joinRoom(room,player('Friend'),1001);R.connect(room,0,1010);R.connect(room,p.id,1011);
 assert.throws(()=>R.startRoom(room,0,1020),e=>e.status===409);
 R.setReady(room,p.id,true);R.startRoom(room,0,1021);assert.equal(room.phase,'fight');
});

test('input and host snapshots reject stale sequences and oversized snapshots',()=>{
 const room=R.makeRoom('3333',player('Host'),1000);const p=R.joinRoom(room,player('Friend'),1001);R.connect(room,0,1010);R.connect(room,p.id,1011);R.setReady(room,p.id,true);R.startRoom(room,0,1020);
 assert.equal(R.setInput(room,p.id,{seq:2,moveX:.5,moveY:-.2,punch:true},1030),true);
 assert.equal(R.setInput(room,p.id,{seq:2,moveX:0,moveY:0},1031),false);
 assert.equal(R.setHostState(room,0,{seq:4,fighters:[{slot:0,hp:100}]},1040),true);
 assert.equal(R.setHostState(room,0,{seq:3,fighters:[]},1041),false);
 assert.throws(()=>R.setHostState(room,0,{seq:5,pad:'x'.repeat(R.MAX_SNAPSHOT_BYTES+1)},1042),e=>e.status===413);
});

test('host disconnect transfers live fight authority without discarding the retained snapshot',()=>{
 const room=R.makeRoom('4444',player('Host'),1000);const p=R.joinRoom(room,player('Friend'),1001);R.connect(room,0,1010);R.connect(room,p.id,1011);R.setReady(room,p.id,true);R.startRoom(room,0,1020);R.setHostState(room,0,{seq:1,fighters:[{slot:0,hp:77}]},1030);
 R.disconnect(room,0,1040);
 assert.equal(room.hostId,p.id);
 assert.equal(room.phase,'fight');
 assert.equal(room.result,null);
 const restored=R.restoreRoom(R.persistRoom(room));assert.equal(restored.hostId,p.id);assert.equal(restored.latestState.fighters[0].hp,77);
});

test('a fight with no connected players leaves hosting vacant until somebody reconnects',()=>{
 const room=R.makeRoom('4555',player('Host'),1000);const p=R.joinRoom(room,player('Friend'),1001);R.connect(room,0,1010);R.connect(room,p.id,1011);R.setReady(room,p.id,true);R.startRoom(room,0,1020);
 R.disconnect(room,0,1030);R.disconnect(room,p.id,1031);
 assert.equal(room.hostId,null);assert.equal(room.phase,'fight');
 R.connect(room,p.id,1040);assert.equal(room.hostId,p.id);
});
