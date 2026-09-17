import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/danao-uba-status.yml'),'utf8');

test('successful Unity WebGL capture publishes to R2 preview off main and current on main',()=>{
  assert.match(workflow,/CLOUDFLARE_API_TOKEN/);
  assert.match(workflow,/CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow,/refs\/heads\/main/);
  assert.match(workflow,/CHANNEL="current"/);
  assert.match(workflow,/CHANNEL="preview"/);
  assert.match(workflow,/duck-bear-hq-media\/danao\/web\/\$CHANNEL\/\$NAME/);
  assert.match(workflow,/wrangler r2 object put/);
  for(const name of ['Danao.loader.js','Danao.data','Danao.framework.js','Danao.wasm']) assert.match(workflow,new RegExp(name.replaceAll('.', '\\.')));
});
