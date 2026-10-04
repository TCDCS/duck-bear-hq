/** LOCAL TEST HARNESS ONLY. Binds loopback; never deploy this server. */
import http from 'node:http';import {readFile} from 'node:fs/promises';import {writeFileSync} from 'node:fs';import {resolve,extname} from 'node:path';
import {makeD1,makeR2} from './sqlite.mjs';import {createBooksHandler} from '../../src/books/handler.mjs';
const root=resolve('public'),port=Number(process.env.BOOKS_TEST_PORT||8788);
const USERS={zachary:{id:'test-zachary',display_name:'Zachary',session_id:'test-session-1'},guannan:{id:'test-guannan',display_name:'Guannan',session_id:'test-session-2'}};
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain','.wasm':'application/wasm'};
const assets={async fetch(r){let name=decodeURIComponent(new URL(r.url).pathname);const path=resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));if(!path.startsWith(root+'/'))return new Response('Not found',{status:404});try{const bytes=await readFile(path);return new Response(bytes,{headers:{'content-type':mime[extname(path)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}};
const env={DB:makeD1(),MEDIA:makeR2(),ASSETS:assets,BOOKS_ENABLED:'true',SITE_ORIGIN:`http://127.0.0.1:${port}`};
const app=createBooksHandler(assets,{authenticate:async r=>USERS[(r.headers.get('cookie')||'').match(/(?:^|;\s*)test_reader=(\w+)/)?.[1]]||null,requirePair:async()=>{},requireOwner:async(_e,u)=>{if(u.id!==USERS.zachary.id)throw Object.assign(new Error('Administrator only'),{status:403});},readerIds:async()=>Object.values(USERS).map(u=>u.id),isOwner:async(_e,u)=>u.id===USERS.zachary.id});
// One-shot fault belongs to this loopback fixture, never the production handler.
let restoreUploadFaults=process.env.BOOKS_TEST_FAIL_RESTORE_UPLOAD_ONCE==='1'?1:0;
function restoreUploadFault(request){
 const u=new URL(request.url),reader=(request.headers.get('cookie')||'').match(/(?:^|;\s*)test_reader=(\w+)/)?.[1];
 if(!restoreUploadFaults||request.method!=='PUT'||!/^\/api\/hq\/books\/restore\/[\w-]+\/files\/[\w-]+$/.test(u.pathname)||reader!=='zachary'||request.headers.get('origin')!==env.SITE_ORIGIN)return null;
 restoreUploadFaults--;console.log('Books test restore upload failure injected');
 return Response.json({error:'Synthetic retryable upload interruption.'},{status:503,headers:{'cache-control':'no-store'}});
}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,env.SITE_ORIGIN);const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(u,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const response=restoreUploadFault(request)||await app.fetch(request,env,{});res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)for await(const chunk of response.body)res.write(chunk);res.end();}catch(e){console.error(e);res.writeHead(500);res.end('Local harness error');}}).listen(port,'127.0.0.1',()=>console.log('Books test server '+env.SITE_ORIGIN));

// Test-only transport outage: keep the in-memory database alive while the listener is closed.
writeFileSync(resolve('verification',`books-test-server-${port}.pid`),String(process.pid));
let outage=false,heartbeat;
process.on('SIGUSR1',()=>{if(outage)return;outage=true;heartbeat=setInterval(()=>{},1000);server.close();server.closeAllConnections();});
process.on('SIGUSR2',()=>{if(!outage)return;outage=false;server.listen(port,'127.0.0.1',()=>{clearInterval(heartbeat);console.log('Books test transport restored');});});
