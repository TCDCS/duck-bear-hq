import test from 'node:test';
import assert from 'node:assert/strict';
import {routeDanaoMultiplayer} from '../src/danao/gateway.mjs';
const request=(path,method='GET',body=null,origin='https://example.test')=>new Request('https://example.test'+path,{method,headers:{...(origin?{Origin:origin}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});

test('version endpoint is public and reports four-player capacity',async()=>{const r=await routeDanaoMultiplayer(request('/api/danao/version'),{});assert.equal(r.status,200);const j=await r.json();assert.equal(j.maxPlayers,4);});
test('create and join mutations require same origin',async()=>{assert.equal((await routeDanaoMultiplayer(request('/api/danao/create','POST',{name:'x'},'https://evil.test'),{})).status,403);});
test('join validates exact four-digit code before bindings',async()=>{const r=await routeDanaoMultiplayer(request('/api/danao/join','POST',{code:'12',name:'x'}),{});assert.equal(r.status,400);});
test('valid create fails cleanly when Danao room bindings are unavailable',async()=>{const r=await routeDanaoMultiplayer(request('/api/danao/create','POST',{name:'x'}),{});assert.equal(r.status,503);});
