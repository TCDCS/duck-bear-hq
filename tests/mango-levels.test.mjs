import test from 'node:test';import assert from 'node:assert/strict';
import {LEVEL_IDS} from '../public/games/mango-mayhem/content/catalog.mjs';
import {LEVELS} from '../public/games/mango-mayhem/content/levels/index.mjs';
for(const id of LEVEL_IDS){test(`${id} has 120 unique mangos, three flags, two secret routes and its own course`,()=>{
 const l=LEVELS[id];assert.equal(l.id,id);assert.equal(l.mangoes.length,120);assert.equal(new Set(l.mangoes.map(m=>m.id)).size,120);
 assert.deepEqual(l.checkpoints.map(c=>c.index),[1,2,3]);assert.ok(l.secretRoutes.length>=2);assert.ok(l.width>=12000);assert.ok(l.enemies.length>=8);
 for(const m of l.mangoes)assert.ok(Number.isFinite(m.x)&&Number.isFinite(m.y)&&m.x>0&&m.x<l.width);
 for(const p of [l.spawn,...l.checkpoints])assert.ok(l.surfaces.some(s=>p.x>=s.x&&p.x<=s.x+s.w&&Math.abs(p.y-s.y)<1&&s.kind!=='ramp'),`unsupported checkpoint ${JSON.stringify(p)}`);
 assert.ok(l.surfaces.some(s=>s.requiresHelper));assert.ok(l.surfaces.some(s=>s.kind==='ramp'));assert.ok(l.surfaces.some(s=>s.kind==='moving'));
});}
test('courses do not reuse identical terrain with different paint',()=>{assert.equal(new Set(LEVEL_IDS.map(id=>JSON.stringify(LEVELS[id].surfaces.map(s=>[s.x,s.y,s.w,s.endY])))).size,6);});
