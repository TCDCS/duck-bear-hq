import test from 'node:test';
import assert from 'node:assert/strict';

import { fighterPose } from '../public/games/danao/src/game/presentation.js';

const bounded = (value, name) => {
  assert.ok(Number.isFinite(value), `${name} must be finite`);
  assert.ok(value >= -1.001 && value <= 1.001, `${name} must stay bounded: ${value}`);
};

test('v0.7 attack pose has separate wind-up, contact and recovery phases', () => {
  const lightUntil = 1000 + 155;
  const windup = fighterPose({ now: 1000 + 31, attackKind: 'light', attackUntil: lightUntil });
  const contact = fighterPose({ now: 1000 + 78, attackKind: 'light', attackUntil: lightUntil });
  const recovery = fighterPose({ now: 1000 + 132, attackKind: 'light', attackUntil: lightUntil });

  assert.ok(windup.attackWindup > 0.45);
  assert.ok(windup.attackReach < 0.35);
  assert.ok(contact.attackReach > 0.7);
  assert.ok(recovery.attackRecovery > 0.5);

  const heavyUntil = 2000 + 250;
  const heavyWindup = fighterPose({ now: 2000 + 75, attackKind: 'heavy', attackUntil: heavyUntil });
  assert.ok(heavyWindup.attackWindup > 0.7);
  assert.ok(Math.abs(heavyWindup.bodyTwist) > 0.35);
});

test('v0.7 locomotion, jump, dodge and recoil pose values are finite and readable', () => {
  const running = fighterPose({ now: 900, speed: 5.2, grounded: true, verticalSpeed: 0 });
  assert.ok(Math.abs(running.stride) > 0.1);
  assert.ok(running.footLift >= 0);

  const airborne = fighterPose({ now: 900, speed: 3, grounded: false, verticalSpeed: 5.5 });
  assert.ok(airborne.jumpTuck > 0.4);

  const dodging = fighterPose({ now: 1000, dodgeUntil: 1180 });
  assert.ok(Math.abs(dodging.dodgeLean) > 0.35);

  const recoiling = fighterPose({ now: 1000, hitStunUntil: 1320 });
  assert.ok(recoiling.recoil > 0.5);

  for (const [name, value] of Object.entries({ 
    stride: running.stride,
    footLift: running.footLift,
    jumpTuck: airborne.jumpTuck,
    dodgeLean: dodging.dodgeLean,
    recoil: recoiling.recoil,
    attackWindup: recoiling.attackWindup,
    attackReach: recoiling.attackReach,
    attackRecovery: recoiling.attackRecovery,
    bodyTwist: recoiling.bodyTwist,
  })) bounded(value, name);
});
