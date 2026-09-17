import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const runtime=fileURLToPath(new URL('../unity/danao/Assets/Danao/Runtime/',import.meta.url));

async function csFiles(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  const files=[];
  for(const entry of entries){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...await csFiles(full));
    else if(entry.isFile()&&entry.name.endsWith('.cs')) files.push(full);
  }
  return files;
}

test('Danao procedural visuals do not depend on runtime Shader.Find lookups',async()=>{
  const offenders=[];
  for(const file of await csFiles(runtime)){
    const source=await readFile(file,'utf8');
    if(/Shader\.Find\s*\(/.test(source)||/new\s+Material\s*\(\s*shader\s*\)/.test(source)) offenders.push(path.relative(runtime,file));
  }
  assert.deepEqual(offenders,[],`runtime shader lookups can be stripped or mismatch the WebGL render pipeline: ${offenders.join(', ')}`);
});
