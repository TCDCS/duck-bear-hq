import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const launcher=await readFile(new URL('../public/games/danao/launcher.mjs',import.meta.url),'utf8');

test('Danao launcher records fatal detail in the URL only when debug mode is requested',()=>{
  assert.match(launcher,/searchParams\.has\(['"]debug['"]\)/);
  assert.match(launcher,/hash=`danao-error=\$\{encodeURIComponent\(/);
  assert.match(launcher,/history\.replaceState/);
});
