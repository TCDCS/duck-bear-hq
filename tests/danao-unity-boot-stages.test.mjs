import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const bootstrap=await readFile(new URL('../unity/danao/Assets/Danao/Runtime/DanaoBootstrap.cs',import.meta.url),'utf8');
const game=await readFile(new URL('../unity/danao/Assets/Danao/Runtime/DanaoGame.cs',import.meta.url),'utf8');
const webgl=await readFile(new URL('../unity/danao/Assets/Danao/Plugins/WebGL/DanaoWebSocket.jslib',import.meta.url),'utf8');

test('Danao WebGL debug mode exposes Unity boot checkpoints without affecting normal launches',()=>{
  assert.match(bootstrap,/DanaoBootDebug\.Mark\("before-scene"\)/);
  assert.match(bootstrap,/DanaoBootDebug\.Mark\("after-scene"\)/);
  for(const stage of ['awake-start','input-ready','audio-start','audio-ready','room-ready','save-ready','ui-start','ui-ready','backdrop-ready','music-ready','cloud-sync-started','awake-complete']){
    assert.match(game,new RegExp(`DanaoBootDebug\\.Mark\\("${stage}"\\)`),`missing ${stage}`);
  }
  assert.match(webgl,/DanaoDebugMark\s*:\s*function/);
  assert.match(webgl,/danao-unity-debug/);
  assert.match(webgl,/debug[^\n]{0,80}unity/);
});
