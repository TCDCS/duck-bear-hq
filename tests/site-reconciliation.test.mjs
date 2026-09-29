import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,call} from './helpers/hq-fixture.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
import {resolveRoute} from '../public/hq/routes.mjs';
const h=createHqHandler({fetch:async()=>new Response('legacy')});
async function seeded(){
 const f=await fixture();const db=f.env.DB.db;
 db.exec(readFileSync(new URL('../migrations/0004_private_home.sql',import.meta.url),'utf8'));
 const stamp='2026-09-29T09:00:00.000Z';
 db.prepare('INSERT INTO family_people(id,name,relation_label,branch,birth_date,notes,photo_key,photo_name,photo_type,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('p1','Fixture ancestor','Grandparent','Guannan','1960-02-20','Preserved notes','hub/family/p1/photo.png','portrait.png','image/png','partner',stamp,stamp);
 db.prepare('INSERT INTO family_people(id,name,created_by,created_at,updated_at) VALUES(?,?,?,?,?)').run('p2','Fixture child','owner',stamp,stamp);
 db.prepare('INSERT INTO family_relations VALUES(?,?,?,?,?,?,?)').run('r1','p1','p2','parent','Parent link','partner',stamp);
 db.prepare('INSERT INTO scrapbook_items(id,title,body,happened_on,mood,media_key,media_name,media_type,media_size,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('s1','Saved Home memory','Keep this story','2026-09-27','💚','hub/scrapbook/s1/photo.png','memory.png','image/png',4,'partner',stamp,stamp);
 db.prepare('INSERT INTO menu_library(id,title,description,cuisine,tags_json,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run('m1','Home noodles','Saved idea','Chinese','["favourite"]','partner',stamp,stamp);
 db.prepare('INSERT INTO weekly_menus VALUES(?,?,?,?,?,?,?)').run('w1','2026-09-28','Live weekly planner','Keep weekly notes','owner',stamp,stamp);
 db.prepare('INSERT INTO weekly_menu_items VALUES(?,?,?,?,?,?,?,?,?)').run('wi1','w1','Tue','Dinner','m1','','Keep meal notes',10,stamp);
 // Only a deliberate owner change constitutes a grant; the old migration granted all accounts by default.
 db.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?,?)').run('grant','owner','hub.permissions_update','user','guest','{"family":"read","scrapbook":"contribute","menus":"read"}',stamp);
 db.prepare("UPDATE hub_permissions SET family_tree_level='read',scrapbook_level='contribute',menus_level='read' WHERE user_id='guest'").run();
 await f.env.MEDIA.put('hub/family/p1/photo.png',new Uint8Array([1,2,3,4]),{httpMetadata:{contentType:'image/png'}});
 await f.env.MEDIA.put('hub/scrapbook/s1/photo.png',new Uint8Array([5,6,7,8]),{httpMetadata:{contentType:'image/png'}});
 return f;
}
test('live Home records, authors, private media and draft weeks migrate once without replacing the published menu',async()=>{
 const f=await seeded();try{
  let x=await call(h,f.env,'/api/hq/me');assert.equal(x.status,200,JSON.stringify(x.data));
  const people=(await call(h,f.env,'/api/hq/records?kind=person')).data.records;
  assert.equal(people.length,2);const p=people.find(p=>p.data.name==='Fixture ancestor');assert.equal(p.creatorId,'partner');assert.equal(p.data.branch,'Guannan');assert.equal(p.data.relationLabel,'Grandparent');assert.equal(p.data.photos.length,1);
  let media=await call(h,f.env,`/api/hq/assets/${p.data.photos[0].assetId}/content?original=1`);assert.equal(media.status,200);
  assert.equal((await call(h,f.env,`/api/hq/assets/${p.data.photos[0].assetId}/content?original=1`,{user:null})).status,401);
  const weeks=(await call(h,f.env,'/api/hq/records?kind=week')).data.records;assert.equal(weeks.filter(w=>w.data.start==='2026-09-28').length,2);
  const draft=weeks.find(w=>w.data.title==='Live weekly planner');assert.equal(draft.data.status,'draft');assert.equal(draft.data.notes,'Keep weekly notes');
  const serving=(await call(h,f.env,`/api/hq/records?kind=serving&parent=${draft.id}`)).data.records[0];assert.equal(serving.data.date,'2026-09-29');assert.equal(serving.data.title,'Home noodles');assert.ok(serving.data.description.includes('Keep meal notes'));
  assert.equal((await call(h,f.env,'/api/public/hq/menus/2026-09-28',{user:null})).status,200);
  assert.equal((await call(h,f.env,`/api/hq/weeks/${draft.id}/publish`,{method:'POST',body:{revision:draft.revision}})).status,409);
  const count=f.env.DB.db.prepare('SELECT COUNT(*) n FROM hq_records').get().n;await call(h,f.env,'/api/hq/me');assert.equal(f.env.DB.db.prepare('SELECT COUNT(*) n FROM hq_records').get().n,count);
  assert.equal(f.env.DB.db.prepare('SELECT COUNT(*) n FROM family_people').get().n,2);assert.equal((await f.env.MEDIA.get('hub/scrapbook/s1/photo.png')).size,4);
 }finally{f.close();}
});
test('deliberate family grants survive; the scrapbook stays pair-only and old APIs cannot fork the migrated data',async()=>{
 const f=await seeded();try{
  await call(h,f.env,'/api/hq/me');assert.equal((await call(h,f.env,'/api/hq/records?kind=person',{user:'guest'})).status,200);
  assert.equal((await call(h,f.env,'/api/hq/records?kind=memory',{user:'guest'})).status,403);
  assert.equal((await call(h,f.env,'/api/hq/access/scrapbook/guest',{method:'PUT',body:{role:'contribute'}})).status,403);
  assert.equal((await call(h,f.env,'/api/hub/family',{method:'POST',body:{name:'Do not fork'}})).status,409);
 }finally{f.close();}
});
test('old blanket grants are not silently carried into the private tree',async()=>{const f=await seeded();try{f.env.DB.db.exec("DELETE FROM audit_log WHERE id='grant'");await call(h,f.env,'/api/hq/me');assert.equal((await call(h,f.env,'/api/hq/records?kind=person',{user:'guest'})).status,403);}finally{f.close();}});
test('Info library has persistent editable pages, signed-in reading, revision checks and no guest edits',async()=>{
 const f=await fixture();try{
  await call(h,f.env,'/api/hq/me');let x=await call(h,f.env,'/api/hq/records',{method:'POST',body:{kind:'info',data:{title:'Useful note',category:'Home',summary:'Short description',text:'Remember this safely <script>bad()</script>',tags:['useful']}}});assert.equal(x.status,201,JSON.stringify(x.data));
  const r=x.data.record;assert.equal((await call(h,f.env,`/api/hq/records/${r.id}`,{user:'guest'})).status,200);
  assert.equal((await call(h,f.env,`/api/hq/records/${r.id}`,{user:null})).status,401);
  assert.equal((await call(h,f.env,`/api/hq/records/${r.id}`,{method:'PUT',user:'guest',body:{revision:r.revision,data:{...r.data,title:'Changed'}}})).status,403);
  x=await call(h,f.env,`/api/hq/records/${r.id}`,{method:'PUT',user:'partner',body:{revision:r.revision,data:{...r.data,title:'Updated useful note'}}});assert.equal(x.status,200);
  assert.equal((await call(h,f.env,`/api/hq/records/${r.id}`,{method:'PUT',body:{revision:r.revision,data:r.data}})).status,409);
  const seed=await call(h,f.env,'/api/hq/records/info-allergies',{user:'guest'});assert.equal(seed.status,200);assert.match(seed.data.record.data.text,/not.*diagnos|not.*prove/i);
 }finally{f.close();}
});
test('Info and About are protected server-side including direct index.html and nested pages',async()=>{
 const f=await fixture();try{for(const path of ['/info','/info/','/info/index.html','/info/allergies/','/info/pages/new/','/about','/about/','/about/index.html']){const x=await call(h,f.env,path,{user:null});assert.equal(x.status,302,path);assert.match(x.response.headers.get('location'),/^\/sign-in\/\?next=/);assert.match(x.response.headers.get('cache-control'),/no-store/);}
 for(const path of ['/info/','/about/'])assert.equal((await call(h,f.env,path)).status,200,path);
 }finally{f.close();}
});
test('nested Info and legacy Home links resolve to the single editing surface',()=>{
 assert.equal(resolveRoute('/info/').kind,'info');assert.equal(resolveRoute('/info/pages/new/').view,'form');assert.equal(resolveRoute('/info/allergies/').path,'/info/pages/info-allergies/');assert.equal(resolveRoute('/about/').view,'about');assert.equal(resolveRoute('/hub/').path,'/our-space/');assert.equal(resolveRoute('/settings/updates/').view,'setting');
});
test('missing Home attachment aborts the import atomically and leaves the original records intact',async()=>{const f=await seeded();try{await f.env.MEDIA.delete('hub/scrapbook/s1/photo.png');const x=await call(h,f.env,'/api/hq/me');assert.equal(x.status,503);assert.equal(f.env.DB.db.prepare("SELECT COUNT(*) n FROM hq_records WHERE id LIKE 'home-%'").get().n,0);assert.equal(f.env.DB.db.prepare('SELECT COUNT(*) n FROM family_people').get().n,2);}finally{f.close();}});
test('both original household accounts are protected against accidental disable and deletion',async()=>{const f=await fixture();try{await call(h,f.env,'/api/hq/me');for(const who of ['owner','partner']){assert.equal((await call(h,f.env,'/api/hq/admin/users/'+who,{method:'DELETE',body:{currentPassword:'test-password-123',confirm:'DELETE'}})).status,403);assert.equal((await call(h,f.env,'/api/hq/admin/users/'+who,{method:'PUT',body:{active:false,currentPassword:'test-password-123'}})).status,403);}}finally{f.close();}});
test('restored Info references cannot introduce executable URLs',async()=>{const f=await fixture();try{await call(h,f.env,'/api/hq/me');const manifest={format:'duck-bear-hq',version:1,records:[{id:'unsafe-info',kind:'info',section:'library',revision:1,data:{title:'Unsafe link',text:'Saved content',sourceUrl:'javascript:alert(1)'},createdAt:'2026-09-29',updatedAt:'2026-09-29'}],revisions:[],assets:[]};assert.equal((await call(h,f.env,'/api/hq/restore/preview',{method:'POST',body:{manifest}})).status,400);}finally{f.close();}});
test('earlier private Home video attachments remain downloadable and portable through backup restore',async()=>{
 const f=await seeded(),g=await fixture();try{
  const video=new Uint8Array([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);
  f.env.DB.db.prepare("UPDATE scrapbook_items SET media_key='hub/scrapbook/video.mp4',media_type='video/mp4',media_name='memory.mp4',media_size=? WHERE id='s1'").run(video.length);await f.env.MEDIA.put('hub/scrapbook/video.mp4',video,{httpMetadata:{contentType:'video/mp4'}});
  assert.equal((await call(h,f.env,'/api/hq/me')).status,200);
  const memory=(await call(h,f.env,'/api/hq/records?kind=memory')).data.records[0];assert.ok(memory.data.attachmentId);
  assert.equal((await call(h,f.env,`/api/hq/assets/${memory.data.attachmentId}/content?original=1`)).status,200);
  const {readZip}=await import('../public/hq/zip.mjs');const response=await call(h,f.env,'/api/hq/backup?section=scrapbook');const files=readZip(new Uint8Array(await response.response.arrayBuffer()));const manifest=JSON.parse(new TextDecoder().decode(files.get('manifest.json')));
  await call(h,g.env,'/api/hq/me');const preview=await call(h,g.env,'/api/hq/restore/preview',{method:'POST',body:{manifest}});assert.equal(preview.status,200,JSON.stringify(preview.data));
 }finally{f.close();g.close();}
});
