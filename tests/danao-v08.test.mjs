import test from 'node:test';
import assert from 'node:assert/strict';

import * as bot from '../public/games/danao/src/game/bot.js';

const contextIntent = (self, target, context, roll = 0.5) => {
  assert.ok(bot.botIntent.length >= 3, 'botIntent must accept a context argument');
  return bot.botIntent(self, target, context, () => roll);
};

test('v0.8 assigns persistent bot personality profiles by slot', () => {
  assert.equal(typeof bot.botProfileForSlot, 'function');
  const one = bot.botProfileForSlot(1);
  const two = bot.botProfileForSlot(2);
  const three = bot.botProfileForSlot(3);
  assert.equal(one.id, 'bruiser');
  assert.equal(two.id, 'scavenger');
  assert.equal(three.id, 'trickster');
  for (const profile of [one, two, three]) {
    for (const key of ['aggression', 'itemBias', 'dodgeBias']) {
      assert.ok(profile[key] >= 0 && profile[key] <= 1, `${profile.id} ${key}`);
    }
  }
});

test('v0.8 bots retreat inward before fighting when near an arena edge', () => {
  const intent = contextIntent(
    { x: 6.4, z: 0 },
    { x: 7, z: 0 },
    { arenaSize: { x: 14, z: 14 }, profile: { aggression: 1, itemBias: 0, dodgeBias: 0 } },
    0,
  );
  assert.ok(intent.moveX < -0.55, `expected inward movement, got ${intent.moveX}`);
  assert.equal(intent.light, false);
  assert.equal(intent.heavy, false);
});

test('v0.8 bots steer away from an active hazard before attacking', () => {
  const intent = contextIntent(
    { x: 0.4, z: 0 },
    { x: 1.1, z: 0 },
    {
      arenaSize: { x: 17, z: 17 },
      hazards: [{ x: 0, z: 0, radius: 3.3 }],
      profile: { aggression: 1, itemBias: 0, dodgeBias: 0 },
    },
    0,
  );
  assert.ok(intent.moveX > 0.45, `expected movement away from hazard, got ${intent.moveX}`);
  assert.equal(intent.light, false);
  assert.equal(intent.heavy, false);
});

test('v0.8 scavenger bots seek and pick up useful nearby props', () => {
  const seek = contextIntent(
    { x: 0, z: 0 },
    { x: 5.5, z: 0 },
    {
      arenaSize: { x: 24, z: 19 },
      props: [
        { id: 'chair', x: 1.8, z: 0.3, carryable: true, value: 1.2 },
        { id: 'cone', x: 4.4, z: 1.5, carryable: true, value: 0.6 },
      ],
      profile: { aggression: 0.5, itemBias: 1, dodgeBias: 0.4 },
    },
    0.7,
  );
  assert.ok(seek.moveX > 0.65);
  assert.equal(seek.grab, false);

  const pickup = contextIntent(
    { x: 0.9, z: 0.1 },
    { x: 5.5, z: 0 },
    {
      arenaSize: { x: 24, z: 19 },
      props: [{ id: 'chair', x: 1.35, z: 0.15, carryable: true, value: 1.2 }],
      profile: { aggression: 0.5, itemBias: 1, dodgeBias: 0.4 },
    },
    0.05,
  );
  assert.equal(pickup.grab, true);
});

test('v0.8 bots throw held props at medium-range opponents', () => {
  const intent = contextIntent(
    { x: 0, z: 0 },
    { x: 4.2, z: 0 },
    {
      arenaSize: { x: 24, z: 19 },
      heldProp: true,
      profile: { aggression: 0.7, itemBias: 0.8, dodgeBias: 0.4 },
    },
    0.05,
  );
  assert.equal(intent.grab, true);
  assert.equal(intent.light, false);
});

test('v0.8 bruiser bots pressure nearby opponents with attacks and can grab a downed target', () => {
  const attack = contextIntent(
    { x: 0, z: 0 },
    { x: 1.7, z: 0 },
    {
      arenaSize: { x: 24, z: 19 },
      profile: { aggression: 1, itemBias: 0, dodgeBias: 0 },
    },
    0.05,
  );
  assert.equal(attack.light || attack.heavy, true);

  const grab = contextIntent(
    { x: 0, z: 0 },
    { x: 0.9, z: 0 },
    {
      arenaSize: { x: 24, z: 19 },
      targetKnockedDown: true,
      profile: { aggression: 0.8, itemBias: 0.2, dodgeBias: 0.2 },
    },
    0.04,
  );
  assert.equal(grab.grab, true);
});


test('v0.8 packaged runtime supplies live world context to bot decisions', async () => {
  const { readFileSync } = await import('node:fs');
  const { default: path } = await import('node:path');
  const runtime = readFileSync(path.resolve(import.meta.dirname, '../public/games/danao/src/game/runtime.js'), 'utf8');
  for (const marker of [
    "import { botIntent, botProfileForSlot } from './bot.js';",
    "botProfile: control.type === 'bot' ? botProfileForSlot(slot) : null",
    'arenaSize: currentArena.size',
    'hazards: hazards.map',
    'props: props.map',
    'heldProp: Boolean(fighter.heldPropId)',
    'holdingFighter: Boolean(fighter.grabbedFighterId)',
    'targetKnockedDown: target.knockedDown',
    'profile: fighter.botProfile',
  ]) assert.ok(runtime.includes(marker), marker);
  assert.doesNotMatch(runtime, /Math\.random\(\) < 0\.012/);
});


test('v0.8 Wrestling Hall offers a deeper mix of props for item-seeking bots', async () => {
  const { getArena } = await import('../public/games/danao/src/game/arena.js');
  const ring = getArena('ring');
  assert.ok(ring.props.length >= 25, `expected at least 25 props, got ${ring.props.length}`);
  const counts = ring.props.reduce((map, prop) => {
    map[prop.itemId] = (map[prop.itemId] || 0) + 1;
    return map;
  }, {});
  assert.ok((counts.chair || 0) >= 7);
  assert.ok((counts.crate || 0) >= 5);
  assert.ok((counts.mallet || 0) >= 3);
  assert.ok((counts.cone || 0) >= 2);
  assert.ok((counts.baguette || 0) >= 2);
});
