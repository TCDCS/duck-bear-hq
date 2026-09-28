-- Menu Room: weekly suggestions, meal reviews and private review photos.

CREATE TABLE IF NOT EXISTS menu_meals (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL,
  meal_date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','other')),
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  served INTEGER NOT NULL DEFAULT 0 CHECK(served IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_meals_week ON menu_meals(week_start, meal_date, meal_type);

CREATE TABLE IF NOT EXISTS menu_suggestions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_week_start TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Suggested' CHECK(status IN ('Suggested','Shortlisted','Planned','Skipped')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_suggestions_week ON menu_suggestions(target_week_start, status, created_at);
CREATE INDEX IF NOT EXISTS idx_menu_suggestions_user ON menu_suggestions(user_id, created_at);

CREATE TABLE IF NOT EXISTS menu_reviews (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES menu_meals(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK(overall_rating BETWEEN 1 AND 6),
  taste_rating INTEGER NOT NULL CHECK(taste_rating BETWEEN 1 AND 5),
  plating_rating INTEGER NOT NULL CHECK(plating_rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(meal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_reviews_meal ON menu_reviews(meal_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_menu_reviews_user ON menu_reviews(user_id, updated_at);

CREATE TABLE IF NOT EXISTS menu_review_photos (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES menu_reviews(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_menu_review_photos_review ON menu_review_photos(review_id, created_at);

INSERT OR IGNORE INTO menu_meals
(id,week_start,meal_date,meal_type,display_name,description,served,created_at,updated_at)
VALUES
('menu-2026-09-28-mon-dinner','2026-09-28','2026-09-28','dinner','The Mongolian Submission','Slow-cooked Mongolian-style lamb with jasmine rice, pak choi, courgette, carrots, spring onion and sesame, with soy, hoisin, garlic and ginger flavours.',1,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-tue-breakfast','2026-09-28','2026-09-29','breakfast','Tropical Tease','Greek yoghurt with pineapple, banana, coconut and granola.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-tue-lunch','2026-09-28','2026-09-29','lunch','The Dagwood Dom','A fully loaded Dagwood Bumstead-style baguette.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-tue-dinner','2026-09-28','2026-09-29','dinner','Moroccan Restraint','Chicken with Moroccan-style spiced vegetables, cumin, paprika and harissa, with a cooling lemon and garlic yoghurt sauce.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-wed-breakfast','2026-09-28','2026-09-30','breakfast','Morning Mischief','Mexican-style scrambled egg tortilla with salsa, cheese and avocado.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-wed-dinner','2026-09-28','2026-09-30','dinner','Thai Tied Salmon','Thai-style salmon with rice and vegetables.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-thu-breakfast','2026-09-28','2026-10-01','breakfast','The Korean Wake-Up Call','Korean-style egg and rice with kimchi and gochujang.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-thu-dinner','2026-09-28','2026-10-01','dinner','Red Room Chilli','Rich chilli con carne.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-fri-breakfast','2026-09-28','2026-10-02','breakfast','Greek Temptation','Warm Greek-style pita with feta, tomato, cucumber, olive oil and oregano.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z'),
('menu-2026-09-28-fri-dinner','2026-09-28','2026-10-02','dinner','Korean Punishment Fish & Chips','Frozen fish and chips upgraded Korean-style with gochujang, honey, soy, lime, sesame, spring onion and spicy sriracha mayo.',0,'2026-09-28T00:00:00.000Z','2026-09-28T00:00:00.000Z');
