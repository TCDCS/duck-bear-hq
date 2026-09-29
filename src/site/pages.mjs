const ROUTES=new Set(['/our-space/','/menus/planner/','/menus/library/','/family/','/scrapbook/','/settings/','/settings/profile/','/settings/security/','/settings/users/','/settings/permissions/','/settings/artwork/','/settings/updates/','/signin/','/forgot-password/']);
export async function sitePage(request,env){
 const url=new URL(request.url),canonical=url.pathname.endsWith('/')?url.pathname:url.pathname+'/';if(!ROUTES.has(canonical))return null;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
 if(url.pathname!==canonical){url.pathname=canonical;return Response.redirect(url.toString(),308);}
 url.pathname='/site/index.html';url.search='';const response=await env.ASSETS.fetch(new Request(url.toString(),request)),headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
}
