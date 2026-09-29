/** Post-deployment checks. No account credentials or private records are used.
 * Passkey option probes create two anonymous five-minute challenges; no credential or session is created.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {VERSION,BUILD} from '../src/hq/core.mjs';

const origin='https://guannan.party';
const legacy='https://duck-bear-hq.zachary-chambers2.workers.dev';
const hash=text=>createHash('sha256').update(text).digest('hex');
const report={origin,version:VERSION,build:BUILD,commit:process.env.GITHUB_SHA,checks:[]};
const get=(path,base=origin)=>fetch(base+path,{redirect:'manual',headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(15000)});
const releasePath=path=>path+(path.includes('?')?'&':'?')+'release='+encodeURIComponent(BUILD);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function waitText(path,predicate,label){
 for(let i=0;i<20;i++){
  try{
   const r=await get(releasePath(path));
   if(r.status===200){
    const text=await r.text();
    if(predicate(text))return text;
   }
  }catch{}
  await sleep(2000);
 }
 assert.fail(label);
}

async function verify(){
 const expected=hash(await readFile('public/hq/app.mjs','utf8'));
 const app=await waitText('/hq/app.mjs',text=>hash(text)===expected,'Deployed application on guannan.party does not match the released source');
 assert.equal(hash(app),expected);
 report.checks.push('Application SHA-256 matches the released source on guannan.party');

 const home=await waitText('/',html=>html.includes('Website '+VERSION)&&html.includes('/hq/sketch.css')&&html.includes('/hq/duck-bear-causeway.webp?v='+VERSION),'Homepage did not reach Website '+VERSION+' during propagation window');
 assert.ok(home.includes('friendly brown bear with a map posing on the Giant’s Causeway'));
 report.checks.push('Homepage reports Website '+VERSION+' and references the supplied Giant’s Causeway artwork');\n const heroResponse=await get(releasePath('/hq/duck-bear-causeway.webp'));assert.equal(heroResponse.status,200,'Causeway artwork');\n assert.match(heroResponse.headers.get('content-type')||'',/^image\\/webp/);\n const liveHero=Buffer.from(await heroResponse.arrayBuffer()),sourceHero=await readFile('public/hq/duck-bear-causeway.webp');\n assert.equal(hash(liveHero),hash(sourceHero),'Causeway artwork hash');\n report.checks.push('Supplied Giant’s Causeway artwork matches the released file SHA-256');

 const menu=await waitText('/menus/',html=>html.includes('Website '+VERSION)&&/\/menus\/meals\/[A-Za-z0-9_-]+\/reviews\//.test(html)&&/class="meal-status (?:served|upcoming)"/.test(html),'Live menu did not expose timed meal statuses and review links');
 report.checks.push('Live menu has real serving review links and Served/Upcoming status');

 for(const path of ['/info/','/info/index.html','/about/','/about/index.html']){
  const r=await get(path);assert.equal(r.status,302,path);assert.ok(r.headers.get('location')?.startsWith('/sign-in/'),path);
  report.checks.push(path+' redirects signed-out visitors to sign-in');
 }
 for(const path of ['/api/hq/me','/api/hq/records?kind=memory','/api/hq/records?kind=person','/api/hq/passkeys','/api/hq/admin/users','/api/hq/admin/email']){
  const r=await get(path);assert.equal(r.status,401,path);report.checks.push(path+' denies unauthenticated access');
 }
 for(const path of ['/sign-in/','/menus/archive/','/games/']){
  const r=await get(path);assert.equal(r.status,200,path);assert.ok((await r.text()).includes('/hq/sketch.css'),path+' uses shared design');
  report.checks.push(path+' is reachable and uses the shared design');
 }
 for(const path of ['/hq/sketch.css','/hq/sketch.mjs','/hq/sketch-world.svg','/hq/lettering.css','/hq/art-family.svg','/hq/art-scrapbook.svg','/hq/art-info.svg','/hq/passkeys.mjs','/hq/account-admin.mjs','/menus/menus.css','/menus/menus.js']){
  const r=await get(releasePath(path));assert.equal(r.status,200,path);
  assert.equal(hash(await r.text()),hash(await readFile('public'+path,'utf8')),path+' source hash');
  report.checks.push(path+' matches the released source');
 }
 const auth=await get('/api/hq/auth/status');assert.equal(auth.status,200);const settings=await auth.json();
 assert.equal(settings.registration,'invite-only');assert.equal(settings.passkeys,true);
 report.passkeysEnabled=settings.passkeys;report.emailConfigured=settings.emailConfigured;
 report.passkeyOrigins=[];
 for(const base of [origin,legacy]){
  const r=await fetch(base+'/api/hq/passkeys/login/options',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
  const data=await r.json();
  if(r.status===503){report.passkeyOrigins.push({origin:base,status:'Needs one existing-account password sign-in before passkeys'});continue;}
  assert.equal(r.status,200,'Passkey options on '+base);assert.equal(data.options?.rpId,new URL(base).hostname);
  report.passkeyOrigins.push({origin:base,rpID:data.options.rpId,status:'verified'});
 }
}

let failure;
try{await verify();report.ok=true;}catch(e){failure=e;report.ok=false;report.error=e?.message||String(e);}finally{
 report.checkedAt=new Date().toISOString();
 await writeFile('site-live-verification.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}
if(failure)throw failure;
