import {fail,id,sha,now,queryAll} from './core.mjs';
import {LEGACY_MEALS} from './seed.mjs';
import {permission} from './schema.mjs';

async function oldJson(env,key){const object=await env.MEDIA.get(key);if(!object)return null;let data;try{data=JSON.parse(await object.text());}catch{fail(503,'Saved legacy data needs owner review. Nothing has been overwritten.','legacy_data');}if(!data||typeof data!=='object'||Array.isArray(data))fail(503,'Saved legacy data has an unexpected format. Nothing has been overwritten.','legacy_data');return data;}
export async function importLegacy(env,user){
 if(!(await permission(env,user,'intimate')).pair)return;
 if(await env.DB.prepare("SELECT 1 AS ok FROM hq_meta WHERE key='legacy-imported-v1'").first())return;
 const menus=await oldJson(env,'menu-room/private-data-v1.json'),security=await oldJson(env,'account-security/private-v1.json');
 if(menus&&(!Array.isArray(menus.suggestions)||!Array.isArray(menus.reviews)))fail(503,'Saved menu records need owner review. They have not been changed.');
 const users=await queryAll(env.DB,'SELECT id FROM users'),known=new Set(users.map(u=>u.id));
 const pair=await env.DB.prepare("SELECT user_id FROM hq_pair WHERE role='owner' ORDER BY user_id LIMIT 1").first();const owner=pair.user_id;
 const actor=uid=>known.has(uid)?uid:owner;const steps=[];
 function record(rid,kind,section,parent,creator,data,stamp='2026-09-28T00:00:00.000Z'){steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_records(id,kind,section,parent_id,creator_id,updated_by,revision,data,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?)').bind(rid,kind,section,parent,actor(creator),actor(creator),JSON.stringify(data),stamp,stamp));}
 const weekId='week-2026-09-28';const meals=[];
 for(const m of LEGACY_MEALS){const data={weekId,date:m.meal_date,course:m.meal_type,title:m.display_name,description:m.description,recipeId:'',ingredients:[],ingredientsConfirmed:false,served:Boolean(m.served),photos:[],order:0};meals.push({id:m.id,...data});record(m.id,'serving','menus',weekId,owner,data);}
 record(weekId,'week','menus',null,owner,{start:'2026-09-28',title:'The Dungeon Menu',status:'published',snapshot:{start:'2026-09-28',title:'The Dungeon Menu',publishedAt:'2026-09-28T00:00:00.000Z',meals}});
 async function oldAsset(key,name,type,size,creator,section){if(!key||!/^memories\/|^menu-reviews\//.test(key))return null;const obj=await env.MEDIA.get(key);if(!obj)return null;const binary=new Uint8Array(await obj.arrayBuffer()),aid='legacy-asset-'+(await sha(key)).slice(0,24);steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_assets(id,section,creator_id,name,type,size,original_key,preview_key,sha256,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(aid,section,actor(creator),String(name||'Saved attachment').slice(0,180),obj.httpMetadata?.contentType||type||'application/octet-stream',binary.length,key,key,await sha(binary),now()));return aid;}
 for(const s of menus?.suggestions||[]){const rid='legacy-'+String(s.id).replace(/[^\w-]/g,'').slice(0,100);record(rid,'idea','menus',null,s.user_id,{title:s.title||'Saved meal idea',description:[s.description,s.notes].filter(Boolean).join('\n\n'),course:s.meal_type||'dinner',cuisine:'',minutes:30,servings:2,ingredients:[],instructions:'',link:'',week:s.target_week_start||'',status:String(s.status||'suggested').toLowerCase(),photos:[],coverId:'',attachmentId:''},s.created_at||now());}
 for(const r of menus?.reviews||[]){let meal=meals.find(m=>m.id===r.meal_id);if(!meal&&r.meal_snapshot?.id){const s=r.meal_snapshot,wid='week-'+s.week_start;meal={id:s.id,weekId:wid,date:s.meal_date,course:s.meal_type,title:s.display_name,description:s.description||'',served:Boolean(s.served),ingredients:[],ingredientsConfirmed:false,photos:[],order:0};record(s.id,'serving','menus',wid,r.user_id,meal,r.created_at||now());record(wid,'week','menus',null,owner,{start:s.week_start,title:'Saved weekly menu',status:'published',snapshot:{start:s.week_start,title:'Saved weekly menu',publishedAt:r.created_at||now(),meals:[meal]}},r.created_at||now());}
  if(!meal)fail(503,'A saved review refers to a missing meal. Owner review is needed before migration.');const photos=[];for(const p of r.photos||[]){const aid=await oldAsset(p.r2_key,p.file_name,p.mime_type,p.file_size,r.user_id,'intimate');if(aid)photos.push({assetId:aid,caption:'',x:50,y:50,zoom:1});}
  record('legacy-'+String(r.id).replace(/[^\w-]/g,'').slice(0,100),'review','intimate',meal.id,r.user_id,{servingId:meal.id,mealSnapshot:meal,overall:r.overall_rating,taste:r.taste_rating,plating:r.plating_rating,comment:r.comment||'',makeAgain:false,photos},r.created_at||now());
 }
 const memories=await queryAll(env.DB,'SELECT * FROM memories ORDER BY created_at,id');
 if(memories.length){record('legacy-scrapbook','album','scrapbook',null,owner,{title:'Our earlier memories',description:'Preserved from the original Duck & Bear account.',date:'',coverId:'',layout:'notebook'});for(const m of memories){const aid=await oldAsset(m.attachment_key,m.attachment_name,m.attachment_type,m.attachment_size,m.user_id,'scrapbook');record('legacy-'+m.id,'memory','scrapbook','legacy-scrapbook',m.user_id,{title:m.title,text:m.body||'',date:m.happened_on||'',albumId:'legacy-scrapbook',planId:'',status:'saved',layout:'notebook',photos:aid&&String(m.attachment_type).startsWith('image/')?[{assetId:aid,caption:'',x:50,y:50,zoom:1}]:[],coverId:'',attachmentId:aid&&!String(m.attachment_type).startsWith('image/')?aid:'',stickers:[]},m.created_at);}}
 for(const p of security?.profiles||[]){if(!known.has(p.user_id)||!p.email)continue;const email=String(p.email_normalized||p.email).trim().toLowerCase();steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_identity(user_id,email,verified,pending_email,updated_at) VALUES(?,?,0,NULL,?)').bind(p.user_id,email,p.updated_at||now()));}
 steps.push(env.DB.prepare("INSERT OR IGNORE INTO hq_meta(key,value) VALUES('legacy-imported-v1',?)").bind(now()));await env.DB.batch(steps);
}


const RECENT_MENU_RECIPES=[
 {
  id:'recipe-2026-09-28-mongolian-lamb',
  servingId:'menu-2026-09-28-mon-dinner',
  data:{
   title:'The Mongolian Submission — Mongolian Lamb Shanks',
   description:'Slow-cooked Mongolian-style lamb shanks with jasmine rice and sesame vegetables.',
   course:'dinner',cuisine:'Mongolian-style',tags:['lamb','slow-cooked','rice'],minutes:210,servings:2,
   ingredients:[
    '2 lamb shanks',
    '4 tbsp soy sauce',
    '3 tbsp hoisin sauce',
    '2 tbsp brown sugar',
    '4 garlic cloves, crushed',
    '3 cm ginger, grated',
    '1 tbsp rice vinegar',
    '1 tsp sesame oil',
    '400 ml beef stock',
    '150 g jasmine rice',
    '2 pak choi',
    '1 courgette, sliced',
    '2 carrots, sliced',
    '2 spring onions, sliced',
    '1 tbsp sesame seeds',
    '1 tsp cornflour + 1 tbsp water, optional for thickening'
   ],
   instructions:'1. Heat the oven to 160°C fan. Brown the lamb shanks in a casserole or ovenproof pan.\n2. Mix the soy, hoisin, brown sugar, garlic, ginger, rice vinegar, sesame oil and beef stock. Pour around the lamb and bring to a simmer.\n3. Cover and cook for about 3 hours, turning the shanks halfway, until very tender.\n4. Remove the lamb. Reduce the sauce on the hob until glossy. If needed, stir in the cornflour slurry and simmer briefly.\n5. Cook the jasmine rice. Fry the pak choi, courgette and carrots until just tender; add a splash of water and cover the pak choi for 2–3 minutes.\n6. Serve the lamb over rice with the vegetables, sauce, spring onion and sesame.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 },
 {
  id:'recipe-2026-09-29-tropical-yoghurt',
  servingId:'menu-2026-09-28-tue-breakfast',
  data:{
   title:'Tropical Tease — Yoghurt Bowl',
   description:'Greek yoghurt with pineapple, banana, coconut and crunchy granola.',
   course:'breakfast',cuisine:'Breakfast',tags:['quick','yoghurt','fruit'],minutes:5,servings:2,
   ingredients:['300 g Greek yoghurt','150 g pineapple, chopped','1 banana, sliced','2 tbsp desiccated or shredded coconut','60 g granola'],
   instructions:'1. Divide the Greek yoghurt between two bowls.\n2. Add the pineapple and banana.\n3. Sprinkle over the coconut.\n4. Add the granola immediately before eating so it stays crunchy. If making it the night before, refrigerate everything except the granola and add that in the morning.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 },
 {
  id:'recipe-2026-09-29-harissa-chicken',
  servingId:'menu-2026-09-28-tue-dinner',
  data:{
   title:'Moroccan Restraint — Harissa Chicken & Vegetables',
   description:'Harissa chicken with roasted vegetables and a cooling lemon-garlic yoghurt sauce.',
   course:'dinner',cuisine:'Moroccan-style',tags:['chicken','harissa','roast'],minutes:45,servings:2,
   ingredients:[
    '2 chicken breasts or equivalent chicken portions',
    '50 g harissa sauce or marinade',
    '3 tbsp Greek yoghurt',
    '1 tsp sesame oil',
    '1 tbsp tomato purée',
    '1 tbsp lemon juice',
    '1 tsp honey',
    '1 garlic clove, crushed',
    '1/2 tsp smoked paprika',
    '1–2 tbsp water, as needed',
    '2 carrots, cut into batons',
    '1 courgette, chopped',
    'Cooked beetroot, cut into wedges',
    '100 g Greek yoghurt, for the sauce',
    '1 small garlic clove, finely grated, for the sauce',
    'Lemon juice, to taste, for the sauce'
   ],
   instructions:'1. Heat the oven to 200°C conventional / 180°C fan, or the air fryer to about 190°C.\n2. Mix the harissa, 3 tbsp yoghurt, sesame oil, tomato purée, lemon juice, honey, garlic and smoked paprika. Loosen with 1–2 tbsp water if needed.\n3. Coat the chicken well. Toss the carrots with a little of the harissa mixture and start them first because they take longest.\n4. Add the chicken and cook until fully cooked through. Add the courgette for the final 15–20 minutes so it does not go soft. Add the beetroot near the end just to heat and colour.\n5. Mix the extra yoghurt with garlic and lemon juice. Serve it cold alongside the hot chicken and vegetables.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 },
 {
  id:'recipe-2026-09-30-mexican-eggs',
  servingId:'menu-2026-09-28-wed-breakfast',
  data:{
   title:'Morning Mischief — Mexican Scrambled Egg Tortillas',
   description:'Soft scrambled eggs in warm tortillas with salsa, cheese and avocado.',
   course:'breakfast',cuisine:'Mexican-style',tags:['eggs','tortilla','quick'],minutes:15,servings:2,
   ingredients:['4 eggs','2 large tortillas or 4 small tortillas','4 tbsp salsa','60 g grated cheese','1 avocado, sliced','Salt and black pepper'],
   instructions:'1. Warm the tortillas in a dry pan or microwave and keep them covered.\n2. Beat the eggs with a little salt and pepper. Scramble gently in a non-stick pan until just set.\n3. Spoon the eggs into the tortillas.\n4. Add salsa, grated cheese and avocado. Fold and serve straight away.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 },
 {
  id:'recipe-2026-09-30-thai-salmon',
  servingId:'menu-2026-09-28-wed-dinner',
  data:{
   title:'Thai Tied Salmon — Soy, Honey, Ginger & Garlic Salmon',
   description:'Sticky soy-honey salmon with ginger and garlic, jasmine rice and stir-fried vegetables.',
   course:'dinner',cuisine:'Thai-style',tags:['salmon','rice','quick'],minutes:30,servings:2,
   ingredients:['2 salmon fillets','2 tbsp soy sauce','1 tbsp honey','1 garlic clove, crushed','2 cm ginger, grated','150 g jasmine rice','300 g mixed stir-fry vegetables','1 lime'],
   instructions:'1. Cook the jasmine rice.\n2. Mix the soy, honey, garlic and ginger. Coat the salmon with the mixture.\n3. Bake or air-fry the salmon until cooked to your liking and sticky at the edges, brushing with any remaining glaze during cooking.\n4. Stir-fry the vegetables until just tender.\n5. Serve the salmon with the rice and vegetables and squeeze lime over the top.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 },
 {
  id:'recipe-2026-10-01-korean-egg-rice',
  servingId:'menu-2026-09-28-thu-breakfast',
  data:{
   title:'The Korean Wake-Up Call — Egg, Rice, Kimchi & Gochujang',
   description:'Fried egg over hot rice with kimchi and gochujang.',
   course:'breakfast',cuisine:'Korean-style',tags:['egg','rice','kimchi'],minutes:15,servings:2,
   ingredients:['150 g rice, uncooked','2 eggs','150 g kimchi','1–2 tbsp gochujang, to taste'],
   instructions:'1. Cook the rice and divide it between two bowls.\n2. Fry the eggs so the whites are set and the yolks are still soft, if preferred.\n3. Put an egg on each bowl of rice.\n4. Add kimchi and gochujang. Mix through as you eat.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 },
 {
  id:'recipe-2026-10-02-greek-pita',
  servingId:'menu-2026-09-28-fri-breakfast',
  data:{
   title:'Greek Temptation — Warm Feta Pita',
   description:'Warm pita filled with feta, tomato, cucumber, olive oil and oregano.',
   course:'breakfast',cuisine:'Greek-style',tags:['pita','feta','quick'],minutes:10,servings:2,
   ingredients:['2 pita breads','100 g feta','1 tomato, chopped','1/2 cucumber, chopped','1 tbsp olive oil','1 tsp dried oregano'],
   instructions:'1. Warm or lightly toast the pita breads.\n2. Mix the tomato and cucumber with the olive oil and oregano.\n3. Crumble in the feta.\n4. Open the warm pitas and fill with the mixture. Serve immediately.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 },
 {
  id:'recipe-2026-10-02-korean-fish-chips',
  servingId:'menu-2026-09-28-fri-dinner',
  data:{
   title:'Korean Punishment Fish & Chips',
   description:'Crispy fish with a sticky gochujang, honey and soy glaze, sesame-spring onion chips and gochujang mayo.',
   course:'dinner',cuisine:'Korean-style',tags:['fish','gochujang','easy'],minutes:30,servings:2,
   ingredients:[
    '2 battered or breaded fish portions',
    'Chips for 2',
    '2 spring onions, finely sliced',
    '1 1/2 tbsp gochujang, for the fish glaze',
    '1 tbsp honey, for the fish glaze',
    '1 tbsp soy sauce',
    '1 tsp rice vinegar or lime juice',
    '1 tsp sesame oil, for the fish glaze',
    '1 small garlic clove, crushed',
    '1–2 tsp water, as needed',
    '3 tbsp mayonnaise',
    '1/2–1 tsp gochujang, for the mayo',
    'Small squeeze of lemon or lime juice, for the mayo',
    '1/2 tsp honey, optional for the mayo',
    '1/2 tsp sesame oil, for the cooked chips',
    'Pinch of salt',
    '1 tsp sesame seeds, divided'
   ],
   instructions:'1. Cook the chips until properly crisp. Do not sauce or toss them before cooking.\n2. Cook the battered fish separately until crisp and piping hot through.\n3. While they cook, make the fish glaze: gently heat 1 1/2 tbsp gochujang, 1 tbsp honey, 1 tbsp soy sauce, 1 tsp rice vinegar or lime juice, 1 tsp sesame oil, the crushed garlic and 1–2 tsp water for 2–3 minutes, stirring until glossy.\n4. Make the gochujang mayo by mixing 3 tbsp mayonnaise with 1/2–1 tsp gochujang and a squeeze of lemon or lime. Add 1/2 tsp honey if a slightly sweeter mayo is wanted.\n5. When the fish is fully cooked and crisp, spoon or brush the hot glaze over the top. Keep the underside mostly dry so the batter stays crisp.\n6. As soon as the chips are cooked, toss them lightly with 1/2 tsp sesame oil, a pinch of salt, about 1/2 tsp sesame seeds and some of the sliced spring onion. Toss only after cooking so they stay crisp.\n7. Finish the glazed fish with the remaining spring onion and sesame seeds. Serve with the seasoned chips and drizzle or dip with the gochujang mayo.',
   link:'',week:'2026-09-28',status:'planned',photos:[],coverId:'',attachmentId:''
  }
 }
];

export async function importRecentMenuRecipes(env,user){
 if(!(await permission(env,user,'intimate')).pair)return;
 if(await env.DB.prepare("SELECT 1 AS ok FROM hq_meta WHERE key='recent-menu-recipes-v1'").first())return;
 const pair=await env.DB.prepare("SELECT user_id FROM hq_pair WHERE role='owner' ORDER BY user_id LIMIT 1").first();
 if(!pair)return;
 const owner=pair.user_id,stamp=now(),steps=[];
 for(const r of RECENT_MENU_RECIPES){
  // Published servings are deliberately immutable. Keep the recipe link on the
  // recipe record so this data migration never bypasses that protection.
  const data={...r.data,servingId:r.servingId};
  steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_records(id,kind,section,parent_id,creator_id,updated_by,revision,data,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?)').bind(r.id,'recipe','menus',null,owner,owner,JSON.stringify(data),stamp,stamp));
 }
 const week=await env.DB.prepare("SELECT data FROM hq_records WHERE id='week-2026-09-28' AND kind='week' AND deleted_at IS NULL").first();
 if(week){
  const data=JSON.parse(week.data),byServing=new Map(RECENT_MENU_RECIPES.map(r=>[r.servingId,r]));
  if(data.snapshot?.meals) data.snapshot.meals=data.snapshot.meals.map(meal=>{
   const r=byServing.get(meal.id);
   return r?{...meal,recipeId:r.id,ingredients:r.data.ingredients,ingredientsConfirmed:true}:meal;
  });
  steps.push(env.DB.prepare("UPDATE hq_records SET data=?,revision=revision+1,updated_by=?,updated_at=? WHERE id='week-2026-09-28' AND deleted_at IS NULL").bind(JSON.stringify(data),owner,stamp));
 }
 steps.push(env.DB.prepare("INSERT OR IGNORE INTO hq_meta(key,value) VALUES('recent-menu-recipes-v1',?)").bind(stamp));
 await env.DB.batch(steps);
}


export async function importCookedKoreanFishChips(env,user){
 if(!(await permission(env,user,'intimate')).pair)return;
 const marker='cooked-korean-fish-chips-2026-10-02-v2';
 if(await env.DB.prepare('SELECT 1 AS ok FROM hq_meta WHERE key=?').bind(marker).first())return;
 const pair=await env.DB.prepare("SELECT user_id FROM hq_pair WHERE role='owner' ORDER BY user_id LIMIT 1").first();
 if(!pair)return;
 const owner=pair.user_id,stamp=now(),recipe=RECENT_MENU_RECIPES.find(r=>r.id==='recipe-2026-10-02-korean-fish-chips');
 const cooked={...recipe.data,servingId:recipe.servingId},steps=[];
 const row=await env.DB.prepare("SELECT data FROM hq_records WHERE id=? AND kind='recipe' AND deleted_at IS NULL").bind(recipe.id).first();
 if(row){
  let existing={};try{existing=JSON.parse(row.data||'{}');}catch{}
  const data={...existing,...cooked,photos:existing.photos||cooked.photos,coverId:existing.coverId||cooked.coverId,attachmentId:existing.attachmentId||cooked.attachmentId};
  steps.push(env.DB.prepare('UPDATE hq_records SET data=?,revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND kind=\'recipe\' AND deleted_at IS NULL').bind(JSON.stringify(data),owner,stamp,recipe.id));
 }else{
  steps.push(env.DB.prepare('INSERT INTO hq_records(id,kind,section,parent_id,creator_id,updated_by,revision,data,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?)').bind(recipe.id,'recipe','menus',null,owner,owner,JSON.stringify(cooked),stamp,stamp));
 }
 const serving=await env.DB.prepare("SELECT data FROM hq_records WHERE id=? AND kind='serving' AND deleted_at IS NULL").bind(recipe.servingId).first();
 if(serving){
  let existing={};try{existing=JSON.parse(serving.data||'{}');}catch{}
  const data={...existing,description:recipe.data.description,recipeId:recipe.id,ingredients:recipe.data.ingredients,ingredientsConfirmed:true};
  steps.push(env.DB.prepare('UPDATE hq_records SET data=?,revision=revision+1,updated_by=?,updated_at=? WHERE id=? AND kind=\'serving\' AND deleted_at IS NULL').bind(JSON.stringify(data),owner,stamp,recipe.servingId));
 }
 const week=await env.DB.prepare("SELECT data FROM hq_records WHERE id='week-2026-09-28' AND kind='week' AND deleted_at IS NULL").first();
 if(week){
  const data=JSON.parse(week.data);
  if(data.snapshot?.meals) data.snapshot.meals=data.snapshot.meals.map(meal=>meal.id===recipe.servingId?{...meal,description:recipe.data.description,recipeId:recipe.id,ingredients:recipe.data.ingredients,ingredientsConfirmed:true}:meal);
  steps.push(env.DB.prepare("UPDATE hq_records SET data=?,revision=revision+1,updated_by=?,updated_at=? WHERE id='week-2026-09-28' AND deleted_at IS NULL").bind(JSON.stringify(data),owner,stamp));
 }
 steps.push(env.DB.prepare('INSERT OR IGNORE INTO hq_meta(key,value) VALUES(?,?)').bind(marker,stamp));
 await env.DB.batch(steps);
}
