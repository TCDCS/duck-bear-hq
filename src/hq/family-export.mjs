/** Authorized, bounded snapshot for local printing. No remote renderer or public files. */
import {fail,json,parseData,queryAll,now} from './core.mjs';
import {requireAccess} from './schema.mjs';
import {FAMILY_KINDS} from './family-fields.mjs';
export async function familyExportSnapshot(env,user,{mode='child',includePrivate=false,includeFaith=false}={}){
 await requireAccess(env,user,'family','export');
 if(!['child','reference','tree'].includes(mode))fail(400,'Choose a supported book format.');
 if(includePrivate&&mode!=='reference')fail(400,'Addresses and health details are only available in the adult reference book.');
 if(includeFaith||includePrivate)await requireAccess(env,user,'intimate','export');
 const counts=await env.DB.prepare("SELECT COUNT(*) AS n,COALESCE(SUM(length(data)),0) AS bytes FROM hq_records WHERE deleted_at IS NULL AND (section='family' OR kind='familyPrivate')").first();
 if(counts.n>10000||counts.bytes>8*1024*1024)fail(413,'This family is too large for one printable snapshot. Use the section backup.');
 const rows=await queryAll(env.DB,"SELECT * FROM hq_records WHERE deleted_at IS NULL AND (section='family' OR (?=1 AND kind='familyPrivate')) ORDER BY id",includePrivate||includeFaith?1:0);
 let records=rows.map(parseData).filter(r=>FAMILY_KINDS.includes(r.kind));
 if(!includePrivate)records=records.map(r=>r.kind==='familyPrivate'?{id:r.id,kind:r.kind,section:r.section,data:{personId:r.data.personId,religion:r.data.religion||'',religionContext:r.data.religionContext||'not-recorded',religionNotes:r.data.religionNotes||''}}:r);
 return {format:'duck-bear-print',version:1,mode,exportedAt:now(),includesPrivate:includePrivate,includesFaith:includeFaith,records};
}
export async function familyExportApi(request,env,user,url){
 if(url.pathname!=='/api/hq/family/book'||request.method!=='GET')return null;
 return json(await familyExportSnapshot(env,user,{mode:url.searchParams.get('mode')||'child',includePrivate:url.searchParams.get('private')==='1',includeFaith:url.searchParams.get('faith')==='1'}));
}
