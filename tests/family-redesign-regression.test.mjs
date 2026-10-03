import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../public/hq/routes.mjs';
import {initialTreeViewport} from '../public/hq/family-genealogy.mjs';
test('legacy family entry resolves directly to the new tree without a second redirect',()=>{
 for(const path of ['/hub/','/hub/index.html','/account/','/account.html']){
  const destination=resolveRoute(path,'#family');
  assert.equal(destination.path,'/family-tree/tree/');
  assert.equal(resolveRoute(destination.path).view,'family');
 }
 assert.equal(resolveRoute('/plans/surprise/').view,'plans');
});
test('a readable chart that fits is centred wholly instead of clipping its top ancestor',()=>{
 const layout={width:914,height:692,mode:'ancestors',root:'root',nodes:[{id:'root',x:40,y:392,width:230,height:100}]};
 const v=initialTreeViewport(layout,1120,690);
 assert.ok(v.y>=0);assert.ok(v.y+layout.height*v.scale<=690);
 assert.ok(v.x>=0);assert.ok(v.x+layout.width*v.scale<=1120);
});
