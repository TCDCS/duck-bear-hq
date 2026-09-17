import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHandler} from '../src/game-routes.js';

const baseCsp="default-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'";
const fallback={fetch:()=>new Response('danao page',{headers:{'Content-Security-Policy':baseCsp}})};
const handler=createGameHandler({assets:new Map(),fallback});

test('Danao page CSP permits WebAssembly compilation without enabling general JS eval',async()=>{
  const response=await handler.fetch(new Request('https://duck.test/games/danao/'),{},{});
  const csp=response.headers.get('content-security-policy')||'';
  assert.match(csp,/script-src[^;]*'wasm-unsafe-eval'/);
  assert.doesNotMatch(csp,/(?:^|\s)'unsafe-eval'(?:\s|;|$)/);
});

test('non-Danao fallback responses keep their original CSP',async()=>{
  const response=await handler.fetch(new Request('https://duck.test/account.html'),{},{});
  assert.equal(response.headers.get('content-security-policy'),baseCsp);
});
