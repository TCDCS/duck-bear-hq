import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,call} from './helpers/hq-fixture.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
const handler=createHqHandler({fetch:async()=>new Response('legacy')});
test('existing game users can sign in before the original household initialises HQ without gaining private access',async()=>{
 const f=await fixture();try{
  f.env.DB.db.exec("DELETE FROM audit_log WHERE action='setup.complete'");
  const x=await call(handler,f.env,'/api/auth/login',{user:null,method:'POST',body:{username:'guest',password:'test-password-123'}});
  assert.equal(x.status,200,JSON.stringify(x.data));assert.ok(x.response.headers.get('set-cookie')?.startsWith('db_session='));
  assert.equal((await call(handler,f.env,'/api/hq/me',{user:'guest'})).status,503);
  assert.equal((await call(handler,f.env,'/api/bootstrap',{user:'guest'})).status,403);
  assert.equal(f.env.DB.db.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='hq_pair'").get().n,0);
 }finally{f.close();}
});
