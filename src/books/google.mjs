import {BooksError,fail,json,now,randomToken,hash,seal,unseal,folderId,cookieValue,plain,boundedBytes} from './util.mjs';
export const DRIVE_FILE='https://www.googleapis.com/auth/drive.file';
export const DRIVE_READONLY='https://www.googleapis.com/auth/drive.readonly';
const CALLBACK='/api/hq/integrations/google-drive/callback';
const STATE_COOKIE='__Host-db-books-oauth';
const fetchWith=(env,input,init={})=>(env.BOOKS_FETCH||fetch)(input,{...init,signal:init.signal||AbortSignal.timeout(20000),redirect:'error'});
const configured=env=>Boolean(env.GOOGLE_DRIVE_CLIENT_ID&&env.GOOGLE_DRIVE_CLIENT_SECRET);
function siteOrigin(env,request){const value=env.SITE_ORIGIN||new URL(request.url).origin;const u=new URL(value);if(u.origin!==value||u.protocol!=='https:'&&u.hostname!=='localhost'&&u.hostname!=='127.0.0.1')fail(503,'The website origin is not configured correctly.','origin_config');if(new URL(request.url).origin!==u.origin)fail(400,'Open this connection on the configured Duck & Bear address.','wrong_host');return value;}
const stateCookie=(value,maxAge=600)=>`${STATE_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
export async function connectionStatus(env){const row=await env.DB.prepare("SELECT root_id,root_label,scope,token_cipher,account_hint,updated_at,last_error FROM books_connections WHERE id='google-drive'").first();return {configured:configured(env),connected:Boolean(row?.token_cipher),rootId:row?.root_id||'',rootLabel:row?.root_label||'',scope:row?.scope||DRIVE_FILE,account:row?.account_hint||'',lastError:row?.last_error||'',updatedAt:row?.updated_at||null,pickerConfigured:Boolean(env.GOOGLE_DRIVE_PICKER_API_KEY&&env.GOOGLE_DRIVE_PROJECT_NUMBER),sourceReadOnly:true};}
export async function beginOAuth(request,env,user,options={}){
 if(!configured(env))fail(503,'Google Drive credentials have not been configured.','not_configured');
 const origin=siteOrigin(env,request);let scope=DRIVE_FILE;if(options.mode==='readonly'){if(options.broadReadConfirmed!==true)fail(400,'Confirm that read-only access covers all files in the Google account before continuing.','scope_confirmation');scope=DRIVE_READONLY;}else if(options.mode&&options.mode!=='selected')fail(400,'Choose a supported access mode.');
 const state=randomToken(),browser=randomToken(),verifier=randomToken();
 // A new attempt replaces older consent windows for this owner, including a callback waiting on Google.
 await env.DB.batch([
  env.DB.prepare('DELETE FROM books_oauth_states WHERE user_id=? OR expires_at < ?').bind(user.id,Date.now()),
  env.DB.prepare('INSERT INTO books_oauth_states(hash,user_id,cookie_hash,verifier_cipher,scope,expires_at,created_at) VALUES(?,?,?,?,?,?,?)').bind(await hash(state),user.id,await hash(browser),await seal(env,{verifier,sessionId:user.session_id||null}),scope,Date.now()+600000,now())
 ]);
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');for(const [key,value] of Object.entries({client_id:env.GOOGLE_DRIVE_CLIENT_ID,redirect_uri:origin+CALLBACK,response_type:'code',scope,state,access_type:'offline',prompt:'select_account consent',code_challenge:await hash(verifier),code_challenge_method:'S256',include_granted_scopes:'false'}))url.searchParams.set(key,value);
 return json({authorizationUrl:url.href},200,{'set-cookie':stateCookie(browser)});
}
export async function finishOAuth(request,env,user){
 const origin=siteOrigin(env,request),url=new URL(request.url),state=url.searchParams.get('state')||'',browser=cookieValue(request,STATE_COOKIE);
 if(!/^[\w-]{30,100}$/.test(state)||!browser)fail(400,'This Google connection has expired. Start again from Books.','invalid_state');
 const stateHash=await hash(state);const row=await env.DB.prepare('SELECT * FROM books_oauth_states WHERE hash=?').bind(stateHash).first();
 if(!row||row.user_id!==user.id||row.cookie_hash!==await hash(browser)||row.expires_at<Date.now())fail(400,'This Google connection has expired or belongs to another session.','invalid_state');
 const decodedState=await unseal(env,row.verifier_cipher);if(decodedState.sessionId!==(user.session_id||null))fail(400,'Restart Google connection from your current signed-in session.','invalid_state');
 const used=await env.DB.prepare('UPDATE books_oauth_states SET expires_at=0 WHERE hash=? AND user_id=? AND expires_at>? RETURNING hash').bind(stateHash,user.id,Date.now()).all();if(!used.results?.length)fail(400,'This Google connection has already been used.','invalid_state');
 if(url.searchParams.has('error')){await env.DB.prepare('DELETE FROM books_oauth_states WHERE hash=?').bind(stateHash).run();return new Response(null,{status:303,headers:{location:origin+'/books/?connection=cancelled','set-cookie':stateCookie('',0),'cache-control':'no-store','referrer-policy':'no-referrer'}});}
 const code=url.searchParams.get('code');if(!code||code.length>4096)fail(400,'Google did not return a valid authorisation code.','missing_code');
 const {verifier}=decodedState;const tokenResponse=await fetchWith(env,'https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:env.GOOGLE_DRIVE_CLIENT_ID,client_secret:env.GOOGLE_DRIVE_CLIENT_SECRET,redirect_uri:origin+CALLBACK,grant_type:'authorization_code',code_verifier:verifier}).toString()});
 if(!tokenResponse.ok)fail(502,'Google could not complete this connection. Check the registered callback and try again.','token_exchange_failed');const tokens=await tokenResponse.json();
 const granted=new Set(String(tokens.scope||'').split(' '));if(!granted.has(row.scope)||[...granted].some(s=>s!==row.scope))fail(403,'Google returned different permissions from those requested. Reconnect using the Books consent screen.','scope_mismatch');
 if(!tokens.access_token||!tokens.refresh_token)fail(400,'Google did not grant background access. Reconnect and approve the requested permission.','offline_access_missing');
 let account='';const about=await fetchWith(env,'https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)',{headers:{authorization:'Bearer '+tokens.access_token}});if(about.ok)account=plain((await about.json()).user?.emailAddress,254);
 const cipher=await seal(env,{access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_at:Date.now()+Math.max(60,Number(tokens.expires_in)||3600)*1000});
 // A different account is never automatically treated as the previous library.
 const old=await env.DB.prepare("SELECT account_hint FROM books_connections WHERE id='google-drive'").first();const changed=!(old?.account_hint&&account&&old.account_hint===account);
 const saved=await env.DB.prepare(`INSERT INTO books_connections(id,scope,token_cipher,account_hint,updated_at,last_error) SELECT 'google-drive',?,?,?,?,NULL WHERE EXISTS(SELECT 1 FROM books_oauth_states WHERE hash=? AND expires_at=0) ON CONFLICT(id) DO UPDATE SET scope=excluded.scope,token_cipher=excluded.token_cipher,account_hint=excluded.account_hint,updated_at=excluded.updated_at,last_error=NULL,root_id=CASE WHEN ? THEN NULL ELSE books_connections.root_id END,root_label=CASE WHEN ? THEN NULL ELSE books_connections.root_label END`).bind(row.scope,cipher,account,now(),stateHash,changed?1:0,changed?1:0).run();
 if(!saved.meta.changes)fail(409,'This connection was cancelled or replaced while Google was responding. Start again.','connection_changed');
 await env.DB.prepare('DELETE FROM books_oauth_states WHERE hash=?').bind(stateHash).run();
 return new Response(null,{status:303,headers:{location:origin+'/books/?connection=connected','set-cookie':stateCookie('',0),'cache-control':'no-store','referrer-policy':'no-referrer'}});
}
const refreshing=new WeakMap();
export async function accessToken(env,force=false){
 const row=await env.DB.prepare("SELECT * FROM books_connections WHERE id='google-drive'").first();
 if(!row?.token_cipher)fail(409,'Connect Google Drive first.','not_connected');
 let tokens;try{tokens=await unseal(env,row.token_cipher);}catch{fail(409,'Reconnect Google Drive after the connection secret changed.','reconnect_required');}
 if(!force&&tokens.expires_at>Date.now()+60000)return tokens.access_token;
 let pending=refreshing.get(env.DB);if(pending?.cipher===row.token_cipher)return pending.promise;
 const promise=(async()=>{
  let response;try{response=await fetchWith(env,'https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_DRIVE_CLIENT_ID,client_secret:env.GOOGLE_DRIVE_CLIENT_SECRET,refresh_token:tokens.refresh_token,grant_type:'refresh_token'}).toString()});}catch{fail(502,'Google is temporarily unavailable. Your existing connection has been kept; retry shortly.','google_temporarily_unavailable');}
  if(!response.ok){
   let error={};try{error=await response.json();}catch{}
   if(response.status===429||response.status>=500)fail(response.status===429?429:502,'Google is temporarily unavailable. Your existing connection has been kept; retry shortly.','google_temporarily_unavailable');
   if(error.error==='invalid_grant'){await env.DB.prepare("UPDATE books_connections SET last_error='Reconnect Google Drive' WHERE id='google-drive' AND token_cipher=?").bind(row.token_cipher).run();fail(409,'Google access expired or was revoked. Reconnect the library.','reconnect_required');}
   fail(502,'Google rejected the connection settings. Check the client configuration without deleting the library.','google_configuration');
  }
  const result=await response.json();if(typeof result.access_token!=='string'||!result.access_token)fail(502,'Google did not return an access token.','provider_error');
  const cipher=await seal(env,{access_token:result.access_token,refresh_token:result.refresh_token||tokens.refresh_token,expires_at:Date.now()+(Number(result.expires_in)||3600)*1000});
  const saved=await env.DB.prepare("UPDATE books_connections SET token_cipher=?,last_error=NULL,updated_at=? WHERE id='google-drive' AND token_cipher=?").bind(cipher,now(),row.token_cipher).run();
  if(!saved.meta.changes)fail(409,'Google connection changed while refreshing. No old credentials were restored.','connection_changed');
  return result.access_token;
 })();
 pending={cipher:row.token_cipher,promise};refreshing.set(env.DB,pending);
 try{return await promise;}finally{if(refreshing.get(env.DB)===pending)refreshing.delete(env.DB);}
}
export async function driveRequest(env,path,parameters={},options={}){if(!/^(?:files(?:\/[\w-]{10,200})?|about)$/.test(path))fail(400,'Invalid Drive request.');const u=new URL('https://www.googleapis.com/drive/v3/'+path);for(const [k,v] of Object.entries(parameters))if(v!==undefined&&v!==null)u.searchParams.set(k,String(v));const request=async(force)=>fetchWith(env,u.href,{headers:{authorization:'Bearer '+await accessToken(env,force),...options.headers}});let r=await request(false);if(r.status===401)r=await request(true);if(!r.ok){if(r.status===404||r.status===403)fail(403,'Google has not granted access to this file or it is outside the available library. Selecting a folder does not automatically grant every existing book.','drive_access');if(r.status===429)fail(429,'Google is busy. Wait a moment, then resume the scan.','drive_quota');fail(502,'Google Drive is temporarily unavailable. Your library has not been deleted.','drive_unavailable');}return r;}
export const driveJson=async(env,path,parameters={})=>(await driveRequest(env,path,parameters)).json();
export async function setLibraryRoot(env,value){const id=folderId(value);const meta=await driveJson(env,'files/'+id,{fields:'id,name,mimeType,isAppAuthorized',supportsAllDrives:true});if(meta.mimeType!=='application/vnd.google-apps.folder')fail(400,'Choose a folder, not an individual book.');const listing=await driveJson(env,'files',{q:`'${id}' in parents and trashed=false`,pageSize:10,fields:'files(id,name,mimeType),nextPageToken',supportsAllDrives:true,includeItemsFromAllDrives:true});await env.DB.prepare("UPDATE books_connections SET root_id=?,root_label=?,updated_at=? WHERE id='google-drive'").bind(id,plain(meta.name,200),now()).run();return {rootId:id,rootLabel:meta.name,visibleSampleCount:listing.files?.length||0,hasMore:Boolean(listing.nextPageToken),warning:listing.files?.length?'The scan will import only files Google actually exposes to this app.':'No children are visible. The folder may be empty, or existing files may not be authorised. This is not a successful full-library connection.'};}
export async function pickerConfiguration(env){const row=await connectionStatus(env);if(row.scope!==DRIVE_FILE)fail(403,'Google Picker is only used with selected-file permissions.');if(!row.pickerConfigured)fail(409,'The optional Google Picker API key and project number are not configured.','picker_not_configured');return {appId:env.GOOGLE_DRIVE_PROJECT_NUMBER,developerKey:env.GOOGLE_DRIVE_PICKER_API_KEY,accessToken:await accessToken(env)};}
export async function verifyFileInLibrary(env,id,expectedVersion=null){folderId(id);const row=await env.DB.prepare("SELECT root_id FROM books_connections WHERE id='google-drive'").first();if(!row?.root_id)fail(409,'Choose the eBooks folder first.','root_missing');let current=id;const seen=new Set();for(let n=0;n<32;n++){if(current===row.root_id)return true;if(seen.has(current))break;seen.add(current);const known=await env.DB.prepare('SELECT parent_id,kind FROM books_manifest WHERE file_id=?').bind(current).first();if(!known)fail(403,'This file is not in the configured book library.','outside_library');const file=await driveJson(env,'files/'+current,{fields:'id,parents,trashed,mimeType,md5Checksum,modifiedTime,size',supportsAllDrives:true});if(n===0&&expectedVersion!==null){const actual=plain(file.md5Checksum||`${file.modifiedTime||'unknown'}:${file.size||0}`,200);if(actual!==expectedVersion)fail(409,'This book changed in Google Drive. Rescan the library before opening it; your previous reading position is preserved.','version_changed');}if(file.trashed||file.mimeType==='application/vnd.google-apps.shortcut')fail(403,'This file is no longer available in the book library.','outside_library');const parent=file.parents?.[0];if(!parent||parent!==known.parent_id)fail(403,'This file has moved. Rescan the configured library before opening it.','outside_library');current=parent;}fail(403,'This file is outside the configured book library.','outside_library');}
export async function disconnectGoogle(env){
 const row=await env.DB.prepare("SELECT token_cipher FROM books_connections WHERE id='google-drive'").first();
 // Remove local authority first. A slow revocation must not clear a newer connection.
 await env.DB.batch([env.DB.prepare("UPDATE books_connections SET token_cipher=NULL,updated_at=?,last_error=NULL WHERE id='google-drive' AND token_cipher IS ?").bind(now(),row?.token_cipher||null),env.DB.prepare('DELETE FROM books_oauth_states')]);
 let revoked=true;if(row?.token_cipher){try{const token=await unseal(env,row.token_cipher);revoked=(await fetchWith(env,'https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:token.refresh_token}).toString()})).ok;}catch{revoked=false;}}
 return {disconnected:true,revoked,warning:revoked?'':'Local access was removed. Google revocation could not be confirmed; review the app in your Google account.'};
}
export async function checkGoogleConnection(request,env){
 const status=await connectionStatus(env),result={checkedAt:now(),callback:siteOrigin(env,request)+CALLBACK,fullLibraryVerified:false,permissionMode:status.scope===DRIVE_READONLY?'account-readonly':'selected-files',pickerConfigured:status.pickerConfigured};
 if(!status.configured)return {...result,status:'setup_needed',message:'The Google client ID or client secret is missing in this environment.'};
 if(!status.connected)return {...result,status:'not_connected',message:'Credentials are configured. Sign in to Google from the library connection screen next.'};
 await accessToken(env,true);result.refreshVerified=true;
 if(!status.rootId)return {...result,status:'folder_needed',message:'Google token refresh worked. Select the eBooks folder next.'};
 const root=await driveJson(env,'files/'+folderId(status.rootId),{fields:'id,name,mimeType',supportsAllDrives:true});
 if(root.mimeType!=='application/vnd.google-apps.folder')fail(409,'The saved library is not a folder. Select eBooks again.','root_invalid');
 result.rootLabel=plain(root.name,200);
 const queue=[{id:root.id,parent:null}],parents=new Map(),seen=new Set();let foldersChecked=0;
 while(queue.length&&foldersChecked<8){
  const folder=queue.shift();if(seen.has(folder.id))continue;seen.add(folder.id);
  if(folder.parent){const current=await driveJson(env,'files/'+folderId(folder.id),{fields:'id,parents,trashed,mimeType',supportsAllDrives:true});if(current.trashed||current.parents?.[0]!==folder.parent||current.mimeType!=='application/vnd.google-apps.folder')continue;}
  const listing=await driveJson(env,'files',{q:`'${folder.id}' in parents and trashed=false`,pageSize:20,fields:'files(id,name,mimeType,parents),nextPageToken',supportsAllDrives:true,includeItemsFromAllDrives:true});foldersChecked++;
  for(const file of listing.files||[]){if(!/^[\w-]{10,200}$/.test(file.id)||file.parents?.[0]&&file.parents[0]!==folder.id)continue;
   if(file.mimeType==='application/vnd.google-apps.folder'){parents.set(file.id,folder.id);queue.push({id:file.id,parent:folder.id});continue;}
   const format=/\.(epub|pdf)$/i.exec(file.name||'')?.[1]?.toLowerCase();if(!format||file.mimeType==='application/vnd.google-apps.shortcut')continue;
   // Recheck discovered ancestry before reading a sample. Never traverse an unknown sibling.
   let current=file.id,parent=folder.id;while(current!==root.id){const actual=await driveJson(env,'files/'+folderId(current),{fields:'id,parents,trashed,mimeType',supportsAllDrives:true});if(actual.trashed||actual.parents?.[0]!==parent||actual.mimeType==='application/vnd.google-apps.shortcut')fail(409,'A sampled file moved during the check. Retry or rescan.','root_changed');current=parent;parent=parents.get(current);}
   const response=await driveRequest(env,'files/'+file.id,{alt:'media',supportsAllDrives:true},{headers:{range:'bytes=0-63'}});
   const reader=response.body?.getReader();if(!reader)fail(502,'Google returned no book data.','empty_book');let prefix=new Uint8Array();try{while(prefix.length<64){const part=await reader.read();if(part.done)break;const take=part.value.subarray(0,64-prefix.length),next=new Uint8Array(prefix.length+take.length);next.set(prefix);next.set(take,prefix.length);prefix=next;}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const valid=format==='pdf'?new TextDecoder().decode(prefix.subarray(0,5))==='%PDF-':prefix[0]===80&&prefix[1]===75&&prefix[2]===3&&prefix[3]===4;
   if(!valid)return {...result,status:'sample_format_issue',foldersChecked,message:'A file was accessible, but its opening bytes do not match its ebook extension.'};
   return {...result,status:'sample_verified',foldersChecked,sample:{name:plain(file.name,240),format,bytesChecked:prefix.length},message:'Google refresh, the folder and one nested book read succeeded. This sample does not verify every book or grant recursive folder access.'};
  }
 }
 return {...result,status:'no_visible_books',foldersChecked,message:'Folder access worked, but no readable EPUB/PDF appeared in the limited sample. Existing books may not be authorised. This is not proof of full-library access.'};
}
export async function opfFromDrive(env,id){return new TextDecoder().decode(await boundedBytes(await driveRequest(env,'files/'+folderId(id),{alt:'media',supportsAllDrives:true}),1048576));}
