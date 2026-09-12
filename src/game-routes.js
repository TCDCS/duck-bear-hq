// Game source lives in Worker text modules, never in public/. The same hashed
// db_session cookie and sessions table as src/index.js protect every response.
const ROOT = '/games/proper-karted';
const CSP = "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
function headers(type='text/plain; charset=utf-8') {
  return {
    'Content-Type':type, 'Cache-Control':'private, no-store', Vary:'Cookie',
    'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer', 'Content-Security-Policy':CSP,
    'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'X-Robots-Tag':'noindex, nofollow, noarchive'
  };
}
async function signedIn(request,env) {
  const cookie=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('db_session='));
  const token=cookie?.slice('db_session='.length);
  if(!token || token.length>256) return false;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  const hash=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  const row=await env.DB.prepare('SELECT u.active FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1').bind(hash,new Date().toISOString()).first();
  return Boolean(row && Number(row.active)===1);
}
export function createGameHandler({assets,fallback}) {
  if(!(assets instanceof Map) || typeof fallback?.fetch!=='function') throw new TypeError('Game assets and an existing Worker are required.');
  return {
    async fetch(request,env,ctx) {
      const url=new URL(request.url);
      let path;
      try {path=decodeURIComponent(url.pathname);} catch {path=url.pathname;}
      if(path!==ROOT && !path.startsWith(ROOT+'/')) return fallback.fetch(request,env,ctx);
      const base=headers();
      if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed.',{status:405,headers:{...base,Allow:'GET, HEAD'}});
      const isPage=[ROOT,ROOT+'/',ROOT+'/index.html'].includes(path);
      try {
        if(!await signedIn(request,env)) return new Response(isPage?null:'Please sign in to Duck & Bear.',{status:isPage?303:401,headers:{...base,...(isPage?{Location:'/#fun?games'}:{})}});
      } catch {
        return new Response(request.method==='HEAD'?null:'Sign-in could not be checked. Please return to Duck & Bear and try again.',{status:503,headers:{...base,'Retry-After':'15'}});
      }
      if(path===ROOT) return new Response(null,{status:308,headers:{...base,Location:ROOT+'/'+url.search}});
      const key=path.slice(ROOT.length+1)||'index.html';
      const asset=assets.get(key);
      if(!asset) return new Response(request.method==='HEAD'?null:'Game file not found.',{status:404,headers:base});
      return new Response(request.method==='HEAD'?null:asset.body,{headers:headers(asset.type)});
    }
  };
}
