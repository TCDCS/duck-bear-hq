/** Additive, idempotent import of the deployed 6.1 Home. Source tables and R2 objects are never mutated. */
import {fail,now,queryAll,sha} from './core.mjs';
import {permission} from './schema.mjs';
const MARKER='private-home-imported-v1';
const mapped=(kind,id)=>`home-${kind}-${id}`;
const photo=assetId=>({assetId,caption:'',x:50,y:50,zoom:1});
export async function importPrivateHome(env,user){
 if(!(await permission(env,user,'intimate')).pair)return;
 if(await env.DB.prepare('SELECT 1 AS ok FROM hq_meta WHERE key=?').bind(MARKER).first())return;
 const names=new Set((await queryAll(env.DB,"SELECT name FROM sqlite_master WHERE type='table'")).map(x=>x.name));
 if(!names.has('family_people')){await env.DB.prepare('INSERT OR IGNORE INTO hq_meta VALUES(?,?)').bind(MARKER,now()).run();return;}
 for(const name of ['family_relations','scrapbook_items','menu_library','weekly_menus','weekly_menu_items','hub_permissions'])if(!names.has(name))fail(503,'Private Home storage is incomplete. Its original records have not been changed.','home_import');
 const pair=await env.DB.prepare("SELECT user_id FROM hq_pair WHERE role='owner'").first();
 const users=new Set((await queryAll(env.DB,'SELECT id FROM users')).map(x=>x.id));
 const actor=id=>users.has(id)?id:pair.user_id;
 const steps=[];
 function record(id,kind,section,parentId,source,data,deletedAt=null){
  steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_records(id,kind,section,parent_id,creator_id,updated_by,revision,data,created_at,updated_at,deleted_at) VALUES(?,?,?,?,?,?,1,?,?,?,?)').bind(id,kind,section,parentId,actor(source.created_by),actor(source.created_by),JSON.stringify(data),source.created_at||now(),source.updated_at||source.created_at||now(),deletedAt));
 }
 async function asset(source,section,key=source.media_key,name=source.media_name,type=source.media_type){
  if(!key)return null;
  const existing=await env.DB.prepare('SELECT id,section FROM hq_assets WHERE original_key=?').bind(key).first();
  if(existing){if(existing.section!==section)fail(503,'An existing attachment needs an owner privacy review.','home_import');return existing.id;}
  const obj=await env.MEDIA.get(key);if(!obj)fail(503,'A saved Home attachment is missing. Original records have been preserved; owner review is needed.','home_import');
  const bytes=new Uint8Array(await obj.arrayBuffer()),id='home-asset-'+(await sha(key)).slice(0,24);
  steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_assets(id,section,creator_id,name,type,size,original_key,preview_key,sha256,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,section,actor(source.created_by),name||'Home attachment',obj.httpMetadata?.contentType||type||'application/octet-stream',bytes.length,key,key,await sha(bytes),source.created_at||now()));
  return id;
 }
 const people=await queryAll(env.DB,'SELECT * FROM family_people ORDER BY created_at,id');
 for(const p of people){const aid=await asset(p,'family',p.photo_key,p.photo_name,p.photo_type);record(mapped('person',p.id),'person','family',null,p,{name:p.name,alternateName:'',birth:p.birth_date||'',death:'',birthPlace:'',relationLabel:p.relation_label||'',branch:p.branch||'',notes:p.notes||'',confidence:'unknown',photos:aid?[photo(aid)]:[],coverId:aid||''});}
 const personIds=new Set(people.map(p=>p.id));
 for(const r of await queryAll(env.DB,'SELECT * FROM family_relations ORDER BY created_at,id')){
  if(!personIds.has(r.person_a_id)||!personIds.has(r.person_b_id))fail(503,'A saved family relationship refers to a missing person. Original records have been preserved.','home_import');
  record(mapped('relationship',r.id),'relationship','family',null,r,{from:mapped('person',r.person_a_id),to:mapped('person',r.person_b_id),type:['parent','partner','sibling','other'].includes(r.relation_type)?r.relation_type:'other',note:[r.label,r.relation_type==='relative'?'Relative':''].filter(Boolean).join(' — ')});
 }
 const memories=await queryAll(env.DB,'SELECT * FROM scrapbook_items ORDER BY created_at,id');
 if(memories.length)record('home-scrapbook','album','scrapbook',null,{created_by:pair.user_id},{title:'Our Home memories',description:'Preserved from the original private Home.',date:'',coverId:'',layout:'notebook'});
 for(const m of memories){const aid=await asset(m,'scrapbook'),image=String(m.media_type).startsWith('image/');record(mapped('memory',m.id),'memory','scrapbook','home-scrapbook',m,{title:m.title,text:m.body||'',date:m.happened_on||'',albumId:'home-scrapbook',planId:'',status:'saved',layout:'notebook',photos:aid&&image?[photo(aid)]:[],coverId:aid&&image?aid:'',attachmentId:aid&&!image?aid:'',stickers:m.mood?[m.mood]:[]});}
 const ideas=await queryAll(env.DB,'SELECT * FROM menu_library ORDER BY created_at,id'),ideaMap=new Map(ideas.map(m=>[m.id,m]));
 for(const m of ideas){let tags;try{tags=JSON.parse(m.tags_json||'[]');}catch{fail(503,'Saved meal tags need owner review. Nothing has been overwritten.','home_import');}if(!Array.isArray(tags))fail(503,'Saved meal tags need owner review.','home_import');const aid=await asset(m,'menus'),image=String(m.media_type).startsWith('image/');record(mapped('idea',m.id),'idea','menus',null,m,{title:m.title,description:m.description||'',course:'dinner',cuisine:m.cuisine||'',tags,minutes:30,servings:2,ingredients:[],instructions:'',link:'',week:'',status:'suggested',photos:aid&&image?[photo(aid)]:[],coverId:aid&&image?aid:'',attachmentId:aid&&!image?aid:''},m.active?null:m.updated_at||now());}
 const weeks=await queryAll(env.DB,'SELECT * FROM weekly_menus ORDER BY week_start,id');
 const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 for(const w of weeks){
  const start=new Date(w.week_start+'T00:00:00Z');if(!Number.isFinite(start.getTime())||start.getUTCDay()!==1||start.toISOString().slice(0,10)!==w.week_start)fail(503,'A saved weekly menu needs a valid Monday date. Original records have been preserved.','home_import');
  const wid=mapped('week',w.id);record(wid,'week','menus',null,w,{start:w.week_start,title:w.title||'Our weekly menu',notes:w.notes||'',status:'draft',snapshot:null});
  for(const s of await queryAll(env.DB,'SELECT * FROM weekly_menu_items WHERE week_id=? ORDER BY sort_order,id',w.id)){
   const offset=days.indexOf(s.day_key);if(offset<0)fail(503,'A saved meal has an unrecognised day.','home_import');const idea=ideaMap.get(s.menu_item_id),course=String(s.meal_slot).toLowerCase();
   record(mapped('serving',s.id),'serving','menus',wid,{...s,created_by:w.created_by},{weekId:wid,date:new Date(start.getTime()+offset*86400000).toISOString().slice(0,10),course:['breakfast','lunch','dinner'].includes(course)?course:'other',title:s.custom_title||idea?.title||'Saved meal',description:[idea?.description,s.notes,!['breakfast','lunch','dinner'].includes(course)?s.meal_slot:''].filter(Boolean).join('\n\n'),recipeId:idea?.active?mapped('idea',idea.id):'',ingredients:[],ingredientsConfirmed:false,served:false,photos:[],order:Math.min(100,Math.max(0,s.sort_order||0))});
  }
 }
 // The 6.1 schema bootstrap granted everyone access. Only carry deliberate owner-issued grants.
 const grants=await queryAll(env.DB,"SELECT p.* FROM hub_permissions p WHERE EXISTS(SELECT 1 FROM audit_log a WHERE a.action='hub.permissions_update' AND a.entity_id=p.user_id AND a.actor_user_id=?)",pair.user_id);
 for(const g of grants)for(const [section,level] of [['family',g.family_tree_level],['menus',g.menus_level]])if(['read','contribute','admin'].includes(level))steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_grants(user_id,section,role,can_export,updated_by,updated_at) VALUES(?,?,?,0,?,?)').bind(g.user_id,section,level==='admin'?'edit':level,pair.user_id,g.updated_at));
 steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_meta VALUES(?,?)').bind(MARKER,now()));
 try{await env.DB.batch(steps);}catch(e){if(/family_cycle/.test(String(e)))fail(503,'The earlier family tree contains a parent loop. Original records are safe; owner review is required.','home_import');throw e;}
}
