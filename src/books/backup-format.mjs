/** Versioned allowlist for private Books archives. Never accept SQL/table names from an archive. */
import {fail,validateLocator,folderId,MAX_FILE_BYTES} from './util.mjs';
import {mimeFor} from './metadata.mjs';
export const MAX_MANIFEST_BYTES=8*1024*1024;
export const MAX_ARCHIVE_BYTES=180*1024*1024;
export const BACKUP_TABLES={
 books_catalogue:'id source source_group title authors_json series series_index description language tags_json identifiers_json imported_rating cover_file_id metadata_json created_by updated_at created_at unavailable'.split(' '),
 books_files:'id book_id provider source_id parent_id name mime format version size object_key modified_at available'.split(' '),
 books_manifest:'file_id parent_id kind metadata_json seen_job'.split(' '),
 books_read_state:'user_id file_id version revision locator_json progress furthest device_id updated_at last_op_id'.split(' '),
 books_annotations:'id user_id file_id version kind locator_json end_offset selected_text note colour revision deleted updated_at'.split(' '),
 books_user_books:'user_id book_id status favourite rating updated_at'.split(' '),
 books_shelves:'id user_id name created_at'.split(' '),
 books_shelf_items:'shelf_id book_id'.split(' '),
 books_preferences:'user_id data_json updated_at'.split(' ')
};
const nullable=new Set(['series_index','imported_rating','cover_file_id','created_by','source_id','parent_id','object_key','end_offset','rating']);
const numeric=new Set(['series_index','imported_rating','unavailable','size','available','revision','progress','furthest','end_offset','deleted','favourite','rating']);
const identifier=new Set(['id','book_id','file_id','user_id','cover_file_id','created_by','shelf_id']);
const maxText={description:20000,selected_text:4000,note:12000,title:1000,name:1000,source_group:500,version:200,device_id:160,last_op_id:160};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const invalid=message=>fail(400,'Invalid Books backup: '+message,'invalid_backup');
function jsonField(value,name){let parsed;try{parsed=JSON.parse(value);}catch{invalid(name+' is not valid JSON.');}if(parsed===null||typeof parsed!=='object')invalid(name+' must contain structured data.');return parsed;}
const enumField=(v,values)=>{if(!values.includes(v))invalid('Unsupported field value.');};
function row(table,value){if(!object(value)||Object.keys(value).some(k=>!BACKUP_TABLES[table].includes(k)))invalid('Unknown data fields.');const out={};for(const key of BACKUP_TABLES[table]){const v=value[key];if(v===null&&nullable.has(key)){out[key]=null;continue;}if(numeric.has(key)){if(typeof v!=='number'||!Number.isFinite(v))invalid(key+' is not a finite number.');}else{if(typeof v!=='string'||v.length>(key.endsWith('_json')?40000:maxText[key]||500)||/[\u0000]/.test(v))invalid('Invalid '+key+'.');if(identifier.has(key)&&!/^[\w-]{1,200}$/.test(v))invalid('Invalid record ID.');if(key.endsWith('_at')&&!Number.isFinite(Date.parse(v)))invalid('Invalid record date.');if(key.endsWith('_json'))jsonField(v,key);}out[key]=v;}
 for(const key of ['available','unavailable','deleted','favourite'])if(key in out&&![0,1].includes(out[key]))invalid(key+' must be zero or one.');
 if('revision' in out&&(!Number.isSafeInteger(out.revision)||out.revision<1))invalid('Invalid revision.');
 if('rating' in out&&out.rating!==null&&(!Number.isInteger(out.rating)||out.rating<1||out.rating>5))invalid('Invalid personal rating.');
 if('imported_rating' in out&&out.imported_rating!==null&&(out.imported_rating<0||out.imported_rating>5))invalid('Invalid imported rating.');
 if(table==='books_catalogue'){enumField(out.source,['drive','upload']);for(const key of ['authors_json','tags_json']){const data=jsonField(out[key],key);if(!Array.isArray(data)||data.length>100||data.some(x=>typeof x!=='string'||x.length>1000))invalid('Invalid authors or tags.');}if(!object(jsonField(out.identifiers_json,'identifiers'))||!object(jsonField(out.metadata_json,'metadata')))invalid('Invalid catalogue metadata.');}
 if(table==='books_files'){enumField(out.provider,['drive','upload']);enumField(out.format,['epub','pdf','mobi','azw','azw3','fb2','cbz','cbr','txt','jpg','png','webp']);if(out.mime!==mimeFor(out.format))invalid('The book type does not match its format.');if(!Number.isSafeInteger(out.size)||out.size<0||out.size>Number.MAX_SAFE_INTEGER)invalid('Invalid file size.');if(out.object_key!==null)invalid('Archive cannot select server storage paths.');if(out.provider==='upload'&&(!/^[\w-]{43}$/.test(out.version)||out.size>MAX_FILE_BYTES))invalid('Uploaded file needs its original checksum and a supported size.');if(out.provider==='drive'){folderId(out.source_id);folderId(out.parent_id);}}
 if(table==='books_manifest'){folderId(out.file_id);if(out.parent_id)folderId(out.parent_id);enumField(out.kind,['file','folder']);if(!object(jsonField(out.metadata_json,'manifest metadata')))invalid('Invalid Drive metadata.');}
 if(table==='books_read_state'){for(const key of ['progress','furthest'])if(out[key]<0||out[key]>1)invalid('Reading percentage is out of bounds.');if(out.furthest<out.progress)invalid('Furthest progress is behind current progress.');}
 if('locator_json' in out)validateLocator(jsonField(out.locator_json,'locator'));
 if(table==='books_annotations'){enumField(out.kind,['bookmark','note','highlight']);enumField(out.colour,['yellow','green','blue','pink']);if(out.end_offset!==null&&(!Number.isSafeInteger(out.end_offset)||out.end_offset<0))invalid('Invalid selection end.');}
 if(table==='books_user_books')enumField(out.status,['none','want','reading','finished']);
 if(table==='books_preferences'){const settings=jsonField(out.data_json,'preferences');if(!object(settings))invalid('Invalid preferences.');const allowed=['theme','font','fontSize','lineHeight','margin','flow'];if(Object.keys(settings).some(k=>!allowed.includes(k)))invalid('Unknown preferences.');for(const [key,values] of [['theme',['light','dark','sepia']],['font',['serif','sans']],['flow',['scrolled','paginated']]])if(key in settings)enumField(settings[key],values);for(const [key,min,max] of [['fontSize',14,36],['lineHeight',1.2,2.5],['margin',8,80]])if(key in settings&&(typeof settings[key]!=='number'||!Number.isFinite(settings[key])||settings[key]<min||settings[key]>max))invalid('Invalid reader appearance.');}
 return out;
}
export function validateBooksArchive(value,readerIds){
 if(!object(value)||value.format!=='duck-bear-books'||value.version!==1||value.driveOriginalsIncluded!==false||!object(value.tables)||!Array.isArray(value.objects))invalid('Unsupported format.');
 if(Object.keys(value.tables).some(k=>!Object.hasOwn(BACKUP_TABLES,k)))invalid('Archive contains unknown tables.');
 const allowed=new Set(readerIds);const tables={};let total=0;
 for(const table of Object.keys(BACKUP_TABLES)){const rows=value.tables[table];if(!Array.isArray(rows)||(total+=rows.length)>50000)invalid('Unsupported record count.');const unique=new Set();tables[table]=rows.map(v=>{const r=row(table,v);if(r.user_id&&!allowed.has(r.user_id)||r.created_by&&!allowed.has(r.created_by))fail(403,'This backup contains another household identity. Reading records will not be reassigned.','backup_identity');let key=r.id||r.file_id||r.user_id;if(table==='books_read_state')key=[r.user_id,r.file_id,r.version].join('\0');if(table==='books_annotations')key=[r.user_id,r.id].join('\0');if(table==='books_user_books')key=[r.user_id,r.book_id].join('\0');if(table==='books_shelf_items')key=[r.shelf_id,r.book_id].join('\0');if(unique.has(key))invalid('Duplicate '+table+' record.');unique.add(key);return r;});}
 const books=new Map(tables.books_catalogue.map(b=>[b.id,b])),files=new Map(tables.books_files.map(f=>[f.id,f])),shelves=new Map(tables.books_shelves.map(s=>[s.id,s]));
 const groups=new Set(),sourceIds=new Set();for(const b of books.values()){if(groups.has(b.source_group))invalid('Duplicate source book.');groups.add(b.source_group);if(b.cover_file_id){const f=files.get(b.cover_file_id);if(!f||f.book_id!==b.id||!['jpg','png','webp'].includes(f.format))invalid('Invalid cover reference.');}}
 for(const f of files.values()){if(!books.has(f.book_id))invalid('A book reference is missing.');if(f.source_id){if(sourceIds.has(f.source_id))invalid('Duplicate original file.');sourceIds.add(f.source_id);}}
 for(const table of ['books_read_state','books_annotations'])for(const r of tables[table]){const f=files.get(r.file_id);if(!f)invalid('A reading file is missing.');const locator=JSON.parse(r.locator_json);if(locator.type!==f.format)invalid('Reading position type does not match the file.');}
 for(const r of tables.books_user_books)if(!books.has(r.book_id))invalid('A reading choice has no book.');
 for(const r of tables.books_shelf_items)if(!books.has(r.book_id)||!shelves.has(r.shelf_id))invalid('A collection reference is missing.');
 const rootId=value.rootId===null?null:folderId(value.rootId);const manifest=new Map(tables.books_manifest.map(r=>[r.file_id,r]));
 for(const f of files.values())if(f.provider==='drive'){let id=f.source_id,seen=new Set();if(!rootId)invalid('Drive source folder reference is missing.');while(id!==rootId){if(seen.has(id)||seen.size>=32)invalid('Cyclic or too-deep Drive ancestry.');seen.add(id);const record=manifest.get(id);if(!record?.parent_id)invalid('Incomplete Drive ancestry.');id=record.parent_id;}}
 const objects=[],ids=new Set();let archiveBytes=0;
 for(const item of value.objects){if(!object(item))invalid('Invalid archived file.');const f=files.get(item.fileId);if(!f||f.provider!=='upload'||ids.has(f.id)||item.path!=='files/'+f.id||item.sha256!==f.version||item.size!==f.size)invalid('Invalid archived file reference.');ids.add(f.id);archiveBytes+=item.size;objects.push({fileId:f.id,path:item.path,sha256:item.sha256,size:item.size});}
 if(archiveBytes>MAX_ARCHIVE_BYTES-MAX_MANIFEST_BYTES)invalid('Archive is too large.');
 for(const f of files.values())if(f.provider==='upload'&&!ids.has(f.id))invalid('An uploaded original or cover is absent.');
 return {format:'duck-bear-books',version:1,exportedAt:typeof value.exportedAt==='string'?value.exportedAt:'',rootId,driveOriginalsIncluded:false,tables,objects};
}
