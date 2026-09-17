import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const game=await readFile(new URL('../unity/danao/Assets/Danao/Runtime/DanaoGame.cs',import.meta.url),'utf8');

const stages=[
  'backdrop-root-ready',
  'backdrop-floor-ready',
  'backdrop-shader-ready',
  'backdrop-material-ready',
  'backdrop-light-ready',
  'backdrop-camera-ready'
];

test('Danao WebGL backdrop exposes ordered boot checkpoints around render setup',()=>{
  let cursor=-1;
  for(const stage of stages){
    const marker=`DanaoBootDebug.Mark(\"${stage}\")`;
    const next=game.indexOf(marker);
    assert.ok(next>cursor,`missing or out-of-order boot checkpoint: ${stage}`);
    cursor=next;
  }
});
