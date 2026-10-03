export const BOOKS_SCHEMA=[
`CREATE TABLE IF NOT EXISTS books_connections(id TEXT PRIMARY KEY,root_id TEXT,root_label TEXT,scope TEXT NOT NULL DEFAULT '',token_cipher TEXT,account_hint TEXT,updated_at TEXT NOT NULL,last_error TEXT)`,
`CREATE TABLE IF NOT EXISTS books_oauth_states(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,cookie_hash TEXT NOT NULL,verifier_cipher TEXT NOT NULL,scope TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS books_catalogue(id TEXT PRIMARY KEY,source TEXT NOT NULL,source_group TEXT UNIQUE NOT NULL,title TEXT NOT NULL,authors_json TEXT NOT NULL DEFAULT '[]',series TEXT NOT NULL DEFAULT '',series_index REAL,description TEXT NOT NULL DEFAULT '',language TEXT NOT NULL DEFAULT '',tags_json TEXT NOT NULL DEFAULT '[]',identifiers_json TEXT NOT NULL DEFAULT '{}',imported_rating REAL,cover_file_id TEXT,metadata_json TEXT NOT NULL DEFAULT '{}',created_by TEXT,updated_at TEXT NOT NULL,created_at TEXT NOT NULL,unavailable INTEGER NOT NULL DEFAULT 0)`,
`CREATE TABLE IF NOT EXISTS books_files(id TEXT PRIMARY KEY,book_id TEXT NOT NULL REFERENCES books_catalogue(id),provider TEXT NOT NULL,source_id TEXT UNIQUE,parent_id TEXT,name TEXT NOT NULL,mime TEXT NOT NULL,format TEXT NOT NULL,version TEXT NOT NULL,size INTEGER NOT NULL DEFAULT 0,object_key TEXT,modified_at TEXT NOT NULL,available INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS books_manifest(file_id TEXT PRIMARY KEY,parent_id TEXT,kind TEXT NOT NULL,metadata_json TEXT NOT NULL,seen_job TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS books_scan_jobs(id TEXT PRIMARY KEY,root_id TEXT NOT NULL,status TEXT NOT NULL,files_seen INTEGER NOT NULL DEFAULT 0,books_seen INTEGER NOT NULL DEFAULT 0,errors_json TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS books_scan_queue(job_id TEXT NOT NULL REFERENCES books_scan_jobs(id),folder_id TEXT NOT NULL,page_token TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'queued',lease TEXT,locked_until INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(job_id,folder_id))`,
`CREATE TABLE IF NOT EXISTS books_read_state(user_id TEXT NOT NULL,file_id TEXT NOT NULL REFERENCES books_files(id),version TEXT NOT NULL,revision INTEGER NOT NULL,locator_json TEXT NOT NULL,progress REAL NOT NULL,furthest REAL NOT NULL,device_id TEXT NOT NULL,updated_at TEXT NOT NULL,last_op_id TEXT NOT NULL,PRIMARY KEY(user_id,file_id,version))`,
`CREATE TABLE IF NOT EXISTS books_progress_ops(user_id TEXT NOT NULL,op_id TEXT NOT NULL,payload_hash TEXT NOT NULL,result_json TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(user_id,op_id))`,
`CREATE TABLE IF NOT EXISTS books_annotations(id TEXT NOT NULL,user_id TEXT NOT NULL,file_id TEXT NOT NULL REFERENCES books_files(id),version TEXT NOT NULL,kind TEXT NOT NULL,locator_json TEXT NOT NULL,end_offset INTEGER,selected_text TEXT NOT NULL DEFAULT '',note TEXT NOT NULL DEFAULT '',colour TEXT NOT NULL DEFAULT 'yellow',revision INTEGER NOT NULL DEFAULT 1,deleted INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,id))`,
`CREATE TABLE IF NOT EXISTS books_user_books(user_id TEXT NOT NULL,book_id TEXT NOT NULL REFERENCES books_catalogue(id),status TEXT NOT NULL DEFAULT 'none',favourite INTEGER NOT NULL DEFAULT 0,rating INTEGER,updated_at TEXT NOT NULL,PRIMARY KEY(user_id,book_id))`,
`CREATE TABLE IF NOT EXISTS books_shelves(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,created_at TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS books_shelf_items(shelf_id TEXT NOT NULL REFERENCES books_shelves(id) ON DELETE CASCADE,book_id TEXT NOT NULL REFERENCES books_catalogue(id),PRIMARY KEY(shelf_id,book_id))`,
`CREATE TABLE IF NOT EXISTS books_preferences(user_id TEXT PRIMARY KEY,data_json TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS books_files_book ON books_files(book_id)`,
`CREATE INDEX IF NOT EXISTS books_manifest_parent ON books_manifest(parent_id)`,
`CREATE INDEX IF NOT EXISTS books_progress_user ON books_read_state(user_id,updated_at)`,
`CREATE INDEX IF NOT EXISTS books_annotations_file ON books_annotations(user_id,file_id,version)`,
`CREATE INDEX IF NOT EXISTS books_title ON books_catalogue(title)`
];
const ready=new WeakMap();
export async function ensureBooksSchema(env){if(!env.DB)throw new Error('Books requires a database binding');let p=ready.get(env.DB);if(!p){p=env.DB.batch(BOOKS_SCHEMA.map(sql=>env.DB.prepare(sql))).catch(e=>{ready.delete(env.DB);throw e;});ready.set(env.DB,p);}return p;}
