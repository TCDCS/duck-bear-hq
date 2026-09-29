import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,call} from './helpers/hq-fixture.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
const h=createHqHandler({fetch:async()=>new Response('legacy')});
const password='test-password-123';
const start=async()=>{const f=await fixture();await call(h,f.env,'/api/hq/me');return f;};
const post=(env,path,body,user='owner')=>call(h,env,path,{method:'POST',body,user});
const put=(env,path,body,user='owner')=>call(h,env,path,{method:'PUT',body,user});
test('owner directly creates an active user with a password but no private grants',async()=>{const f=await start();try{
 const b={username:'newperson',displayName:'Test relative',email:'relative@example.test',newPassword:'new-person-password',currentPassword:password};
 assert.equal((await post(f.env,'/api/hq/admin/users/create',b,'guest')).status,403);
 assert.equal((await post(f.env,'/api/hq/admin/users/create',{...b,currentPassword:'wrong'})).status,403);
 let x=await post(f.env,'/api/hq/admin/users/create',b);assert.equal(x.status,201,JSON.stringify(x.data));assert.equal(x.data.user.active,true);
 assert.equal((await post(f.env,'/api/hq/admin/users/create',b)).status,409);
 x=await post(f.env,'/api/auth/login',{username:b.username,password:b.newPassword},null);assert.equal(x.status,200);
 const cookie=x.response.headers.get('set-cookie').split(';')[0];x=await call(h,f.env,'/api/hq/me',{user:null,headers:{cookie}});assert.equal(x.data.access.family.read,false);assert.equal(x.data.access.scrapbook.read,false);
 }finally{f.close();}});
test('owner edits another email and username without falsely verifying the mailbox',async()=>{const f=await start();try{
 let x=await put(f.env,'/api/hq/admin/users/partner/details',{username:'renamed',displayName:'New name',currentPassword:'wrong'});assert.equal(x.status,403);
 x=await put(f.env,'/api/hq/admin/users/partner/details',{username:'renamed',displayName:'New name',currentPassword:password});assert.equal(x.status,200,JSON.stringify(x.data));
 x=await put(f.env,'/api/hq/admin/users/partner/email',{email:'New.Address@example.test',currentPassword:password});assert.equal(x.status,200);assert.equal(x.data.email,'new.address@example.test');assert.equal(x.data.verified,false);
 x=await post(f.env,'/api/auth/login',{username:'new.address@example.test',password},null);assert.equal(x.status,200);
 assert.equal((await put(f.env,'/api/hq/admin/users/guest/email',{email:'new.address@example.test',currentPassword:password})).status,409);
 const users=(await call(h,f.env,'/api/hq/admin/users')).data.users;assert.equal(users.find(u=>u.id==='partner').householdRole,'partner');assert.ok(!JSON.stringify(users).includes('password'));
 }finally{f.close();}});
test('owner password reset revokes target sessions and old recovery links, not the owner session',async()=>{const f=await start();try{
 const old=await post(f.env,'/api/hq/admin/users/partner/reset-link',{currentPassword:password});assert.equal(old.status,200);
 let x=await post(f.env,'/api/hq/admin/users/partner/password',{newPassword:'replacement-password-123',currentPassword:password});assert.equal(x.status,200,JSON.stringify(x.data));
 assert.equal((await call(h,f.env,'/api/hq/me',{user:'partner'})).status,401);assert.equal((await call(h,f.env,'/api/hq/me')).status,200);
 assert.equal((await post(f.env,'/api/auth/login',{username:'partner',password},null)).status,401);
 assert.equal((await post(f.env,'/api/auth/login',{username:'partner',password:'replacement-password-123'},null)).status,200);
 const token=new URL(old.data.url).hash.split('token=')[1];assert.equal((await post(f.env,'/api/auth/recovery/reset',{token,newPassword:'stolen-reset-password'},null)).status,400);
 }finally{f.close();}});
test('owner can adopt their own pending email and edit another users preferences with revision protection',async()=>{const f=await start();try{
 let x=await post(f.env,'/api/account/email',{email:'bear@example.test',currentPassword:password});assert.equal(x.data.delivery,'unconfigured');assert.match(x.data.message,/not configured/i);assert.doesNotMatch(x.data.message,/or failed/);
 x=await put(f.env,'/api/hq/admin/users/owner/email',{email:'bear@example.test',currentPassword:password});assert.equal(x.status,200);
 x=await call(h,f.env,'/api/hq/admin/users/partner/settings');assert.equal(x.status,200);const rev=x.data.revision;
 x=await put(f.env,'/api/hq/admin/users/partner/settings',{revision:rev,data:{theme:'night',language:'en',reducedMotion:true,notifications:false}});assert.equal(x.status,200);
 assert.equal((await put(f.env,'/api/hq/admin/users/partner/settings',{revision:rev,data:{theme:'paper'}})).status,409);
 x=await call(h,f.env,'/api/hq/me',{user:'partner'});assert.equal(x.data.preferences.theme,'night');
 assert.equal((await call(h,f.env,'/api/hq/admin/users/owner/settings',{user:'guest'})).status,403);
 }finally{f.close();}});
test('a conflicting password edit cannot partially revoke another successful change',async()=>{const f=await start();try{
 const before=f.env.DB.db.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='partner'").get().n;
 const original=f.env.DB.batch.bind(f.env.DB);f.env.DB.batch=async statements=>{f.env.DB.db.prepare("UPDATE users SET password_hash='changed-concurrently' WHERE id='partner'").run();return original(statements);};
 const x=await post(f.env,'/api/hq/admin/users/partner/password',{newPassword:'new-other-password',currentPassword:password});assert.equal(x.status,409);
 assert.equal(f.env.DB.db.prepare("SELECT COUNT(*) n FROM sessions WHERE user_id='partner'").get().n,before);
 }finally{f.close();}});
test('an existing HQ database upgrades without losing identities or changing the household pair',async()=>{const f=await start();try{
 await put(f.env,'/api/hq/admin/users/owner/email',{email:'owner-upgrade@example.test',currentPassword:password});
 f.env.DB.db.exec("DROP TABLE hq_passkeys; DROP TABLE hq_passkey_challenges; DELETE FROM hq_meta WHERE key='account-controls-v2';");
 const x=await call(h,f.env,'/api/hq/me');assert.equal(x.status,200);assert.equal(x.data.email.email,'owner-upgrade@example.test');assert.equal(x.data.owner,true);
 assert.ok(f.env.DB.db.prepare("SELECT name FROM sqlite_master WHERE name='hq_passkeys'").get());
 }finally{f.close();}});
test('a provider failure is not labelled as missing configuration',async()=>{const f=await start();try{
 f.env.PASSWORD_RESET_FROM='noreply@example.test';f.env.EMAIL={send:async()=>{throw Error('Provider refused');}};
 const x=await post(f.env,'/api/account/email',{email:'partner@example.test',currentPassword:password},'partner');assert.equal(x.data.delivery,'failed');assert.match(x.data.message,/provider could not send/);assert.doesNotMatch(x.data.message,/not configured/);
 }finally{f.close();}});
