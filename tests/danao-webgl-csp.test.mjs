import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHandler} from '../src/game-routes.js';

test('Danao launcher permits WebAssembly compilation without enabling general JavaScript eval', async()=>{
  const fallback={fetch:async()=>new Response('<!doctype html><title>Danao</title>',{
    headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; script-src 'self'; object-src 'none'"}
  })};
  const handler=createGameHandler({assets:new Map(),fallback});
  const response=await handler.fetch(new Request('https://duck.test/games/danao/'),{},{});
  const policy=response.headers.get('content-security-policy')||'';
  assert.match(policy,/script-src[^;]*'wasm-unsafe-eval'/);
  assert.doesNotMatch(policy,/(?:^|\s)'unsafe-eval'(?:\s|;|$)/);
});
