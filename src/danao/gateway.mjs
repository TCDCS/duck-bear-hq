import {LIMITS} from './room-state.mjs';
export const netHeaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...netHeaders,...extra}});
const error=(status,message)=>Object.assign(new Error(message),{status});
export async function smallBody(request,limit=3000){
 const declared=Number(request.headers.get('Content-Length')||0);if(declared>limit)throw error(413,'Request is too large.');
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))throw error(415,'Send a JSON request.');
 const reader=request.body?.getReader();if(!reader)throw error(400,'A JSON object is required.');let total=0,parts=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw error(413,'Request is too large.');}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let off=0;for(const p of parts){bytes.set(p,off);off+=p.length;}
 let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw error(400,'Invalid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw error(400,'A JSON object is required.');return body;
}
function playerPayload(body,includeCode=false){
 const allowed=new Set(includeCode?['code','name','character','costume']:['name','character','costume']);for(const k of Object.keys(body))if(!allowed.has(k))throw error(400,'Unknown room field.');
 const name=typeof body.name==='string'?body.name.trim():'';if(!name||name.length>32)throw error(400,'Enter a player name.');
 const out={name,character:body.character||'Hero',costume:body.costume||'Arcade'};if(includeCode)out.code=body.code;return out;
}
async function clientHash(request){const ip=request.headers.get('CF-Connecting-IP')||'development';const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('danao-rate-v1:'+ip));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export async function routeDanaoMultiplayer(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/api/danao/version'&&request.method==='GET')return json({version:1,maxPlayers:LIMITS.maxPlayers,multiplayer:Boolean(env.DANAO_ROOMS&&env.DANAO_DIRECTORY)});
 const action=path==='/api/danao/create'?'create':path==='/api/danao/join'?'join':null;
 const socket=path.match(/^\/api\/danao\/(\d{4})\/socket$/);
 if(!action&&!socket)return json({error:'Danao endpoint not found.'},404);
 if(request.headers.get('Origin')!==url.origin)return json({error:'Cross-site connection blocked.'},403);
 try{
  if(socket){
   if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'A WebSocket connection is required.'},426);
   const token=url.searchParams.get('token');if(!/^[a-f\d-]{36}$/i.test(token||''))return json({error:'Join the room first.'},401);
   if(!env.DANAO_ROOMS)return json({error:'Danao online rooms are unavailable. Local play still works.'},503);
   return env.DANAO_ROOMS.get(env.DANAO_ROOMS.idFromName('danao-v1:'+socket[1])).fetch(request);
  }
  if(request.method!=='POST')return json({error:'Use POST.'},405,{Allow:'POST'});
  const body=await smallBody(request);
  if(action==='join'&&!/^\d{4}$/.test(body.code||''))return json({error:'Enter exactly four digits, including any leading zero.'},400);
  const data=playerPayload(body,action==='join');
  if(!env.DANAO_DIRECTORY||!env.DANAO_ROOMS)return json({error:'Danao online rooms are unavailable. Local play still works.'},503);
  const payload={action,client:await clientHash(request),...data};
  const stub=env.DANAO_DIRECTORY.get(env.DANAO_DIRECTORY.idFromName('danao-v1-directory'));
  return await stub.fetch(new Request('https://internal/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}));
 }catch(e){return json({error:e.status?e.message:'The Danao room service is unavailable. Try again or play locally.'},e.status||503);}
}
