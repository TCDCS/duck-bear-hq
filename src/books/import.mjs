import {fail,uid,now,query,hash,plain} from './util.mjs';
import {driveJson,opfFromDrive,verifyFileInLibrary} from './google.mjs';
import {formatFor,mimeFor,parseCalibreOpf,cleanMetadata} from './metadata.mjs';
const FOLDER='application/vnd.google-apps.folder',SHORTCUT='application/vnd.google-apps.shortcut';
const MAX_ITEMS=100000;
const EMPTY_WARNING='No books were visible to this app. The library may be empty or Google permissions may exclude existing nested files; no original files or reading records were removed.';
const SOURCE_GUARD="EXISTS(SELECT 1 FROM books_scan_jobs j JOIN books_connections c ON c.id='google-drive' AND c.root_id=j.root_id WHERE j.id=? AND j.status='running' AND c.token_cipher IS NOT NULL)";

async function jobRecord(env,id){
 const job=await env.DB.prepare('SELECT * FROM books_scan_jobs WHERE id=?').bind(id).first();
 if(!job)fail(404,'This scan does not exist.');return job;
}
async function requireSource(env,job){
 const connection=await env.DB.prepare("SELECT root_id,token_cipher FROM books_connections WHERE id='google-drive'").first();
 if(!connection?.token_cipher)fail(409,'Reconnect Google Drive before resuming this scan.','not_connected');
 if(connection.root_id!==job.root_id)fail(409,'The library folder changed. Start a new scan for the selected folder.','root_changed');
}
export async function startScan(env){
 const connection=await env.DB.prepare("SELECT root_id,token_cipher FROM books_connections WHERE id='google-drive'").first();
 if(!connection?.token_cipher||!connection.root_id)fail(409,'Connect Google Drive and choose the eBooks folder first.','not_connected');
 const id=uid('scan_'),time=now();
 // A conditional insert inside the batch prevents two tabs from creating duplicate jobs.
 await env.DB.batch([
  env.DB.prepare(`INSERT INTO books_scan_jobs(id,root_id,status,created_at,updated_at)
   SELECT ?,?,'running',?,? WHERE NOT EXISTS(SELECT 1 FROM books_scan_jobs WHERE root_id=? AND status IN ('running','paused'))
   AND EXISTS(SELECT 1 FROM books_connections WHERE id='google-drive' AND root_id=? AND token_cipher IS NOT NULL)`).bind(id,connection.root_id,time,time,connection.root_id,connection.root_id),
  env.DB.prepare('INSERT INTO books_scan_queue(job_id,folder_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM books_scan_jobs WHERE id=?)').bind(id,connection.root_id,id),
  env.DB.prepare(`INSERT INTO books_manifest(file_id,parent_id,kind,metadata_json,seen_job)
   SELECT ?,NULL,'folder','{}',? WHERE EXISTS(SELECT 1 FROM books_scan_jobs WHERE id=?)
   ON CONFLICT(file_id) DO UPDATE SET parent_id=NULL,seen_job=excluded.seen_job`).bind(connection.root_id,id,id)
 ]);
 const active=await env.DB.prepare("SELECT id FROM books_scan_jobs WHERE root_id=? AND status IN ('running','paused') ORDER BY created_at DESC LIMIT 1").bind(connection.root_id).first();
 if(!active)fail(409,'The Google library connection changed. Try again.','connection_changed');
 return scanStatus(env,active.id);
}
export async function scanStatus(env,id){
 const job=await jobRecord(env,id);
 const counts=await env.DB.prepare("SELECT COUNT(*) AS total,SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done FROM books_scan_queue WHERE job_id=?").bind(id).first();
 return {id:job.id,status:job.status,filesSeen:job.files_seen,booksSeen:job.books_seen,foldersTotal:counts.total,foldersDone:counts.done||0,warnings:JSON.parse(job.errors_json),updatedAt:job.updated_at};
}
export async function pauseScan(env,id){
 await jobRecord(env,id);
 await env.DB.batch([
  env.DB.prepare("UPDATE books_scan_jobs SET status='paused',updated_at=? WHERE id=? AND status='running'").bind(now(),id),
  env.DB.prepare("UPDATE books_scan_queue SET status='queued',lease=NULL,locked_until=0 WHERE job_id=? AND status='working' AND EXISTS(SELECT 1 FROM books_scan_jobs WHERE id=? AND status='paused')").bind(id,id)
 ]);
 return scanStatus(env,id);
}
export async function resumeScan(env,id){
 const job=await jobRecord(env,id);await requireSource(env,job);
 await env.DB.prepare("UPDATE books_scan_jobs SET status='running',updated_at=? WHERE id=? AND status='paused' AND EXISTS(SELECT 1 FROM books_connections WHERE id='google-drive' AND root_id=? AND token_cipher IS NOT NULL)").bind(now(),id,job.root_id).run();
 return scanStatus(env,id);
}
export async function stepScan(env,id){
 const job=await jobRecord(env,id);if(job.status!=='running')return scanStatus(env,id);
 await requireSource(env,job);
 const lease=uid(),until=Date.now()+45000;
 const claimed=await env.DB.prepare(`UPDATE books_scan_queue SET status='working',lease=?,locked_until=?
  WHERE job_id=? AND folder_id=(SELECT folder_id FROM books_scan_queue WHERE job_id=? AND (status='queued' OR (status='working' AND locked_until<?)) ORDER BY folder_id LIMIT 1)
  AND ${SOURCE_GUARD} RETURNING *`).bind(lease,until,id,id,Date.now(),id).all();
 const queue=claimed.results?.[0];
 if(!queue){
  await env.DB.prepare(`UPDATE books_scan_jobs SET status=CASE WHEN books_seen=0 THEN 'empty' ELSE 'complete' END,updated_at=?,
   errors_json=CASE WHEN books_seen=0 THEN json_insert(errors_json,'$[#]',?) ELSE errors_json END
   WHERE id=? AND ${SOURCE_GUARD} AND NOT EXISTS(SELECT 1 FROM books_scan_queue WHERE job_id=? AND status!='done')`).bind(now(),EMPTY_WARNING,id,id,id).run();
  return scanStatus(env,id);
 }
 try{
  if(job.files_seen>=MAX_ITEMS)fail(413,'This scan reached the 100,000-item safety limit.','scan_limit');
  if(queue.folder_id!==job.root_id)await verifyFileInLibrary(env,queue.folder_id);
  const response=await driveJson(env,'files',{q:`'${queue.folder_id}' in parents and trashed=false`,pageSize:100,pageToken:queue.page_token||undefined,fields:'nextPageToken,files(id,name,mimeType,parents,size,md5Checksum,modifiedTime,trashed)',supportsAllDrives:true,includeItemsFromAllDrives:true});
  const items=response.files??[];
  if(!Array.isArray(items)||items.length>100||response.nextPageToken!==undefined&&typeof response.nextPageToken!=='string')fail(502,'Google returned an invalid scan page. Resume to retry.','provider_error');
  if(job.files_seen+items.length>MAX_ITEMS)fail(413,'This page would exceed the 100,000-item safety limit.','scan_limit');
  const current=await env.DB.prepare(`SELECT 1 AS active FROM books_scan_queue WHERE job_id=? AND folder_id=? AND lease=? AND status='working' AND locked_until>? AND ${SOURCE_GUARD}`).bind(id,queue.folder_id,lease,Date.now(),id).first();
  if(!current)return scanStatus(env,id);
  const warnings=[],files=[];
  for(const file of items){
   if(!/^[\w-]{10,200}$/.test(file.id)||file.trashed)continue;
   if(file.mimeType===SHORTCUT){warnings.push('Shortcuts are not followed because they may point outside the selected library.');continue;}
   if(file.parents?.[0]&&file.parents[0]!==queue.folder_id)continue;
   files.push(file);
  }
  // Prepare OPF and deterministic identifiers before any page data is committed.
  const publication=response.nextPageToken?{books:[],warnings:[]}:await prepareFolder(env,id,queue.folder_id,files);
  warnings.push(...publication.warnings);
  const commit=uid(),guard='EXISTS(SELECT 1 FROM books_scan_queue WHERE job_id=? AND folder_id=? AND lease=?)';
  const guarded=(sql,...values)=>env.DB.prepare(sql.replaceAll('$GUARD',guard)).bind(...values,id,queue.folder_id,commit);
  const statements=[env.DB.prepare(`UPDATE books_scan_queue SET lease=? WHERE job_id=? AND folder_id=? AND status='working' AND lease=? AND locked_until>? AND ${SOURCE_GUARD}
   AND EXISTS(SELECT 1 FROM books_scan_jobs WHERE id=? AND files_seen+?<=?)`).bind(commit,id,queue.folder_id,lease,Date.now(),id,id,items.length,MAX_ITEMS)];
  for(const file of files){
   const kind=file.mimeType===FOLDER?'folder':'file';
   statements.push(guarded(`INSERT INTO books_manifest(file_id,parent_id,kind,metadata_json,seen_job) SELECT ?,?,?,?,? WHERE $GUARD
    ON CONFLICT(file_id) DO UPDATE SET parent_id=excluded.parent_id,kind=excluded.kind,metadata_json=excluded.metadata_json,seen_job=excluded.seen_job`,file.id,queue.folder_id,kind,JSON.stringify(file),id));
   if(kind==='folder')statements.push(guarded('INSERT OR IGNORE INTO books_scan_queue(job_id,folder_id) SELECT ?,? WHERE $GUARD',id,file.id));
  }
  for(const book of publication.books){
   const m=book.metadata,time=now();
   statements.push(guarded(`INSERT INTO books_catalogue(id,source,source_group,title,authors_json,series,series_index,description,language,tags_json,identifiers_json,imported_rating,metadata_json,updated_at,created_at)
    SELECT ?,'drive',?,?,?,?,?,?,?,?,?,?,?,?,? WHERE $GUARD
    ON CONFLICT(source_group) DO UPDATE SET title=excluded.title,authors_json=excluded.authors_json,series=excluded.series,series_index=excluded.series_index,description=excluded.description,language=excluded.language,tags_json=excluded.tags_json,identifiers_json=excluded.identifiers_json,imported_rating=excluded.imported_rating,metadata_json=excluded.metadata_json,updated_at=excluded.updated_at,unavailable=0`,book.id,'drive:'+book.key,m.title,JSON.stringify(m.authors),m.series,m.seriesIndex,m.description,m.language,JSON.stringify(m.tags),JSON.stringify(m.identifiers),m.importedRating,JSON.stringify(m),time,time));
   for(const file of book.files){
    statements.push(guarded(`INSERT INTO books_files(id,book_id,provider,source_id,parent_id,name,mime,format,version,size,modified_at)
     SELECT ?,?,'drive',?,?,?,?,?,?,?,? WHERE $GUARD
     ON CONFLICT(source_id) DO UPDATE SET book_id=excluded.book_id,parent_id=excluded.parent_id,name=excluded.name,mime=excluded.mime,format=excluded.format,version=excluded.version,size=excluded.size,modified_at=excluded.modified_at,available=1`,file.id,book.id,file.sourceId,queue.folder_id,file.name,mimeFor(file.format),file.format,file.version,file.size,file.modifiedAt));
   }
   if(book.coverId)statements.push(guarded('UPDATE books_catalogue SET cover_file_id=? WHERE id=? AND $GUARD',book.coverId,book.id));
  }
  for(const warning of new Set(warnings)){
   statements.push(guarded(`UPDATE books_scan_jobs SET errors_json=json_insert(CASE WHEN json_array_length(errors_json)>=30 THEN json_remove(errors_json,'$[0]') ELSE errors_json END,'$[#]',?)
    WHERE id=? AND NOT EXISTS(SELECT 1 FROM json_each(errors_json) WHERE value=?) AND $GUARD`,warning,id,warning));
  }
  statements.push(guarded('UPDATE books_scan_jobs SET files_seen=files_seen+?,books_seen=books_seen+?,updated_at=? WHERE id=? AND $GUARD',items.length,publication.books.length,now(),id));
  statements.push(guarded("UPDATE books_scan_queue SET status=?,page_token=?,locked_until=0,lease=NULL WHERE job_id=? AND folder_id=? AND $GUARD",response.nextPageToken?'queued':'done',response.nextPageToken||'',id,queue.folder_id));
  // One atomic D1 batch: the lease/source CAS gates every write, including the checkpoint.
  await env.DB.batch(statements);
 }catch(error){
  await env.DB.prepare("UPDATE books_scan_queue SET status='queued',locked_until=0,lease=NULL WHERE job_id=? AND folder_id=? AND lease=?").bind(id,queue.folder_id,lease).run();
  throw error;
 }
 return scanStatus(env,id);
}
async function prepareFolder(env,jobId,parent,pageFiles){
 const rows=await query(env.DB,"SELECT metadata_json FROM books_manifest WHERE parent_id=? AND kind='file' AND seen_job=?",parent,jobId);
 const combined=new Map(rows.map(row=>{const file=JSON.parse(row.metadata_json);return [file.id,file];}));
 for(const file of pageFiles)if(file.mimeType!==FOLDER)combined.set(file.id,file);
 const files=[...combined.values()],originals=files.filter(file=>formatFor(file.name)),warnings=[];
 if(!originals.length)return {books:[],warnings};
 const sidecar=files.find(file=>file.name.toLowerCase()==='metadata.opf'),cover=files.find(file=>/^cover\.(jpe?g|png|webp)$/i.test(file.name));
 let parsed=null;
 if(sidecar){try{
  const current=await driveJson(env,'files/'+sidecar.id,{fields:'id,parents,trashed,mimeType',supportsAllDrives:true});
  if(current.trashed||current.mimeType===SHORTCUT||current.parents?.[0]!==parent)fail(403,'The metadata file moved outside its scanned folder.','outside_library');
  await verifyFileInLibrary(env,parent);
  parsed=parseCalibreOpf(await opfFromDrive(env,sidecar.id));
 }catch{warnings.push('At least one metadata.opf could not be read. The original files are unchanged and filenames were used instead.');}}
 const onePerFormat=new Set(originals.map(file=>formatFor(file.name))).size===originals.length;
 const groups=parsed&&onePerFormat?[{key:parent,files:originals,metadata:parsed,cover}]:originals.map(file=>({key:file.id,files:[file],metadata:cleanMetadata({title:file.name.replace(/\.[^.]+$/,'')}),cover:originals.length===1?cover:null}));
 const books=[];
 for(const group of groups){
  const book={id:'b_'+(await hash('drive:'+group.key)).slice(0,32),key:group.key,metadata:group.metadata,files:[]};
  for(const file of [...group.files,...(group.cover?[group.cover]:[])]){
   const id='f_'+(await hash('drive:'+file.id)).slice(0,32),isCover=file===group.cover;
   const format=isCover?file.name.split('.').pop().toLowerCase().replace('jpeg','jpg'):formatFor(file.name);
   book.files.push({id,sourceId:file.id,name:plain(file.name,500),format,version:plain(file.md5Checksum||`${file.modifiedTime||'unknown'}:${file.size||0}`,200),size:Number(file.size)||0,modifiedAt:file.modifiedTime||now()});
   if(isCover)book.coverId=id;
  }
  books.push(book);
 }
 return {books,warnings};
}
