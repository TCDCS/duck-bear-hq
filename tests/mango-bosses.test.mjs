import test from 'node:test';import assert from 'node:assert/strict';
import {createBoss,stepBoss,hitBoss} from '../public/games/mango-mayhem/core/bosses.mjs';
const ids=['squawks','brolly','peacock','clatter','gust','pulp'];
for(const id of ids){
 test(`${id}: telegraphs, attacks, exposes a reachable target, then clears exactly once`,()=>{
  const b=createBoss({id,spawn:{x:700,y:450},arena:{x:0,y:450,w:950,h:540}});const phases=new Set();const signatures=new Set();
  const p={x:350,y:450};let hits=0,clear=0;
  for(let t=0;t<7000&&b.hp>0;t++){
   const effects=stepBoss(b,p,{extraHelp:false});phases.add(b.phase);effects.forEach(e=>signatures.add(e.kind));
   if(b.phase==='vulnerable'&&b.invulnerableTicks===0){
    const hp=b.hp;assert.equal(hitBoss(b,`attack-${hits}`),true);assert.equal(b.hp,hp-1);assert.equal(hitBoss(b,`attack-${hits}`),false);hits++;
    if(b.hp===0)clear++;
   }
  }
  assert.ok(phases.has('warn'));assert.ok(phases.has('attack'));assert.ok(phases.has('vulnerable'));assert.equal(b.hp,0);assert.equal(clear,1);assert.equal(hits,id==='pulp'?4:3);
  assert.equal(hitBoss(b,'extra'),false);
 });
 test(`${id}: armour ignores attacks outside the exposed phase`,()=>{const b=createBoss({id,spawn:{x:700,y:450},arena:{x:0,y:450,w:950,h:540}});assert.equal(hitBoss(b,'attack'),false);assert.equal(b.hp,id==='pulp'?4:3);});
}
test('six bosses use six distinct attack kinds',()=>{
 const kinds=[];for(const id of ids){const b=createBoss({id,spawn:{x:700,y:450},arena:{x:0,y:450,w:950,h:540}});const s=new Set();for(let i=0;i<220;i++)stepBoss(b,{x:250,y:450},{}).forEach(e=>s.add(e.kind));kinds.push([...s].join(','));}assert.equal(new Set(kinds).size,6);
});

test('a fatal boss projectile stops the old boss update after checkpoint respawn', async()=>{
 const {createWorld,stepWorld}=await import('../public/games/mango-mayhem/core/world.mjs');
 const {LEVELS}=await import('../public/games/mango-mayhem/content/levels/index.mjs');
 const w=createWorld(LEVELS.dublin,{checkpointIndex:3});w.phase='boss';
 w.player.x=w.boss.x;w.player.y=w.boss.y;w.player.hearts=1;
 const old=w.boss;old.phase='vulnerable';old.hp=1;
 w.projectiles=[{id:1,kind:'feather',x:w.player.x,y:w.player.y,vx:0,vy:0,life:5,w:50,h:90}];
 stepWorld(w,{spinPressed:true});
 assert.equal(w.phase,'playing');assert.notEqual(w.boss,old);assert.equal(w.player.hearts,5);
 assert.equal(w.events.filter(e=>e.type==='level-clear'||e.type==='boss-hit').length,0);
});
