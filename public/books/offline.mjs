/** Private per-reader offline storage. The service worker never caches personal APIs. */
import {createSyncQueue} from './sync.mjs';
const NAME='duck-bear-books-v1';let database;
async function db(){
 if(!database)database=new Promise((resolve,reject)=>{
  const r=indexedDB.open(NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');
  r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();database=null;};resolve(r.result);};
  r.onerror=()=>{database=null;reject(r.error);};
 });return database;
}
async function access(mode,fn){
 const d=await db();return new Promise((resolve,reject)=>{
  const t=d.transaction('kv',mode);let result;
  try{result=fn(t.objectStore('kv'));}catch(e){t.abort();reject(e);return;}
  t.oncomplete=()=>resolve(result?.result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Offline storage was interrupted.'));
 });
}
const changedAccount=()=>Object.assign(new Error('The signed-in reader changed. Reopen Books before saving.'),{status:401,code:'identity_changed'});
export const key=(user,type,id='')=>`${user}:${type}:${id}`;
export const get=key=>access('readonly',s=>s.get(key));
async function identity(user){const me=await get('identity');if(me?.user.id!==user)throw changedAccount();return me.localEpoch;}
/** Read/modify/write the listed keys in one transaction, with no await inside it. */
async function transaction(user,keys,change,epoch){
 const d=await db();return new Promise((resolve,reject)=>{
  const tx=d.transaction('kv','readwrite'),s=tx.objectStore('kv'),values={};let result,failure,remaining=keys.length+1;
  const done=()=>{
   if(--remaining)return;
   try{
    const me=values.identity;if(me?.user.id!==user||(epoch!==undefined&&me.localEpoch!==epoch))throw changedAccount();
    delete values.identity;result=change(values);
    for(const k of keys){if(!k.startsWith(user+':'))throw changedAccount();if(values[k]===undefined)s.delete(k);else s.put(values[k],k);}
   }catch(e){failure=e;tx.abort();}
  };
  for(const k of ['identity',...keys]){const r=s.get(k);r.onsuccess=()=>{values[k]=r.result;done();};}
  tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(failure||tx.error);tx.onabort=()=>reject(failure||tx.error||new Error('Offline storage was interrupted.'));
 });
}
export function put(k,value){
 if(k==='identity')return access('readwrite',s=>s.put(value,k));
 return transaction(k.split(':')[0],[k],r=>{r[k]=value;});
}
export const remove=k=>transaction(k.split(':')[0],[k],r=>{delete r[k];});
export async function all(user,type){
 await identity(user);const prefix=key(user,type);
 return access('readonly',s=>s.getAll(IDBKeyRange.bound(prefix,prefix+'\uffff')));
}
export async function rememberIdentity(me){
 const old=await get('identity');if(old&&old.user.id!==me.user.id)await clearOffline();
 const saved={...me,localEpoch:old?.user.id===me.user.id&&old.localEpoch?old.localEpoch:crypto.randomUUID()};
 await put('identity',saved);return saved;
}
export async function clearOffline(){await access('readwrite',s=>s.clear());localStorage.setItem('db-books-logout',crypto.randomUUID());}
export async function forgetFile(user,file){await remove(key(user,'file',file.id+'@'+file.version));}
export async function saveFile(user,book,file,bytes){
 if(bytes.byteLength>32*1024*1024)throw new Error('This book is too large for the offline reader.');
 await put(key(user,'file',file.id+'@'+file.version),{book,file,bytes,savedAt:new Date().toISOString()});
 try{await navigator.storage?.persist?.();}catch{}return true;
}
export const cachedFile=(user,file)=>get(key(user,'file',file.id+'@'+file.version));
export function deviceId(){let id=localStorage.getItem('db-books-device');if(!id){id=crypto.randomUUID();localStorage.setItem('db-books-device',id);}return id;}
export const localState=(user,file)=>get(key(user,'progress',file.id+'@'+file.version));
export const storeState=(user,file,state)=>put(key(user,'progress',file.id+'@'+file.version),state);
const queue=createSyncQueue({identity,transaction,all,exclusive:(name,fn)=>navigator.locks?navigator.locks.request('db-books-'+name,fn):fn()},{deviceId,operationId:()=>crypto.randomUUID()});
export const {queueProgress,flushProgress,resolveProgress,saveLocalNote,flushNotes,resolveNote}=queue;
export async function mergeNotes(user,remote){
 for(const note of remote){const n=key(user,'note',note.id),p=key(user,'note-pending',note.id);await transaction(user,[n,p],r=>{if(!r[p])r[n]=note;});}
}
