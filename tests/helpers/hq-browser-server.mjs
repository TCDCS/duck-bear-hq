/** Local-only browser fixture. Never imported by the production worker. */
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fixture} from './hq-fixture.mjs';
import {createHqHandler} from '../../src/hq/handler.mjs';
import original from '../../src/index.js';
const port=Number(process.env.PORT||8789),root=resolve('public');
const {env}=await fixture();
env.SITE_ORIGIN='http://127.0.0.1:'+port;
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.webmanifest':'application/manifest+json'};
env.ASSETS.fetch=async request=>{let path=decodeURIComponent(new URL(request.url).pathname),file=resolve(root,'.'+path);if(!file.startsWith(root+'/')&&file!==root)return new Response('Not found',{status:404});try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');return new Response(await readFile(file),{headers:{'content-type':types[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}};
const handler=createHqHandler(original);
http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const data=Buffer.concat(chunks);const request=new Request(env.SITE_ORIGIN+req.url,{method:req.method,headers:{...req.headers,'cf-connecting-ip':'127.0.0.1'},...(data.length?{body:data}:{} )});const response=await handler.fetch(request,env,{waitUntil:()=>{}});res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)for await(const b of response.body)res.write(b);res.end();}catch(e){console.error(e);res.writeHead(500);res.end('Fixture failed');}}).listen(port,'127.0.0.1',()=>console.log('HQ fixture '+env.SITE_ORIGIN));
