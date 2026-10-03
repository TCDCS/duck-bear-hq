/** Owner-only family import. Source code contains no family data or credentials. */
import {body,fail,id,now,json,parseData,queryAll,ref,sha,text} from './core.mjs';
import {requireOwner} from './schema.mjs';
import {KINDS,validate} from './records.mjs';
import {FAMILY_KINDS} from './family-fields.mjs';

const SNAPSHOT_SQL="SELECT * FROM hq_records WHERE section='family' OR kind='familyPrivate' ORDER BY id";
const SIGNATURE_SQL="SELECT COALESCE(group_concat(sig,','),'') FROM (SELECT id||':'||revision AS sig FROM hq_records WHERE section='family' OR kind='familyPrivate' ORDER BY id)";
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const stable=value=>JSON.stringify(canonical(value));
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const names=d=>[d.name,d.alternateName,...(Array.isArray(d.aliases)?d.aliases:[])].map(normalize).filter(Boolean);
const active=row=>!row.deleted_at;
function virtualDatabase(real,rows){
 const map=new Map(rows.map(r=>[r.id,r]));const cache=new Map();
 return {prepare(sql){let binds=[];const result=async()=>{
  if(sql.startsWith('SELECT * FROM hq_records WHERE id=?')){const row=map.get(binds[0]);return row&&(sql.includes('deleted_at IS NULL')?!row.deleted_at:true)?[row]:[];}
  if(sql==="SELECT id,data FROM hq_records WHERE kind='relationship' AND deleted_at IS NULL")return [...map.values()].filter(r=>r.kind==='relationship'&&!r.deleted_at).map(r=>({id:r.id,data:r.data}));
  const key=sql+stable(binds);if(!cache.has(key))cache.set(key,real.prepare(sql).bind(...binds).all().then(x=>x.results||[]));return cache.get(key);
 };return {bind(...v){binds=v;return this;},async first(column){const x=(await result())[0]||null;return column?x?.[column]:x;},async all(){return {results:await result()};}};}};
}
const REFERENCE_FIELDS=new Set(['personId','from','to','placeId','birthPlaceId','deathPlaceId','currentPlaceId','sourceIds','participants']);
function replaceRefs(value,map,key=''){
 if(Array.isArray(value))return value.map(v=>replaceRefs(v,map,key));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,replaceRefs(v,map,k)]));
 if(REFERENCE_FIELDS.has(key)&&typeof value==='string'&&value.startsWith('@')){const target=value.slice(1);if(!map.has(target))fail(400,'A linked import reference is missing: '+target);return map.get(target);}return value;
}
function merged(old,input,overwrite){
 const next={...(old||{})},differences=[];
 for(const [key,value]of Object.entries(input)){
  if(value===undefined||value===null||value===''||Array.isArray(value)&&!value.length)continue;
  if(['coverId','avatarId','photos'].includes(key)&&old?.[key]&&(key!=='photos'||old[key].length))continue;
  if(['aliases','sourceIds','allergies'].includes(key)){next[key]=[...new Set([...(old?.[key]||[]),...value])];continue;}
  if(['notes','sourceNotes'].includes(key)&&old?.[key]&&String(old[key])!==String(value)){next[key]=String(old[key]).includes(String(value))?old[key]:String(value).includes(String(old[key]))?value:String(old[key])+'\n\n'+String(value);continue;}
  const previous=old?.[key],filled=previous!==undefined&&previous!==null&&previous!==''&&previous!=='unknown'&&previous!=='unresolved'&&(!Array.isArray(previous)||previous.length);
  if(filled&&stable(previous)!==stable(value)&&!['sourceKey','sourceNotes'].includes(key))differences.push(key);
  if(overwrite||!filled||['sourceKey','sourceNotes'].includes(key))next[key]=value;
 }
 return {data:next,differences};
}
async function plan(env,user,payload,{overwrite=false}={}){
 await requireOwner(env,user);
 if(!payload||payload.format!=='duck-bear-family'||payload.version!==1||!Array.isArray(payload.records)||payload.records.length>1000)fail(400,'Choose a supported family-history package (maximum 1,000 records).');
 const namespace=ref(payload.namespace,{required:true});if(namespace.length>50)fail(400,'The import namespace is too long.');
 const input=payload.records,keys=new Set();for(const item of input){const key=ref(item.key,{required:true});if(key.length>80||keys.has(key)||!FAMILY_KINDS.includes(item.kind)||!item.data||typeof item.data!=='object'||Array.isArray(item.data)||stable(item.data).length>50000)fail(400,'The package has duplicate keys, an invalid type or oversized content.');keys.add(key);}
 const rows=await queryAll(env.DB,SNAPSHOT_SQL),existing=rows.filter(active).map(parseData),byId=new Map(rows.map(r=>[r.id,r])),map=new Map(),conflicts=[],matched=new Map();
 for(const item of input){
  const sourceKey=namespace+'__'+item.key;let matches=existing.filter(r=>r.data.sourceKey===sourceKey&&r.kind===item.kind);
  if(!matches.length&&item.kind==='person'){const candidateNames=names({...item.data,aliases:[...(item.data.aliases||[]),...(item.matchAliases||[])]});matches=existing.filter(r=>r.kind==='person'&&names(r.data).some(n=>candidateNames.includes(n)));}
  if(matches.length>1){conflicts.push({key:item.key,message:'More than one existing record matches '+(item.data.name||item.data.title||item.key)+'. Resolve the duplicate before importing.'});}
  let rid=matches.length===1?matches[0].id:'fh_'+sourceKey;
  if(!matches.length&&byId.has(rid))conflicts.push({key:item.key,message:'An existing or recycled record already uses the import ID for '+item.key+'.'});
  if(item.requireExisting===true&&matches.length!==1)fail(409,'The required existing record was not found: '+item.key+'. Import the original family package first or resolve the identity.');
  map.set(item.key,rid);if(matches.length===1)matched.set(item.key,matches[0]);
 }
 // Sparse updates may reference active, already imported records in the same namespace.
 const refs=new Map(map);
 for(const row of existing){const key=row.data.sourceKey;if(typeof key!=='string'||!key.startsWith(namespace+'__'))continue;const short=key.slice(namespace.length+2);if(map.has(short))continue;if(refs.has(short)&&refs.get(short)!==row.id)fail(409,'Duplicate existing source reference: '+short);refs.set(short,row.id);}
 // Match legacy relationships using resolved person IDs, never a surname alone.
 for(const item of input.filter(r=>r.kind==='relationship'&&!matched.has(r.key))){const d=replaceRefs(item.data,refs),symmetric=['partner','former-partner','sibling','half-sibling','adoptive-sibling','cousin'].includes(d.type);const found=existing.filter(r=>r.kind==='relationship'&&r.data.type===d.type&&((r.data.from===d.from&&r.data.to===d.to)||(symmetric&&r.data.from===d.to&&r.data.to===d.from)));if(found.length===1){map.set(item.key,found[0].id);refs.set(item.key,found[0].id);matched.set(item.key,found[0]);}else if(found.length>1)conflicts.push({key:item.key,message:'Duplicate existing relationship for '+item.key+'.'});}
 if(new Set(map.values()).size!==map.size)fail(409,'Two imported people or records resolve to the same existing record. Review their names and relationships.');
 const prepared=input.map(item=>{
  const old=matched.get(item.key),data={...replaceRefs(item.data,refs),sourceKey:namespace+'__'+item.key};const merge=merged(old?.data,data,overwrite);
  if(item.replaceText){if(!old||typeof item.replaceText!=='object'||Array.isArray(item.replaceText))fail(400,'Text corrections need an existing record.');for(const [key,previous] of Object.entries(item.replaceText)){if(!['notes','sourceNotes'].includes(key)||typeof previous!=='string'||typeof data[key]!=='string')fail(400,'Unsupported text correction.');const current=old.data[key]||'';if(current!==previous&&current!==data[key])fail(409,'The '+key+' changed since this correction was prepared. No text was replaced.');if(overwrite||current===data[key])merge.data[key]=data[key];else conflicts.push({key:item.key,message:'Approve supplied values to apply the reviewed text correction for '+item.key+'.'});}}
  if(old&&!overwrite&&merge.differences.length)conflicts.push({key:item.key,fields:merge.differences,message:(item.data.name||item.data.title||item.key)+': supplied values differ in '+merge.differences.join(', ')+'.'});
  const parentId=['story','lifeEvent','familyPrivate','familyResearch'].includes(item.kind)?merge.data.personId||null:null;
  return {id:map.get(item.key),kind:item.kind,section:KINDS[item.kind],parentId,data:merge.data,old};
 });
 const virtual=new Map(rows.map(r=>[r.id,r]));for(const p of prepared)virtual.set(p.id,{id:p.id,kind:p.kind,section:p.section,parent_id:p.parentId,data:JSON.stringify(p.data),revision:p.old?.revision||0,creator_id:p.old?.creatorId||user.id,deleted_at:null});
 const shadow={...env,DB:virtualDatabase(env.DB,[...virtual.values()])},ops=[];let kept=0;
 for(const p of prepared){const v=await validate(shadow,user,p.kind,p.data,p.old||{id:p.id,parentId:p.parentId,data:p.data});p.data=v.data;p.parentId=v.parentId;if(p.old&&stable(p.old.data)===stable(p.data)){kept++;continue;}ops.push({...p,revision:p.old?.revision||0});}
 const snapshot=rows.map(r=>r.id+':'+r.revision).join(',');const signature=await sha(stable({namespace,user:user.id,overwrite,snapshot,ops:ops.map(({old,...r})=>r)}));
 return {signature,createCount:ops.filter(r=>!r.old).length,updateCount:ops.filter(r=>r.old).length,keepCount:kept,conflicts,ops,snapshot};
}
export async function previewFamilyImport(env,user,payload,options={}){const {ops,snapshot,...preview}=await plan(env,user,payload,options);return preview;}
export async function applyFamilyImport(env,user,payload,{signature,overwrite=false}={}){
 const p=await plan(env,user,payload,{overwrite});if(p.conflicts.length)fail(409,'Resolve the import conflicts before applying.');if(!signature||signature!==p.signature)fail(409,'The family records or this package changed after the preview. Preview it again.','revision');
 if(!p.ops.length)return {ok:true,created:0,updated:0,unchanged:p.keepCount};
 // One SQLite UPSERT is atomic on both the Worker binding and REST API.
 // The revision snapshot is evaluated in that same statement, so a concurrent
 // edit rejects the entire import. Normal row-history/cycle triggers still run.
 const stamp=now(),create=p.ops.filter(x=>!x.old),update=p.ops.filter(x=>x.old);
 const sql=`INSERT INTO hq_records(id,kind,section,parent_id,creator_id,updated_by,revision,data,created_at,updated_at)
 SELECT json_extract(value,'$.id'),json_extract(value,'$.kind'),json_extract(value,'$.section'),json_extract(value,'$.parentId'),?,?,1,json_extract(value,'$.data'),?,? FROM json_each(?)
 WHERE ?=(${SIGNATURE_SQL})
 ON CONFLICT(id) DO UPDATE SET data=excluded.data,parent_id=excluded.parent_id,revision=hq_records.revision+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at`;
 let result;try{result=await env.DB.prepare(sql).bind(user.id,user.id,stamp,stamp,JSON.stringify(p.ops.map(({old,revision,...r})=>r)),p.snapshot).run();}catch{fail(409,'The import could not be applied atomically. No import changes were saved. Preview again.');}
 if(!result.meta?.changes)fail(409,'The family records changed during the import. No import changes were saved. Preview again.','revision');
 // Per-record history is written by the atomic statement's database triggers.
 // A summary-feed failure cannot undo or misreport an otherwise saved import.
 const warnings=[];try{await env.DB.prepare('INSERT INTO hq_events(section,record_id,actor_id,action,created_at) VALUES(?,?,?,?,?)').bind('family',null,user.id,'imported family history',stamp).run();}catch{warnings.push('Records and revision history saved; the activity-feed summary could not be written.');}
 return {ok:true,created:create.length,updated:update.length,unchanged:p.keepCount,...(warnings.length?{warnings}:{})};
}
export async function familyImportApi(request,env,user,url){if(!url.pathname.startsWith('/api/hq/family/import/'))return null;if(request.method!=='POST')fail(405,'Use POST.');await requireOwner(env,user);const b=await body(request,2*1024*1024);if(url.pathname==='/api/hq/family/import/preview')return json(await previewFamilyImport(env,user,b.payload,{overwrite:b.overwrite===true}));if(url.pathname==='/api/hq/family/import/apply')return json(await applyFamilyImport(env,user,b.payload,{signature:b.signature,overwrite:b.overwrite===true}));fail(404,'Unknown import action.');}
