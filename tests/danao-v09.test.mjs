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
