import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL('../scripts/'+name, import.meta.url),'utf8');
test('production verification is read-only and never creates owner sessions',()=>{
  const source=read('last-luas-live-smoke.py');
  assert.doesNotMatch(source,/INSERT INTO sessions|DELETE FROM sessions|db_session|private\.sql|CLOUDFLARE_API_TOKEN/);
  assert.match(source,/api\/last-luas\/release/);
});
test('fixture browser acceptance is restricted to the isolated loopback Worker',()=>{
  const source=read('last-luas-browser.py');
  assert.match(source,/Only the isolated loopback Worker is allowed/);
  assert.doesNotMatch(source,/wait_for_function/);
});
