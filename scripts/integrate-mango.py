"""Apply narrow, repeat-safe integration edits to an existing Duck & Bear checkout."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
def edit(path,anchor,replacement,marker):
 p=root/path;s=p.read_text()
 if marker in s:return
 if s.count(anchor)!=1:raise SystemExit(f'Integration anchor changed in {path}; refusing a blind rewrite.')
 p.write_text(s.replace(anchor,replacement,1))
edit('src/index.js',"const ORDER_STATUSES", "import {routeMangoApi} from './mango/api.mjs';\n\nconst ORDER_STATUSES", "import {routeMangoApi}")
anchor="  if (!auth.user.active) return apiJson({ error: 'This account is disabled.' }, 403);"
edit('src/index.js',anchor,anchor+"\n\n  if (path === '/api/mango/profiles' || path.startsWith('/api/mango/profiles/')) return routeMangoApi(request, env, auth.user);", "return routeMangoApi(request")
edit('src/worker-games.js','import original from "./index.js";', 'import original from "./index.js";\nimport {createMangoHandler} from "./mango/static.mjs";', 'import {createMangoHandler}')
edit('src/worker-games.js','createGameHandler({assets,fallback:original})','createGameHandler({assets,fallback:createMangoHandler(original)})','fallback:createMangoHandler(original)')
card='''<article class="featured-game" id="mango-mayhem-card"><div class="game-graphic mango-graphic" aria-hidden="true"><img src="/games/mango-mayhem/icon.svg" alt=""><strong>MANGO<br>MAYHEM</strong></div><div class="game-copy"><div class="game-badges"><span>PLATFORM ADVENTURE</span><span>1 PLAYER</span></div><h3>Mango Mayhem</h3><p>Six places. Five hearts. One villain who forgot to buy a cup. A colourful manga adventure with mangos, helpers, bosses and very silly costumes.</p><p class="game-detail">Dublin, London, Taj Mahal, Sichuan, Neimenggu and Liaoning. Player profiles, keyboard, touch and gamepad. No timer.</p><div class="game-buttons"><a class="button primary" href="/games/mango-mayhem/">Start a sticky adventure →</a><a class="button secondary" href="/games/">All games</a></div></div></article>'''
p=root/'public/index.html';s=p.read_text()
if 'id="mango-mayhem-card"' not in s:
 start=s.index('<section class="games-section"');end=s.index('</section>',start)
 s=s[:end]+card+s[end:]
 s=s.replace('href="#games"','href="/games/"')
 s=s.replace('</head>','<link rel="stylesheet" href="/mango-card.css?v=1.0.0"></head>')
 p.write_text(s)
account_card='''</article><article class="fun-card" id="mango-mayhem-account-card"><p class="eyebrow">Duck &amp; Bear Games</p><div class="big-icon" aria-hidden="true">🥭</div><h2>Mango Mayhem</h2><p>A colourful manga platform adventure around six places. Collect mangos, meet your helpers and unlock costumes. Five hearts, no timer, single player.</p><a class="primary" href="/games/mango-mayhem/">Play Mango Mayhem →</a><p class="muted tiny">Keyboard, landscape touch and gamepad. Opens the menu first. Player profiles save progress without changing website points.</p></article><aside class="fun-card">'''
edit('public/kart-games.js','</article><aside class="fun-card">',account_card,'mango-mayhem-account-card')
p=root/'package.json';v=json.loads(p.read_text());v['scripts']['check']='node scripts/check.mjs && node scripts/mango-check.mjs';v['scripts']['deploy']='npm test && npm run check && wrangler d1 migrations apply DB --remote && wrangler deploy';p.write_text(json.dumps(v,indent=2)+'\n')
p=root/'scripts/check.mjs';s=p.read_text();anchor="db.exec(readFileSync(resolve(ROOT,'migrations/0001_schema.sql'),'utf8'));db.exec(readFileSync(resolve(ROOT,'migrations/0002_seed.sql'),'utf8'));"
if anchor in s:s=s.replace(anchor,"for(const file of readdirSync(resolve(ROOT,'migrations')).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(resolve(ROOT,'migrations',file),'utf8'));");p.write_text(s)
p=root/'README.md';s=p.read_text()
if '## Mango Mayhem' not in s:s+='''\n## Mango Mayhem\n\nOpen `/games/` or `/games/mango-mayhem/`. Six single-player platform levels, six bosses, seven original animated outfits, helper characters, 720 unique mangos and optional accessories. The menu always opens first. Keyboard, landscape touch and gamepad controls are supported. Five hearts, unlimited checkpoint retries and no timer.\n\nProfiles save locally. Existing signed-in accounts can link up to six cloud profiles, with owner-scoped revision checks, conflict merging and an offline retry queue. Game saves never change private orders, media, points or racing. Migration `0003_mango_profiles.sql` is additive and runs before production deployment. `/api/mango/health` exposes only game version and cloud-schema readiness. Reference photos are not published.\n\nRun `node --test tests/mango-*.test.mjs` and `python tests/mango-browser.py` against a running Worker. The browser suite exercises all six levels through real event handlers, not state setters or an auto-win API. Physical controller models, native share sheets and every handset are not certified by emulation. See `docs/mango-mayhem-release.md`.\n''';p.write_text(s)
print('Mango integration applied. Existing accounts, media, points and racing source preserved except the authenticated game-save dispatch and new game cards.')
