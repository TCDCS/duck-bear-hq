import {VERSION} from './store.mjs';
import {firstWeek,seedPayload} from './seed.mjs';
const DEFAULT_ORIGIN='https://duck-bear-hq.zachary-chambers2.workers.dev';
const encoder=new TextEncoder();
const uid=()=>crypto.randomUUID();
const now=()=>new Date().toISOString();
export class PortalError extends Error{constructor(status,message){super(message);this.status=status;}}
const check=(ok,status,message)=>{if(!ok)throw new PortalError(status,message);};
const json=(body,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra}});
const b64=bytes=>{let s='';for(const x of new Uint8Array(bytes))s+=String.fromCharCode(x);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');};
const unb64=s=>Uint8Array.from(atob(String(s).replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export const digest=async value=>b64(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export async function passwordHash(password,salt=b64(crypto.getRandomValues(new Uint8Array(16))),iterations=100000){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unb64(salt),iterations},key,256);return {hash:b64(bits),salt,iterations};}
const equal=(a,b)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
const cookie=(token,age=30*86400)=>`db_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${age}`;
const safeUser=u=>({id:u.id,username:u.username,displayName:u.display_name,role:u.role,active:Boolean(u.active)});
const trim=(value,max=160)=>{check(typeof value==='string'&&value.trim().length<=max,400,'Invalid text.');return value.trim();};
const email=value=>{const e=trim(value,254).toLowerCase();check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),400,'Enter a valid email address.');return e;};
const newPassword=value=>{check(typeof value==='string'&&value.length>=12&&value.length<=128,400,'Use a password of 12–128 characters.');return value;};
async function bytes(request,max){const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let length=0;while(true){const r=await reader.read();if(r.done)break;length+=r.value.byteLength;if(length>max){await reader.cancel();throw new PortalError(413,'The upload is too large.');}chunks.push(r.value);}const out=new Uint8Array(length);let pos=0;for(const chunk of chunks){out.set(chunk,pos);pos+=chunk.byteLength;}return out;}
async function body(request,max=250000){try{const x=JSON.parse(new TextDecoder().decode(await bytes(request,max)));check(x&&typeof x==='object'&&!Array.isArray(x),400,'Invalid request.');return x;}catch(e){if(e instanceof PortalError)throw e;throw new PortalError(400,'Invalid JSON request.');}}
export async function rpc(env,cmd,payload={},actor=null){check(env.PORTAL,503,'The private workspace binding is not configured.');const r=await env.PORTAL.get(env.PORTAL.idFromName('duck-bear-private-space')).fetch(new Request('https://portal.internal',{method:'POST',body:JSON.stringify({cmd,payload,actor})}));const data=await r.json();if(!r.ok)throw new PortalError(r.status,data.error||'Request failed.');return data;}
export async function currentUser(request,env){const token=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('db_session='))?.slice(11);if(!token||token.length>200)return null;const row=await env.DB.prepare('SELECT s.id AS session_id,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1').bind(await digest(token),now()).first();return row||null;}
async function workspace(env,user){
 const actor=safeUser(user);let session;
 try{session=await rpc(env,'session',{},actor);}catch(e){if(e.status!==503)throw e;
  const setup=await env.DB.prepare("SELECT actor_user_id,detail_json FROM audit_log WHERE action='setup.complete' ORDER BY created_at LIMIT 1").first();
  let companionId;try{companionId=JSON.parse(setup?.detail_json||'{}').memberUserId;}catch{}
  check(setup?.actor_user_id&&companionId,503,'The original owner and companion need to be selected before new users can access this workspace.');
  await rpc(env,'boot',{ownerId:setup.actor_user_id,companionId},actor);session=await rpc(env,'session',{},actor);
 }
 if(session.permissions.isCore&&!session.imported){const seed=await seedPayload(env,actor);await rpc(env,'seed',seed,actor);
  const old=await env.MEDIA.get('account-security/private-v1.json');if(old){const data=JSON.parse(await old.text());for(const p of data.profiles||[])if(p.user_id&&p.email)await rpc(env,'importEmail',{userId:p.user_id,email:p.email.toLowerCase()},actor);}
  session=await rpc(env,'session',{},actor);
 }
 return session;
}
async function audit(env,actor,action,entityId=null){await env.DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,detail_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(uid(),actor||null,action,'our-space',entityId,'{}',now()).run();}
const mailReady=env=>Boolean((env.MAILER?.send||env.RESEND_API_KEY)&&env.EMAIL_FROM);
async function sendMail(env,to,subject,text){check(mailReady(env),503,'Email delivery is not configured. No email has been sent.');if(env.MAILER?.send)return env.MAILER.send({to,from:env.EMAIL_FROM,subject,text});const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text})});check(r.ok,503,'The email provider rejected the message. No delivery has been confirmed.');return r.json();}
async function limited(env,request,kind,extra=''){const ip=request.headers.get('CF-Connecting-IP')||'local';await rpc(env,'rate',{key:kind+':'+await digest(ip+':'+extra),window:600000,limit:kind==='login'?10:6});}
async function credentials(env,user,password){check(typeof password==='string'&&password.length<=128,400,'Invalid password.');const h=await passwordHash(password,user.password_salt,user.password_iterations);check(equal(h.hash,user.password_hash),403,'Current password is incorrect.');}
async function issue(env,purpose,user,extra={}){const token=b64(crypto.getRandomValues(new Uint8Array(32)));await rpc(env,'issueChallenge',{hash:await digest(token),purpose,userId:user.id,fingerprint:user.password_hash,expires:Date.now()+(purpose==='invite'?48:1)*3600000,...extra});return token;}
async function authRoute(request,env,path){
 const p=await body(request),origin=env.SITE_ORIGIN||DEFAULT_ORIGIN;
 if(path==='login'){
  const name=trim(p.username||p.identifier||'',254);await limited(env,request,'login',name.toLowerCase());
  let user=await env.DB.prepare('SELECT * FROM users WHERE lower(username)=lower(?) AND active=1').bind(name).first();
  if(!user&&name.includes('@')){const alias=(await rpc(env,'lookupEmail',{email:name.toLowerCase()})).email;if(alias)user=await env.DB.prepare('SELECT * FROM users WHERE id=? AND active=1').bind(alias.user_id).first();}
  // Same computational cost for an unknown username; no account enumeration in the error.
  const hash=await passwordHash(String(p.password||''),user?.password_salt||'MDEyMzQ1Njc4OWFiY2RlZg',user?.password_iterations||100000);
  check(user&&equal(hash.hash,user.password_hash),401,'Invalid username/email or password.');
  const token=b64(crypto.getRandomValues(new Uint8Array(32))),t=now();await env.DB.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent,ip_hash) VALUES(?,?,?,?,?,?,?,?)').bind(uid(),user.id,await digest(token),new Date(Date.now()+30*86400000).toISOString(),t,t,(request.headers.get('User-Agent')||'').slice(0,200),'').run();await audit(env,user.id,'portal.login');return json({user:safeUser(user)},200,{'Set-Cookie':cookie(token)});
 }
 if(path==='recover'){
  const address=email(p.email||'');await limited(env,request,'recover',address);let ready=mailReady(env);
  const alias=(await rpc(env,'lookupEmail',{email:address})).email;
  if(ready&&alias?.verified){const user=await env.DB.prepare('SELECT * FROM users WHERE id=? AND active=1').bind(alias.user_id).first();if(user){const token=await issue(env,'reset',user);try{await sendMail(env,address,'Duck & Bear password reset',`A reset was requested for your account. This link is valid for one hour and can be used once.\n${origin}/account/reset/#${token}\nIgnore this message if you did not request it.`);}catch{ready=false;await rpc(env,'revokeChallenges',{userId:user.id});}}}
  return json({message:'If a verified account matches, a recovery request will be processed. Unverified addresses need help from the owner.',deliveryReady:ready},202);
 }
 if(['reset','invite','verify'].includes(path)){
  await limited(env,request,'token');check(typeof p.token==='string'&&p.token.length>=30&&p.token.length<=100,400,'Invalid link.');if(path!=='verify')newPassword(p.password||p.newPassword);
  const purpose=path==='verify'?'verify':path;const {challenge}=await rpc(env,'consumeChallenge',{hash:await digest(p.token),purpose});
  const user=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(challenge.user_id).first();check(user&&user.password_hash===challenge.fingerprint&&(path==='invite'||user.active),400,'This link is no longer valid.');
  if(path==='verify'){await rpc(env,'bindEmail',{userId:user.id,email:challenge.email,verified:true});await audit(env,user.id,'portal.email_verified');return json({ok:true,message:'Email verified. It can now receive password reset links.'});}
  const h=await passwordHash(p.password||p.newPassword),t=now();const results=await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,active=1,updated_at=? WHERE id=? AND password_hash=?').bind(h.hash,h.salt,h.iterations,t,user.id,challenge.fingerprint),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id)]);check(results[0]?.meta?.changes===1,400,'This link is no longer valid.');await rpc(env,'revokeChallenges',{userId:user.id});await audit(env,user.id,'portal.'+path);return json({ok:true,message:'Password saved. Sign in to continue.'});
 }
 throw new PortalError(404,'Not found.');
}
function routeShell(path){return path==='/'||path==='/account'||path==='/games'||path==='/games/'||['/games/favourites/','/games/together/','/games/updates/'].includes(path)||['/account/','/our-space','/settings','/admin','/family-tree','/scrapbook','/plans','/image-library','/shop','/basket','/orders','/points','/rewards'].some(x=>path===x||path.startsWith(x.endsWith('/')?x:x+'/'))||(path.startsWith('/menus')&&!/^\/menus\/archive\/\d{4}-\d{2}-\d{2}\//.test(path)&&!path.endsWith('.css')&&!path.endsWith('.js'));}
function imageType(b){if(b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x))return 'image/png';if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';const s=new TextDecoder().decode(b.slice(0,12));if(s.startsWith('GIF87a')||s.startsWith('GIF89a'))return 'image/gif';if(s.startsWith('RIFF')&&s.slice(8)==='WEBP')return 'image/webp';return null;}
export function createPortalHandler(fallback){return {async fetch(request,env,ctx){
 const url=new URL(request.url),path=url.pathname.replace(/\/{2,}/g,'/');
 try{
  const canonical=env.SITE_ORIGIN||url.origin;
  if(!['GET','HEAD','OPTIONS'].includes(request.method)&&(path.startsWith('/api/portal/')||path.startsWith('/api/auth/'))){check(request.headers.get('Origin')===canonical&&request.headers.get('Sec-Fetch-Site')!=='cross-site',403,'Cross-site request blocked.');}
  if(path==='/menus/member'||path==='/menus/member/')return new Response(null,{status:308,headers:{Location:'/menus/planner/'}});
  if(path==='/api/portal/public/appearance'){check(request.method==='GET',405,'Use GET.');return json(await rpc(env,'publicAppearance'));}
  if(path.startsWith('/api/portal/public/')){check(request.method==='GET',405,'Use GET.');const key=path.split('/').filter(Boolean)[4];try{return json(await rpc(env,key?'publicWeek':'publicWeeks',key?{startDate:key}:{}));}catch(e){if(e.status!==404)throw e;check(!key||key===firstWeek.startDate,404,'Menu not found.');return json(key?{week:firstWeek}:{weeks:[{startDate:firstWeek.startDate,title:firstWeek.title,mealCount:firstWeek.meals.length}]});}}
  if(path.startsWith('/api/portal/auth/')||path==='/api/auth/login'||path==='/api/auth/recovery/request'||path==='/api/auth/recovery/reset'){
   check(request.method==='POST',405,'Use POST.');const action=path.startsWith('/api/portal/')?path.split('/').at(-1):path.endsWith('/request')?'recover':path.endsWith('/reset')?'reset':'login';return await authRoute(request,env,action);
  }
  if(routeShell(path)){const assetUrl=new URL('/portal/index.html',url);const r=await env.ASSETS.fetch(new Request(assetUrl,{method:'GET'}));const h=new Headers(r.headers);h.set('Cache-Control','no-cache');h.set('X-Robots-Tag','noindex, nofollow');h.set('Referrer-Policy','no-referrer');h.set('X-Frame-Options','DENY');h.set('X-Content-Type-Options','nosniff');h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");return new Response(request.method==='HEAD'?null:r.body,{status:r.status,headers:h});}
  const portal=path.startsWith('/api/portal/')||path.startsWith('/media/portal/');
  // Game transports and intentionally public health/catalogue endpoints keep their current handler.
  const legacyPrivate=(path.startsWith('/api/')&&!/^\/api\/(public\/|races\/|meow-wars\/|mango\/|health$|setup(?:\/|$))/.test(path))||path.startsWith('/media/');
  if(!portal&&!legacyPrivate)return fallback.fetch(request,env,ctx);
  const user=await currentUser(request,env);
  if(path==='/api/portal/session'&&!user)return json({user:null,version:VERSION,deliveryReady:mailReady(env)});
  check(user,401,'Please sign in.');check(user.active,403,'This account is disabled.');const actor=safeUser(user),session=await workspace(env,user);
  if(!portal){check(session.permissions.isCore,403,'This area is private to the original couple.');if(path.startsWith('/api/admin/'))check(session.permissions.isOwner,403,'Owner access required.');return fallback.fetch(request,env,ctx);}
  if(path==='/api/portal/session')return json({user:actor,...session,deliveryReady:mailReady(env)});
  if(path.startsWith('/media/portal/')){check(['GET','HEAD'].includes(request.method),405,'Use GET.');const id=path.slice('/media/portal/'.length);const {media}=await rpc(env,'media',{id,includeDeleted:url.searchParams.get('backup')==='1'&&session.permissions.isOwner},actor);const key=media.key.startsWith('portal/legacy/')?media.key.slice(14):media.key;const obj=await env.MEDIA.get(key);check(obj,404,'Photo not found.');return new Response(request.method==='HEAD'?null:obj.body,{headers:{'Content-Type':media.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Referrer-Policy':'no-referrer'}});}
  const parts=path.slice('/api/portal/'.length).split('/').filter(Boolean),method=request.method;
  if(parts[0]==='records'){
   if(method==='GET'&&!parts[1])return json(await rpc(env,'list',Object.fromEntries(url.searchParams),actor));
   if(method==='POST'&&!parts[1]){const p=await body(request);check(p.kind!=='media',400,'Use the image upload control.');return json(await rpc(env,'put',p,actor),201);}
   if(method==='GET'&&parts[1])return json(await rpc(env,parts[2]==='history'?'history':'get',{id:parts[1]},actor));
   const p=await body(request);if(method==='PUT'){check(p.kind!=='media'||session.permissions.isCore,403,'Core access required.');if(p.kind==='media'){const {media}=await rpc(env,'media',{id:parts[1]},actor);p.data={...p.data,key:media.key,mime:media.mime,size:media.size};}return json(await rpc(env,'put',{...p,id:parts[1]},actor));}
   if(method==='DELETE')return json(await rpc(env,'delete',{id:parts[1],revision:p.revision},actor));
   if(method==='POST'&&['restore','publish','vote','favourite','copy'].includes(parts[2]))return json(await rpc(env,parts[2]==='copy'?'copyWeek':parts[2],{...p,id:parts[1]},actor));
  }
  if(parts[0]==='search'&&method==='GET')return json(await rpc(env,'search',Object.fromEntries(url.searchParams),actor));
  if(parts[0]==='appearance'&&method==='POST'){const out=await rpc(env,'appearance',await body(request),actor);await audit(env,user.id,'portal.site_appearance');return json(out);}
  if(parts[0]==='audit'&&method==='GET'){check(session.permissions.isOwner,403,'Owner access required.');return json({audit:(await env.DB.prepare('SELECT id,actor_user_id,action,entity_id,created_at FROM audit_log ORDER BY created_at DESC LIMIT 200').all()).results});}
  if(parts[0]==='activity'&&method==='GET')return json(await rpc(env,'activity',{},actor));
  if(parts[0]==='preferences'&&method==='POST')return json(await rpc(env,'preferences',await body(request),actor));
  if(parts[0]==='media'&&method==='POST'){
   await rpc(env,'rate',{key:'uploads:'+user.id,limit:100,window:3600000});const all=await bytes(request,9*1024*1024);const form=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('Content-Type')||''},body:all}).formData();const file=form.get('file');check(file instanceof File&&file.size>0&&file.size<=8388608,400,'Choose an image of at most 8 MB.');const section=String(form.get('section')||'images');check(session.permissions.isCore||(session.permissions.sections[section]||0)>=2,403,'Upload permission required.');const data=new Uint8Array(await file.arrayBuffer()),mime=imageType(data);check(mime&&mime===file.type,400,'The image contents do not match a supported image format.');const key='portal/'+uid();await env.MEDIA.put(key,data,{httpMetadata:{contentType:mime}});try{const out=await rpc(env,'put',{section,kind:'media',title:file.name.slice(0,160),data:{key,mime,size:data.byteLength}},actor);return json(out,201);}catch(e){await env.MEDIA.delete(key);throw e;}
  }
  if(parts[0]==='security'){
   if(parts[1]==='sessions'&&method==='GET'){const rows=(await env.DB.prepare('SELECT id,created_at,last_seen_at,user_agent FROM sessions WHERE user_id=? AND expires_at>?').bind(user.id,now()).all()).results;return json({sessions:rows.map(s=>({...s,current:s.id===user.session_id}))});}
   if(parts[1]==='sessions'&&method==='DELETE'){const p=await body(request);await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND id=?').bind(user.id,p.id).run();return json({ok:true});}
   if(parts[1]==='logout'&&method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(user.session_id).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)});}
   if(parts[1]==='profile'&&method==='POST'){const p=await body(request),name=trim(p.displayName,80);check(name,400,'Enter your name.');await env.DB.prepare('UPDATE users SET display_name=?,updated_at=? WHERE id=?').bind(name,now(),user.id).run();return json({ok:true});}
   if(parts[1]==='password'&&method==='POST'){const p=await body(request);await credentials(env,user,p.currentPassword);const h=await passwordHash(newPassword(p.password));await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?').bind(h.hash,h.salt,h.iterations,now(),user.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND id<>?').bind(user.id,user.session_id)]);await rpc(env,'revokeChallenges',{userId:user.id});return json({ok:true});}
   if(parts[1]==='email'&&method==='POST'){const p=await body(request);await credentials(env,user,p.currentPassword);const address=email(p.email);check(mailReady(env),503,'A verified email sender must be connected before verification emails can be sent. Your existing address has not changed.');await limited(env,request,'verify',user.id);const token=await issue(env,'verify',user,{email:address});await sendMail(env,address,'Verify your Duck & Bear email',`Confirm this email for your account within one hour:\n${canonical}/account/verify/#${token}\nIf you did not request this, ignore this message.`);return json({ok:true,message:'Verification message accepted by the email provider. Check your inbox.'});}
  }
  if(parts[0]==='users'){
   check(session.permissions.isOwner,403,'Only the owner can manage users.');const access=await rpc(env,'grants',{},actor),principals=access.principals;
   if(method==='GET'){const users=(await env.DB.prepare('SELECT id,username,display_name,role,active,created_at FROM users ORDER BY created_at').all()).results;return json({users:users.map(u=>({...safeUser(u),protected:[principals.ownerId,principals.companionId].includes(u.id)})),grants:access.grants});}
   const p=await body(request);
   if(method==='POST'&&!parts[1]){
    const username=trim(p.username,30),name=trim(p.displayName,80);check(/^[a-zA-Z0-9_.-]{3,30}$/.test(username)&&name,400,'Enter a name and a username of 3–30 letters, digits, dots, hyphens or underscores.');const exists=await env.DB.prepare('SELECT id FROM users WHERE lower(username)=lower(?)').bind(username).first();check(!exists,409,'That username is already in use.');const id=uid(),h=await passwordHash(b64(crypto.getRandomValues(new Uint8Array(32)))),t=now();await env.DB.prepare('INSERT INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,username,name,'member',h.hash,h.salt,h.iterations,0,t,t).run();const token=await issue(env,'invite',{id,password_hash:h.hash});await audit(env,user.id,'portal.user_invited',id);return json({user:{id,username,displayName:name,active:false},invitationUrl:canonical+'/account/invite/#'+token},201);
   }
   const target=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(parts[1]).first();check(target,404,'User not found.');
   if(method==='POST'&&parts[2]==='permissions'){const out=await rpc(env,'grant',{userId:target.id,scope:p.scope,level:p.level},actor);await audit(env,user.id,'portal.permissions_updated',target.id);return json(out);}
   if(method==='POST'&&parts[2]==='invitation'){check(!target.active,400,'This user is already active.');return json({invitationUrl:canonical+'/account/invite/#'+await issue(env,'invite',target)});}
   if(method==='POST'&&parts[2]==='reset'){check(target.id!==user.id,400,'Use your password settings.');await credentials(env,user,p.currentPassword);const h=await passwordHash(newPassword(p.password));await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?').bind(h.hash,h.salt,h.iterations,now(),target.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id)]);await rpc(env,'revokeChallenges',{userId:target.id});await audit(env,user.id,'portal.admin_password_reset',target.id);return json({ok:true});}
   if(method==='PUT'){check(![principals.ownerId,principals.companionId].includes(target.id)||p.active!==false,400,'The original owner and companion cannot be disabled here.');const name=trim(p.displayName,80);check(name,400,'Enter a display name.');await env.DB.prepare('UPDATE users SET display_name=?,active=?,updated_at=? WHERE id=?').bind(name,p.active===undefined?target.active:p.active===false?0:1,now(),target.id).run();if(p.active===false){await env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id).run();await rpc(env,'revokeChallenges',{userId:target.id});}await audit(env,user.id,'portal.user_updated',target.id);return json({ok:true});}
   if(method==='DELETE'){check(![principals.ownerId,principals.companionId].includes(target.id),400,'Original accounts are protected.');check(p.confirm===target.username,400,'Type the username to confirm deletion.');const h=await passwordHash(b64(crypto.getRandomValues(new Uint8Array(32))));await env.DB.batch([env.DB.prepare('UPDATE users SET username=?,display_name=?,active=0,password_hash=?,password_salt=?,updated_at=? WHERE id=?').bind('deleted-'+target.id.replaceAll('-','').slice(0,20),'Former member',h.hash,h.salt,now(),target.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(target.id)]);await rpc(env,'forgetUser',{userId:target.id});await audit(env,user.id,'portal.user_removed',target.id);return json({ok:true,message:'Account removed. Shared contributions and their history were preserved.'});}
  }
  if(parts[0]==='backup'&&method==='GET')return json(await rpc(env,'export',{},actor));
  if(parts[0]==='backup'&&method==='POST'){
   check(session.permissions.isOwner,403,'Owner access required.');const p=await body(request,20*1024*1024);
   // Media keys may only come from real uploads already owned by this workspace.
   for(const r of p.backup?.records||[])if(r.kind==='media'){const saved=await rpc(env,'media',{id:r.id},actor);check(saved.media.key===r.data.key&&saved.media.mime===r.data.mime,400,'Backup images must be uploaded and matched before restore.');}
   return json(await rpc(env,'import',p,actor));
  }
  throw new PortalError(404,'Page or action not found.');
 }catch(e){if(e instanceof PortalError)return json({error:e.message},e.status);console.error('Our Space request failed',e);return json({error:'The request could not be completed. Your saved data has not been replaced.'},500);}
}};}
