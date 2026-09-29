(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={dashboard:null,family:null,scrapbook:null,menus:null,users:null,security:null};
const routeTitles={
  home:['PRIVATE HOME','Duck & Bear Home'],
  'menus/library':['OUR MENUS','Menu library'],'menus/week':['OUR MENUS','This week'],'menus/history':['OUR MENUS','Past weeks'],
  'scrapbook/timeline':['SCRAPBOOK','Our timeline'],'scrapbook/add':['SCRAPBOOK','Add a memory'],
  'family/tree':['FAMILY TREE','Our family tree'],'family/people':['FAMILY TREE','People'],'family/relationships':['FAMILY TREE','Relationships'],
  apps:['DUCK & BEAR APPS','Apps & games'],
  'settings/profile':['SETTINGS','Profile'],'settings/security':['SETTINGS','Security'],'settings/appearance':['SETTINGS','Appearance'],'settings/privacy':['SETTINGS','Privacy'],
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
function currentRoute(){return (location.hash.slice(1)||'home').replace(/^\/+/,'');}
function tabs(group,items){return '<nav class="tabs">'+items.map(x=>'<a class="'+(currentRoute()===x[0]?'active':'')+'" href="#'+x[0]+'">'+x[1]+'</a>').join('')+'</nav>';}
function pageTitle(route){const t=routeTitles[route]||routeTitles.home;$('#crumb').textContent=t[0];$('#topTitle').textContent=t[1];}
function updateNav(route){
  $$('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===route));
  ['menus','scrapbook','familyTree'].forEach(area=>{const el=document.querySelector('[data-area="'+area+'"]');if(el)el.hidden=!level(area,'read');});
  $('#adminLinks').hidden=state.dashboard?.user?.role!=='admin';
}
function setPage(html){const p=$('#page');p.innerHTML=html;p.focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});}
function summaryCards(){
  const c=state.dashboard.counts;
  return '<div class="grid stats">'+
    stat('🌳','Family people',c.family)+stat('📸','Scrapbook',c.scrapbook)+stat('🍜','Menu ideas',c.menuLibrary)+stat('🗓️','Saved weeks',c.weeks)+
  '</div>';
}
function stat(icon,label,value){return '<article class="stat"><small>'+icon+' '+esc(label)+'</small><strong>'+esc(value)+'</strong></article>';}
function renderHome(){
  const u=state.dashboard.user;
  setPage('<section class="hero"><div><span class="sticker">just us 💚</span><h2>Hi '+esc(u.displayName)+'!</h2><p>This is our private bit of Duck & Bear — menus, memories, family things and the useful stuff, without mixing everything into one giant page.</p><div class="actions"><a class="ink-button" href="#scrapbook/add">Add a memory</a><a class="pink-button" href="#menus/week">Plan this week</a></div></div><div class="hero-art"><div class="mascot-stage"><span class="duck">🦆</span><span class="heart">💛</span><span class="bear">🐻</span></div></div></section>'+
  summaryCards()+
  '<section class="section"><div class="section-head"><div><h2>Pick a room</h2><p>Each area has its own pages and settings.</p></div></div><div class="grid card-grid">'+
  quick('🍜','Our menus','Add dishes, plating photos and build a week.','#menus/library','tint-yellow',level('menus','read'))+
  quick('📸','Scrapbook','Keep photos, little stories and dates together.','#scrapbook/timeline','tint-pink',level('scrapbook','read'))+
  quick('🌳','Family tree','Add people, notes, photos and relationships.','#family/tree','tint-green',level('familyTree','read'))+
  quick('🎮','Apps & games','Jump back into everything already on Duck & Bear.','#apps','tint-blue',true)+
  quick('🔐','Security','Email recovery and password controls.','#settings/security','tint-violet',true)+
  quick('🎨','Appearance','Paper, ink or night. Keep it how you like it.','#settings/appearance','tint-orange',true)+
  '</div></section>');
}
function quick(icon,title,copy,href,tint,show){return show?'<a class="card quick-card '+tint+'" href="'+href+'"><div><span class="icon">'+icon+'</span><h3>'+esc(title)+'</h3><p>'+esc(copy)+'</p></div><span class="arrow">Open →</span></a>':'';}

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
    setPage(tab+'<section><div class="section-head"><div><h2>Our scrapbook</h2><p>Photos and little bits we want to keep.</p></div><a class="pink-button" href="#scrapbook/add">Add memory</a></div>'+(data.items.length?'<div class="media-grid">'+data.items.map(scrapCard).join('')+'</div>':empty('📸','Nothing in the scrapbook yet.'))+'</section>');
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
  const t=tabs('settings',[['settings/profile','Profile'],['settings/security','Security'],['settings/appearance','Appearance'],['settings/privacy','Privacy']]);
  if(route==='settings/profile'){
    const u=state.dashboard.user;setPage(t+'<section class="panel"><div class="section-head"><div><h2>Your profile</h2><p>The account currently signed in.</p></div></div><div class="grid stats">'+stat('👤','Name',u.displayName)+stat('🔑','Username',u.username)+stat('🧭','Role',u.role)+stat('✅','Status',u.active?'Active':'Disabled')+'</div><div class="note">Profile name and username can be changed by an admin in Users. Security details are kept on the separate Security page.</div></section>');
  }else if(route==='settings/security'){
    const s=await ensureSecurity();
    setPage(t+'<div class="grid card-grid"><section class="panel form-card"><h2>Recovery email</h2><p class="muted tiny">Register an email so you can sign in with it and use lost password.</p><form id="emailForm"><label>Email<input type="email" name="email" required value="'+esc(s.email||'')+'"></label><label>Current password<input type="password" name="currentPassword" required autocomplete="current-password"></label><div class="actions"><button class="ink-button" type="submit">Save email</button></div></form></section><section class="panel form-card"><h2>Change password</h2><form id="passwordForm"><label>Current password<input type="password" name="currentPassword" required autocomplete="current-password"></label><label>New password<input type="password" name="newPassword" required minlength="8" maxlength="128" autocomplete="new-password"></label><div class="actions"><button class="ink-button" type="submit">Change password</button></div></form></section><section class="panel tint-blue"><h2>Lost password</h2><p class="muted tiny">The sign-in page has the recovery link. It never confirms whether an email exists.</p><a class="soft-button" href="/account">Open sign in →</a></section></div>');
  }else if(route==='settings/appearance'){
    const pref=readPrefs();
    setPage(t+'<section class="panel form-card"><div class="section-head"><div><h2>Appearance</h2><p>Saved on this device.</p></div></div><form id="appearanceForm"><div class="form-grid"><label>Theme<select name="theme"><option value="paper" '+(pref.theme==='paper'?'selected':'')+'>Colourful paper</option><option value="ink" '+(pref.theme==='ink'?'selected':'')+'>Ink sketch</option><option value="night" '+(pref.theme==='night'?'selected':'')+'>Night</option></select></label><label>Motion<select name="motion"><option value="full" '+(!pref.reduce?'selected':'')+'>Playful movement</option><option value="reduced" '+(pref.reduce?'selected':'')+'>Reduced motion</option></select></label><label>Navigation<select name="nav"><option value="normal" '+(!pref.compact?'selected':'')+'>Normal</option><option value="compact" '+(pref.compact?'selected':'')+'>Compact</option></select></label></div><div class="actions"><button class="ink-button" type="submit">Save appearance</button></div></form></section>');
  }else{
    const p=state.dashboard.permissions;
    setPage(t+'<section class="panel"><div class="section-head"><div><h2>Privacy</h2><p>The private Home uses server-side permission checks.</p></div></div><div class="grid stats">'+stat('🌳','Family Tree',p.familyTree)+stat('📸','Scrapbook',p.scrapbook)+stat('🍜','Menus',p.menus)+stat('🔒','Media','Private')+'</div><div class="note">Family Tree, Scrapbook and their media are not exposed through the public homepage. A hidden button is not treated as security — the Worker checks your permission again on every private request.</div></section>');
  }
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
  return '<article class="card user-card"><form data-user-form="'+u.id+'"><div class="user-head"><div><h3>'+esc(u.displayName)+'</h3><p class="muted tiny">'+esc(u.id)+'</p></div><span class="sticker">'+(u.active?'active':'disabled')+'</span></div><div class="form-grid"><label>Name<input name="displayName" value="'+esc(u.displayName)+'"></label><label>Username<input name="username" value="'+esc(u.username)+'"></label><label>Role<select name="role"><option value="member" '+(u.role==='member'?'selected':'')+'>Member</option><option value="admin" '+(u.role==='admin'?'selected':'')+'>Admin</option></select></label><label>Status<select name="active"><option value="true" '+(u.active?'selected':'')+'>Active</option><option value="false" '+(!u.active?'selected':'')+'>Disabled</option></select></label></div><div class="actions"><button class="ink-button" type="submit">Save user</button><button class="soft-button" type="button" data-action="reset-password" data-id="'+u.id+'">Reset password</button><button class="danger-button" type="button" data-action="delete-user" data-id="'+u.id+'">Delete</button></div></form></article>';
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
    if(route==='home')return renderHome();
    if(route.startsWith('menus/'))return await renderMenus(route);
    if(route.startsWith('scrapbook/'))return await renderScrapbook(route);
    if(route.startsWith('family/'))return await renderFamily(route);
    if(route==='apps')return renderApps();
    if(route.startsWith('settings/'))return await renderSettings(route);
    if(route.startsWith('admin/'))return await renderAdmin(route);
    location.hash='home';
  }catch(err){setPage('<div class="empty"><span>🧯</span><strong>That page did not load.</strong><p>'+esc(err.message)+'</p><button class="soft-button" data-action="retry">Try again</button></div>');}
}
async function refresh(area){
  if(area==='menus')state.menus=null;if(area==='scrapbook')state.scrapbook=null;if(area==='family')state.family=null;if(area==='users')state.users=null;
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
    if(a==='edit-scrap'){const item=state.scrapbook.items.find(x=>x.id===id);location.hash='scrapbook/add';await render();$('#page').insertAdjacentHTML('afterbegin',scrapForm(item));return;}
    if(a==='cancel-scrap-edit'){location.hash='scrapbook/timeline';return;}
    if(a==='delete-scrap'){if(!confirm('Delete this scrapbook item?'))return;state.scrapbook=await api('/api/hub/scrapbook/'+encodeURIComponent(id),{method:'DELETE'});toast('Memory deleted.');return render();}
    if(a==='edit-person'){const item=state.family.people.find(x=>x.id===id);$('#familyEditor')?.remove();$('#page').insertAdjacentHTML('afterbegin',familyForm(item));return;}
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
