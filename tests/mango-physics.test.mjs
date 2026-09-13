import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,stepWorld,damagePlayer,respawnPlayer} from '../public/games/mango-mayhem/core/world.mjs';
import {resolveMotion,surfaceAt} from '../public/games/mango-mayhem/core/collision.mjs';
import {makeTestCourse,idle} from './helpers/mango-course.mjs';
const ticks=(w,n,input=idle)=>{for(let i=0;i<n;i++)stepWorld(w,input);};
test('player does not autorun and remains on the floor',()=>{const w=createWorld(makeTestCourse());ticks(w,120);assert.equal(w.player.x,120);assert.equal(w.player.y,450);assert.equal(w.player.hearts,5);assert.equal(w.player.grounded,true);});
test('running accelerates, brakes and stays below the speed cap',()=>{const w=createWorld(makeTestCourse());ticks(w,30,{...idle,axis:1});assert.ok(w.player.x>220);assert.ok(w.player.vx<=420);ticks(w,15);assert.equal(w.player.vx,0);});
test('holding jump is higher than tapping; cannot double jump',()=>{
 const a=createWorld(makeTestCourse()),b=createWorld(makeTestCourse());ticks(a,2);ticks(b,2);
 stepWorld(a,{...idle,jumpPressed:true,jumpHeld:true});stepWorld(b,{...idle,jumpPressed:true,jumpHeld:true});
 let minA=a.player.y,minB=b.player.y;for(let i=0;i<60;i++){stepWorld(a,{...idle,jumpHeld:i<30});stepWorld(b,idle);minA=Math.min(minA,a.player.y);minB=Math.min(minB,b.player.y);}
 assert.ok(minA<minB-35);assert.ok(minA<330);assert.equal(a.player.y,450);
 stepWorld(a,{...idle,jumpPressed:true,jumpHeld:true});ticks(a,6,{...idle,jumpHeld:true});const before=a.player.vy;stepWorld(a,{...idle,jumpPressed:true,jumpHeld:true});assert.ok(a.player.vy>before);
});
test('thin walls cannot be crossed at maximum horizontal speed',()=>{
 const p={x:70,y:100,w:30,h:70,vx:12000,vy:0,grounded:false,supportId:null};
 const r=resolveMotion(p,[{id:'wall',kind:'solid',x:100,y:0,w:2,h:300}],1);
 assert.equal(r.x,85);assert.equal(r.vx,0);
});
test('one-way platforms catch descent but do not block ascent',()=>{
 const s=[{id:'ledge',kind:'one-way',x:0,y:100,w:200,h:15}];
 const p={x:80,y:90,w:30,h:70,vx:0,vy:900,grounded:false};const down=resolveMotion(p,s,1);assert.equal(down.y,100);assert.equal(down.grounded,true);
 const up=resolveMotion({...p,y:180,vy:-1200},s,1);assert.equal(up.y,160);assert.equal(up.vy,-1200);
});
test('solid undersides stop upward motion',()=>{
 const p={x:80,y:180,w:30,h:70,vx:0,vy:-1200,grounded:false};
 const r=resolveMotion(p,[{id:'roof',kind:'solid',x:0,y:80,w:200,h:20}],1);assert.equal(r.y,170);assert.equal(r.vy,0);
});
test('ramps are walkable and follow their slope without bouncing',()=>{
 let p={x:10,y:197,w:30,h:70,vx:180,vy:30,grounded:true,supportId:'ramp'};const s=[{id:'ramp',kind:'ramp',x:0,y:200,endY:140,w:200,h:300}];
 for(let i=1;i<=40;i++){p=resolveMotion(p,s,i);p.vy=30;assert.equal(p.grounded,true);}assert.ok(p.y<175);
});
test('standing on a moving platform carries the body',()=>{
 const s={id:'lift',kind:'moving',x:100,y:300,w:200,h:16,travelX:80,travelY:-40,periodTicks:120};
 const first=surfaceAt(s,0);const p={x:first.x+80,y:first.y,w:30,h:70,vx:0,vy:30,grounded:true,supportId:'lift'};
 const r=resolveMotion(p,[s],1),at=surfaceAt(s,1);assert.ok(Math.abs(r.x-(at.x+80))<0.001);assert.ok(Math.abs(r.y-at.y)<0.001);
});
test('damage consumes one heart, immunity prevents repeated damage, retries restore five',()=>{
 const w=createWorld(makeTestCourse());damagePlayer(w,'enemy');assert.equal(w.player.hearts,4);damagePlayer(w,'enemy');assert.equal(w.player.hearts,4);
 for(let i=0;i<4;i++){w.player.invulnerableTicks=0;damagePlayer(w,'enemy');}assert.equal(w.player.hearts,5);assert.equal(w.player.x,120);
});
test('falling always returns to checkpoint, even during protection',()=>{
 const w=createWorld(makeTestCourse(),{checkpointIndex:2});w.player.y=1200;w.player.invulnerableTicks=999;stepWorld(w,idle);
 assert.equal(w.player.x,1400);assert.equal(w.player.y,450);assert.equal(w.player.hearts,4);
});
test('shield absorbs one hit; super power is temporary; heart capped at five',()=>{
 const c=makeTestCourse();c.powerUps=[{id:'shield',x:120,y:410,kind:'shield'}];const w=createWorld(c);stepWorld(w,idle);assert.equal(w.player.shield,true);
 damagePlayer(w,'enemy');assert.equal(w.player.shield,false);assert.equal(w.player.hearts,5);
 w.player.superTicks=1;stepWorld(w,idle);assert.equal(w.player.superTicks,0);
});
test('stomping a normal enemy defeats it and rebounds without damage',()=>{
 const c=makeTestCourse();c.enemies=[{id:'roller',kind:'roller',x:200,y:450,w:36,h:32,patrolStart:200,patrolEnd:200}];const w=createWorld(c);w.player.x=200;w.player.y=415;w.player.vy=420;
 stepWorld(w,idle);assert.equal(w.enemies[0].dead,true);assert.ok(w.player.vy<0);assert.equal(w.player.hearts,5);
});
test('helper and checkpoint fire once and remain active after respawn',()=>{
 const w=createWorld(makeTestCourse());w.player.x=900;stepWorld(w,idle);assert.equal(w.helperActivated,true);assert.equal(w.events.filter(e=>e.type==='helper').length,1);
 stepWorld(w,idle);assert.equal(w.events.filter(e=>e.type==='helper').length,0);w.player.x=1400;stepWorld(w,idle);assert.equal(w.checkpointIndex,2);respawnPlayer(w);assert.equal(w.helperActivated,true);
});
test('ordinary mangos are collected once and survive retries',()=>{
 const c=makeTestCourse();c.mangoes=[{id:'m001',x:120,y:410}];const w=createWorld(c);stepWorld(w,idle);assert.equal(w.collectedIds.size,1);respawnPlayer(w);stepWorld(w,idle);assert.equal(w.events.filter(e=>e.type==='pickup').length,0);
});
test('walking from an ascending ramp to its adjoining floor does not catch the body edge',()=>{
 const surfaces=[{id:'r',kind:'ramp',x:0,y:200,endY:140,w:200,h:300},{id:'floor',kind:'solid',x:200,y:140,w:300,h:300}];
 let p={x:170,y:149,w:30,h:70,vx:240,vy:30,grounded:true,supportId:'r'};
 for(let i=0;i<30;i++){p.vy=30;p=resolveMotion(p,surfaces,i);}assert.ok(p.x>250);assert.equal(p.y,140);
});

test('crossing a checkpoint while jumping still activates it',()=>{
 const w=createWorld(makeTestCourse());w.player.x=698;w.player.y=250;w.player.vx=410;w.player.vy=0;w.player.grounded=false;
 stepWorld(w,{...idle,axis:1,jumpHeld:true});assert.equal(w.checkpointIndex,1);assert.equal(w.events.filter(e=>e.type==='checkpoint').length,1);
});
