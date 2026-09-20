import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
const u=new URL('../public/games/last-luas/inked/projection.mjs',import.meta.url);
test('one shared perspective owns all depth conversions',()=>assert.ok(existsSync(u),'Missing inked projection'));
if(existsSync(u)){const {project,viewFor}=await import(u);for(const [w,h]of [[1920,1080],[390,844],[844,390]]){
 test(`projection keeps all three footpoints visible at ${w}x${h}`,()=>{const v=viewFor(w,h);for(const x of [-2.4,0,2.4]){const p=project(x,0,0,v);assert.ok(p.x>0&&p.x<w);assert.ok(p.y>h*.5&&p.y<h*.95);}assert.equal(project(0,0,-8,v),null);});
 test(`depth shrinks monotonically at ${w}x${h}`,()=>{const v=viewFor(w,h),a=project(2,0,2,v),b=project(2,0,20,v);assert.ok(a.scale>b.scale);assert.ok(a.x>b.x);assert.ok(a.y>b.y);assert.ok(project(0,1,0,v).y<project(0,0,0,v).y);});}}
test('facade columns preserve source orientation and straight cornices on either side',async()=>{
 const mod=await import(u);assert.equal(typeof mod.facadeSlices,'function','Projective column sampler is required');
 for(const side of [-1,1]){const v=mod.viewFor(1440,900),f={s:16,w:14,h:14,side};const cols=mod.facadeSlices(f,0,v);assert.ok(cols.length>20);let prev=-1;
 for(const col of cols){assert.ok(col.u>=prev-1e-9);prev=col.u;assert.ok(col.u>=0&&col.u+col.uw<=1.00001);assert.ok(col.h>0&&col.w<=2);}
 const a=cols[0],b=cols.at(-1),slope=(b.y-a.y)/(b.x-a.x);for(const col of cols)assert.ok(Math.abs(col.y-a.y-slope*(col.x-a.x))<.0001,'cornice must remain a straight line');
 }
});
