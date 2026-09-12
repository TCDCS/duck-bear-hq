import {createProfileRepository,SaveError} from './repository.mjs';
const MAX_BYTES=32768,ROOT='/api/mango/profiles';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
async function readBody(request){
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))throw new SaveError(415,'Send JSON for profile changes.');
 if(Number(request.headers.get('Content-Length')||0)>MAX_BYTES)throw new SaveError(413,'This save is too large.');
 const reader=request.body?.getReader();if(!reader)throw new SaveError(400,'A JSON body is required.');let size=0,chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();throw new SaveError(413,'This save is too large.');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new SaveError(400,'Invalid JSON.');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new SaveError(400,'A JSON object is required.');return value;
}
function fields(body,allowed){if(Object.keys(body).some(k=>!allowed.includes(k)))throw new SaveError(400,'Unknown profile field.');}
export async function routeMangoApi(request,env,user){
 const url=new URL(request.url),path=url.pathname;
 if(path!==ROOT&&!path.startsWith(ROOT+'/'))return null;
 if(!user)return json({error:'Sign in to save across devices.'},401);if(!user.active)return json({error:'This account is disabled.'},403);
 try{
  const match=path.slice(ROOT.length).match(/^\/([a-zA-Z0-9_-]{1,80})(\/progress)?$/),collection=path===ROOT;
  if(!collection&&!match)return json({error:'Profile route not found.'},404);
  const method=request.method,profileId=match?.[1];
  const allowed=collection?['GET','POST']:match[2]?['PUT']:['GET','PUT','DELETE'];
  if(!allowed.includes(method))return json({error:'Method not allowed.'},405,{Allow:allowed.join(', ')});
  const repo=createProfileRepository(env.DB),ownerId=user.id;
  if(method==='GET'){
   if(collection)return json({ownerId,profiles:await repo.list(ownerId)});
   const profile=await repo.get(ownerId,profileId);if(!profile)throw new SaveError(404,'Profile not found.');return json({profile});
  }
  if(request.headers.get('Origin')!==url.origin)throw new SaveError(403,'Cross-site profile changes are not allowed.');
  const body=await readBody(request);await repo.limit(ownerId,'write');
  if(collection){fields(body,['nickname','avatarId']);await repo.limit(ownerId,'create');return json({profile:await repo.create(ownerId,body)},201);}
  if(match[2]){fields(body,['revision','progress']);return json({profile:await repo.save(ownerId,profileId,body)});}
  if(method==='PUT'){fields(body,['revision','nickname','avatarId']);return json({profile:await repo.rename(ownerId,profileId,body)});}
  fields(body,['revision']);return json(await repo.remove(ownerId,profileId,body));
 }catch(e){
  if(e instanceof SaveError)return json({error:e.message,...(e.current?{current:e.current}:{})},e.status,e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});
  console.error('Mango save API unavailable:',e instanceof Error?e.message:'database error');return json({error:'Cloud saving is temporarily unavailable. Keep playing with the device save and try again later.'},503);
 }
}
