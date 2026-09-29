import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,call} from './helpers/hq-fixture.mjs';
import {authenticator} from './helpers/passkey-authenticator.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
const h=createHqHandler({fetch:async()=>new Response('legacy')});
const pwd='test-password-123',root='/api/hq/passkeys';
const post=(env,path,body,user='owner',headers={})=>call(h,env,path,{method:'POST',body,user,headers});
const start=async()=>{const f=await fixture();await call(h,f.env,'/api/hq/me');return f;};
async function register(env,user='owner',overrides={}){let x=await post(env,root+'/register/options',{currentPassword:pwd,name:'Test phone'},user);assert.equal(x.status,200,JSON.stringify(x.data));const a=await authenticator(x.data.options,overrides);const done=await post(env,root+'/register/verify',{requestId:x.data.requestId,response:a.registration},user);return {a,done,options:x.data};}
async function challenge(env){const x=await post(env,root+'/login/options',{},null);assert.equal(x.status,200,JSON.stringify(x.data));return {...x.data,cookie:x.response.headers.get('set-cookie').split(';')[0]};}
const verify=(env,c,response,cookie=c.cookie)=>post(env,root+'/login/verify',{requestId:c.requestId,response},null,{cookie});
test('passkey registration checks password and saves a real verified public key without exposing it in lists',async()=>{const f=await start();try{
 assert.equal((await post(f.env,root+'/register/options',{currentPassword:'wrong'})).status,403);
 const {a,done}=await register(f.env);assert.equal(done.status,201,JSON.stringify(done.data));
 const x=await call(h,f.env,root);assert.equal(x.status,200);assert.equal(x.data.passkeys[0].id,a.credentialId);assert.ok(!JSON.stringify(x.data).includes('public_key'));
 assert.equal((await call(h,f.env,root,{user:'guest'})).data.passkeys.length,0);
 }finally{f.close();}});
test('passkey login uses a real signature, sets the existing session cookie, and rejects replay',async()=>{const f=await start();try{
 const {a,done}=await register(f.env);assert.equal(done.status,201);const c=await challenge(f.env),response=await a.assertion(c.options);
 const replies=await Promise.all([verify(f.env,c,response),verify(f.env,c,response)]);assert.deepEqual(replies.map(x=>x.status).sort(),[200,400]);
 const x=replies.find(x=>x.status===200),cookie=x.response.headers.get('set-cookie').split(';')[0];assert.match(cookie,/^db_session=/);
 assert.equal((await call(h,f.env,'/api/hq/me',{user:null,headers:{cookie}})).data.user.id,'owner');
 }finally{f.close();}});
test('login challenges require the same browser and expire after five minutes',async()=>{const f=await start();try{
 const {a}=await register(f.env);let c=await challenge(f.env),response=await a.assertion(c.options);
 assert.equal((await verify(f.env,c,response,'')).status,400);assert.equal((await verify(f.env,c,response)).status,200);
 c=await challenge(f.env);f.env.DB.db.prepare('UPDATE hq_passkey_challenges SET expires_at=0').run();assert.equal((await verify(f.env,c,await a.assertion(c.options,{counter:2}))).status,400);
 }finally{f.close();}});
for(const [name,overrides]of [['wrong origin',{origin:'https://evil.example'}],['wrong challenge',{challenge:'wrong'}],['no user verification',{uv:false}]])test('passkey authentication rejects '+name,async()=>{const f=await start();try{
 const {a}=await register(f.env);const c=await challenge(f.env);assert.equal((await verify(f.env,c,await a.assertion(c.options,overrides))).status,400);
 }finally{f.close();}});
test('registration rejects missing user verification and cannot be completed by another user',async()=>{const f=await start();try{
 assert.equal((await register(f.env,'owner',{uv:false})).done.status,400);
 const x=await post(f.env,root+'/register/options',{currentPassword:pwd,name:'My device'});assert.equal(x.status,200);const a=await authenticator(x.data.options);
 assert.equal((await post(f.env,root+'/register/verify',{requestId:x.data.requestId,response:a.registration},'partner')).status,400);
 assert.equal((await post(f.env,root+'/register/verify',{requestId:x.data.requestId,response:a.registration})).status,201);
 }finally{f.close();}});
test('passkey revocation is owner-scoped and an admin password reset revokes the target keys',async()=>{const f=await start();try{
 const {a}=await register(f.env,'partner');
 let x=await call(h,f.env,root+'/'+a.credentialId,{method:'DELETE',user:'guest',body:{currentPassword:pwd}});assert.equal(x.status,404);
 const c=await challenge(f.env);x=await post(f.env,'/api/hq/admin/users/partner/password',{currentPassword:pwd,newPassword:'new-partner-password'});assert.equal(x.status,200);
 assert.equal((await verify(f.env,c,await a.assertion(c.options))).status,400);
 }finally{f.close();}});
test('disabled accounts cannot sign in with a valid passkey',async()=>{const f=await start();try{
 const {a}=await register(f.env,'guest');const c=await challenge(f.env);await call(h,f.env,'/api/hq/admin/users/guest',{method:'PUT',body:{active:false,currentPassword:pwd}});
 assert.equal((await verify(f.env,c,await a.assertion(c.options))).status,400);
 }finally{f.close();}});
test('cross-origin passkey options are rejected before any challenge is created',async()=>{const f=await start();try{
 const x=await post(f.env,root+'/login/options',{},null,{origin:'https://evil.example'});assert.equal(x.status,403);
 assert.equal(f.env.DB.db.prepare('SELECT COUNT(*) n FROM hq_passkey_challenges').get().n,0);
 }finally{f.close();}});
test('a tampered signature cannot create a session',async()=>{const f=await start();try{
 const {a}=await register(f.env);const c=await challenge(f.env),response=await a.assertion(c.options);response.response.signature='AA';
 assert.equal((await verify(f.env,c,response)).status,400);
 }finally{f.close();}});
test('revocation between signature verification and commit prevents a new session',async()=>{const f=await start();try{
 const {a}=await register(f.env);const c=await challenge(f.env),response=await a.assertion(c.options),original=f.env.DB.batch.bind(f.env.DB);
 f.env.DB.batch=async statements=>{f.env.DB.db.prepare('DELETE FROM hq_passkeys WHERE credential_id=?').run(a.credentialId);return original(statements);};
 assert.equal((await verify(f.env,c,response)).status,400);
 assert.equal(f.env.DB.db.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='owner'").get().n,1);
 }finally{f.close();}});
test('pending registration is invalid after the password changes',async()=>{const f=await start();try{
 const x=await post(f.env,root+'/register/options',{currentPassword:pwd,name:'Old request'});const a=await authenticator(x.data.options);
 await post(f.env,'/api/account/password',{currentPassword:pwd,newPassword:'changed-self-password'});
 assert.equal((await post(f.env,root+'/register/verify',{requestId:x.data.requestId,response:a.registration})).status,400);
 }finally{f.close();}});
