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

test('Books recovery harness injects one real HTTP failure without disabling service workers', async () => {
  await mkdir('verification',{recursive:true});
  const child=spawn(process.execPath,['tools/books/dev-server.mjs'],{env:{...process.env,BOOKS_TEST_PORT:'18988',BOOKS_TEST_FAIL_RESTORE_UPLOAD_ONCE:'1'},stdio:['ignore','pipe','pipe']});
  try {
    const ready=await Promise.race([once(child.stdout,'data').then(([d])=>String(d)),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Harness did not start')),10000).unref())]);
    const base=ready.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];assert.ok(base);
    const path=base+'/api/hq/books/restore/synthetic-job/files/synthetic-file';
    assert.equal((await fetch(path,{method:'PUT',headers:{Origin:base},body:'fixture'})).status,401,'Anonymous requests must not consume the owner fault');
    const options={method:'PUT',headers:{Origin:base,Cookie:'test_reader=zachary'},body:'fixture'};
    const interrupted=await fetch(path,options);assert.equal(interrupted.status,503);
    assert.match((await interrupted.json()).error,/Synthetic retryable upload interruption/);
    assert.equal(interrupted.headers.get('cache-control'),'no-store');
    const retry=await fetch(path,options);assert.equal(retry.status,400,'Retry reaches the real missing-job handler; no second injected failure');
    assert.equal((await retry.json()).code,'restore_expired');
  } finally {child.kill();await once(child,'exit');}
});
