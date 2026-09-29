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
const expected=hash(await readFile('public/hq/app.mjs','utf8'));
let ready=false;
for(let i=0;i<20;i++){
 try{const r=await get('/hq/app.mjs?release='+BUILD);if(r.status===200&&hash(await r.text())===expected){ready=true;break;}}catch{}
 await new Promise(resolve=>setTimeout(resolve,2000));
}
assert.ok(ready,'Deployed application on guannan.party does not match the released source');
report.checks.push('Application SHA-256 matches the released source on guannan.party');
const home=await get('/');assert.equal(home.status,200);const html=await home.text();
assert.ok(html.includes('Website '+VERSION));assert.ok(html.includes('/hq/sketch.css'));
report.checks.push('Homepage reports Website '+VERSION+' and loads the shared sketch design');
for(const path of ['/info/','/info/index.html','/about/','/about/index.html']){
 const r=await get(path);assert.equal(r.status,302,path);assert.ok(r.headers.get('location')?.startsWith('/sign-in/'),path);
 report.checks.push(path+' redirects signed-out visitors to sign-in');
}
for(const path of ['/api/hq/me','/api/hq/records?kind=memory','/api/hq/records?kind=person','/api/hq/passkeys','/api/hq/admin/users','/api/hq/admin/email']){
 const r=await get(path);assert.equal(r.status,401,path);report.checks.push(path+' denies unauthenticated access');
}
for(const path of ['/sign-in/','/menus/','/menus/archive/','/games/']){
 const r=await get(path);assert.equal(r.status,200,path);assert.ok((await r.text()).includes('/hq/sketch.css'),path+' uses shared design');
 report.checks.push(path+' is reachable and uses the shared design');
}
for(const path of ['/hq/sketch.css','/hq/sketch.mjs','/hq/sketch-world.svg','/hq/lettering.css','/hq/art-family.svg','/hq/art-scrapbook.svg','/hq/art-info.svg','/hq/passkeys.mjs','/hq/account-admin.mjs']){
 const r=await get(path+'?release='+BUILD);assert.equal(r.status,200,path);
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
report.checkedAt=new Date().toISOString();
await writeFile('site-live-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
