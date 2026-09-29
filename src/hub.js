const HUB_LEVELS=['none','read','contribute','admin'];
const HUB_PASSWORD_ITERATIONS=100000;
const HUB_MAX_UPLOAD_BYTES=8*1024*1024;
const HUB_UPLOAD_TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']);

const HUB_SCHEMA_STATEMENTS=[
  `CREATE TABLE IF NOT EXISTS hub_permissions (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    family_tree_level TEXT NOT NULL DEFAULT 'none' CHECK(family_tree_level IN ('none','read','contribute','admin')),
    scrapbook_level TEXT NOT NULL DEFAULT 'none' CHECK(scrapbook_level IN ('none','read','contribute','admin')),
    menus_level TEXT NOT NULL DEFAULT 'none' CHECK(menus_level IN ('none','read','contribute','admin')),
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS family_people (
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
  )`,
  `CREATE TABLE IF NOT EXISTS family_relations (
    id TEXT PRIMARY KEY,
    person_a_id TEXT NOT NULL REFERENCES family_people(id) ON DELETE CASCADE,
    person_b_id TEXT NOT NULL REFERENCES family_people(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK(relation_type IN ('parent','partner','sibling','relative','other')),
    label TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    UNIQUE(person_a_id,person_b_id,relation_type)
  )`,
  `CREATE TABLE IF NOT EXISTS scrapbook_items (
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
  )`,
  `CREATE TABLE IF NOT EXISTS menu_library (
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
  )`,
  `CREATE TABLE IF NOT EXISTS weekly_menus (
    id TEXT PRIMARY KEY,
    week_start TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS weekly_menu_items (
    id TEXT PRIMARY KEY,
    week_id TEXT NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
    day_key TEXT NOT NULL CHECK(day_key IN ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
    meal_slot TEXT NOT NULL DEFAULT 'Dinner',
    menu_item_id TEXT REFERENCES menu_library(id) ON DELETE SET NULL,
    custom_title TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hub_info_pages (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hub_board_items (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK(kind IN ('note','bucket','decision')),
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','planned','done','closed')),
    options_json TEXT NOT NULL DEFAULT '[]',
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS hub_board_votes (
    item_id TEXT NOT NULL REFERENCES hub_board_items(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    choice TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY(item_id,user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hub_info_category ON hub_info_pages(active,category,title)`,
  `CREATE INDEX IF NOT EXISTS idx_hub_board_kind ON hub_board_items(kind,status,updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_hub_board_votes ON hub_board_votes(item_id,choice)`,
  `CREATE INDEX IF NOT EXISTS idx_family_people_branch ON family_people(branch,name)`,
  `CREATE INDEX IF NOT EXISTS idx_scrapbook_date ON scrapbook_items(COALESCE(happened_on,created_at) DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_menu_library_active ON menu_library(active,title)`,
  `CREATE INDEX IF NOT EXISTS idx_weekly_menu_items_week ON weekly_menu_items(week_id,day_key,sort_order)`
];
async function ensureHubSchema(env){
  const names="'hub_permissions','family_people','family_relations','scrapbook_items','menu_library','weekly_menus','weekly_menu_items','hub_info_pages','hub_board_items','hub_board_votes'";
  try{
    const row=await env.DB.prepare(`SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name IN (${names})`).first();
    if(Number(row?.n||0)===10)return;
  }catch{}
  for(const sql of HUB_SCHEMA_STATEMENTS)await env.DB.prepare(sql).run();
  await env.DB.prepare(`INSERT OR IGNORE INTO hub_permissions (user_id,family_tree_level,scrapbook_level,menus_level,updated_at)
    SELECT id,CASE WHEN role='admin' THEN 'admin' ELSE 'contribute' END,
      CASE WHEN role='admin' THEN 'admin' ELSE 'contribute' END,
      CASE WHEN role='admin' THEN 'admin' ELSE 'contribute' END,?
    FROM users`).bind(stamp()).run();
  const seedId='info_allergies_handwash',seedSlug='allergies-hand-wash',seedTitle='Skin irritation: washing-up liquid & hand wash';
  const seedSummary='A simple guide to the ingredients worth watching when washing-up liquid irritates hands.';
  const seedBody=`Quick answer

For hand wash, products containing Sodium Laureth Sulfate (SLES) or Sodium Lauryl Sulfate (SLS) are worth avoiding first when they repeatedly irritate the skin. A sulfate-free, milder cleanser is a better starting point.

For washing dishes, washing-up liquid is designed to remove grease and can also strip protective oils from the skin. Use gloves and avoid prolonged bare-hand contact.

Ingredients to watch

• Sodium Laureth Sulfate (SLES)
• Sodium Lauryl Sulfate (SLS)
• Limonene — worth avoiding when it appears to be a repeat trigger
• Methylisothiazolinone (MI)
• Methylchloroisothiazolinone (MCI)

Better choices

Look for sulfate-free hand or body washes, glycerin or other moisturising ingredients, and milder cleansers such as sodium cocoyl isethionate, sodium cocoyl glutamate or sodium methyl cocoyl taurate.

Products previously checked

Fresh Milk Body & Hand Wash was tolerated and did not list SLS/SLES. The blue Asda antibacterial hand wash contained SLES high in the ingredient list, so it was not the preferred next product to try. The Tesco and Dunnes washing-up liquids checked contained stronger surfactant systems; the labels also included fragrance allergens/preservatives worth noting.

This is a practical irritation guide, not a diagnosis of allergy. If a rash becomes very itchy, blistered or swollen, keeps recurring despite avoiding detergents, or does not settle, a GP or dermatologist can assess it and patch testing can investigate contact allergy.`;
  const admin=await env.DB.prepare("SELECT id FROM users WHERE active=1 ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END,created_at LIMIT 1").first();
  if(admin?.id)await env.DB.prepare('INSERT OR IGNORE INTO hub_info_pages (id,slug,title,category,summary,body,created_by,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(seedId,seedSlug,seedTitle,'Health & household',seedSummary,seedBody,admin.id,1,stamp(),stamp()).run();
}

export async function routeHubApi(request,env,url,user){
  try{await ensureHubSchema(env);}catch(err){console.error('Duck & Bear hub schema bootstrap failed',err);return j({error:'Private Home storage is not ready.'},503);}
  const path=url.pathname;
  if(path==='/api/hub'&&request.method==='GET')return hubDashboard(env,user);
  if(path==='/api/hub/export'&&request.method==='GET')return exportHubData(env,user);
  if(path==='/api/hub/users'&&request.method==='GET')return listUsers(env,user);
  if(path==='/api/hub/users'&&request.method==='POST')return createUser(request,env,user);
  let m=path.match(/^\/api\/hub\/users\/([^/]+)$/);
  if(m&&request.method==='PUT')return updateUser(request,env,user,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return deleteUser(env,user,decodeURIComponent(m[1]));
  m=path.match(/^\/api\/hub\/users\/([^/]+)\/permissions$/);
  if(m&&request.method==='PUT')return updatePermissions(request,env,user,decodeURIComponent(m[1]));

  if(path==='/api/hub/info'&&request.method==='GET')return infoSnapshot(env,user);
  if(path==='/api/hub/info'&&request.method==='POST')return createInfoPage(request,env,user);
  m=path.match(/^\/api\/hub\/info\/([^/]+)$/);
  if(m&&request.method==='PUT')return updateInfoPage(request,env,user,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return deleteInfoPage(env,user,decodeURIComponent(m[1]));

  if(path==='/api/hub/board'&&request.method==='GET')return boardSnapshot(env,user);
  if(path==='/api/hub/board'&&request.method==='POST')return createBoardItem(request,env,user);
  m=path.match(/^\/api\/hub\/board\/([^/]+)$/);
  if(m&&request.method==='PUT')return updateBoardItem(request,env,user,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return deleteBoardItem(env,user,decodeURIComponent(m[1]));
  m=path.match(/^\/api\/hub\/board\/([^/]+)\/vote$/);
  if(m&&request.method==='POST')return voteBoardItem(request,env,user,decodeURIComponent(m[1]));

  if(path==='/api/hub/family'&&request.method==='GET')return familySnapshot(env,user);
  if(path==='/api/hub/family'&&request.method==='POST')return createFamilyPerson(request,env,user);
  m=path.match(/^\/api\/hub\/family\/([^/]+)$/);
  if(m&&request.method==='PUT')return updateFamilyPerson(request,env,user,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return deleteFamilyPerson(env,user,decodeURIComponent(m[1]));
  m=path.match(/^\/api\/hub\/family\/([^/]+)\/media$/);
  if(m&&request.method==='GET')return serveFamilyMedia(env,user,decodeURIComponent(m[1]));
  if(path==='/api/hub/family/relations'&&request.method==='POST')return createFamilyRelation(request,env,user);
  m=path.match(/^\/api\/hub\/family\/relations\/([^/]+)$/);
  if(m&&request.method==='DELETE')return deleteFamilyRelation(env,user,decodeURIComponent(m[1]));

  if(path==='/api/hub/scrapbook'&&request.method==='GET')return scrapbookSnapshot(env,user);
  if(path==='/api/hub/scrapbook'&&request.method==='POST')return createScrapbookItem(request,env,user);
  m=path.match(/^\/api\/hub\/scrapbook\/([^/]+)$/);
  if(m&&request.method==='PUT')return updateScrapbookItem(request,env,user,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return deleteScrapbookItem(env,user,decodeURIComponent(m[1]));
  m=path.match(/^\/api\/hub\/scrapbook\/([^/]+)\/media$/);
  if(m&&request.method==='GET')return serveScrapbookMedia(env,user,decodeURIComponent(m[1]));

  if(path==='/api/hub/menus'&&request.method==='GET')return menusSnapshot(env,user);
  if(path==='/api/hub/menus/library'&&request.method==='POST')return createMenuLibraryItem(request,env,user);
  m=path.match(/^\/api\/hub\/menus\/library\/([^/]+)$/);
  if(m&&request.method==='PUT')return updateMenuLibraryItem(request,env,user,decodeURIComponent(m[1]));
  if(m&&request.method==='DELETE')return deleteMenuLibraryItem(env,user,decodeURIComponent(m[1]));
  m=path.match(/^\/api\/hub\/menus\/library\/([^/]+)\/media$/);
  if(m&&request.method==='GET')return serveMenuMedia(env,user,decodeURIComponent(m[1]));
  if(path==='/api/hub/menus/weeks'&&request.method==='POST')return saveWeeklyMenu(request,env,user);

  return j({error:'Not found.'},404);
}

function headers(extra={}){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',...extra};}
function j(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:headers(extra)});}
function txt(value,max=500){return String(value??'').trim().slice(0,max);}
function stamp(){return new Date().toISOString();}
function uid(prefix){return prefix+'_'+crypto.randomUUID().replaceAll('-','');}
async function jsonBody(request){try{return await request.json();}catch{return null;}}
function safeUser(user){return {id:user.id,username:user.username,displayName:user.display_name,role:user.role,active:Boolean(user.active)};}
function levelOk(actual,needed){return HUB_LEVELS.indexOf(actual)>=HUB_LEVELS.indexOf(needed);}
async function getPermissions(env,user){
  const row=await env.DB.prepare('SELECT family_tree_level,scrapbook_level,menus_level FROM hub_permissions WHERE user_id=?').bind(user.id).first();
  if(row)return {familyTree:row.family_tree_level,scrapbook:row.scrapbook_level,menus:row.menus_level};
  if(user.role==='admin')return {familyTree:'admin',scrapbook:'admin',menus:'admin'};
  return {familyTree:'none',scrapbook:'none',menus:'none'};
}
async function need(env,user,area,level){
  const p=await getPermissions(env,user),actual=p[area];
  if(!levelOk(actual,level))throw Object.assign(new Error('You do not have access to this private section.'),{status:403});
  return p;
}
export async function hubPermissionAllows(env,user,area,level='read'){
  try{
    await ensureHubSchema(env);
    const p=await getPermissions(env,user);
    return levelOk(p[area],level);
  }catch(err){
    console.warn('Hub permission check failed',err);
    return false;
  }
}
async function withErrors(fn){
  try{return await fn();}catch(err){
    console.error('Duck & Bear hub error',err);
    return j({error:err?.message||'Something went wrong.'},Number(err?.status)||500);
  }
}
async function audit(env,userId,action,entityType,entityId,detail={}){
  try{await env.DB.prepare('INSERT INTO audit_log (id,actor_user_id,action,entity_type,entity_id,detail_json,created_at) VALUES (?,?,?,?,?,?,?)').bind(uid('aud'),userId||null,action,entityType,entityId||null,JSON.stringify(detail).slice(0,4000),stamp()).run();}catch(err){console.warn('Hub audit failed',err);}
}
async function hubDashboard(env,user){return withErrors(async()=>{
  const p=await getPermissions(env,user);
  const counts={family:0,scrapbook:0,menuLibrary:0,weeks:0,info:0,bucket:0,decisions:0,users:0};
  const tasks=[];
  if(levelOk(p.familyTree,'read'))tasks.push(env.DB.prepare('SELECT COUNT(*) n FROM family_people').first().then(x=>counts.family=Number(x?.n||0)));
  if(levelOk(p.scrapbook,'read'))tasks.push(env.DB.prepare('SELECT COUNT(*) n FROM scrapbook_items').first().then(x=>counts.scrapbook=Number(x?.n||0)));
  if(levelOk(p.menus,'read'))tasks.push(env.DB.prepare('SELECT COUNT(*) n FROM menu_library WHERE active=1').first().then(x=>counts.menuLibrary=Number(x?.n||0)),env.DB.prepare('SELECT COUNT(*) n FROM weekly_menus').first().then(x=>counts.weeks=Number(x?.n||0)));
  tasks.push(
    env.DB.prepare('SELECT COUNT(*) n FROM hub_info_pages WHERE active=1').first().then(x=>counts.info=Number(x?.n||0)),
    env.DB.prepare("SELECT COUNT(*) n FROM hub_board_items WHERE kind='bucket' AND status!='done'").first().then(x=>counts.bucket=Number(x?.n||0)),
    env.DB.prepare("SELECT COUNT(*) n FROM hub_board_items WHERE kind='decision' AND status='open'").first().then(x=>counts.decisions=Number(x?.n||0))
  );
  if(user.role==='admin')tasks.push(env.DB.prepare('SELECT COUNT(*) n FROM users WHERE active=1').first().then(x=>counts.users=Number(x?.n||0)));
  await Promise.all(tasks);
  return j({user:safeUser(user),permissions:p,counts,build:'6.2.0'});
});}

async function exportHubData(env,user){return withErrors(async()=>{
  const permissions=await getPermissions(env,user),out={version:1,build:'6.2.0',exportedAt:stamp(),user:safeUser(user),permissions};
  out.info=(await env.DB.prepare('SELECT id,slug,title,category,summary,body,created_by,created_at,updated_at FROM hub_info_pages WHERE active=1 ORDER BY category,title').all()).results||[];
  out.board=(await env.DB.prepare('SELECT * FROM hub_board_items ORDER BY created_at').all()).results||[];
  out.boardVotes=(await env.DB.prepare('SELECT * FROM hub_board_votes ORDER BY created_at').all()).results||[];
  if(levelOk(permissions.familyTree,'read')){
    out.familyPeople=(await env.DB.prepare('SELECT * FROM family_people ORDER BY branch,name').all()).results||[];
    out.familyRelations=(await env.DB.prepare('SELECT * FROM family_relations ORDER BY created_at').all()).results||[];
  }
  if(levelOk(permissions.scrapbook,'read'))out.scrapbook=(await env.DB.prepare('SELECT * FROM scrapbook_items ORDER BY COALESCE(happened_on,created_at)').all()).results||[];
  if(levelOk(permissions.menus,'read')){
    out.menuLibrary=(await env.DB.prepare('SELECT * FROM menu_library WHERE active=1 ORDER BY title').all()).results||[];
    out.weeklyMenus=(await env.DB.prepare('SELECT * FROM weekly_menus ORDER BY week_start').all()).results||[];
    out.weeklyMenuItems=(await env.DB.prepare('SELECT * FROM weekly_menu_items ORDER BY week_id,day_key,meal_slot').all()).results||[];
  }
  if(user.role==='admin')out.users=(await env.DB.prepare("SELECT u.id,u.username,u.display_name,u.role,u.active,u.created_at,u.updated_at,p.family_tree_level,p.scrapbook_level,p.menus_level FROM users u LEFT JOIN hub_permissions p ON p.user_id=u.id ORDER BY u.display_name").all()).results||[];
  const body=JSON.stringify(out,null,2);
  return new Response(body,{headers:{...headers({'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="duck-bear-home-backup.json"'})}});
});}

async function listUsers(env,user){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required.'},403);
  const rows=(await env.DB.prepare("SELECT u.id,u.username,u.display_name,u.role,u.active,u.created_at,u.updated_at,p.family_tree_level,p.scrapbook_level,p.menus_level FROM users u LEFT JOIN hub_permissions p ON p.user_id=u.id ORDER BY CASE u.role WHEN 'admin' THEN 0 ELSE 1 END,u.display_name").all()).results||[];
  return j({users:rows.map(r=>({id:r.id,username:r.username,displayName:r.display_name,role:r.role,active:Boolean(r.active),createdAt:r.created_at,permissions:{familyTree:r.family_tree_level||(r.role==='admin'?'admin':'none'),scrapbook:r.scrapbook_level||(r.role==='admin'?'admin':'none'),menus:r.menus_level||(r.role==='admin'?'admin':'none')}}))});
});}
function cleanUsername(value){return txt(value,30).replace(/[^a-zA-Z0-9_.-]/g,'');}
async function hashPassword(password,saltValue=null,iterations=HUB_PASSWORD_ITERATIONS){
  const salt=saltValue?b64ToBytes(saltValue):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256);
  return {hash:bytesToB64(new Uint8Array(bits)),salt:bytesToB64(salt),iterations};
}
function bytesToB64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function b64ToBytes(value){let s=value.replaceAll('-','+').replaceAll('_','/');while(s.length%4)s+='=';const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function createUser(request,env,user){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required.'},403);
  const b=await jsonBody(request)||{},username=cleanUsername(b.username),displayName=txt(b.displayName,60),role=b.role==='admin'?'admin':'member',password=String(b.password||'');
  if(username.length<3||!displayName)return j({error:'Username and display name are required.'},400);
  if(password.length<8||password.length>128)return j({error:'Password must be 8–128 characters.'},400);
  const h=await hashPassword(password),id=uid('usr'),t=stamp();
  try{
    await env.DB.batch([
      env.DB.prepare('INSERT INTO users (id,username,display_name,role,password_hash,password_salt,password_iterations,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,username,displayName,role,h.hash,h.salt,h.iterations,1,t,t),
      env.DB.prepare('INSERT INTO hub_permissions (user_id,family_tree_level,scrapbook_level,menus_level,updated_at) VALUES (?,?,?,?,?)').bind(id,role==='admin'?'admin':'none',role==='admin'?'admin':'none',role==='admin'?'admin':'none',t)
    ]);
  }catch(err){if(String(err).toLowerCase().includes('unique'))return j({error:'That username is already in use.'},409);throw err;}
  await audit(env,user.id,'hub.user_create','user',id,{username,role});
  return j({ok:true,id},201);
});}
async function updateUser(request,env,user,targetId){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required.'},403);
  const target=await env.DB.prepare('SELECT id,role,active FROM users WHERE id=?').bind(targetId).first();
  if(!target)return j({error:'User not found.'},404);
  const b=await jsonBody(request)||{},username=cleanUsername(b.username),displayName=txt(b.displayName,60),role=b.role==='admin'?'admin':'member',active=b.active===false?0:1;
  if(username.length<3||!displayName)return j({error:'Username and display name are required.'},400);
  if(target.role==='admin'&&(role!=='admin'||!active)){
    const c=await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE role='admin' AND active=1").first();
    if(Number(c?.n||0)<=1)return j({error:'Keep at least one active admin account.'},409);
  }
  try{await env.DB.prepare('UPDATE users SET username=?,display_name=?,role=?,active=?,updated_at=? WHERE id=?').bind(username,displayName,role,active,stamp(),targetId).run();}catch(err){if(String(err).toLowerCase().includes('unique'))return j({error:'That username is already in use.'},409);throw err;}
  if(role==='admin')await env.DB.prepare("INSERT INTO hub_permissions (user_id,family_tree_level,scrapbook_level,menus_level,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET family_tree_level='admin',scrapbook_level='admin',menus_level='admin',updated_at=excluded.updated_at").bind(targetId,'admin','admin','admin',stamp()).run();
  else if(target.role==='admin')await env.DB.prepare("UPDATE hub_permissions SET family_tree_level=CASE WHEN family_tree_level='admin' THEN 'contribute' ELSE family_tree_level END,scrapbook_level=CASE WHEN scrapbook_level='admin' THEN 'contribute' ELSE scrapbook_level END,menus_level=CASE WHEN menus_level='admin' THEN 'contribute' ELSE menus_level END,updated_at=? WHERE user_id=?").bind(stamp(),targetId).run();
  await audit(env,user.id,'hub.user_update','user',targetId,{username,role,active:Boolean(active)});
  return j({ok:true});
});}
async function deleteUser(env,user,targetId){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required.'},403);
  if(targetId===user.id)return j({error:'You cannot delete the account you are using.'},409);
  const target=await env.DB.prepare('SELECT id,role FROM users WHERE id=?').bind(targetId).first();
  if(!target)return j({error:'User not found.'},404);
  if(target.role==='admin'){
    const c=await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE role='admin' AND active=1").first();
    if(Number(c?.n||0)<=1)return j({error:'Keep at least one active admin account.'},409);
  }
  try{await env.DB.prepare('DELETE FROM users WHERE id=?').bind(targetId).run();}
  catch{return j({error:'This account has history that must be kept. Disable it instead of deleting it.'},409);}
  await audit(env,user.id,'hub.user_delete','user',targetId,{});
  return j({ok:true});
});}
async function updatePermissions(request,env,user,targetId){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required.'},403);
  const exists=await env.DB.prepare('SELECT id,role FROM users WHERE id=?').bind(targetId).first();
  if(!exists)return j({error:'User not found.'},404);
  const b=await jsonBody(request)||{};
  const family=HUB_LEVELS.includes(b.familyTree)?b.familyTree:'none',scrapbook=HUB_LEVELS.includes(b.scrapbook)?b.scrapbook:'none',menus=HUB_LEVELS.includes(b.menus)?b.menus:'none';
  if(exists.role==='admin'&&(family!=='admin'||scrapbook!=='admin'||menus!=='admin'))return j({error:'Admin accounts keep full private-hub access.'},409);
  const t=stamp();
  await env.DB.prepare('INSERT INTO hub_permissions (user_id,family_tree_level,scrapbook_level,menus_level,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET family_tree_level=excluded.family_tree_level,scrapbook_level=excluded.scrapbook_level,menus_level=excluded.menus_level,updated_at=excluded.updated_at').bind(targetId,family,scrapbook,menus,t).run();
  await audit(env,user.id,'hub.permissions_update','user',targetId,{family,scrapbook,menus});
  return j({ok:true});
});}

function infoSlug(value){
  return txt(value,100).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
}
function infoOut(r){return {id:r.id,slug:r.slug,title:r.title,category:r.category,summary:r.summary,body:r.body,createdBy:r.created_by,createdAt:r.created_at,updatedAt:r.updated_at};}
async function infoSnapshot(env,user){return withErrors(async()=>{
  const rows=(await env.DB.prepare('SELECT * FROM hub_info_pages WHERE active=1 ORDER BY category,title').all()).results||[];
  return j({pages:rows.map(infoOut),canEdit:user.role==='admin'});
});}
async function createInfoPage(request,env,user){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required to create library pages.'},403);
  const b=await jsonBody(request)||{},title=txt(b.title,160),slug=infoSlug(b.slug||title),category=txt(b.category,80)||'General',summary=txt(b.summary,500),body=txt(b.body,12000);
  if(!title||!slug)return j({error:'Title is required.'},400);
  const id=uid('info'),t=stamp();
  try{await env.DB.prepare('INSERT INTO hub_info_pages (id,slug,title,category,summary,body,created_by,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,slug,title,category,summary,body,user.id,1,t,t).run();}
  catch(err){if(String(err).toLowerCase().includes('unique'))return j({error:'That page address is already in use.'},409);throw err;}
  await audit(env,user.id,'hub.info_create','info_page',id,{slug,title});
  return infoSnapshot(env,user);
});}
async function updateInfoPage(request,env,user,id){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required to edit library pages.'},403);
  const row=await env.DB.prepare('SELECT * FROM hub_info_pages WHERE id=? AND active=1').bind(id).first();if(!row)return j({error:'Info page not found.'},404);
  const b=await jsonBody(request)||{},title=txt(b.title,160)||row.title,slug=infoSlug(b.slug||row.slug),category=txt(b.category,80)||'General',summary=txt(b.summary,500),body=txt(b.body,12000);
  try{await env.DB.prepare('UPDATE hub_info_pages SET slug=?,title=?,category=?,summary=?,body=?,updated_at=? WHERE id=?').bind(slug,title,category,summary,body,stamp(),id).run();}
  catch(err){if(String(err).toLowerCase().includes('unique'))return j({error:'That page address is already in use.'},409);throw err;}
  await audit(env,user.id,'hub.info_update','info_page',id,{slug,title});
  return infoSnapshot(env,user);
});}
async function deleteInfoPage(env,user,id){return withErrors(async()=>{
  if(user.role!=='admin')return j({error:'Admin access required to remove library pages.'},403);
  const row=await env.DB.prepare('SELECT id FROM hub_info_pages WHERE id=? AND active=1').bind(id).first();if(!row)return j({error:'Info page not found.'},404);
  await env.DB.prepare('UPDATE hub_info_pages SET active=0,updated_at=? WHERE id=?').bind(stamp(),id).run();
  await audit(env,user.id,'hub.info_delete','info_page',id,{});
  return infoSnapshot(env,user);
});}

function boardOut(r,votes,userId){
  let options=[];try{options=JSON.parse(r.options_json||'[]');}catch{}
  const itemVotes=votes.filter(v=>v.item_id===r.id),totals={};for(const v of itemVotes)totals[v.choice]=(totals[v.choice]||0)+1;
  return {id:r.id,kind:r.kind,title:r.title,body:r.body,status:r.status,options:Array.isArray(options)?options:[],createdBy:r.created_by,createdAt:r.created_at,updatedAt:r.updated_at,votes:totals,myVote:itemVotes.find(v=>v.user_id===userId)?.choice||''};
}
async function boardSnapshot(env,user){return withErrors(async()=>{
  const [items,votes]=await Promise.all([env.DB.prepare('SELECT * FROM hub_board_items ORDER BY updated_at DESC LIMIT 250').all(),env.DB.prepare('SELECT item_id,user_id,choice FROM hub_board_votes').all()]);
  return j({items:(items.results||[]).map(r=>boardOut(r,votes.results||[],user.id))});
});}
async function createBoardItem(request,env,user){return withErrors(async()=>{
  const b=await jsonBody(request)||{},kind=['note','bucket','decision'].includes(b.kind)?b.kind:'note',title=txt(b.title,160),body=txt(b.body,3000);
  if(!title)return j({error:'Title is required.'},400);
  const options=kind==='decision'?(Array.isArray(b.options)?b.options:txt(b.options,1000).split('\n')).map(x=>txt(x,80)).filter(Boolean).slice(0,8):[];
  if(kind==='decision'&&options.length<2)return j({error:'A decision needs at least two choices.'},400);
  const id=uid('board'),t=stamp();
  await env.DB.prepare('INSERT INTO hub_board_items (id,kind,title,body,status,options_json,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,kind,title,body,'open',JSON.stringify(options),user.id,t,t).run();
  await audit(env,user.id,'hub.board_create','board_item',id,{kind,title});
  return boardSnapshot(env,user);
});}
async function updateBoardItem(request,env,user,id){return withErrors(async()=>{
  const row=await env.DB.prepare('SELECT * FROM hub_board_items WHERE id=?').bind(id).first();if(!row)return j({error:'Item not found.'},404);
  if(row.created_by!==user.id&&user.role!=='admin')return j({error:'Only the person who added this item, or an admin, can edit it.'},403);
  const b=await jsonBody(request)||{},status=['open','planned','done','closed'].includes(b.status)?b.status:row.status,title=txt(b.title,160)||row.title,body=txt(b.body,3000);
  let options;try{options=JSON.parse(row.options_json||'[]');}catch{options=[];}
  if(row.kind==='decision'&&b.options!==undefined)options=(Array.isArray(b.options)?b.options:txt(b.options,1000).split('\n')).map(x=>txt(x,80)).filter(Boolean).slice(0,8);
  await env.DB.prepare('UPDATE hub_board_items SET title=?,body=?,status=?,options_json=?,updated_at=? WHERE id=?').bind(title,body,status,JSON.stringify(options),stamp(),id).run();
  await audit(env,user.id,'hub.board_update','board_item',id,{status});
  return boardSnapshot(env,user);
});}
async function deleteBoardItem(env,user,id){return withErrors(async()=>{
  const row=await env.DB.prepare('SELECT created_by FROM hub_board_items WHERE id=?').bind(id).first();if(!row)return j({error:'Item not found.'},404);
  if(row.created_by!==user.id&&user.role!=='admin')return j({error:'Only the person who added this item, or an admin, can delete it.'},403);
  await env.DB.prepare('DELETE FROM hub_board_items WHERE id=?').bind(id).run();
  await audit(env,user.id,'hub.board_delete','board_item',id,{});
  return boardSnapshot(env,user);
});}
async function voteBoardItem(request,env,user,id){return withErrors(async()=>{
  const row=await env.DB.prepare("SELECT options_json,status FROM hub_board_items WHERE id=? AND kind='decision'").bind(id).first();if(!row)return j({error:'Decision not found.'},404);
  if(row.status!=='open')return j({error:'This decision is closed.'},409);
  let options=[];try{options=JSON.parse(row.options_json||'[]');}catch{}
  const b=await jsonBody(request)||{},choice=txt(b.choice,80);if(!options.includes(choice))return j({error:'Choose one of the available options.'},400);
  await env.DB.prepare('INSERT INTO hub_board_votes (item_id,user_id,choice,created_at) VALUES (?,?,?,?) ON CONFLICT(item_id,user_id) DO UPDATE SET choice=excluded.choice,created_at=excluded.created_at').bind(id,user.id,choice,stamp()).run();
  await audit(env,user.id,'hub.board_vote','board_item',id,{choice});
  return boardSnapshot(env,user);
});}

async function familySnapshot(env,user){return withErrors(async()=>{
  await need(env,user,'familyTree','read');
  const [people,relations]=await Promise.all([env.DB.prepare('SELECT * FROM family_people ORDER BY branch,name').all(),env.DB.prepare('SELECT * FROM family_relations ORDER BY created_at').all()]);
  return j({people:(people.results||[]).map(p=>familyOut(p)),relations:relations.results||[]});
});}
function familyOut(p){return {id:p.id,name:p.name,relationLabel:p.relation_label,branch:p.branch,birthDate:p.birth_date||'',notes:p.notes||'',createdBy:p.created_by,createdAt:p.created_at,updatedAt:p.updated_at,photoUrl:p.photo_key?'/api/hub/family/'+encodeURIComponent(p.id)+'/media':''};}
async function formData(request){try{return await request.formData();}catch{throw Object.assign(new Error('Use a valid form submission.'),{status:400});}}
async function storeFile(env,file,scope,userId,oldKey=''){
  if(!file||typeof file==='string'||!file.size)return {key:oldKey,name:'',type:'',size:0,changed:false};
  if(file.size>HUB_MAX_UPLOAD_BYTES)throw Object.assign(new Error('File is too large. Maximum size is 8 MB.'),{status:413});
  if(!HUB_UPLOAD_TYPES.has(file.type))throw Object.assign(new Error('Use a JPG, PNG, WebP, GIF, MP4 or WebM file.'),{status:415});
  const safe=String(file.name||'upload').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100);
  const key='hub/'+scope+'/'+userId+'/'+crypto.randomUUID()+'-'+safe;
  await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type},customMetadata:{private:'true',scope}});
  if(oldKey&&oldKey!==key)try{await env.MEDIA.delete(oldKey);}catch{}
  return {key,name:String(file.name||'').slice(0,180),type:file.type,size:file.size,changed:true};
}
async function createFamilyPerson(request,env,user){return withErrors(async()=>{
  await need(env,user,'familyTree','contribute');
  const f=await formData(request),name=txt(f.get('name'),100);
  if(!name)return j({error:'Name is required.'},400);
  const media=await storeFile(env,f.get('file'),'family',user.id),id=uid('person'),t=stamp();
  await env.DB.prepare('INSERT INTO family_people (id,name,relation_label,branch,birth_date,notes,photo_key,photo_name,photo_type,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,name,txt(f.get('relationLabel'),80),txt(f.get('branch'),40)||'shared',txt(f.get('birthDate'),20)||null,txt(f.get('notes'),3000),media.key||null,media.name||null,media.type||null,user.id,t,t).run();
  await audit(env,user.id,'hub.family_create','family_person',id,{name});
  return familySnapshot(env,user);
});}
async function updateFamilyPerson(request,env,user,id){return withErrors(async()=>{
  const p=await need(env,user,'familyTree','contribute'),row=await env.DB.prepare('SELECT * FROM family_people WHERE id=?').bind(id).first();
  if(!row)return j({error:'Person not found.'},404);
  if(p.familyTree!=='admin'&&row.created_by!==user.id)return j({error:'Only the person who added this entry, or an admin, can edit it.'},403);
  const f=await formData(request),name=txt(f.get('name'),100)||row.name,media=await storeFile(env,f.get('file'),'family',user.id,row.photo_key||'');
  const key=media.changed?media.key:row.photo_key,nameFile=media.changed?media.name:row.photo_name,type=media.changed?media.type:row.photo_type;
  await env.DB.prepare('UPDATE family_people SET name=?,relation_label=?,branch=?,birth_date=?,notes=?,photo_key=?,photo_name=?,photo_type=?,updated_at=? WHERE id=?').bind(name,txt(f.get('relationLabel'),80),txt(f.get('branch'),40)||'shared',txt(f.get('birthDate'),20)||null,txt(f.get('notes'),3000),key||null,nameFile||null,type||null,stamp(),id).run();
  await audit(env,user.id,'hub.family_update','family_person',id,{name});
  return familySnapshot(env,user);
});}
async function deleteFamilyPerson(env,user,id){return withErrors(async()=>{
  const p=await need(env,user,'familyTree','contribute'),row=await env.DB.prepare('SELECT created_by,photo_key FROM family_people WHERE id=?').bind(id).first();
  if(!row)return j({error:'Person not found.'},404);
  if(p.familyTree!=='admin'&&row.created_by!==user.id)return j({error:'Only the person who added this entry, or an admin, can delete it.'},403);
  await env.DB.prepare('DELETE FROM family_people WHERE id=?').bind(id).run();if(row.photo_key)try{await env.MEDIA.delete(row.photo_key);}catch{}
  await audit(env,user.id,'hub.family_delete','family_person',id,{});
  return familySnapshot(env,user);
});}
async function createFamilyRelation(request,env,user){return withErrors(async()=>{
  await need(env,user,'familyTree','contribute');
  const b=await jsonBody(request)||{},a=txt(b.personA,120),c=txt(b.personB,120),type=['parent','partner','sibling','relative','other'].includes(b.relationType)?b.relationType:'relative';
  if(!a||!c||a===c)return j({error:'Choose two different people.'},400);
  const id=uid('rel');
  try{await env.DB.prepare('INSERT INTO family_relations (id,person_a_id,person_b_id,relation_type,label,created_by,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,a,c,type,txt(b.label,80),user.id,stamp()).run();}catch{return j({error:'That relationship already exists or a person is missing.'},409);}
  await audit(env,user.id,'hub.family_relation_create','family_relation',id,{type});
  return familySnapshot(env,user);
});}
async function deleteFamilyRelation(env,user,id){return withErrors(async()=>{
  await need(env,user,'familyTree','contribute');await env.DB.prepare('DELETE FROM family_relations WHERE id=?').bind(id).run();await audit(env,user.id,'hub.family_relation_delete','family_relation',id,{});return familySnapshot(env,user);
});}
async function serveFamilyMedia(env,user,id){return withErrors(async()=>{await need(env,user,'familyTree','read');const row=await env.DB.prepare('SELECT photo_key,photo_type FROM family_people WHERE id=?').bind(id).first();return servePrivateObject(env,row?.photo_key,row?.photo_type);});}

async function scrapbookSnapshot(env,user){return withErrors(async()=>{
  await need(env,user,'scrapbook','read');
  const rows=(await env.DB.prepare('SELECT * FROM scrapbook_items ORDER BY COALESCE(happened_on,created_at) DESC,created_at DESC LIMIT 250').all()).results||[];
  return j({items:rows.map(r=>scrapOut(r))});
});}
function scrapOut(r){return {id:r.id,title:r.title,body:r.body,happenedOn:r.happened_on||'',mood:r.mood,createdBy:r.created_by,createdAt:r.created_at,updatedAt:r.updated_at,mediaType:r.media_type||'',mediaName:r.media_name||'',mediaUrl:r.media_key?'/api/hub/scrapbook/'+encodeURIComponent(r.id)+'/media':''};}
async function createScrapbookItem(request,env,user){return withErrors(async()=>{
  await need(env,user,'scrapbook','contribute');
  const f=await formData(request),title=txt(f.get('title'),140);if(!title)return j({error:'Title is required.'},400);
  const media=await storeFile(env,f.get('file'),'scrapbook',user.id),id=uid('scrap'),t=stamp();
  await env.DB.prepare('INSERT INTO scrapbook_items (id,title,body,happened_on,mood,media_key,media_name,media_type,media_size,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,title,txt(f.get('body'),5000),txt(f.get('happenedOn'),20)||null,txt(f.get('mood'),12)||'💚',media.key||null,media.name||null,media.type||null,media.size||null,user.id,t,t).run();
  await audit(env,user.id,'hub.scrapbook_create','scrapbook',id,{title});return scrapbookSnapshot(env,user);
});}
async function updateScrapbookItem(request,env,user,id){return withErrors(async()=>{
  const p=await need(env,user,'scrapbook','contribute'),row=await env.DB.prepare('SELECT * FROM scrapbook_items WHERE id=?').bind(id).first();if(!row)return j({error:'Scrapbook item not found.'},404);
  if(p.scrapbook!=='admin'&&row.created_by!==user.id)return j({error:'Only the person who added this item, or an admin, can edit it.'},403);
  const f=await formData(request),media=await storeFile(env,f.get('file'),'scrapbook',user.id,row.media_key||'');
  await env.DB.prepare('UPDATE scrapbook_items SET title=?,body=?,happened_on=?,mood=?,media_key=?,media_name=?,media_type=?,media_size=?,updated_at=? WHERE id=?').bind(txt(f.get('title'),140)||row.title,txt(f.get('body'),5000),txt(f.get('happenedOn'),20)||null,txt(f.get('mood'),12)||row.mood,media.changed?media.key:row.media_key,media.changed?media.name:row.media_name,media.changed?media.type:row.media_type,media.changed?media.size:row.media_size,stamp(),id).run();
  await audit(env,user.id,'hub.scrapbook_update','scrapbook',id,{});return scrapbookSnapshot(env,user);
});}
async function deleteScrapbookItem(env,user,id){return withErrors(async()=>{
  const p=await need(env,user,'scrapbook','contribute'),row=await env.DB.prepare('SELECT created_by,media_key FROM scrapbook_items WHERE id=?').bind(id).first();if(!row)return j({error:'Scrapbook item not found.'},404);
  if(p.scrapbook!=='admin'&&row.created_by!==user.id)return j({error:'Only the person who added this item, or an admin, can delete it.'},403);
  await env.DB.prepare('DELETE FROM scrapbook_items WHERE id=?').bind(id).run();if(row.media_key)try{await env.MEDIA.delete(row.media_key);}catch{}
  await audit(env,user.id,'hub.scrapbook_delete','scrapbook',id,{});return scrapbookSnapshot(env,user);
});}
async function serveScrapbookMedia(env,user,id){return withErrors(async()=>{await need(env,user,'scrapbook','read');const row=await env.DB.prepare('SELECT media_key,media_type FROM scrapbook_items WHERE id=?').bind(id).first();return servePrivateObject(env,row?.media_key,row?.media_type);});}

async function menusSnapshot(env,user){return withErrors(async()=>{
  await need(env,user,'menus','read');
  const [library,weeks,items]=await Promise.all([env.DB.prepare('SELECT * FROM menu_library WHERE active=1 ORDER BY updated_at DESC,title').all(),env.DB.prepare('SELECT * FROM weekly_menus ORDER BY week_start DESC LIMIT 16').all(),env.DB.prepare('SELECT * FROM weekly_menu_items ORDER BY week_id,day_key,sort_order').all()]);
  return j({library:(library.results||[]).map(menuOut),weeks:weeks.results||[],items:items.results||[]});
});}
function menuOut(r){let tags=[];try{tags=JSON.parse(r.tags_json||'[]');}catch{}return {id:r.id,title:r.title,description:r.description,cuisine:r.cuisine,tags:Array.isArray(tags)?tags:[],createdBy:r.created_by,updatedAt:r.updated_at,mediaUrl:r.media_key?'/api/hub/menus/library/'+encodeURIComponent(r.id)+'/media':''};}
async function createMenuLibraryItem(request,env,user){return withErrors(async()=>{
  await need(env,user,'menus','contribute');const f=await formData(request),title=txt(f.get('title'),140);if(!title)return j({error:'Menu name is required.'},400);
  const media=await storeFile(env,f.get('file'),'menus',user.id),id=uid('menu'),t=stamp(),tags=txt(f.get('tags'),500).split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
  await env.DB.prepare('INSERT INTO menu_library (id,title,description,cuisine,tags_json,media_key,media_name,media_type,media_size,created_by,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,title,txt(f.get('description'),3000),txt(f.get('cuisine'),80),JSON.stringify(tags),media.key||null,media.name||null,media.type||null,media.size||null,user.id,1,t,t).run();
  await audit(env,user.id,'hub.menu_create','menu_library',id,{title});return menusSnapshot(env,user);
});}
async function updateMenuLibraryItem(request,env,user,id){return withErrors(async()=>{
  const p=await need(env,user,'menus','contribute'),row=await env.DB.prepare('SELECT * FROM menu_library WHERE id=?').bind(id).first();if(!row)return j({error:'Menu item not found.'},404);
  if(p.menus!=='admin'&&row.created_by!==user.id)return j({error:'Only the person who added this menu, or an admin, can edit it.'},403);
  const f=await formData(request),media=await storeFile(env,f.get('file'),'menus',user.id,row.media_key||''),tags=txt(f.get('tags'),500).split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
  await env.DB.prepare('UPDATE menu_library SET title=?,description=?,cuisine=?,tags_json=?,media_key=?,media_name=?,media_type=?,media_size=?,updated_at=? WHERE id=?').bind(txt(f.get('title'),140)||row.title,txt(f.get('description'),3000),txt(f.get('cuisine'),80),JSON.stringify(tags),media.changed?media.key:row.media_key,media.changed?media.name:row.media_name,media.changed?media.type:row.media_type,media.changed?media.size:row.media_size,stamp(),id).run();
  await audit(env,user.id,'hub.menu_update','menu_library',id,{});return menusSnapshot(env,user);
});}
async function deleteMenuLibraryItem(env,user,id){return withErrors(async()=>{
  const p=await need(env,user,'menus','contribute'),row=await env.DB.prepare('SELECT created_by,media_key FROM menu_library WHERE id=?').bind(id).first();if(!row)return j({error:'Menu item not found.'},404);
  if(p.menus!=='admin'&&row.created_by!==user.id)return j({error:'Only the person who added this menu, or an admin, can delete it.'},403);
  await env.DB.prepare('UPDATE menu_library SET active=0,updated_at=? WHERE id=?').bind(stamp(),id).run();if(row.media_key)try{await env.MEDIA.delete(row.media_key);}catch{}
  await audit(env,user.id,'hub.menu_delete','menu_library',id,{});return menusSnapshot(env,user);
});}
async function serveMenuMedia(env,user,id){return withErrors(async()=>{await need(env,user,'menus','read');const row=await env.DB.prepare('SELECT media_key,media_type FROM menu_library WHERE id=?').bind(id).first();return servePrivateObject(env,row?.media_key,row?.media_type);});}
async function saveWeeklyMenu(request,env,user){return withErrors(async()=>{
  await need(env,user,'menus','contribute');const b=await jsonBody(request)||{},weekStart=txt(b.weekStart,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(weekStart))return j({error:'Choose the Monday for this week.'},400);
  let week=await env.DB.prepare('SELECT * FROM weekly_menus WHERE week_start=?').bind(weekStart).first(),weekId=week?.id||uid('week'),t=stamp();
  if(week)await env.DB.prepare('UPDATE weekly_menus SET title=?,notes=?,updated_at=? WHERE id=?').bind(txt(b.title,140),txt(b.notes,3000),t,weekId).run();
  else await env.DB.prepare('INSERT INTO weekly_menus (id,week_start,title,notes,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(weekId,weekStart,txt(b.title,140),txt(b.notes,3000),user.id,t,t).run();
  await env.DB.prepare('DELETE FROM weekly_menu_items WHERE week_id=?').bind(weekId).run();
  const days=new Set(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']),items=Array.isArray(b.items)?b.items.slice(0,50):[];
  for(let i=0;i<items.length;i++){const x=items[i]||{};if(!days.has(x.day))continue;await env.DB.prepare('INSERT INTO weekly_menu_items (id,week_id,day_key,meal_slot,menu_item_id,custom_title,notes,sort_order,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(uid('meal'),weekId,x.day,txt(x.mealSlot,40)||'Dinner',txt(x.menuItemId,120)||null,txt(x.customTitle,140),txt(x.notes,500),i*10,t).run();}
  await audit(env,user.id,'hub.week_save','weekly_menu',weekId,{weekStart,count:items.length});return menusSnapshot(env,user);
});}

async function servePrivateObject(env,key,type){
  if(!key)return j({error:'Media not found.'},404);
  const obj=await env.MEDIA.get(key);if(!obj)return j({error:'Media not found.'},404);
  const h=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Type':type||'application/octet-stream','Content-Disposition':'inline'});
  try{obj.writeHttpMetadata(h);}catch{}
  return new Response(obj.body||obj,{status:200,headers:h});
}
