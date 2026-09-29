import {VERSION} from '../../public/games/last-luas/inked/core.mjs';
import {ASSET_SET,BRAND_FILES} from '../../public/games/last-luas/inked/assets.mjs';
const ROOT='/games/last-luas';
const PUBLIC_RELEASE={game:'Last Luas',version:VERSION,engine:'Canvas 2D',access:'owner-only',assetSet:ASSET_SET,edition:'hand-drawn inked'};
const FILES=new Map([
 ['','text/html; charset=utf-8'],['index.html','text/html; charset=utf-8'],['game.css','text/css; charset=utf-8'],['release.json','application/json'],
 ...['main','core','projection','render','art','input','assets','audio'].map(n=>['inked/'+n+'.mjs','text/javascript; charset=utf-8']),
 ['data/route.mjs','text/javascript; charset=utf-8'],['data/dawson-layout.json','application/json']
]);
const BRANDS=new Map(BRAND_FILES.map(([id,ext])=>[id+'.'+ext,ext==='svg'?'image/svg+xml':'image/png']));
function headers(type='application/json'){return {'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Vary':'Cookie','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), fullscreen=(self)'};}
function response(request,status,value,type='application/json',extra={}){const body=typeof value==='string'?value:JSON.stringify(value);return new Response(request.method==='HEAD'?null:body,{status,headers:{...headers(type),...extra}});}
function normalPath(path){try{for(let i=0;i<3&&/%[a-f0-9]{2}/i.test(path);i++)path=decodeURIComponent(path);return path.replaceAll('\\','/').replace(/\/{2,}/g,'/');}catch{return null;}}
function signIn(request){return response(request,401,'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Last Luas — private game</title><body style="font:18px/1.6 system-ui;background:#fff2d7;color:#30394b;max-width:620px;margin:12vh auto;padding:28px"><h1>Last Luas</h1><p>This is the owner’s private inked edition.</p><p><a href="/account#fun?games">Sign in to Duck &amp; Bear</a>, then open Last Luas from Games.</p><p><a href="/games/">← Back to Games</a></p></body></html>','text/html; charset=utf-8');}
/** Protect before Assets routing. getAuth is the existing site session validator. */
export function createLastLuasHandler(fallback,getAuth){return {async fetch(request,env,ctx){
 const url=new URL(request.url),path=normalPath(url.pathname);
 if(path==='/api/last-luas/release'){if(!['GET','HEAD'].includes(request.method))return response(request,405,{error:'GET or HEAD required.'},undefined,{Allow:'GET, HEAD'});return response(request,200,PUBLIC_RELEASE);}
 if(!path||!(path===ROOT||path.startsWith(ROOT+'/')))return fallback.fetch(request,env,ctx);
 if(!['GET','HEAD'].includes(request.method))return response(request,405,{error:'GET or HEAD required.'},undefined,{Allow:'GET, HEAD'});
 const leaf=path.slice(ROOT.length).replace(/^\//,''),isPage=['','index.html'].includes(leaf);
 try{
  const auth=await getAuth(request,env);
  if(!auth)return isPage?signIn(request):response(request,401,{error:'Sign in to open the private game.'});
  if(!auth.user.active)return response(request,403,{error:'This account cannot open the private game.'});
  const config=await env.MEDIA?.get('last-luas/access.json');let owner;
  try{owner=config?await config.json():null;}catch{owner=null;}
  if(!owner||typeof owner.ownerId!=='string'||!owner.ownerId||owner.ownerId.length>128)return response(request,503,{error:'Private game access is not configured.'});
  if(auth.user.id!==owner.ownerId)return response(request,403,{error:'This game is restricted to its owner.'});
  if(path===ROOT)return response(request,308,'','text/plain',{Location:ROOT+'/'});
  if(leaf==='session')return response(request,200,{ok:true,version:VERSION,assetSet:ASSET_SET});
  if(leaf.startsWith('private/brands/')){
   const file=leaf.slice(15),mime=BRANDS.get(file);if(!mime)return response(request,404,{error:'Artwork not found.'});
   const set=url.searchParams.get('set');if(set&&set!==ASSET_SET)return response(request,409,{error:'Reload for the current artwork version.'});
   const object=await env.MEDIA.get('last-luas/inked/'+ASSET_SET+'/brands/'+file);if(!object)return response(request,404,{error:'Artwork not found.'});
   return new Response(request.method==='HEAD'?null:object.body,{headers:headers(mime)});
  }
  const mime=FILES.get(leaf);if(!mime)return response(request,404,{error:'Game file not found.'});
  const assetUrl=new URL(url);assetUrl.pathname=isPage?ROOT+'/':ROOT+'/'+leaf;
  const result=await env.ASSETS.fetch(new Request(assetUrl,{method:request.method,headers:request.headers}));
  if(result.status>=300&&result.status<400){const target=new URL(result.headers.get('Location')||'',assetUrl);if(target.origin!==url.origin||!normalPath(target.pathname)?.startsWith(ROOT+'/'))return response(request,404,{error:'Game file not found.'});return response(request,result.status,'','text/plain',{Location:target.pathname+target.search});}
  if(!result.ok)return response(request,result.status,{error:'Game file not found.'});
  const type=result.headers.get('Content-Type')||'';
  if(!type.startsWith(mime.split(';')[0])&&!(mime.startsWith('text/javascript')&&type.startsWith('application/javascript')))return response(request,404,{error:'Game file not found.'});
  return new Response(request.method==='HEAD'?null:result.body,{headers:headers(mime)});
 }catch{return response(request,503,{error:'The private game could not be opened. Please try again.'});}
}};}
