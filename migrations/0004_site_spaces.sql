-- Additive Site 1 storage. Never re-runs account setup or rewrites existing content.
CREATE TABLE IF NOT EXISTS site_owners (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  slot TEXT NOT NULL UNIQUE CHECK(slot IN ('owner','partner'))
);
INSERT OR IGNORE INTO site_owners(user_id,slot)
SELECT id,'owner' FROM users WHERE role='admin' AND active=1 ORDER BY created_at,id LIMIT 1;
-- Only the original unambiguous one-admin/one-member setup is paired automatically.
INSERT OR IGNORE INTO site_owners(user_id,slot)
SELECT id,'partner' FROM users WHERE role='member' AND active=1
AND (SELECT COUNT(*) FROM users)=2
AND (SELECT COUNT(*) FROM users WHERE role='admin' AND active=1)=1
ORDER BY created_at,id LIMIT 1;
CREATE TABLE IF NOT EXISTS site_legacy_users (user_id TEXT PRIMARY KEY REFERENCES users(id));
INSERT OR IGNORE INTO site_legacy_users SELECT id FROM users;
CREATE TABLE IF NOT EXISTS site_permissions (
  user_id TEXT NOT NULL REFERENCES users(id),
  section TEXT NOT NULL CHECK(section IN ('family','menus')),
  level INTEGER NOT NULL CHECK(level IN (0,1,2)),
  PRIMARY KEY(user_id,section)
);
CREATE TABLE IF NOT EXISTS site_records (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL CHECK(section IN ('family','menus','scrapbook')),
  kind TEXT NOT NULL CHECK(kind IN ('person','recipe','week','memory')),
  title TEXT NOT NULL,
  data_json TEXT NOT NULL,
  week_start TEXT UNIQUE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0),
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_site_records_section ON site_records(section,kind,updated_at DESC);
CREATE TABLE IF NOT EXISTS site_family_links (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL REFERENCES site_records(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES site_records(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('parent','partner')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  CHECK(from_id<>to_id),
  UNIQUE(from_id,to_id,type)
);
CREATE TABLE IF NOT EXISTS site_media (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL CHECK(section IN ('family','menus','scrapbook','artwork')),
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=8388608),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS site_artwork (
  slot TEXT PRIMARY KEY CHECK(slot IN ('home','menus','family','scrapbook')),
  media_id TEXT REFERENCES site_media(id),
  alt TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  updated_at TEXT NOT NULL
);
