// Agreed existing menu; no personal photographs or private reviews in source control.
export const firstWeek={id:'week-2026-09-28',startDate:'2026-09-28',title:'The Dungeon Menu',meals:[
 ['mon-dinner','2026-09-28','dinner','The Mongolian Submission','Slow-cooked Mongolian-style lamb with jasmine rice, pak choi, courgette, carrots, spring onion and sesame, with soy, hoisin, garlic and ginger.',true],
 ['tue-breakfast','2026-09-29','breakfast','Tropical Tease','Greek yoghurt with pineapple, banana, coconut and granola.'],
 ['tue-lunch','2026-09-29','lunch','The Dagwood Dom','A fully loaded Dagwood Bumstead-style baguette.'],
 ['tue-dinner','2026-09-29','dinner','Moroccan Restraint','Chicken with Moroccan-style spiced vegetables, cumin, paprika and harissa, with lemon and garlic yoghurt.'],
 ['wed-breakfast','2026-09-30','breakfast','Morning Mischief','Mexican scrambled-egg tortilla with salsa, cheese and avocado.'],
 ['wed-dinner','2026-09-30','dinner','Thai Tied Salmon','Thai-style salmon with rice and vegetables.'],
 ['thu-breakfast','2026-10-01','breakfast','The Korean Wake-Up Call','Korean-style egg and rice with kimchi and gochujang.'],
 ['thu-dinner','2026-10-01','dinner','Red Room Chilli','Rich chilli con carne.'],
 ['fri-breakfast','2026-10-02','breakfast','Greek Temptation','Warm pita with feta, tomato, cucumber, olive oil and oregano.'],
 ['fri-dinner','2026-10-02','dinner','Korean Punishment Fish & Chips','Frozen fish and chips, Korean-style: gochujang, honey, soy and lime on the fish, sesame and spring onion, with spicy sriracha mayo.'],
].map(([key,date,mealType,title,description,served=false])=>({id:'menu-2026-09-28-'+key,date,mealType,title,description,served}))};
export async function seedPayload(env,actor){
 const records=[{id:firstWeek.id,section:'menus',kind:'week',title:firstWeek.title,data:{startDate:firstWeek.startDate,status:'published'}},...firstWeek.meals.map(m=>({id:m.id,section:'menus',kind:'meal',title:m.title,parentId:firstWeek.id,data:{weekId:firstWeek.id,date:m.date,mealType:m.mealType,description:m.description,served:m.served}}))];
 const source=await env.MEDIA.get('menu-room/private-data-v1.json');
 if(source){const legacy=JSON.parse(await source.text());if(!Array.isArray(legacy.reviews)||!Array.isArray(legacy.suggestions))throw Error('Legacy menu data is not valid; original data was not modified.');
  for(const s of legacy.suggestions)records.push({id:s.id,section:'menus',kind:'idea',title:s.title,creator:s.user_id,data:{description:s.description||'',notes:s.notes||'',targetWeek:s.target_week_start,mealType:s.meal_type,status:s.status||'Suggested'}});
  for(const r of legacy.reviews){const photos=[];for(const p of r.photos||[]){photos.push(p.id);records.push({id:p.id,section:'menus',kind:'media',title:p.file_name||'Meal photo',creator:r.user_id,data:{key:'portal/legacy/'+p.r2_key,mime:p.mime_type,size:p.file_size}});}records.push({id:r.id,section:'menus',kind:'review',title:'Review',creator:r.user_id,data:{mealId:r.meal_id,overall:r.overall_rating,taste:r.taste_rating,plating:r.plating_rating,comment:r.comment||'',photos}});}
 }
 const memories=(await env.DB.prepare('SELECT * FROM memories ORDER BY created_at').all()).results;
 if(memories?.length){records.push({id:'legacy-memories',section:'scrapbook',kind:'album',title:'Earlier memories',data:{notes:'Preserved from the original Duck & Bear account.',template:'photo-story'}});
  for(const m of memories){const photos=[];if(m.attachment_key&&m.attachment_type?.startsWith('image/')){const mediaId='legacy-photo-'+m.id;photos.push(mediaId);records.push({id:mediaId,section:'scrapbook',kind:'media',title:m.attachment_name||m.title,creator:m.user_id,data:{key:'portal/legacy/'+m.attachment_key,mime:m.attachment_type,size:m.attachment_size}});}records.push({id:'legacy-'+m.id,section:'scrapbook',kind:'memory',title:m.title,creator:m.user_id,parentId:'legacy-memories',data:{albumId:'legacy-memories',story:m.body||'',date:m.happened_on||'',photos,template:'photo-story'}});}
 }
 return {records,weeks:[firstWeek]};
}
