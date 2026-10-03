// Local-only D1 adapter. Never imported by the deployed Worker.
import { DatabaseSync } from 'node:sqlite';
export function makeD1(filename=':memory:') {
 const db=new DatabaseSync(filename); db.exec('PRAGMA foreign_keys=ON;');
 function statement(sql,params=[]) {return {
  bind(...values){return statement(sql,values);},
  async first(column){const r=db.prepare(sql).get(...params);return r?(column?r[column]:{...r}):null;},
  async all(){const results=db.prepare(sql).all(...params).map(x=>({...x}));return {results,success:true,meta:{changes:0}};},
  async run(){const s=db.prepare(sql);if(s.columns().length){const results=s.all(...params).map(x=>({...x}));return {results,success:true,meta:{changes:results.length}};}const r=s.run(...params);return {results:[],success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
 };}
 return {prepare:statement,async exec(sql){db.exec(sql);return {count:1,duration:0};},async batch(items){db.exec('BEGIN IMMEDIATE');try {const r=[];for(const s of items)r.push(await s.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}},close(){db.close();}};
}
export function makeR2(){const map=new Map();return {
 async put(key,value,options={}){const bytes=value instanceof Uint8Array?value:new Uint8Array(value instanceof ArrayBuffer?value:await new Response(value).arrayBuffer());map.set(key,{bytes:bytes.slice(),httpMetadata:options.httpMetadata||{}});return {key,size:bytes.length};},
 async get(key,options={}){const item=map.get(key);if(!item)return null;let bytes=item.bytes;const r=options.range;if(r)bytes=bytes.slice(r.offset,r.offset+r.length);return {key,size:item.bytes.length,body:new Blob([bytes]).stream(),httpMetadata:item.httpMetadata,async arrayBuffer(){return bytes.slice().buffer;}};},
 async delete(key){map.delete(key);},async head(key){const r=map.get(key);return r?{key,size:r.bytes.length}:null;},_map:map};}
