import {fail,plain,validateLocator,hash,now,query} from './util.mjs';
export async function fileRecord(env,id){const file=await env.DB.prepare('SELECT * FROM books_files WHERE id=?').bind(id).first();if(!file)fail(404,'That book file is not in this library.','file_missing');return file;}
export async function assertVersion(env,id,version){const f=await fileRecord(env,id);if(typeof version!=='string'||f.version!==version)fail(409,'This book file has a different version. Your old reading position has been preserved.','version_changed');return f;}
export async function readProgress(env,user,fileId,version){const row=await env.DB.prepare('SELECT * FROM books_read_state WHERE user_id=? AND file_id=? AND version=?').bind(user.id,fileId,version).first();return row?{fileId,version,revision:row.revision,locator:JSON.parse(row.locator_json),progress:row.progress,furthest:row.furthest,deviceId:row.device_id,updatedAt:row.updated_at}:{fileId,version,revision:0,locator:null,progress:0,furthest:0,deviceId:'',updatedAt:null};}
export async function saveProgress(env,user,fileId,input){const file=await assertVersion(env,fileId,input.version);const locator=validateLocator(input.locator);if(locator.type!==file.format)fail(400,'The reading position does not match the book format.','locator_format');if(!Number.isInteger(input.revision)||input.revision<0||input.revision>2147483646)fail(400,'A valid reading revision is required.');if(typeof input.progress!=='number'||!Number.isFinite(input.progress)||input.progress<0||input.progress>1)fail(400,'Reading progress must be between zero and one.');const deviceId=plain(input.deviceId,100),opId=plain(input.opId,100);if(!/^[\w-]{8,100}$/.test(deviceId)||!/^[-\w]{16,100}$/.test(opId))fail(400,'The reading device and operation IDs are not valid.');const p={fileId,version:input.version,revision:input.revision,locator,progress:input.progress,deviceId,opId};const payloadHash=await hash(JSON.stringify(p));const previous=await env.DB.prepare('SELECT * FROM books_progress_ops WHERE user_id=? AND op_id=?').bind(user.id,opId).first();if(previous){if(previous.payload_hash!==payloadHash)fail(409,'That operation ID was already used for a different save.','operation_conflict');return JSON.parse(previous.result_json);}
 const current=await readProgress(env,user,fileId,input.version);if(current.revision!==input.revision)fail(409,'Another device has a newer reading position. Choose which one to keep.','progress_conflict',{current});const time=now();const result={fileId,version:input.version,revision:input.revision+1,locator,progress:input.progress,furthest:Math.max(current.furthest,input.progress),deviceId,updatedAt:time};
 const writes=await env.DB.batch([
 env.DB.prepare(`INSERT INTO books_read_state(user_id,file_id,version,revision,locator_json,progress,furthest,device_id,updated_at,last_op_id) VALUES(?,?,?,1,?,?,?,?,?,?) ON CONFLICT(user_id,file_id,version) DO UPDATE SET revision=books_read_state.revision+1,locator_json=excluded.locator_json,progress=excluded.progress,furthest=MAX(books_read_state.furthest,excluded.furthest),device_id=excluded.device_id,updated_at=excluded.updated_at,last_op_id=excluded.last_op_id WHERE books_read_state.revision=?`).bind(user.id,fileId,input.version,JSON.stringify(locator),input.progress,result.furthest,deviceId,time,opId,input.revision),
 env.DB.prepare('INSERT OR IGNORE INTO books_progress_ops(user_id,op_id,payload_hash,result_json,created_at) SELECT ?,?,?,?,? FROM books_read_state WHERE user_id=? AND file_id=? AND version=? AND last_op_id=?').bind(user.id,opId,payloadHash,JSON.stringify(result),time,user.id,fileId,input.version,opId)
 ]);
 if(!writes[0].meta?.changes){const replay=await env.DB.prepare('SELECT payload_hash,result_json FROM books_progress_ops WHERE user_id=? AND op_id=?').bind(user.id,opId).first();if(replay?.payload_hash===payloadHash)return JSON.parse(replay.result_json);fail(409,'Another device saved first. Both positions are still available.','progress_conflict',{current:await readProgress(env,user,fileId,input.version)});}
 return result;
}
export async function listAnnotations(env,user,fileId,version){return (await query(env.DB,'SELECT * FROM books_annotations WHERE user_id=? AND file_id=? AND version=? AND deleted=0 ORDER BY updated_at DESC',user.id,fileId,version)).map(annotation);}
function annotation(r){return {id:r.id,fileId:r.file_id,version:r.version,kind:r.kind,locator:JSON.parse(r.locator_json),endOffset:r.end_offset,selectedText:r.selected_text,note:r.note,colour:r.colour,revision:r.revision,deleted:Boolean(r.deleted),updatedAt:r.updated_at};}
export async function saveAnnotation(env,user,id,input){
 if(!/^[\w-]{12,100}$/.test(id))fail(400,'The note ID is not valid.');
 const file=await assertVersion(env,input.fileId,input.version);
 const locator=validateLocator(input.locator);
 if(locator.type!==file.format)fail(400,'The note position does not match the book format.','locator_format');
 if(!['bookmark','highlight','note'].includes(input.kind)||!Number.isInteger(input.revision)||input.revision<0||input.revision>2147483646)fail(400,'The note is not valid.');
 const end=input.endOffset??null;
 if(end!==null&&(!Number.isInteger(end)||locator.type!=='epub'||end<=locator.offset||end>100000000))fail(400,'The highlighted range is not valid.');
 const colour=['yellow','green','pink','blue'].includes(input.colour)?input.colour:'yellow';
 const fields={fileId:input.fileId,version:input.version,kind:input.kind,locator,endOffset:end,selectedText:plain(input.selectedText,4000),note:plain(input.note,12000),colour,deleted:input.deleted===true};
 const read=async()=>{const row=await env.DB.prepare('SELECT * FROM books_annotations WHERE id=? AND user_id=?').bind(id,user.id).first();return row?annotation(row):null;};
 // An identical immediate retry is a lost acknowledgement, not another edit.
 // A stale different payload still conflicts, including attempts to revive a deletion.
 const replay=current=>current?.revision===input.revision+1&&Object.entries(fields).every(([k,v])=>JSON.stringify(current[k])===JSON.stringify(v));
 const conflict=current=>fail(409,'This note has been updated on another device.','annotation_conflict',{current});
 const current=await read();
 if(replay(current))return current;
 if((current?.revision||0)!==input.revision)conflict(current);
 const written=await env.DB.prepare(`INSERT INTO books_annotations(id,user_id,file_id,version,kind,locator_json,end_offset,selected_text,note,colour,revision,deleted,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,1,?,?) ON CONFLICT(user_id,id) DO UPDATE SET kind=excluded.kind,locator_json=excluded.locator_json,end_offset=excluded.end_offset,selected_text=excluded.selected_text,note=excluded.note,colour=excluded.colour,revision=books_annotations.revision+1,deleted=excluded.deleted,updated_at=excluded.updated_at WHERE books_annotations.revision=? AND books_annotations.file_id=excluded.file_id AND books_annotations.version=excluded.version RETURNING *`)
 .bind(id,user.id,input.fileId,input.version,fields.kind,JSON.stringify(locator),end,fields.selectedText,fields.note,colour,fields.deleted?1:0,now(),input.revision).all();
 if(written.results?.length)return annotation(written.results[0]);
 const latest=await read();if(replay(latest))return latest;conflict(latest);
}
