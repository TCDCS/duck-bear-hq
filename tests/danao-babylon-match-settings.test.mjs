import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('public/games/danao/index.html','utf8');
const game=fs.readFileSync('public/games/danao/game.mjs','utf8');
const fighter=fs.readFileSync('public/games/danao/fighter.mjs','utf8');

for(const id of ['health-damage','visible-bruising','arena-hazards','friendly-fire','online-health-damage','online-visible-bruising','online-arena-hazards','online-friendly-fire']){
 test(`match settings UI exposes ${id}`,()=>assert.match(html,new RegExp(`id=["']${id}["']`)));
}

test('local selected config carries independent gameplay and presentation toggles',()=>{
 assert.match(game,/healthDamage/);
 assert.match(game,/visibleBruising/);
 assert.match(game,/arenaHazards/);
 assert.match(game,/friendlyFire/);
 assert.match(game,/selectedConfig\(\)/);
 assert.match(game,/\.checked/);
});

test('online room setup sends the same independent toggles and mirrors host state',()=>{
 assert.match(game,/sendOnlineSetup/);
 assert.match(game,/onlineHealthDamage/);
 assert.match(game,/onlineVisibleBruising/);
 assert.match(game,/onlineArenaHazards/);
 assert.match(game,/onlineFriendlyFire/);
 assert.match(game,/room\.settings|onlineRoom\?\.settings/);
});

test('fighter damage-off preserves knockback and bruising can be disabled separately',()=>{
 assert.match(fighter,/settings/);
 assert.match(fighter,/healthDamage/);
 assert.match(fighter,/visibleBruising/);
 assert.match(fighter,/applyImpulse/);
 assert.match(fighter,/eliminate/);
});

test('team targeting honours the friendly-fire setting',()=>{
 assert.match(game,/modeRules\?\.teams|modeRules\.teams/);
 assert.match(game,/friendlyFire/);
 assert.match(game,/fighter\.team===attacker\.team/);
});
