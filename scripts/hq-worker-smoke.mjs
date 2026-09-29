/** Exercises actual local Cloudflare Workers + D1 + R2. Refuses production URLs. */
import assert from 'node:assert/strict';
const base=process.env.HQ_WORKER_BASE||'http://127.0.0.1:8790';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local fixture only.');
async function call(path,{method='GET',body,cookie}={}){
 const r=await fetch(base+path,{method,headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data={raw};}return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
function check(x,status,label){assert.equal(x.status,status,label+': '+JSON.stringify(x.data));console.log('PASS',label);return x;}
check(await call('/api/hq/me'),401,'signed-out private access denied');
check(await call('/api/setup',{method:'POST',body:{setupSecret:'hq-fixture-setup',admin:{username:'hqowner',displayName:'Owner fixture',password:'hq-test-password-123'},member:{username:'hqpartner',displayName:'Partner fixture',password:'hq-test-password-456'}}}),201,'original account setup');
const owner=check(await call('/api/auth/login',{method:'POST',body:{username:'hqowner',password:'hq-test-password-123'}}),200,'owner login initializes actual D1 schema').cookie;
const me=check(await call('/api/hq/me',{cookie:owner}),200,'legacy data import and permissions');assert.equal(me.data.owner,true);assert.equal(me.data.access.family.manage,true);
const person=check(await call('/api/hq/records',{method:'POST',cookie:owner,body:{kind:'person',data:{name:'Local runtime person'}}}),201,'family record and history triggers').data.record;
check(await call('/api/hq/records/'+person.id,{method:'PUT',cookie:owner,body:{revision:0,data:{name:'Stale change'}}}),409,'stale revision rejected by actual D1');
const invited=check(await call('/api/hq/admin/users',{method:'POST',cookie:owner,body:{username:'hqguest',displayName:'Guest fixture',email:'hqguest@example.com'}}),201,'owner invitation with no private grants').data;
const token=new URLSearchParams(new URL(invited.invitation.url).hash.slice(1)).get('token');
check(await call('/api/hq/auth/accept',{method:'POST',body:{token,newPassword:'hq-guest-password-123'}}),200,'single-use invitation activation');
check(await call('/api/hq/auth/accept',{method:'POST',body:{token,newPassword:'another-password-123'}}),400,'invitation cannot be replayed');
const guest=check(await call('/api/auth/login',{method:'POST',body:{username:'hqguest',password:'hq-guest-password-123'}}),200,'invited user login').cookie;
check(await call('/api/hq/records?section=family',{cookie:guest}),403,'new member cannot read family tree');
check(await call('/api/hq/access/family/'+invited.user.id,{method:'PUT',cookie:owner,body:{role:'read'}}),200,'named family read grant');
check(await call('/api/hq/records?section=family',{cookie:guest}),200,'family reader sees permitted records');
check(await call('/api/hq/records',{method:'POST',cookie:guest,body:{kind:'person',data:{name:'Forbidden'}}}),403,'family reader cannot write');
check(await call('/api/hq/records?section=scrapbook',{cookie:guest}),403,'family permission does not open scrapbook');
for(const path of ['/menus/','/menus/archive/','/menus/archive/2026-09-28/'])check(await call(path),200,'preserved public menu route '+path);
check(await call('/games/mango-mayhem/not-a-file.mjs'),404,'unknown game assets remain 404');
console.log('PASS actual Workers runtime, additive D1 schema, permissions, invitation, records and archives');
