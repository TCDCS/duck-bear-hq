import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync('public/games/danao/game.mjs','utf8');
const runtime=fs.readFileSync('public/games/danao/hazard-runtime.mjs','utf8');

test('live Babylon matches create and tick the shared arena hazards',()=>{
 assert.match(game,/from ['"]\.\/hazard-runtime\.mjs['"]/);
 assert.match(game,/setupArenaHazard/);
 assert.match(game,/tickArenaHazard/);
 assert.match(runtime,/from ['"]\.\/hazards\.mjs['"]/);
 assert.match(runtime,/hazardPose/);
 assert.match(runtime,/environmentVelocityDelta/);
});

test('online hazard physics stays host authoritative while clients still animate props',()=>{
 assert.match(runtime,/function hazardAuthority|export function hazardAuthority/);
 assert.match(runtime,/active\.isHost/);
 assert.match(game,/syncHazardVisual/);
 assert.match(runtime,/applyHazardEffects/);
 assert.match(game,/captureHazardState/);
 assert.match(game,/hydrateHazardState/);
});

test('wrestling ropes use the shared inward bounce rule',()=>{
 assert.match(runtime,/wrestlingRopeImpulse/);
 assert.match(runtime,/ropeCooldown/);
 assert.match(runtime,/\.rule\.cooldown/);
});
