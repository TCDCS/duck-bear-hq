import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../src/index.js';

class Statement{
  constructor(db,sql){this.db=db;this.sql=sql;this.values=[];}
  bind(...values){this.values=values;return this;}
  first(){return Promise.resolve(this.db.prepare(this.sql).get(...this.values)??null);}
  all(){return Promise.resolve({results:this.db.prepare(this.sql).all(...this.values)});}
  run(){const r=this.db.prepare(this.sql).run(...this.values);return Promise.resolve({success:true,meta:{changes:Number(r.changes||0)}});}
  _run(){const r=this.db.prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(r.changes||0)}};}
}
class D1{
  constructor(){
    this.db=new DatabaseSync(':memory:');
    for(const name of ['0001_schema.sql','0002_seed.sql','0003_mango_profiles.sql']){
      this.db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
    }
  }
  prepare(sql){return new Statement(this.db,sql);}
  async batch(items){this.db.exec('BEGIN');try{const out=items.map(x=>x._run());this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
class R2Obj{
  constructor(value,meta={}){this.value=value;this.body=value;this.meta=meta;this.httpEtag='"test"';}
  async text(){return typeof this.value==='string'?this.value:new TextDecoder().decode(this.value);}
  writeHttpMetadata(headers){if(this.meta.contentType)headers.set('content-type',this.meta.contentType);}
}
class R2{
  constructor(){this.map=new Map();}
  async get(k){return this.map.get(k)||null;}
  async put(k,v,opts={}){this.map.set(k,new R2Obj(v,opts.httpMetadata||{}));}
  async delete(k){this.map.delete(k);}
}
const origin='https://duck-bear.test';
function cookie(res){return (res.headers.get('set-cookie')||'').split(';')[0];}
async function call(env,path,{method='GET',body,cookie:session}={}){
  const headers=new Headers({Origin:origin});
  if(session)headers.set('Cookie',session);
  let payload;
  if(body!==undefined){headers.set('Content-Type','application/json');payload=JSON.stringify(body);}
  const res=await worker.fetch(new Request(origin+path,{method,headers,body:payload}),env);
  const type=res.headers.get('content-type')||'';
  const data=type.includes('json')?await res.json():null;
  return {res,data};
}

test('private Home bootstraps its schema when migration 0004 is not yet applied',async()=>{
  const env={DB:new D1(),MEDIA:new R2(),SETUP_SECRET:'setup-secret',ASSETS:{fetch:()=>new Response('asset')}};
  let x=await call(env,'/api/setup',{method:'POST',body:{setupSecret:'setup-secret',admin:{username:'bear',displayName:'Zach',password:'bear-pass-123'},member:{username:'duck',displayName:'Guannan',password:'duck-pass-123'}}});
  assert.equal(x.res.status,201);

  x=await call(env,'/api/auth/login',{method:'POST',body:{username:'bear',password:'bear-pass-123'}});
  assert.equal(x.res.status,200);
  const adminCookie=cookie(x.res);

  assert.equal(env.DB.db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name='hub_permissions'").get().n,0);
  x=await call(env,'/api/hub',{cookie:adminCookie});
  assert.equal(x.res.status,200);
  assert.equal(x.data.build,'6.2.0');

  for(const table of ['hub_permissions','family_people','family_relations','scrapbook_items','menu_library','weekly_menus','weekly_menu_items','hub_info_pages','hub_board_items','hub_board_votes']){
    assert.equal(env.DB.db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name=?").get(table).n,1,table);
  }

  x=await call(env,'/api/hub/users',{cookie:adminCookie});
  const guannan=x.data.users.find(u=>u.username==='duck');
  const zach=x.data.users.find(u=>u.username==='bear');
  assert.deepEqual(guannan.permissions,{familyTree:'contribute',scrapbook:'contribute',menus:'contribute'});
  assert.deepEqual(zach.permissions,{familyTree:'admin',scrapbook:'admin',menus:'admin'});
});

test('new members start private and demoted admins lose private admin level',async()=>{
  const env={DB:new D1(),MEDIA:new R2(),SETUP_SECRET:'setup-secret',ASSETS:{fetch:()=>new Response('asset')}};
  await call(env,'/api/setup',{method:'POST',body:{setupSecret:'setup-secret',admin:{username:'bear',displayName:'Zach',password:'bear-pass-123'},member:{username:'duck',displayName:'Guannan',password:'duck-pass-123'}}});
  let x=await call(env,'/api/auth/login',{method:'POST',body:{username:'bear',password:'bear-pass-123'}});
  const adminCookie=cookie(x.res);
  await call(env,'/api/hub',{cookie:adminCookie});

  x=await call(env,'/api/hub/users',{method:'POST',cookie:adminCookie,body:{username:'guest',displayName:'Guest',role:'member',password:'guest-pass-123'}});
  assert.equal(x.res.status,201);
  const guestId=x.data.id;
  x=await call(env,'/api/hub/users',{cookie:adminCookie});
  const guest=x.data.users.find(u=>u.id===guestId);
  assert.deepEqual(guest.permissions,{familyTree:'none',scrapbook:'none',menus:'none'});

  x=await call(env,'/api/hub/users',{method:'POST',cookie:adminCookie,body:{username:'helperadmin',displayName:'Helper Admin',role:'admin',password:'helper-pass-123'}});
  assert.equal(x.res.status,201);
  const helperId=x.data.id;
  x=await call(env,'/api/hub/users/'+encodeURIComponent(helperId),{method:'PUT',cookie:adminCookie,body:{username:'helperadmin',displayName:'Helper Admin',role:'member',active:true}});
  assert.equal(x.res.status,200);
  x=await call(env,'/api/hub/users',{cookie:adminCookie});
  const helper=x.data.users.find(u=>u.id===helperId);
  assert.equal(helper.role,'member');
  assert.deepEqual(helper.permissions,{familyTree:'contribute',scrapbook:'contribute',menus:'contribute'});
});


test('private Info and shared board work after runtime schema bootstrap',async()=>{
  const env={DB:new D1(),MEDIA:new R2(),SETUP_SECRET:'setup-secret',ASSETS:{fetch:()=>new Response('asset')}};
  await call(env,'/api/setup',{method:'POST',body:{setupSecret:'setup-secret',admin:{username:'bear',displayName:'Zach',password:'bear-pass-123'},member:{username:'duck',displayName:'Guannan',password:'duck-pass-123'}}});
  let x=await call(env,'/api/auth/login',{method:'POST',body:{username:'bear',password:'bear-pass-123'}});const adminCookie=cookie(x.res);
  x=await call(env,'/api/hub/info',{cookie:adminCookie});assert.equal(x.res.status,200);assert.ok(x.data.pages.some(p=>p.slug==='allergies-hand-wash'));
  x=await call(env,'/api/hub/info',{method:'POST',cookie:adminCookie,body:{title:'Packing list',category:'Travel',summary:'Things to remember',body:'Passport\nChargers'}});assert.equal(x.res.status,200);assert.ok(x.data.pages.some(p=>p.title==='Packing list'));
  x=await call(env,'/api/hub/board',{method:'POST',cookie:adminCookie,body:{kind:'decision',title:'Weekend',body:'Which day?',options:'Saturday\nSunday'}});assert.equal(x.res.status,200);const id=x.data.items.find(i=>i.title==='Weekend').id;
  x=await call(env,'/api/hub/board/'+encodeURIComponent(id)+'/vote',{method:'POST',cookie:adminCookie,body:{choice:'Saturday'}});assert.equal(x.res.status,200);assert.equal(x.data.items.find(i=>i.id===id).myVote,'Saturday');
});
