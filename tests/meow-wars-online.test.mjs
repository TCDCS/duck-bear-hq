import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as R from '../src/meow-wars/room-state.mjs';

test('Meow Wars online room lifecycle is private 1v1 with fixed teams', () => {
  const now = Date.now();
  const room = R.makeRoom('0042', {
    name: 'Blue Player',
    arenaId: 'oconnell-bridge-spire',
    blueSquadId: 'alley-aces',
    redSquadId: 'night-shift'
  }, now);

  assert.equal(room.players.length, 1);
  assert.equal(room.players[0].team, 0);
  assert.equal(room.phase, 'lobby');

  R.connect(room, 0, now + 1);
  const guest = R.joinRoom(room, { name: 'Red Player' }, now + 2);
  assert.equal(guest.id, 1);
  assert.equal(guest.team, 1);
  R.connect(room, 1, now + 3);
  R.setReady(room, 1, true);

  R.startRoom(room, 0, now + 4);
  assert.equal(room.phase, 'battle');
  assert.equal(room.turnTeam, 0);
  assert.equal(room.matchId, 1);
});

test('Meow Wars online server gates guest intents to the current team', () => {
  const now = Date.now();
  const room = R.makeRoom('1207', {
    name: 'Host',
    arenaId: 'garden-siege',
    blueSquadId: 'alley-aces',
    redSquadId: 'night-shift'
  }, now);
  R.connect(room, 0, now);
  R.joinRoom(room, { name: 'Guest' }, now);
  R.connect(room, 1, now);
  R.setReady(room, 1, true);
  R.startRoom(room, 0, now);

  assert.throws(() => R.setIntent(room, 1, {
    seq: 1, kind: 'state', x: 900, angle: 42, facing: -1, weaponId: 'bazooka'
  }, now + 10), /Wait for your turn/);

  const snapshot = {
    seq: 1,
    turnTeam: 1,
    turnNumber: 2,
    activeId: 'red-1',
    wind: 8,
    timerMs: 24000,
    selectedWeaponId: 'bazooka',
    chargePower: .36,
    actionLocked: false,
    gameOver: false,
    winnerTeam: null,
    cats: [
      { id:'blue-1',team:0,x:150,y:500,vx:0,vy:0,health:100,alive:true },
      { id:'red-1',team:1,x:1030,y:500,vx:0,vy:0,health:100,alive:true }
    ],
    projectiles:[],deployables:[],runners:[],craters:[],props:[]
  };
  assert.equal(R.setHostSnapshot(room, 0, snapshot, now + 11), true);
  assert.equal(room.turnTeam, 1);

  const intent = R.setIntent(room, 1, {
    seq: 1, kind: 'fire', angle: 51, power: .72, facing: -1, weaponId: 'bazooka'
  }, now + 12);
  assert.deepEqual(intent, {
    seq: 1, kind: 'fire', angle: 51, power: .72, facing: -1, weaponId: 'bazooka'
  });
});

test('Meow Wars room supports reconnect and retains latest host snapshot', () => {
  const now = Date.now();
  const room = R.makeRoom('7788', {
    name: 'Host',
    arenaId: 'donabate-beach',
    blueSquadId: 'alley-aces',
    redSquadId: 'night-shift'
  }, now);
  R.connect(room, 0, now);
  const guest = R.joinRoom(room, { name: 'Guest' }, now);
  R.connect(room, 1, now);
  R.setReady(room, 1, true);
  R.startRoom(room, 0, now);

  R.disconnect(room, 1, now + 1000);
  assert.equal(room.players.find(p => p.id === 1).connected, false);
  const authenticated = R.authenticate(room, guest.token, now + 1500);
  assert.equal(authenticated.id, 1);
  R.connect(room, 1, now + 1600);
  assert.equal(room.players.find(p => p.id === 1).connected, true);

  const state = {
    seq: 3,
    turnTeam: 0,
    turnNumber: 3,
    activeId: 'blue-2',
    wind: -12,
    timerMs: 15000,
    selectedWeaponId: 'grenade',
    chargePower: .58,
    actionLocked: true,
    gameOver: false,
    winnerTeam: null,
    cats: [],
    projectiles:[{id:'p1',weaponId:'grenade',x:600,y:320,rotation:.5}],
    deployables:[],runners:[],
    craters:[{x:700,y:520,radius:55}],
    props:[{type:'driftwood',x:190,y:545,hp:20,destroyed:false,angle:4}]
  };
  R.setHostSnapshot(room, 0, state, now + 1700);
  const restored = R.restoreRoom(R.persistRoom(room));
  assert.equal(restored.latestSnapshot.seq, 3);
  assert.equal(restored.latestSnapshot.craters[0].radius, 55);
});

test('Meow Wars online source is wired into Worker routes and Durable Object migrations', () => {
  const root = new URL('../', import.meta.url);
  const read = (p) => readFileSync(new URL(p, root), 'utf8');
  const wrangler = read('wrangler.jsonc');
  const worker = read('src/worker-games.js');
  const routes = read('src/game-routes.js');
  const gateway = read('src/meow-wars/gateway.mjs');
  const durable = read('src/meow-wars/durable.mjs');

  assert.match(wrangler, /"MEOW_DIRECTORY"/);
  assert.match(wrangler, /"MEOW_ROOMS"/);
  assert.match(wrangler, /"meow-v1-sqlite"/);
  assert.match(worker, /MeowWarsDirectory,MeowWarsRoom/);
  assert.match(routes, /routeMeowWarsMultiplayer/);
  assert.match(routes, /\/api\/meow-wars\//);
  assert.match(gateway, /\/api\/meow-wars\/create/);
  assert.match(gateway, /\/api\/meow-wars\/join/);
  assert.match(durable, /type: 'snapshot'/);
  assert.match(durable, /type: 'intent'/);
  assert.match(durable, /type: 'welcome'/);
});
