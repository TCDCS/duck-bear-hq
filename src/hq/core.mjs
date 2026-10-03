/** Shared, dependency-free primitives for the private household application. */
export const VERSION='7.4.4';
export const BUILD='2026.10.03-family-history.1';
export const SECTIONS=['family','scrapbook','menus','plans','intimate','library'];
export class HttpError extends Error{constructor(status,message,code=''){super(message);this.status=status;this.code=code;}}
export const fail=(status,message,code)=>{throw new HttpError(status,message,code);};
export const now=()=>new Date().toISOString();
export const id=(prefix='r')=>prefix+'_'+crypto.randomUUID().replaceAll('-','');
export const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(s.length/4)*4,'=')),x=>x.charCodeAt(0));
export const sha=async s=>b64(await crypto.subtle.digest('SHA-256',typeof s==='string'?new TextEncoder().encode(s):s));
export const token=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
export function headers(type='application/json; charset=utf-8'){return {'content-type':type,'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY','x-robots-tag':'noindex, nofollow, noarchive'};}
export function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...headers(),...extra}});}
export function text(value,max=1000,{required=false}={}){if(value===undefined||value===null)value='';if(typeof value!=='string')fail(400,'Text fields must contain text.');value=value.trim();if(value.length>max)fail(400,'A text field is too long.');if(required&&!value)fail(400,'A required field is empty.');return value;}
export function integer(value,min,max,label='Value'){if(!Number.isInteger(value)||value<min||value>max)fail(400,`${label} must be between ${min} and ${max}.`);return value;}
export function choice(value,values,fallback){if(value===undefined&&fallback!==undefined)return fallback;if(!values.includes(value))fail(400,'Choose a valid option.');return value;}
export function date(value,{required=false,monday=false}={}){const s=text(value,10,{required});if(!s)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00Z'))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s)fail(400,'Enter a valid date.');if(monday&&new Date(s+'T12:00:00Z').getUTCDay()!==1)fail(400,'Choose the Monday starting that week.');return s;}
export function ref(value,{required=false}={}){const s=text(value,160,{required});if(s&&!/^[A-Za-z0-9_-]+$/.test(s))fail(400,'Invalid record reference.');return s;}
export function url(value){const s=text(value,1000);if(!s)return '';try{const u=new URL(s);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error();return u.href;}catch{fail(400,'Links must start with https:// or http://.');}}
export const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function bytes(request,limit=131072){const length=Number(request.headers.get('content-length'));if(length>limit)fail(413,'This upload is too large.');const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let total=0;try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();fail(413,'This upload is too large.');}chunks.push(value);}}finally{reader.releaseLock();}const all=new Uint8Array(total);let at=0;for(const c of chunks){all.set(c,at);at+=c.length;}return all;}
export async function body(request,max=131072){if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Use application/json.');let value;try{value=JSON.parse(new TextDecoder().decode(await bytes(request,max)));}catch(e){if(e instanceof HttpError)throw e;fail(400,'Invalid JSON.');}if(!value||Array.isArray(value)||typeof value!=='object')fail(400,'The request must contain an object.');return value;}
export function sameOrigin(request){if(['GET','HEAD','OPTIONS'].includes(request.method))return;const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)fail(403,'Cross-site request blocked.');if(request.headers.get('sec-fetch-site')==='cross-site')fail(403,'Cross-site request blocked.');}
export function cookie(request){const raw=request.headers.get('cookie')||'';const match=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith('db_session='));const value=match?.slice(11)||'';return value.length<=256?value:'';}
export async function authenticate(request,env){const raw=cookie(request);if(!raw)return null;const row=await env.DB.prepare('SELECT u.*,s.id AS session_id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1').bind(await sha(raw),now()).first();return row&&Number(row.active)===1?row:null;}
export function safeUser(u){return {id:u.id,username:u.username,displayName:u.display_name,role:u.role,active:Boolean(u.active)};}
export function parseData(row){if(!row)return null;return {id:row.id,kind:row.kind,section:row.section,parentId:row.parent_id||null,creatorId:row.creator_id,updatedBy:row.updated_by,revision:Number(row.revision),data:JSON.parse(row.data),createdAt:row.created_at,updatedAt:row.updated_at,deletedAt:row.deleted_at||null};}
export const queryAll=async(db,sql,...binds)=>(await db.prepare(sql).bind(...binds).all()).results||[];
export async function event(env,actor,section,action,recordId=null){await env.DB.prepare('INSERT INTO hq_events(section,record_id,actor_id,action,created_at) VALUES(?,?,?,?,?)').bind(section,recordId,actor.id,action,now()).run();}
export async function rate(env,key,limit,seconds){const window=Math.floor(Date.now()/1000/seconds);const hash=await sha(key);const result=await env.DB.prepare('INSERT INTO hq_limits(key,window,count) VALUES(?,?,1) ON CONFLICT(key,window) DO UPDATE SET count=count+1 RETURNING count').bind(hash,window).first();if(result.count>limit)fail(429,'Too many attempts. Please try again later.');}
export function deepAssetIds(data){const ids=new Set();if(!data||typeof data!=='object')return [];for(const key of ['coverId','avatarId','attachmentId'])if(data[key])ids.add(data[key]);for(const p of data.photos||[])if(p.assetId)ids.add(p.assetId);return [...ids];}
