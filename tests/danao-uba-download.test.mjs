import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/danao-uba-status.yml'),'utf8');

test('Unity artifact download follows signed file URLs and validates real WebGL payload sizes',()=>{
  assert.match(workflow,/SIGNED_URL/);
  assert.match(workflow,/if type == "string" then \./);
  assert.match(workflow,/stat -c%s/);
  assert.match(workflow,/Danao\.loader\.js[^\n]*10000/s);
  assert.match(workflow,/Danao\.data[^\n]*1000000/s);
  assert.match(workflow,/Danao\.framework\.js[^\n]*100000/s);
  assert.match(workflow,/Danao\.wasm[^\n]*1000000/s);
});

test('successful Windows cloud builds are preserved as a downloadable playable zip',()=>{
  assert.match(workflow,/Danao Windows x64\.zip/);
  assert.match(workflow,/danao-windows-x64-playable-/);
  assert.match(workflow,/playable\/Danao Windows x64\.zip/);
  assert.match(workflow,/steps\.target\.outputs\.id == 'danao-windows-x64'/);
});
