-- Game-only data. Existing accounts, points, memories and racing tables are unchanged.
CREATE TABLE IF NOT EXISTS mango_profiles (
 id TEXT PRIMARY KEY,
 owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 slot INTEGER NOT NULL CHECK(slot BETWEEN 0 AND 5),
 nickname TEXT NOT NULL CHECK(length(nickname) BETWEEN 1 AND 24),
 avatar_id TEXT NOT NULL,
 progress_json TEXT NOT NULL CHECK(json_valid(progress_json)),
 revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(owner_user_id,slot)
);
CREATE INDEX IF NOT EXISTS mango_profiles_owner ON mango_profiles(owner_user_id,slot);
CREATE TABLE IF NOT EXISTS mango_rate_limits (
 owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('create','write')),
 window_start INTEGER NOT NULL,
 hits INTEGER NOT NULL CHECK(hits>=0),
 PRIMARY KEY(owner_user_id,kind)
);
