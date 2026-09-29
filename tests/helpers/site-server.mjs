// Local-only acceptance fixture. Never deployed. Uses actual Worker handlers,
// real SQLite and an in-memory R2 adapter; no production data or secrets.
import {createServer} from 'node:http';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fixture} from './site-env.mjs';
import worker from '../../src/index.js';
const {env}=await fixture();
const root=resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
env.ASSETS.fetch=async request=>{
 let path=decodeURIComponent(new URL(request.url).pathname);if(path==='/account')path='/account.html';
 if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+'/')||!existsSync(file)||!statSync(file).isFile())return new Response('Not found',{status:404});
 return new Response(readFileSync(file),{headers:{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}});
};
const server=createServer(async(req,res)=>{try{
 const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const origin='http://'+req.headers.host;
 if(req.url==='/api/public/catalogue'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({products:[]}));return;}
 if(req.url==='/api/public/session'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({signedIn:Boolean(req.headers.cookie)}));return;}
 const response=await worker.fetch(new Request(origin+req.url,{method:req.method,headers:req.headers,...(body.length?{body,duplex:'half'}:{})}),env);
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Fixture error');}
});
server.listen(Number(process.env.PORT||8765),'127.0.0.1',()=>console.log('Site 1 acceptance fixture ready'));
