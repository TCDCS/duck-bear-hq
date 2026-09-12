// Authenticated game routes. No game or portrait bytes are stored in public/.
const ROOTS=['/games/wacky-races','/games/proper-karted'];
const CSP="default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob: https://incompetech.com https://www.incompetech.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
function headers(type='text/plain; charset=utf-8') {
  return {'Content-Type':type,'Cache-Control':'private, no-store',Vary:'Cookie',
    'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':CSP,
    'Permissions-Policy':'accelerometer=(self), gyroscope=(self), magnetometer=(), camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-Robots-Tag':'noindex, nofollow, noarchive'};
}
async function signedIn(request,env) {
  const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('db_session='));
  const token=cookie?.slice('db_session='.length);
  if(!token||token.length>256)return false;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const hash=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const row=await env.DB.prepare('SELECT u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1').bind(hash,new Date().toISOString()).first();
  return Boolean(row&&Number(row.active)===1);
}
export function createGameHandler({assets,fallback}) {
  if(!(assets instanceof Map)||typeof fallback?.fetch!=='function')throw new TypeError('Game assets and an existing Worker are required.');
  return {async fetch(request,env,ctx){
    const url=new URL(request.url);let path;
    try{path=decodeURIComponent(url.pathname);}catch{path=url.pathname;}
    const root=ROOTS.find(p=>path===p||path.startsWith(p+'/'));
    if(!root)return fallback.fetch(request,env,ctx);
    const base=headers();
    if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...base,Allow:'GET, HEAD'}});
    const isPage=[root,root+'/',root+'/index.html'].includes(path);
    try{
      if(!await signedIn(request,env))return new Response(request.method==='HEAD'||isPage?null:'Please sign in to Duck & Bear.',{status:isPage?303:401,headers:{...base,...(isPage?{Location:'/#fun?games'}:{})}});
    }catch{return new Response(request.method==='HEAD'?null:'Sign-in could not be checked. Please return to Duck & Bear and try again.',{status:503,headers:{...base,'Retry-After':'15'}});}
    if(path===root)return new Response(null,{status:308,headers:{...base,Location:root+'/'+url.search}});
    const asset=assets.get(path.slice(root.length+1)||'index.html');
    if(!asset)return new Response(request.method==='HEAD'?null:'Game file not found.',{status:404,headers:base});
    return new Response(request.method==='HEAD'?null:asset.body,{headers:headers(asset.type)});
  }};
}
