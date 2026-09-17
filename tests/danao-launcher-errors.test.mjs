import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const launcher=await readFile(new URL('../public/games/danao/launcher.mjs',import.meta.url),'utf8');

test('Danao launcher preserves Unity string startup errors instead of replacing them with a generic message',()=>{
  assert.match(launcher,/typeof\s+err\s*===\s*['"]string['"]\s*\?\s*err/);
  assert.match(launcher,/showFatal\(detail\s*\|\|/);
});
