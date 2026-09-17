import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync('public/games/danao/game.mjs','utf8');
const hazards=fs.readFileSync('public/games/danao/hazards.mjs','utf8');

test('browser wrestling ring uses the Unity rope and floor coordinates',()=>{
 for(const value of ['5.65','5.8','11.8','12.6','1.25','2.2'])assert.match(game,new RegExp(value.replace('.','\\.')));
 assert.match(hazards,/edge:5\.65/);
 assert.match(game,/ringBounds/);
 assert.match(game,/ringFloorY/);
});

test('Royal Rumble and damage-off modes eliminate outside the ring only after dropping below its floor',()=>{
 assert.match(game,/outside/);
 assert.match(game,/belowFloor/);
 assert.match(game,/modeRules\.ringOut|modeRules\?\.ringOut/);
 assert.match(game,/healthDamage===false/);
 assert.match(game,/f\.eliminate\(\)/);
 assert.match(game,/fellWorld/);
});
