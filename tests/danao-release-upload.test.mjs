import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHandler} from '../src/game-routes.js';

const fallback={fetch:()=>new Response('fallback',{status:418})};
const handler=createGameHandler({assets:new Map(),fallback});
const commit='a'.repeat(40);

function makeEnv(){
 const writes=[];
 return {
  writes,
  MEDIA:{
   put:async(key,body,options)=>{
    writes.push({key,body:await new Response(body).text(),options});
   }
  }
 };
}

function githubFetch({mainSha=commit,runOverrides={}}={}){
 return async input=>{
  const url=String(input);
  if(url.endsWith('/actions/runs/123')){
   return new Response(JSON.stringify({
    id:123,
    event:'push',
    status:'in_progress',
    head_branch:'main',
    head_sha:commit,
    path:'.github/workflows/danao-release.yml',
    repository:{full_name:'chambersbtap/duck-bear-hq'},
    ...runOverrides
   }),{status:200,headers:{'content-type':'application/json'}});
  }
  if(url.endsWith('/commits/main')){
   return new Response(JSON.stringify({sha:mainSha}),{status:200,headers:{'content-type':'application/json'}});
  }
  return new Response('not found',{status:404});
 };
}

function uploadRequest(name='Danao.loader.js',headers={}){
 return new Request(`https://duck.test/api/danao/release/${name}`,{
  method:'PUT',
  headers:{
   authorization:'Bearer short-lived-github-token',
   'x-danao-run-id':'123',
   'x-danao-commit':commit,
   'content-type':'application/javascript',
   ...headers
  },
  body:'loader-bytes'
 });
}

test('Danao release health endpoint is public so CI can wait for the new Worker deployment',async()=>{
 const response=await handler.fetch(new Request('https://duck.test/api/danao/release/health'),makeEnv(),{});
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ok:true,auth:'github-actions'});
});

test('Danao release upload accepts a verified current-main workflow run and writes only the named current WebGL object',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=githubFetch();
 try{
  const env=makeEnv();
  const response=await handler.fetch(uploadRequest(),env,{});
  assert.equal(response.status,201);
  assert.deepEqual(await response.json(),{ok:true,file:'Danao.loader.js',commit});
  assert.equal(env.writes.length,1);
  assert.equal(env.writes[0].key,'danao/web/current/Danao.loader.js');
  assert.equal(env.writes[0].body,'loader-bytes');
  assert.equal(env.writes[0].options?.httpMetadata?.contentType,'application/javascript; charset=utf-8');
  assert.equal(env.writes[0].options?.customMetadata?.commit,commit);
  assert.equal(env.writes[0].options?.customMetadata?.runId,'123');
 }finally{globalThis.fetch=previous;}
});

test('Danao release upload rejects missing GitHub authentication, stale commits and unapproved filenames',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=githubFetch({mainSha:'b'.repeat(40)});
 try{
  const unauth=await handler.fetch(uploadRequest('Danao.loader.js',{authorization:''}),makeEnv(),{});
  assert.equal(unauth.status,401);

  const staleEnv=makeEnv();
  const stale=await handler.fetch(uploadRequest(),staleEnv,{});
  assert.equal(stale.status,409);
  assert.equal(staleEnv.writes.length,0);

  const blockedEnv=makeEnv();
  const blocked=await handler.fetch(uploadRequest('secret.txt'),blockedEnv,{});
  assert.equal(blocked.status,404);
  assert.equal(blockedEnv.writes.length,0);
 }finally{globalThis.fetch=previous;}
});
