import test from 'node:test';
import assert from 'node:assert/strict';
import {environment} from './fixtures.mjs';
import {testHandler} from './api.test.mjs';

// Cloudflare applies html_handling to ASSETS.fetch as well as incoming asset requests.
// Its default redirects /folder/index.html, while /folder/ serves the actual index.
test('Books retrieves the canonical asset directory instead of returning a blank index redirect',async()=>{
 const {env}=await environment(),seen=[];
 env.ASSETS={fetch:async request=>{
  const path=new URL(request.url).pathname;seen.push(path);
  if(path==='/books/index.html')return new Response(null,{status:307,headers:{location:'/books/'}});
  if(path==='/books/')return new Response('<!doctype html><title>Books fixture</title>',{headers:{'content-type':'text/html'}});
  return new Response('Not found',{status:404});
 }};
 try{
  for(const path of ['/books/','/books/index.html','/books/?read=synthetic-book&file=synthetic-file']){
   const r=await testHandler().fetch(new Request('https://guannan.party'+path,{headers:{'x-test-user':'zachary'}}),env,{});
   assert.equal(r.status,200,path+' should return the reader shell, not an asset redirect');
   assert.match(await r.text(),/<title>Books fixture<\/title>/);
   assert.match(r.headers.get('cache-control'),/private.*no-store/);
  }
  assert.deepEqual(seen,['/books/','/books/','/books/']);
 }finally{env.DB.close();}
});
