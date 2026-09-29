/** Owner administration. Private grants and immutable household membership are separate. */
import {body,fail,json,text,choice,integer,id,now,queryAll,event} from './core.mjs';
import {requireOwner} from './schema.mjs';
import {passwordHash,reauthenticate,normalizeEmail} from './auth.mjs';
import {mailStatus,sendMail} from './email.mjs';
const validPassword=value=>{if(typeof value!=='string'||value.length<12||value.length>128)fail(400,'Use a password between 12 and 128 characters.');return value;};
const username=value=>{const s=text(value,30,{required:true}).toLowerCase();if(!/^[a-z0-9_.-]{3,30}$/.test(s))fail(400,'Use 3–30 letters, numbers, dots, dashes or underscores.');return s;};
const publicUser=u=>({id:u.id,username:u.username,displayName:u.display_name,active:Boolean(u.active)});
async function targetUser(env,uid){const u=await env.DB.prepare('SELECT * FROM users WHERE id=? AND NOT EXISTS(SELECT 1 FROM hq_removed WHERE user_id=users.id)').bind(uid).first();if(!u)fail(404,'User not found.');return u;}
async function availableEmail(env,email,uid=''){if(email&&await env.DB.prepare('SELECT user_id FROM hq_identity WHERE (email=? OR pending_email=?) AND user_id<>?').bind(email,email,uid).first())fail(409,'That email is already in use or pending for another account.');}
function revoked(env,uid,{keys=false,except='',tag=null}={}){
 const guard=tag?' AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)':'';
 const prepare=(sql,args)=>env.DB.prepare(sql+guard).bind(...args,...(tag?[uid,tag]:[]));
 return [prepare('DELETE FROM sessions WHERE user_id=? AND id<>?',[uid,except]),
  prepare("UPDATE hq_tokens SET used='owner-account-change' WHERE user_id=? AND used IS NULL",[uid]),
  prepare('DELETE FROM hq_passkey_challenges WHERE user_id=?',[uid]),
  ...(keys?[prepare('DELETE FROM hq_passkeys WHERE user_id=?',[uid])]:[])];
}
export async function adminAccounts(request,env,actor,url){
 const p=url.pathname,m=p.match(/^\/api\/hq\/admin\/users\/([\w-]+)\/(details|email|password|settings|passkeys)(?:\/([A-Za-z0-9_-]+))?$/);
 if(!m&&!['/api/hq/admin/users/create','/api/hq/admin/email','/api/hq/admin/email/test'].includes(p))return null;
 await requireOwner(env,actor);const method=request.method;
 if(p==='/api/hq/admin/email'&&method==='GET')return json(mailStatus(env));
 if(p==='/api/hq/admin/email/test'&&method==='POST'){
  const b=await body(request);await reauthenticate(env,actor,b.currentPassword);
  const s=mailStatus(env);if(!s.configured)return json({...s,accepted:false},503);
  const i=await env.DB.prepare('SELECT email FROM hq_identity WHERE user_id=?').bind(actor.id).first();if(!i?.email)fail(400,'Save your own email address first.');
  const accepted=await sendMail(env,i.email,'Duck & Bear — email test','This is the email test you requested from your Duck & Bear account.');
  return json({accepted,message:accepted?'The provider accepted the test message. Check your inbox and spam folder.':'The provider rejected or could not send the test message.'},accepted?200:502);
 }
 if(p==='/api/hq/admin/users/create'&&method==='POST'){
  const b=await body(request);await reauthenticate(env,actor,b.currentPassword);
  const name=text(b.displayName,80,{required:true}),login=username(b.username),email=b.email?normalizeEmail(b.email):null;
  await availableEmail(env,email);const h=await passwordHash(validPassword(b.newPassword)),uid=id('user'),stamp=now();
  try{await env.DB.batch([
   env.DB.prepare('INSERT INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)').bind(uid,login,name,'member',h.hash,h.salt,h.iterations,stamp,stamp),
   env.DB.prepare('INSERT INTO hq_identity(user_id,email,verified,updated_at) VALUES(?,?,0,?)').bind(uid,email,stamp)
  ]);}catch(e){if(/UNIQUE/i.test(String(e)))fail(409,'That username or email is already in use.');throw e;}
  await event(env,actor,'accounts','owner-created-user',uid);
  return json({user:publicUser(await targetUser(env,uid)),message:'Account created. No private sections were shared.'},201);
 }
 if(!m)fail(405,'Use the indicated request method.');
 const u=await targetUser(env,m[1]),tab=m[2];
 if(tab==='passkeys'){
  if(method==='GET'&&!m[3])return json({passkeys:await queryAll(env.DB,'SELECT credential_id AS id,name,created_at AS createdAt,last_used_at AS lastUsedAt FROM hq_passkeys WHERE user_id=?',u.id)});
  if(method==='DELETE'&&m[3]){const b=await body(request);await reauthenticate(env,actor,b.currentPassword);const out=await env.DB.prepare('DELETE FROM hq_passkeys WHERE credential_id=? AND user_id=?').bind(m[3],u.id).run();if(!out.meta.changes)fail(404,'Passkey not found.');await env.DB.batch(revoked(env,u.id,{except:u.id===actor.id?actor.session_id:''}));await event(env,actor,'accounts','owner-revoked-passkey',u.id);return json({ok:true});}
  fail(405,'Use GET or DELETE.');
 }
 if(tab==='settings'){
  const row=await env.DB.prepare('SELECT revision,data FROM hq_prefs WHERE user_id=?').bind(u.id).first();
  if(method==='GET')return json({revision:row?.revision||0,preferences:row?JSON.parse(row.data):{}});
  if(method!=='PUT')fail(405,'Use PUT.');const b=await body(request),revision=integer(b.revision,0,1e9,'Revision'),d=b.data||{};
  // Preserve the user's avatar; preference changes never select their private photographs.
  const old=row?JSON.parse(row.data):{},data={...old,theme:choice(d.theme,['paper','night','system'],'paper'),language:choice(d.language,['en','zh'],'en'),reducedMotion:d.reducedMotion===true,notifications:d.notifications!==false};
  let result;try{result=revision===0?await env.DB.prepare('INSERT INTO hq_prefs(user_id,revision,data) VALUES(?,1,?)').bind(u.id,JSON.stringify(data)).run():await env.DB.prepare('UPDATE hq_prefs SET data=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(JSON.stringify(data),u.id,revision).run();}catch(e){if(/UNIQUE/i.test(String(e)))fail(409,'Settings changed. Reload before saving.');throw e;}
  if(!result.meta.changes)fail(409,'Settings changed. Reload before saving.');await event(env,actor,'accounts','owner-updated-settings',u.id);return json({ok:true,revision:revision+1,preferences:data});
 }
 if(!((tab==='password'&&method==='POST')||(['details','email'].includes(tab)&&method==='PUT')))fail(405,'Use the indicated request method.');
 const b=await body(request);await reauthenticate(env,actor,b.currentPassword);const stamp=now();
 if(tab==='details'){
  const name=text(b.displayName,80,{required:true}),login=username(b.username);
  let changed;try{changed=await env.DB.batch([env.DB.prepare('UPDATE users SET display_name=?,username=?,updated_at=? WHERE id=? AND password_hash=?').bind(name,login,stamp,u.id,u.password_hash),...(login!==u.username?revoked(env,u.id,{except:u.id===actor.id?actor.session_id:'',tag:u.password_hash}):[])]);}catch(e){if(/UNIQUE/i.test(String(e)))fail(409,'That username is already in use.');throw e;}
  if(!changed[0].meta.changes)fail(409,'The account changed. Reload before saving.');
  await event(env,actor,'accounts','owner-updated-details',u.id);return json({ok:true,user:{...publicUser(u),username:login,displayName:name}});
 }
 if(tab==='email'){
  const email=normalizeEmail(b.email);await availableEmail(env,email,u.id);
  const existing=await env.DB.prepare('SELECT email,verified FROM hq_identity WHERE user_id=?').bind(u.id).first();
  const verified=existing?.email===email&&existing?.verified===1?1:0;
  try{await env.DB.batch([
   env.DB.prepare('INSERT INTO hq_identity(user_id,email,verified,pending_email,updated_at) VALUES(?,?,?,NULL,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified=excluded.verified,pending_email=NULL,updated_at=excluded.updated_at').bind(u.id,email,verified,stamp),
   ...revoked(env,u.id,{except:u.id===actor.id?actor.session_id:''})
  ]);}catch(e){if(/UNIQUE/i.test(String(e)))fail(409,'That email is already in use.');throw e;}
  await event(env,actor,'accounts','owner-updated-email',u.id);
  return json({ok:true,email,verified:Boolean(verified),message:verified?'Email saved.':'Email saved for sign-in and owner-assisted recovery. Mailbox ownership has not been verified.'});
 }
 const h=await passwordHash(validPassword(b.newPassword));const keys=b.revokePasskeys!==false;
 const out=await env.DB.batch([
  env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=? AND password_hash=?').bind(h.hash,h.salt,h.iterations,stamp,u.id,u.password_hash),
  ...revoked(env,u.id,{keys,tag:h.hash}),env.DB.prepare("UPDATE hq_recovery SET status='resolved' WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)").bind(u.id,u.id,h.hash)
 ]);if(!out[0].meta.changes)fail(409,'The account changed. Reload before setting a password.');
 await event(env,actor,'accounts','owner-reset-password',u.id);
 return json({ok:true,signInAgain:u.id===actor.id,revokedPasskeys:keys,message:'Password set. All sessions and outstanding reset links were revoked.'},200,u.id===actor.id?{'set-cookie':'db_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'}:{});
}
