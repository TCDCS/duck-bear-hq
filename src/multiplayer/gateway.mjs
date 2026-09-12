import {CAPACITY} from './room-state.mjs';
/* Same-origin public game networking. These endpoints do not read account data. */
export const netHeaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:netHeaders});}
export async function smallBody(request,limit=2000){
  if(Number(request.headers.get('Content-Length'))>limit)throw Object.assign(Error('Request is too large.'),{status:413});
  if(!request.headers.get('Content-Type')?.includes('application/json'))throw Object.assign(Error('Send a JSON request.'),{status:415});
  const reader=request.body?.getReader();let parts=[],total=0;
  if(!reader)throw Object.assign(Error('A JSON object is required.'),{status:400});
  try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw Object.assign(Error('Request is too large.'),{status:413});}parts.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  let value;try{value=JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(Error('Invalid JSON.'),{status:400});}
  if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(Error('A JSON object is required.'),{status:400});return value;
}
export async function routeMultiplayer(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==='/api/races/version'&&request.method==='GET')return json({version:4,maxPlayers:CAPACITY,multiplayer:Boolean(env.WACKY_ROOMS&&env.WACKY_DIRECTORY)});
  const action=path==='/api/races/create'?'create':path==='/api/races/join'?'join':null;
  const socket=path.match(/^\/api\/races\/(\d{4})\/socket$/);
  if(!action&&!socket)return json({error:'Game endpoint not found.'},404);
  if(request.headers.get('Origin')!==url.origin)return json({error:'Cross-site connection blocked.'},403);
  try{
    if(socket){
      if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'A WebSocket connection is required.'},426);
      const token=url.searchParams.get('token');if(!/^[a-f\d-]{36}$/.test(token||''))return json({error:'Join the room first.'},401);
      if(!env.WACKY_ROOMS)return json({error:'Online rooms are not available right now. Solo racing still works.'},503);
      const stub=env.WACKY_ROOMS.get(env.WACKY_ROOMS.idFromName('wacky-v4:'+socket[1]));return await stub.fetch(request);
    }
    if(request.method!=='POST')return json({error:'Use POST.'},405);
    const body=await smallBody(request);
    if(action==='join'&&!/^\d{4}$/.test(body.code||''))return json({error:'Enter exactly four digits, including any leading zero.'},400);
    if(!env.WACKY_DIRECTORY||!env.WACKY_ROOMS)return json({error:'Online rooms are not available right now. Solo racing still works.'},503);
    const ip=request.headers.get('CF-Connecting-IP')||'development';
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('wacky-rate-v4:'+ip));
    const client=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const payload={action,client,code:body.code,name:body.name,avatar:body.avatar,vehicle:body.vehicle,track:body.track,difficulty:body.difficulty};
    return await env.WACKY_DIRECTORY.get(env.WACKY_DIRECTORY.idFromName('wacky-v4-directory')).fetch(new Request('https://internal/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}));
  }catch(e){return json({error:e.status?e.message:'The room service is unavailable. Try again or race solo.'},e.status||503);}
}
