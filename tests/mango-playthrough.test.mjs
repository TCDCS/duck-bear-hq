import test from 'node:test';import assert from 'node:assert/strict';
import {LEVELS} from '../public/games/mango-mayhem/content/levels/index.mjs';
import {createWorld,stepWorld} from '../public/games/mango-mayhem/core/world.mjs';
import {pilotInput} from './helpers/mango-pilot.mjs';
for(const [id,level] of Object.entries(LEVELS))test(`${id}: complete from opening to boss using movement inputs only`,()=>{
 const w=createWorld(level),memory={},events=new Set();
 for(let i=0;i<20000&&w.phase!=='complete';i++){stepWorld(w,pilotInput(w,memory));for(const e of w.events)events.add(e.type==='checkpoint'?`checkpoint-${e.checkpointIndex}`:e.type);}
 assert.equal(w.phase,'complete',`${id} stopped at x=${w.player.x.toFixed(1)} y=${w.player.y.toFixed(1)} phase=${w.phase} hp=${w.boss.hp} respawns=${w.respawns}`);
 for(const e of ['helper','checkpoint-1','checkpoint-2','checkpoint-3','boss-hit','level-clear'])assert.ok(events.has(e),`${id}: missing ${e}`);
 assert.ok(w.collectedIds.size>=20);assert.ok(w.respawns<8,`${id}: ${w.respawns} retries`);
 console.log(JSON.stringify({level:id,ticks:w.tick,mangos:w.collectedIds.size,respawns:w.respawns,bossHits:w.boss.maxHp}));
});

test('taj checkpoint two remains passable after the nearby enemy is already defeated',()=>{
 const w=createWorld(LEVELS.taj,{checkpointIndex:2}),memory={};
 const nearby=w.enemies.find(e=>Math.abs(e.originX-8190)<5);assert.ok(nearby);nearby.dead=true;w.defeatedEnemyIds.add(nearby.id);
 for(let i=0;i<1500&&w.player.x<9300;i++)stepWorld(w,pilotInput(w,memory));
 assert.ok(w.player.x>=9300,`taj checkpoint two looped at x=${w.player.x.toFixed(1)} with ${w.respawns} retries`);
 assert.ok(w.respawns<3,`taj checkpoint two needed ${w.respawns} retries`);
});
