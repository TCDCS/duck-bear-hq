CREATE TABLE IF NOT EXISTS danao_profiles (
  owner_user_id TEXT PRIMARY KEY,
  profile_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS danao_profile_rate (
  owner_user_id TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  writes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_danao_profiles_updated_at ON danao_profiles(updated_at);
