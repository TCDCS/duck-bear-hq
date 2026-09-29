import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,call} from './helpers/hq-fixture.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
import {resolveRoute} from '../public/hq/routes.mjs';
const h=createHqHandler({fetch:async()=>new Response('legacy')});
test('household identity follows the original setup audit after account-role changes',async()=>{
 const f=await fixture();try{
  f.env.DB.db.exec("UPDATE users SET role='member' WHERE id='owner'; UPDATE users SET role='admin' WHERE id IN ('partner','guest')");
  const owner=await call(h,f.env,'/api/hq/me');assert.equal(owner.status,200);assert.equal(owner.data.owner,true);
  const partner=await call(h,f.env,'/api/hq/me',{user:'partner'});assert.equal(partner.status,200);assert.equal(partner.data.pair,true);
  assert.equal((await call(h,f.env,'/api/hq/records?kind=memory',{user:'guest'})).status,403);
  assert.equal((await call(h,f.env,'/api/hq/admin/users',{user:'guest'})).status,403);
 }finally{f.close();}
});
test('old private Home subsection bookmarks resolve to the corresponding real pages',()=>{
 const routes={'menus/library':'/menus/ideas/','menus/week':'/menus/planner/','menus/history':'/menus/planner/','scrapbook/timeline':'/scrapbook/memories/','scrapbook/add':'/scrapbook/memories/new/','family/tree':'/family-tree/tree/','family/people':'/family-tree/people/','family/relationships':'/family-tree/relationships/','settings/profile':'/settings/profile/','settings/security':'/settings/security/','settings/appearance':'/settings/appearance/','settings/privacy':'/settings/data/','admin/users':'/admin/users/','admin/permissions':'/admin/permissions/'};
 for(const [old,path]of Object.entries(routes))assert.deepEqual(resolveRoute('/hub/','#'+old),{view:'redirect',path},old);
 assert.equal(resolveRoute('/hub/','#unknown').path,'/our-space/');
 assert.equal(resolveRoute('/info/allergies/','#family').path,'/info/pages/info-allergies/');
});
