import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
const csp=headers.match(/Content-Security-Policy:\s*([^\n]+)/)?.[1]||'';

test('site CSP permits Danao WebAssembly compilation without enabling general JS eval',()=>{
  assert.match(csp,/script-src[^;]*'wasm-unsafe-eval'/);
  assert.doesNotMatch(csp,/(?:^|\s)'unsafe-eval'(?:\s|;|$)/);
});
