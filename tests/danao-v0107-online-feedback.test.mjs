import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function fakeClient({ playerId = 0, isHost = false } = {}) {
  const handlers = new Map();
  const sent = { input: [], state: [] };
  return {
    handlers,
    sent,
    client: {
      playerId,
      isHost,
      on(type, fn) { handlers.set(type, fn); return () => handlers.delete(type); },
      sendInput(value, at) { sent.input.push({ value, at }); return true; },
      sendState(value, at) { sent.state.push({ value, at }); return true; },
      sendResult() { return true; },
    },
  };
}

function fakeRuntime() {
  const calls = [];
  return {
    calls,
    runtime: {
      async startMatch(options) { calls.push(['start', options]); },
      setNetworkAuthority(value) { calls.push(['authority', value]); },
      readNetworkInput() { return { moveX: 0, moveZ: 0 }; },
      setRemoteInput() {},
      captureNetworkSnapshot() { return { matchId: 7, fighters: [{ slot: 0, hp: 100 }], props: [] }; },
      applyNetworkSnapshot(state, exact) { calls.push(['snapshot', state.seq, exact]); },
      stopMatch() {},
    },
  };
}

test('v0.10.7 host snapshots relay only allow-listed cosmetic feedback', async () => {
  const { createOnlineMatchBridge } = await import('../public/games/danao/src/online/match-bridge.js');
  const { client, sent } = fakeClient({ playerId: 0, isHost: true });
  const { runtime } = fakeRuntime();
  const bridge = createOnlineMatchBridge({ client, runtime });
  await bridge.start({
    room: { hostId: 0, matchId: 7, players: [{ id: 0, character: 'Hero' }] },
    localPlayerId: 0,
    arenaId: 'ring',
  });

  assert.equal(bridge.recordFeedback({
    type: 'heavy-hit',
    x: 2.5,
    y: 1,
    z: -3,
    text: '<b>not relayed</b>',
    attackerId: 'private-extra-data',
  }), true);
  assert.equal(bridge.recordFeedback({ type: 'made-up-event', x: 1 }), false);
  assert.equal(bridge.tick(1000), true);

  assert.equal(sent.state.length, 1);
  assert.deepEqual(sent.state[0].value.feedback, [{
    seq: 1,
    type: 'heavy-hit',
    x: 2.5,
    y: 1,
    z: -3,
  }]);
  assert.equal('text' in sent.state[0].value.feedback[0], false);
  assert.equal('attackerId' in sent.state[0].value.feedback[0], false);
});

test('v0.10.7 guests render each relayed feedback event once', async () => {
  const { createOnlineMatchBridge } = await import('../public/games/danao/src/online/match-bridge.js');
  const { client, handlers } = fakeClient({ playerId: 1, isHost: false });
  const { runtime, calls } = fakeRuntime();
  const seen = [];
  const bridge = createOnlineMatchBridge({ client, runtime, onFeedback: (event) => seen.push(event) });
  await bridge.start({
    room: {
      hostId: 0,
      matchId: 7,
      players: [{ id: 0, character: 'Hero' }, { id: 1, character: 'Gaby' }],
    },
    localPlayerId: 1,
    arenaId: 'ring',
  });

  handlers.get('snapshot')?.({
    seq: 4,
    matchId: 7,
    fighters: [],
    feedback: [
      { seq: 1, type: 'light-hit', x: 1, y: 1, z: 1, text: 'ignored' },
      { seq: 2, type: 'prop-break', x: 2, y: 1, z: 2 },
    ],
  });
  handlers.get('snapshot')?.({
    seq: 5,
    matchId: 7,
    fighters: [],
    feedback: [
      { seq: 1, type: 'light-hit', x: 1, y: 1, z: 1 },
      { seq: 2, type: 'prop-break', x: 2, y: 1, z: 2 },
      { seq: 3, type: 'ko', x: 3, y: 1, z: 3 },
    ],
  });

  assert.deepEqual(seen.map((event) => [event.seq, event.type]), [
    [1, 'light-hit'],
    [2, 'prop-break'],
    [3, 'ko'],
  ]);
  assert.equal(seen.some((event) => 'text' in event), false);
  assert.deepEqual(calls.filter((entry) => entry[0] === 'snapshot').map((entry) => entry[1]), [4, 5]);
});

test('v0.10.7 host migration continues feedback sequence without replaying old effects', async () => {
  const { createOnlineMatchBridge } = await import('../public/games/danao/src/online/match-bridge.js');
  const { client, handlers, sent } = fakeClient({ playerId: 1, isHost: false });
  const { runtime } = fakeRuntime();
  const seen = [];
  const bridge = createOnlineMatchBridge({ client, runtime, onFeedback: (event) => seen.push(event) });
  await bridge.start({
    room: { hostId: 0, matchId: 7, players: [{ id: 0 }, { id: 1 }] },
    localPlayerId: 1,
    arenaId: 'ring',
  });

  handlers.get('snapshot')?.({
    seq: 6,
    matchId: 7,
    fighters: [],
    feedback: [{ seq: 7, type: 'grab', x: 0, y: 1, z: 0 }],
  });
  handlers.get('host')?.({
    hostId: 1,
    state: {
      seq: 6,
      matchId: 7,
      fighters: [],
      feedback: [{ seq: 7, type: 'grab', x: 0, y: 1, z: 0 }],
    },
  });
  assert.equal(seen.length, 1);

  assert.equal(bridge.recordFeedback({ type: 'fighter-throw', x: 4, y: 1, z: -2 }), true);
  assert.equal(bridge.tick(2000), true);
  assert.deepEqual(sent.state.at(-1).value.feedback.map((event) => event.seq), [7, 8]);
});

test('browser main records authoritative feedback and renders guest feedback through one presenter', () => {
  const main = read('public/games/danao/src/main.js');
  assert.match(main, /function renderCombatFeedback\(event\)/);
  assert.match(main, /onlineBridge\?\.recordFeedback\?\.\(event\)/);
  assert.match(main, /onFeedback\(event\) \{\n    renderCombatFeedback\(event\);\n  \},/);
});

test('online feedback parity release is Danao 0.10.7', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  assert.equal(release.version, '0.10.7');
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
