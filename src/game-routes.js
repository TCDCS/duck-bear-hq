// Public games and catalogue; all private account routes retain the original Worker.
import {routeMultiplayer,json} from './multiplayer/gateway.mjs';
import {routeDanaoMultiplayer} from './danao/gateway.mjs';
import {routeMeowWarsMultiplayer} from './meow-wars/gateway.mjs';
import {routeDanaoApi} from './danao/api.mjs';
const ROOTS=['/games/wacky-races','/games/proper-karted'];
const DANAO_RELEASE_PREFIX='/api/danao/release/';
const DANAO_RELEASE_FILES=new Set(['Danao.loader.js','Danao.data','Danao.framework.js','Danao.wasm']);
const DANAO_RELEASE_REPO='TCDCS/duck-bear-hq';
const DANAO_RELEASE_WORKFLOW='.github/workflows/danao-release.yml';
function headers(url,type='text/plain; charset=utf-8') {
  const socket=(url.protocol==='https:'?'wss://':'ws://')+url.host;
  return {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':`default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: https://incompetech.com https://www.incompetech.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ${socket}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
    'Permissions-Policy':'accelerometer=(self), gyroscope=(self), magnetometer=(), camera=(), microphone=(), geolocation=(), payment=(), usb=()'};
}
function withDanaoWebAssemblyPolicy(response,url){
  const h=new Headers(response.headers);
  const policy=headers(url,'text/html; charset=utf-8')['Content-Security-Policy'].replace("script-src 'self';","script-src 'self' 'wasm-unsafe-eval';");
  h.set('Content-Security-Policy',policy);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:h});
}
function buildType(path){const p=path.replace(/\.(br|gz)$/,'');if(p.endsWith('.wasm'))return'application/wasm';if(p.endsWith('.js'))return'application/javascript; charset=utf-8';if(p.endsWith('.json'))return'application/json; charset=utf-8';if(p.endsWith('.data'))return'application/octet-stream';return'application/octet-stream';}
async function serveDanaoBuild(request,env,path){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const prefix='/game-builds/danao/web/';const suffix=path.slice(prefix.length);if(!suffix||suffix.includes('..')||!/^[-A-Za-z0-9_./]+$/.test(suffix))return new Response('Build file not found.',{status:404});
 if(!env.MEDIA?.get)return new Response('Danao Web build storage is unavailable.',{status:503});
 const object=await env.MEDIA.get('danao/web/'+suffix);if(!object)return new Response('Build file not found.',{status:404,headers:{'Cache-Control':'no-store'}});
 const h=new Headers({'Content-Type':buildType(suffix),'Cache-Control':suffix.startsWith('current/')?'public, max-age=300':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});
 if(suffix.endsWith('.br'))h.set('Content-Encoding','br');else if(suffix.endsWith('.gz'))h.set('Content-Encoding','gzip');if(object.httpEtag)h.set('ETag',object.httpEtag);
 return new Response(request.method==='HEAD'?null:object.body,{status:200,headers:h});
}
async function githubReleaseJson(url,token){
 try{
  const response=await fetch(url,{headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'duck-bear-danao-release'}});
  if(!response.ok)return null;
  return await response.json();
 }catch{return null;}
}
async function verifyDanaoRelease(request){
 const authorization=request.headers.get('Authorization')||'';
 const match=/^Bearer\s+(.+)$/i.exec(authorization);
 if(!match||match[1].length<8)return {error:json({error:'GitHub Actions authentication required.'},401)};
 const token=match[1];
 const runId=request.headers.get('X-Danao-Run-Id')||'';
 const commit=(request.headers.get('X-Danao-Commit')||'').toLowerCase();
 if(!/^\d+$/.test(runId)||! /^[0-9a-f]{40}$/.test(commit))return {error:json({error:'Invalid release identity.'},400)};
 const run=await githubReleaseJson(`https://api.github.com/repos/${DANAO_RELEASE_REPO}/actions/runs/${runId}`,token);
 if(!run)return {error:json({error:'GitHub Actions authentication failed.'},401)};
 const active=['queued','in_progress','waiting','requested','pending'].includes(String(run.status||''));
 if(Number(run.id)!==Number(runId)||run.repository?.full_name!==DANAO_RELEASE_REPO||run.path!==DANAO_RELEASE_WORKFLOW||run.head_branch!=='main'||String(run.head_sha||'').toLowerCase()!==commit||!['push','workflow_dispatch'].includes(run.event)||!active){
  return {error:json({error:'Release workflow identity rejected.'},403)};
 }
 const main=await githubReleaseJson(`https://api.github.com/repos/${DANAO_RELEASE_REPO}/commits/main`,token);
 if(!main)return {error:json({error:'Could not verify current main.'},401)};
 if(String(main.sha||'').toLowerCase()!==commit)return {error:json({error:'Release commit is no longer current main.'},409)};
 return {runId,commit};
}
async function routeDanaoRelease(request,env,path){
 const name=path.slice(DANAO_RELEASE_PREFIX.length);
 if(name==='health'){
  if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
  return json({ok:true,auth:'github-actions'});
 }
 if(!DANAO_RELEASE_FILES.has(name))return json({error:'Release file not found.'},404);
 if(request.method!=='PUT')return new Response(null,{status:405,headers:{Allow:'PUT'}});
 if(!env.MEDIA?.put)return json({error:'Danao Web build storage is unavailable.'},503);
 if(!request.body)return json({error:'Release body required.'},400);
 const verified=await verifyDanaoRelease(request);
 if(verified.error)return verified.error;
 await env.MEDIA.put(`danao/web/current/${name}`,request.body,{httpMetadata:{contentType:buildType(name)},customMetadata:{commit:verified.commit,runId:verified.runId}});
 return new Response(JSON.stringify({ok:true,file:name,commit:verified.commit}),{status:201,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
async function currentUser(request,env) {
  const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('db_session=')),token=cookie?.slice(11);
  if(!token||token.length>256)return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const hash=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const row=await env.DB.prepare('SELECT u.id,u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1').bind(hash,new Date().toISOString()).first();
  return row?{id:String(row.id),active:Number(row.active)===1}:null;
}
export function createGameHandler({assets,fallback}) {
  if(!(assets instanceof Map)||typeof fallback?.fetch!=='function')throw new TypeError('Game assets and an existing Worker are required.');
  return {async fetch(request,env,ctx){
    const url=new URL(request.url);let path;try{path=decodeURIComponent(url.pathname);}catch{path=url.pathname;}
    if(path.startsWith('/game-builds/danao/web/'))return serveDanaoBuild(request,env,path);
    if(path.startsWith('/api/races/'))return routeMultiplayer(request,env);
    if(path.startsWith('/api/meow-wars/'))return routeMeowWarsMultiplayer(request,env);
    if(path.startsWith(DANAO_RELEASE_PREFIX))return routeDanaoRelease(request,env,path);
    if(path==='/api/danao/profile'){
      let user=null;try{user=await currentUser(request,env);}catch{/* API returns signed-out semantics when session lookup is unavailable. */}
      return routeDanaoApi(request,env,user);
    }
    if(path.startsWith('/api/danao/'))return routeDanaoMultiplayer(request,env);
    if(path==='/api/public/session'){
      if(request.method!=='GET')return json({error:'Use GET.'},405);
      try{return json({signedIn:Boolean((await currentUser(request,env))?.active)});}catch{return json({signedIn:false});}
    }
    if(path==='/api/public/catalogue'){
      if(request.method!=='GET')return json({error:'Use GET.'},405);
      try{
        const result=await env.DB.prepare('SELECT id,name,emoji,category,blurb FROM products WHERE active=1 ORDER BY sort_order,name LIMIT 100').all();
        // Explicit whitelist: never join users, orders, media, points or memories.
        const products=(result.results||[]).map(p=>({id:String(p.id),name:String(p.name).slice(0,120),emoji:String(p.emoji).slice(0,20),category:String(p.category).slice(0,60),blurb:String(p.blurb).slice(0,500),pricePence:0}));
        const r=json({products});r.headers.set('Cache-Control','public, max-age=60');return r;
      }catch{return json({error:'The catalogue is temporarily unavailable.'},503);}
    }
    if((path==='/games/danao'||path==='/games/danao/'||path==='/games/danao/index.html')&&['GET','HEAD'].includes(request.method)){
      const response=await fallback.fetch(request,env,ctx);
      return withDanaoWebAssemblyPolicy(response,url);
    }
    const root=ROOTS.find(p=>path===p||path.startsWith(p+'/'));
    if(!root)return fallback.fetch(request,env,ctx);
    const base=headers(url);
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...base,Allow:'GET, HEAD'}});
    if(path===root)return new Response(null,{status:308,headers:{...base,Location:root+'/'+url.search}});
    const asset=assets.get(path.slice(root.length+1)||'index.html');
    if(!asset)return new Response(request.method==='HEAD'?null:'Game file not found.',{status:404,headers:base});
    return new Response(request.method==='HEAD'?null:asset.body,{headers:headers(url,asset.type)});
  }};
}
