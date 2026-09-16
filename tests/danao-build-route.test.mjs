import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHandler} from '../src/game-routes.js';

const fallback={fetch:()=>new Response('fallback',{status:418})};
const handler=createGameHandler({assets:new Map(),fallback});
function envWith(body){return {MEDIA:{get:async key=>key==='danao/web/current/Danao.loader.js'?{body:new TextEncoder().encode(body),httpEtag:'"etag"'}:null}};}

test('Danao Unity build objects are served only from the dedicated R2 prefix',async()=>{
 const response=await handler.fetch(new Request('https://duck.test/game-builds/danao/web/current/Danao.loader.js'),envWith('loader'),{});
 assert.equal(response.status,200);assert.equal(await response.text(),'loader');assert.match(response.headers.get('content-type'),/javascript/);assert.match(response.headers.get('cache-control'),/public/);
});

test('missing Danao build object is a clean 404 and unrelated build paths stay private',async()=>{
 const missing=await handler.fetch(new Request('https://duck.test/game-builds/danao/web/current/missing.wasm'),envWith('x'),{});assert.equal(missing.status,404);
 const blocked=await handler.fetch(new Request('https://duck.test/game-builds/other/secret.txt'),envWith('x'),{});assert.equal(blocked.status,418);
});
