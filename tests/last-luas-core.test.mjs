import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const moduleUrl=new URL('../public/games/last-luas/inked/core.mjs',import.meta.url);
test('inked simulation exists independently of renderer',()=>assert.ok(existsSync(moduleUrl),'Missing pure inked simulation'));
const core=existsSync(moduleUrl)?await import(moduleUrl):null;
const run=(obstacles=[])=>core.createRun(9,obstacles);
const tick=(r,seconds,frame=1/60)=>{for(let t=0;t<seconds-1e-9;t+=frame)core.advance(r,Math.min(frame,seconds-t));};
if(core){
 test('menu does not run timer; play starts and restart resets completely',()=>{const r=run();tick(r,10);assert.equal(r.elapsed,0);core.action(r,'play');tick(r,2);assert.ok(Math.abs(r.elapsed-2)<1e-6);core.action(r,'restart');assert.equal(r.elapsed,0);assert.equal(r.phase,'running');assert.equal(r.hits,0);});
 test('90 seconds with no boarding expires at the same active time at 60 and 10 fps',()=>{for(const dt of [1/60,.1]){const r=run();core.action(r,'play');r.speed=0;tick(r,90,dt);assert.equal(r.phase,'missed');assert.ok(Math.abs(r.elapsed-90)<.002);}});
 test('pause and long stalls do not advance; paused input is discarded',()=>{const r=run();core.action(r,'play');tick(r,1);core.action(r,'pause');const t=r.elapsed;core.action(r,'left');tick(r,10);assert.equal(r.elapsed,t);assert.equal(r.player.lane,1);core.action(r,'resume');core.advance(r,2);assert.equal(r.phase,'paused');assert.equal(r.elapsed,t);});
 test('lane bounds and jump require grounded state',()=>{const r=run();core.action(r,'play');for(let n=0;n<8;n++)core.action(r,'left');tick(r,.5);assert.equal(r.player.lane,0);assert.ok(r.player.x>=-2.4);core.action(r,'jump');tick(r,.15);const v=r.player.vy;core.action(r,'jump');assert.equal(r.player.vy,v);assert.ok(r.player.y>.5);tick(r,1);assert.equal(r.player.y,0);});
 test('airborne below obstacle top still hits, sufficient clearance avoids',()=>{for(const high of [false,true]){const r=run([{id:1,kind:'bollard',s:1,lane:1,width:.42,depth:.4,height:.6,jumpable:true}]);core.action(r,'play');r.player.y=high?1.4:.03;r.player.vy=0;r.player.s=.85;core.advance(r,1/120);assert.equal(r.hits,high?0:1);}});
 test('collision hits the current physical x, once per obstacle',()=>{const r=run([{id:1,kind:'bin',s:2,lane:1,width:.8,depth:.8,height:1.2}]);core.action(r,'play');core.action(r,'right');r.player.x=0;r.player.s=1.9;core.advance(r,1/120);assert.equal(r.hits,1);tick(r,.8);assert.equal(r.hits,1);});
 test('swept motion catches narrow obstacle at low frame rate',()=>{const r=run([{id:1,kind:'bollard',s:2,lane:1,width:.4,depth:.1,height:.6,jumpable:true}]);core.action(r,'play');r.speed=35;core.advance(r,.1);assert.equal(r.hits,1);});
 test('boarding needs correct side, feet down and open doors',()=>{for(const [x,y,t,expected] of [[-2.4,0,70,'boarding'],[0,0,70,'running'],[-2.4,1,70,'running'],[-2.4,0,89,'running']]){const r=run();core.action(r,'play');r.elapsed=t;r.player.s=core.ROUTE_LENGTH-.1;r.player.x=x;r.player.lane=x<0?0:1;r.player.y=y;r.player.vy=0;core.advance(r,.05);assert.equal(r.phase,expected);}});
 test('success is final and replay is clean',()=>{const r=run();core.action(r,'play');r.player.lane=0;r.player.x=-2.4;r.player.s=core.ROUTE_LENGTH-.02;core.advance(r,.1);tick(r,2);assert.equal(r.phase,'won');const t=r.elapsed;tick(r,10);assert.equal(r.elapsed,t);core.action(r,'restart');assert.equal(r.phase,'running');assert.equal(r.player.s,0);assert.equal(r.elapsed,0);});
 test('seeded layout stable, eight hazard families, no fully closed rows',()=>{const a=core.makeObstacles(3),b=core.makeObstacles(3);assert.deepEqual(a,b);assert.equal(new Set(a.map(x=>x.kind)).size,8);for(const o of a){assert.ok(a.filter(x=>Math.abs(x.s-o.s)<3).length<3);assert.ok(o.s>16&&o.s<core.ROUTE_LENGTH-22);}});
}
