import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync('public/games/danao/game.mjs','utf8');
const html=fs.readFileSync('public/games/danao/index.html','utf8');

test('live Babylon game wires the shared eight-mode rules into matches',()=>{
 assert.match(game,/from ['"]\.\/modes\.mjs['"]/);
 assert.match(game,/createModeState/);
 assert.match(game,/resolveElimination/);
 assert.match(game,/tickModeObjectives/);
 assert.match(game,/modeKind/);
 assert.match(game,/localPlayerCount/);
});

test('objective modes expose HUD state and browser respawns',()=>{
 assert.match(html,/id=["']objective-status["']/);
 assert.match(game,/objectiveHudText/);
 assert.match(game,/respawnSeconds/);
 assert.match(game,/respawnFighter/);
 assert.match(game,/MangoGrab/);
 assert.match(game,/HotBomb/);
 assert.match(game,/KingOfTheRing/);
 assert.match(game,/Heist/);
});

test('Royal Rumble and team knockout have distinct live match handling',()=>{
 assert.match(game,/ringOut/);
 assert.match(game,/winnerTeam/);
 assert.match(game,/team/);
 assert.match(game,/TwoVsTwo/);
 assert.match(game,/RoyalRumble/);
});
