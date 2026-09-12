import {ASSETS} from './asset-manifest.mjs';
import {VERSION} from '../../public/games/mango-mayhem/content/catalog.mjs';
export const MANGO_ASSETS=new Map(Object.entries(ASSETS));
const MIME={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',svg:'image/svg+xml',json:'application/json'};
const headers=type=>({'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), fullscreen=(self), gamepad=(self)'});
export function createMangoHandler(fallback){return {async fetch(request,env,ctx){const url=new URL(request.url),path=url.pathname;
 if(path==='/api/mango/health'){
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers('application/json'),Allow:'GET, HEAD'}});
  let ready=false;try{const row=await env.DB.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('mango_profiles','mango_rate_limits')").first();ready=Number(row.n)===2;}catch{}
  return new Response(request.method==='HEAD'?null:JSON.stringify({ok:ready,game:'mango-mayhem',version:VERSION,cloudSaves:ready?'ready':'unavailable'}),{status:ready?200:503,headers:headers('application/json')});
 }
 if(path==='/games'||path==='/games/mango-mayhem')return new Response(null,{status:308,headers:{...headers('text/plain'),Location:path+'/'+url.search}});
 const ours=path==='/games/'||path==='/games/index.html'||path==='/games/games.css'||path==='/games/hub.mjs'||path.startsWith('/games/mango-mayhem/');
 if(!ours)return fallback.fetch(request,env,ctx);
 if(!['GET','HEAD'].includes(request.method))return new Response('Use GET or HEAD.',{status:405,headers:{...headers('text/plain'),Allow:'GET, HEAD'}});
 const file=MANGO_ASSETS.get(path);if(!file)return new Response(request.method==='HEAD'?null:'Game file not found.',{status:404,headers:headers('text/plain')});
 const target=new URL(request.url);target.pathname=file;const asset=await env.ASSETS.fetch(new Request(target,request));const type=MIME[file.split('.').pop()]||'application/octet-stream';
 return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers:headers(type)});
 }};}
