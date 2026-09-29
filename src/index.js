import {sitePage} from './site/pages.mjs';
import {routeSiteApi,siteMedia,seedInitialPair} from './site/api.mjs';
import {legacyAllowed} from './site/core.mjs';
import {routeMangoApi} from './mango/api.mjs';

const ORDER_STATUSES = ['Received','Bear notified','Preparing','Out for Bear Delivery','Delivered','Cancelled'];
const SESSION_DAYS = 30;
// Cloudflare Workers production caps PBKDF2 at 100,000 iterations.
const PASSWORD_ITERATIONS = 100000;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await routeApi(request, env, url);
      if (url.pathname.startsWith('/media/')) return await serveMedia(request, env, url);
      const page=await sitePage(request,env);
      return page || env.ASSETS.fetch(request);
    } catch (err) {
      if (err instanceof HttpError) return apiJson({ error: err.message }, err.status);
      console.error('Duck & Bear worker error', err);
      return apiJson({ error: 'Something went wrong at Duck & Bear HQ.' }, 500);
    }
  }
};

async function routeApi(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: apiHeaders() });
  if (!['GET','HEAD'].includes(request.method) && !sameOrigin(request, url)) return apiJson({ error: 'Cross-site request blocked.' }, 403);

  const path = url.pathname;
  if ((path === '/api/site/health' || path === '/api/site/public') && request.method === 'GET') return routeSiteApi(request,env,null);
  if (path === '/api/health' && request.method === 'GET') return apiJson({ ok: true, service: 'Duck & Bear HQ', version: 4 });
  if (path === '/api/setup/status' && request.method === 'GET') return setupStatus(env);
  if (path === '/api/setup' && request.method === 'POST') return setupAccounts(request, env);
  if (path === '/api/auth/login' && request.method === 'POST') return login(request, env);
  if (path === '/api/auth/recovery/request' && request.method === 'POST') return requestPasswordRecovery(request, env, url);
  if (path === '/api/auth/recovery/reset' && request.method === 'POST') return resetPasswordWithToken(request, env);

  const auth = await getAuth(request, env);
  if (!auth) return apiJson({ error: 'Please sign in.' }, 401);
  if (!auth.user.active) return apiJson({ error: 'This account is disabled.' }, 403);

  if (path.startsWith('/api/site/')) return routeSiteApi(request,env,auth.user,{safeUser,hashPassword,audit,readAccountSecurity,writeAccountSecurity,accountSecurityForUser});
  if (!['/api/auth/logout','/api/account/password','/api/account/email'].includes(path) && !path.startsWith('/api/mango/profiles') && !await legacyAllowed(env,auth.user)) return apiJson({error:'You do not have access to this private area.'},403);

  if (path === '/api/mango/profiles' || path.startsWith('/api/mango/profiles/')) return routeMangoApi(request, env, auth.user);

  if (path === '/api/auth/logout' && request.method === 'POST') return logout(request, env, auth);
  if (path === '/api/account/password' && request.method === 'POST') return changePassword(request, env, auth);
  if (path === '/api/account/email' && request.method === 'POST') return saveAccountEmail(request, env, auth);
  if (path === '/api/bootstrap' && request.method === 'GET') return bootstrap(env, auth.user);
  if (path === '/api/cart' && request.method === 'POST') return mutateCart(request, env, auth.user);

  let m = path.match(/^\/api\/favourites\/([^/]+)$/);
  if (m && request.method === 'POST') return toggleFavourite(env, auth.user, decodeURIComponent(m[1]));

  if (path === '/api/orders' && request.method === 'GET') return listOrders(env, auth.user, url);
  if (path === '/api/orders/checkout' && request.method === 'POST') return checkout(request, env, auth.user);
  m = path.match(/^\/api\/orders\/([^/]+)$/);
  if (m && request.method === 'GET') return orderDetail(env, auth.user, decodeURIComponent(m[1]));
  m = path.match(/^\/api\/orders\/([^/]+)\/reorder$/);
  if (m && request.method === 'POST') return reorder(env, auth.user, decodeURIComponent(m[1]));
  m = path.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (m && request.method === 'POST') return updateOrderStatus(request, env, auth.user, decodeURIComponent(m[1]));

  if (path === '/api/loyalty' && request.method === 'GET') return loyaltySnapshot(env, auth.user, url.searchParams.get('userId'));
  if (path === '/api/loyalty/claim' && request.method === 'POST') return claimEarnRule(request, env, auth.user);
  if (path === '/api/loyalty/redeem' && request.method === 'POST') return redeemReward(request, env, auth.user);
  m = path.match(/^\/api\/loyalty\/redemptions\/([^/]+)\/use$/);
  if (m && request.method === 'POST') return markRedemptionUsed(env, auth.user, decodeURIComponent(m[1]));
  m = path.match(/^\/api\/badges\/([^/]+)\/unlock$/);
  if (m && request.method === 'POST') return unlockSecretBadge(env, auth.user, decodeURIComponent(m[1]));

  if (path === '/api/menus/dashboard' && request.method === 'GET') return menuDashboard(env, auth.user);
  if (path === '/api/menus/suggestions' && request.method === 'POST') return saveMenuSuggestion(request, env, auth.user);
  m = path.match(/^\/api\/menus\/suggestions\/([^/]+)\/status$/);
  if (m && request.method === 'POST') return updateMenuSuggestionStatus(request, env, auth.user, decodeURIComponent(m[1]));
  if (path === '/api/menus/reviews' && request.method === 'POST') return saveMenuReview(request, env, auth.user);

  if (path === '/api/fun' && request.method === 'GET') return funSnapshot(env, auth.user);
  if (path === '/api/fun/dates' && request.method === 'POST') return saveDate(request, env, auth.user);
  if (path === '/api/fun/room-service' && request.method === 'POST') return roomService(request, env, auth.user);
  if (path === '/api/fun/reviews' && request.method === 'POST') return saveReview(request, env, auth.user);
  if (path === '/api/fun/complaints' && request.method === 'POST') return saveComplaint(request, env, auth.user);
  if (path === '/api/fun/adventures' && request.method === 'POST') return saveAdventure(request, env, auth.user);
  m = path.match(/^\/api\/fun\/adventures\/([^/]+)\/status$/);
  if (m && request.method === 'POST') return updateAdventureStatus(request, env, auth.user, decodeURIComponent(m[1]));

  if (path === '/api/media/upload' && request.method === 'POST') return uploadMedia(request, env, auth.user);
  if (path === '/api/memories' && request.method === 'POST') return saveMemory(request, env, auth.user);
  m = path.match(/^\/api\/memories\/([^/]+)$/);
  if (m && request.method === 'DELETE') return deleteMemory(env, auth.user, decodeURIComponent(m[1]));

  if (path === '/api/export/orders.csv' && request.method === 'GET') return exportOrdersCsv(env, auth.user);
  if (path === '/api/export/loyalty.csv' && request.method === 'GET') return exportLoyaltyCsv(env, auth.user, url.searchParams.get('userId'));
  if (path === '/api/export/backup.json' && request.method === 'GET') return exportBackup(env, auth.user);

  if (path.startsWith('/api/admin/')) {
    if (auth.user.role !== 'admin') return apiJson({ error: 'Admin access required.' }, 403);
    if (path === '/api/admin/dashboard' && request.method === 'GET') return adminDashboard(env, auth.user);
    if (path === '/api/admin/loyalty/adjust' && request.method === 'POST') return adminAdjustPoints(request, env, auth.user);
    if (path === '/api/admin/products' && request.method === 'POST') return adminCreateProduct(request, env, auth.user);
    m = path.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (m && request.method === 'PUT') return adminUpdateProduct(request, env, auth.user, decodeURIComponent(m[1]));
    if (path === '/api/admin/rewards' && request.method === 'POST') return adminCreateReward(request, env, auth.user);
    m = path.match(/^\/api\/admin\/rewards\/([^/]+)$/);
    if (m && request.method === 'PUT') return adminUpdateReward(request, env, auth.user, decodeURIComponent(m[1]));
    m = path.match(/^\/api\/admin\/earn-rules\/([^/]+)$/);
    if (m && request.method === 'PUT') return adminUpdateEarnRule(request, env, auth.user, decodeURIComponent(m[1]));
    m = path.match(/^\/api\/admin\/complaints\/([^/]+)$/);
    if (m && request.method === 'PUT') return adminUpdateComplaint(request, env, auth.user, decodeURIComponent(m[1]));
    m = path.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
    if (m && request.method === 'POST') return adminResetPassword(request, env, auth.user, decodeURIComponent(m[1]));
    if (path === '/api/admin/audit' && request.method === 'GET') return adminAudit(env);
  }

  return apiJson({ error: 'Not found.' }, 404);
}

function apiHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    ...extra
  };
}
function apiJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: apiHeaders(extraHeaders) });
}
function sameOrigin(request, url) {
  const origin = request.headers.get('Origin');
  return !origin || origin === url.origin;
}
async function bodyJson(request) {
  try { return await request.json(); } catch { throw new HttpError(400, 'Invalid request body.'); }
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function text(v, max = 200) { return String(v ?? '').trim().slice(0, max); }
function int(v, min, max, fallback = min) { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
function now() { return new Date().toISOString(); }
function id(prefix = 'id') { return `${prefix}_${crypto.randomUUID().replaceAll('-','')}`; }
function orderNumber() { const d = new Date(); const ds = `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`; return `DB-${ds}-${crypto.randomUUID().slice(0,6).toUpperCase()}`; }
function caseNumber() { return `CASE-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`; }
function periodKey(frequency, date = new Date()) {
  const y = date.getUTCFullYear(); const m = String(date.getUTCMonth()+1).padStart(2,'0'); const d = String(date.getUTCDate()).padStart(2,'0');
  if (frequency === 'daily') return `${y}-${m}-${d}`;
  if (frequency === 'weekly') { const t = new Date(Date.UTC(y,date.getUTCMonth(),date.getUTCDate())); const day=t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day); const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1)); const w=Math.ceil((((t-y0)/86400000)+1)/7); return `${t.getUTCFullYear()}-W${String(w).padStart(2,'0')}`; }
  if (frequency === 'once') return 'once';
  return crypto.randomUUID();
}
function bytesToB64(bytes) { let s=''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,''); }
function b64ToBytes(value) { let s=value.replaceAll('-','+').replaceAll('_','/'); while(s.length%4) s+='='; const raw=atob(s); return Uint8Array.from(raw, c=>c.charCodeAt(0)); }
async function sha256(value) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return bytesToB64(new Uint8Array(buf)); }
async function hashPassword(password, saltB64 = null, iterations = PASSWORD_ITERATIONS) {
  const salt = saltB64 ? b64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt, iterations }, key, 256);
  return { hash: bytesToB64(new Uint8Array(bits)), salt: bytesToB64(salt), iterations };
}
function constantTimeEqual(a,b) { if (a.length !== b.length) return false; let out=0; for(let i=0;i<a.length;i++) out |= a.charCodeAt(i)^b.charCodeAt(i); return out===0; }
function cookieValue(request, name) { const c=request.headers.get('Cookie')||''; for(const part of c.split(';')) { const [k,...rest]=part.trim().split('='); if(k===name) return rest.join('='); } return ''; }
function sessionCookie(token, maxAge = SESSION_DAYS*86400) { return `db_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`; }
async function ipHash(request) { const ip=request.headers.get('CF-Connecting-IP') || ''; return ip ? sha256(ip) : null; }

async function setupStatus(env) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  return apiJson({ setupRequired: Number(row?.n || 0) === 0, setupSecretConfigured: Boolean(env.SETUP_SECRET) });
}
async function setupAccounts(request, env) {
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if (Number(count?.n || 0) > 0) return apiJson({ error: 'Setup has already been completed.' }, 409);
  if (!env.SETUP_SECRET) return apiJson({ error: 'SETUP_SECRET is not configured on the Worker.' }, 503);
  const b = await bodyJson(request);
  if (!constantTimeEqual(text(b.setupSecret, 200), String(env.SETUP_SECRET))) return apiJson({ error: 'Invalid setup key.' }, 403);
  const admin = validateSetupUser(b.admin, 'admin'); const member = validateSetupUser(b.member, 'member');
  if (admin.username.toLowerCase() === member.username.toLowerCase()) return apiJson({ error: 'The two usernames must be different.' }, 400);
  const [ah,mh] = await Promise.all([hashPassword(admin.password), hashPassword(member.password)]);
  const t=now(); const aid=id('usr'); const mid=id('usr');
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users (id,username,display_name,role,password_hash,password_salt,password_iterations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(aid,admin.username,admin.displayName,'admin',ah.hash,ah.salt,ah.iterations,t,t),
    env.DB.prepare('INSERT INTO users (id,username,display_name,role,password_hash,password_salt,password_iterations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(mid,member.username,member.displayName,'member',mh.hash,mh.salt,mh.iterations,t,t)
  ]);
  await seedInitialPair(env,aid,mid);
  await audit(env, aid, 'setup.complete', 'system', null, { memberUserId:mid });
  return apiJson({ ok:true, message:'Duck & Bear HQ accounts created.' }, 201);
}
function validateSetupUser(input, role) {
  const username=text(input?.username,30).replace(/[^a-zA-Z0-9_.-]/g,''); const displayName=text(input?.displayName,50); const password=String(input?.password||'');
  if (username.length < 3) throw new HttpError(400, `${role} username must be at least 3 characters.`);
  if (displayName.length < 1) throw new HttpError(400, `${role} display name is required.`);
  if (password.length < 8 || password.length > 128) throw new HttpError(400, `${role} password must be 8–128 characters.`);
  return { username, displayName, password };
}

const ACCOUNT_SECURITY_KEY='account-security/private-v1.json';
function emptyAccountSecurity(){return {version:1,profiles:[],recoveryRequests:[],resetTokens:[]};}
async function readAccountSecurity(env){
  const obj=await env.MEDIA.get(ACCOUNT_SECURITY_KEY);
  if(!obj)return emptyAccountSecurity();
  try{
    const raw=JSON.parse(await obj.text());
    return {
      version:1,
      profiles:Array.isArray(raw?.profiles)?raw.profiles.slice(-50):[],
      recoveryRequests:Array.isArray(raw?.recoveryRequests)?raw.recoveryRequests.slice(-200):[],
      resetTokens:Array.isArray(raw?.resetTokens)?raw.resetTokens.slice(-200):[]
    };
  }catch(err){
    console.warn('Account security data could not be read',err);
    return emptyAccountSecurity();
  }
}
async function writeAccountSecurity(env,data){
  const cutoff=Date.now()-30*86400000;
  const payload={
    version:1,
    updatedAt:now(),
    profiles:Array.isArray(data.profiles)?data.profiles.slice(-50):[],
    recoveryRequests:(Array.isArray(data.recoveryRequests)?data.recoveryRequests:[]).filter(x=>Date.parse(x.requested_at||0)>=cutoff).slice(-200),
    resetTokens:(Array.isArray(data.resetTokens)?data.resetTokens:[]).filter(x=>Date.parse(x.created_at||0)>=cutoff).slice(-200)
  };
  await env.MEDIA.put(ACCOUNT_SECURITY_KEY,JSON.stringify(payload),{httpMetadata:{contentType:'application/json'},customMetadata:{private:'true',purpose:'account-security'}});
  return payload;
}
function normalizeEmail(value){return String(value||'').trim().toLowerCase().slice(0,254);}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=254;}
function maskEmail(value){
  const [local,domain]=String(value||'').split('@');
  if(!local||!domain)return '';
  const head=local.slice(0,1),tail=local.length>2?local.slice(-1):'';
  return `${head}***${tail}@${domain}`;
}
async function accountSecurityForUser(env,user){
  const data=await readAccountSecurity(env),profile=data.profiles.find(x=>x.user_id===user.id);
  return {email:profile?.email||'',emailRegistered:Boolean(profile?.email),updatedAt:profile?.updated_at||null};
}
async function saveAccountEmail(request,env,auth){
  const b=await bodyJson(request),email=String(b.email||'').trim().slice(0,254),normalized=normalizeEmail(email),current=String(b.currentPassword||'');
  if(!validEmail(normalized))return apiJson({error:'Enter a valid email address.'},400);
  const check=await hashPassword(current,auth.user.password_salt,auth.user.password_iterations);
  if(!constantTimeEqual(check.hash,auth.user.password_hash))return apiJson({error:'Current password is incorrect.'},403);
  const data=await readAccountSecurity(env);
  const duplicate=data.profiles.find(x=>x.user_id!==auth.user.id&&x.email_normalized===normalized);
  if(duplicate)return apiJson({error:'That email address is already registered to another account.'},409);
  const t=now();let profile=data.profiles.find(x=>x.user_id===auth.user.id);
  if(profile){profile.email=email;profile.email_normalized=normalized;profile.updated_at=t;}
  else{profile={user_id:auth.user.id,email,email_normalized:normalized,created_at:t,updated_at:t};data.profiles.push(profile);}
  for(const r of data.recoveryRequests)if(r.user_id===auth.user.id&&['Pending','Emailed'].includes(r.status)){r.status='Cancelled';r.updated_at=t;}
  for(const token of data.resetTokens)if(token.user_id===auth.user.id&&token.status==='Pending'){token.status='Revoked';token.updated_at=t;}
  await writeAccountSecurity(env,data);
  await audit(env,auth.user.id,'account.email_update','user',auth.user.id,{emailMasked:maskEmail(email)});
  return apiJson({ok:true,accountSecurity:{email,emailRegistered:true,updatedAt:t}});
}
async function sendRecoveryEmailIfAvailable(env,email,token,url){
  if(!env.EMAIL||!env.PASSWORD_RESET_FROM)return false;
  const resetUrl=`${url.origin}/account?reset=${encodeURIComponent(token)}`;
  try{
    await env.EMAIL.send({
      from:String(env.PASSWORD_RESET_FROM),
      to:email,
      subject:'Duck & Bear password reset',
      text:`A password reset was requested for Duck & Bear HQ. Use this link within 60 minutes: ${resetUrl}\n\nIf you did not request this, ignore this message.`,
      html:`<p>A password reset was requested for Duck &amp; Bear HQ.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 60 minutes. If you did not request this, ignore this message.</p>`
    });
    return true;
  }catch(err){
    console.warn('Password reset email could not be sent',err);
    return false;
  }
}
async function requestPasswordRecovery(request,env,url){
  const b=await bodyJson(request),email=normalizeEmail(b.email);
  if(!validEmail(email))return apiJson({error:'Enter a valid email address.'},400);
  const data=await readAccountSecurity(env),profile=data.profiles.find(x=>x.email_normalized===email);
  const generic={ok:true,message:'If that email is registered, recovery instructions are now available.'};
  if(!profile)return apiJson(generic);
  const user=await env.DB.prepare('SELECT id,active FROM users WHERE id=? LIMIT 1').bind(profile.user_id).first();
  if(!user?.active)return apiJson(generic);
  const t=now(),recentCutoff=Date.now()-10*60*1000;
  const recent=data.recoveryRequests.some(x=>x.user_id===profile.user_id&&['Pending','Emailed'].includes(x.status)&&Date.parse(x.requested_at||0)>=recentCutoff);
  if(recent)return apiJson(generic);
  const requestId=id('recovery'),expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
  const rawToken=bytesToB64(crypto.getRandomValues(new Uint8Array(32))),tokenHash=await sha256(rawToken),tokenId=id('reset');
  const resetToken={id:tokenId,user_id:profile.user_id,token_hash:tokenHash,status:'Pending',created_at:t,expires_at:new Date(Date.now()+60*60*1000).toISOString()};
  data.resetTokens.push(resetToken);
  const recovery={id:requestId,user_id:profile.user_id,email_masked:maskEmail(profile.email),status:'Pending',delivery:'admin',requested_at:t,expires_at:expiresAt,ip_hash:await ipHash(request)};
  data.recoveryRequests.push(recovery);
  await writeAccountSecurity(env,data);
  const sent=await sendRecoveryEmailIfAvailable(env,profile.email,rawToken,url);
  if(sent){
    recovery.status='Emailed';recovery.delivery='email';recovery.updated_at=now();
    await writeAccountSecurity(env,data);
  }
  await audit(env,null,'auth.recovery_request','user',profile.user_id,{delivery:sent?'email':'admin'});
  return apiJson(generic);
}
async function resetPasswordWithToken(request,env){
  const b=await bodyJson(request),token=String(b.token||''),next=String(b.newPassword||'');
  if(token.length<20||token.length>300)return apiJson({error:'This password reset link is invalid or expired.'},400);
  if(next.length<8||next.length>128)return apiJson({error:'New password must be 8–128 characters.'},400);
  const tokenHash=await sha256(token),data=await readAccountSecurity(env),record=data.resetTokens.find(x=>x.token_hash===tokenHash&&x.status==='Pending');
  if(!record||Date.parse(record.expires_at||0)<=Date.now())return apiJson({error:'This password reset link is invalid or expired.'},400);
  const user=await env.DB.prepare('SELECT * FROM users WHERE id=? AND active=1 LIMIT 1').bind(record.user_id).first();
  if(!user)return apiJson({error:'This password reset link is invalid or expired.'},400);
  const h=await hashPassword(next),t=now();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?').bind(h.hash,h.salt,h.iterations,t,user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id)
  ]);
  record.status='Used';record.updated_at=t;
  for(const r of data.recoveryRequests)if(r.user_id===user.id&&['Pending','Emailed'].includes(r.status)){r.status='Resolved';r.updated_at=t;}
  await writeAccountSecurity(env,data);
  await audit(env,user.id,'auth.recovery_reset','user',user.id,{});
  return apiJson({ok:true,message:'Password reset. You can sign in with the new password.'});
}

async function login(request, env) {
  try {
    const b=await bodyJson(request),identifier=text(b.username||b.identifier,254),password=String(b.password||''),ip=await ipHash(request),cutoff=new Date(Date.now()-10*60*1000).toISOString();
    const attempts=await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE lower(username)=lower(?) AND success=0 AND created_at>=?').bind(identifier,cutoff).first();
    if(Number(attempts?.n||0)>=5)return apiJson({error:'Too many failed attempts. Try again later.'},429);
    let user=await env.DB.prepare('SELECT * FROM users WHERE lower(username)=lower(?) AND active=1').bind(identifier).first();
    if(!user&&identifier.includes('@')){
      const security=await readAccountSecurity(env),profile=security.profiles.find(x=>x.email_normalized===normalizeEmail(identifier));
      if(profile)user=await env.DB.prepare('SELECT * FROM users WHERE id=? AND active=1').bind(profile.user_id).first();
    }
    let ok=false;
    if(user){const h=await hashPassword(password,user.password_salt,user.password_iterations);ok=constantTimeEqual(h.hash,user.password_hash);}
    await env.DB.prepare('INSERT INTO login_attempts (id,username,ip_hash,success,created_at) VALUES (?,?,?,?,?)').bind(id('try'),identifier,ip,ok?1:0,now()).run();
    if(!ok)return apiJson({error:'Invalid username/email or password.'},401);
    const token=bytesToB64(crypto.getRandomValues(new Uint8Array(32))),tokenHash=await sha256(token),t=now(),expires=new Date(Date.now()+SESSION_DAYS*86400000).toISOString();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t),
      env.DB.prepare('INSERT INTO sessions (id,user_id,token_hash,expires_at,created_at,last_seen_at,user_agent,ip_hash) VALUES (?,?,?,?,?,?,?,?)').bind(id('ses'),user.id,tokenHash,expires,t,t,text(request.headers.get('User-Agent'),250),ip)
    ]);
    await audit(env,user.id,'auth.login','user',user.id,{});
    return apiJson({ok:true,user:safeUser(user)},200,{'Set-Cookie':sessionCookie(token)});
  }catch(err){if(err instanceof HttpError)return apiJson({error:err.message},err.status);throw err;}
}
async function getAuth(request, env) {
  const token=cookieValue(request,'db_session'); if(!token) return null; const tokenHash=await sha256(token); const t=now();
  const row=await env.DB.prepare(`SELECT s.id AS session_id,s.expires_at,u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1`).bind(tokenHash,t).first();
  return row ? { sessionId:row.session_id, tokenHash, user:row } : null;
}
async function logout(request, env, auth) { await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(auth.sessionId).run(); await audit(env,auth.user.id,'auth.logout','user',auth.user.id,{}); return apiJson({ok:true},200,{'Set-Cookie':sessionCookie('',0)}); }
async function changePassword(request,env,auth){ const b=await bodyJson(request); const current=String(b.currentPassword||''), next=String(b.newPassword||''); if(next.length<8||next.length>128)return apiJson({error:'New password must be 8–128 characters.'},400); const check=await hashPassword(current,auth.user.password_salt,auth.user.password_iterations); if(!constantTimeEqual(check.hash,auth.user.password_hash))return apiJson({error:'Current password is incorrect.'},403); const h=await hashPassword(next); const t=now(); await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?').bind(h.hash,h.salt,h.iterations,t,auth.user.id),env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND id<>?').bind(auth.user.id,auth.sessionId)]); try{const security=await readAccountSecurity(env);for(const r of security.recoveryRequests)if(r.user_id===auth.user.id&&['Pending','Emailed'].includes(r.status)){r.status='Cancelled';r.updated_at=t;}for(const token of security.resetTokens)if(token.user_id===auth.user.id&&token.status==='Pending'){token.status='Revoked';token.updated_at=t;}await writeAccountSecurity(env,security);}catch(err){console.warn('Recovery cleanup after password change failed',err);} await audit(env,auth.user.id,'auth.password_change','user',auth.user.id,{}); return apiJson({ok:true}); }
function safeUser(u){ return { id:u.id, username:u.username, displayName:u.display_name, role:u.role, active:Boolean(u.active) }; }

async function bootstrap(env, user) {
  const products=(await env.DB.prepare('SELECT * FROM products WHERE active=1 ORDER BY featured DESC,sort_order,name').all()).results;
  const fav=(await env.DB.prepare('SELECT product_id FROM favourites WHERE user_id=?').bind(user.id).all()).results.map(x=>x.product_id);
  const cart=await getCart(env,user.id);
  const loyalty=await loyaltyData(env,user.id);
  const orders=await ordersWithItems(env,user,user.role==='admin'?null:user.id,8);
  const fun=await funData(env,user.id);
  const accountSecurity=await accountSecurityForUser(env,user);
  let admin=null;
  if(user.role==='admin') admin=await adminData(env);
  return apiJson({ user:safeUser(user), accountSecurity, products, favourites:fav, cart, loyalty, orders, fun, admin, dateIdeas:DATE_IDEAS, roomServiceMenu:ROOM_SERVICE_MENU, tiers:TIERS });
}

async function getCart(env,userId){ return (await env.DB.prepare(`SELECT c.product_id AS id,c.quantity AS qty,p.name,p.emoji,p.category,p.stock_label FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.user_id=? AND p.active=1 ORDER BY c.updated_at DESC`).bind(userId).all()).results; }
async function mutateCart(request,env,user){
  const b=await bodyJson(request); const productId=text(b.productId,80); const action=text(b.action,20)||'add'; const p=await env.DB.prepare('SELECT id FROM products WHERE id=? AND active=1').bind(productId).first(); if(!p)return apiJson({error:'Product not found.'},404); const t=now();
  if(action==='remove'){ await env.DB.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').bind(user.id,productId).run(); }
  else if(action==='set'){ const qty=int(b.quantity,0,9,1); if(qty===0) await env.DB.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').bind(user.id,productId).run(); else await env.DB.prepare(`INSERT INTO cart_items (user_id,product_id,quantity,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=excluded.quantity,updated_at=excluded.updated_at`).bind(user.id,productId,qty,t).run(); }
  else { const qty=int(b.quantity,1,9,1); await env.DB.prepare(`INSERT INTO cart_items (user_id,product_id,quantity,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=MIN(9,cart_items.quantity+excluded.quantity),updated_at=excluded.updated_at`).bind(user.id,productId,qty,t).run(); }
  return apiJson({ cart:await getCart(env,user.id) });
}
async function toggleFavourite(env,user,productId){ const exists=await env.DB.prepare('SELECT 1 AS x FROM favourites WHERE user_id=? AND product_id=?').bind(user.id,productId).first(); if(exists) await env.DB.prepare('DELETE FROM favourites WHERE user_id=? AND product_id=?').bind(user.id,productId).run(); else await env.DB.prepare('INSERT INTO favourites (user_id,product_id,created_at) SELECT ?,id,? FROM products WHERE id=? AND active=1').bind(user.id,now(),productId).run(); return apiJson({ favourite:!exists }); }

async function checkout(request,env,user){
  const cart=await getCart(env,user.id); if(!cart.length)return apiJson({error:'Your cart is empty.'},400); const b=await bodyJson(request); const customer=text(b.customerName,50)||user.display_name; const method=text(b.deliveryMethod,80)||'Immediate Bear Delivery'; const notes=text(b.deliveryNotes,300); const orderId=id('ord'), number=orderNumber(), t=now(); const txId=id('tx');
  const statements=[
    env.DB.prepare('INSERT INTO orders (id,order_number,user_id,source,customer_name,delivery_method,delivery_notes,status,total_pence,points_awarded,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,5,?,?)').bind(orderId,number,user.id,'shop',customer,method,notes,'Received',t,t),
    env.DB.prepare('INSERT INTO order_status_history (id,order_id,status,note,actor_user_id,created_at) VALUES (?,?,?,?,?,?)').bind(id('osh'),orderId,'Received','Order placed.',user.id,t),
    loyaltyTxStatement(env,{txId,accountUserId:user.id,actorUserId:user.id,type:'earn',label:'£0 Shop checkout bonus',delta:5,referenceType:'order',referenceId:orderId,note:'Automatic checkout bonus.',createdAt:t}),
    env.DB.prepare('DELETE FROM cart_items WHERE user_id=?').bind(user.id)
  ];
  for(const item of cart) statements.splice(statements.length-2,0,env.DB.prepare('INSERT INTO order_items (id,order_id,product_id,item_name,item_emoji,quantity,unit_price_pence) VALUES (?,?,?,?,?,?,0)').bind(id('itm'),orderId,item.id,item.name,item.emoji,item.qty));
  await env.DB.batch(statements); await awardBadge(env,user.id,'first-order'); await maybePointBadges(env,user.id,await currentBalance(env,user.id)); await audit(env,user.id,'order.create','order',orderId,{orderNumber:number,itemCount:cart.reduce((s,x)=>s+x.qty,0)});
  return apiJson({ok:true,order:await getOrder(env,orderId),cart:[],loyalty:await loyaltyData(env,user.id)},201);
}
async function listOrders(env,user,url){ const requested=url.searchParams.get('userId'); let target=user.id; if(user.role==='admin'&&requested)target=requested; if(user.role==='admin'&&url.searchParams.get('scope')==='all')target=null; return apiJson({orders:await ordersWithItems(env,user,target,100)}); }
async function ordersWithItems(env,viewer,targetUserId=null,limit=50){ let q='SELECT * FROM orders'; const binds=[]; if(targetUserId){q+=' WHERE user_id=?';binds.push(targetUserId);} q+=' ORDER BY created_at DESC LIMIT ?';binds.push(limit); const rows=(await env.DB.prepare(q).bind(...binds).all()).results; const out=[]; for(const o of rows){ const items=(await env.DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY rowid').bind(o.id).all()).results; out.push({...o,items}); } return out; }
async function getOrder(env,orderId){ const o=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first(); if(!o)return null; const [items,statuses]=await Promise.all([env.DB.prepare('SELECT * FROM order_items WHERE order_id=? ORDER BY rowid').bind(orderId).all(),env.DB.prepare('SELECT h.*,u.display_name AS actor_name FROM order_status_history h LEFT JOIN users u ON u.id=h.actor_user_id WHERE order_id=? ORDER BY created_at').bind(orderId).all()]); return {...o,items:items.results,statusHistory:statuses.results}; }
async function orderDetail(env,user,orderId){ const o=await getOrder(env,orderId); if(!o)return apiJson({error:'Order not found.'},404); if(user.role!=='admin'&&o.user_id!==user.id)return apiJson({error:'Not allowed.'},403); return apiJson({order:o}); }
async function reorder(env,user,orderId){ const o=await getOrder(env,orderId); if(!o)return apiJson({error:'Order not found.'},404); if(user.role!=='admin'&&o.user_id!==user.id)return apiJson({error:'Not allowed.'},403); const t=now(); const statements=[]; for(const i of o.items){ if(!i.product_id)continue; statements.push(env.DB.prepare(`INSERT INTO cart_items (user_id,product_id,quantity,updated_at) SELECT ?,id,?,? FROM products WHERE id=? AND active=1 ON CONFLICT(user_id,product_id) DO UPDATE SET quantity=MIN(9,cart_items.quantity+excluded.quantity),updated_at=excluded.updated_at`).bind(user.id,Math.min(9,i.quantity),t,i.product_id)); } if(statements.length) await env.DB.batch(statements); await audit(env,user.id,'order.reorder','order',orderId,{}); return apiJson({ok:true,cart:await getCart(env,user.id)}); }
async function updateOrderStatus(request,env,user,orderId){ if(user.role!=='admin')return apiJson({error:'Admin access required.'},403); const b=await bodyJson(request); const status=text(b.status,50); if(!ORDER_STATUSES.includes(status))return apiJson({error:'Invalid status.'},400); const o=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first(); if(!o)return apiJson({error:'Order not found.'},404); const t=now(); await env.DB.batch([env.DB.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').bind(status,t,orderId),env.DB.prepare('INSERT INTO order_status_history (id,order_id,status,note,actor_user_id,created_at) VALUES (?,?,?,?,?,?)').bind(id('osh'),orderId,status,text(b.note,200),user.id,t)]); await audit(env,user.id,'order.status','order',orderId,{status}); return apiJson({ok:true,order:await getOrder(env,orderId)}); }

function loyaltyTxStatement(env,{txId,accountUserId,actorUserId,type,label,delta,referenceType=null,referenceId=null,note='',createdAt}){ return env.DB.prepare(`INSERT INTO loyalty_transactions (id,account_user_id,actor_user_id,type,label,delta,balance_after,reference_type,reference_id,note,created_at) SELECT ?,?,?,?,?,?,COALESCE((SELECT SUM(delta) FROM loyalty_transactions WHERE account_user_id=?),0)+?,?,?,?,?`).bind(txId,accountUserId,actorUserId,type,label,delta,accountUserId,delta,referenceType,referenceId,note,createdAt); }
async function currentBalance(env,userId){ const r=await env.DB.prepare('SELECT COALESCE(SUM(delta),0) AS balance FROM loyalty_transactions WHERE account_user_id=?').bind(userId).first(); return Number(r?.balance||0); }
async function loyaltyData(env,userId){ const balance=await currentBalance(env,userId); const [tx,red,rules,rewards,badges,totals]=await Promise.all([
  env.DB.prepare('SELECT t.*,u.display_name AS actor_name FROM loyalty_transactions t LEFT JOIN users u ON u.id=t.actor_user_id WHERE account_user_id=? ORDER BY t.created_at DESC,t.rowid DESC LIMIT 500').bind(userId).all(),
  env.DB.prepare('SELECT r.*,rw.name,rw.emoji FROM redemptions r JOIN rewards rw ON rw.id=r.reward_id WHERE r.user_id=? ORDER BY redeemed_at DESC LIMIT 100').bind(userId).all(),
  env.DB.prepare('SELECT * FROM earn_rules WHERE active=1 ORDER BY sort_order,name').all(),
  env.DB.prepare('SELECT * FROM rewards WHERE active=1 ORDER BY sort_order,name').all(),
  env.DB.prepare(`SELECT b.*,ub.awarded_at FROM badges b LEFT JOIN user_badges ub ON ub.badge_id=b.id AND ub.user_id=? WHERE b.active=1 AND (b.secret=0 OR ub.user_id IS NOT NULL) ORDER BY ub.awarded_at DESC,b.name`).bind(userId).all(),
  env.DB.prepare('SELECT COALESCE(SUM(CASE WHEN delta>0 THEN delta ELSE 0 END),0) AS earned, COALESCE(ABS(SUM(CASE WHEN delta<0 THEN delta ELSE 0 END)),0) AS spent FROM loyalty_transactions WHERE account_user_id=?').bind(userId).first()
]);
  const claims=(await env.DB.prepare('SELECT rule_id,period_key FROM earn_claims WHERE user_id=? ORDER BY created_at DESC LIMIT 500').bind(userId).all()).results;
  return {balance,earned:Number(totals?.earned||0),spent:Number(totals?.spent||0),transactions:tx.results,redemptions:red.results,earnRules:rules.results,rewards:rewards.results,badges:badges.results,claims};
}
async function loyaltySnapshot(env,user,targetId){ let idTarget=user.id; if(user.role==='admin'&&targetId)idTarget=targetId; return apiJson({loyalty:await loyaltyData(env,idTarget),userId:idTarget,tiers:TIERS}); }
async function claimEarnRule(request,env,user){ const b=await bodyJson(request); const ruleId=text(b.ruleId,80); const rule=await env.DB.prepare('SELECT * FROM earn_rules WHERE id=? AND active=1').bind(ruleId).first(); if(!rule)return apiJson({error:'Activity not found.'},404); const key=periodKey(rule.frequency); const t=now(), claimId=id('clm'), txId=id('tx'); try { await env.DB.batch([env.DB.prepare('INSERT INTO earn_claims (id,user_id,rule_id,period_key,created_at) VALUES (?,?,?,?,?)').bind(claimId,user.id,rule.id,key,t),loyaltyTxStatement(env,{txId,accountUserId:user.id,actorUserId:user.id,type:'earn',label:rule.name,delta:rule.points,referenceType:'earn_claim',referenceId:claimId,note:rule.description,createdAt:t})]); } catch(e){ if(String(e).toLowerCase().includes('unique'))return apiJson({error:'You have already claimed this activity for the current period.'},409); throw e; } await maybePointBadges(env,user.id,await currentBalance(env,user.id)); await audit(env,user.id,'loyalty.claim','earn_rule',rule.id,{points:rule.points}); return apiJson({ok:true,loyalty:await loyaltyData(env,user.id)}); }
async function redeemReward(request,env,user){ const b=await bodyJson(request); const reward=await env.DB.prepare('SELECT * FROM rewards WHERE id=? AND active=1').bind(text(b.rewardId,80)).first(); if(!reward)return apiJson({error:'Reward not found.'},404); const balance=await currentBalance(env,user.id); if(balance<reward.cost)return apiJson({error:`You need ${reward.cost-balance} more points.`},400); const t=now(), rid=id('red'), txid=id('tx'); try{await env.DB.batch([env.DB.prepare('INSERT INTO redemptions (id,reward_id,user_id,cost,status,redeemed_at,note) VALUES (?,?,?,?,?,?,?)').bind(rid,reward.id,user.id,reward.cost,'Redeemed',t,text(b.note,200)),loyaltyTxStatement(env,{txId:txid,accountUserId:user.id,actorUserId:user.id,type:'spend',label:`Redeemed: ${reward.name}`,delta:-reward.cost,referenceType:'redemption',referenceId:rid,note:'Loyalty reward redemption.',createdAt:t})]);}catch(e){if(String(e).toLowerCase().includes('balance_after'))return apiJson({error:'Your balance changed before this redemption completed. Refresh and try again.'},409);throw e;} await awardBadge(env,user.id,'redeemer'); await audit(env,user.id,'loyalty.redeem','reward',reward.id,{cost:reward.cost}); return apiJson({ok:true,loyalty:await loyaltyData(env,user.id)}); }
async function markRedemptionUsed(env,user,redemptionId){ const r=await env.DB.prepare('SELECT * FROM redemptions WHERE id=?').bind(redemptionId).first(); if(!r)return apiJson({error:'Redemption not found.'},404); if(user.role!=='admin'&&r.user_id!==user.id)return apiJson({error:'Not allowed.'},403); if(r.status==='Used')return apiJson({ok:true}); await env.DB.prepare("UPDATE redemptions SET status='Used',used_at=? WHERE id=?").bind(now(),redemptionId).run(); await audit(env,user.id,'loyalty.redemption_used','redemption',redemptionId,{}); return apiJson({ok:true,loyalty:await loyaltyData(env,r.user_id)}); }
async function maybePointBadges(env,userId,balance){ if(balance>=100)await awardBadge(env,userId,'points-100'); if(balance>=500)await awardBadge(env,userId,'points-500'); }
async function awardBadge(env,userId,badgeId){ await env.DB.prepare('INSERT OR IGNORE INTO user_badges (user_id,badge_id,awarded_at) SELECT ?,id,? FROM badges WHERE id=? AND active=1').bind(userId,now(),badgeId).run(); }
async function unlockSecretBadge(env,user,badgeId){ const b=await env.DB.prepare('SELECT * FROM badges WHERE id=? AND secret=1 AND active=1').bind(badgeId).first(); if(!b)return apiJson({error:'Classified item not found.'},404); await awardBadge(env,user.id,badgeId); await audit(env,user.id,'badge.secret','badge',badgeId,{}); return apiJson({ok:true,badge:b}); }

async function funData(env,userId){ const [dates,reviews,complaints,adventures,memories]=await Promise.all([
  env.DB.prepare('SELECT * FROM date_bookings WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(userId).all(),
  env.DB.prepare('SELECT * FROM reviews WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(userId).all(),
  env.DB.prepare('SELECT * FROM complaints WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(userId).all(),
  env.DB.prepare('SELECT * FROM adventures WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(userId).all(),
  env.DB.prepare('SELECT * FROM memories ORDER BY COALESCE(happened_on,created_at) DESC LIMIT 100').all()
]); return {dates:dates.results,reviews:reviews.results,complaints:complaints.results,adventures:adventures.results,memories:memories.results}; }
async function funSnapshot(env,user){ return apiJson({fun:await funData(env,user.id),dateIdeas:DATE_IDEAS,roomServiceMenu:ROOM_SERVICE_MENU}); }
async function saveDate(request,env,user){ const b=await bodyJson(request); const title=text(b.title,100); if(!title)return apiJson({error:'Date title is required.'},400); const rec={id:id('date'),title,detail:text(b.detail,300),plannedFor:text(b.plannedFor,30)||null}; await env.DB.prepare('INSERT INTO date_bookings (id,user_id,title,detail,planned_for,status,created_at) VALUES (?,?,?,?,?,?,?)').bind(rec.id,user.id,rec.title,rec.detail,rec.plannedFor,'Saved',now()).run(); await audit(env,user.id,'date.save','date_booking',rec.id,{}); return apiJson({ok:true,fun:await funData(env,user.id)},201); }
async function roomService(request,env,user){ const b=await bodyJson(request); const selected=Array.isArray(b.items)?b.items.slice(0,12):[]; if(!selected.length)return apiJson({error:'Choose at least one room-service item.'},400); const items=selected.map(x=>{const found=ROOM_SERVICE_MENU.find(m=>m.id===x.id); return found?{...found,qty:int(x.qty,1,5,1)}:null;}).filter(Boolean); if(!items.length)return apiJson({error:'No valid items selected.'},400); const orderId=id('ord'),number=orderNumber(),t=now(); const st=[env.DB.prepare('INSERT INTO orders (id,order_number,user_id,source,customer_name,delivery_method,delivery_notes,status,total_pence,points_awarded,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,0,5,?,?)').bind(orderId,number,user.id,'room-service',user.display_name,'Bear Room Service',text(b.notes,300),'Received',t,t),env.DB.prepare('INSERT INTO order_status_history (id,order_id,status,note,actor_user_id,created_at) VALUES (?,?,?,?,?,?)').bind(id('osh'),orderId,'Received','Room-service order placed.',user.id,t)]; for(const i of items)st.push(env.DB.prepare('INSERT INTO order_items (id,order_id,product_id,item_name,item_emoji,quantity,unit_price_pence) VALUES (?,?,?,?,?,?,0)').bind(id('itm'),orderId,null,i.name,i.emoji,i.qty)); st.push(loyaltyTxStatement(env,{txId:id('tx'),accountUserId:user.id,actorUserId:user.id,type:'earn',label:'Room-service checkout bonus',delta:5,referenceType:'order',referenceId:orderId,note:'Automatic room-service bonus.',createdAt:t})); await env.DB.batch(st); await awardBadge(env,user.id,'first-order'); await maybePointBadges(env,user.id,await currentBalance(env,user.id)); await audit(env,user.id,'room_service.create','order',orderId,{orderNumber:number}); return apiJson({ok:true,order:await getOrder(env,orderId),loyalty:await loyaltyData(env,user.id)},201); }
async function saveReview(request,env,user){ const b=await bodyJson(request); const rating=int(b.rating,1,5,5), body=text(b.body,2000); if(!body)return apiJson({error:'Write something in the review.'},400); const t=now(), rid=id('rev'), month=t.slice(0,7); await env.DB.prepare('INSERT INTO reviews (id,user_id,rating,title,body,month_key,created_at) VALUES (?,?,?,?,?,?,?)').bind(rid,user.id,rating,text(b.title,120),body,month,t).run(); await awardBadge(env,user.id,'reviewer'); await audit(env,user.id,'review.create','review',rid,{rating}); return apiJson({ok:true,fun:await funData(env,user.id)},201); }
async function saveComplaint(request,env,user){ const b=await bodyJson(request); const body=text(b.body,2500); if(!body)return apiJson({error:'Tell the Complaints Department what happened.'},400); const cid=id('cmp'),cn=caseNumber(),t=now(); await env.DB.prepare('INSERT INTO complaints (id,case_number,user_id,category,body,compensation_requested,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(cid,cn,user.id,text(b.category,80)||'Other serious incident',body,text(b.compensationRequested,800),'Under Bear Review',t,t).run(); await awardBadge(env,user.id,'complainer'); await audit(env,user.id,'complaint.create','complaint',cid,{caseNumber:cn}); return apiJson({ok:true,caseNumber:cn,fun:await funData(env,user.id)},201); }
async function saveAdventure(request,env,user){ const b=await bodyJson(request); const title=text(b.title,120); if(!title)return apiJson({error:'Adventure title is required.'},400); const aid=id('adv'),t=now(); await env.DB.prepare('INSERT INTO adventures (id,user_id,title,detail,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(aid,user.id,title,text(b.detail,1000),'Suggested',t,t).run(); await audit(env,user.id,'adventure.create','adventure',aid,{}); return apiJson({ok:true,fun:await funData(env,user.id)},201); }
async function updateAdventureStatus(request,env,user,adventureId){ const a=await env.DB.prepare('SELECT * FROM adventures WHERE id=?').bind(adventureId).first(); if(!a)return apiJson({error:'Adventure not found.'},404); if(user.role!=='admin'&&a.user_id!==user.id)return apiJson({error:'Not allowed.'},403); const b=await bodyJson(request); const status=text(b.status,30); if(!['Suggested','Planned','Completed'].includes(status))return apiJson({error:'Invalid status.'},400); const t=now(); if(status==='Completed'&&a.status!=='Completed'){ try{await env.DB.batch([env.DB.prepare('UPDATE adventures SET status=?,completed_at=?,updated_at=? WHERE id=?').bind(status,t,t,adventureId),loyaltyTxStatement(env,{txId:id('tx'),accountUserId:a.user_id,actorUserId:user.id,type:'earn',label:'Adventure completed',delta:50,referenceType:'adventure',referenceId:adventureId,note:a.title,createdAt:t})]);}catch(e){if(!String(e).toLowerCase().includes('unique'))throw e;} await awardBadge(env,a.user_id,'adventurer'); await maybePointBadges(env,a.user_id,await currentBalance(env,a.user_id)); } else { await env.DB.prepare('UPDATE adventures SET status=?,completed_at=?,updated_at=? WHERE id=?').bind(status,status==='Completed'?(a.completed_at||t):null,t,adventureId).run(); } await audit(env,user.id,'adventure.status','adventure',adventureId,{status}); return apiJson({ok:true,fun:await funData(env,a.user_id),loyalty:await loyaltyData(env,a.user_id)}); }

const MENU_ROOM_KEY='menu-room/private-data-v1.json';
// Append future weekly meals here; keep old entries so archived meals remain reviewable.
const MENU_MEALS=[
  {id:'menu-2026-09-28-mon-dinner',week_start:'2026-09-28',meal_date:'2026-09-28',meal_type:'dinner',display_name:'The Mongolian Submission',description:'Slow-cooked Mongolian-style lamb with jasmine rice, pak choi, courgette, carrots, spring onion and sesame, with soy, hoisin, garlic and ginger flavours.',served:1},
  {id:'menu-2026-09-28-tue-breakfast',week_start:'2026-09-28',meal_date:'2026-09-29',meal_type:'breakfast',display_name:'Tropical Tease',description:'Greek yoghurt with pineapple, banana, coconut and granola.',served:0},
  {id:'menu-2026-09-28-tue-lunch',week_start:'2026-09-28',meal_date:'2026-09-29',meal_type:'lunch',display_name:'The Dagwood Dom',description:'A fully loaded Dagwood Bumstead-style baguette.',served:0},
  {id:'menu-2026-09-28-tue-dinner',week_start:'2026-09-28',meal_date:'2026-09-29',meal_type:'dinner',display_name:'Moroccan Restraint',description:'Chicken with Moroccan-style spiced vegetables, cumin, paprika and harissa, with a cooling lemon and garlic yoghurt sauce.',served:0},
  {id:'menu-2026-09-28-wed-breakfast',week_start:'2026-09-28',meal_date:'2026-09-30',meal_type:'breakfast',display_name:'Morning Mischief',description:'Mexican-style scrambled egg tortilla with salsa, cheese and avocado.',served:0},
  {id:'menu-2026-09-28-wed-dinner',week_start:'2026-09-28',meal_date:'2026-09-30',meal_type:'dinner',display_name:'Thai Tied Salmon',description:'Thai-style salmon with rice and vegetables.',served:0},
  {id:'menu-2026-09-28-thu-breakfast',week_start:'2026-09-28',meal_date:'2026-10-01',meal_type:'breakfast',display_name:'The Korean Wake-Up Call',description:'Korean-style egg and rice with kimchi and gochujang.',served:0},
  {id:'menu-2026-09-28-thu-dinner',week_start:'2026-09-28',meal_date:'2026-10-01',meal_type:'dinner',display_name:'Red Room Chilli',description:'Rich chilli con carne.',served:0},
  {id:'menu-2026-09-28-fri-breakfast',week_start:'2026-09-28',meal_date:'2026-10-02',meal_type:'breakfast',display_name:'Greek Temptation',description:'Warm Greek-style pita with feta, tomato, cucumber, olive oil and oregano.',served:0},
  {id:'menu-2026-09-28-fri-dinner',week_start:'2026-09-28',meal_date:'2026-10-02',meal_type:'dinner',display_name:'Korean Punishment Fish & Chips',description:'Frozen fish and chips upgraded Korean-style with gochujang, honey, soy, lime, sesame, spring onion and spicy sriracha mayo.',served:0}
];
function menuRatingLabel(rating){
  if(rating===6)return 'I want to fuck you';
  if(rating===5)return 'I want to kiss you';
  return rating===1?'1 star':`${rating} stars`;
}
function strictRating(value,min,max,label){
  const n=Number(value);
  if(!Number.isInteger(n)||n<min||n>max)throw new HttpError(400,`${label} must be between ${min} and ${max}.`);
  return n;
}
function emptyMenuRoomData(){return {version:1,suggestions:[],reviews:[]};}
async function readMenuRoomData(env){
  const obj=await env.MEDIA.get(MENU_ROOM_KEY);
  if(!obj)return emptyMenuRoomData();
  try{
    const raw=JSON.parse(await obj.text());
    return {version:1,suggestions:Array.isArray(raw?.suggestions)?raw.suggestions.slice(-500):[],reviews:Array.isArray(raw?.reviews)?raw.reviews.slice(-500):[],updatedAt:raw?.updatedAt||null};
  }catch(err){
    console.warn('Menu Room data could not be read',err);
    return emptyMenuRoomData();
  }
}
async function writeMenuRoomData(env,data){
  const payload={version:1,updatedAt:now(),suggestions:Array.isArray(data.suggestions)?data.suggestions.slice(-500):[],reviews:Array.isArray(data.reviews)?data.reviews.slice(-500):[]};
  await env.MEDIA.put(MENU_ROOM_KEY,JSON.stringify(payload),{httpMetadata:{contentType:'application/json'},customMetadata:{private:'true',purpose:'menu-room'}});
  return payload;
}
function sortMenuMeals(a,b){
  if(a.week_start!==b.week_start)return String(b.week_start).localeCompare(String(a.week_start));
  if(a.meal_date!==b.meal_date)return String(a.meal_date).localeCompare(String(b.meal_date));
  const order={breakfast:1,lunch:2,dinner:3,other:4};
  return (order[a.meal_type]||9)-(order[b.meal_type]||9)||String(a.display_name).localeCompare(String(b.display_name));
}
async function menuDashboardData(env,user,data=null){
  const store=data||await readMenuRoomData(env);
  const users=(await env.DB.prepare('SELECT id,display_name FROM users WHERE active=1').all()).results;
  const names=new Map(users.map(u=>[u.id,u.display_name]));
  const mealMap=new Map(MENU_MEALS.map(m=>[m.id,{...m}]));
  for(const r of store.reviews||[])if(r.meal_snapshot?.id&&!mealMap.has(r.meal_snapshot.id))mealMap.set(r.meal_snapshot.id,{...r.meal_snapshot});
  const meals=[...mealMap.values()].sort(sortMenuMeals);
  const reviews=[...(store.reviews||[])].sort((x,y)=>String(y.updated_at||'').localeCompare(String(x.updated_at||''))).map(r=>({...r,display_name:names.get(r.user_id)||'Duck & Bear',overall_label:menuRatingLabel(Number(r.overall_rating)),photos:(Array.isArray(r.photos)?r.photos:[]).map(p=>({...p,url:`/media/${p.r2_key}`}))}));
  const rawSuggestions=user.role==='admin'?[...(store.suggestions||[])]:[...(store.suggestions||[])].filter(x=>x.user_id===user.id);
  const suggestions=rawSuggestions.sort((x,y)=>String(y.target_week_start||'').localeCompare(String(x.target_week_start||''))||String(y.created_at||'').localeCompare(String(x.created_at||''))).map(x=>({...x,display_name:names.get(x.user_id)||'Duck & Bear'}));
  return {user:safeUser(user),meals,reviews,suggestions,ratingLabels:{5:'I want to kiss you',6:'I want to fuck you'}};
}
async function menuDashboard(env,user){return apiJson(await menuDashboardData(env,user));}
async function saveMenuSuggestion(request,env,user){
  const b=await bodyJson(request);
  const title=text(b.title,140),description=text(b.description,1800),notes=text(b.notes,1000),target=text(b.targetWeekStart,10),mealType=text(b.mealType,20).toLowerCase();
  if(!title)return apiJson({error:'Give the menu idea a name.'},400);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(target))return apiJson({error:'Choose a target week.'},400);
  if(new Date(target+'T00:00:00Z').getUTCDay()!==1)return apiJson({error:'The target week must start on a Monday.'},400);
  if(!['breakfast','lunch','dinner','other'].includes(mealType))return apiJson({error:'Choose breakfast, lunch, dinner or other.'},400);
  const data=await readMenuRoomData(env),sid=id('menusug'),t=now();
  data.suggestions.push({id:sid,user_id:user.id,target_week_start:target,meal_type:mealType,title,description,notes,status:'Suggested',created_at:t,updated_at:t});
  const saved=await writeMenuRoomData(env,data);
  await audit(env,user.id,'menu.suggestion.create','menu_suggestion',sid,{targetWeekStart:target,mealType});
  return apiJson({ok:true,dashboard:await menuDashboardData(env,user,saved)},201);
}
async function updateMenuSuggestionStatus(request,env,user,suggestionId){
  if(user.role!=='admin')return apiJson({error:'Admin access required.'},403);
  const b=await bodyJson(request),status=text(b.status,20);
  if(!['Suggested','Shortlisted','Planned','Skipped'].includes(status))return apiJson({error:'Invalid menu suggestion status.'},400);
  const data=await readMenuRoomData(env),item=data.suggestions.find(x=>x.id===suggestionId);
  if(!item)return apiJson({error:'Menu suggestion not found.'},404);
  item.status=status;item.updated_at=now();
  const saved=await writeMenuRoomData(env,data);
  await audit(env,user.id,'menu.suggestion.status','menu_suggestion',suggestionId,{status});
  return apiJson({ok:true,dashboard:await menuDashboardData(env,user,saved)});
}
async function saveMenuReview(request,env,user){
  const b=await bodyJson(request),mealId=text(b.mealId,120),meal=MENU_MEALS.find(x=>x.id===mealId);
  if(!meal)return apiJson({error:'Choose a meal from the menu.'},404);
  let overall,taste,plating;
  try{
    overall=strictRating(b.overallRating,1,6,'Overall rating');
    taste=strictRating(b.tasteRating,1,5,'Taste rating');
    plating=strictRating(b.platingRating,1,5,'Plating rating');
  }catch(err){if(err instanceof HttpError)return apiJson({error:err.message},err.status);throw err;}
  const comment=text(b.comment,2500),attachments=Array.isArray(b.attachments)?b.attachments.slice(0,4):[];
  for(const a of attachments){
    const key=text(a?.key,500),type=text(a?.type,100),size=Number(a?.size||0);
    if(!key.startsWith('menu-reviews/')||!key.includes(`/${user.id}/`))return apiJson({error:'Invalid menu review photo.'},400);
    if(!['image/jpeg','image/png','image/webp','image/gif'].includes(type))return apiJson({error:'Menu reviews accept image files only.'},400);
    if(!Number.isFinite(size)||size<1||size>MAX_UPLOAD_BYTES)return apiJson({error:'Invalid menu review photo size.'},400);
  }
  const data=await readMenuRoomData(env),t=now();
  let review=data.reviews.find(x=>x.meal_id===mealId&&x.user_id===user.id),created=false;
  if(!review){
    review={id:id('menurev'),meal_id:mealId,meal_snapshot:{...meal},user_id:user.id,overall_rating:overall,taste_rating:taste,plating_rating:plating,comment,photos:[],created_at:t,updated_at:t};
    data.reviews.push(review);created=true;
  }else{
    review.meal_snapshot=review.meal_snapshot||{...meal};
    review.overall_rating=overall;review.taste_rating=taste;review.plating_rating=plating;review.comment=comment;review.updated_at=t;
    if(!Array.isArray(review.photos))review.photos=[];
  }
  const usedKeys=new Set((data.reviews||[]).flatMap(r=>(Array.isArray(r.photos)?r.photos:[]).map(p=>p.r2_key)));
  const remaining=Math.max(0,4-review.photos.length);
  for(const a of attachments.slice(0,remaining)){
    const key=text(a.key,500);if(usedKeys.has(key))continue;
    review.photos.push({id:id('menuphoto'),r2_key:key,file_name:text(a.name,160),mime_type:text(a.type,100),file_size:Number(a.size),created_at:t});usedKeys.add(key);
  }
  const saved=await writeMenuRoomData(env,data);
  await audit(env,user.id,'menu.review.save','menu_review',review.id,{mealId,overall,taste,plating});
  return apiJson({ok:true,dashboard:await menuDashboardData(env,user,saved)},created?201:200);
}

async function uploadMedia(request,env,user){ const form=await request.formData(); const file=form.get('file'); if(!(file instanceof File))return apiJson({error:'Choose a file.'},400); if(file.size<1||file.size>MAX_UPLOAD_BYTES)return apiJson({error:'Files must be 8 MB or smaller.'},400); if(!ALLOWED_UPLOAD_TYPES.has(file.type))return apiJson({error:'Allowed: JPG, PNG, WebP, GIF, MP4, WebM or PDF.'},400); const purpose=text(form.get('purpose'),40); const menuReview=purpose==='menu-review'; if(menuReview&&!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return apiJson({error:'Menu reviews accept JPG, PNG, WebP or GIF images.'},400); const ext=extensionFor(file.type),folder=menuReview?'menu-reviews':'memories'; const key=`${folder}/${new Date().toISOString().slice(0,10)}/${user.id}/${crypto.randomUUID()}${ext}`; await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type},customMetadata:{originalName:text(file.name,160),uploadedBy:user.id,purpose:menuReview?'menu-review':'memory'}}); await audit(env,user.id,menuReview?'menu.media.upload':'media.upload','r2_object',key,{name:text(file.name,160),size:file.size,type:file.type}); return apiJson({ok:true,attachment:{key,name:text(file.name,160),type:file.type,size:file.size,url:`/media/${key}`}},201); }
function extensionFor(type){ return ({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','video/mp4':'.mp4','video/webm':'.webm','application/pdf':'.pdf'})[type]||''; }
async function serveMedia(request,env,url){ const auth=await getAuth(request,env); if(url.pathname.startsWith('/media/site/'))return siteMedia(request,env,auth?.user,url.pathname.slice('/media/site/'.length)); if(auth?.user?.active && !await legacyAllowed(env,auth.user))return new Response('Forbidden',{status:403,headers:{'Cache-Control':'no-store'}}); if(!auth?.user?.active)return new Response('Unauthorized',{status:401,headers:{'Cache-Control':'no-store'}}); const key=decodeURIComponent(url.pathname.slice('/media/'.length)); if(!key.startsWith('memories/')&&!key.startsWith('menu-reviews/'))return new Response('Not found',{status:404}); const obj=await env.MEDIA.get(key); if(!obj)return new Response('Not found',{status:404}); const h=new Headers(); obj.writeHttpMetadata(h); h.set('etag',obj.httpEtag); h.set('Cache-Control','private, no-store'); h.set('X-Content-Type-Options','nosniff'); h.set('Content-Security-Policy',"default-src 'none'; sandbox"); return new Response(obj.body,{headers:h}); }
async function saveMemory(request,env,user){ const b=await bodyJson(request); const title=text(b.title,120); if(!title)return apiJson({error:'Memory title is required.'},400); let key=null,name=null,type=null,size=null; if(b.attachment?.key){ key=text(b.attachment.key,500); if(!key.includes(`/${user.id}/`) && user.role!=='admin')return apiJson({error:'Invalid attachment.'},400); name=text(b.attachment.name,160);type=text(b.attachment.type,100);size=int(b.attachment.size,0,MAX_UPLOAD_BYTES,0); }
  const mid=id('mem'),t=now(); await env.DB.prepare('INSERT INTO memories (id,user_id,title,body,happened_on,mood,attachment_key,attachment_name,attachment_type,attachment_size,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(mid,user.id,title,text(b.body,3000),text(b.happenedOn,20)||null,text(b.mood,10)||'💚',key,name,type,size,t,t).run(); await audit(env,user.id,'memory.create','memory',mid,{}); return apiJson({ok:true,fun:await funData(env,user.id)},201); }
async function deleteMemory(env,user,memoryId){ const m=await env.DB.prepare('SELECT * FROM memories WHERE id=?').bind(memoryId).first(); if(!m)return apiJson({error:'Memory not found.'},404); if(user.role!=='admin'&&m.user_id!==user.id)return apiJson({error:'Not allowed.'},403); if(m.attachment_key)await env.MEDIA.delete(m.attachment_key); await env.DB.prepare('DELETE FROM memories WHERE id=?').bind(memoryId).run(); await audit(env,user.id,'memory.delete','memory',memoryId,{}); return apiJson({ok:true,fun:await funData(env,user.id)}); }

async function adminData(env){
  const users=(await env.DB.prepare("SELECT id,username,display_name,role,active,created_at FROM users ORDER BY role,display_name").all()).results;
  const openOrders=(await env.DB.prepare("SELECT o.*,u.display_name FROM orders o JOIN users u ON u.id=o.user_id WHERE o.status NOT IN ('Delivered','Cancelled') ORDER BY o.created_at DESC LIMIT 30").all()).results;
  const complaints=(await env.DB.prepare("SELECT c.*,u.display_name FROM complaints c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 30").all()).results;
  const products=(await env.DB.prepare('SELECT * FROM products ORDER BY sort_order,name').all()).results;
  const rewards=(await env.DB.prepare('SELECT * FROM rewards ORDER BY sort_order,name').all()).results;
  const earnRules=(await env.DB.prepare('SELECT * FROM earn_rules ORDER BY sort_order,name').all()).results;
  const security=await readAccountSecurity(env),profiles=new Map(security.profiles.map(x=>[x.user_id,x]));
  const memberBalances=[];
  for(const u of users.filter(x=>x.role==='member'))memberBalances.push({userId:u.id,displayName:u.display_name,balance:await currentBalance(env,u.id),emailMasked:profiles.get(u.id)?.email?maskEmail(profiles.get(u.id).email):''});
  const userNames=new Map(users.map(u=>[u.id,u.display_name]));
  const recoveryRequests=security.recoveryRequests.filter(x=>['Pending','Emailed'].includes(x.status)&&Date.parse(x.expires_at||0)>Date.now()).sort((a,b)=>String(b.requested_at||'').localeCompare(String(a.requested_at||''))).map(x=>({...x,displayName:userNames.get(x.user_id)||'Member'}));
  return {users,openOrders,complaints,products,rewards,earnRules,memberBalances,recoveryRequests};
}
async function adminDashboard(env,user){ return apiJson({admin:await adminData(env),audit:(await env.DB.prepare('SELECT a.*,u.display_name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 100').all()).results}); }
async function adminAdjustPoints(request,env,admin){ const b=await bodyJson(request); const userId=text(b.userId,100),delta=int(b.delta,-100000,100000,0),note=text(b.note,500); if(!delta)return apiJson({error:'Adjustment cannot be zero.'},400); if(!note)return apiJson({error:'Give a reason for the adjustment.'},400); const target=await env.DB.prepare("SELECT * FROM users WHERE id=? AND active=1").bind(userId).first(); if(!target)return apiJson({error:'User not found.'},404); const bal=await currentBalance(env,userId); if(bal+delta<0)return apiJson({error:'Adjustment would make the balance negative.'},400); const t=now(); try{await loyaltyTxStatement(env,{txId:id('tx'),accountUserId:userId,actorUserId:admin.id,type:'adjustment',label:delta>0?'Admin points credit':'Admin points debit',delta,referenceType:'admin_adjustment',referenceId:id('adj'),note,createdAt:t}).run();}catch(e){if(String(e).toLowerCase().includes('balance_after'))return apiJson({error:'Adjustment would make the balance negative.'},409);throw e;} await maybePointBadges(env,userId,await currentBalance(env,userId)); await audit(env,admin.id,'loyalty.adjust','user',userId,{delta,note}); return apiJson({ok:true,loyalty:await loyaltyData(env,userId),admin:await adminData(env)}); }
function slugId(input,prefix){ const s=text(input,70).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); return s||`${prefix}-${crypto.randomUUID().slice(0,8)}`; }
async function adminCreateProduct(request,env,admin){ const b=await bodyJson(request); const name=text(b.name,120); if(!name)return apiJson({error:'Product name is required.'},400); const pid=slugId(b.id||name,'product'),t=now(); try{await env.DB.prepare('INSERT INTO products (id,name,emoji,category,blurb,description,stock_label,rating,featured,active,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(pid,name,text(b.emoji,10)||'🎁',text(b.category,60)||'Other',text(b.blurb,240),text(b.description,1500),text(b.stockLabel,100)||'In stock',Number(b.rating)||5,b.featured?1:0,b.active===false?0:1,int(b.sortOrder,0,9999,100),t,t).run();}catch(e){return apiJson({error:'That product ID already exists.'},409);} await audit(env,admin.id,'product.create','product',pid,{name}); return apiJson({ok:true,admin:await adminData(env)},201); }
async function adminUpdateProduct(request,env,admin,pid){ const b=await bodyJson(request); const p=await env.DB.prepare('SELECT * FROM products WHERE id=?').bind(pid).first(); if(!p)return apiJson({error:'Product not found.'},404); const t=now(); await env.DB.prepare('UPDATE products SET name=?,emoji=?,category=?,blurb=?,description=?,stock_label=?,rating=?,featured=?,active=?,sort_order=?,updated_at=? WHERE id=?').bind(text(b.name,120)||p.name,text(b.emoji,10)||p.emoji,text(b.category,60)||p.category,text(b.blurb,240),text(b.description,1500),text(b.stockLabel,100)||p.stock_label,Number(b.rating)||p.rating,b.featured===undefined?p.featured:(b.featured?1:0),b.active===undefined?p.active:(b.active?1:0),int(b.sortOrder,0,9999,p.sort_order),t,pid).run(); await audit(env,admin.id,'product.update','product',pid,{}); return apiJson({ok:true,admin:await adminData(env)}); }
async function adminCreateReward(request,env,admin){ const b=await bodyJson(request),name=text(b.name,120); if(!name)return apiJson({error:'Reward name is required.'},400); const rid=slugId(b.id||name,'reward'),t=now(),cost=int(b.cost,1,100000,50); try{await env.DB.prepare('INSERT INTO rewards (id,name,emoji,cost,description,active,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(rid,name,text(b.emoji,10)||'🎁',cost,text(b.description,1000),b.active===false?0:1,int(b.sortOrder,0,9999,100),t,t).run();}catch{return apiJson({error:'That reward ID already exists.'},409);} await audit(env,admin.id,'reward.create','reward',rid,{cost}); return apiJson({ok:true,admin:await adminData(env)},201); }
async function adminUpdateReward(request,env,admin,rid){ const b=await bodyJson(request); const r=await env.DB.prepare('SELECT * FROM rewards WHERE id=?').bind(rid).first(); if(!r)return apiJson({error:'Reward not found.'},404); await env.DB.prepare('UPDATE rewards SET name=?,emoji=?,cost=?,description=?,active=?,sort_order=?,updated_at=? WHERE id=?').bind(text(b.name,120)||r.name,text(b.emoji,10)||r.emoji,int(b.cost,1,100000,r.cost),text(b.description,1000),b.active===undefined?r.active:(b.active?1:0),int(b.sortOrder,0,9999,r.sort_order),now(),rid).run(); await audit(env,admin.id,'reward.update','reward',rid,{}); return apiJson({ok:true,admin:await adminData(env)}); }
async function adminUpdateEarnRule(request,env,admin,rid){ const b=await bodyJson(request); const r=await env.DB.prepare('SELECT * FROM earn_rules WHERE id=?').bind(rid).first(); if(!r)return apiJson({error:'Earn rule not found.'},404); const freq=['daily','weekly','once','unlimited'].includes(b.frequency)?b.frequency:r.frequency; await env.DB.prepare('UPDATE earn_rules SET name=?,emoji=?,points=?,frequency=?,description=?,active=?,sort_order=? WHERE id=?').bind(text(b.name,120)||r.name,text(b.emoji,10)||r.emoji,int(b.points,1,100000,r.points),freq,text(b.description,1000),b.active===undefined?r.active:(b.active?1:0),int(b.sortOrder,0,9999,r.sort_order),rid).run(); await audit(env,admin.id,'earn_rule.update','earn_rule',rid,{}); return apiJson({ok:true,admin:await adminData(env)}); }
async function adminUpdateComplaint(request,env,admin,cid){ const b=await bodyJson(request); const c=await env.DB.prepare('SELECT * FROM complaints WHERE id=?').bind(cid).first(); if(!c)return apiJson({error:'Complaint not found.'},404); await env.DB.prepare('UPDATE complaints SET status=?,resolution=?,updated_at=? WHERE id=?').bind(text(b.status,80)||c.status,text(b.resolution,2000),now(),cid).run(); await audit(env,admin.id,'complaint.update','complaint',cid,{status:text(b.status,80)}); return apiJson({ok:true,admin:await adminData(env)}); }
async function adminResetPassword(request,env,admin,userId){
  const b=await bodyJson(request),next=String(b.newPassword||'');
  if(next.length<8||next.length>128)return apiJson({error:'New password must be 8–128 characters.'},400);
  const target=await env.DB.prepare("SELECT * FROM users WHERE id=? AND role='member'").bind(userId).first();
  if(!target)return apiJson({error:'Member account not found.'},404);
  const h=await hashPassword(next),t=now();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash=?,password_salt=?,password_iterations=?,updated_at=? WHERE id=?').bind(h.hash,h.salt,h.iterations,t,userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId)
  ]);
  try{
    const security=await readAccountSecurity(env);
    for(const r of security.recoveryRequests)if(r.user_id===userId&&['Pending','Emailed'].includes(r.status)){r.status='Resolved';r.updated_at=t;}
    for(const token of security.resetTokens)if(token.user_id===userId&&token.status==='Pending'){token.status='Revoked';token.updated_at=t;}
    await writeAccountSecurity(env,security);
  }catch(err){console.warn('Recovery request cleanup failed',err);}
  await audit(env,admin.id,'admin.password_reset','user',userId,{});
  return apiJson({ok:true});
}
async function adminAudit(env){ return apiJson({audit:(await env.DB.prepare('SELECT a.*,u.display_name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 300').all()).results}); }
async function audit(env,actor,action,entityType,entityId,detail){ try{await env.DB.prepare('INSERT INTO audit_log (id,actor_user_id,action,entity_type,entity_id,detail_json,created_at) VALUES (?,?,?,?,?,?,?)').bind(id('aud'),actor||null,action,entityType,entityId||null,JSON.stringify(detail||{}).slice(0,4000),now()).run();}catch(e){console.warn('Audit write failed',e);} }

async function exportOrdersCsv(env,user){ const orders=await ordersWithItems(env,user,user.role==='admin'?null:user.id,1000); const rows=[['Order Number','Date','Customer','Source','Status','Items','Total']]; for(const o of orders)rows.push([o.order_number,o.created_at,o.customer_name,o.source,o.status,o.items.map(i=>`${i.item_name} x${i.quantity}`).join(' | '),'£0.00']); return csvResponse(rows,'duck-bear-orders.csv'); }
async function exportLoyaltyCsv(env,user,targetId){ let uid=user.id; if(user.role==='admin'&&targetId)uid=targetId; const tx=(await env.DB.prepare('SELECT * FROM loyalty_transactions WHERE account_user_id=? ORDER BY created_at').bind(uid).all()).results; const rows=[['Transaction ID','Date','Type','Label','Change','Balance After','Reference Type','Reference ID','Note']]; for(const t of tx)rows.push([t.id,t.created_at,t.type,t.label,t.delta,t.balance_after,t.reference_type||'',t.reference_id||'',t.note||'']); return csvResponse(rows,'yaya-loyalty-history.csv'); }
function csvResponse(rows,name){ const esc=v=>`"${String(v??'').replaceAll('"','""')}"`; const body='\uFEFF'+rows.map(r=>r.map(esc).join(',')).join('\r\n'); return new Response(body,{headers:{...apiHeaders({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${name}"`})}}); }
async function exportBackup(env,user){
  const uid=user.id;
  const orders=await ordersWithItems(env,user,user.role==='admin'?null:uid,1000);
  for(const o of orders) o.statusHistory=(await env.DB.prepare('SELECT status,note,actor_user_id,created_at FROM order_status_history WHERE order_id=? ORDER BY created_at').bind(o.id).all()).results;
  let data;
  if(user.role==='admin'){
    const [users,loyaltyTransactions,redemptions,earnClaims,userBadges,dates,reviews,complaints,adventures,memories,favourites,cart,products,rewards,earnRules,badges,auditRows]=await Promise.all([
      env.DB.prepare('SELECT id,username,display_name,role,active,created_at,updated_at FROM users ORDER BY role,display_name').all(),
      env.DB.prepare('SELECT * FROM loyalty_transactions ORDER BY created_at,rowid').all(),
      env.DB.prepare('SELECT * FROM redemptions ORDER BY redeemed_at').all(),
      env.DB.prepare('SELECT * FROM earn_claims ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM user_badges ORDER BY awarded_at').all(),
      env.DB.prepare('SELECT * FROM date_bookings ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM reviews ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM complaints ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM adventures ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM memories ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM favourites ORDER BY created_at').all(),
      env.DB.prepare('SELECT * FROM cart_items ORDER BY updated_at').all(),
      env.DB.prepare('SELECT * FROM products ORDER BY sort_order,name').all(),
      env.DB.prepare('SELECT * FROM rewards ORDER BY sort_order,name').all(),
      env.DB.prepare('SELECT * FROM earn_rules ORDER BY sort_order,name').all(),
      env.DB.prepare('SELECT * FROM badges ORDER BY name').all(),
      env.DB.prepare('SELECT * FROM audit_log ORDER BY created_at').all()
    ]);
    data={version:4,exportedAt:now(),scope:'full-admin-backup',users:users.results,orders,loyaltyTransactions:loyaltyTransactions.results,redemptions:redemptions.results,earnClaims:earnClaims.results,userBadges:userBadges.results,dates:dates.results,reviews:reviews.results,complaints:complaints.results,adventures:adventures.results,memories:memories.results,favourites:favourites.results,cart:cart.results,catalog:{products:products.results,rewards:rewards.results,earnRules:earnRules.results,badges:badges.results},audit:auditRows.results};
  }else{
    data={version:4,exportedAt:now(),scope:'member-backup',user:safeUser(user),orders,loyalty:await loyaltyData(env,uid),fun:await funData(env,uid),favourites:(await env.DB.prepare('SELECT product_id,created_at FROM favourites WHERE user_id=?').bind(uid).all()).results,cart:(await env.DB.prepare('SELECT product_id,quantity,updated_at FROM cart_items WHERE user_id=?').bind(uid).all()).results};
  }
  data.menuRoom=await menuDashboardData(env,user);
  const security=await readAccountSecurity(env),profile=security.profiles.find(x=>x.user_id===user.id);
  data.accountSecurity=user.role==='admin'
    ?{profiles:security.profiles.map(x=>({userId:x.user_id,email:x.email,updatedAt:x.updated_at})),recoveryRequests:security.recoveryRequests.map(x=>({id:x.id,userId:x.user_id,emailMasked:x.email_masked,status:x.status,delivery:x.delivery,requestedAt:x.requested_at,expiresAt:x.expires_at}))}
    :{email:profile?.email||'',updatedAt:profile?.updated_at||null};
  return new Response(JSON.stringify(data,null,2),{headers:apiHeaders({'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="duck-bear-backup.json"'})});
}

const TIERS=[
  {name:'Bronze Duck',min:0,emoji:'🦆'},
  {name:'Silver Duck',min:250,emoji:'🥈'},
  {name:'Golden Bear',min:750,emoji:'🐻'},
  {name:'Platinum Yaya',min:1500,emoji:'💚'},
  {name:'Diamond Menace',min:3000,emoji:'💎'}
];
const DATE_IDEAS=[
  {emoji:'🦈',title:'Aquarium + ridiculous fish commentary',detail:'Find the weirdest fish and assign it a job.'},
  {emoji:'🍜',title:'Pick-a-country dinner night',detail:'Random country, food from there, no backing out.'},
  {emoji:'🎬',title:'Cinema + unnecessary snacks',detail:'Film first, review committee immediately afterwards.'},
  {emoji:'🚲',title:'Mini cycling adventure',detail:'Somewhere new, snacks packed, navigation competence optional.'},
  {emoji:'🦙',title:'Animal encounter day',detail:'Preferably one with fewer alpaca-related surprises.'},
  {emoji:'🧁',title:'Dessert crawl',detail:'Two or three places. Share everything. Judge harshly.'},
  {emoji:'🎨',title:'Make terrible art together',detail:'Buy cheap supplies and create something neither of you can explain.'},
  {emoji:'🌙',title:'Late-night city wander',detail:'Food, photos and one destination neither of you has visited.'}
];
const ROOM_SERVICE_MENU=[
  {id:'salmon',emoji:'🐟',name:'Salmon breakfast plate'},
  {id:'halloumi',emoji:'🧀',name:'Halloumi'},
  {id:'hashbrowns',emoji:'🥔',name:'Hash browns'},
  {id:'eggs',emoji:'🍳',name:'Eggs'},
  {id:'toast',emoji:'🍞',name:'Toast'},
  {id:'fruit',emoji:'🫐',name:'Fruit & berries'},
  {id:'orange',emoji:'🍊',name:'Fresh orange juice'},
  {id:'coffee',emoji:'☕',name:'Coffee / tea'}
];
