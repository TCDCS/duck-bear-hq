/** Owner-only, portable Books backup. OAuth secrets and existing HQ tables are never included. */
import {fail,json,body,boundedBytes,uid,now,query,hash,privateHeaders,downloadDisposition,MAX_FILE_BYTES} from './util.mjs';
import {zipStream} from '../../public/hq/zip.mjs';
import {BACKUP_TABLES,MAX_MANIFEST_BYTES,MAX_ARCHIVE_BYTES,validateBooksArchive} from './backup-format.mjs';
const te=new TextEncoder(),td=new TextDecoder();
const emptySql=Object.keys(BACKUP_TABLES).map(t=>`NOT EXISTS(SELECT 1 FROM ${t})`).join(' AND ')+' AND NOT EXISTS(SELECT 1 FROM books_progress_ops)';
async function readers(env,hooks){if(typeof hooks.readerIds!=='function')fail(503,'Household identity checks are not available.','backup_identity_unavailable');return hooks.readerIds(env);}
async function isEmpty(env){return Boolean((await env.DB.prepare('SELECT '+emptySql+' AS empty').first()).empty);}
export async function exportBooksBackup(env,user,hooks){
 await hooks.requireOwner(env,user);const allowed=await readers(env,hooks);
 // Check snapshot bounds before transferring potentially large rows into Worker memory.
 const sizes=await env.DB.batch(Object.entries(BACKUP_TABLES).map(([table,columns])=>env.DB.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(length(CAST(json_array(${columns.join(',')}) AS BLOB))),0) AS bytes FROM ${table}`)));
 if(sizes.reduce((n,r)=>n+r.results[0].count,0)>50000||sizes.reduce((n,r)=>n+r.results[0].bytes,0)>MAX_MANIFEST_BYTES)fail(413,'This Books catalogue exceeds the browser backup limit. Use a database export and private object backup.','backup_size_limit');
 const selects=Object.entries(BACKUP_TABLES).map(([table,columns])=>env.DB.prepare(`SELECT ${columns.join(',')} FROM ${table} LIMIT 50001`));
 selects.push(env.DB.prepare("SELECT root_id FROM books_connections WHERE id='google-drive'"));
 const results=await env.DB.batch(selects),tables={};let at=0;
 for(const table of Object.keys(BACKUP_TABLES))tables[table]=results[at++].results;
 const rootId=results[at].results[0]?.root_id||tables.books_manifest.find(f=>f.parent_id===null)?.file_id||null;
 const uploads=new Map(tables.books_files.filter(f=>f.provider==='upload').map(f=>[f.id,{...f}]));
 const objects=[];let total=0;
 for(const f of tables.books_files){f.object_key=null;if(f.provider==='upload'){const original=uploads.get(f.id);if(!original.object_key?.startsWith('books/'))fail(409,'An uploaded book has an invalid storage reference.','backup_missing_file');const stored=await env.MEDIA.head(original.object_key);if(!stored||stored.size!==f.size)fail(409,'An uploaded book or cover is missing or changed. Backup stopped.','backup_missing_file');total+=f.size;objects.push({fileId:f.id,path:'files/'+f.id,sha256:f.version,size:f.size});}}
 const manifest=validateBooksArchive({format:'duck-bear-books',version:1,exportedAt:now(),rootId,driveOriginalsIncluded:false,tables,objects},allowed);
 const bytes=te.encode(JSON.stringify(manifest));if(bytes.length>MAX_MANIFEST_BYTES||total+bytes.length+objects.length*500>MAX_ARCHIVE_BYTES)fail(413,'This library is too large for the browser archive. Use a database export and a separate backup of private uploaded files.','backup_size_limit');
 const entries=[{name:'manifest.json',data:bytes},...objects.map(o=>({name:o.path,data:async()=>{const file=await env.MEDIA.get(uploads.get(o.fileId).object_key);if(!file)throw new Error('Backup stopped: an uploaded file disappeared.');const bytes=await boundedBytes(file,MAX_FILE_BYTES);if(bytes.length!==o.size||await hash(bytes)!==o.sha256)throw new Error('Backup stopped: an uploaded file checksum changed.');return bytes;}}))];
 return new Response(zipStream(entries),{headers:{...privateHeaders('application/zip'),'content-disposition':downloadDisposition('duck-bear-books-backup.zip'),'x-books-drive-originals':'excluded'}});
}
export async function previewBooksRestore(env,user,hooks,input){
 await hooks.requireOwner(env,user);const encoded=te.encode(JSON.stringify(input));if(encoded.length>MAX_MANIFEST_BYTES)fail(413,'Backup manifest is too large.');const manifest=validateBooksArchive(input,await readers(env,hooks));
 const canRestore=await isEmpty(env),summary={canRestore,books:manifest.tables.books_catalogue.length,uploadedFiles:manifest.objects.length,readingPositions:manifest.tables.books_read_state.length,annotations:manifest.tables.books_annotations.length,driveOriginalsIncluded:false,requiresGoogleReconnect:manifest.tables.books_files.some(f=>f.provider==='drive'),warning:canRestore?'Only Books data will be restored. Original Google files are not in this archive.':'Books already contains records. Nothing will be overwritten; use an empty Books database with the same household accounts for recovery.'};
 if(!canRestore)return {...summary,jobId:null};
 const id=uid('br_'),key='books/restore-manifests/'+id,bytes=te.encode(JSON.stringify(manifest));await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:'application/json'}});
 await env.DB.prepare('INSERT INTO books_restore_jobs(id,user_id,manifest_key,manifest_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)').bind(id,user.id,key,await hash(bytes),Date.now()+3600000,now()).run();return {...summary,jobId:id};
}
async function restoreJob(env,user,id){if(!/^[\w-]{1,200}$/.test(id||''))fail(400,'Invalid restore session.');const job=await env.DB.prepare('SELECT * FROM books_restore_jobs WHERE id=? AND user_id=? AND used_at IS NULL AND expires_at>?').bind(id,user.id,Date.now()).first();if(!job)fail(400,'This restore session expired or was already used.','restore_expired');const object=await env.MEDIA.get(job.manifest_key);if(!object)fail(400,'Restore preview is no longer available.');const bytes=await boundedBytes(object,MAX_MANIFEST_BYTES);if(await hash(bytes)!==job.manifest_hash)fail(400,'Restore preview checksum changed.');return {...job,manifest:JSON.parse(td.decode(bytes))};}
export async function stageBooksRestoreFile(env,user,id,fileId,request){const job=await restoreJob(env,user,id),object=job.manifest.objects.find(o=>o.fileId===fileId);if(!object)fail(400,'This file is not part of the selected backup.');const bytes=await boundedBytes(request,MAX_FILE_BYTES);if(bytes.length!==object.size||await hash(bytes)!==object.sha256)fail(400,'The backup file checksum does not match.','restore_checksum');const file=job.manifest.tables.books_files.find(f=>f.id===fileId),key='books/restored/'+id+'/'+fileId+'/'+object.sha256;await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:file.mime}});await env.DB.prepare('INSERT INTO books_restore_files(job_id,file_id,object_key,sha256,size) VALUES(?,?,?,?,?) ON CONFLICT(job_id,file_id) DO UPDATE SET object_key=excluded.object_key,sha256=excluded.sha256,size=excluded.size').bind(id,fileId,key,object.sha256,bytes.length).run();return {stored:true};}
export async function applyBooksRestore(env,user,hooks,id,options){
 await hooks.requireOwner(env,user);if(options.confirm!=='RESTORE BOOKS')fail(400,'Confirm this recovery with RESTORE BOOKS.');const job=await restoreJob(env,user,id),manifest=validateBooksArchive(job.manifest,await readers(env,hooks));if(!await isEmpty(env))fail(409,'Books changed after preview. No existing records will be overwritten.','restore_not_empty');
 const staged=new Map((await query(env.DB,'SELECT * FROM books_restore_files WHERE job_id=?',id)).map(o=>[o.file_id,o]));
 for(const object of manifest.objects){const s=staged.get(object.fileId);if(!s||s.sha256!==object.sha256||s.size!==object.size)fail(400,'Upload every original and cover from the backup before restoring.','restore_missing_file');const stored=await env.MEDIA.get(s.object_key);if(!stored||stored.size!==object.size)fail(400,'A staged backup file is missing.','restore_missing_file');if(await hash(await boundedBytes(stored,MAX_FILE_BYTES))!==object.sha256)fail(400,'A staged backup file checksum changed.','restore_checksum');}
 for(const file of manifest.tables.books_files)if(file.provider==='upload')file.object_key=staged.get(file.id).object_key;
 const applied=uid(),guard='EXISTS(SELECT 1 FROM books_restore_jobs WHERE id=? AND used_at=?)';
 const statements=[env.DB.prepare(`UPDATE books_restore_jobs SET used_at=? WHERE id=? AND user_id=? AND used_at IS NULL AND expires_at>? AND ${emptySql}`).bind(applied,id,user.id,Date.now())];
 // Bound JSON arguments below D1's per-row size; all insert groups share one transaction.
 for(const [table,columns] of Object.entries(BACKUP_TABLES)){let group=[],bytes=2;const flush=()=>{if(!group.length)return;const select=columns.map(c=>`json_extract(value,'$.${c}')`).join(',');statements.push(env.DB.prepare(`INSERT INTO ${table}(${columns.join(',')}) SELECT ${select} FROM json_each(?) WHERE ${guard}`).bind(JSON.stringify(group),id,applied));group=[];bytes=2;};for(const row of manifest.tables[table]){const length=te.encode(JSON.stringify(row)).length;if(bytes+length>200000)flush();group.push(row);bytes+=length+1;}flush();}
 try{const results=await env.DB.batch(statements);if(!results[0].meta.changes)fail(409,'Books changed during recovery. No existing records were overwritten.','restore_conflict');}catch(e){if(e.status)throw e;fail(409,'The recovery transaction failed. No Books records were partially restored.','restore_failed');}
 return {restored:true,books:manifest.tables.books_catalogue.length,files:manifest.tables.books_files.length,googleCredentialsRestored:false,message:'Books restored privately. Reconnect Google and select the source folder before opening Drive books. Existing website modules were not changed.'};
}
export async function booksBackupApi(request,env,user,hooks,url){const p=url.pathname,m=request.method;if(p==='/api/hq/books/backup'&&m==='GET')return exportBooksBackup(env,user,hooks);
 if(!p.startsWith('/api/hq/books/restore/'))return null;
 await hooks.requireOwner(env,user);
 if(p==='/api/hq/books/restore/preview'&&m==='POST')return json(await previewBooksRestore(env,user,hooks,(await body(request,MAX_MANIFEST_BYTES+100)).manifest));
 const path=p.match(/^\/api\/hq\/books\/restore\/([\w-]+)\/(?:files\/([\w-]+)|(apply))$/);if(path){if(path[2]&&m==='PUT')return json(await stageBooksRestoreFile(env,user,path[1],path[2],request));if(path[3]&&m==='POST')return json(await applyBooksRestore(env,user,hooks,path[1],await body(request)));}
 fail(404,'That Books recovery action does not exist.');}
