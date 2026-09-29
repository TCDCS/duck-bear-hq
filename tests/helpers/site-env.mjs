import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import worker from '../../src/index.js';
export const origin='https://duck-bear.test';
export class D1 {
  constructor(){this.sql=new DatabaseSync(':memory:');for(const name of ['0001_schema.sql','0002_seed.sql'])this.sql.exec(readFileSync(new URL('../../migrations/'+name,import.meta.url),'utf8'));}
  prepare(query){const sql=this.sql;const wrap=(args=[])=>({bind(...a){return wrap(a);},async first(column){const r=sql.prepare(query).get(...args);return r?(column?r[column]:r):null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(r.changes)}};}});return wrap();}
  async batch(items){this.sql.exec('BEGIN');try{const out=[];for(const item of items)out.push(await item.run());this.sql.exec('COMMIT');return out;}catch(e){this.sql.exec('ROLLBACK');throw e;}}
}
export class R2 {
  map=new Map();
  async get(key){const o=this.map.get(key);if(!o)return null;return {body:o.value,httpEtag:'"test"',async text(){return typeof o.value==='string'?o.value:new TextDecoder().decode(o.value);},writeHttpMetadata(h){h.set('Content-Type',o.type||'application/octet-stream');}};}
  async put(key,value,options={}){this.map.set(key,{value,type:options.httpMetadata?.contentType});}
  async delete(key){this.map.delete(key);}
}
export async function call(env,path,{method='GET',body,cookie,form,requestOrigin=origin}={}){
 const headers=new Headers({Origin:requestOrigin});if(cookie)headers.set('Cookie',cookie);if(body!==undefined)headers.set('Content-Type','application/json');
 const res=await worker.fetch(new Request(origin+path,{method,headers,body:form??(body===undefined?undefined:JSON.stringify(body))}),env);
 const data=res.headers.get('content-type')?.includes('json')?await res.json():null;
 return {res,data,cookie:(res.headers.get('set-cookie')||'').split(';')[0]};
}
export async function fixture(){
 const env={DB:new D1(),MEDIA:new R2(),SETUP_SECRET:'fixture-only-key',ASSETS:{fetch:async()=>new Response('<html>shell</html>',{headers:{'Content-Type':'text/html'}})}};
 await call(env,'/api/setup',{method:'POST',body:{setupSecret:env.SETUP_SECRET,admin:{username:'bear',displayName:'Zach',password:'owner-password-123'},member:{username:'duck',displayName:'Guannan',password:'partner-password-123'}}});
 const migration=new URL('../../migrations/0004_site_spaces.sql',import.meta.url);if(existsSync(migration))env.DB.sql.exec(readFileSync(migration,'utf8'));
 const a=await call(env,'/api/auth/login',{method:'POST',body:{username:'bear',password:'owner-password-123'}}),b=await call(env,'/api/auth/login',{method:'POST',body:{username:'duck',password:'partner-password-123'}});
 return {env,owner:a.cookie,partner:b.cookie,ownerId:a.data.user.id,partnerId:b.data.user.id};
}
export async function guest(f){
 const x=await call(f.env,'/api/site/users',{method:'POST',cookie:f.owner,body:{username:'friend',displayName:'A friend',password:'friend-password-123'}});
 const login=await call(f.env,'/api/auth/login',{method:'POST',body:{username:'friend',password:'friend-password-123'}});
 return {id:x.data?.user?.id,cookie:login.cookie};
}
export function imageForm(section='scrapbook',bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]),type='image/png'){
 const form=new FormData();form.set('section',section);form.set('file',new File([bytes],'photo.png',{type}));return form;
}
