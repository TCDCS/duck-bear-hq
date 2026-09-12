import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/multiplayer/room-state.mjs';
test('room rules reject an eighth person and preserve all seven existing places',()=>{
 const room=M.makeRoom('0123');for(let i=1;i<7;i++)M.joinRoom(room,{name:'Player '+i,avatar:7});const before=JSON.stringify(room);
 assert.equal(M.CAPACITY,7);assert.throws(()=>M.joinRoom(room,{name:'Eighth'}),/full|seven|7/i);assert.equal(JSON.stringify(room),before);
});
test('seven human players have exactly one car each and no additional traffic',()=>{
 const room=M.makeRoom('0123');for(let i=1;i<7;i++)M.joinRoom(room,{name:'Player '+i,avatar:7});room.players.forEach(p=>{p.connected=p.ready=true;});M.startRoom(room,0);
 assert.equal(room.race.racers.length,7);assert.equal(room.race.traffic.length,0);assert.ok(room.race.racers.every(p=>!p.ai));assert.deepEqual(room.race.racers.map(p=>p.id),room.players.map(p=>p.id));
});
test('two friends fill only five AI seats',()=>{
 const room=M.makeRoom('1234');M.joinRoom(room,{avatar:7});room.players.forEach(p=>{p.connected=p.ready=true;});M.startRoom(room,0);assert.equal(room.race.racers.filter(p=>p.ai).length,5);
});
test('old oversized saved rooms expire rather than stranding an eighth player without a car',()=>{
 const room=M.makeRoom('1234');room.players=Array.from({length:8},(_,id)=>({...room.players[0],id}));assert.equal(M.restoreRoom(room),null);
});

test('old rooms with seven members but an eighth seat id cannot strand that driver',()=>{
 const room=M.makeRoom('1234');room.players=Array.from({length:7},(_,i)=>({...room.players[0],id:i===6?7:i}));assert.equal(M.restoreRoom(room),null);
});
