import {createProfileRepository,ProfileError,normaliseProfile} from './profile.mjs';
const ROOT='/api/danao/profile',MAX_BYTES=26000;
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{...headers,...extra}});
async function readBody(request){
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))throw new ProfileError(415,'Send JSON for Danao profile changes.');
 if(Number(request.headers.get('Content-Length')||0)>MAX_BYTES)throw new ProfileError(413,'This Danao save is too large.');const reader=request.body?.getReader();if(!reader)throw new ProfileError(400,'A JSON body is required.');let total=0,parts=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_BYTES){await reader.cancel();throw new ProfileError(413,'This Danao save is too large.');}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let off=0;for(const p of parts){bytes.set(p,off);off+=p.length;}let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new ProfileError(400,'Invalid JSON.');}if(!body||typeof body!=='object'||Array.isArray(body))throw new ProfileError(400,'A JSON object is required.');return body;
}
export async function routeDanaoApi(request,env,user,deps={}){
 const url=new URL(request.url);if(url.pathname!==ROOT)return null;if(!user)return json({error:'Sign in to sync Danao across devices.'},401);if(!user.active)return json({error:'This account is disabled.'},403);
 if(!['GET','PUT'].includes(request.method))return json({error:'Method not allowed.'},405,{Allow:'GET, PUT'});
 try{
  const repo=(deps.repositoryFactory||createProfileRepository)(env.DB),owner=String(user.id);
  if(request.method==='GET'){const current=await repo.get(owner);return json({profile:current.profile,revision:current.revision,updatedAt:current.updatedAt});}
  if(request.headers.get('Origin')!==url.origin)throw new ProfileError(403,'Cross-site Danao profile changes are not allowed.');
  const body=await readBody(request);const keys=Object.keys(body).sort();if(keys.length!==2||keys[0]!=='profile'||keys[1]!=='revision')throw new ProfileError(400,'Send only revision and profile.');if(!Number.isSafeInteger(body.revision)||body.revision<0)throw new ProfileError(400,'Invalid profile revision.');const profile=normaliseProfile(body.profile);await repo.limit(owner,'write');const saved=await repo.save(owner,{revision:body.revision,profile});return json({profile:saved.profile,revision:saved.revision,updatedAt:saved.updatedAt});
 }catch(e){if(e instanceof ProfileError)return json({error:e.message,...(e.current?{current:e.current}:{})},e.status,e.retryAfter?{'Retry-After':String(e.retryAfter)}:{});console.error('Danao save API unavailable:',e instanceof Error?e.message:'database error');return json({error:'Danao cloud saving is temporarily unavailable. Local play and local saves still work.'},503);}
}
