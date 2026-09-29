export const VERSION='7.0.0';
export const BUILD='site-1-storybook-20260929';
export const MAX_UPLOAD=8*1024*1024;
export class SiteError extends Error {constructor(status,message){super(message);this.status=status;}}
export function fail(status,message){throw new SiteError(status,message);}
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'}});}
export function text(value,max=200){if(value!==undefined&&value!==null&&typeof value!=='string')fail(400,'Text fields must contain text.');const s=(value||'').trim();if(s.length>max)fail(400,`Text is too long (maximum ${max} characters).`);return s;}
export function required(value,max,label){const s=text(value,max);if(!s)fail(400,`${label} is required.`);return s;}
export function date(value,{optional=false,monday=false}={}){const s=text(value,10);if(!s&&optional)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail(400,'Use a valid date.');const d=new Date(s+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s||s<'1800-01-01'||s>'2200-12-31')fail(400,'Use a valid date between 1800 and 2200.');if(monday&&d.getUTCDay()!==1)fail(400,'The week must start on a Monday.');return s;}
export function revision(value){if(!Number.isInteger(value)||value<1)fail(400,'A current revision is required. Reload the record.');return value;}
export function newId(prefix='site'){return prefix+'_'+crypto.randomUUID().replaceAll('-','');}
export function now(after){return new Date(Math.max(Date.now(),Date.parse(after||'')+1||0)).toISOString();}
export async function boundedBytes(request,limit){const declared=Number(request.headers.get('Content-Length')||0);if(declared>limit)fail(413,'This upload or request is too large.');if(!request.body)return new Uint8Array();const reader=request.body.getReader(),parts=[];let total=0;try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();fail(413,'This upload or request is too large.');}parts.push(value);}}finally{reader.releaseLock();}const out=new Uint8Array(total);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;}
export async function body(request){if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))fail(415,'Send JSON for this action.');const bytes=await boundedBytes(request,96*1024);try{const b=JSON.parse(new TextDecoder().decode(bytes));if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'Invalid request.');return b;}catch(e){if(e instanceof SiteError)throw e;fail(400,'Invalid JSON request.');}}
export function validId(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);}
export async function schemaReady(env){const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_owners'").first();return Boolean(r);}
export async function legacyAllowed(env,user){if(!await schemaReady(env))return true;return Boolean(await env.DB.prepare('SELECT user_id FROM site_legacy_users WHERE user_id=?').bind(user.id).first());}
export async function siteAccess(env,user){
 if(!user?.active)fail(401,'Please sign in.');if(!await schemaReady(env))fail(503,'The Site 1 database migration has not been applied yet.');
 const owners=(await env.DB.prepare('SELECT user_id,slot FROM site_owners').all()).results;
 const slot=owners.find(o=>o.user_id===user.id)?.slot;
 const access={admin:slot==='owner',partner:slot==='partner',family:slot?2:0,menus:slot?2:0,scrapbook:slot?2:0,artwork:slot==='owner'?2:0};
 if(!slot){for(const p of (await env.DB.prepare('SELECT section,level FROM site_permissions WHERE user_id=?').bind(user.id).all()).results)if(p.section==='family'||p.section==='menus')access[p.section]=Number(p.level);}
 return access;
}
export async function requireSection(env,user,section,level=1){const access=await siteAccess(env,user);if((access[section]||0)<level)fail(403,'You do not have permission for this section.');return access;}
export async function requireOwner(env,user){const a=await siteAccess(env,user);if(!a.admin)fail(403,'Only the site owner can manage this setting.');return a;}
export async function assertMedia(env,id,section){if(!id)return null;if(!validId(id))fail(400,'Invalid image.');const m=await env.DB.prepare('SELECT id,section FROM site_media WHERE id=?').bind(id).first();if(!m||m.section!==section)fail(400,'Choose an image uploaded to this section.');return id;}
export function record(row){if(!row)return null;return {...JSON.parse(row.data_json),id:row.id,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at};}
export async function audit(env,helpers,user,action,id){await helpers.audit(env,user.id,'site.'+action,'site',id,{});}
