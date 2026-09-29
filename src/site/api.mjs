import {VERSION,BUILD,SiteError,fail,json,siteAccess,schemaReady} from './core.mjs';
import {usersRoute,permissionsRoute,partnerRoute} from './users.mjs';
import {upload,serveSiteMedia,artworkRoute} from './media.mjs';
import {recordsRoute,copyWeek,familyLinks} from './records.mjs';
export async function routeSiteApi(request,env,user,helpers={}){
 try{
  const url=new URL(request.url),parts=url.pathname.slice('/api/site/'.length).split('/').filter(Boolean);
  if(parts[0]==='health'&&parts.length===1&&request.method==='GET')return json({ok:true,version:VERSION,build:BUILD,schemaReady:await schemaReady(env)});
  if(parts[0]==='public'&&parts.length===1&&request.method==='GET'){
   const cover=await schemaReady(env)?await env.DB.prepare("SELECT a.alt,m.id FROM site_artwork a JOIN site_media m ON m.id=a.media_id WHERE a.slot='home' AND a.published=1 AND m.section='artwork'").first():null;
   return json({version:VERSION,build:BUILD,cover:cover?{alt:cover.alt,url:'/media/site/'+cover.id}:null});
  }
  if(!user?.active)fail(401,'Please sign in.');
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('Origin')!==url.origin)fail(403,'A same-origin request is required.');
  if(parts[0]==='me'&&parts.length===1&&request.method==='GET'){
   const access=await siteAccess(env,user);const covers=(await env.DB.prepare('SELECT a.slot,a.alt,m.id FROM site_artwork a JOIN site_media m ON m.id=a.media_id').all()).results.filter(c=>c.slot==='home'||access[c.slot]);
   return json({user:helpers.safeUser(user),access,security:await helpers.accountSecurityForUser(env,user),version:VERSION,build:BUILD,covers:covers.map(c=>({slot:c.slot,alt:c.alt,url:'/media/site/'+c.id}))});
  }
  if(parts[0]==='users'&&parts.length<=2)return await usersRoute(request,env,user,parts,helpers);
  if(parts[0]==='permissions'&&parts.length===2)return await permissionsRoute(request,env,user,parts[1],helpers);
  if(parts[0]==='partner'&&parts.length===1)return await partnerRoute(request,env,user,helpers);
  if(parts[0]==='media'&&parts.length===1)return await upload(request,env,user,helpers);
  if(parts[0]==='artwork'&&parts.length<=2)return await artworkRoute(request,env,user,parts[1],helpers);
  if(parts[0]==='family'){
   if(parts[1]==='people'&&parts.length<=3)return await recordsRoute(request,env,user,'people',parts[2],helpers);
   if(parts[1]==='links'&&parts.length<=3)return await familyLinks(request,env,user,parts[2],helpers);
  }
  if(parts[0]==='weeks'&&parts.length===3&&parts[2]==='copy')return await copyWeek(request,env,user,parts[1],helpers);
  if(['recipes','weeks','scrapbook'].includes(parts[0])&&parts.length<=2)return await recordsRoute(request,env,user,parts[0],parts[1],helpers);
  fail(404,'Not found.');
 }catch(e){if(e instanceof SiteError)return json({error:e.message},e.status);throw e;}
}
export async function siteMedia(request,env,user,id){try{return await serveSiteMedia(request,env,user,id);}catch(e){if(e instanceof SiteError)return json({error:e.message},e.status);throw e;}}
export async function seedInitialPair(env,ownerId,partnerId){
 if(!await schemaReady(env))return;
 await env.DB.batch([
  env.DB.prepare("INSERT OR IGNORE INTO site_owners(user_id,slot) VALUES(?,'owner')").bind(ownerId),
  env.DB.prepare("INSERT OR IGNORE INTO site_owners(user_id,slot) VALUES(?,'partner')").bind(partnerId),
  env.DB.prepare('INSERT OR IGNORE INTO site_legacy_users(user_id) VALUES(?)').bind(ownerId),
  env.DB.prepare('INSERT OR IGNORE INTO site_legacy_users(user_id) VALUES(?)').bind(partnerId)
 ]);
}
