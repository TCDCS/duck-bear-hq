/** Local-only browser acceptance server. Synthetic data; no production credentials. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fixture,ORIGIN} from './hq-fixture.mjs';
import {initialise} from '../../src/hq/schema.mjs';
import {previewFamilyImport,applyFamilyImport} from '../../src/hq/family-import.mjs';
import {createHqHandler} from '../../src/hq/handler.mjs';
const f=await fixture(),owner={id:'owner',role:'admin'};
await initialise(f.env,owner);
const payload={format:'duck-bear-family',version:1,namespace:'browser',records:[
 {key:'source',kind:'familySource',data:{title:'Synthetic family account',sourceType:'family',evidence:'family'}},
 {key:'place',kind:'familyPlace',data:{title:'Example town',locality:'Example',latitude:53,longitude:-6,precision:'town',mapQuery:'Dublin Ireland'}},
 {key:'root',kind:'person',data:{name:'Example Main Person',isRoot:true,nameOriginal:'أحمد',nameMeaning:'An example name note.',storybookText:'Our family remembers days together.',storyMapPlace:'Example story town',storyMapNote:'A place from a family story, not a recorded birthplace.',birth:'1990-10-11',birthPlaceId:'@place',birthPlace:'Example town',currentPlace:'Example coast',currentPlaceId:'@current',livingStatus:'living',evidence:'family'}},
 {key:'parent',kind:'person',data:{name:'Example Adoptive Parent',birth:'1932',death:'2019',deathPlaceId:'@death',deathPlace:'Example memorial town',currentPlaceId:'@old',livingStatus:'deceased',evidence:'family'}},
 {key:'relation',kind:'relationship',data:{from:'@parent',to:'@father',type:'adoptive-parent',evidence:'family'}},
 {key:'event',kind:'lifeEvent',data:{personId:'@root',title:'Joined example employer',eventType:'career',start:'2010-01',placeId:'@place',sourceIds:['@source'],evidence:'family'}},
 {key:'private',kind:'familyPrivate',data:{personId:'@root',address:'SYNTHETIC-HOUSEHOLD-ONLY',birth:'Private date',religion:'Example recorded faith',religionContext:'personal',allergies:['SYNTHETIC-ALLERGEN']}}
]};
// Broad synthetic graph, including multiple parent sets and unrelated catalogue places.
for(const [key,title,lat,lon]of [['current','Example coast',51,-1],['death','Example memorial town',52,-2],['office','Office only',50,5],['venue','Wedding venue only',48,2],['old','Historic home only',55,-3],['unused','Unlinked place only',40,10]])payload.records.push({key,kind:'familyPlace',data:{title,latitude:lat,longitude:lon,precision:'town'}});
for(const [key,name,birth]of [['mother','Morgan Rowan','1964'],['father','Jordan Rowan','1962'],['bio-grandma','Avery Rowan','1940'],['bio-grandpa','Taylor Rowan','1939'],['adopt-grandma','Casey Rowan','1933'],['spouse','Jamie Rowan','1991'],['partner-now','Robin Ash','1990'],['child-one','Sam Rowan','2020'],['child-two','Charlie Rowan','2023'],['sibling','Cameron Rowan','1994'],['friend','Example Wedding Witness','1988'],['aunt','Example Aunt','1966'],['cousin','Example Cousin','1995'],['great','Example Earlier Ancestor','1900']])payload.records.push({key,kind:'person',data:{name,birth,evidence:'family',...(key==='friend'?{entityType:'associate'}:{})}});
for(const [from,to,type]of [['mother','root','parent'],['father','root','parent'],['bio-grandma','father','parent'],['bio-grandpa','father','parent'],['adopt-grandma','father','adoptive-parent'],['root','spouse','former-partner'],['root','partner-now','partner'],['root','child-one','parent'],['spouse','child-one','parent'],['root','child-two','parent'],['spouse','child-two','parent'],['mother','sibling','parent'],['father','sibling','parent'],['root','friend','witness'],['bio-grandma','aunt','parent'],['aunt','cousin','parent'],['great','bio-grandma','parent']])payload.records.push({key:from+'-'+to,kind:'relationship',data:{from:'@'+from,to:'@'+to,type,evidence:'family'}});
for(const [key,title,eventType,placeId]of [['award','Won example prize','achievement','office'],['wedding','Family wedding','marriage','venue'],['old-home','Old residence','residence','old']])payload.records.push({key,kind:'lifeEvent',data:{personId:'@root',title,eventType,placeId:'@'+placeId,start:'2015',evidence:'family'}});
const p=await previewFamilyImport(f.env,owner,payload);await applyFamilyImport(f.env,owner,payload,{signature:p.signature});
await f.env.DB.prepare("INSERT INTO hq_grants(user_id,section,role,can_export,updated_by,updated_at) VALUES('guest','family','read',0,'owner','2026-10-03')").run();
const root=resolve('public');const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
f.env.ASSETS={async fetch(request){const pathname=decodeURIComponent(new URL(request.url).pathname),file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root+'/'))return new Response('Forbidden',{status:403});try{return new Response(await readFile(file),{headers:{'content-type':mime[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}};
const handler=createHqHandler({fetch:(r,e)=>e.ASSETS.fetch(r)});
const server=createServer(async(req,res)=>{try{const parts=[];for await(const x of req)parts.push(x);const headers=new Headers(req.headers);if(headers.has('origin'))headers.set('origin',ORIGIN);headers.set('CF-Connecting-IP','192.0.2.11');const request=new Request(ORIGIN+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts),duplex:'half'}:{})});const response=await handler.fetch(request,f.env,{waitUntil:()=>{}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local acceptance server error');}});
server.listen(8793,'127.0.0.1',()=>console.log('Synthetic family acceptance server ready'));
process.on('SIGTERM',()=>{server.close();f.close();process.exit(0);});
