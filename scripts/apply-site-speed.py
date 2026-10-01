"""One-time, isolated-branch patch preparation. Removed after the verified commit."""
from pathlib import Path
import json,re,subprocess
r=Path(__file__).resolve().parents[1]
assert subprocess.check_output(['git','rev-parse','--abbrev-ref','HEAD'],cwd=r,text=True).strip()=='performance/site-speed-icons-20261001'
assert json.loads((r/'package.json').read_text())['version']=='7.4.2'
(r/'src/hq/readiness.mjs').write_text('''/** Completed data imports are permanent; permissions and sessions are never cached. */
import {importLegacy,importRecentMenuRecipes} from './migrate.mjs';
import {importPrivateHome} from './import-hub.mjs';
import {ensureLibrary} from './library.mjs';
export async function migrate(env,user){
 const ready=await env.DB.prepare("SELECT COUNT(*) AS n FROM hq_meta WHERE key IN ('private-home-imported-v1','legacy-imported-v1','recent-menu-recipes-v1','info-library-v1')").first();
 if(Number(ready?.n)===4)return;
 // Keep existing household guards and idempotent imports on the cold path.
 // Missing or failed imports are retried; no process-global permission cache.
 await importPrivateHome(env,user);
 await importLegacy(env,user);
 await importRecentMenuRecipes(env,user);
 await ensureLibrary(env,user);
}
''')
p=r/'src/hq/schema.mjs';s=p.read_text().replace('import {fail,queryAll,now}','import {fail,queryAll,now,SECTIONS}')
a=s.index('export async function permission(');b=s.index('export async function requireAccess(',a)
s=s[:a]+'''function accessFromRows(pair,grant,section){
 const owner=pair?.role==='owner';
 if(pair)return {read:true,contribute:true,edit:true,manage:owner,export:true,pair:true,owner};
 if(section==='library')return {read:true,contribute:false,edit:false,manage:false,export:false,pair:false,owner:false};
 if(section==='intimate'||section==='scrapbook'||!['family','menus','plans'].includes(section))return {read:false,contribute:false,edit:false,manage:false,export:false,pair:false,owner:false};
 return {read:Boolean(grant),contribute:['contribute','edit','manage'].includes(grant?.role),edit:['edit','manage'].includes(grant?.role),manage:grant?.role==='manage',export:Boolean(grant?.can_export),pair:false,owner:false};
}
export async function permission(env,user,section){
 const pair=await env.DB.prepare('SELECT role FROM hq_pair WHERE user_id=?').bind(user.id).first();
 const grant=!pair&&['family','menus','plans'].includes(section)?await env.DB.prepare('SELECT role,can_export FROM hq_grants WHERE user_id=? AND section=?').bind(user.id,section).first():null;
 return accessFromRows(pair,grant,section);
}
/** Fresh snapshot for navigation only. Record endpoints enforce access independently. */
export async function permissionsForUser(env,user){
 const pair=await env.DB.prepare('SELECT role FROM hq_pair WHERE user_id=?').bind(user.id).first();
 const grants=pair?[]:await queryAll(env.DB,'SELECT section,role,can_export FROM hq_grants WHERE user_id=?',user.id);
 const bySection=new Map(grants.map(row=>[row.section,row]));
 return Object.fromEntries(SECTIONS.map(section=>[section,accessFromRows(pair,bySection.get(section),section)]));
}
'''+s[b:];p.write_text(s)
p=r/'src/hq/handler.mjs';s=p.read_text();a=s.index('import {importLegacy,');b=s.index('import {backupApi}',a);s=s[:a]+"import {migrate} from './readiness.mjs';\n"+s[b:]
s=s.replace('legacyPair,permission,requireAccess','legacyPair,permission,permissionsForUser,requireAccess');a=s.index('async function me(');b=s.index('async function changeGrant',a);old=s[a:b];result=old[old.index('return {'):]
s=s[:a]+'''async function me(env,user){
 const [access,prefs,identity]=await Promise.all([
  permissionsForUser(env,user),
  env.DB.prepare('SELECT revision,data FROM hq_prefs WHERE user_id=?').bind(user.id).first(),
  env.DB.prepare('SELECT email,verified,pending_email FROM hq_identity WHERE user_id=?').bind(user.id).first()
 ]);
 '''+result+s[b:];p.write_text(s)
modules={'forms':['recordForm'],'views':['collectionView','recordView','familyView','scrapbookView','plansView','homeView'],'trips':['tripsView'],'settings':['settingsView','adminView','accessView'],'images':['imagesView','imageView'],'shop':['shopView'],'adults':['adultsView']}
text='/** Load only the selected feature; browser import caching deduplicates downloads. */\n'
for mod,names in modules.items():
 for name in names:text+=f"export const {name} = async (...args)=>(await import('./{mod}.mjs')).{name}(...args);\n"
(r/'public/hq/lazy-views.mjs').write_text(text)
p=r/'public/hq/app.mjs';s=p.read_text();a=s.index('import {recordForm}');b=s.index('const translations=',a);s=s[:a]+"import {"+','.join(n for names in modules.values() for n in names)+"} from './lazy-views.mjs';\n"+s[b:];p.write_text(s)
p=r/'public/hq/forms.mjs';s=p.read_text();match=re.search(r'export function titleOf\(r\)\{[^\n]+\}',s);(r/'public/hq/record-title.mjs').write_text(match.group()+'\n');s=s[:match.start()]+"export {titleOf} from './record-title.mjs';"+s[match.end():];p.write_text("import {titleOf} from './record-title.mjs';\n"+s)
p=r/'public/hq/views.mjs';p.write_text(p.read_text().replace("import {titleOf} from './forms.mjs';","import {titleOf} from './record-title.mjs';"))
p=r/'public/home.js';s=p.read_text().replace("io.observe(shop);}if('requestIdleCallback'in window)","io.observe(shop);}else if('requestIdleCallback'in window)");s=s.replace("if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});","if('serviceWorker'in navigator){const register=()=>navigator.serviceWorker.register('/sw.js').catch(()=>{});if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});}");p.write_text(s)
shared=[r/'public/index.html',r/'public/account.html',r/'public/hub/index.html',r/'public/games/index.html',r/'public/home.js',r/'public/sw.js',r/'src/hq/core.mjs']+list((r/'public/hq').glob('*.mjs'))+list((r/'public/hq').glob('*.css'))+[r/'public/hq/index.html']+list((r/'public/menus').rglob('*.html'))
for p in shared:p.write_text(p.read_text().replace('7.4.2','7.4.4').replace('7.4.3','7.4.4').replace('2026.09.29-causeway-photo.1','2026.10.01-speed-icons.1').replace('duck-bear-hq-v7-4-2-causeway-photo','duck-bear-hq-v7-4-4-speed-icons'))
for name in ['package.json','package-lock.json']:
 p=r/name;d=json.loads(p.read_text());d['version']='7.4.4'
 if name=='package-lock.json':d['packages']['']['version']='7.4.4'
 p.write_text(json.dumps(d,indent=2)+'\n')
p=r/'public/index.html';s=p.read_text().replace('href="/hq/sketch-world.svg?v=7.4.4"','href="/hq/causeway-v1-768.webp" imagesrcset="/hq/causeway-v1-480.webp 480w, /hq/causeway-v1-768.webp 768w" imagesizes="(max-width: 800px) 94vw, 48vw"');s=s.replace('src="/hq/sketch-world.svg?v=7.4.4"','src="/hq/causeway-v1-768.webp" srcset="/hq/causeway-v1-480.webp 480w, /hq/causeway-v1-768.webp 768w" sizes="(max-width: 800px) 94vw, 48vw"').replace('width="680" height="490"','width="768" height="576"');p.write_text(s)
p=r/'public/hq/app.mjs';s=p.read_text().replace('src="/hq/sketch-world.svg?v=7.4.4"','src="/hq/causeway-v1-768.webp" srcset="/hq/causeway-v1-480.webp 480w, /hq/causeway-v1-768.webp 768w" sizes="(max-width: 800px) 94vw, 480px" decoding="async"').replace('width="680" height="490"','width="768" height="576"');p.write_text(s)
p=r/'public/hq/views.mjs';s=p.read_text().replace('src="/hq/sketch-world.svg?v=7.4.4"','src="/hq/causeway-v1-768.webp" srcset="/hq/causeway-v1-480.webp 480w, /hq/causeway-v1-768.webp 768w" sizes="(max-width: 800px) 94vw, 480px" width="768" height="576"');p.write_text(s)
p=r/'public/hq/sketch.css';p.write_text(p.read_text().replace("url('/hq/sketch-world.svg') 51% 53%/128px 96px no-repeat","url('/assets/causeway-v1-mark.webp') center/cover no-repeat"))
icon='<link rel="icon" href="/assets/causeway-v1-32.png" type="image/png" sizes="32x32"><link rel="icon" href="/favicon.ico?v=7.4.4" sizes="any"><link rel="apple-touch-icon" href="/assets/causeway-v1-180.png" sizes="180x180">'
shells=[r/'public/index.html',r/'public/hq/index.html',r/'public/games/index.html',r/'public/account.html',r/'public/hub/index.html']+list((r/'public/menus').rglob('*.html'))
for p in shells:
 s=re.sub(r'<link\b(?=[^>]*rel="(?:icon|apple-touch-icon)")[^>]*>','',p.read_text());s=s.replace('</head>',icon+'</head>');s=re.sub(r'href="/manifest.webmanifest(?:\?[^\"]*)?"','href="/manifest.webmanifest?v=7.4.4"',s)
 if 'rel="manifest"' not in s:s=s.replace('</head>','<link rel="manifest" href="/manifest.webmanifest?v=7.4.4"></head>')
 p.write_text(s)
p=r/'src/hq/extras.mjs';s=re.sub(r'<link\b(?=[^>]*rel="icon")[^>]*>','',p.read_text());p.write_text(s.replace('</head>',icon+'<link rel="manifest" href="/manifest.webmanifest?v=${VERSION}"></head>'))
p=r/'public/manifest.webmanifest';d=json.loads(p.read_text());d.update(name='Duck & Bear',short_name='Duck & Bear',start_url='/',background_color='#fff9ed',theme_color='#fff9ed',description='Games, good food, small adventures and a private home for our memories.');d['icons']=[{'src':f'/assets/causeway-v1-{n}.png','sizes':f'{n}x{n}','type':'image/png','purpose':'any'} for n in (192,512)];p.write_text(json.dumps(d,indent=2)+'\n')
for name in ['tests/sketch-theme.test.mjs','tests/site-menu-experience.test.mjs','tests/site-browser.py']:
 p=r/name;s=p.read_text().replace('7.4.2','7.4.4').replace(r'7\.4\.2',r'7\.4\.4');s=s.replace(r'href="\/hq\/sketch-world\.svg\?v=7\.4\.4"',r'href="\/hq\/causeway-v1-768\.webp"');p.write_text(s)
p=r/'scripts/site-live-verify.mjs';s=p.read_text().replace("html.includes('/hq/sketch-world.svg?v='+VERSION)","html.includes('/hq/causeway-v1-768.webp')&&html.includes('/assets/causeway-v1-32.png')");needle=" const auth=await get('/api/hq/auth/status');"
extra=''' for(const path of ['/favicon.ico','/assets/causeway-v1-32.png','/assets/causeway-v1-180.png','/assets/causeway-v1-192.png','/assets/causeway-v1-512.png','/hq/causeway-v1-480.webp','/hq/causeway-v1-768.webp']){
  const r=await get(path);assert.equal(r.status,200,path);
  assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(await readFile('public'+path)),path+' binary SHA-256');
  report.checks.push(path+' matches the released artwork');
 }
 const manifest=await get('/manifest.webmanifest?v='+VERSION);assert.equal(manifest.status,200);
 assert.deepEqual(await manifest.json(),JSON.parse(await readFile('public/manifest.webmanifest','utf8')));
 report.checks.push('Installed app manifest matches the new Causeway icons');
'''
assert needle in s;p.write_text(s.replace(needle,extra+needle))
p=r/'public/_headers';p.write_text(p.read_text()+'''\n# Artwork filenames are release-versioned and must never be overwritten in place.
/assets/causeway-v1-*
  Cache-Control: public, max-age=31536000, immutable

/hq/causeway-v1-*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: no-cache
''')
p=r/'public/sw.js';p.write_text(p.read_text().replace("'/hq/duck-bear.svg','/assets/icon.svg'","'/assets/causeway-v1-32.png'"))
p=r/'public/hq/settings.mjs';s=p.read_text().replace('<article class="panel"><h2>29 September 2026 · Faster menus','<article class="panel"><h2>1 October 2026 · A lighter, quicker Duck &amp; Bear</h2><p>The site icon and phone home-screen icon now use our Giant’s Causeway artwork. Pages load only the code for the section you open, completed imports are checked once, and account permissions are read together without caching private access. Smaller responsive artwork and reusable public images reduce repeat downloads. The homepage gift shop loads as you approach it.</p><h2>29 September 2026 · Faster menus');p.write_text(s)
