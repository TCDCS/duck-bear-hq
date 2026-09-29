import {fail,queryAll,now} from './core.mjs';
import {ensureAccountSchema} from './account-schema.mjs';

// Additive schema only. Existing tables, accounts and R2 objects are never dropped.
export const SCHEMA=[
 `CREATE TABLE IF NOT EXISTS hq_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hq_pair(user_id TEXT PRIMARY KEY REFERENCES users(id),role TEXT NOT NULL CHECK(role IN ('owner','partner')))`,
 `CREATE TABLE IF NOT EXISTS hq_grants(user_id TEXT NOT NULL REFERENCES users(id),section TEXT NOT NULL CHECK(section IN ('family','scrapbook','menus','plans')),role TEXT NOT NULL CHECK(role IN ('read','contribute','edit','manage')),can_export INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,section))`,
 `CREATE TABLE IF NOT EXISTS hq_identity(user_id TEXT PRIMARY KEY REFERENCES users(id),email TEXT UNIQUE COLLATE NOCASE,verified INTEGER NOT NULL DEFAULT 0,pending_email TEXT,updated_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hq_removed(user_id TEXT PRIMARY KEY,removed_by TEXT NOT NULL,removed_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hq_tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,payload TEXT NOT NULL DEFAULT '{}',credential_tag TEXT NOT NULL,expires_at INTEGER NOT NULL,used TEXT,created_at TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS hq_tokens_user ON hq_tokens(user_id,kind,expires_at)`,
 `CREATE TABLE IF NOT EXISTS hq_limits(key TEXT NOT NULL,window INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(key,window))`,
 `CREATE TABLE IF NOT EXISTS hq_recovery(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),status TEXT NOT NULL DEFAULT 'pending',created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hq_records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,section TEXT NOT NULL,parent_id TEXT,creator_id TEXT NOT NULL REFERENCES users(id),updated_by TEXT NOT NULL REFERENCES users(id),revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),data TEXT NOT NULL CHECK(json_valid(data)),created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT)`,
 `CREATE INDEX IF NOT EXISTS hq_records_lookup ON hq_records(section,kind,deleted_at,updated_at,id)`,
 `CREATE INDEX IF NOT EXISTS hq_records_parent ON hq_records(parent_id,kind,deleted_at)`,
 `CREATE UNIQUE INDEX IF NOT EXISTS hq_week_unique ON hq_records(json_extract(data,'$.start'),json_extract(data,'$.status')) WHERE kind='week' AND deleted_at IS NULL`,
 `CREATE UNIQUE INDEX IF NOT EXISTS hq_vote_unique ON hq_records(parent_id,creator_id) WHERE kind='vote' AND deleted_at IS NULL`,
 `CREATE UNIQUE INDEX IF NOT EXISTS hq_review_unique ON hq_records(parent_id,creator_id) WHERE kind='review' AND deleted_at IS NULL`,
 `CREATE TRIGGER IF NOT EXISTS hq_no_family_cycles_insert BEFORE INSERT ON hq_records WHEN NEW.kind='relationship' AND NEW.deleted_at IS NULL AND json_extract(NEW.data,'$.type') IN ('parent','adoptive-parent','step-parent') BEGIN SELECT CASE WHEN EXISTS(WITH RECURSIVE descendants(id) AS (SELECT json_extract(NEW.data,'$.to') UNION SELECT json_extract(r.data,'$.to') FROM hq_records r JOIN descendants d ON json_extract(r.data,'$.from')=d.id WHERE r.kind='relationship' AND r.deleted_at IS NULL AND json_extract(r.data,'$.type') IN ('parent','adoptive-parent','step-parent')) SELECT 1 FROM descendants WHERE id=json_extract(NEW.data,'$.from')) THEN RAISE(ABORT,'family_cycle') END; END`,
 `CREATE TRIGGER IF NOT EXISTS hq_no_family_cycles_update BEFORE UPDATE ON hq_records WHEN NEW.kind='relationship' AND NEW.deleted_at IS NULL AND json_extract(NEW.data,'$.type') IN ('parent','adoptive-parent','step-parent') BEGIN SELECT CASE WHEN EXISTS(WITH RECURSIVE descendants(id) AS (SELECT json_extract(NEW.data,'$.to') UNION SELECT json_extract(r.data,'$.to') FROM hq_records r JOIN descendants d ON json_extract(r.data,'$.from')=d.id WHERE r.id<>NEW.id AND r.kind='relationship' AND r.deleted_at IS NULL AND json_extract(r.data,'$.type') IN ('parent','adoptive-parent','step-parent')) SELECT 1 FROM descendants WHERE id=json_extract(NEW.data,'$.from')) THEN RAISE(ABORT,'family_cycle') END; END`,
 `CREATE TRIGGER IF NOT EXISTS hq_frozen_serving_insert BEFORE INSERT ON hq_records WHEN NEW.kind='serving' AND NOT EXISTS(SELECT 1 FROM hq_records WHERE id=NEW.id) AND EXISTS(SELECT 1 FROM hq_records w WHERE w.id=NEW.parent_id AND json_extract(w.data,'$.status')='published') BEGIN SELECT RAISE(ABORT,'week_published'); END`,
 `CREATE TRIGGER IF NOT EXISTS hq_frozen_serving_update BEFORE UPDATE ON hq_records WHEN NEW.kind='serving' AND EXISTS(SELECT 1 FROM hq_records w WHERE w.id IN (OLD.parent_id,NEW.parent_id) AND json_extract(w.data,'$.status')='published') BEGIN SELECT RAISE(ABORT,'week_published'); END`,
 `CREATE TRIGGER IF NOT EXISTS hq_vote_open_insert BEFORE INSERT ON hq_records WHEN NEW.kind='vote' AND NEW.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM hq_records p WHERE p.id=NEW.parent_id AND p.kind='poll' AND p.deleted_at IS NULL AND json_extract(p.data,'$.closed')=0) BEGIN SELECT RAISE(ABORT,'poll_closed'); END`,
 `CREATE TRIGGER IF NOT EXISTS hq_vote_open_update BEFORE UPDATE ON hq_records WHEN NEW.kind='vote' AND NEW.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM hq_records p WHERE p.id=NEW.parent_id AND p.kind='poll' AND p.deleted_at IS NULL AND json_extract(p.data,'$.closed')=0) BEGIN SELECT RAISE(ABORT,'poll_closed'); END`,
 `CREATE TABLE IF NOT EXISTS hq_revisions(record_id TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL,deleted_at TEXT,PRIMARY KEY(record_id,revision))`,
 `CREATE TRIGGER IF NOT EXISTS hq_record_created AFTER INSERT ON hq_records BEGIN INSERT INTO hq_revisions VALUES(NEW.id,NEW.revision,NEW.data,NEW.updated_by,NEW.updated_at,NEW.deleted_at); END`,
 `CREATE TRIGGER IF NOT EXISTS hq_record_updated AFTER UPDATE ON hq_records BEGIN INSERT INTO hq_revisions VALUES(NEW.id,NEW.revision,NEW.data,NEW.updated_by,NEW.updated_at,NEW.deleted_at); END`,
 `CREATE TABLE IF NOT EXISTS hq_assets(id TEXT PRIMARY KEY,section TEXT NOT NULL,creator_id TEXT NOT NULL REFERENCES users(id),name TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,original_key TEXT NOT NULL UNIQUE,preview_key TEXT NOT NULL,sha256 TEXT NOT NULL,width INTEGER,height INTEGER,is_public INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,deleted_at TEXT)`,
 `CREATE INDEX IF NOT EXISTS hq_assets_section ON hq_assets(section,deleted_at,created_at,id)`,
 `CREATE TABLE IF NOT EXISTS hq_prefs(user_id TEXT PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL DEFAULT 1,data TEXT NOT NULL DEFAULT '{}')`,
 `CREATE TABLE IF NOT EXISTS hq_favourites(user_id TEXT NOT NULL REFERENCES users(id),record_id TEXT NOT NULL REFERENCES hq_records(id),created_at TEXT NOT NULL,PRIMARY KEY(user_id,record_id))`,
 `CREATE TABLE IF NOT EXISTS hq_events(id INTEGER PRIMARY KEY AUTOINCREMENT,section TEXT NOT NULL,record_id TEXT,actor_id TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS hq_events_section ON hq_events(section,id)`,
 `CREATE TABLE IF NOT EXISTS hq_restore_jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,manifest TEXT NOT NULL,expires_at INTEGER NOT NULL,used TEXT,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS hq_restore_files(job_id TEXT NOT NULL,asset_id TEXT NOT NULL,variant TEXT NOT NULL,r2_key TEXT NOT NULL,PRIMARY KEY(job_id,asset_id,variant))`,
 `CREATE TABLE IF NOT EXISTS hq_choices(record_id TEXT NOT NULL,user_id TEXT NOT NULL,choice TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(record_id,user_id))`,
 `CREATE TABLE IF NOT EXISTS hq_site(key TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 1,data TEXT NOT NULL DEFAULT '{}')`,
 `INSERT OR IGNORE INTO hq_site(key,data) VALUES('appearance','{}')`,
 `INSERT OR IGNORE INTO hq_meta(key,value) VALUES('schema','1')`
];
export async function legacyPair(env){
 const row=await env.DB.prepare("SELECT actor_user_id,detail_json FROM audit_log WHERE action='setup.complete' ORDER BY created_at,id LIMIT 1").first();
 if(!row)return null;let detail;try{detail=JSON.parse(row.detail_json);}catch{return null;}
 if(!detail?.memberUserId||detail.memberUserId===row.actor_user_id)return null;
 const owner=await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(row.actor_user_id).first();
 const partner=await env.DB.prepare("SELECT id FROM users WHERE id=?").bind(detail.memberUserId).first();
 return owner&&partner?{owner:owner.id,partner:partner.id}:null;
}
export async function schemaReady(env){try{return Boolean(await env.DB.prepare("SELECT 1 AS ok FROM hq_meta WHERE key='schema' AND value='1'").first());}catch(e){if(/no such table/i.test(String(e)))return false;throw e;}}
export async function initialise(env,user){
 if(await schemaReady(env)){await ensureAccountSchema(env);return;}
 const pair=await legacyPair(env);
 if(!pair||![pair.owner,pair.partner].includes(user.id))fail(503,'The original owner must initialise Our Space first.','owner_setup');
 const statements=SCHEMA.map(sql=>env.DB.prepare(sql));
 statements.push(env.DB.prepare('INSERT OR IGNORE INTO hq_pair VALUES(?,?)').bind(pair.owner,'owner'),env.DB.prepare('INSERT OR IGNORE INTO hq_pair VALUES(?,?)').bind(pair.partner,'partner'));
 await env.DB.batch(statements);
 await ensureAccountSchema(env);
}
export async function permission(env,user,section){
 const pair=await env.DB.prepare('SELECT role FROM hq_pair WHERE user_id=?').bind(user.id).first();
 const owner=pair?.role==='owner';
 if(pair)return {read:true,contribute:true,edit:true,manage:owner,export:true,pair:true,owner};
 if(section==='library')return {read:true,contribute:false,edit:false,manage:false,export:false,pair:false,owner:false};
 if(section==='intimate'||section==='scrapbook'||!['family','menus','plans'].includes(section))return {read:false,contribute:false,edit:false,manage:false,export:false,pair:false,owner:false};
 const grant=await env.DB.prepare('SELECT role,can_export FROM hq_grants WHERE user_id=? AND section=?').bind(user.id,section).first();
 return {read:Boolean(grant),contribute:['contribute','edit','manage'].includes(grant?.role),edit:['edit','manage'].includes(grant?.role),manage:grant?.role==='manage',export:Boolean(grant?.can_export),pair:false,owner:false};
}
export async function requireAccess(env,user,section,action='read'){const access=await permission(env,user,section);if(!access[action])fail(403,'You do not have access to this section.');return access;}
export async function requireOwner(env,user){const x=await permission(env,user,'intimate');if(!x.owner)fail(403,'Owner access required.');return x;}
export async function pairOnly(env,user){const pair=await legacyPair(env);if(!user||!pair||![pair.owner,pair.partner].includes(user.id))fail(403,'This area is private to the household pair.');}
