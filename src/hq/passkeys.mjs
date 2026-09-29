/** WebAuthn ceremonies. Verification is performed by pinned SimpleWebAuthn, never the client. */
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';
import {body,fail,json,text,token,sha,b64,unb64,now,id,queryAll,rate,sameOrigin,event} from './core.mjs';
import {schemaReady} from './schema.mjs';
import {ensureAccountSchema} from './account-schema.mjs';
import {reauthenticate} from './auth.mjs';
const BASE='/api/hq/passkeys',COOKIE='__Host-db_passkey',TTL=300000;
const DEFAULT_ORIGIN='https://duck-bear-hq.zachary-chambers2.workers.dev';
function relyingParty(env,request){
 let u;try{u=new URL(env.SITE_ORIGIN||DEFAULT_ORIGIN);}catch{fail(503,'Passkey origin needs configuration.');}
 if(u.protocol!=='https:'&&!(u.protocol==='http:'&&u.hostname==='localhost'))fail(503,'Use HTTPS for passkeys.');
 if(u.username||u.password||u.origin!==new URL(request.url).origin)fail(403,'Open the main Duck & Bear address to use this passkey.');
 return {rpID:u.hostname,origin:u.origin};
}
const keyList=(env,uid)=>queryAll(env.DB,'SELECT credential_id AS id,name,created_at AS createdAt,last_used_at AS lastUsedAt,device_type AS deviceType,backed_up AS backedUp FROM hq_passkeys WHERE user_id=? ORDER BY created_at',uid);
function browserCookie(request){const parts=(request.headers.get('cookie')||'').split(';').map(s=>s.trim());const v=parts.find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';return /^[A-Za-z0-9_-]{43}$/.test(v)?v:'';}
const ceremonyCookie=value=>`${COOKIE}=${value}; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Strict`;
async function setup(env){if(!await schemaReady(env))fail(503,'Sign in with your password once before using passkeys.');await ensureAccountSchema(env);}
async function saveChallenge(env,options,purpose,{user=null,session=null,tag=null,binding=null,name=''}={}){
 const requestId=token();await env.DB.batch([
  env.DB.prepare('DELETE FROM hq_passkey_challenges WHERE expires_at<=?').bind(Date.now()),
  env.DB.prepare('INSERT INTO hq_passkey_challenges(id,purpose,challenge,user_id,session_id,credential_tag,binding_hash,name,expires_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(requestId,purpose,options.challenge,user,session,tag,binding,name,Date.now()+TTL)
 ]);return requestId;
}
async function consume(env,requestId,purpose,{user=null,binding=null}={}){
 if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(requestId))fail(400,'Passkey request expired. Please start again.');
 const row=user?await env.DB.prepare('DELETE FROM hq_passkey_challenges WHERE id=? AND purpose=? AND user_id=? AND session_id=? AND credential_tag=? AND expires_at>? RETURNING *').bind(requestId,purpose,user.id,user.session_id,user.password_hash,Date.now()).first():await env.DB.prepare('DELETE FROM hq_passkey_challenges WHERE id=? AND purpose=? AND binding_hash=? AND expires_at>? RETURNING *').bind(requestId,purpose,binding,Date.now()).first();
 if(!row)fail(400,'Passkey request expired or belongs to another browser. Please start again.');return row;
}
export async function publicPasskeys(request,env,url){
 const p=url.pathname;if(![BASE+'/login/options',BASE+'/login/verify'].includes(p))return null;
 if(request.method!=='POST')fail(405,'Use POST.');sameOrigin(request);const rp=relyingParty(env,request);await setup(env);
 await rate(env,'passkey-login:'+(request.headers.get('cf-connecting-ip')||'unknown'),30,600);
 const b=await body(request,32768);
 if(p.endsWith('/options')){
  const options=await generateAuthenticationOptions({rpID:rp.rpID,userVerification:'required',timeout:TTL});
  const secret=token(),requestId=await saveChallenge(env,options,'login',{binding:await sha(secret)});
  return json({options,requestId},200,{'set-cookie':ceremonyCookie(secret)});
 }
 const secret=browserCookie(request);if(!secret)fail(400,'Passkey request belongs to another browser. Please start again.');
 const ceremony=await consume(env,b.requestId,'login',{binding:await sha(secret)}),response=b.response;
 if(!response||typeof response.id!=='string'||response.id.length>2048)fail(400,'Passkey could not be verified.');
 const key=await env.DB.prepare('SELECT p.* FROM hq_passkeys p JOIN users u ON u.id=p.user_id WHERE p.credential_id=? AND u.active=1 AND NOT EXISTS(SELECT 1 FROM hq_removed WHERE user_id=u.id)').bind(response.id).first();
 if(!key||response.response?.userHandle!==b64(new TextEncoder().encode(key.user_id)))fail(400,'Passkey could not be verified. Try your password.');
 let result;try{result=await verifyAuthenticationResponse({response,expectedChallenge:ceremony.challenge,expectedOrigin:rp.origin,expectedRPID:rp.rpID,requireUserVerification:true,credential:{id:key.credential_id,publicKey:unb64(key.public_key),counter:key.counter,transports:JSON.parse(key.transports)}});}catch{fail(400,'Passkey could not be verified. Please start again.');}
 if(!result.verified)fail(400,'Passkey could not be verified.');
 const raw=token(),stamp=now(),sid=id('session'),nonce=token(),next=key.version+1;
 // One transaction: a revoked key or disabled account must never leave a fresh session behind.
 const out=await env.DB.batch([
  env.DB.prepare('UPDATE hq_passkeys SET counter=?,last_used_at=?,version=version+1,last_auth=? WHERE credential_id=? AND version=? AND EXISTS(SELECT 1 FROM users WHERE id=hq_passkeys.user_id AND active=1) AND NOT EXISTS(SELECT 1 FROM hq_removed WHERE user_id=hq_passkeys.user_id)').bind(result.authenticationInfo.newCounter,stamp,nonce,key.credential_id,key.version),
  env.DB.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent,ip_hash) SELECT ?,u.id,?,?,?,?,?,? FROM users u JOIN hq_passkeys p ON p.user_id=u.id WHERE p.credential_id=? AND p.version=? AND p.last_auth=? AND u.active=1 AND NOT EXISTS(SELECT 1 FROM hq_removed WHERE user_id=u.id)').bind(sid,await sha(raw),new Date(Date.now()+30*86400000).toISOString(),stamp,stamp,text(request.headers.get('user-agent')||'',250),await sha(request.headers.get('cf-connecting-ip')||'unknown'),key.credential_id,next,nonce)
 ]);
 if(!out[0].meta.changes||!out[1].meta.changes)fail(400,'The account or passkey changed. Please sign in again.');
 return json({ok:true},200,{'set-cookie':`db_session=${raw}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict`});
}
export async function privatePasskeys(request,env,user,url){
 const p=url.pathname;if(!p.startsWith(BASE))return null;const rp=relyingParty(env,request);const method=request.method;
 if(p===BASE&&method==='GET')return json({passkeys:await keyList(env,user.id),rpID:rp.rpID,max:10});
 if(p===BASE+'/register/options'&&method==='POST'){
  const b=await body(request);await reauthenticate(env,user,b.currentPassword);const name=text(b.name||'My passkey',60,{required:true});
  const keys=await keyList(env,user.id);if(keys.length>=10)fail(400,'Remove an old passkey before adding another. The limit is ten.');
  const options=await generateRegistrationOptions({rpName:'Duck & Bear',rpID:rp.rpID,userID:new TextEncoder().encode(user.id),userName:user.username,userDisplayName:user.display_name,attestationType:'none',timeout:TTL,supportedAlgorithmIDs:[-7,-257],excludeCredentials:keys.map(k=>({id:k.id})),authenticatorSelection:{residentKey:'required',userVerification:'required'}});
  const requestId=await saveChallenge(env,options,'register',{user:user.id,session:user.session_id,tag:user.password_hash,name});return json({options,requestId});
 }
 if(p===BASE+'/register/verify'&&method==='POST'){
  const b=await body(request,32768);const c=await consume(env,b.requestId,'register',{user});let result;
  try{result=await verifyRegistrationResponse({response:b.response,expectedChallenge:c.challenge,expectedOrigin:rp.origin,expectedRPID:rp.rpID,requireUserVerification:true,supportedAlgorithmIDs:[-7,-257]});}catch{fail(400,'The new passkey could not be verified. Please start again.');}
  if(!result.verified||!result.registrationInfo)fail(400,'The new passkey could not be verified.');
  const i=result.registrationInfo,k=i.credential;let out;
  try{out=await env.DB.prepare('INSERT INTO hq_passkeys(credential_id,user_id,public_key,counter,name,transports,device_type,backed_up,created_at) SELECT ?,u.id,?,?,?,?,?,?,? FROM users u JOIN sessions s ON s.user_id=u.id WHERE u.id=? AND u.active=1 AND u.password_hash=? AND s.id=? AND s.expires_at>? AND NOT EXISTS(SELECT 1 FROM hq_removed WHERE user_id=u.id)').bind(k.id,b64(k.publicKey),k.counter,c.name,JSON.stringify((k.transports||[]).filter(t=>['internal','usb','nfc','ble','hybrid','cable','smart-card'].includes(t))),i.credentialDeviceType,i.credentialBackedUp?1:0,now(),user.id,user.password_hash,user.session_id,now()).run();}catch(e){if(/UNIQUE|passkey_limit/i.test(String(e)))fail(409,'This passkey is already registered or the account has ten passkeys.');throw e;}
  if(!out.meta.changes)fail(409,'Your account changed. Sign in and add the passkey again.');await event(env,user,'accounts','passkey-added',user.id);return json({ok:true},201);
 }
 const m=p.match(/^\/api\/hq\/passkeys\/([A-Za-z0-9_-]+)$/);if(m&&['PUT','DELETE'].includes(method)){
  const b=await body(request);await reauthenticate(env,user,b.currentPassword);let out;
  if(method==='PUT')out=await env.DB.prepare('UPDATE hq_passkeys SET name=? WHERE credential_id=? AND user_id=?').bind(text(b.name,60,{required:true}),m[1],user.id).run();
  else out=await env.DB.prepare('DELETE FROM hq_passkeys WHERE credential_id=? AND user_id=?').bind(m[1],user.id).run();
  if(!out.meta.changes)fail(404,'Passkey not found.');
  if(method==='DELETE')await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND id<>?').bind(user.id,user.session_id).run();
  await event(env,user,'accounts',method==='DELETE'?'passkey-removed':'passkey-renamed',user.id);return json({ok:true});
 }
 fail(404,'Passkey action not found.');
}
