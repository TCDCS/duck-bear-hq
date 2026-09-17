import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const launcher=await readFile(new URL('../public/games/danao/launcher.mjs',import.meta.url),'utf8');

test('Danao launcher captures Unity printErr output and uses it when startup rejects without detail',()=>{
  assert.match(launcher,/let\s+unityInstance=null,starting=false,lastUnityError=['"][\s\S]*?['"]/);
  assert.match(launcher,/printErr:\s*message=>\{lastUnityError=String\(message\|\|['"]['"]\)/);
  assert.match(launcher,/showFatal\(detail\|\|lastUnityError\|\|/);
});
