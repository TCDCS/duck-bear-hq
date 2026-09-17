import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const rel=p=>path.join(root,p);
const source=p=>fs.readFileSync(rel(p),'utf8');

test('browser online client reuses the existing Danao room API and websocket protocol',()=>{
 assert.ok(fs.existsSync(rel('public/games/danao/online.mjs')),'missing online.mjs');
 const online=source('public/games/danao/online.mjs');
 for(const endpoint of ['/api/danao/create','/api/danao/join','/api/danao/'])assert.match(online,new RegExp(endpoint.replaceAll('/','\\/')));
 for(const fn of ['createRoom','joinRoom','connectRoom','sendReady','sendChoice','sendSetup','sendStart','sendInput','sendHostState','sendResult','sendRematch','leaveRoom'])assert.match(online,new RegExp(`export (?:async )?function ${fn}\\b`));
 assert.match(online,/new WebSocket/);
 assert.match(online,/type:\s*['"]input['"]/);
 assert.match(online,/type:\s*['"]state['"]/);
 assert.match(online,/type:\s*['"]ready['"]/);
 assert.match(online,/type:\s*['"]setup['"]/);
 assert.match(online,/type:\s*['"]start['"]/);
 assert.match(online,/type:\s*['"]rematch['"]/);
});

test('online lobby is browser-native and exposes create join ready start leave and player list',()=>{
 const html=source('public/games/danao/index.html');
 for(const id of ['online-lobby','online-name','online-code','online-character','create-room','join-room','room-code','room-players','room-ready','room-start','room-leave','online-back','online-status'])assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);
});

test('Babylon game bridge consumes online input and snapshots and emits host snapshots at 15 Hz',()=>{
 const game=source('public/games/danao/game.mjs');
 assert.match(game,/from ['"]\.\/online\.mjs['"]/);
 assert.match(game,/startOnlineMatch/);
 assert.match(game,/sendInput\s*\(/);
 assert.match(game,/sendHostState\s*\(/);
 assert.match(game,/applyNetworkSnapshot/);
 assert.match(game,/1\s*\/\s*15/);
 assert.match(game,/hostId/);
});
