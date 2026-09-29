import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,call,guest,imageForm} from './helpers/site-env.mjs';

// These exercise production handlers and real SQLite, not SQL-string matching mocks.
test('site spaces require sign-in; original pair receive private access',async()=>{
 const f=await fixture();let r=await call(f.env,'/api/site/me');assert.equal(r.res.status,401);
 r=await call(f.env,'/api/site/me',{cookie:f.partner});assert.equal(r.res.status,200);assert.equal(r.data.access.scrapbook,2);assert.equal(r.data.access.family,2);assert.equal(r.data.access.admin,false);
 r=await call(f.env,'/api/site/me',{cookie:f.owner});assert.equal(r.data.access.admin,true);
});
test('new users have no implicit private or legacy access; grants separate read from contribution',async()=>{
 const f=await fixture(),g=await guest(f);assert.ok(g.id);assert.ok(g.cookie);
 for(const path of ['/api/site/family/people','/api/site/scrapbook','/api/bootstrap','/api/fun','/api/menus/dashboard'])assert.equal((await call(f.env,path,{cookie:g.cookie})).res.status,403,path);
 assert.equal((await call(f.env,'/api/site/permissions/'+g.id,{method:'PUT',cookie:f.owner,body:{family:1,menus:2}})).res.status,200);
 assert.equal((await call(f.env,'/api/site/family/people',{cookie:g.cookie})).res.status,200);
 assert.equal((await call(f.env,'/api/site/family/people',{method:'POST',cookie:g.cookie,body:{name:'Blocked'}})).res.status,403);
 assert.equal((await call(f.env,'/api/site/recipes',{method:'POST',cookie:g.cookie,body:{title:'Noodles',type:'dinner'}})).res.status,201);
 assert.equal((await call(f.env,'/api/site/scrapbook',{cookie:g.cookie})).res.status,403);
 assert.equal((await call(f.env,'/api/site/permissions/'+g.id,{method:'PUT',cookie:g.cookie,body:{family:2}})).res.status,403);
});
test('users can be edited and deleted without deleting history; owners are protected',async()=>{
 const f=await fixture(),g=await guest(f);let x=await call(f.env,'/api/site/users',{cookie:f.owner});assert.equal(x.res.status,200);
 let u=x.data.users.find(u=>u.id===g.id);
 x=await call(f.env,'/api/site/users/'+g.id,{method:'PATCH',cookie:f.owner,body:{displayName:'Renamed friend',active:false,updatedAt:u.updated_at}});assert.equal(x.res.status,200);
 assert.equal((await call(f.env,'/api/site/me',{cookie:g.cookie})).res.status,401);
 x=await call(f.env,'/api/site/users',{cookie:f.owner});u=x.data.users.find(u=>u.id===g.id);
 assert.equal((await call(f.env,'/api/site/users/'+g.id,{method:'DELETE',cookie:f.owner,body:{updatedAt:u.updated_at}})).res.status,200);
 assert.equal(f.env.DB.sql.prepare('SELECT display_name FROM users WHERE id=?').get(g.id).display_name,'Deleted account');
 assert.equal((await call(f.env,'/api/site/users/'+f.partnerId,{method:'DELETE',cookie:f.owner,body:{}})).res.status,409);
});
test('meal library and independent weekly snapshots support publishing, copying and edit conflicts',async()=>{
 const f=await fixture();let x=await call(f.env,'/api/site/recipes',{method:'POST',cookie:f.partner,body:{title:'Sesame noodles',type:'dinner',ingredients:'Noodles, sesame',description:'Add greens'}});assert.equal(x.res.status,201);const recipe=x.data.record;
 x=await call(f.env,'/api/site/weeks',{method:'POST',cookie:f.partner,body:{weekStart:'2026-10-05',title:'A cosy week',items:[{day:0,type:'dinner',recipeId:recipe.id,title:recipe.title}],status:'draft'}});assert.equal(x.res.status,201);const week=x.data.record;
 x=await call(f.env,'/api/site/weeks/'+week.id,{method:'PUT',cookie:f.partner,body:{...week,revision:week.revision,status:'published'}});assert.equal(x.res.status,200);assert.equal(x.data.record.status,'published');
 assert.equal((await call(f.env,'/api/site/weeks/'+week.id,{method:'PUT',cookie:f.partner,body:{...week,revision:week.revision,status:'draft'}})).res.status,409);
 x=await call(f.env,'/api/site/weeks/'+week.id+'/copy',{method:'POST',cookie:f.partner,body:{weekStart:'2026-10-12'}});assert.equal(x.res.status,201);assert.equal(x.data.record.status,'draft');assert.equal(x.data.record.items[0].title,'Sesame noodles');
 assert.equal((await call(f.env,'/api/site/weeks/'+week.id+'/copy',{method:'POST',cookie:f.partner,body:{weekStart:'2026-10-12'}})).res.status,409);
 assert.equal((await call(f.env,'/api/site/weeks',{method:'POST',cookie:f.partner,body:{weekStart:'2026-02-30',title:'Impossible'}})).res.status,400);
});
test('family graph rejects self-links, reversed partners, cycles and invalid dates',async()=>{
 const f=await fixture();const people=[];for(const name of ['A','B','C']){const x=await call(f.env,'/api/site/family/people',{method:'POST',cookie:f.partner,body:{name}});assert.equal(x.res.status,201);people.push(x.data.record);}
 const link=(from,to,type='parent')=>call(f.env,'/api/site/family/links',{method:'POST',cookie:f.partner,body:{from:people[from].id,to:people[to].id,type}});
 assert.equal((await link(0,0)).res.status,400);assert.equal((await link(0,1)).res.status,201);assert.equal((await link(1,2)).res.status,201);assert.equal((await link(2,0)).res.status,409);
 assert.equal((await link(0,2,'partner')).res.status,201);assert.equal((await link(2,0,'partner')).res.status,409);
 assert.equal((await call(f.env,'/api/site/family/people',{method:'POST',cookie:f.partner,body:{name:'Impossible',birthDate:'2026-02-30'}})).res.status,400);
});
test('private media, scrapbook revision checks and immediate permission revocation',async()=>{
 const f=await fixture(),g=await guest(f);let x=await call(f.env,'/api/site/media',{method:'POST',cookie:f.partner,form:imageForm()});assert.equal(x.res.status,201);const media=x.data.media;
 assert.equal((await call(f.env,media.url)).res.status,401);assert.equal((await call(f.env,media.url,{cookie:g.cookie})).res.status,403);
 x=await call(f.env,media.url,{cookie:f.owner});assert.equal(x.res.status,200);assert.match(x.res.headers.get('cache-control'),/no-store/);
 x=await call(f.env,'/api/site/scrapbook',{method:'POST',cookie:f.partner,body:{title:'A day out',date:'2026-09-29',body:'A memory',mediaId:media.id,tags:['animals'],favourite:true}});assert.equal(x.res.status,201);const memory=x.data.record;
 x=await call(f.env,'/api/site/scrapbook/'+memory.id,{method:'PUT',cookie:f.owner,body:{...memory,body:'An edited memory',revision:1}});assert.equal(x.res.status,200);
 assert.equal((await call(f.env,'/api/site/scrapbook/'+memory.id,{method:'DELETE',cookie:f.owner,body:{revision:1}})).res.status,409);
 x=await call(f.env,'/api/site/media',{method:'POST',cookie:f.partner,form:imageForm('family')});const familyMedia=x.data.media;
 await call(f.env,'/api/site/permissions/'+g.id,{method:'PUT',cookie:f.owner,body:{family:1,menus:0}});assert.equal((await call(f.env,familyMedia.url,{cookie:g.cookie})).res.status,200);
 await call(f.env,'/api/site/permissions/'+g.id,{method:'PUT',cookie:f.owner,body:{family:0,menus:0}});assert.equal((await call(f.env,familyMedia.url,{cookie:g.cookie})).res.status,403);
});
test('uploads cannot disguise HTML or attach another private section to public artwork',async()=>{
 const f=await fixture();let x=await call(f.env,'/api/site/media',{method:'POST',cookie:f.partner,form:imageForm('scrapbook',new TextEncoder().encode('<script>alert(1)</script>'))});assert.equal(x.res.status,415);
 x=await call(f.env,'/api/site/media',{method:'POST',cookie:f.partner,form:imageForm()});const media=x.data.media;
 assert.equal((await call(f.env,'/api/site/artwork/home',{method:'PUT',cookie:f.owner,body:{mediaId:media.id,alt:'private',publishPublic:true}})).res.status,400);
 x=await call(f.env,'/api/site/media',{method:'POST',cookie:f.owner,form:imageForm('artwork')});const art=x.data.media;
 assert.equal((await call(f.env,art.url)).res.status,401);
 assert.equal((await call(f.env,'/api/site/artwork/home',{method:'PUT',cookie:f.owner,body:{mediaId:art.id,alt:'Our welcome'}})).res.status,400);
 assert.equal((await call(f.env,'/api/site/artwork/home',{method:'PUT',cookie:f.owner,body:{mediaId:art.id,alt:'Our welcome',publishPublic:true}})).res.status,200);
 assert.equal((await call(f.env,art.url)).res.status,200);
});
test('cross-origin mutation and privilege fields are rejected',async()=>{
 const f=await fixture();assert.equal((await call(f.env,'/api/site/recipes',{method:'POST',cookie:f.partner,body:{title:'x',type:'dinner'},requestOrigin:'https://evil.test'})).res.status,403);
 assert.equal((await call(f.env,'/api/site/users',{method:'POST',cookie:f.owner,body:{username:'rogue',displayName:'Rogue',password:'very-long-password',role:'admin'}})).res.status,400);
});
test('readers cannot see drafts, upload, or mutate people; deleting people removes their links',async()=>{
 const f=await fixture(),g=await guest(f);
 await call(f.env,'/api/site/permissions/'+g.id,{method:'PUT',cookie:f.owner,body:{family:1,menus:1}});
 let x=await call(f.env,'/api/site/weeks',{method:'POST',cookie:f.partner,body:{title:'Private draft',weekStart:'2026-11-02',items:[]}});const week=x.data.record;
 assert.equal((await call(f.env,'/api/site/weeks/'+week.id,{cookie:g.cookie})).res.status,404);
 assert.equal((await call(f.env,'/api/site/weeks',{cookie:g.cookie})).data.records.length,0);
 assert.equal((await call(f.env,'/api/site/media',{method:'POST',cookie:g.cookie,form:imageForm('family')})).res.status,403);
 x=await call(f.env,'/api/site/family/people',{method:'POST',cookie:f.partner,body:{name:'Parent'}});const parent=x.data.record;
 x=await call(f.env,'/api/site/family/people',{method:'POST',cookie:f.partner,body:{name:'Child'}});const child=x.data.record;
 await call(f.env,'/api/site/family/links',{method:'POST',cookie:f.partner,body:{from:parent.id,to:child.id,type:'parent'}});
 assert.equal((await call(f.env,'/api/site/family/people/'+parent.id,{method:'DELETE',cookie:g.cookie,body:{revision:1}})).res.status,403);
 assert.equal((await call(f.env,'/api/site/family/people/'+parent.id,{method:'DELETE',cookie:f.partner,body:{revision:1}})).res.status,200);
 assert.equal((await call(f.env,'/api/site/family/links',{cookie:f.partner})).data.links.length,0);
 assert.equal((await call(f.env,'/api/site/family/people/'+child.id,{cookie:f.partner})).res.status,200);
});
test('inactive and deleted users cannot fetch private or legacy media; stale account edits cannot revoke current sessions',async()=>{
 const f=await fixture(),g=await guest(f);const u=(await call(f.env,'/api/site/users',{cookie:f.owner})).data.users.find(u=>u.id===g.id);
 let x=await call(f.env,'/api/site/media',{method:'POST',cookie:f.partner,form:imageForm('family')});const url=x.data.media.url;
 await call(f.env,'/api/site/permissions/'+g.id,{method:'PUT',cookie:f.owner,body:{family:1,menus:0}});
 await call(f.env,'/api/site/users/'+g.id,{method:'PATCH',cookie:f.owner,body:{displayName:'Updated',updatedAt:u.updated_at}});
 assert.equal((await call(f.env,'/api/site/users/'+g.id,{method:'PATCH',cookie:f.owner,body:{active:false,updatedAt:u.updated_at}})).res.status,409);
 assert.equal((await call(f.env,'/api/site/me',{cookie:g.cookie})).res.status,200);
 f.env.DB.sql.prepare('UPDATE users SET active=0 WHERE id=?').run(g.id);
 assert.equal((await call(f.env,url,{cookie:g.cookie})).res.status,401);
 assert.equal((await call(f.env,'/media/memories/known-image',{cookie:g.cookie})).res.status,401);
});
test('image request bounds and script-bearing titles remain safe data',async()=>{
 const f=await fixture();
 let x=await call(f.env,'/api/site/media',{method:'POST',cookie:f.partner,form:imageForm('family',new Uint8Array(8*1024*1024+1))});assert.equal(x.res.status,413);
 x=await call(f.env,'/api/site/recipes',{method:'POST',cookie:f.partner,body:{title:'<script>alert(1)</script>',type:'dinner'}});assert.equal(x.res.status,201);assert.equal(x.data.record.title,'<script>alert(1)</script>');assert.match(x.res.headers.get('content-type'),/application\/json/);
});
