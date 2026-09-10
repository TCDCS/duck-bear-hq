PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','member')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 150000,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  user_agent TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  ip_hash TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(username, created_at);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  category TEXT NOT NULL DEFAULT 'Other',
  blurb TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  stock_label TEXT NOT NULL DEFAULT 'In stock',
  rating REAL NOT NULL DEFAULT 5.0,
  featured INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS favourites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 9),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'shop',
  customer_name TEXT NOT NULL,
  delivery_method TEXT NOT NULL,
  delivery_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Received',
  total_pence INTEGER NOT NULL DEFAULT 0 CHECK(total_pence = 0),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  parent_order_id TEXT REFERENCES orders(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  item_name TEXT NOT NULL,
  item_emoji TEXT NOT NULL DEFAULT '🎁',
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 20),
  unit_price_pence INTEGER NOT NULL DEFAULT 0 CHECK(unit_price_pence = 0)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_status_order ON order_status_history(order_id, created_at);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id TEXT PRIMARY KEY,
  account_user_id TEXT NOT NULL REFERENCES users(id),
  actor_user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  delta INTEGER NOT NULL CHECK(delta <> 0),
  balance_after INTEGER NOT NULL CHECK(balance_after >= 0),
  reference_type TEXT,
  reference_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loyalty_account_created ON loyalty_transactions(account_user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loyalty_reference_unique ON loyalty_transactions(account_user_id, reference_type, reference_id, type) WHERE reference_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS earn_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '⭐',
  points INTEGER NOT NULL CHECK(points > 0),
  frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','once','unlimited')),
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS earn_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  rule_id TEXT NOT NULL REFERENCES earn_rules(id),
  period_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, rule_id, period_key)
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  cost INTEGER NOT NULL CHECK(cost > 0),
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  reward_id TEXT NOT NULL REFERENCES rewards(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Redeemed' CHECK(status IN ('Redeemed','Used','Cancelled')),
  redeemed_at TEXT NOT NULL,
  used_at TEXT,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON redemptions(user_id, redeemed_at DESC);

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,
  secret INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id),
  badge_id TEXT NOT NULL REFERENCES badges(id),
  awarded_at TEXT NOT NULL,
  PRIMARY KEY(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS date_bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  planned_for TEXT,
  status TEXT NOT NULL DEFAULT 'Saved',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  month_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  case_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  body TEXT NOT NULL,
  compensation_requested TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Under Bear Review',
  resolution TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS adventures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Suggested' CHECK(status IN ('Suggested','Planned','Completed')),
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  happened_on TEXT,
  mood TEXT NOT NULL DEFAULT '💚',
  attachment_key TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
