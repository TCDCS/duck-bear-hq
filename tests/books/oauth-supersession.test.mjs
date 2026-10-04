import test from 'node:test';
import assert from 'node:assert/strict';
import {environment} from './fixtures.mjs';
import {beginOAuth,finishOAuth,connectionStatus} from '../../src/books/google.mjs';
const owner={id:'zachary',session_id:'test-current-session'};
async function start(env){
 const result=await beginOAuth(new Request('https://guannan.party/books/'),env,owner);
 const auth=new URL((await result.json()).authorizationUrl);
 return new Request('https://guannan.party/api/hq/integrations/google-drive/callback?state='+auth.searchParams.get('state')+'&code=fixture',{
  headers:{cookie:result.headers.get('set-cookie').split(';')[0]}
 });
}
test('starting a new Google connection invalidates an older consent window',async()=>{
 const {env}=await environment();try{
  const old=await start(env),current=await start(env);
  await assert.rejects(()=>finishOAuth(old,env,owner),e=>e.code==='invalid_state');
  assert.equal((await finishOAuth(current,env,owner)).status,303);
  assert.equal((await connectionStatus(env)).connected,true);
 }finally{env.DB.close();}
});
test('an old OAuth callback cannot overwrite a replacement flow while Google is responding',async()=>{
 const {env,fetcher}=await environment();let release,entered;
 const gate=new Promise(r=>release=r),waiting=new Promise(r=>entered=r);
 try{
  const old=await start(env);let held=false;
  env.BOOKS_FETCH=async(url,init)=>{if(String(url).endsWith('/token')&&!held){held=true;entered();await gate;}return fetcher(url,init);};
  const pending=finishOAuth(old,env,owner);const settled=pending.then(()=>null,e=>e);
  await waiting;const current=await start(env);release();
  assert.equal((await settled)?.code,'connection_changed');
  assert.equal((await finishOAuth(current,env,owner)).status,303);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM books_oauth_states').first()).n,0);
 }finally{release?.();env.DB.close();}
});
