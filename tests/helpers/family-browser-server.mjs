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
 {key:'root',kind:'person',data:{name:'Example Main Person',isRoot:true,birth:'1990-10-11',birthPlaceId:'@place',evidence:'family'}},
 {key:'parent',kind:'person',data:{name:'Example Adoptive Parent',birth:'1962',evidence:'family'}},
 {key:'relation',kind:'relationship',data:{from:'@parent',to:'@root',type:'adoptive-parent',evidence:'family'}},
 {key:'event',kind:'lifeEvent',data:{personId:'@root',title:'Joined example employer',eventType:'career',start:'2010-01',placeId:'@place',sourceIds:['@source'],evidence:'family'}},
 {key:'private',kind:'familyPrivate',data:{personId:'@root',address:'SYNTHETIC-HOUSEHOLD-ONLY',birth:'Private date'}}
]};
const p=await previewFamilyImport(f.env,owner,payload);await applyFamilyImport(f.env,owner,payload,{signature:p.signature});
await f.env.DB.prepare("INSERT INTO hq_grants(user_id,section,role,can_export,updated_by,updated_at) VALUES('guest','family','read',0,'owner','2026-10-03')").run();
const root=resolve('public');const mime={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
f.env.ASSETS={async fetch(request){const pathname=decodeURIComponent(new URL(request.url).pathname),file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root+'/'))return new Response('Forbidden',{status:403});try{return new Response(await readFile(file),{headers:{'content-type':mime[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}};
const handler=createHqHandler({fetch:(r,e)=>e.ASSETS.fetch(r)});
const server=createServer(async(req,res)=>{try{const parts=[];for await(const x of req)parts.push(x);const headers=new Headers(req.headers);if(headers.has('origin'))headers.set('origin',ORIGIN);headers.set('CF-Connecting-IP','192.0.2.11');const request=new Request(ORIGIN+req.url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(parts),duplex:'half'}:{})});const response=await handler.fetch(request,f.env,{waitUntil:()=>{}});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Local acceptance server error');}});
server.listen(8793,'127.0.0.1',()=>console.log('Synthetic family acceptance server ready'));
process.on('SIGTERM',()=>{server.close();f.close();process.exit(0);});
