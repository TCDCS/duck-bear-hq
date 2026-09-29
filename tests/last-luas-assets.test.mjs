import test from 'node:test';import assert from 'node:assert/strict';import {loadBrands,BRAND_FILES,ASSET_SET} from '../public/games/last-luas/inked/assets.mjs';
test('four genuine identity records have pinned distinct SHA256 values',()=>{assert.equal(BRAND_FILES.length,4);assert.equal(new Set(BRAND_FILES.map(a=>a[2])).size,4);for(const a of BRAND_FILES)assert.match(a[2],/^[0-9a-f]{64}$/);assert.equal(ASSET_SET,'inked-20260919-a');});
for(const [name,status,type,body,message] of [
 ['expired session',401,'application/json','{}',/session has ended/],
 ['another account',403,'application/json','{}',/session has ended/],
 ['missing image',404,'application/json','{}',/did not load/],
 ['SPA HTML pretending to be an image',200,'text/html','<h1>Home</h1>',/wrong file type/],
 ['changed image bytes',200,'image/png','not-the-approved-bytes',/version does not match/]
])test(name+' prevents a falsely complete art pack',async()=>{const old=globalThis.fetch;globalThis.fetch=async u=>new Response(body,{status,headers:{'Content-Type':name==='changed image bytes'?(u.includes('.svg')?'image/svg+xml':'image/png'):type}});try{await assert.rejects(loadBrands(),message);}finally{globalThis.fetch=old;}});
