PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS hub_permissions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  family_tree_level TEXT NOT NULL DEFAULT 'none' CHECK(family_tree_level IN ('none','read','contribute','admin')),
  scrapbook_level TEXT NOT NULL DEFAULT 'none' CHECK(scrapbook_level IN ('none','read','contribute','admin')),
  menus_level TEXT NOT NULL DEFAULT 'none' CHECK(menus_level IN ('none','read','contribute','admin')),
  updated_at TEXT NOT NULL
);

-- The two accounts that already exist when this migration is applied are the
-- private Duck & Bear owners. Future accounts start with no private-hub access
-- until an admin grants it.
INSERT OR IGNORE INTO hub_permissions (user_id,family_tree_level,scrapbook_level,menus_level,updated_at)
SELECT id,
       CASE WHEN role='admin' THEN 'admin' ELSE 'contribute' END,
       CASE WHEN role='admin' THEN 'admin' ELSE 'contribute' END,
       CASE WHEN role='admin' THEN 'admin' ELSE 'contribute' END,
       datetime('now')
FROM users;

CREATE TABLE IF NOT EXISTS family_people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  relation_label TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT 'shared',
  birth_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  photo_key TEXT,
  photo_name TEXT,
  photo_type TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_family_people_branch ON family_people(branch,name);

CREATE TABLE IF NOT EXISTS family_relations (
  id TEXT PRIMARY KEY,
  person_a_id TEXT NOT NULL REFERENCES family_people(id) ON DELETE CASCADE,
  person_b_id TEXT NOT NULL REFERENCES family_people(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('parent','partner','sibling','relative','other')),
  label TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE(person_a_id,person_b_id,relation_type)
);

CREATE TABLE IF NOT EXISTS scrapbook_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  happened_on TEXT,
  mood TEXT NOT NULL DEFAULT '💚',
  media_key TEXT,
  media_name TEXT,
  media_type TEXT,
  media_size INTEGER,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scrapbook_date ON scrapbook_items(COALESCE(happened_on,created_at) DESC);

CREATE TABLE IF NOT EXISTS menu_library (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cuisine TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  media_key TEXT,
  media_name TEXT,
  media_type TEXT,
  media_size INTEGER,
  created_by TEXT NOT NULL REFERENCES users(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_menu_library_active ON menu_library(active,title);

CREATE TABLE IF NOT EXISTS weekly_menus (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS weekly_menu_items (
  id TEXT PRIMARY KEY,
  week_id TEXT NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL CHECK(day_key IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  meal_slot TEXT NOT NULL DEFAULT 'Dinner',
  menu_item_id TEXT REFERENCES menu_library(id) ON DELETE SET NULL,
  custom_title TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_items_week ON weekly_menu_items(week_id,day_key,sort_order);
