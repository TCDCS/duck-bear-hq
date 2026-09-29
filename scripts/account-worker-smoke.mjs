import assert from 'node:assert/strict';
import {authenticator} from '../tests/helpers/passkey-authenticator.mjs';
const base=process.env.ACCOUNT_BASE||'http://localhost:8790';
if(new URL(base).hostname!=='localhost')throw Error('Local fixture only.');
async function call(path,body,cookie){const r=await fetch(base+path,{method:'POST',headers:{Origin:base,'content-type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
let x=await call('/api/auth/login',{username:'hqowner',password:'hq-test-password-123'});assert.equal(x.status,200);const owner=x.cookie;
x=await call('/api/hq/passkeys/register/options',{currentPassword:'hq-test-password-123',name:'Local Worker cryptographic test'},owner);assert.equal(x.status,200,JSON.stringify(x.data));
const a=await authenticator(x.data.options,{origin:base});x=await call('/api/hq/passkeys/register/verify',{requestId:x.data.requestId,response:a.registration},owner);assert.equal(x.status,201,JSON.stringify(x.data));
x=await call('/api/hq/passkeys/login/options',{});assert.equal(x.status,200);const requestId=x.data.requestId,cookie=x.cookie,response=await a.assertion(x.data.options);
x=await call('/api/hq/passkeys/login/verify',{requestId,response},cookie);assert.equal(x.status,200,JSON.stringify(x.data));assert.match(x.cookie,/^db_session=/);
x=await call('/api/hq/passkeys/login/verify',{requestId,response},cookie);assert.equal(x.status,400);
console.log('PASS actual Worker WebAuthn registration, signature verification, session creation and replay denial');
