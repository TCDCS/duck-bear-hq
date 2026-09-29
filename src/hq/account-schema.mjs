/** Additive account extension. Never replaces users, passwords or household membership. */
export async function ensureAccountSchema(env) {
  if (await env.DB.prepare("SELECT value FROM hq_meta WHERE key='account-controls-v2'").first()) return;
  const sql = [
    `CREATE TABLE IF NOT EXISTS hq_passkeys (
      credential_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      public_key TEXT NOT NULL, counter INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL, transports TEXT NOT NULL DEFAULT '[]',
      device_type TEXT NOT NULL, backed_up INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, last_used_at TEXT, version INTEGER NOT NULL DEFAULT 0,
      last_auth TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS hq_passkeys_user ON hq_passkeys(user_id)`,
    `CREATE TRIGGER IF NOT EXISTS hq_passkey_limit BEFORE INSERT ON hq_passkeys
      WHEN (SELECT COUNT(*) FROM hq_passkeys WHERE user_id=NEW.user_id)>=10
      BEGIN SELECT RAISE(ABORT,'passkey_limit'); END`,
    `CREATE TABLE IF NOT EXISTS hq_passkey_challenges (
      id TEXT PRIMARY KEY, purpose TEXT NOT NULL, challenge TEXT NOT NULL,
      user_id TEXT, session_id TEXT, credential_tag TEXT, binding_hash TEXT,
      name TEXT, expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS hq_passkey_expiry ON hq_passkey_challenges(expires_at)`,
    `INSERT OR IGNORE INTO hq_meta(key,value) VALUES('account-controls-v2','1')`
  ];
  await env.DB.batch(sql.map(s => env.DB.prepare(s)));
}
