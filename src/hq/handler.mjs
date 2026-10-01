import {publicPasskeys,privatePasskeys} from './passkeys.mjs';
import {resolveRoute} from '../../public/hq/routes.mjs';
import {extrasApi,publicSite,publicMenuPage} from './extras.mjs';
import {migrate} from './readiness.mjs';
import {backupApi} from './backup.mjs';
import {mediaApi,publicMedia} from './media.mjs';
import {adminAccounts} from './admin-accounts.mjs';
import {mailReady} from './email.mjs';
import {publicAuth,accountApi} from './auth.mjs';
import {BUILD,VERSION,SECTIONS,HttpError,fail,json,headers,authenticate,safeUser,sameOrigin,body,queryAll,now,ref,choice} from './core.mjs';
import {initialise,schemaReady,legacyPair,permission,permissionsForUser,requireAccess,requireOwner,pairOnly} from './schema.mjs';
import {getRecord,listRecords,createRecord,updateRecord,deleteRecord,restoreRecord,history,publishWeek,copyWeek,vote,pollResults} from './records.mjs';

const SHELL_ROOTS=['info','about','adults-only','hub','our-space','family-tree','scrapbook','plans','image-library','settings','admin','shop','orders','points','sign-in','reset-password','verify-email','accept-invitation'];
export function isHqPath(path){return /^\/(account(?:\.html)?|legacy-account)\/?$/.test(path)||SHELL_ROOTS.some(r=>path==='/'+r||path.startsWith('/'+r+'/'))||/^\/menus\/(planner|ideas|recipes|reviews|shopping|weeks|meals)(\/|$)/.test(path)||/^\/menus\/member\/?$/.test(path);}
function isLegacyPrivate(path){return path.startsWith('/media/')||path.startsWith('/api/')&&!['/api/health','/api/setup','/api/setup/status','/api/auth/login','/api/auth/recovery/request','/api/auth/recovery/reset'].includes(path)&&!path.startsWith('/api/hq/')&&!path.startsWith('/api/public/')&&!path.startsWith('/api/mango/');}
async function me(env,user){
 const [access,prefs,identity]=await Promise.all([
  permissionsForUser(env,user),
  env.DB.prepare('SELECT revision,data FROM hq_prefs WHERE user_id=?').bind(user.id).first(),
  env.DB.prepare('SELECT email,verified,pending_email FROM hq_identity WHERE user_id=?').bind(user.id).first()
 ]);
 return {...(access.intimate.pair?{ratingLabels:{5:'I want to kiss you',6:'I want to fuck you'}}:{}),user:safeUser(user),owner:access.intimate.owner,pair:access.intimate.pair,access,preferences:prefs?JSON.parse(prefs.data):{},preferencesRevision:prefs?.revision||0,email:identity||{email:'',verified:0,pending_email:''},emailConfigured:mailReady(env),version:VERSION,build:BUILD};}
async function changeGrant(env,user,section,userId,b){if(!['family','menus','plans'].includes(section))fail(403,'This section cannot be shared.');const access=await requireAccess(env,user,section,'manage');const role=choice(b.role,['none','read','contribute','edit','manage']);if(!access.owner&&role==='manage')fail(403,'Only the owner can appoint access managers.');const target=await env.DB.prepare('SELECT id FROM users WHERE id=? AND active=1').bind(userId).first();if(!target)fail(404,'User not found.');if(await env.DB.prepare('SELECT role FROM hq_pair WHERE user_id=?').bind(userId).first())fail(400,'The household pair does not need a section grant.');if(role==='none')await env.DB.prepare('DELETE FROM hq_grants WHERE user_id=? AND section=?').bind(userId,section).run();else await env.DB.prepare('INSERT INTO hq_grants(user_id,section,role,can_export,updated_by,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,section) DO UPDATE SET role=excluded.role,can_export=excluded.can_export,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(userId,section,role,b.export===true?1:0,user.id,now()).run();return {ok:true};}
async function api(request,env,user,url){
 const passkey=await privatePasskeys(request,env,user,url);if(passkey)return passkey;
 const admin=await adminAccounts(request,env,user,url);if(admin)return admin;
 const extra=await extrasApi(request,env,user,url);if(extra)return extra;
 const backup=await backupApi(request,env,user,url);if(backup)return backup;
 const media=await mediaApi(request,env,user,url);if(media)return media;
 const account=await accountApi(request,env,user,url);if(account)return account;
 const path=url.pathname,method=request.method;let m;
 if(path==='/api/hq/me'&&method==='GET')return json(await me(env,user));
 if(path==='/api/hq/records'&&method==='GET')return json(await listRecords(env,user,{kind:url.searchParams.get('kind')||undefined,section:url.searchParams.get('section')||undefined,parent:url.searchParams.get('parent')||undefined,search:url.searchParams.get('q')||'',cursor:url.searchParams.get('cursor')||'0',limit:Number(url.searchParams.get('limit')||60),trash:url.searchParams.get('trash')==='1'}));
 if(path==='/api/hq/records'&&method==='POST'){const b=await body(request);return json({record:await createRecord(env,user,b.kind,b.data)},201);}
 m=path.match(/^\/api\/hq\/records\/([\w-]+)(?:\/(history|restore))?$/);
 if(m){if(m[2]==='history'&&method==='GET')return json(await history(env,user,m[1]));if(m[2]==='restore'&&method==='POST'){const b=await body(request);return json({record:await restoreRecord(env,user,m[1],b.revision,b.sourceRevision)});}if(!m[2]&&method==='GET')return json({record:await getRecord(env,user,m[1])});if(!m[2]&&method==='PUT'){const b=await body(request);return json({record:await updateRecord(env,user,m[1],b.revision,b.data)});}if(!m[2]&&method==='DELETE'){const b=await body(request);return json(await deleteRecord(env,user,m[1],b.revision));}}
 m=path.match(/^\/api\/hq\/weeks\/([\w-]+)\/(publish|copy)$/);if(m&&method==='POST'){const b=await body(request);if(m[2]==='publish'){await requireOwner(env,user);return json({week:await publishWeek(env,user,m[1],b.revision)});}return json({week:await copyWeek(env,user,m[1],b.start)},201);}
 m=path.match(/^\/api\/hq\/polls\/([\w-]+)(\/vote)?$/);if(m){if(m[2]&&method==='POST')return json(await vote(env,user,m[1],(await body(request)).choice));if(!m[2]&&method==='GET')return json(await pollResults(env,user,m[1]));}
 m=path.match(/^\/api\/hq\/access\/(family|scrapbook|menus|plans)\/([\w-]+)$/);if(m&&method==='PUT')return json(await changeGrant(env,user,m[1],m[2],await body(request)));
 if(path==='/api/hq/favourites'&&method==='GET')return json(await listRecords(env,user,{favourites:true}));
 m=path.match(/^\/api\/hq\/favourites\/([\w-]+)$/);if(m&&method==='PUT'){await getRecord(env,user,m[1]);const b=await body(request);if(b.saved===true)await env.DB.prepare('INSERT OR IGNORE INTO hq_favourites VALUES(?,?,?)').bind(user.id,m[1],now()).run();else await env.DB.prepare('DELETE FROM hq_favourites WHERE user_id=? AND record_id=?').bind(user.id,m[1]).run();return json({ok:true});}
 fail(404,'This page or action does not exist.');
}
async function publicApi(request,env,url){
 if(request.method!=='GET')fail(405,'Use GET.');
 if(url.pathname==='/api/public/hq/site')return json(await publicSite(env));
 if(await schemaReady(env)){const image=await publicMedia(request,env,url);if(image)return image;}
 if(!(await schemaReady(env)))return json({weeks:[],week:null,version:VERSION},200,{'cache-control':'no-store'});
 if(url.pathname==='/api/public/hq/menus'){const rows=await queryAll(env.DB,"SELECT data FROM hq_records WHERE kind='week' AND deleted_at IS NULL AND json_extract(data,'$.status')='published' ORDER BY json_extract(data,'$.start') DESC");return json({weeks:rows.map(x=>{const d=JSON.parse(x.data);return {start:d.start,title:d.title};})},200,{'cache-control':'no-store'});}
 const m=url.pathname.match(/^\/api\/public\/hq\/menus\/(\d{4}-\d{2}-\d{2})$/);if(m){const row=await env.DB.prepare("SELECT data FROM hq_records WHERE kind='week' AND deleted_at IS NULL AND json_extract(data,'$.start')=? AND json_extract(data,'$.status')='published'").bind(m[1]).first();if(!row)fail(404,'That published menu is not available.');const snapshot=JSON.parse(row.data).snapshot;return json({week:{...snapshot,meals:snapshot.meals.map(({id,date,course,title,description,served})=>({id,date,course,title,description,served}))}},200,{'cache-control':'no-store'});}
 fail(404,'Not found.');
}
export function createHqHandler(fallback){return {async fetch(request,env,ctx){
 const url=new URL(request.url),path=url.pathname;
 try{
  const passkeyResponse=await publicPasskeys(request,env,url);if(passkeyResponse)return passkeyResponse;
  const authResponse=await publicAuth(request,env,url);if(authResponse)return authResponse;
  if(['/api/account/email','/api/account/password','/api/auth/logout'].includes(path)){sameOrigin(request);const u=await authenticate(request,env);if(!u)fail(401,'Please sign in.');await initialise(env,u);const r=await accountApi(request,env,u,url);if(r)return r;fail(405,'Use POST.');}
  if(path.startsWith('/api/public/hq/'))return await publicApi(request,env,url);
  if(path.startsWith('/api/hq/')){sameOrigin(request);const user=await authenticate(request,env);if(!user)fail(401,'Please sign in.');await initialise(env,user);await migrate(env,user);return await api(request,env,user,url);}
  if(/^\/api\/hub(?:\/|$)/.test(path)){sameOrigin(request);const user=await authenticate(request,env);if(!user)fail(401,'Please sign in.');await initialise(env,user);await migrate(env,user);await pairOnly(env,user);return json({error:'Private Home has moved to Our Space. Open the new page to view or edit these records.',code:'home_moved',location:'/our-space/'},409);}
  if(/^\/(?:info|about|adults-only)(?:\/|$)/.test(path)){const user=await authenticate(request,env);if(!user)return new Response(null,{status:302,headers:{...headers('text/html; charset=utf-8'),location:'/sign-in/?next='+encodeURIComponent(path+url.search)}});}
  if(isLegacyPrivate(path)){sameOrigin(request);const user=await authenticate(request,env);if(!user)fail(401,'Please sign in.');await pairOnly(env,user);}
  const menuPage=await publicMenuPage(request,env,url);if(menuPage)return menuPage;
  if(path==='/legacy-account'){if(!['GET','HEAD'].includes(request.method))fail(405,'Use GET.');const a=await env.ASSETS.fetch(new Request(new URL('/account.html',url)));return new Response(request.method==='HEAD'?null:a.body,{headers:headers('text/html; charset=utf-8')});}
  if(isHqPath(path)){if(!['GET','HEAD'].includes(request.method))fail(405,'Use GET.');const asset=await env.ASSETS.fetch(new Request(new URL('/hq/index.html',url),{method:'GET'}));return new Response(request.method==='HEAD'?null:asset.body,{status:resolveRoute(path).view==='notFound'?404:asset.status,headers:{...headers('text/html; charset=utf-8'),'content-security-policy':"default-src 'self'; img-src 'self' data: blob: https://commons.wikimedia.org https://upload.wikimedia.org; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-src https://calendar.google.com https://accounts.google.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"}});}
  return await fallback.fetch(request,env,ctx);
 }catch(e){if(e instanceof HttpError)return json({error:e.message,code:e.code||undefined},e.status);console.error('HQ operation failed',e.name);return json({error:'This change could not be saved. Please retry; your text is still here.'},500);}
}};}
