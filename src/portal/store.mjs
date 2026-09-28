// SQLite-backed application records. This binding is private to the Worker.
// Never accept an actor or a command name directly from an HTTP client.
export const VERSION='7.0.0';
const sections=['family','scrapbook','menus','plans','notes','images'];
const shared=['family','menus','plans'];
const kinds={person:['family'],relation:['family'],proposal:['family'],album:['scrapbook','family'],memory:['scrapbook','family'],recipe:['menus'],idea:['menus'],week:['menus'],meal:['menus'],review:['menus'],adventure:['plans'],poll:['plans'],note:['notes'],shopping:['menus'],comment:['family','scrapbook','menus','plans'],media:sections};
const references=['coverId','personId','albumId','recipeId','sourceId','from','to','mealId','weekId'];
const arrayReferences=['photos','relatedIds'];
const parents=['parent','adoptive-parent','step-parent'];
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const parse=x=>typeof x==='string'?JSON.parse(x):x;
function published(w){return {startDate:String(w.startDate||''),title:String(w.title||''),publishedAt:String(w.publishedAt||''),meals:(Array.isArray(w.meals)?w.meals:[]).map(m=>({id:String(m.id||''),title:String(m.title||''),date:String(m.date||''),mealType:String(m.mealType||''),description:String(m.description||''),served:Boolean(m.served)}))};}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
class Fault extends Error{constructor(status,message){super(message);this.status=status;}}
const requireValue=(condition,status,message)=>{if(!condition)throw new Fault(status,message);};
function bounded(value,max=5000){requireValue(typeof value==='string',400,'Text expected.');requireValue(value.length<=max,400,'Text is too long.');return value.trim();}
function date(value){requireValue(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),400,'Use a valid calendar date.');const d=new Date(value+'T12:00:00Z');requireValue(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value,400,'Invalid date.');return d;}
function refs(data){return [...references.flatMap(k=>data[k]?[data[k]]:[]),...arrayReferences.flatMap(k=>Array.isArray(data[k])?data[k]:[])];}
export class PortalStore{
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;
  const schema=[
   'CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY,value TEXT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS grants (user_id TEXT NOT NULL,scope TEXT NOT NULL,level INTEGER NOT NULL CHECK(level BETWEEN 0 AND 3),PRIMARY KEY(user_id,scope))',
   'CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY,section TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,data TEXT NOT NULL,parent_id TEXT,creator TEXT NOT NULL,revision INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)',
   'CREATE INDEX IF NOT EXISTS record_section ON records(section,kind,deleted,updated_at)',
   'CREATE TABLE IF NOT EXISTS history (id TEXT NOT NULL,revision INTEGER NOT NULL,snapshot TEXT NOT NULL,actor TEXT NOT NULL,at TEXT NOT NULL,PRIMARY KEY(id,revision))',
   'CREATE TABLE IF NOT EXISTS restored_history (import_id TEXT NOT NULL,record_id TEXT NOT NULL,original_revision INTEGER NOT NULL,snapshot TEXT NOT NULL,actor TEXT NOT NULL,at TEXT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT,record_id TEXT,section TEXT NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,at TEXT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS weeks (start TEXT PRIMARY KEY,record_id TEXT NOT NULL,snapshot TEXT NOT NULL,at TEXT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS votes (record_id TEXT NOT NULL,user_id TEXT NOT NULL,choice TEXT NOT NULL,PRIMARY KEY(record_id,user_id))',
   'CREATE TABLE IF NOT EXISTS favourites (record_id TEXT NOT NULL,user_id TEXT NOT NULL,PRIMARY KEY(record_id,user_id))',
   'CREATE TABLE IF NOT EXISTS preferences (user_id TEXT PRIMARY KEY,data TEXT NOT NULL)',
   'CREATE TABLE IF NOT EXISTS challenges (hash TEXT PRIMARY KEY,purpose TEXT NOT NULL,user_id TEXT NOT NULL,email TEXT,fingerprint TEXT,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0)',
   'CREATE TABLE IF NOT EXISTS emails (user_id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,verified INTEGER NOT NULL DEFAULT 0)',
   'CREATE TABLE IF NOT EXISTS throttle (key TEXT PRIMARY KEY,started INTEGER NOT NULL,count INTEGER NOT NULL)',
  ];for(const q of schema)this.sql.exec(q);
 }
 rows(q,...p){return this.sql.exec(q,...p).toArray();}
 one(q,...p){return this.rows(q,...p)[0]||null;}
 transaction(fn){return this.ctx.storage.transactionSync(fn);}
 principals(){const m=this.one("SELECT value FROM meta WHERE key='principals'");return m?parse(m.value):null;}
 core(a){const p=this.principals();return Boolean(a?.active&&p&&(a.id===p.ownerId||a.id===p.companionId));}
 owner(a){return Boolean(a?.active&&a.id===this.principals()?.ownerId);}
 auth(a){requireValue(a?.id&&a.active,403,'This account does not have access.');requireValue(this.principals(),503,'The private workspace has not been initialised.');}
 level(a,section,record=null,visited=new Set()){
  if(!a?.active)return 0;
  if(this.core(a))return 3;
  if(!shared.includes(section)||(record?.kind==='review'||(section==='menus'&&record?.kind==='media')))return 0;
  let n=this.one('SELECT level FROM grants WHERE user_id=? AND scope=?',a.id,section)?.level||0;
  if(record?.kind==='comment'&&record.parent_id&&this.raw(record.parent_id)?.kind==='review')return 0;
  if(record){const grant=this.one('SELECT level FROM grants WHERE user_id=? AND scope=?',a.id,'record:'+record.id);if(grant){if(grant.level===0)return 0;n=grant.level;}
   if(record.parent_id&&!visited.has(record.id)){visited.add(record.id);const parent=this.raw(record.parent_id);if(parent&&parent.section===section)n=Math.max(n,this.level(a,section,parent,visited));}}
  return n;
 }
 raw(id){return this.one('SELECT * FROM records WHERE id=?',String(id));}
 readable(a,r){return Boolean(r&&!r.deleted&&this.level(a,r.section,r)>=1);}
 editable(a,r){const level=this.level(a,r.section,r);return level===3||(level===2&&r.creator===a.id);}
 record(a,id,deleted=false){const r=this.raw(id);requireValue(r&&(deleted||!r.deleted)&&this.level(a,r.section,r)>0,404,'Item not found.');return r;}
 publicRecord(a,r){
  const data=parse(r.data);
  for(const k of references)if(data[k]&&!this.readable(a,this.raw(data[k])))delete data[k];
  for(const k of arrayReferences)if(Array.isArray(data[k]))data[k]=data[k].filter(id=>this.readable(a,this.raw(id)));
  if(r.kind==='media')delete data.key;
  const out={...r,title:r.kind==='relation'&&(!data.from||!data.to)?'Relationship details not shared':r.title,data,parentId:r.parent_id,canEdit:this.editable(a,r),canContribute:this.level(a,r.section,r)>=2,locked:this.locked(r)};delete out.parent_id;
  out.favourite=Boolean(this.one('SELECT 1 FROM favourites WHERE record_id=? AND user_id=?',r.id,a.id));
  if(['poll','idea','adventure'].includes(r.kind))out.votes=this.rows('SELECT user_id,choice FROM votes WHERE record_id=?',r.id);
  if(r.kind==='review')out.meaning=data.overall===6?'I want to fuck you':data.overall===5?'I want to kiss you':'';
  return out;
 }
 snapshot(r,actor){this.sql.exec('INSERT INTO history(id,revision,snapshot,actor,at) VALUES(?,?,?,?,?)',r.id,r.revision,JSON.stringify(r),actor,now());}
 event(r,action,actor){this.sql.exec('INSERT INTO events(record_id,section,action,actor,at) VALUES(?,?,?,?,?)',r.id,r.section,action,actor,now());}
 locked(r){if(!r)return false;if(r.kind==='week')return Boolean(this.one('SELECT 1 FROM weeks WHERE record_id=?',r.id));if(r.kind==='meal'){const data=parse(r.data);return Boolean(this.one('SELECT 1 FROM weeks WHERE record_id=?',data.weekId||r.parent_id));}return false;}
 validate(a,p,existing){
  requireValue(kinds[p.kind]?.includes(p.section),400,'Unknown section or item type.');
  const title=bounded(p.title,160);requireValue(title.length>0,400,'A name or title is required.');
  requireValue(p.data&&typeof p.data==='object'&&!Array.isArray(p.data),400,'Item details are required.');
  requireValue(JSON.stringify(p.data).length<=24000,400,'This item is too large.');
  const d=structuredClone(p.data);
  for(const k of ['notes','description','comment','story','ingredients','method'])if(d[k]!=null)d[k]=bounded(d[k],8000);
  for(const k of references)if(d[k])requireValue(typeof d[k]==='string',400,'Invalid reference.');
  for(const k of arrayReferences)if(d[k])requireValue(Array.isArray(d[k])&&d[k].length<=60&&d[k].every(x=>typeof x==='string'),400,'Invalid photo or related-item list.');
  for(const id of refs(d)){const ref=this.raw(id);requireValue(ref&&!ref.deleted,400,'A linked item no longer exists.');requireValue(this.readable(a,ref),403,'A linked item is private.');}
  if(p.parentId){const parent=this.raw(p.parentId);requireValue(parent&&!parent.deleted&&parent.section===p.section,400,'Invalid parent item.');requireValue(this.readable(a,parent),403,'Parent item is private.');let cursor=parent,seen=new Set([existing?.id]);while(cursor){requireValue(!seen.has(cursor.id),400,'Items cannot contain themselves.');seen.add(cursor.id);cursor=cursor.parent_id?this.raw(cursor.parent_id):null;}}
  if(p.kind==='relation'){
   requireValue(d.from&&d.to&&d.from!==d.to,400,'Choose two different people.');requireValue(['parent','adoptive-parent','step-parent','partner','sibling'].includes(d.type),400,'Choose a relationship.');
   for(const x of [d.from,d.to])requireValue(this.raw(x)?.kind==='person',400,'Relationships must link people.');
   if(parents.includes(d.type)){const links=this.rows("SELECT id,data FROM records WHERE kind='relation' AND deleted=0").filter(r=>r.id!==existing?.id).map(r=>parse(r.data)).filter(r=>parents.includes(r.type));const stack=[d.to],seen=new Set();while(stack.length){const x=stack.pop();requireValue(x!==d.from,400,'That relationship would create an ancestry loop.');if(seen.has(x))continue;seen.add(x);stack.push(...links.filter(l=>l.from===x).map(l=>l.to));}}
  }
  if(p.kind==='week'){const day=date(d.startDate);requireValue(day.getUTCDay()===1,400,'A menu week starts on Monday.');d.status='draft';const duplicate=this.rows("SELECT id,data FROM records WHERE kind='week' AND deleted=0").find(r=>r.id!==existing?.id&&parse(r.data).startDate===d.startDate);requireValue(!duplicate,409,'That week already exists.');}
  if(p.kind==='meal'){const week=this.raw(d.weekId);requireValue(week?.kind==='week',400,'Choose a draft week.');requireValue(!this.locked(week),409,'Published menus are preserved. Copy this week to make changes.');const start=date(parse(week.data).startDate),served=date(d.date);requireValue(served>=start&&served<new Date(start.getTime()+7*86400000),400,'Choose a day in this week.');requireValue(['breakfast','lunch','dinner','other'].includes(d.mealType),400,'Choose a meal type.');}
  if(p.kind==='review'){requireValue(this.core(a),403,'Meal reviews are private to the original couple.');requireValue(this.raw(d.mealId)?.kind==='meal',400,'Choose a meal serving.');for(const [k,max] of [['overall',6],['taste',5],['plating',5]])requireValue(Number.isInteger(d[k])&&d[k]>=1&&d[k]<=max,400,'Choose valid overall, taste and plating ratings.');requireValue((d.photos||[]).length<=4,400,'Maximum four review photos.');const duplicate=this.rows("SELECT id,data FROM records WHERE kind='review' AND creator=? AND deleted=0",a.id).find(r=>r.id!==existing?.id&&parse(r.data).mealId===d.mealId);requireValue(!duplicate,409,'You already reviewed this serving. Edit the existing review.');}
  if(p.kind==='poll'){requireValue(Array.isArray(d.options)&&d.options.length>=2&&d.options.length<=10&&d.options.every(x=>typeof x==='string'&&x.length<=120),400,'Add between two and ten choices.');}
  if(p.kind==='media'){requireValue(this.core(a)||this.level(a,p.section)>=2,403,'Upload permission required.');requireValue(typeof d.key==='string'&&d.key.startsWith('portal/')&&!d.key.includes('..'),400,'Invalid private upload.');requireValue(['image/jpeg','image/png','image/webp','image/gif'].includes(d.mime),400,'Unsupported image type.');requireValue(Number.isInteger(d.size)&&d.size>0&&d.size<=8388608,400,'Image must be at most 8 MB.');}
  if(d.crop){requireValue(typeof d.crop==='object',400,'Invalid crop.');d.crop={x:Math.min(100,Math.max(0,Number(d.crop.x)||0)),y:Math.min(100,Math.max(0,Number(d.crop.y)||0))};}
  return {title,data:d};
 }
 put(a,p){
  const old=p.id?this.raw(p.id):null;
  if(p.id)requireValue(old,404,'Item not found.');
  const parent=p.parentId?this.raw(p.parentId):null;
  if(old){requireValue(!old.deleted&&this.editable(a,old),403,'You cannot edit this item.');requireValue(old.kind===p.kind&&old.section===p.section,400,'An item cannot change section or type.');requireValue(p.revision===old.revision,409,'This item changed on another device. Reload before saving.');requireValue(!this.locked(old),409,'Published menus cannot be overwritten.');}
  else requireValue(this.level(a,p.section,parent)>=2&&!(p.kind==='review'&&!this.core(a)),403,'You do not have permission to add here.');
  const v=this.validate(a,p,old),t=now(),r={id:old?.id||uid(),section:p.section,kind:p.kind,title:v.title,data:JSON.stringify(v.data),parent_id:p.parentId||null,creator:old?.creator||a.id,revision:(old?.revision||0)+1,deleted:0,created_at:old?.created_at||t,updated_at:t};
  this.sql.exec('INSERT INTO records(id,section,kind,title,data,parent_id,creator,revision,deleted,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,data=excluded.data,parent_id=excluded.parent_id,revision=excluded.revision,updated_at=excluded.updated_at',r.id,r.section,r.kind,r.title,r.data,r.parent_id,r.creator,r.revision,0,r.created_at,t);
  this.snapshot(r,a.id);this.event(r,old?'edited':'added',a.id);
  return {record:this.publicRecord(a,r),status:old?200:201};
 }
 run(cmd,p,a){
  if(cmd==='boot'){
   requireValue(a?.active,403,'Sign in first.');const old=this.principals();
   requireValue(p.ownerId&&p.companionId&&p.ownerId!==p.companionId,503,'Original owner and companion could not be verified.');
   if(old)requireValue(old.ownerId===p.ownerId&&old.companionId===p.companionId,409,'The original workspace owners cannot be replaced.');
   else{requireValue(a.id===p.ownerId||a.id===p.companionId,403,'An original account must initialise the workspace.');this.sql.exec("INSERT INTO meta(key,value) VALUES('principals',?)",JSON.stringify({ownerId:p.ownerId,companionId:p.companionId}));}
   return {ok:true};
  }
  if(cmd==='publicAppearance')return {appearance:parse(this.one("SELECT value FROM meta WHERE key='appearance'")?.value||'{}')};
  if(cmd==='publicWeeks')return {weeks:this.rows('SELECT start,snapshot FROM weeks ORDER BY start DESC').map(x=>{const w=parse(x.snapshot);return {startDate:x.start,title:w.title,mealCount:w.meals.length};})};
  if(cmd==='publicWeek'){const r=p.startDate?this.one('SELECT snapshot FROM weeks WHERE start=?',p.startDate):this.one('SELECT snapshot FROM weeks ORDER BY start DESC LIMIT 1');requireValue(r,404,'No published menu yet.');return {week:published(parse(r.snapshot))};}
  // These internal-only methods are deliberately not mapped to arbitrary HTTP commands.
  if(cmd==='lookupEmail'){return {email:this.one('SELECT * FROM emails WHERE email=?',String(p.email).toLowerCase())};}
  if(cmd==='rate'){const key=bounded(p.key,200),window=Math.min(3600000,Number(p.window)||600000),limit=Math.min(100,Number(p.limit)||5),t=Date.now(),r=this.one('SELECT * FROM throttle WHERE key=?',key);if(!r||t-r.started>window){this.sql.exec('INSERT INTO throttle(key,started,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET started=excluded.started,count=1',key,t);return {ok:true};}requireValue(r.count<limit,429,'Too many attempts. Try again later.');this.sql.exec('UPDATE throttle SET count=count+1 WHERE key=?',key);return {ok:true};}
  if(cmd==='issueChallenge'){requireValue(['invite','reset','verify'].includes(p.purpose),400,'Invalid request.');this.sql.exec('UPDATE challenges SET used=1 WHERE user_id=? AND purpose=?',p.userId,p.purpose);this.sql.exec('INSERT INTO challenges(hash,purpose,user_id,email,fingerprint,expires) VALUES(?,?,?,?,?,?)',p.hash,p.purpose,p.userId,p.email||null,p.fingerprint||null,p.expires);return {ok:true};}
  if(cmd==='consumeChallenge'){const r=this.one('SELECT * FROM challenges WHERE hash=? AND purpose=? AND used=0 AND expires>?',p.hash,p.purpose,Date.now());requireValue(r,400,'This link is invalid, expired or already used.');this.sql.exec('UPDATE challenges SET used=1 WHERE hash=? AND used=0',p.hash);return {challenge:r};}
  if(cmd==='revokeChallenges'){this.sql.exec('UPDATE challenges SET used=1 WHERE user_id=?',p.userId);return {ok:true};}
  if(cmd==='bindEmail'){requireValue(typeof p.email==='string'&&p.userId,400,'Invalid email binding.');const other=this.one('SELECT user_id FROM emails WHERE email=?',p.email.toLowerCase());requireValue(!other||other.user_id===p.userId,409,'That email is already linked to an account.');this.sql.exec('INSERT INTO emails(user_id,email,verified) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified=excluded.verified',p.userId,p.email.toLowerCase(),p.verified?1:0);return {ok:true};}
  if(cmd==='forgetUser'){this.sql.exec('DELETE FROM grants WHERE user_id=?',p.userId);this.sql.exec('DELETE FROM emails WHERE user_id=?',p.userId);this.sql.exec('DELETE FROM preferences WHERE user_id=?',p.userId);this.sql.exec('UPDATE challenges SET used=1 WHERE user_id=?',p.userId);return {ok:true};}
  this.auth(a);
  if(cmd==='session'){return {version:VERSION,imported:Boolean(this.one("SELECT value FROM meta WHERE key='seeded'")),permissions:{isOwner:this.owner(a),isCore:this.core(a),sections:Object.fromEntries(sections.map(s=>[s,this.level(a,s)|| (this.rows("SELECT g.level FROM grants g JOIN records r ON g.scope='record:'||r.id WHERE g.user_id=? AND r.section=? AND g.level>0",a.id,s).length?1:0)]))},ratingLabels:this.core(a)?{5:'I want to kiss you',6:'I want to fuck you'}:{},grants:this.rows('SELECT scope,level FROM grants WHERE user_id=?',a.id),email:this.one('SELECT email,verified FROM emails WHERE user_id=?',a.id),preferences:parse(this.one('SELECT data FROM preferences WHERE user_id=?',a.id)?.data||'{}')};}
  if(cmd==='appearance'){requireValue(this.owner(a),403,'Only the owner can change the public site.');requireValue(Object.keys(p).every(k=>['headline','intro','theme'].includes(k)),400,'Unknown public setting.');const d={headline:bounded(p.headline||'',100),intro:bounded(p.intro||'',400),theme:p.theme||'pastel'};requireValue(['pastel','bold','dark'].includes(d.theme),400,'Choose a theme.');this.sql.exec("INSERT INTO meta(key,value) VALUES('appearance',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify(d));return {appearance:d};}
  if(cmd==='grant'){
   requireValue(this.owner(a),403,'Only the owner can manage access.');requireValue(p.userId&&!['ownerId','companionId'].some(k=>this.principals()[k]===p.userId),400,'Core access cannot be changed here.');
   requireValue(Number.isInteger(p.level)&&p.level>=0&&p.level<=3,400,'Choose a valid permission.');
   if(p.scope?.startsWith('record:')){const r=this.raw(p.scope.slice(7));requireValue(r&&shared.includes(r.section)&&r.kind!=='review'&&!(r.section==='menus'&&r.kind==='media')&&!(r.kind==='comment'&&this.raw(r.parent_id)?.kind==='review'),400,'That record cannot be shared.');}else requireValue(shared.includes(p.scope),400,'This section stays private to the couple.');
   this.sql.exec('INSERT INTO grants(user_id,scope,level) VALUES(?,?,?) ON CONFLICT(user_id,scope) DO UPDATE SET level=excluded.level',p.userId,p.scope,p.level);return {ok:true};
  }
  if(cmd==='grants'){requireValue(this.owner(a),403,'Owner access required.');return {grants:this.rows('SELECT * FROM grants ORDER BY user_id,scope'),principals:this.principals()};}
  if(cmd==='importEmail'){requireValue(this.core(a),403,'Core access required.');if(!this.one('SELECT user_id FROM emails WHERE user_id=?',p.userId))this.sql.exec('INSERT OR IGNORE INTO emails(user_id,email,verified) VALUES(?,?,0)',p.userId,p.email);return {ok:true};}
  if(cmd==='put')return this.put(a,p);
  if(cmd==='get'){const r=this.record(a,p.id);return {record:this.publicRecord(a,r)};}
  if(cmd==='media'){const r=this.record(a,p.id,Boolean(p.includeDeleted&&this.owner(a)));requireValue(r.kind==='media',404,'Image not found.');return {media:parse(r.data)};}
  if(cmd==='list'||cmd==='search'){
   if(cmd==='list')requireValue(sections.includes(p.section)&&(this.level(a,p.section)>0||this.rows("SELECT g.scope FROM grants g JOIN records r ON g.scope='record:'||r.id WHERE g.user_id=? AND r.section=? AND g.level>0",a.id,p.section).length),403,'You do not have access to this section.');
   let q='SELECT * FROM records WHERE '+(p.deleted?'deleted=1':'deleted=0'),bind=[];
   if(p.section){q+=' AND section=?';bind.push(p.section);}if(p.kind){q+=' AND kind=?';bind.push(p.kind);}if(p.parentId){q+=' AND parent_id=?';bind.push(p.parentId);}if(p.query){q+=" AND (title LIKE ? ESCAPE '\\' OR data LIKE ? ESCAPE '\\')";const term='%'+String(p.query).replace(/[\\%_]/g,'\\$&')+'%';bind.push(term,term);}
   const allowed=this.rows(q+' ORDER BY updated_at DESC,id',...bind).filter(r=>this.level(a,r.section,r)>=1&&(!p.deleted||this.editable(a,r))).filter(r=>!p.favourites||this.one('SELECT 1 FROM favourites WHERE record_id=? AND user_id=?',r.id,a.id));
   const offset=Math.max(0,Math.floor(Number(p.offset)||0)),limit=100;
   return {records:allowed.slice(offset,offset+limit).map(r=>this.publicRecord(a,r)),nextOffset:offset+limit<allowed.length?offset+limit:null,total:allowed.length};
  }
  if(cmd==='delete'||cmd==='restore'){
   const r=this.record(a,p.id,cmd==='restore');requireValue(this.editable(a,r),403,'Edit permission required.');requireValue(p.revision===r.revision,409,'This item changed. Reload before continuing.');requireValue(!this.locked(r),409,'Published menus must be preserved.');
   if(cmd==='delete'&&r.kind==='media')requireValue(!this.rows('SELECT id,data FROM records WHERE deleted=0 AND id<>?',r.id).some(x=>refs(parse(x.data)).includes(r.id))&&!this.rows('SELECT data FROM preferences').some(x=>Object.values(parse(x.data)).includes(r.id)),409,'This image is still used. Remove it from its pages and covers first.');
   if(cmd==='delete'&&r.kind==='album')requireValue(!this.one('SELECT id FROM records WHERE parent_id=? AND deleted=0',r.id),409,'Move the memories out of this album first.');
   r.deleted=cmd==='delete'?1:0;r.revision++;r.updated_at=now();this.sql.exec('UPDATE records SET deleted=?,revision=?,updated_at=? WHERE id=?',r.deleted,r.revision,r.updated_at,r.id);this.snapshot(r,a.id);this.event(r,cmd,a.id);return {ok:true,revision:r.revision};
  }
  if(cmd==='history'){const r=this.record(a,p.id,true);requireValue(this.editable(a,r),403,'Edit permission required.');return {history:this.rows('SELECT revision,snapshot,actor,at FROM history WHERE id=? ORDER BY revision DESC',r.id).map(x=>({...x,snapshot:this.publicRecord(a,parse(x.snapshot))}))};}
  if(cmd==='vote'){const r=this.record(a,p.id);requireValue(['poll','idea','adventure'].includes(r.kind),400,'This item cannot be voted on.');const choices=r.kind==='poll'?parse(r.data).options:['Yes','Maybe','Not this week'];requireValue(choices.includes(p.choice),400,'Choose an available option.');this.sql.exec('INSERT INTO votes(record_id,user_id,choice) VALUES(?,?,?) ON CONFLICT(record_id,user_id) DO UPDATE SET choice=excluded.choice',r.id,a.id,p.choice);return {ok:true};}
  if(cmd==='favourite'){this.record(a,p.id);if(p.value)this.sql.exec('INSERT OR IGNORE INTO favourites(record_id,user_id) VALUES(?,?)',p.id,a.id);else this.sql.exec('DELETE FROM favourites WHERE record_id=? AND user_id=?',p.id,a.id);return {ok:true};}
  if(cmd==='preferences'){const permitted=['theme','language','notifications','coverId','profileImageId','readAt','favouriteGames'];const old=parse(this.one('SELECT data FROM preferences WHERE user_id=?',a.id)?.data||'{}');for(const k of Object.keys(p)){requireValue(permitted.includes(k),400,'Unknown preference.');if(k.endsWith('Id')&&p[k])requireValue(this.record(a,p[k]).kind==='media',400,'Choose an image.');if(k==='favouriteGames')requireValue(Array.isArray(p[k])&&p[k].length<=30&&p[k].every(x=>typeof x==='string'&&/^[a-z0-9-]{1,60}$/.test(x)),400,'Invalid game favourites.');old[k]=p[k];}requireValue(JSON.stringify(old).length<3000,400,'Preferences are too large.');this.sql.exec('INSERT INTO preferences(user_id,data) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data',a.id,JSON.stringify(old));return {preferences:old};}
  if(cmd==='activity'){return {events:this.rows('SELECT * FROM events ORDER BY seq DESC').filter(e=>{const r=this.raw(e.record_id);return r&&this.level(a,r.section,r)>0;}).slice(0,100).map(e=>({...e,title:this.raw(e.record_id)?.title||'Item'}))};}
  if(cmd==='copyWeek'){
   const source=this.record(a,p.id);requireValue(source.kind==='week'&&this.level(a,'menus')>=2,403,'Menu contribution permission required.');
   const start=date(p.startDate),oldStart=date(parse(source.data).startDate),shift=start-oldStart;
   const created=this.put(a,{section:'menus',kind:'week',title:'Week commencing '+p.startDate,data:{startDate:p.startDate,status:'draft'}});
   for(const m of this.rows("SELECT * FROM records WHERE kind='meal' AND parent_id=? AND deleted=0",source.id)){const d=parse(m.data);d.weekId=created.record.id;d.date=new Date(date(d.date).getTime()+shift).toISOString().slice(0,10);d.served=false;this.put(a,{section:'menus',kind:'meal',title:m.title,parentId:created.record.id,data:d});}
   return created;
  }
  if(cmd==='publish'){
   requireValue(this.owner(a),403,'Only the owner can publish a public menu.');const w=this.record(a,p.id);requireValue(w.kind==='week'&&p.revision===w.revision,409,'Reload the draft before publishing.');requireValue(!this.locked(w),409,'This week has already been published.');const startDate=parse(w.data).startDate;
   const meals=this.rows("SELECT * FROM records WHERE kind='meal' AND parent_id=? AND deleted=0",w.id).map(m=>{const d=parse(m.data);return {id:m.id,title:m.title,date:d.date,mealType:d.mealType,description:String(d.description||''),served:Boolean(d.served)};}).sort((x,y)=>x.date.localeCompare(y.date));requireValue(meals.length,400,'Add at least one meal.');
   const snapshot={startDate,title:w.title,meals,publishedAt:now()};this.sql.exec('INSERT INTO weeks(start,record_id,snapshot,at) VALUES(?,?,?,?)',startDate,w.id,JSON.stringify(snapshot),now());w.revision++;const d=parse(w.data);d.status='published';w.data=JSON.stringify(d);w.updated_at=now();this.sql.exec('UPDATE records SET data=?,revision=?,updated_at=? WHERE id=?',w.data,w.revision,w.updated_at,w.id);this.snapshot(w,a.id);this.event(w,'published',a.id);return {ok:true,week:snapshot};
  }
  if(cmd==='export'){requireValue(this.owner(a),403,'Only the owner can export the full private workspace.');return {backup:{version:7,exportedAt:now(),records:this.rows('SELECT * FROM records ORDER BY created_at,id').map(r=>({...r,data:parse(r.data)})),history:this.rows('SELECT * FROM history ORDER BY id,revision'),restoredHistory:this.rows('SELECT * FROM restored_history ORDER BY import_id,record_id,original_revision'),weeks:this.rows('SELECT * FROM weeks ORDER BY start'),votes:this.rows('SELECT * FROM votes')}};}
  if(cmd==='import'){
   requireValue(this.owner(a),403,'Only the owner can restore a backup.');const b=p.backup;requireValue(b?.version===7&&Array.isArray(b.records)&&Array.isArray(b.weeks)&&b.records.length<=20000,400,'Invalid Duck & Bear backup.');
   const known=new Set([...this.rows('SELECT id FROM records').map(x=>x.id),...b.records.map(x=>x.id)]);
   for(const r of b.records){requireValue(typeof r.id==='string'&&r.id.length<=100&&kinds[r.kind]?.includes(r.section)&&typeof r.title==='string'&&r.data&&typeof r.data==='object',400,'Invalid record in backup.');requireValue(JSON.stringify(r.data).length<=24000,400,'Oversized record.');for(const id of refs(r.data))requireValue(known.has(id),400,'Backup contains missing links.');if(r.parent_id)requireValue(known.has(r.parent_id),400,'Backup parent is missing.');const old=this.raw(r.id);if(old&&!p.preview){requireValue(p.revisions?.[r.id]===old.revision,409,'Workspace changed after backup review.');requireValue(!this.locked(old)||JSON.stringify(parse(old.data))===JSON.stringify(r.data),409,'Restore cannot rewrite a published menu.');}}
   for(const w of b.weeks){const snapshot=parse(w.snapshot);requireValue(known.has(w.record_id)&&snapshot.startDate===w.start&&Array.isArray(snapshot.meals),400,'Invalid archived week or missing week record.');date(w.start);}
   if(p.preview)return {preview:{newRecords:b.records.filter(r=>!this.raw(r.id)).length,existing:b.records.filter(r=>this.raw(r.id)).length,revisions:Object.fromEntries(b.records.flatMap(r=>{const x=this.raw(r.id);return x?[[x.id,x.revision]]:[];}))}};
   for(const x of b.records){const old=this.raw(x.id);if(old&&this.locked(old))continue;const r={id:x.id,section:x.section,kind:x.kind,title:bounded(x.title,160),data:JSON.stringify(x.data),parent_id:x.parent_id||null,creator:old?.creator||(typeof x.creator==='string'?x.creator:a.id),revision:(old?.revision||0)+1,deleted:x.deleted?1:0,created_at:old?.created_at||x.created_at||now(),updated_at:now()};this.sql.exec('INSERT INTO records(id,section,kind,title,data,parent_id,creator,revision,deleted,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,data=excluded.data,parent_id=excluded.parent_id,revision=excluded.revision,deleted=excluded.deleted,updated_at=excluded.updated_at',r.id,r.section,r.kind,r.title,r.data,r.parent_id,r.creator,r.revision,r.deleted,r.created_at,r.updated_at);this.snapshot(r,a.id);this.event(r,'restored from backup',a.id);}
   const importId=uid();for(const h of [...(b.history||[]),...(b.restoredHistory||[])]){const id=h.id||h.record_id;requireValue(known.has(id)&&Number.isInteger(h.revision||h.original_revision),400,'Invalid restored history.');const snapshot=parse(h.snapshot);requireValue(snapshot.id===id&&JSON.stringify(snapshot).length<=30000,400,'Invalid historical record.');this.sql.exec('INSERT INTO restored_history(import_id,record_id,original_revision,snapshot,actor,at) VALUES(?,?,?,?,?,?)',importId,id,h.revision||h.original_revision,JSON.stringify(snapshot),String(h.actor||'Imported'),String(h.at||now()));}
   for(const w of b.weeks)if(!this.one('SELECT 1 FROM weeks WHERE start=?',w.start)){const data=parse(w.snapshot);requireValue(data.startDate===w.start&&Array.isArray(data.meals),400,'Invalid menu snapshot.');this.sql.exec('INSERT INTO weeks(start,record_id,snapshot,at) VALUES(?,?,?,?)',w.start,w.record_id,JSON.stringify(published(data)),now());}
   return {ok:true};
  }
  if(cmd==='seed'){
   requireValue(this.core(a),403,'Core access required.');if(this.one("SELECT value FROM meta WHERE key='seeded'"))return {ok:true};
   for(const x of p.records||[]){if(this.raw(x.id))continue;const r={...x,data:JSON.stringify(x.data),parent_id:x.parentId||null,creator:x.creator||this.principals().ownerId,revision:1,deleted:0,created_at:x.created_at||now(),updated_at:now()};this.sql.exec('INSERT INTO records(id,section,kind,title,data,parent_id,creator,revision,deleted,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',r.id,r.section,r.kind,r.title,r.data,r.parent_id,r.creator,1,0,r.created_at,r.updated_at);this.snapshot(r,a.id);}
   for(const w of p.weeks||[])this.sql.exec('INSERT OR IGNORE INTO weeks(start,record_id,snapshot,at) VALUES(?,?,?,?)',w.startDate,w.id,JSON.stringify(w),now());
   this.sql.exec("INSERT INTO meta(key,value) VALUES('seeded','1')");return {ok:true};
  }
  throw new Fault(404,'Not found.');
 }
 async fetch(request){
  try{const {cmd,payload={},actor=null}=await request.json();const result=this.transaction(()=>this.run(cmd,payload,actor));const status=result.status||200;delete result.status;return json(result,status);}catch(e){if(e instanceof Fault)return json({error:e.message},e.status);if(String(e.message).includes('UNIQUE constraint'))return json({error:'That item already exists.'},409);console.error('Portal database error',e);return json({error:'The workspace could not complete this request. Your saved data has not been replaced.'},500);}
 }
}
