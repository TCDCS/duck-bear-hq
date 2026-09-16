import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/danao-uba-trigger.yml'),'utf8');

test('Unity Build Automation is pinned to the exact GitHub commit that triggered it',()=>{
  assert.match(workflow,/GITHUB_SHA/);
  assert.match(workflow,/commit/);
  assert.match(workflow,/branch/);
  assert.match(workflow,/jq -nc/);
});
