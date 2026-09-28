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
    this.db.exec(readFileSync(new URL('../migrations/0001_schema.sql',import.meta.url),'utf8'));
    this.db.exec(readFileSync(new URL('../migrations/0002_seed.sql',import.meta.url),'utf8'));
  }
  prepare(sql){return new Statement(this.db,sql);}
  async batch(items){this.db.exec('BEGIN');try{const out=items.map(x=>x._run());this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
class R2Obj{
  constructor(value,meta={}){this.value=value;this.body=value;this.httpEtag='"test"';this.meta=meta;}
  writeHttpMetadata(h){if(this.meta.contentType)h.set('content-type',this.meta.contentType);}
  async text(){if(typeof this.value==='string')return this.value;if(this.value instanceof Uint8Array)return new TextDecoder().decode(this.value);return String(this.value??'');}
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
  const headers=new Headers({Origin:origin});if(session)headers.set('Cookie',session);let payload;
  if(body!==undefined){headers.set('Content-Type','application/json');payload=JSON.stringify(body);}
  const res=await worker.fetch(new Request(origin+path,{method,headers,body:payload}),env);
  const data=(res.headers.get('content-type')||'').includes('json')?await res.json():null;
  return {res,data};
}

test('member can register email, sign in by email, request recovery and be reset by admin',async()=>{
  const env={DB:new D1(),MEDIA:new R2(),SETUP_SECRET:'setup-secret',ASSETS:{fetch:()=>new Response('asset')}};
  let x=await call(env,'/api/setup',{method:'POST',body:{setupSecret:'setup-secret',admin:{username:'bear',displayName:'Zach',password:'bear-pass-123'},member:{username:'duck',displayName:'Guannan',password:'duck-pass-123'}}});
  assert.equal(x.res.status,201);

  x=await call(env,'/api/auth/login',{method:'POST',body:{username:'duck',password:'duck-pass-123'}});assert.equal(x.res.status,200);const memberCookie=cookie(x.res);
  x=await call(env,'/api/bootstrap',{cookie:memberCookie});const memberId=x.data.user.id;assert.equal(x.data.accountSecurity.emailRegistered,false);

  x=await call(env,'/api/account/email',{method:'POST',cookie:memberCookie,body:{email:'Guannan@example.com',currentPassword:'duck-pass-123'}});
  assert.equal(x.res.status,200);assert.equal(x.data.accountSecurity.email,'Guannan@example.com');

  x=await call(env,'/api/auth/login',{method:'POST',body:{username:'guannan@example.com',password:'duck-pass-123'}});
  assert.equal(x.res.status,200);

  x=await call(env,'/api/auth/recovery/request',{method:'POST',body:{email:'guannan@example.com'}});
  assert.equal(x.res.status,200);assert.match(x.data.message,/If that email is registered/);
  const unknown=await call(env,'/api/auth/recovery/request',{method:'POST',body:{email:'not-registered@example.com'}});
  assert.equal(unknown.data.message,x.data.message);

  x=await call(env,'/api/auth/login',{method:'POST',body:{username:'bear',password:'bear-pass-123'}});const adminCookie=cookie(x.res);
  x=await call(env,'/api/admin/dashboard',{cookie:adminCookie});
  assert.ok(x.data.admin.recoveryRequests.some(r=>r.user_id===memberId));
  assert.match(x.data.admin.recoveryRequests.find(r=>r.user_id===memberId).email_masked,/@example\.com$/);

  x=await call(env,`/api/admin/users/${memberId}/password`,{method:'POST',cookie:adminCookie,body:{newPassword:'duck-reset-456'}});
  assert.equal(x.res.status,200);
  x=await call(env,'/api/admin/dashboard',{cookie:adminCookie});
  assert.equal(x.data.admin.recoveryRequests.some(r=>r.user_id===memberId),false);

  x=await call(env,'/api/auth/login',{method:'POST',body:{username:'guannan@example.com',password:'duck-reset-456'}});
  assert.equal(x.res.status,200);
});
