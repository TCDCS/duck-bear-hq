import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';

test('Books local harness serves the real shared ZIP module with JavaScript MIME', async () => {
  await mkdir('verification',{recursive:true});
  const child=spawn(process.execPath,['tools/books/dev-server.mjs'],{env:{...process.env,BOOKS_TEST_PORT:'18987'},stdio:['ignore','pipe','pipe']});
  try {
    const ready=await Promise.race([once(child.stdout,'data').then(([d])=>String(d)),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Harness did not start')),10000).unref())]);
    const base=ready.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    assert.ok(base,'Harness must report its actual listening address');
    const response=await fetch(base+'/hq/zip.mjs');
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/javascript/);
    assert.match(await response.text(),/export function readZip/);
    assert.equal((await fetch(base+'/hq/not-an-asset.mjs')).status,404);
    assert.equal((await fetch(base+'/api/hq/books/me')).status,401);
  } finally {child.kill();await once(child,'exit');}
});
