import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,call} from './helpers/hq-fixture.mjs';
import {authenticator} from './helpers/passkey-authenticator.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
const h=createHqHandler({fetch:async()=>new Response('legacy')});
const MAIN='https://guannan.party',LEGACY='https://duck-bear-hq.zachary-chambers2.workers.dev',pwd='test-password-123';
async function request(env,origin,path,data={},cookie='db_session=owner-token'){
 const r=await h.fetch(new Request(origin+path,{method:'POST',headers:{'content-type':'application/json',origin,cookie},body:JSON.stringify(data)}),env,{});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
async function start(){const f=await fixture();await call(h,f.env,'/api/hq/me');delete f.env.SITE_ORIGIN;return f;}
test('guannan.party is the production passkey origin and completes a real registration and sign-in',async()=>{
 const f=await start();try{
 const o=await request(f.env,MAIN,'/api/hq/passkeys/register/options',{currentPassword:pwd,name:'My phone'});
 assert.equal(o.status,200,JSON.stringify(o.data));assert.equal(o.data.options.rp.id,'guannan.party');
 const a=await authenticator(o.data.options,{origin:MAIN});
 assert.equal((await request(f.env,MAIN,'/api/hq/passkeys/register/verify',{requestId:o.data.requestId,response:a.registration})).status,201);
 const c=await request(f.env,MAIN,'/api/hq/passkeys/login/options',{},'');assert.equal(c.status,200);
 const v=await request(f.env,MAIN,'/api/hq/passkeys/login/verify',{requestId:c.data.requestId,response:await a.assertion(c.data.options)},c.cookie);
 assert.equal(v.status,200,JSON.stringify(v.data));assert.match(v.cookie,/^db_session=/);
 }finally{f.close();}
});
test('only the explicitly configured legacy address remains usable; arbitrary and lookalike hosts fail closed',async()=>{
 const f=await start();try{
 f.env.SITE_ORIGIN=MAIN;f.env.PASSKEY_LEGACY_ORIGIN=LEGACY;
 const o=await request(f.env,LEGACY,'/api/hq/passkeys/register/options',{currentPassword:pwd,name:'Existing address'});
 assert.equal(o.status,200,JSON.stringify(o.data));assert.equal(o.data.options.rp.id,new URL(LEGACY).hostname);
 const a=await authenticator(o.data.options,{origin:LEGACY});assert.equal((await request(f.env,LEGACY,'/api/hq/passkeys/register/verify',{requestId:o.data.requestId,response:a.registration})).status,201);
 const c=await request(f.env,LEGACY,'/api/hq/passkeys/login/options',{},'');
 assert.equal((await request(f.env,LEGACY,'/api/hq/passkeys/login/verify',{requestId:c.data.requestId,response:await a.assertion(c.data.options)},c.cookie)).status,200);
 for(const origin of ['https://guannan.party.evil.example','https://evil.example','http://guannan.party','https://www.guannan.party'])assert.equal((await request(f.env,origin,'/api/hq/passkeys/login/options',{},'')).status,403,origin);
 delete f.env.PASSKEY_LEGACY_ORIGIN;
 assert.equal((await request(f.env,LEGACY,'/api/hq/passkeys/login/options',{},'')).status,403);
 }finally{f.close();}
});
test('registration from an allowed legacy host cannot be completed on the main domain',async()=>{
 const f=await start();try{
 f.env.PASSKEY_LEGACY_ORIGIN=LEGACY;
 const o=await request(f.env,LEGACY,'/api/hq/passkeys/register/options',{currentPassword:pwd,name:'Legacy'});
 assert.equal(o.status,200);const a=await authenticator(o.data.options,{origin:LEGACY});
 assert.equal((await request(f.env,MAIN,'/api/hq/passkeys/register/verify',{requestId:o.data.requestId,response:a.registration})).status,400);
 }finally{f.close();}
});
test('owner-issued invitation links use guannan.party, never the infrastructure address',async()=>{
 const f=await start();try{
 const x=await call(h,f.env,'/api/hq/admin/users',{method:'POST',body:{username:'newrelative',displayName:'New relative',email:'relative@example.test'}});
 assert.equal(x.status,201,JSON.stringify(x.data));assert.ok(JSON.stringify(x.data).includes(MAIN+'/accept-invitation/'));assert.ok(!JSON.stringify(x.data).includes('workers.dev'));
 }finally{f.close();}
});
