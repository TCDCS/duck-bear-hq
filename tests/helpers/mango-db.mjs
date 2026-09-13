import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users(id) VALUES (\'owner-a\'),(\'owner-b\');');
 try{sql.exec(readFileSync(new URL('../../migrations/0003_mango_profiles.sql',import.meta.url),'utf8'));}catch{}
 const wrap=(query,args=[])=>({bind(...values){return wrap(query,values);},async first(column){const row=sql.prepare(query).get(...args);return row?(column?row[column]:row):null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const v=sql.prepare(query).run(...args);return {success:true,meta:{changes:Number(v.changes)}};},query,args});
 return {sql,prepare(query){const unions=(query.match(/\bUNION(?:\s+ALL)?\b/gi)||[]).length;if(unions>=5)throw new Error('D1_ERROR: too many terms in compound SELECT: SQLITE_ERROR');return wrap(query);},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}},close(){sql.close();}};
}
