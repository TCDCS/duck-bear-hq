import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('a settled reduced-motion lobby reuses its image instead of drawing every frame',()=>{
 const sandbox={};runInNewContext(readFileSync(new URL('../src/kart-assets/renderer.js.txt',import.meta.url),'utf8'),sandbox);
 const renderer=Object.create(sandbox.KartRenderer.prototype);
 Object.assign(renderer,{width:1280,height:800,idleKey:'5:1280:800:0',photoImages:[],resize(){}});
 assert.doesNotThrow(()=>renderer.render({track:{id:5}},1/60,{menu:true,reduced:true}));
});

test('a lobby invalidates the static image when its drivers change',()=>{
 const text=readFileSync(new URL('../src/kart-assets/renderer.js.txt',import.meta.url),'utf8');
 assert.match(text,/setProfiles\(profiles\)\{this.idleKey='';/);
});
