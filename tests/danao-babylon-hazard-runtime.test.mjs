import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync('public/games/danao/game.mjs','utf8');

test('live Babylon matches create and tick the shared arena hazards',()=>{
 assert.match(game,/from ['"]\.\/hazards\.mjs['"]/);
 assert.match(game,/setupArenaHazard/);
 assert.match(game,/tickArenaHazard/);
 assert.match(game,/hazardPose/);
 assert.match(game,/environmentVelocityDelta/);
});

test('online hazard physics stays host authoritative while clients still animate props',()=>{
 assert.match(game,/hazardAuthority/);
 assert.match(game,/isHost/);
 assert.match(game,/syncHazardVisual/);
 assert.match(game,/applyHazardEffects/);
});

test('wrestling ropes use the shared inward bounce rule',()=>{
 assert.match(game,/wrestlingRopeImpulse/);
 assert.match(game,/ropeCooldown/);
});
