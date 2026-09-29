(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={dashboard:null,family:null,scrapbook:null,menus:null,users:null,security:null,info:null,board:null};
const routeTitles={
  home:['PRIVATE HOME','Duck & Bear Home'],'home/today':['OUR SPACE','Today'],'home/quick-add':['OUR SPACE','Quick add'],
  'menus/library':['OUR MENUS','Menu library'],'menus/week':['OUR MENUS','This week'],'menus/history':['OUR MENUS','Past weeks'],
  'scrapbook/timeline':['SCRAPBOOK','Our timeline'],'scrapbook/add':['SCRAPBOOK','Add a memory'],
  'family/tree':['FAMILY TREE','Our family tree'],'family/people':['FAMILY TREE','People'],'family/relationships':['FAMILY TREE','Relationships'],
  'plans/board':['PLANS & NOTES','Shared board'],'plans/bucket':['PLANS & NOTES','Bucket list'],'plans/decisions':['PLANS & NOTES','Decisions'],'plans/notes':['PLANS & NOTES','Little notes'],
  'info/library':['INFO LIBRARY','Useful information'],'info/new':['INFO LIBRARY','New info page'],
  apps:['DUCK & BEAR APPS','Apps & games'],about:['DUCK & BEAR','About us'],
  'settings/profile':['SETTINGS','Profile'],'settings/email':['SETTINGS','Email'],'settings/password':['SETTINGS','Password'],'settings/appearance':['SETTINGS','Appearance'],'settings/privacy':['SETTINGS','Privacy'],'settings/data':['SETTINGS','Data & exports'],
  'admin/users':['ADMIN','Users'],'admin/permissions':['ADMIN','Permissions']
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2500);}
async function api(path,opts={}){
  const headers=new Headers(opts.headers||{});let body=opts.body;
  if(body&&!(body instanceof FormData)&&typeof body!=='string'){headers.set('Content-Type','application/json');body=JSON.stringify(body);}
  const r=await fetch(path,{...opts,body,headers,credentials:'same-origin',cache:'no-store'});
  const type=r.headers.get('content-type')||'',data=type.includes('json')?await r.json():null;
  if(r.status===401){location.replace('/account');throw new Error('Please sign in.');}
  if(!r.ok)throw new Error(data?.error||'Request failed.');
  return data;
}
function level(area,needed){const order=['none','read','contribute','admin'];return order.indexOf(state.dashboard?.permissions?.[area]||'none')>=order.indexOf(needed);}
function routeHref(route){return '/hub/'+(route==='home'?'home':route).replace(/^\/+|\/+$/g,'')+'/';}
function currentRoute(){
  const legacy=(location.hash.slice(1)||'').replace(/^\/+|\/+$/g,'');
  if(legacy)return legacy;
  const path=location.pathname.replace(/^\/hub\/?/,'').replace(/\/+$/,'');
  return path||'home';
}
function navigate(route,replace=false){
  const href=routeHref(route);
  history[replace?'replaceState':'pushState']({},'',href);
  closeNav();
  render();
}
function tabs(group,items){return '<nav class="tabs">'+items.map(x=>'<a data-hub-route="'+x[0]+'" class="'+(currentRoute()===x[0]?'active':'')+'" href="'+routeHref(x[0])+'">'+x[1]+'</a>').join('')+'</nav>';}
function pageTitle(route){const t=routeTitles[route]||(route.startsWith('info/')?['INFO LIBRARY','Info page']:routeTitles.home);$('#crumb').textContent=t[0];$('#topTitle').textContent=t[1];}
function updateNav(route){
  $$('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===route));
  ['menus','scrapbook','familyTree'].forEach(area=>{const el=document.querySelector('[data-area="'+area+'"]');if(el)el.hidden=!level(area,'read');});
  $('#adminLinks').hidden=state.dashboard?.user?.role!=='admin';const infoNew=$('#infoNewLink');if(infoNew)infoNew.hidden=state.dashboard?.user?.role!=='admin';
}
function setPage(html){const p=$('#page');p.innerHTML=html;p.focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});}
function closeNav(){$('#sidebar').classList.remove('open');$('#scrim').classList.remove('show');$('#scrim').hidden=true;}
function summaryCards(){
  const c=state.dashboard.counts;
  return '<div class="grid stats">'+
    stat('📸','Scrapbook',c.scrapbook)+stat('🍜','Menu ideas',c.menuLibrary)+stat('📚','Info pages',c.info)+stat('🗳️','Open decisions',c.decisions)+
  '</div>';
}
function stat(icon,label,value){return '<article class="stat"><small>'+icon+' '+esc(label)+'</small><strong>'+esc(value)+'</strong></article>';}
function heroArtwork(){
  const p=readPrefs(),choice=p.artwork||'collage';
  if(choice==='yaya-dog')return '<div class="art-frame solo"><img src="/assets/art/yaya-dog.webp" alt="Hand-drawn illustration of a happy hug with a dog"></div>';
  if(choice==='bear-goats')return '<div class="art-frame solo"><img src="/assets/art/bear-goats.webp" alt="Hand-drawn illustration of feeding goats"></div>';
  if(choice==='mascots')return '<div class="mascot-stage"><span class="duck">🦆</span><span class="heart">💛</span><span class="bear">🐻</span></div>';
  return '<div class="art-collage"><figure><img src="/assets/art/yaya-dog.webp" alt=""></figure><figure><img src="/assets/art/bear-goats.webp" alt=""></figure><span class="doodle-heart">♡</span></div>';
}
function onThisDay(items){
  const d=new Date(),md=String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return (items||[]).filter(x=>String(x.happenedOn||'').slice(5)===md).slice(0,3);
}
async function renderHome(route='home'){
  const u=state.dashboard.user;
  let scrapbook={items:[]},board={items:[]},menus={library:[],weeks:[],items:[]};
  if(level('scrapbook','read'))try{scrapbook=await ensureScrap();}catch{}
  try{board=await ensureBoard();}catch{}
  if(level('menus','read'))try{menus=await ensureMenus();}catch{}
  const memories=onThisDay(scrapbook.items),openDecisions=board.items.filter(x=>x.kind==='decision'&&x.status==='open').slice(0,3),bucket=board.items.filter(x=>x.kind==='bucket'&&x.status!=='done').slice(0,3);
  if(route==='home/quick-add')return renderQuickAdd();
  if(route==='home/today'){
    const week=latestWeek(menus),weekItems=week?menus.items.filter(x=>x.week_id===week.id):[];
    const byId=Object.fromEntries(menus.library.map(x=>[x.id,x.title]));
    return setPage('<section class="hero mini-hero"><div><span class="sticker">today ☀️</span><h2>What’s happening?</h2><p>A quick view of this week, open decisions and memories from this date.</p></div><div class="hero-art">'+heroArtwork()+'</div></section>'+
      '<section class="section"><div class="section-head"><div><h2>This week’s menu</h2><p>Open the planner to change anything.</p></div><a data-hub-route="menus/week" class="soft-button" href="'+routeHref('menus/week')+'">Open week →</a></div>'+(weekItems.length?'<div class="meal-line">'+weekItems.map(x=>'<span class="meal-chip">'+esc(x.day_key)+': '+esc(byId[x.menu_item_id]||x.custom_title||'—')+'</span>').join('')+'</div>':empty('🍽️','No private weekly plan saved yet.'))+'</section>'+
      decisionsSection(openDecisions)+onThisDaySection(memories));
  }
  setPage('<section class="hero anime-hero"><div><span class="sticker">just us 💚</span><h2>Hi '+esc(u.displayName)+'!</h2><p>This is our colourful private bit of Duck & Bear — menus, memories, family things, plans and useful information, all split into proper pages.</p><div class="actions"><a data-hub-route="home/quick-add" class="ink-button" href="'+routeHref('home/quick-add')+'">＋ Quick add</a><a data-hub-route="home/today" class="pink-button" href="'+routeHref('home/today')+'">Today →</a></div></div><div class="hero-art">'+heroArtwork()+'</div></section>'+
  summaryCards()+
  '<section class="section"><div class="section-head"><div><h2>Pick a room</h2><p>Everything has its own sublinks now.</p></div></div><div class="grid card-grid">'+
  quick('🍜','Our menus','Add dishes, photos and build a week.','menus/library','tint-yellow',level('menus','read'))+
  quick('📸','Scrapbook','Keep photos, stories and dates together.','scrapbook/timeline','tint-pink',level('scrapbook','read'))+
  quick('🌳','Family tree','People, notes, photos and relationships.','family/tree','tint-green',level('familyTree','read'))+
  quick('🧷','Plans & notes','Bucket list, decisions and little messages.','plans/board','tint-violet',true)+
  quick('📚','Info library','Useful notes we can add and keep.','info/library','tint-blue',true)+
  quick('🎮','Apps & games','Everything already on Duck & Bear.','apps','tint-orange',true)+
  '</div></section>'+decisionsSection(openDecisions)+onThisDaySection(memories)+bucketSection(bucket));
}
function quick(icon,title,copy,route,tint,show){return show?'<a data-hub-route="'+route+'" class="card quick-card '+tint+'" href="'+routeHref(route)+'"><div><span class="icon">'+icon+'</span><h3>'+esc(title)+'</h3><p>'+esc(copy)+'</p></div><span class="arrow">Open →</span></a>':'';}
function renderQuickAdd(){
  const cards=[
    ['📸','Memory','Add a photo or story to the scrapbook','scrapbook/add',level('scrapbook','contribute'),'tint-pink'],
    ['🍜','Menu idea','Add a dish for a future week','menus/library',level('menus','contribute'),'tint-yellow'],
    ['🌳','Family person','Add somebody to the tree','family/people',level('familyTree','contribute'),'tint-green'],
    ['💌','Little note','Leave a shared note','plans/notes',true,'tint-violet'],
    ['🗳️','Decision','Put something to a vote','plans/decisions',true,'tint-blue'],
    ['📚','Info page','Create a useful library page','info/new',state.dashboard.user.role==='admin','tint-orange']
  ];
  setPage('<section class="section"><div class="section-head"><div><h2>Quick add</h2><p>Choose what you want to add. Each opens its proper page.</p></div></div><div class="grid card-grid">'+cards.filter(x=>x[4]).map(x=>quick(x[0],x[1],x[2],x[3],x[5],true)).join('')+'</div></section>');
}
function decisionsSection(items){
  if(!items?.length)return '';
  return '<section class="section"><div class="section-head"><div><h2>Waiting on a decision</h2><p>Vote once; change your vote any time while it is open.</p></div><a data-hub-route="plans/decisions" href="'+routeHref('plans/decisions')+'">All decisions →</a></div><div class="grid card-grid">'+items.map(decisionCard).join('')+'</div></section>';
}
function onThisDaySection(items){
  if(!items?.length)return '';
  return '<section class="section"><div class="section-head"><div><h2>On this day</h2><p>A memory from the same date in another year.</p></div></div><div class="media-grid">'+items.map(scrapCard).join('')+'</div></section>';
}
function bucketSection(items){
  if(!items?.length)return '';
  return '<section class="section"><div class="section-head"><div><h2>Still on the bucket list</h2><p>Things we said we would do.</p></div><a data-hub-route="plans/bucket" href="'+routeHref('plans/bucket')+'">Bucket list →</a></div><div class="grid card-grid">'+items.map(boardCard).join('')+'</div></section>';
}

async function ensureMenus(){if(!state.menus)state.menus=await api('/api/hub/menus');return state.menus;}
async function renderMenus(route){
  if(!level('menus','read'))return forbidden('Menus');
  const data=await ensureMenus(),tab=tabs('menus',[['menus/library','Menu library'],['menus/week','This week'],['menus/history','Past weeks']]);
  if(route==='menus/library'){
    const can=level('menus','contribute');
    setPage(tab+(can?menuForm():'')+'<section class="section"><div class="section-head"><div><h2>Menu library</h2><p>Reusable ideas for future weeks.</p></div><span class="sticker">'+data.library.length+' saved</span></div>'+
      (data.library.length?'<div class="menu-library">'+data.library.map(menuCard).join('')+'</div>':empty('🍱','No menu ideas yet.'))+'</section>');
  }else if(route==='menus/week'){
    const week=latestWeek(data);
    setPage(tab+'<section class="panel form-card"><div class="section-head"><div><h2>Build a week</h2><p>Pick from the library or type something new for a day.</p></div></div>'+weekForm(data,week)+'</section>');
  }else{
    setPage(tab+'<section><div class="section-head"><div><h2>Past weeks</h2><p>Your recent menu plans.</p></div></div>'+(data.weeks.length?'<div class="week-history">'+data.weeks.map(w=>weekHistory(data,w)).join('')+'</div>':empty('🗓️','No saved weeks yet.'))+'</section>');
  }
}
function menuForm(item=null){
  const editing=Boolean(item);
  return '<section class="panel form-card" id="menuEditor"><div class="section-head"><div><h2>'+(editing?'Edit menu idea':'Add a menu idea')+'</h2><p>Guannan can add dishes and plating/reference photos here.</p></div></div><form id="menuForm" data-id="'+esc(item?.id||'')+'"><div class="form-grid"><label>Menu name<input name="title" maxlength="140" required value="'+esc(item?.title||'')+'"></label><label>Cuisine<input name="cuisine" maxlength="80" placeholder="Chinese, Indian, Irish…" value="'+esc(item?.cuisine||'')+'"></label><label class="wide">Description<textarea name="description" maxlength="3000">'+esc(item?.description||'')+'</textarea></label><label>Tags<input name="tags" placeholder="spicy, quick, favourite" value="'+esc((item?.tags||[]).join(', '))+'"></label><label>Photo / plating image<input name="file" type="file" accept="image/*,video/mp4,video/webm"></label></div><div class="actions"><button class="ink-button" type="submit">'+(editing?'Save changes':'Add to library')+'</button>'+(editing?'<button class="soft-button" type="button" data-action="cancel-menu-edit">Cancel</button>':'')+'</div></form></section>';
}
function menuCard(m){return '<article class="card menu-card"><div class="menu-photo">'+(m.mediaUrl?'<img src="'+m.mediaUrl+'" alt="">':'🍲')+'</div><div class="menu-copy"><h3>'+esc(m.title)+'</h3><p class="muted tiny">'+esc(m.cuisine||'No cuisine set')+'</p><p class="tiny">'+esc(m.description||'')+'</p><div class="tags">'+m.tags.map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</div>'+(level('menus','contribute')?'<div class="actions"><button class="soft-button" data-action="edit-menu" data-id="'+m.id+'">Edit</button><button class="danger-button" data-action="delete-menu" data-id="'+m.id+'">Remove</button></div>':'')+'</div></article>';}
function mondayISO(){
  const d=new Date(),day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d.toISOString().slice(0,10);
}
function latestWeek(data){return data.weeks.find(w=>w.week_start===mondayISO())||null;}
function weekForm(data,week){
  const items=week?data.items.filter(x=>x.week_id===week.id):[];
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const options='<option value="">Choose from library…</option>'+data.library.map(m=>'<option value="'+m.id+'">'+esc(m.title)+'</option>').join('');
  return '<form id="weekForm"><div class="form-grid"><label>Week starting<input type="date" name="weekStart" required value="'+esc(week?.week_start||mondayISO())+'"></label><label>Week title<input name="title" maxlength="140" placeholder="Cosy week, curry week…" value="'+esc(week?.title||'')+'"></label><label class="wide">Notes<textarea name="notes" maxlength="3000">'+esc(week?.notes||'')+'</textarea></label></div><div class="week-grid">'+days.map(day=>{
    const x=items.find(i=>i.day_key===day)||{};
    return '<div class="day-card" data-day="'+day+'"><h4>'+day+'</h4><select name="menuItemId">'+options.replace('value="'+esc(x.menu_item_id||'')+'"','value="'+esc(x.menu_item_id||'')+'" selected')+'</select><input name="customTitle" placeholder="Or type something…" value="'+esc(x.custom_title||'')+'"><input name="notes" placeholder="Note" value="'+esc(x.notes||'')+'"></div>';
  }).join('')+'</div><div class="actions"><button class="ink-button" type="submit">Save week</button></div></form>';
}
function weekHistory(data,w){
  const items=data.items.filter(x=>x.week_id===w.id),byId=Object.fromEntries(data.library.map(x=>[x.id,x.title]));
  return '<article class="week-row"><h3>'+esc(w.title||('Week of '+w.week_start))+'</h3><p class="muted tiny">'+esc(w.week_start)+(w.notes?' · '+esc(w.notes):'')+'</p><div class="meal-line">'+items.map(x=>'<span class="meal-chip">'+esc(x.day_key)+': '+esc(byId[x.menu_item_id]||x.custom_title||'—')+'</span>').join('')+'</div></article>';
}

async function ensureScrap(){if(!state.scrapbook)state.scrapbook=await api('/api/hub/scrapbook');return state.scrapbook;}
async function renderScrapbook(route){
  if(!level('scrapbook','read'))return forbidden('Scrapbook');
  const data=await ensureScrap(),tab=tabs('scrapbook',[['scrapbook/timeline','Timeline'],['scrapbook/add','Add memory']]);
  if(route==='scrapbook/add'){
    setPage(tab+(level('scrapbook','contribute')?scrapForm():'<div class="note">You have read-only access.</div>'));
  }else{
    setPage(tab+'<section><div class="section-head"><div><h2>Our scrapbook</h2><p>Photos and little bits we want to keep.</p></div><a data-hub-route="scrapbook/add" class="pink-button" href="'+routeHref('scrapbook/add')+'">Add memory</a></div>'+(data.items.length?'<div class="media-grid">'+data.items.map(scrapCard).join('')+'</div>':empty('📸','Nothing in the scrapbook yet.'))+'</section>');
  }
}
function scrapForm(item=null){
  return '<section class="panel form-card" id="scrapEditor"><div class="section-head"><div><h2>'+(item?'Edit memory':'Add a memory')+'</h2><p>Private to people with Scrapbook permission.</p></div></div><form id="scrapForm" data-id="'+esc(item?.id||'')+'"><div class="form-grid"><label>Title<input name="title" required maxlength="140" value="'+esc(item?.title||'')+'"></label><label>Date<input type="date" name="happenedOn" value="'+esc(item?.happenedOn||'')+'"></label><label>Mood<input name="mood" maxlength="12" value="'+esc(item?.mood||'💚')+'"></label><label>Photo / short video<input name="file" type="file" accept="image/*,video/mp4,video/webm"></label><label class="wide">Story / note<textarea name="body" maxlength="5000">'+esc(item?.body||'')+'</textarea></label></div><div class="actions"><button class="ink-button" type="submit">'+(item?'Save changes':'Add to scrapbook')+'</button>'+(item?'<button class="soft-button" type="button" data-action="cancel-scrap-edit">Cancel</button>':'')+'</div></form></section>';
}
function scrapCard(x){
  const media=x.mediaUrl?(x.mediaType.startsWith('video/')?'<video src="'+x.mediaUrl+'" controls preload="metadata"></video>':'<img src="'+x.mediaUrl+'" alt="">'):'<div class="person-photo">📖</div>';
  return '<article class="card memory-card"><div class="memory-media">'+media+'</div><div class="memory-copy"><div class="memory-meta"><span>'+esc(x.mood||'💚')+'</span><span>'+esc(x.happenedOn||x.createdAt.slice(0,10))+'</span></div><h3>'+esc(x.title)+'</h3><p>'+esc(x.body)+'</p>'+(level('scrapbook','contribute')?'<div class="actions"><button class="soft-button" data-action="edit-scrap" data-id="'+x.id+'">Edit</button><button class="danger-button" data-action="delete-scrap" data-id="'+x.id+'">Delete</button></div>':'')+'</div></article>';
}

async function ensureFamily(){if(!state.family)state.family=await api('/api/hub/family');return state.family;}
async function renderFamily(route){
  if(!level('familyTree','read'))return forbidden('Family Tree');
  const data=await ensureFamily(),tab=tabs('family',[['family/tree','Tree'],['family/people','People'],['family/relationships','Relationships']]);
  if(route==='family/people'){
    setPage(tab+(level('familyTree','contribute')?familyForm():'')+'<section class="section"><div class="section-head"><div><h2>People</h2><p>Add notes and photos without making them public.</p></div></div>'+peopleByBranch(data)+'</section>');
  }else if(route==='family/relationships'){
    setPage(tab+(level('familyTree','contribute')?relationForm(data):'')+'<section class="section"><div class="section-head"><div><h2>Relationships</h2><p>Connect the people already in the tree.</p></div></div>'+relationsList(data)+'</section>');
  }else{
    setPage(tab+'<section class="hero tint-green"><div><span class="sticker">private family space</span><h2>Our people</h2><p>Built from the people and links we add ourselves. Nothing here is on the public site.</p></div><div class="hero-art"><div class="mascot-stage"><span class="duck">🌿</span><span class="heart">💚</span><span class="bear">🌳</span></div></div></section><section class="section">'+peopleByBranch(data)+relationsList(data)+'</section>');
  }
}
function familyForm(p=null){
  return '<section class="panel form-card" id="familyEditor"><div class="section-head"><div><h2>'+(p?'Edit person':'Add a person')+'</h2><p>Guannan and you can add to this together.</p></div></div><form id="familyForm" data-id="'+esc(p?.id||'')+'"><div class="form-grid"><label>Name<input name="name" required maxlength="100" value="'+esc(p?.name||'')+'"></label><label>Relation label<input name="relationLabel" maxlength="80" placeholder="Mum, cousin, grandad…" value="'+esc(p?.relationLabel||'')+'"></label><label>Branch<input name="branch" maxlength="40" placeholder="Guannan, Zach, shared…" value="'+esc(p?.branch||'shared')+'"></label><label>Date of birth<input type="date" name="birthDate" value="'+esc(p?.birthDate||'')+'"></label><label>Photo<input name="file" type="file" accept="image/*"></label><label class="wide">Notes<textarea name="notes" maxlength="3000">'+esc(p?.notes||'')+'</textarea></label></div><div class="actions"><button class="ink-button" type="submit">'+(p?'Save changes':'Add person')+'</button>'+(p?'<button class="soft-button" type="button" data-action="cancel-family-edit">Cancel</button>':'')+'</div></form></section>';
}
function personCard(p){return '<article class="card person-card"><div class="person-photo">'+(p.photoUrl?'<img src="'+p.photoUrl+'" alt="">':'👤')+'</div><div class="person-copy"><h3>'+esc(p.name)+'</h3><p><strong>'+esc(p.relationLabel||'Family')+'</strong><br>'+esc(p.notes||'')+'</p>'+(level('familyTree','contribute')?'<div class="actions"><button class="soft-button" data-action="edit-person" data-id="'+p.id+'">Edit</button><button class="danger-button" data-action="delete-person" data-id="'+p.id+'">Delete</button></div>':'')+'</div></article>';}
function peopleByBranch(data){
  if(!data.people.length)return empty('🌱','No family members added yet.');
  const groups={};data.people.forEach(p=>(groups[p.branch||'shared']??=[]).push(p));
  return Object.entries(groups).map(([branch,people])=>'<h3 class="branch-title">'+esc(branch)+'</h3><div class="people-grid">'+people.map(personCard).join('')+'</div>').join('');
}
function relationForm(data){
  const opts=data.people.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('');
  return '<section class="panel form-card"><div class="section-head"><div><h2>Connect two people</h2><p>Add a parent, partner, sibling or other relationship.</p></div></div><form id="relationForm"><div class="form-grid"><label>First person<select name="personA" required><option value="">Choose…</option>'+opts+'</select></label><label>Second person<select name="personB" required><option value="">Choose…</option>'+opts+'</select></label><label>Relationship<select name="relationType"><option value="parent">Parent → child</option><option value="partner">Partners</option><option value="sibling">Siblings</option><option value="relative">Relatives</option><option value="other">Other</option></select></label><label>Label<input name="label" maxlength="80" placeholder="Optional note"></label></div><div class="actions"><button class="ink-button" type="submit">Add relationship</button></div></form></section>';
}
function relationsList(data){
  if(!data.relations.length)return empty('🧵','No relationships linked yet.');
  const names=Object.fromEntries(data.people.map(p=>[p.id,p.name]));
  return '<div class="thread-list">'+data.relations.map(r=>'<article class="thread"><strong>'+esc(names[r.person_a_id]||'Unknown')+'</strong><span>'+esc(r.relation_type)+(r.label?' · '+esc(r.label):'')+'</span><strong>'+esc(names[r.person_b_id]||'Unknown')+'</strong>'+(level('familyTree','contribute')?'<button class="danger-button" data-action="delete-relation" data-id="'+r.id+'">Remove</button>':'')+'</article>').join('')+'</div>';
}

async function ensureBoard(){if(!state.board)state.board=await api('/api/hub/board');return state.board;}
function boardForm(kind){
  const meta={
    note:['Little note','Leave something on the shared board.','Message / note'],
    bucket:['Bucket-list idea','Something we should actually do.','Why / details'],
    decision:['New decision','Give us a few choices and vote.','Context / details']
  }[kind]||['New item','','Details'];
  return '<section class="panel form-card"><div class="section-head"><div><h2>'+meta[0]+'</h2><p>'+meta[1]+'</p></div></div><form id="boardForm" data-kind="'+kind+'"><div class="form-grid"><label>Title<input name="title" required maxlength="160"></label><label class="wide">'+meta[2]+'<textarea name="body" maxlength="3000"></textarea></label>'+(kind==='decision'?'<label class="wide">Choices — one per line<textarea name="options" required placeholder="Saturday\nSunday"></textarea></label>':'')+'</div><div class="actions"><button class="ink-button" type="submit">Add '+(kind==='note'?'note':kind==='bucket'?'idea':'decision')+'</button></div></form></section>';
}
function canManageBoard(x){return x.createdBy===state.dashboard.user.id||state.dashboard.user.role==='admin';}
function boardCard(x){
  const status=x.status==='done'?'✓ done':x.status;
  return '<article class="card board-card '+(x.status==='done'?'done':'')+'"><div class="user-head"><div><span class="tag">'+esc(x.kind)+'</span><h3>'+esc(x.title)+'</h3></div><span class="sticker">'+esc(status)+'</span></div><p>'+esc(x.body||'')+'</p>'+(canManageBoard(x)?'<div class="actions">'+(x.kind==='bucket'&&x.status!=='done'?'<button class="soft-button" data-action="board-status" data-status="done" data-id="'+x.id+'">Mark done</button>':'')+(x.status==='done'?'<button class="soft-button" data-action="board-status" data-status="open" data-id="'+x.id+'">Reopen</button>':'')+'<button class="danger-button" data-action="delete-board" data-id="'+x.id+'">Delete</button></div>':'')+'</article>';
}
function decisionCard(x){
  const options=x.options||[];
  return '<article class="card decision-card"><div class="user-head"><div><span class="tag">decision</span><h3>'+esc(x.title)+'</h3></div><span class="sticker">'+esc(x.status)+'</span></div><p>'+esc(x.body||'')+'</p><div class="decision-options">'+options.map(o=>'<button class="decision-option '+(x.myVote===o?'chosen':'')+'" data-action="board-vote" data-id="'+x.id+'" data-choice="'+esc(o)+'" '+(x.status!=='open'?'disabled':'')+'><span>'+esc(o)+'</span><b>'+Number(x.votes?.[o]||0)+'</b></button>').join('')+'</div>'+(canManageBoard(x)?'<div class="actions">'+(x.status==='open'?'<button class="soft-button" data-action="board-status" data-status="closed" data-id="'+x.id+'">Close vote</button>':'<button class="soft-button" data-action="board-status" data-status="open" data-id="'+x.id+'">Reopen</button>')+'<button class="danger-button" data-action="delete-board" data-id="'+x.id+'">Delete</button></div>':'')+'</article>';
}
async function renderPlans(route){
  const data=await ensureBoard(),tab=tabs('plans',[['plans/board','Shared board'],['plans/bucket','Bucket list'],['plans/decisions','Decisions'],['plans/notes','Little notes']]);
  if(route==='plans/bucket'){
    const items=data.items.filter(x=>x.kind==='bucket'),open=items.filter(x=>x.status!=='done'),done=items.filter(x=>x.status==='done');
    return setPage(tab+boardForm('bucket')+'<section class="section"><div class="section-head"><div><h2>Still to do</h2><p>'+open.length+' idea'+(open.length===1?'':'s')+' waiting for us.</p></div><button class="pink-button" data-action="surprise-bucket">Surprise me</button></div>'+(open.length?'<div class="grid card-grid">'+open.map(boardCard).join('')+'</div>':empty('🪣','Bucket list is empty.'))+'</section>'+(done.length?'<section class="section"><div class="section-head"><h2>Done ✓</h2></div><div class="grid card-grid">'+done.map(boardCard).join('')+'</div></section>':''));
  }
  if(route==='plans/decisions'){
    const items=data.items.filter(x=>x.kind==='decision');
    return setPage(tab+boardForm('decision')+'<section class="section"><div class="section-head"><div><h2>Decisions</h2><p>Vote, change your mind, then close it when decided.</p></div></div>'+(items.length?'<div class="grid card-grid">'+items.map(decisionCard).join('')+'</div>':empty('🗳️','Nothing to decide yet.'))+'</section>');
  }
  if(route==='plans/notes'){
    const items=data.items.filter(x=>x.kind==='note');
    return setPage(tab+boardForm('note')+'<section class="section"><div class="section-head"><div><h2>Little notes</h2><p>Private messages on our shared board.</p></div></div>'+(items.length?'<div class="grid card-grid">'+items.map(boardCard).join('')+'</div>':empty('💌','No notes yet.'))+'</section>');
  }
  const items=data.items;
  setPage(tab+'<section class="hero mini-hero"><div><span class="sticker">shared board</span><h2>Plans, ideas & little notes</h2><p>A place for things that do not belong in a menu, family tree or scrapbook yet.</p></div><div class="hero-art"><div class="pinboard-art">📌💌🗳️🪣</div></div></section><section class="section"><div class="section-head"><div><h2>Recent</h2><p>Latest activity from the board.</p></div></div>'+(items.length?'<div class="grid card-grid">'+items.slice(0,12).map(x=>x.kind==='decision'?decisionCard(x):boardCard(x)).join('')+'</div>':empty('🧷','The board is clear.'))+'</section>');
}

async function ensureInfo(){if(!state.info)state.info=await api('/api/hub/info');return state.info;}
function infoBody(body){
  const lines=String(body||'').split(/\n/),parts=[];let list=[];
  const flush=()=>{if(list.length){parts.push('<ul>'+list.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>');list=[];}};
  for(const raw of lines){const line=raw.trim();if(!line){flush();continue;}if(/^[-•]\s*/.test(line)){list.push(line.replace(/^[-•]\s*/,''));continue;}flush();if(line.length<80&&!/[.!?]$/.test(line))parts.push('<h3>'+esc(line)+'</h3>');else parts.push('<p>'+esc(line)+'</p>');}
  flush();return parts.join('');
}
function infoForm(page=null){
  const edit=Boolean(page);
  return '<section class="panel form-card"><div class="section-head"><div><h2>'+(edit?'Edit info page':'Create info page')+'</h2><p>Useful notes only available after sign-in.</p></div></div><form id="infoForm" data-id="'+esc(page?.id||'')+'"><div class="form-grid"><label>Title<input name="title" required maxlength="160" value="'+esc(page?.title||'')+'"></label><label>Category<input name="category" maxlength="80" value="'+esc(page?.category||'General')+'"></label><label>Page address<input name="slug" maxlength="80" placeholder="leave blank to make it from the title" value="'+esc(page?.slug||'')+'"></label><label class="wide">Short summary<textarea name="summary" maxlength="500">'+esc(page?.summary||'')+'</textarea></label><label class="wide">Page content<textarea name="body" maxlength="12000" rows="16" placeholder="Use blank lines between paragraphs. Start simple lists with •">'+esc(page?.body||'')+'</textarea></label></div><div class="actions"><button class="ink-button" type="submit">'+(edit?'Save page':'Create page')+'</button>'+(edit?'<a data-hub-route="info/'+esc(page.slug)+'" class="soft-button" href="'+routeHref('info/'+page.slug)+'">Cancel</a>':'')+'</div></form></section>';
}
function infoCard(p){
  return '<a data-hub-route="info/'+esc(p.slug)+'" class="card info-card" href="'+routeHref('info/'+p.slug)+'"><span class="info-icon">'+(p.category.toLowerCase().includes('health')?'🧴':'📌')+'</span><div><span class="tag">'+esc(p.category)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.summary||'')+'</p><strong>Open page →</strong></div></a>';
}
async function renderInfo(route){
  const data=await ensureInfo(),admin=state.dashboard.user.role==='admin';
  if(route==='info/new'){
    if(!admin)return forbidden('New Info Page');
    return setPage(tabs('info',[['info/library','Library'],['info/new','New page']])+infoForm());
  }
  if(route.startsWith('info/edit/')){
    if(!admin)return forbidden('Edit Info Page');
    const slug=decodeURIComponent(route.slice('info/edit/'.length)),page=data.pages.find(x=>x.slug===slug);if(!page)return setPage(empty('📚','Info page not found.'));
    return setPage(tabs('info',[['info/library','Library'],['info/new','New page']])+infoForm(page));
  }
  if(route==='info/library'){
    const cats={};for(const p of data.pages)(cats[p.category]??=[]).push(p);
    return setPage(tabs('info',[['info/library','Library'],...(admin?[['info/new','New page']]:[])])+'<section class="hero mini-hero info-hero"><div><span class="sticker">useful stuff 📚</span><h2>Info library</h2><p>Things worth keeping somewhere sensible instead of trying to remember them later.</p></div><div class="hero-art"><div class="library-art">📚🖍️💡</div></div></section>'+Object.entries(cats).map(([cat,pages])=>'<section class="section"><div class="section-head"><h2>'+esc(cat)+'</h2></div><div class="info-grid">'+pages.map(infoCard).join('')+'</div></section>').join(''));
  }
  const slug=decodeURIComponent(route.slice('info/'.length)),page=data.pages.find(x=>x.slug===slug);if(!page)return setPage(empty('📚','Info page not found.'));
  pageTitle(route);$('#topTitle').textContent=page.title;
  setPage('<nav class="tabs"><a data-hub-route="info/library" href="'+routeHref('info/library')+'">← Info library</a></nav><article class="panel info-article"><div class="info-article-head"><div><span class="tag">'+esc(page.category)+'</span><h2>'+esc(page.title)+'</h2><p>'+esc(page.summary||'')+'</p></div>'+(admin?'<div class="actions"><a data-hub-route="info/edit/'+esc(page.slug)+'" class="soft-button" href="'+routeHref('info/edit/'+page.slug)+'">Edit</a><button class="danger-button" data-action="delete-info" data-id="'+page.id+'">Delete</button></div>':'')+'</div><div class="info-prose">'+infoBody(page.body)+'</div></article>');
}

function renderAbout(){
  setPage('<section class="hero anime-hero"><div><span class="sticker">private about page 💛</span><h2>Duck & Bear</h2><p>This is our shared corner of the internet: games, food plans, memories, family things, useful notes and a completely unnecessary amount of nonsense.</p><div class="actions"><a data-hub-route="home" class="ink-button" href="'+routeHref('home')+'">Our Home</a><a data-hub-route="scrapbook/timeline" class="pink-button" href="'+routeHref('scrapbook/timeline')+'">Scrapbook</a></div></div><div class="hero-art">'+heroArtwork()+'</div></section><section class="section"><div class="grid card-grid"><article class="card tint-yellow"><span class="icon">🦆</span><h3>Duck</h3><p>Colour, food, photos and the important opinions.</p></article><article class="card tint-orange"><span class="icon">🐻</span><h3>Bear</h3><p>Games, over-engineering and keeping the whole thing running.</p></article><article class="card tint-pink"><span class="icon">💛</span><h3>Us</h3><p>A private home first. Invited accounts only see the sections they have permission to use.</p></article></div></section>');
}

function renderApps(){
  const apps=[
    ['🎮','Games','Wacky Races, Meow Wars, Mango Mayhem, Seagull and the rest.','/#games','tint-blue'],
    ['🎁','Gift Shop','The £0.00 Duck & Bear gift shop.','/account#shop','tint-pink'],
    ['⭐','Yaya Points','Points, rewards and badges.','/account#loyalty','tint-yellow'],
    ['📦','Orders','See deliveries and order history.','/account#orders','tint-orange'],
    ['🍽️','Legacy Menu Room','The existing menu area stays available.','/menus/member/','tint-green'],
    ['🦒','Safari & Fun','Dates, reviews, adventures and old memories.','/account#fun','tint-violet']
  ];
  setPage('<section class="section"><div class="section-head"><div><h2>Duck & Bear apps</h2><p>The new Home sits in front of the things already working.</p></div></div><div class="app-grid">'+apps.map(a=>'<a class="card app-card '+a[4]+'" href="'+a[3]+'"><span class="icon">'+a[0]+'</span><h3>'+a[1]+'</h3><p>'+a[2]+'</p><strong>Open →</strong></a>').join('')+'</div></section>');
}

async function ensureSecurity(){if(!state.security){const b=await api('/api/bootstrap');state.security=b.accountSecurity||{};}return state.security;}
async function renderSettings(route){
  const t=tabs('settings',[['settings/profile','Profile'],['settings/email','Email'],['settings/password','Password'],['settings/appearance','Appearance'],['settings/privacy','Privacy'],['settings/data','Data & exports']]);
  if(route==='settings/profile'){
    const u=state.dashboard.user;return setPage(t+'<section class="panel"><div class="section-head"><div><h2>Your profile</h2><p>The account currently signed in.</p></div></div><div class="grid stats">'+stat('👤','Name',u.displayName)+stat('🔑','Username',u.username)+stat('🧭','Role',u.role)+stat('✅','Status',u.active?'Active':'Disabled')+'</div><div class="note">Name, username and role are managed separately in Admin → Users. Security has its own Email and Password pages.</div></section>');
  }
  if(route==='settings/email'){
    const sec=await ensureSecurity();return setPage(t+'<section class="panel form-card settings-narrow"><div class="section-head"><div><h2>Registered email</h2><p>Used for email sign-in and lost-password recovery.</p></div></div><form id="emailForm"><label>Email<input type="email" name="email" required value="'+esc(sec.email||'')+'"></label><label>Current password<input type="password" name="currentPassword" required autocomplete="current-password"></label><div class="actions"><button class="ink-button" type="submit">Save email</button></div></form></section>');
  }
  if(route==='settings/password'){
    return setPage(t+'<section class="panel form-card settings-narrow"><div class="section-head"><div><h2>Change password</h2><p>Changing it signs out your other sessions.</p></div></div><form id="passwordForm"><label>Current password<input type="password" name="currentPassword" required autocomplete="current-password"></label><label>New password<input type="password" name="newPassword" required minlength="8" maxlength="128" autocomplete="new-password"></label><div class="actions"><button class="ink-button" type="submit">Change password</button><a class="soft-button" href="/account">Lost password?</a></div></form></section>');
  }
  if(route==='settings/appearance'){
    const pref=readPrefs();
    return setPage(t+'<section class="panel form-card"><div class="section-head"><div><h2>Appearance</h2><p>Colourful hand-drawn style, with a few choices saved on this device.</p></div></div><form id="appearanceForm"><div class="form-grid"><label>Theme<select name="theme"><option value="paper" '+(pref.theme==='paper'||!pref.theme?'selected':'')+'>Colourful anime paper</option><option value="ink" '+(pref.theme==='ink'?'selected':'')+'>Ink sketch</option><option value="night" '+(pref.theme==='night'?'selected':'')+'>Night</option></select></label><label>Home artwork<select name="artwork"><option value="collage" '+((pref.artwork||'collage')==='collage'?'selected':'')+'>Both illustrations</option><option value="yaya-dog" '+(pref.artwork==='yaya-dog'?'selected':'')+'>Dog hug</option><option value="bear-goats" '+(pref.artwork==='bear-goats'?'selected':'')+'>Goat day</option><option value="mascots" '+(pref.artwork==='mascots'?'selected':'')+'>Duck & Bear mascots</option></select></label><label>Motion<select name="motion"><option value="full" '+(!pref.reduce?'selected':'')+'>Playful movement</option><option value="reduced" '+(pref.reduce?'selected':'')+'>Reduced motion</option></select></label><label>Navigation<select name="nav"><option value="normal" '+(!pref.compact?'selected':'')+'>Normal</option><option value="compact" '+(pref.compact?'selected':'')+'>Compact</option></select></label></div><div class="art-choice-preview">'+heroArtwork()+'</div><div class="actions"><button class="ink-button" type="submit">Save appearance</button></div></form></section>');
  }
  if(route==='settings/privacy'){
    const p=state.dashboard.permissions;
    return setPage(t+'<section class="panel"><div class="section-head"><div><h2>Privacy</h2><p>Private access is checked by the Worker on every request.</p></div></div><div class="grid stats">'+stat('🌳','Family Tree',p.familyTree)+stat('📸','Scrapbook',p.scrapbook)+stat('🍜','Menus',p.menus)+stat('🔒','Media','Private')+'</div><div class="note">Info and About require sign-in. Family Tree, Scrapbook and their media also require the relevant permission. Private content is never made public just because a link is known.</div></section>');
  }
  return setPage(t+'<section class="panel"><div class="section-head"><div><h2>Data & exports</h2><p>Download a copy of the existing account data.</p></div></div><div class="grid card-grid"><a class="card quick-card tint-blue" href="/api/export/backup.json" download><div><span class="icon">💾</span><h3>Full JSON backup</h3><p>Account history plus private Menu Room data.</p></div><span class="arrow">Download →</span></a><a class="card quick-card tint-yellow" href="/api/export/orders.csv" download><div><span class="icon">📦</span><h3>Orders CSV</h3><p>Your order history in a spreadsheet-friendly format.</p></div><span class="arrow">Download →</span></a><a class="card quick-card tint-green" href="/api/export/loyalty.csv" download><div><span class="icon">⭐</span><h3>Yaya Points CSV</h3><p>Loyalty transactions and balances.</p></div><span class="arrow">Download →</span></a></div><div class="note">Family Tree, Scrapbook, Info Library and planning-board export will be included in the dedicated Home backup as that grows.</div></section>');
}
function readPrefs(){try{return JSON.parse(localStorage.getItem('db-home-prefs'))||{};}catch{return {};}}
function applyPrefs(p=readPrefs()){document.documentElement.dataset.theme=p.theme||'paper';document.body.classList.toggle('reduce-motion',Boolean(p.reduce));document.body.classList.toggle('compact',Boolean(p.compact));}

async function ensureUsers(){if(!state.users)state.users=await api('/api/hub/users');return state.users;}
async function renderAdmin(route){
  if(state.dashboard.user.role!=='admin')return forbidden('Admin');
  const data=await ensureUsers(),tab=tabs('admin',[['admin/users','Users'],['admin/permissions','Permissions']]);
  if(route==='admin/users'){
    setPage(tab+'<section class="panel form-card"><div class="section-head"><div><h2>Add user</h2><p>New members start with no access to private Home sections.</p></div></div><form id="newUserForm"><div class="form-grid"><label>Display name<input name="displayName" required maxlength="60"></label><label>Username<input name="username" required minlength="3" maxlength="30"></label><label>Role<select name="role"><option value="member">Member</option><option value="admin">Admin</option></select></label><label>Temporary password<input type="password" name="password" required minlength="8" maxlength="128"></label></div><div class="actions"><button class="ink-button" type="submit">Create user</button></div></form></section><section class="section"><div class="section-head"><div><h2>Existing users</h2><p>Edit, disable or delete when safe.</p></div></div><div class="user-list">'+data.users.map(userEditCard).join('')+'</div></section>');
  }else{
    setPage(tab+'<section class="section"><div class="section-head"><div><h2>Private permissions</h2><p>None, read, contribute or admin — enforced by the backend.</p></div></div><div class="user-list">'+data.users.map(permissionCard).join('')+'</div></section>');
  }
}
function userEditCard(u){
  return '<article class="card user-card"><form data-user-form="'+u.id+'"><div class="user-head"><div><h3>'+esc(u.displayName)+'</h3><p class="muted tiny">'+esc(u.id)+'</p></div><span class="sticker">'+(u.active?'active':'disabled')+'</span></div><div class="form-grid"><label>Name<input name="displayName" value="'+esc(u.displayName)+'"></label><label>Username<input name="username" value="'+esc(u.username)+'"></label><label>Role<select name="role"><option value="member" '+(u.role==='member'?'selected':'')+'>Member</option><option value="admin" '+(u.role==='admin'?'selected':'')+'>Admin</option></select></label><label>Status<select name="active"><option value="true" '+(u.active?'selected':'')+'>Active</option><option value="false" '+(!u.active?'selected':'')+'>Disabled</option></select></label></div><div class="actions"><button class="ink-button" type="submit">Save user</button>'+(u.role==='member'?'<button class="soft-button" type="button" data-action="reset-password" data-id="'+u.id+'">Reset password</button>':'')+'<button class="danger-button" type="button" data-action="delete-user" data-id="'+u.id+'">Delete</button></div></form></article>';
}
function permissionCard(u){
  const options=value=>['none','read','contribute','admin'].map(x=>'<option value="'+x+'" '+(value===x?'selected':'')+'>'+x+'</option>').join('');
  return '<article class="card user-card"><form data-perm-form="'+u.id+'"><div class="user-head"><div><h3>'+esc(u.displayName)+'</h3><p class="muted tiny">'+esc(u.username)+' · '+esc(u.role)+'</p></div></div><div class="perm-grid"><label>Family Tree<select name="familyTree">'+options(u.permissions.familyTree)+'</select></label><label>Scrapbook<select name="scrapbook">'+options(u.permissions.scrapbook)+'</select></label><label>Menus<select name="menus">'+options(u.permissions.menus)+'</select></label></div><div class="actions"><button class="ink-button" type="submit">Save permissions</button></div></form></article>';
}

function forbidden(name){setPage('<div class="empty"><span>🔐</span><strong>'+esc(name)+' is private.</strong><p>You do not currently have permission to open this section.</p></div>');}
function empty(icon,text){return '<div class="empty"><span>'+icon+'</span><strong>'+esc(text)+'</strong></div>';}
async function render(){
  const route=currentRoute();pageTitle(route);updateNav(route);
  try{
    if(route==='home'||route.startsWith('home/'))return await renderHome(route);
    if(route.startsWith('menus/'))return await renderMenus(route);
    if(route.startsWith('scrapbook/'))return await renderScrapbook(route);
    if(route.startsWith('family/'))return await renderFamily(route);
    if(route.startsWith('plans/'))return await renderPlans(route);
    if(route.startsWith('info/'))return await renderInfo(route);
    if(route==='apps')return renderApps();
    if(route==='about')return renderAbout();
    if(route.startsWith('settings/'))return await renderSettings(route);
    if(route.startsWith('admin/'))return await renderAdmin(route);
    return navigate('home',true);
  }catch(err){setPage('<div class="empty"><span>🧯</span><strong>That page did not load.</strong><p>'+esc(err.message)+'</p><button class="soft-button" data-action="retry">Try again</button></div>');}
}
async function refresh(area){
  if(area==='menus')state.menus=null;if(area==='scrapbook')state.scrapbook=null;if(area==='family')state.family=null;if(area==='users')state.users=null;if(area==='info')state.info=null;if(area==='board')state.board=null;
  await render();
}
document.addEventListener('submit',async e=>{
  const f=e.target;if(!(f instanceof HTMLFormElement))return;e.preventDefault();const button=f.querySelector('[type="submit"]');if(button)button.disabled=true;
  try{
    if(f.id==='menuForm'){const id=f.dataset.id,url=id?'/api/hub/menus/library/'+encodeURIComponent(id):'/api/hub/menus/library';state.menus=await api(url,{method:id?'PUT':'POST',body:new FormData(f)});toast(id?'Menu updated.':'Added to the menu library.');location.hash='menus/library';return render();}
    if(f.id==='weekForm'){const fd=new FormData(f),items=$$('.day-card').map(card=>({day:card.dataset.day,mealSlot:'Dinner',menuItemId:card.querySelector('[name=menuItemId]').value,customTitle:card.querySelector('[name=customTitle]').value,notes:card.querySelector('[name=notes]').value})).filter(x=>x.menuItemId||x.customTitle);state.menus=await api('/api/hub/menus/weeks',{method:'POST',body:{weekStart:fd.get('weekStart'),title:fd.get('title'),notes:fd.get('notes'),items}});toast('Week saved.');return render();}
    if(f.id==='scrapForm'){const id=f.dataset.id,url=id?'/api/hub/scrapbook/'+encodeURIComponent(id):'/api/hub/scrapbook';state.scrapbook=await api(url,{method:id?'PUT':'POST',body:new FormData(f)});toast(id?'Memory updated.':'Added to the scrapbook.');location.hash='scrapbook/timeline';return render();}
    if(f.id==='familyForm'){const id=f.dataset.id,url=id?'/api/hub/family/'+encodeURIComponent(id):'/api/hub/family';state.family=await api(url,{method:id?'PUT':'POST',body:new FormData(f)});toast(id?'Person updated.':'Person added.');location.hash='family/people';return render();}
    if(f.id==='relationForm'){const fd=new FormData(f);state.family=await api('/api/hub/family/relations',{method:'POST',body:{personA:fd.get('personA'),personB:fd.get('personB'),relationType:fd.get('relationType'),label:fd.get('label')}});toast('Relationship added.');return render();}
    if(f.id==='emailForm'){const fd=new FormData(f),d=await api('/api/account/email',{method:'POST',body:{email:fd.get('email'),currentPassword:fd.get('currentPassword')}});state.security=d.accountSecurity;toast('Recovery email saved.');return render();}
    if(f.id==='passwordForm'){const fd=new FormData(f);await api('/api/account/password',{method:'POST',body:{currentPassword:fd.get('currentPassword'),newPassword:fd.get('newPassword')}});toast('Password changed. Please sign in again.');setTimeout(()=>location.replace('/account'),800);return;}
    if(f.id==='appearanceForm'){const fd=new FormData(f),p={theme:fd.get('theme'),reduce:fd.get('motion')==='reduced',compact:fd.get('nav')==='compact'};localStorage.setItem('db-home-prefs',JSON.stringify(p));applyPrefs(p);toast('Appearance saved.');return;}
    if(f.id==='newUserForm'){const fd=new FormData(f);await api('/api/hub/users',{method:'POST',body:Object.fromEntries(fd)});toast('User created.');return refresh('users');}
    if(f.dataset.userForm){const fd=new FormData(f);await api('/api/hub/users/'+encodeURIComponent(f.dataset.userForm),{method:'PUT',body:{displayName:fd.get('displayName'),username:fd.get('username'),role:fd.get('role'),active:fd.get('active')==='true'}});toast('User updated.');return refresh('users');}
    if(f.dataset.permForm){const fd=new FormData(f);await api('/api/hub/users/'+encodeURIComponent(f.dataset.permForm)+'/permissions',{method:'PUT',body:Object.fromEntries(fd)});toast('Permissions updated.');return refresh('users');}
  }catch(err){toast(err.message);}finally{if(button?.isConnected)button.disabled=false;}
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id;
  try{
    if(a==='retry')return render();
    if(a==='edit-menu'){const item=state.menus.library.find(x=>x.id===id);$('#menuEditor')?.remove();$('#page').insertAdjacentHTML('afterbegin',menuForm(item));location.hash='menus/library';return;}
    if(a==='cancel-menu-edit')return refresh('menus');
    if(a==='delete-menu'){if(!confirm('Remove this menu idea?'))return;state.menus=await api('/api/hub/menus/library/'+encodeURIComponent(id),{method:'DELETE'});toast('Menu removed.');return render();}
    if(a==='edit-scrap'){const item=state.scrapbook.items.find(x=>x.id===id);location.hash='scrapbook/add';await render();$('#scrapEditor')?.remove();$('#page').insertAdjacentHTML('afterbegin',scrapForm(item));return;}
    if(a==='cancel-scrap-edit'){location.hash='scrapbook/timeline';return;}
    if(a==='delete-scrap'){if(!confirm('Delete this scrapbook item?'))return;state.scrapbook=await api('/api/hub/scrapbook/'+encodeURIComponent(id),{method:'DELETE'});toast('Memory deleted.');return render();}
    if(a==='edit-person'){const item=state.family.people.find(x=>x.id===id);$('#familyEditor')?.remove();$('#page').insertAdjacentHTML('afterbegin',familyForm(item));$('#familyEditor')?.scrollIntoView({behavior:'smooth'});return;}
    if(a==='cancel-family-edit')return refresh('family');
    if(a==='delete-person'){if(!confirm('Delete this person from the family tree?'))return;state.family=await api('/api/hub/family/'+encodeURIComponent(id),{method:'DELETE'});toast('Person deleted.');return render();}
    if(a==='delete-relation'){state.family=await api('/api/hub/family/relations/'+encodeURIComponent(id),{method:'DELETE'});toast('Relationship removed.');return render();}
    if(a==='delete-user'){if(!confirm('Delete this user? If they have history, Duck & Bear will refuse and you can disable them instead.'))return;await api('/api/hub/users/'+encodeURIComponent(id),{method:'DELETE'});toast('User deleted.');return refresh('users');}
    if(a==='reset-password'){const next=prompt('New password (8–128 characters)');if(!next)return;await api('/api/admin/users/'+encodeURIComponent(id)+'/password',{method:'POST',body:{newPassword:next}});toast('Password reset. Their existing sessions were signed out.');}
  }catch(err){toast(err.message);}
});
$('#logoutButton').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST'});}catch{}location.replace('/account');});
$('#menuButton').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#scrim').hidden=false;$('#scrim').classList.add('show');});
$('#scrim').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#scrim').classList.remove('show');$('#scrim').hidden=true;});
window.addEventListener('hashchange',()=>{$('#sidebar').classList.remove('open');$('#scrim').classList.remove('show');$('#scrim').hidden=true;render();});
(async()=>{
  applyPrefs();
  try{
    state.dashboard=await api('/api/hub');
    $('#userPill').textContent=(state.dashboard.user.role==='admin'?'🐻 ':'🦆 ')+state.dashboard.user.displayName;
    updateNav(currentRoute());
    await render();
  }catch(err){setPage('<div class="empty"><span>🔐</span><strong>Private home could not open.</strong><p>'+esc(err.message)+'</p><a class="soft-button" href="/account">Go to sign in</a></div>');}
})();
})();
