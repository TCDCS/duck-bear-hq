import {$,esc,api,title,field,button,toast,data,withButton,markSaved} from './ui.mjs';
import {library,planner} from './menus.mjs';
import {family,scrapbook} from './private.mjs';
import {settingsHome,profile,security,users,permissions,artwork,updates} from './settings.mjs';
const path=location.pathname.endsWith('/')?location.pathname:location.pathname+'/';
const publicPaths=['/signin/','/forgot-password/'];
let session=null;
const settingsLinks=[['/settings/','Settings home'],['/settings/profile/','Your profile'],['/settings/security/','Email & password'],['/settings/users/','People & accounts'],['/settings/permissions/','Access & permissions'],['/settings/artwork/','Artwork & covers'],['/settings/updates/','What’s new']];
function navigation(){
 const a=session?.access||{};
 let links=path.startsWith('/settings/')?settingsLinks.filter(([href])=>a.admin||!['/settings/users/','/settings/artwork/'].includes(href)):[['/our-space/','Our little world'],...(a.menus?[['/menus/planner/','Weekly planner'],['/menus/library/','Recipe notebook']]:[]),...(a.family?[['/family/','Family tree']]:[]),...(a.scrapbook?[['/scrapbook/','Our scrapbook']]:[]),['/games/','The games room'],['/settings/','Settings']];
 if(!session)links=[['/','Public home'],['/signin/','Sign in'],['/forgot-password/','Lost password'],['/games/','Games'],['/menus/','Public menus']];
 $('#section-nav').innerHTML=links.map(([href,label])=>`<a href="${href}" ${path===href?'aria-current="page"':''}>${esc(label)}</a>`).join('');
 document.querySelectorAll('.site-header nav a').forEach(a=>{if(a.getAttribute('href')===path)a.setAttribute('aria-current','page');});
 if(!session){$('#account-link').href='/signin/';$('#account-link').textContent='Sign in';}
 $('#signout').hidden=!session;
}
function home(){
 const a=session.access;
 const cards=[
  ...(a.menus?[['/menus/planner/','This week’s menu','A thoughtful little plan for breakfast, dinner and everything between.','♨','yellow'],['/menus/library/','The recipe notebook','Meal ideas, favourite ingredients and plating inspiration.','✎','coral']]:[]),
  ...(a.family?[['/family/','Our family tree','Remember the people. Join the dots. Keep their stories.','♧','mint']]:[]),
  ...(a.scrapbook?[['/scrapbook/','The scrapbook','All the small moments that turn into the big memories.','♡','lilac']]:[]),
  ['/games/','The games room','A little friendly competition. A very questionable amount of chaos.','✦','blue'],
  ['/settings/','Make it yours','Your account, email, settings and our latest little improvements.','⚙','pink']
 ];
 $('#content').innerHTML=title('Hello, '+session.user.displayName+'.','Come on in. There’s always room for one more little adventure.','','WELCOME TO OUR LITTLE WORLD')+`<section class="paper welcome-panel"><p class="eyebrow">DUCK & BEAR · TOGETHER IS THE GOOD BIT</p><h2>A place for our everyday magic.</h2><p>Something lovely to eat, a story worth keeping, a game that gets a bit too competitive. It all belongs here.</p><span class="badge">Signed in privately</span><span class="badge">Website 7.0.0</span></section><div class="grid">${cards.map(([href,name,desc,icon,tint])=>`<a class="card tint-${tint} settings-card" href="${href}"><span class="card-icon" aria-hidden="true">${icon}</span><h2>${name}</h2><p>${desc}</p><span class="card-go">Take a look →</span></a>`).join('')}</div>${!a.menus&&!a.family?'<p class="notice">Your account is ready. Ask the owner to share menus or family-tree access with you.</p>':''}${a.admin||a.partner?`<section class="paper original-links"><h2>The familiar favourites</h2><p class="hint">The original account is still here, with its existing orders, rewards and playful extras.</p><div class="link-row"><a class="button quiet" href="/account#loyalty">Yaya points &amp; rewards</a><a class="button quiet" href="/account#orders">Basket &amp; orders</a><a class="button quiet" href="/account#fun">Dates &amp; adventures</a></div></section>`:''}`;
}
function signIn(){
 const params=new URLSearchParams(location.search),requested=params.get('next')||'/our-space/';const next=requested.startsWith('/')&&!requested.startsWith('//')&&!requested.includes('\\')&&!requested.includes('\n')?requested:'/our-space/';
 $('#content').innerHTML=title('Welcome back.','Your private corner is just through here.','','DUCK & BEAR')+`<section class="paper auth-card tint-yellow"><h2>Sign in</h2><form id="signin-form">${field('username','Username or registered email','','text','required autocomplete="username" maxlength="254"')}${field('password','Password','','password','required autocomplete="current-password" maxlength="128"')}<p class="form-error" role="alert"></p><button class="button primary" type="submit">Come on in →</button></form><div class="link-row"><a href="/forgot-password/">Lost your password?</a><a href="/">Public home</a></div><p class="hint">Accounts are created by the owner. Already have one? Add your email after signing in, under Email &amp; password.</p></section>`;
 $('#signin-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.target;form.querySelector('[role=alert]').textContent='';try{await withButton(form.querySelector('button'),()=>api('/api/auth/login',{method:'POST',body:data(form)}));form.elements.password.value='';markSaved();location.replace(next);}catch(e){form.querySelector('[role=alert]').textContent=e.message;}});
}
function recovery(){
 $('#content').innerHTML=title('Let’s get you back in.','A forgotten password needn’t mean a lost little world.','','ACCOUNT RECOVERY')+`<section class="paper auth-card"><h2>Request password help</h2><form id="recovery-form">${field('email','Your registered email','','email','required autocomplete="email" maxlength="254"')}<p class="form-error" role="alert"></p><button class="button primary" type="submit">Request recovery</button></form><p id="recovery-result" role="status"></p><p class="hint">An email address must already be registered on the account. Automatic email delivery depends on the configured sender; the owner can also resolve a recovery request from the original admin page.</p><a href="/signin/">← Back to sign in</a></section>`;
 $('#recovery-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.target;form.querySelector('[role=alert]').textContent='';try{await withButton(form.querySelector('button'),()=>api('/api/auth/recovery/request',{method:'POST',body:data(form)}));$('#recovery-result').textContent='Request received. If this email belongs to an active account, a recovery request is available to the owner. Check your inbox if email delivery is configured; otherwise ask the owner for help.';}catch(e){form.querySelector('[role=alert]').textContent=e.message;}});
}
async function start(){
 try{
  if(publicPaths.includes(path)){navigation();path==='/signin/'?signIn():recovery();return;}
  session=await api('/api/site/me');navigation();
  const routes={'/our-space/':home,'/menus/planner/':planner,'/menus/library/':library,'/family/':family,'/scrapbook/':scrapbook,'/settings/':settingsHome,'/settings/profile/':profile,'/settings/security/':security,'/settings/users/':users,'/settings/permissions/':permissions,'/settings/artwork/':artwork,'/settings/updates/':updates};
  if(!routes[path])throw new Error('This page could not be found.');await routes[path](session);
 }catch(e){
  if(e.status===401){markSaved();location.replace('/signin/?next='+encodeURIComponent(location.pathname+location.search));return;}
  navigation();$('#content').innerHTML=`<div class="paper page-error"><p class="eyebrow">A LITTLE HICCUP</p><h1>We couldn’t open this page.</h1><p>${esc(e.message)}</p><div class="link-row"><button class="button primary" id="retry-page">Try again</button><a class="button quiet" href="/">Back to the website</a></div></div>`;$('#retry-page').addEventListener('click',start);
 }
}
$('#signout').addEventListener('click',async()=>{if(!confirm('Sign out of your private space? Unsaved changes will be discarded.'))return;try{await api('/api/auth/logout',{method:'POST',body:{}});markSaved();$('#content').replaceChildren();$('#editor').close();$('#photo-viewer').close();location.replace('/signin/');}catch(e){toast(e.message);}});
// Never redisplay a private back/forward-cache snapshot without rechecking access.
window.addEventListener('pagehide',()=>{if(session){$('#content').replaceChildren();$('#editor').close();$('#photo-viewer').close();}});
window.addEventListener('pageshow',event=>{if(event.persisted&&!publicPaths.includes(path))location.reload();});
start();
