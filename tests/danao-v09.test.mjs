import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const controllerPath = path.join(root, 'public/games/danao/src/game/controllers.js');

test('v0.9 controller helper exists before runtime starts depending on it', () => {
  assert.equal(fs.existsSync(controllerPath), true);
});

test('v0.9 sparse Gamepad arrays preserve real browser indexes and never duplicate pads', async () => {
  const { connectedPadIndices, localControlPlan } = await import('../public/games/danao/src/game/controllers.js');
  const pads = [
    null,
    { index: 1, connected: true },
    null,
    { index: 3, connected: true },
  ];
  assert.deepEqual(connectedPadIndices(pads), [1, 3]);
  assert.deepEqual(localControlPlan(pads, 4), [
    { type: 'hybrid', index: 1 },
    { type: 'gamepad', index: 3 },
    { type: 'bot' },
    { type: 'bot' },
  ]);
});

test('v0.9 controller plan falls back to keyboard player plus bots with no pads', async () => {
  const { localControlPlan } = await import('../public/games/danao/src/game/controllers.js');
  assert.deepEqual(localControlPlan([], 4), [
    { type: 'hybrid', index: null },
    { type: 'bot' },
    { type: 'bot' },
    { type: 'bot' },
  ]);
});

test('v0.9 controller helper ignores disconnected pads and caps slots at four', async () => {
  const { connectedPadIndices, localControlPlan } = await import('../public/games/danao/src/game/controllers.js');
  const pads = [
    { index: 0, connected: false },
    { index: 1, connected: true },
    { index: 2, connected: true },
    { index: 3, connected: true },
    { index: 4, connected: true },
  ];
  assert.deepEqual(connectedPadIndices(pads), [1, 2, 3, 4]);
  assert.equal(localControlPlan(pads, 8).length, 4);
  assert.deepEqual(localControlPlan(pads, 4).map((entry) => entry.index), [1, 2, 3, 4]);
});


test('v0.9 packaged runtime uses resolved sparse gamepad indexes', () => {
  const runtime = fs.readFileSync(path.join(root, 'public/games/danao/src/game/runtime.js'), 'utf8');
  for (const marker of [
    "import { localControlPlan } from './controllers.js';",
    'readGamepad(fighter.control.index)',
    'const controlPlan = localControlPlan(pads, total);',
    'control = controlPlan[i];',
  ]) assert.ok(runtime.includes(marker), marker);
  assert.doesNotMatch(runtime, /pads\[i\]/);
  assert.doesNotMatch(runtime, /readGamepad\(0\)/);
});


test('v0.9 browser room client module exists', () => {
  const clientPath = path.join(root, 'public/games/danao/src/online/room-client.js');
  assert.equal(fs.existsSync(clientPath), true);
});

test('v0.9 room client creates rooms, stores reconnect data and keeps tokens out of invite URLs', async () => {
  const { createDanaoRoomClient } = await import('../public/games/danao/src/online/room-client.js');
  const requests = [];
  const storage = new Map();
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    return new Response(JSON.stringify({
      room: { code: '0123', hostId: 0, phase: 'lobby', players: [{ id: 0, name: 'Hero', ready: true, connected: false }] },
      id: 0,
      token: '11111111-1111-4111-8111-111111111111',
    }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  };
  const client = createDanaoRoomClient({
    baseUrl: 'https://example.test',
    fetchImpl,
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    WebSocketCtor: class { constructor() { throw new Error('socket should not open in this test'); } },
  });
  const joined = await client.createRoom({ name: 'Hero', character: 'Hero', costume: 'Arcade' }, { connect: false });
  assert.equal(requests[0].url, 'https://example.test/api/danao/create');
  assert.equal(JSON.parse(requests[0].init.body).name, 'Hero');
  assert.equal(joined.room.code, '0123');
  assert.equal(storage.get('danao.reconnect.code'), '0123');
  assert.equal(storage.get('danao.reconnect.token'), '11111111-1111-4111-8111-111111111111');
  assert.equal(client.inviteUrl, 'https://example.test/games/danao/?room=0123');
  assert.equal(client.inviteUrl.includes('token='), false);
});

test('v0.9 room client joins exact room code and builds same-origin websocket URL', async () => {
  const { createDanaoRoomClient } = await import('../public/games/danao/src/online/room-client.js');
  const sockets = [];
  class FakeSocket {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
    addEventListener(type, fn) { this['on' + type] = fn; }
    send(text) { this.sent.push(text); }
    close() { this.readyState = 3; this.onclose?.({ code: 1000, reason: 'closed' }); }
    open() { this.readyState = 1; this.onopen?.({}); }
  }
  const fetchImpl = async () => new Response(JSON.stringify({
    room: { code: '0042', hostId: 0, phase: 'lobby', players: [{ id: 1, name: 'Gaby', ready: false, connected: false }] },
    id: 1,
    token: '22222222-2222-4222-8222-222222222222',
  }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  const client = createDanaoRoomClient({ baseUrl: 'https://example.test', fetchImpl, WebSocketCtor: FakeSocket, storage: null });
  await client.joinRoom({ code: '0042', name: 'Gaby', character: 'Gaby', costume: 'Arcade' });
  assert.equal(sockets.length, 1);
  assert.equal(sockets[0].url, 'wss://example.test/api/danao/0042/socket?token=22222222-2222-4222-8222-222222222222');
});

test('v0.9 room client dispatches room/snapshot/input/host/result messages and ignores stale snapshots', async () => {
  const { createDanaoRoomClient } = await import('../public/games/danao/src/online/room-client.js');
  let socket;
  class FakeSocket {
    constructor() { socket = this; this.readyState = 0; this.sent = []; }
    addEventListener(type, fn) { this['on' + type] = fn; }
    send(text) { this.sent.push(text); }
    open() { this.readyState = 1; this.onopen?.({}); }
    message(value) { this.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) }); }
    close() { this.readyState = 3; }
  }
  const storage = new Map([
    ['danao.reconnect.code', '1234'],
    ['danao.reconnect.token', '33333333-3333-4333-8333-333333333333'],
  ]);
  const seen = { room: 0, snapshot: [], input: [], host: [], result: [] };
  const client = createDanaoRoomClient({
    baseUrl: 'https://example.test',
    fetchImpl: async () => { throw new Error('fetch not expected'); },
    WebSocketCtor: FakeSocket,
    storage: { getItem: (k) => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,String(v)), removeItem: (k) => storage.delete(k) },
  });
  client.on('room', () => seen.room++);
  client.on('snapshot', (state) => seen.snapshot.push(state.seq));
  client.on('input', (value) => seen.input.push(value.id));
  client.on('host', (value) => seen.host.push(value.hostId));
  client.on('result', (value) => seen.result.push(value.winner));
  assert.equal(client.reconnectLast(), true);
  socket.open();
  socket.message({ type: 'welcome', id: 2, room: { code: '1234', hostId: 0, phase: 'fight', players: [] }, state: { seq: 4, fighters: [] } });
  socket.message({ type: 'snapshot', state: { seq: 5, fighters: [] } });
  socket.message({ type: 'snapshot', state: { seq: 4, fighters: [{ slot: 0 }] } });
  socket.message({ type: 'input', id: 1, frame: { seq: 2, moveX: 1, moveY: 0 } });
  socket.message({ type: 'host', hostId: 2, state: { seq: 5, fighters: [] } });
  socket.message({ type: 'result', result: { winner: 2 } });
  assert.equal(seen.room >= 1, true);
  assert.deepEqual(seen.snapshot, [4, 5]);
  assert.deepEqual(seen.input, [1]);
  assert.deepEqual(seen.host, [2]);
  assert.deepEqual(seen.result, [2]);
  assert.equal(client.playerId, 2);
  assert.equal(client.isHost, true);
});

test('v0.9 room client rate-limits inputs to 30 Hz and host snapshots to 15 Hz', async () => {
  const { createDanaoRoomClient } = await import('../public/games/danao/src/online/room-client.js');
  let socket;
  class FakeSocket {
    constructor() { socket = this; this.readyState = 1; this.sent = []; }
    addEventListener(type, fn) { this['on' + type] = fn; }
    send(text) { this.sent.push(JSON.parse(text)); }
    close() {}
  }
  const client = createDanaoRoomClient({ baseUrl: 'https://example.test', fetchImpl: async () => { throw new Error('unused'); }, WebSocketCtor: FakeSocket, storage: null });
  client.restoreSession({ code: '9999', token: '44444444-4444-4444-8444-444444444444', id: 0, room: { code: '9999', hostId: 0, phase: 'fight', players: [] } });
  client.connect();
  assert.equal(client.sendInput({ moveX: 1, punch: true }, 1000), true);
  assert.equal(client.sendInput({ moveX: 0, punch: false }, 1010), false);
  assert.equal(client.sendInput({ moveX: 0, punch: false }, 1034), true);
  assert.equal(client.sendState({ fighters: [] }, 2000), true);
  assert.equal(client.sendState({ fighters: [] }, 2040), false);
  assert.equal(client.sendState({ fighters: [] }, 2067), true);
  const inputs = socket.sent.filter((m) => m.type === 'input');
  const states = socket.sent.filter((m) => m.type === 'state');
  assert.deepEqual(inputs.map((m) => m.seq), [1, 2]);
  assert.deepEqual(states.map((m) => m.state.seq), [1, 2]);
});


test('v0.9 online lobby UI is separate from local play and exposes room actions', () => {
  const lobbyPath = path.join(root, 'public/games/danao/src/online/lobby.js');
  const cssPath = path.join(root, 'public/games/danao/src/online/online.css');
  assert.equal(fs.existsSync(lobbyPath), true);
  assert.equal(fs.existsSync(cssPath), true);
  const lobby = fs.readFileSync(lobbyPath, 'utf8');
  for (const text of ['ONLINE PLAY', 'CREATE ROOM', 'JOIN ROOM', 'ROOM CODE', 'LOCAL PLAY']) {
    assert.ok(lobby.includes(text), text);
  }
  const html = fs.readFileSync(path.join(root, 'public/games/danao/index.html'), 'utf8');
  assert.match(html, /src\/online\/online\.css/);
  assert.match(html, /id="online-shell"/);
});

test('v0.9 lobby maps only the three Babylon arenas and eight Mango fighters to server choices', async () => {
  const lobby = await import('../public/games/danao/src/online/lobby.js');
  assert.equal(lobby.localArenaToServer('ring'), 'WrestlingArena');
  assert.equal(lobby.localArenaToServer('courtyard'), 'TempleCourtyard');
  assert.equal(lobby.localArenaToServer('rooftop'), 'SichuanTeaHouse');
  assert.equal(lobby.serverArenaToLocal('WrestlingArena'), 'ring');
  assert.equal(lobby.fighterIdToCharacter('hero'), 'Hero');
  assert.equal(lobby.fighterIdToCharacter('mulan'), 'Mulan');
  assert.equal(lobby.fighterIdToCharacter('dad'), 'Dad');
});


test('v0.9 online match bridge module exists', () => {
  assert.equal(fs.existsSync(path.join(root, 'public/games/danao/src/online/match-bridge.js')), true);
});

test('v0.9 match bridge starts Babylon with room slots and routes host/non-host traffic', async () => {
  const { createOnlineMatchBridge } = await import('../public/games/danao/src/online/match-bridge.js');
  const handlers = new Map();
  const sent = { input: [], state: [] };
  const client = {
    playerId: 1,
    isHost: false,
    on(type, fn) { handlers.set(type, fn); return () => handlers.delete(type); },
    sendInput(value, at) { sent.input.push({ value, at }); return true; },
    sendState(value, at) { sent.state.push({ value, at }); return true; },
  };
  const calls = [];
  const runtime = {
    async startMatch(options) { calls.push(['start', options]); },
    setNetworkAuthority(value) { calls.push(['authority', value]); },
    readNetworkInput() { return { moveX: 0.5, moveZ: -0.25, light: true }; },
    setRemoteInput(slot, frame) { calls.push(['remoteInput', slot, frame]); },
    captureNetworkSnapshot() { return { fighters: [{ slot: 0, hp: 88 }] }; },
    applyNetworkSnapshot(state, exact) { calls.push(['snapshot', state.seq, exact]); },
    stopMatch() { calls.push(['stop']); },
  };
  const bridge = createOnlineMatchBridge({ client, runtime });
  const room = {
    code: '1111', hostId: 0, matchId: 2, phase: 'fight',
    players: [
      { id: 0, name: 'Hero', character: 'Hero', connected: true },
      { id: 1, name: 'Gaby', character: 'Gaby', connected: true },
    ],
  };
  await bridge.start({ room, localPlayerId: 1, arenaId: 'ring', settings: {} });
  assert.equal(calls[0][0], 'start');
  assert.equal(calls[0][1].online.localPlayerId, 1);
  assert.equal(calls[0][1].online.isHost, false);
  assert.deepEqual(calls[0][1].online.players.map((p) => p.id), [0, 1]);
  bridge.tick(1000);
  assert.equal(sent.input.length, 1);
  handlers.get('snapshot')?.({ seq: 5, fighters: [] });
  assert.deepEqual(calls.at(-1), ['snapshot', 5, false]);

  client.isHost = true;
  handlers.get('input')?.({ id: 1, frame: { seq: 4, moveX: 1, moveY: 0 } });
  assert.equal(calls.at(-1)[0], 'remoteInput');
  bridge.tick(1100);
  assert.equal(sent.state.length, 1);
});

test('v0.9 host transfer applies retained snapshot before enabling Babylon authority', async () => {
  const { createOnlineMatchBridge } = await import('../public/games/danao/src/online/match-bridge.js');
  const handlers = new Map();
  const order = [];
  const client = {
    playerId: 2,
    isHost: false,
    on(type, fn) { handlers.set(type, fn); return () => handlers.delete(type); },
    sendInput() { return true; },
    sendState() { return true; },
  };
  const runtime = {
    async startMatch() {},
    setNetworkAuthority(value) { order.push(['authority', value.isHost]); },
    readNetworkInput() { return {}; },
    setRemoteInput() {},
    captureNetworkSnapshot() { return { fighters: [] }; },
    applyNetworkSnapshot(state, exact) { order.push(['snapshot', state.seq, exact]); },
  };
  const bridge = createOnlineMatchBridge({ client, runtime });
  await bridge.start({ room: { hostId: 0, matchId: 1, players: [{ id: 2, character: 'Mulan' }] }, localPlayerId: 2, arenaId: 'ring' });
  order.length = 0;
  client.isHost = true;
  handlers.get('host')?.({ hostId: 2, state: { seq: 9, fighters: [] } });
  assert.deepEqual(order, [['snapshot', 9, true], ['authority', true]]);
});

test('v0.9 packaged runtime exposes online authority, input and snapshot hooks', () => {
  const runtime = fs.readFileSync(path.join(root, 'public/games/danao/src/game/runtime.js'), 'utf8');
  for (const marker of [
    'networkMode',
    'networkIsHost',
    'networkLocalSlot',
    'remoteInputs',
    'options.online',
    "type: 'remote'",
    "type: 'network-local'",
    'setRemoteInput',
    'readNetworkInput',
    'captureNetworkSnapshot',
    'applyNetworkSnapshot',
    'setNetworkAuthority',
  ]) assert.ok(runtime.includes(marker), marker);
  assert.match(runtime, /if \(!networkMode \|\| networkIsHost\)/);
});


test('v0.9 main mounts room client, online lobby and match bridge without replacing local play', () => {
  const main = fs.readFileSync(path.join(root, 'public/games/danao/src/main.js'), 'utf8');
  for (const marker of [
    "from './online/room-client.js'",
    "from './online/lobby.js'",
    "from './online/match-bridge.js'",
    'mountOnlineLobby',
    'createOnlineMatchBridge',
    'onlineBridge.tick',
    'app?.beginMatch',
  ]) assert.ok(main.includes(marker), marker);
});

test('v0.9 packaged app exposes an external beginMatch hook for online room starts', () => {
  const app = fs.readFileSync(path.join(root, 'public/games/danao/src/ui/App.js'), 'utf8');
  assert.match(app, /beginMatch/);
  assert.match(app, /START_MATCH/);
});

test('v0.9 online bridge can report an authoritative host result through the room service', async () => {
  const { createOnlineMatchBridge } = await import('../public/games/danao/src/online/match-bridge.js');
  const sent = [];
  const client = {
    playerId: 0,
    isHost: true,
    on() { return () => {}; },
    sendInput() { return true; },
    sendState() { return true; },
    sendResult(result) { sent.push(result); return true; },
  };
  const runtime = {
    async startMatch() {},
    setNetworkAuthority() {},
    captureNetworkSnapshot() {
      return { fighters: [{ slot: 0, hp: 50, active: true }, { slot: 1, hp: 0, active: false }] };
    },
    stopMatch() {},
  };
  const bridge = createOnlineMatchBridge({ client, runtime });
  await bridge.start({ room: { hostId: 0, matchId: 1, players: [{ id: 0 }, { id: 1 }] }, localPlayerId: 0, arenaId: 'ring' });
  assert.equal(bridge.reportResult({ winner: 'Hero' }), true);
  assert.deepEqual(sent, [{ winner: 0, winnerTeam: -1, interrupted: false, reason: '' }]);
});

test('v0.9 LOCAL PLAY leaves an active online room instead of hiding it in the background', () => {
  const lobby = fs.readFileSync(path.join(root, 'public/games/danao/src/online/lobby.js'), 'utf8');
  assert.match(lobby, /if \(client\.room\) client\.leave\(\)/);
});
