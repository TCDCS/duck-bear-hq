import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,call} from './helpers/hq-fixture.mjs';
import {createHqHandler} from '../src/hq/handler.mjs';
const handler=createHqHandler({fetch:async()=>new Response('legacy')});
test('backup preview rejects executable recipe links and nested history links',async()=>{
 const f=await fixture();try{await call(handler,f.env,'/api/hq/me');
 const row={id:'unsafe-recipe',kind:'recipe',section:'menus',revision:1,data:{title:'Recipe',link:'javascript:alert(1)'},createdAt:'2026-09-29',updatedAt:'2026-09-29'};
 const manifest={format:'duck-bear-hq',version:1,records:[row],revisions:[],assets:[]};
 assert.equal((await call(handler,f.env,'/api/hq/restore/preview',{method:'POST',body:{manifest}})).status,400);
 row.data.link='https://example.com/recipe';
 assert.equal((await call(handler,f.env,'/api/hq/restore/preview',{method:'POST',body:{manifest}})).status,200);
 manifest.revisions=[{record_id:row.id,revision:1,data:JSON.stringify({title:'Unsafe old copy',link:'data:text/html,unsafe'})}];
 assert.equal((await call(handler,f.env,'/api/hq/restore/preview',{method:'POST',body:{manifest}})).status,400);
 }finally{f.close();}
});
