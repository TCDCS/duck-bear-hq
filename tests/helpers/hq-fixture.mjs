import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
export class D1 {
  constructor(){this.db=new DatabaseSync(':memory:');for(const f of ['0001_schema.sql','0002_seed.sql'])this.db.exec(readFileSync(new URL('../../migrations/'+f,import.meta.url),'utf8'));}
  prepare(sql){const db=this.db;let args=[];return {bind(...values){args=values;return this;},async first(column){const x=db.prepare(sql).get(...args);return column?x?.[column]:x??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return this._run();},_run(){const x=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(x.changes),last_row_id:Number(x.lastInsertRowid)}};}};}
  async batch(items){this.db.exec('BEGIN');try{const out=items.map(x=>x._run());this.db.exec('COMMIT');return out;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  withSession(){return this;}
  close(){this.db.close();}
}
export class R2 {
  constructor(){this.map=new Map();}
  async put(k,v,options={}){const bytes=typeof v==='string'?new TextEncoder().encode(v):v instanceof Uint8Array?v:new Uint8Array(await new Response(v).arrayBuffer());this.map.set(k,{bytes:bytes.slice(),options});return {key:k,size:bytes.length};}
  async get(k){const e=this.map.get(k);if(!e)return null;return {body:new Blob([e.bytes]).stream(),size:e.bytes.length,customMetadata:e.options.customMetadata||{},httpMetadata:e.options.httpMetadata||{},httpEtag:'"test"',text:async()=>new TextDecoder().decode(e.bytes),arrayBuffer:async()=>e.bytes.slice().buffer,writeHttpMetadata(h){for(const [k,v]of Object.entries(e.options.httpMetadata||{}))if(k==='contentType')h.set('content-type',v);}};}
  async head(k){return this.get(k);}
  async delete(k){for(const key of Array.isArray(k)?k:[k])this.map.delete(key);}
}
export const ORIGIN='https://duck-bear.test';
export async function hash(v){return Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))).toString('base64url');}
export async function pw(password){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return {salt:Buffer.from(salt).toString('base64url'),hash:Buffer.from(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},key,256)).toString('base64url')};}
export async function fixture({audit=true,email=false}={}){
 const DB=new D1(),MEDIA=new R2(),sent=[];const stamp='2026-09-01T00:00:00.000Z';const p=await pw('test-password-123');
 for(const [id,name,role]of [['owner','Bear','admin'],['partner','Guannan','member'],['guest','Guest','member']]){
  await DB.prepare('INSERT INTO users(id,username,display_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES(?,?,?,?,?,?,100000,1,?,?)').bind(id,id,name,role,p.hash,p.salt,stamp,stamp).run();
  await DB.prepare('INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at,last_seen_at) VALUES(?,?,?,?,?,?)').bind(id+'-session',id,await hash(id+'-token'),'2036-01-01T00:00:00.000Z',stamp,stamp).run();
 }
 if(audit)await DB.prepare('INSERT INTO audit_log(id,actor_user_id,action,entity_type,detail_json,created_at) VALUES(?,?,?,?,?,?)').bind('setup','owner','setup.complete','system',JSON.stringify({memberUserId:'partner'}),stamp).run();
 const env={DB,MEDIA,SITE_ORIGIN:ORIGIN,ASSETS:{fetch:async()=>new Response('asset')},...(email?{EMAIL:{send:async m=>{sent.push(m);return {messageId:'test-'+sent.length};}},PASSWORD_RESET_FROM:'Duck & Bear <noreply@example.com>'}:{})};
 return {env,sent,close:()=>DB.close()};
}
export async function call(handler,env,path,{method='GET',user='owner',body,headers={}}={}){
 const h=new Headers(headers);if(user)h.set('Cookie','db_session='+user+'-token');if(method!=='GET'&&method!=='HEAD'&&!h.has('Origin'))h.set('Origin',ORIGIN);h.set('CF-Connecting-IP',user?'192.0.2.'+({owner:1,partner:2,guest:3}[user]||4):'192.0.2.20');
 let payload;if(body instanceof FormData)payload=body;else if(body!==undefined){h.set('content-type','application/json');payload=JSON.stringify(body);}
 const response=await handler.fetch(new Request(ORIGIN+path,{method,headers:h,body:payload}),env,{waitUntil:()=>{}});let data=null;
 if(response.headers.get('content-type')?.includes('json'))data=await response.clone().json();
 return {status:response.status,data,response};
}
