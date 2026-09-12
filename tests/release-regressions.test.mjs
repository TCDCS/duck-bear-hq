import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WackyRoom} from '../src/multiplayer/durable.mjs';
import * as M from '../src/multiplayer/room-state.mjs';

test('WebSocket close completes the handshake and releases the driver slot',async()=>{
  const room=M.makeRoom('0451');M.connect(room,0);
  let closed=false,saved=false;
  const ws={deserializeAttachment:()=>({id:0,epoch:room.epoch}),close(){closed=true;}};
  const worker=Object.create(WackyRoom.prototype);
  Object.assign(worker,{ready:Promise.resolve(),room,sockets:new Map([[0,ws]]),rate:new Map(),lobby(){},async save(){saved=true;}});
  await worker.webSocketClose(ws,1000,'Leaving',true);
  assert.equal(closed,true);assert.equal(saved,true);assert.equal(room.players[0].connected,false);assert.equal(worker.sockets.size,0);
});

test('online Escape toggles the local menu rather than reopening it',()=>{
  const s=readFileSync(new URL('../src/kart-assets/game.js.txt',import.meta.url),'utf8');
  assert.match(s,/race.phase==='paused'\|\|onlinePaused\?resume\(\):pause\(\)/);
});

test('user-driven room changes do not share photograph data',()=>{
  const room=M.makeRoom('0018',{name:'Host',avatar:0,photo:'PRIVATE_IMAGE'});
  const guest=M.joinRoom(room,{name:'Friend',avatar:1,photo:'PRIVATE_IMAGE'});
  assert.equal('photo' in guest,false);assert.equal(JSON.stringify(M.publicRoom(room)).includes('PRIVATE_IMAGE'),false);
});
