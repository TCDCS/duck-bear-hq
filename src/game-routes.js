// Public games and catalogue; all private account routes retain the original Worker.
import {routeMultiplayer,json} from './multiplayer/gateway.mjs';
import {routeDanaoMultiplayer} from './danao/gateway.mjs';
import {routeDanaoApi} from './danao/api.mjs';
const ROOTS=['/games/wacky-races','/games/proper-karted'];
function headers(url,type='text/plain; charset=utf-8') {
  const socket=(url.protocol==='https:'?'wss://':'ws://')+url.host;
  return {'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':`default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: https://incompetech.com https://www.incompetech.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' ${socket}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
    'Permissions-Policy':'accelerometer=(self), gyroscope=(self), magnetometer=(), camera=(), microphone=(), geolocation=(), payment=(), usb=()'};
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
    if(path.startsWith('/api/races/'))return routeMultiplayer(request,env);
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
