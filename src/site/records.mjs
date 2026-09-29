import {fail,json,body,text,required,date,revision,newId,now,requireSection,assertMedia,record,audit} from './core.mjs';
const TYPES=['breakfast','lunch','dinner','other'];
const CONFIG={recipes:{section:'menus',kind:'recipe'},weeks:{section:'menus',kind:'week'},people:{section:'family',kind:'person'},scrapbook:{section:'scrapbook',kind:'memory'}};
function boolean(value,fallback=false){if(value===undefined)return fallback;if(typeof value!=='boolean')fail(400,'Use true or false.');return value;}
async function validate(env,kind,b){
 const data={};
 if(kind==='person'){
  data.name=required(b.name,100,'Name');data.birthDate=date(b.birthDate,{optional:true});data.deathDate=date(b.deathDate,{optional:true});
  if(data.birthDate&&data.deathDate&&data.birthDate>data.deathDate)fail(400,'A death date cannot be before the birth date.');
  data.notes=text(b.notes,6000);data.mediaId=await assertMedia(env,b.mediaId,'family');return {title:data.name,data};
 }
 data.title=required(b.title,140,'Title');
 if(kind==='recipe'){
  data.description=text(b.description,2000);data.ingredients=text(b.ingredients,4000);data.type=b.type||'dinner';if(!TYPES.includes(data.type))fail(400,'Choose a meal type.');
  data.archived=boolean(b.archived);data.mediaId=await assertMedia(env,b.mediaId,'menus');
 }else if(kind==='week'){
  data.weekStart=date(b.weekStart,{monday:true});data.status=b.status||'draft';if(!['draft','published'].includes(data.status))fail(400,'Choose draft or published.');data.notes=text(b.notes,4000);
  const items=b.items??[];if(!Array.isArray(items)||items.length>28)fail(400,'Use no more than 28 meal slots per week.');const seen=new Set();data.items=[];
  for(const item of items){
   if(!item||typeof item!=='object'||!Number.isInteger(item.day)||item.day<0||item.day>6||!TYPES.includes(item.type))fail(400,'Choose a valid day and meal type.');
   const slot=item.day+':'+item.type;if(seen.has(slot))fail(400,'Each day and meal type can only appear once.');seen.add(slot);
   const title=required(item.title,140,'Meal name');let recipeId=null;
   if(item.recipeId){const recipe=await env.DB.prepare("SELECT id FROM site_records WHERE id=? AND section='menus' AND kind='recipe'").bind(text(item.recipeId,100)).first();if(!recipe)fail(400,'The selected meal no longer exists. Choose another or use a custom meal.');recipeId=recipe.id;}
   data.items.push({day:item.day,type:item.type,title,recipeId,notes:text(item.notes,500)});
  }
  data.items.sort((a,b)=>a.day-b.day||TYPES.indexOf(a.type)-TYPES.indexOf(b.type));
 }else{
  data.date=date(b.date);data.location=text(b.location,140);data.body=text(b.body,8000);data.favourite=boolean(b.favourite);data.mediaId=await assertMedia(env,b.mediaId,'scrapbook');
  if(b.tags!==undefined&&!Array.isArray(b.tags))fail(400,'Tags must be a list.');if((b.tags||[]).length>12)fail(400,'Use no more than twelve tags.');data.tags=[...new Set((b.tags||[]).map(t=>text(t,40)).filter(Boolean))];
 }
 return {title:data.title,data};
}
function conflict(e){if(/UNIQUE constraint failed.*week_start|UNIQUE constraint failed.*site_records.id/i.test(String(e)))fail(409,'A week already exists for that Monday. Open it instead.');throw e;}
async function get(env,id,config){return env.DB.prepare('SELECT * FROM site_records WHERE id=? AND section=? AND kind=?').bind(id,config.section,config.kind).first();}
export async function recordsRoute(request,env,user,resource,id,helpers){
 const config=CONFIG[resource];if(!config)fail(404,'Page not found.');const access=await requireSection(env,user,config.section,request.method==='GET'?1:2);
 if(request.method==='GET'){
  if(id){const row=await get(env,id,config);if(!row||(config.kind==='week'&&access.menus<2&&JSON.parse(row.data_json).status!=='published'))fail(404,'Record not found.');return json({record:record(row)});}
  const rows=(await env.DB.prepare('SELECT * FROM site_records WHERE section=? AND kind=? ORDER BY updated_at DESC LIMIT 1001').bind(config.section,config.kind).all()).results;
  // Refuse silent truncation: callers must know if the collection has reached its supported size.
  if(rows.length>1000)fail(413,'This collection is too large to load in one page. Please contact the site owner.');
  return json({records:rows.map(record).filter(r=>config.kind!=='week'||access.menus>=2||r.status==='published')});
 }
 if(!['POST','PUT','DELETE'].includes(request.method)||request.method==='POST'&&id||request.method!=='POST'&&!id)fail(405,'This action is not supported.');
 const b=await body(request);let previous=null;
 if(id){previous=await get(env,id,config);if(!previous)fail(404,'Record not found.');if(revision(b.revision)!==previous.revision)fail(409,'Someone has changed this record. Reload before saving. Your unsaved text has been kept.');}
 if(request.method==='DELETE'){
  // Recipes remain as archived ideas so historical week references continue to work.
  if(config.kind==='recipe'){
   const data={...JSON.parse(previous.data_json),archived:true};const result=await env.DB.prepare('UPDATE site_records SET data_json=?,revision=revision+1,updated_at=?,updated_by=? WHERE id=? AND revision=?').bind(JSON.stringify(data),now(previous.updated_at),user.id,id,b.revision).run();if(!result.meta.changes)fail(409,'This record changed. Reload it.');
  }else{const result=await env.DB.prepare('DELETE FROM site_records WHERE id=? AND revision=?').bind(id,b.revision).run();if(!result.meta.changes)fail(409,'This record changed. Reload it.');}
  await audit(env,helpers,user,config.kind+'.delete',id);return json({ok:true});
 }
 const {title,data}=await validate(env,config.kind,b),t=now(previous?.updated_at);id=id||newId(config.kind);
 try{
  if(previous){
   const result=await env.DB.prepare('UPDATE site_records SET title=?,data_json=?,week_start=?,revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND revision=?').bind(title,JSON.stringify(data),data.weekStart||null,user.id,t,id,b.revision).run();if(!result.meta.changes)fail(409,'Someone changed this record. Reload before saving.');
  }else await env.DB.prepare('INSERT INTO site_records(id,section,kind,title,data_json,week_start,revision,created_by,updated_by,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?,?)').bind(id,config.section,config.kind,title,JSON.stringify(data),data.weekStart||null,user.id,user.id,t,t).run();
 }catch(e){conflict(e);}
 await audit(env,helpers,user,config.kind+(previous?'.update':'.create'),id);return json({record:record(await get(env,id,config))},previous?200:201);
}
export async function copyWeek(request,env,user,id,helpers){
 await requireSection(env,user,'menus',2);if(request.method!=='POST')fail(405,'Use POST to copy a week.');const b=await body(request),weekStart=date(b.weekStart,{monday:true});
 const source=await get(env,id,CONFIG.weeks);if(!source)fail(404,'Week not found.');const data={...JSON.parse(source.data_json),weekStart,status:'draft'};const target=newId('week'),t=now();
 try{await env.DB.prepare("INSERT INTO site_records(id,section,kind,title,data_json,week_start,revision,created_by,updated_by,created_at,updated_at) VALUES(?,'menus','week',?,?,?,1,?,?,?,?)").bind(target,data.title,JSON.stringify(data),weekStart,user.id,user.id,t,t).run();}catch(e){conflict(e);}
 await audit(env,helpers,user,'week.copy',target);return json({record:record(await get(env,target,CONFIG.weeks))},201);
}
export async function familyLinks(request,env,user,id,helpers){
 await requireSection(env,user,'family',request.method==='GET'?1:2);
 if(request.method==='GET'&&!id)return json({links:(await env.DB.prepare('SELECT id,from_id AS "from",to_id AS "to",type FROM site_family_links ORDER BY created_at').all()).results});
 if(request.method==='DELETE'&&id){const r=await env.DB.prepare('DELETE FROM site_family_links WHERE id=?').bind(id).run();if(!r.meta.changes)fail(404,'Relationship not found.');await audit(env,helpers,user,'relationship.delete',id);return json({ok:true});}
 if(request.method!=='POST'||id)fail(405,'This relationship action is not supported.');const b=await body(request);let from=required(b.from,100,'From person'),to=required(b.to,100,'To person');if(from===to)fail(400,'A person cannot be related to themselves.');if(!['parent','partner'].includes(b.type))fail(400,'Choose parent or partner.');
 for(const personId of [from,to])if(!await get(env,personId,CONFIG.people))fail(400,'Choose two existing people.');
 // Canonical ordering makes partner duplicates impossible, even across simultaneous requests.
 if(b.type==='partner'&&from>to)[from,to]=[to,from];const linkId=newId('link');
 try{
  let result;
  if(b.type==='parent'){
   // Cycle detection and insertion are one atomic SQLite statement, not a racy read then write.
   result=await env.DB.prepare(`WITH RECURSIVE descendants(id) AS (SELECT to_id FROM site_family_links WHERE from_id=? AND type='parent' UNION SELECT l.to_id FROM site_family_links l JOIN descendants d ON l.from_id=d.id WHERE l.type='parent') INSERT INTO site_family_links(id,from_id,to_id,type,created_by,created_at) SELECT ?,?,?,'parent',?,? WHERE NOT EXISTS (SELECT 1 FROM descendants WHERE id=?)`).bind(to,linkId,from,to,user.id,now(),from).run();
  }else result=await env.DB.prepare('INSERT INTO site_family_links(id,from_id,to_id,type,created_by,created_at) VALUES(?,?,?,?,?,?)').bind(linkId,from,to,b.type,user.id,now()).run();
  if(!result.meta.changes)fail(409,'This parent link would create a cycle.');
 }catch(e){if(/UNIQUE constraint/i.test(String(e)))fail(409,'This relationship already exists.');throw e;}
 await audit(env,helpers,user,'relationship.create',linkId);return json({link:{id:linkId,from,to,type:b.type}},201);
}
