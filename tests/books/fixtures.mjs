import {makeD1,makeR2} from '../../tools/books/sqlite.mjs';
import {ensureBooksSchema} from '../../src/books/schema.mjs';
import {seal} from '../../src/books/util.mjs';
export const ROOT='drive_root_0001',CAL='calibre_folder_01',AUTHOR='author_folder_001',BOOK='book_folder_0001',FILE='epub_file_00001',COVER='cover_file_0001',OPF='opf_file_00001';
export const OPFXML=`<package><metadata><dc:title xmlns:dc="urn:dc">Sea &amp; Sky</dc:title><dc:creator xmlns:dc="urn:dc">Test Author</dc:creator><dc:language xmlns:dc="urn:dc">eng</dc:language><meta name="calibre:series" content="Seaside"/><meta name="calibre:series_index" content="2"/></metadata></package>`;
const folder=(id,name,parent)=>({id,name,mimeType:'application/vnd.google-apps.folder',parents:parent?[parent]:[],isAppAuthorized:true});
export function fakeGoogle(){const calls=[];const data=new Map([
 [ROOT,folder(ROOT,'eBooks')],[CAL,folder(CAL,'Calibre Kindle',ROOT)],[AUTHOR,folder(AUTHOR,'Test Author',CAL)],[BOOK,folder(BOOK,'Sea and Sky (42)',AUTHOR)],
 [FILE,{id:FILE,name:'Sea and Sky.epub',mimeType:'application/epub+zip',parents:[BOOK],size:'1200',md5Checksum:'checksum1',modifiedTime:'2026-01-01T00:00:00Z'}],
 [COVER,{id:COVER,name:'cover.jpg',mimeType:'image/jpeg',parents:[BOOK],size:'100',md5Checksum:'cover1'}],
 [OPF,{id:OPF,name:'metadata.opf',mimeType:'text/xml',parents:[BOOK],size:String(OPFXML.length),md5Checksum:'opf1'}],
 ['bad_shortcut_001',{id:'bad_shortcut_001',name:'Documents shortcut',mimeType:'application/vnd.google-apps.shortcut',parents:[ROOT],shortcutDetails:{targetId:'outside_documents'}}]
 ]);
 const fetcher=async(input,init={})=>{const u=new URL(typeof input==='string'?input:input.url);calls.push({url:u.href,method:init.method||'GET',body:init.body});
 if(u.hostname==='oauth2.googleapis.com'&&u.pathname==='/token'){const p=new URLSearchParams(init.body);return Response.json({access_token:'fixture-access',refresh_token:p.get('grant_type')==='authorization_code'?'fixture-refresh':undefined,scope:'https://www.googleapis.com/auth/drive.file',expires_in:3600,token_type:'Bearer'});}
 if(u.hostname==='oauth2.googleapis.com'&&u.pathname==='/revoke')return new Response(null,{status:200});
 if(u.pathname==='/drive/v3/about')return Response.json({user:{emailAddress:'fixture@example.test'}});
 if(u.pathname==='/drive/v3/files'){const parent=u.searchParams.get('q')?.match(/^'([\w-]+)' in parents/)?.[1];const children=[...data.values()].filter(x=>x.parents?.includes(parent));const start=Number(u.searchParams.get('pageToken')||0);return Response.json({files:children.slice(start,start+2),nextPageToken:start+2<children.length?String(start+2):undefined});}
 const id=u.pathname.match(/^\/drive\/v3\/files\/([\w-]+)$/)?.[1];const item=data.get(id);if(!item)return Response.json({error:{message:'not found'}},{status:404});if(u.searchParams.get('alt')==='media')return new Response(id===OPF?OPFXML:id===COVER?new Uint8Array([255,216,255]):new Uint8Array([80,75,3,4]),{headers:{'content-type':item.mimeType}});return Response.json(item);
 };return {fetcher,data,calls};}
export async function environment(){const fake=fakeGoogle();const env={DB:makeD1(),MEDIA:makeR2(),BOOKS_ENABLED:'true',SITE_ORIGIN:'https://guannan.party',GOOGLE_DRIVE_CLIENT_ID:'fixture.apps.googleusercontent.com',GOOGLE_DRIVE_CLIENT_SECRET:'test-only-secret-for-encryption-123456789',BOOKS_FETCH:fake.fetcher};await ensureBooksSchema(env);return {env,...fake};}
export async function connectedEnv(){const x=await environment();await x.env.DB.prepare('INSERT INTO books_connections(id,root_id,root_label,scope,token_cipher,updated_at) VALUES(?,?,?,?,?,?)').bind('google-drive',ROOT,'eBooks','https://www.googleapis.com/auth/drive.file',await seal(x.env,{access_token:'fixture-access',refresh_token:'fixture-refresh',expires_at:Date.now()+3600000}),new Date().toISOString()).run();return x;}

