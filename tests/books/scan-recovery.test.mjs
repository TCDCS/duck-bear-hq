import test from 'node:test';
import assert from 'node:assert/strict';
import {testHandler} from './api.test.mjs';
import * as scan from '../../src/books/import.mjs';
import {connectedEnv,ROOT,BOOK,OPF} from './fixtures.mjs';
import {query} from '../../src/books/util.mjs';

async function untilBookFolder(env,id) {
  for(let n=0;n<20;n++) {
    const row=await env.DB.prepare("SELECT * FROM books_scan_queue WHERE job_id=? AND folder_id=?").bind(id,BOOK).first();
    if(row?.status==='queued')return;
    await scan.stepScan(env,id);
  }
  throw new Error('Fixture book folder was not reached');
}
async function finish(env,id) {
  for(let n=0;n<30;n++){const job=await scan.stepScan(env,id);if(['complete','empty'].includes(job.status))return job;}
  throw new Error('Fixture scan did not finish');
}
function deferredList(env,parent) {
  const original=env.BOOKS_FETCH;let release,entered;
  const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  env.BOOKS_FETCH=async(input,options)=>{const url=new URL(input);const response=await original(input,options);
    if(url.pathname==='/drive/v3/files'&&url.searchParams.get('q')?.startsWith(`'${parent}'`)){entered();await gate;}
    return response;};
  return {started,release,restore:()=>{env.BOOKS_FETCH=original;}};
}

test('paused scans persist, do no provider work and resume the same saved checkpoint',async()=>{
  const {env,calls}=await connectedEnv();try{
    const job=await scan.startScan(env);await scan.stepScan(env,job.id);
    assert.equal(typeof scan.pauseScan,'function','Persistent pause must be implemented');
    const paused=await scan.pauseScan(env,job.id);assert.equal(paused.status,'paused');
    const before=calls.length;assert.equal((await scan.stepScan(env,job.id)).status,'paused');assert.equal(calls.length,before);
    assert.equal((await scan.startScan(env)).id,job.id,'Start must not duplicate an existing paused scan');
    assert.equal((await scan.resumeScan(env,job.id)).status,'running');
    const done=await finish(env,job.id);assert.equal(done.booksSeen,1);assert.equal(done.filesSeen,7);
  }finally{env.DB.close();}
});

test('a folder-root change during a provider response commits neither files nor checkpoint',async()=>{
  const {env}=await connectedEnv();try{
    const job=await scan.startScan(env),gate=deferredList(env,ROOT);
    const step=scan.stepScan(env,job.id);await gate.started;
    await env.DB.prepare("UPDATE books_connections SET root_id='different_root_001'").run();gate.release();
    await step.catch(e=>assert.equal(e.status,409));
    assert.equal((await scan.scanStatus(env,job.id)).filesSeen,0);
    assert.equal((await query(env.DB,'SELECT * FROM books_manifest WHERE parent_id=?',ROOT)).length,0);
  }finally{env.DB.close();}
});

test('disconnect during a provider response cannot import using removed authority',async()=>{
  const {env}=await connectedEnv();try{
    const job=await scan.startScan(env),gate=deferredList(env,ROOT);
    const step=scan.stepScan(env,job.id);await gate.started;
    await env.DB.prepare('UPDATE books_connections SET token_cipher=NULL').run();gate.release();
    await step.catch(e=>assert.equal(e.status,409));
    assert.equal((await scan.scanStatus(env,job.id)).filesSeen,0);
    assert.equal((await query(env.DB,'SELECT * FROM books_manifest WHERE parent_id=?',ROOT)).length,0);
  }finally{env.DB.close();}
});

test('a superseded folder lease rejects a late page without changing counters or other leases',async()=>{
  const {env}=await connectedEnv();try{
    const job=await scan.startScan(env),gate=deferredList(env,ROOT);
    const step=scan.stepScan(env,job.id);await gate.started;
    await env.DB.prepare("UPDATE books_scan_queue SET lease='new-worker',locked_until=? WHERE job_id=? AND folder_id=?").bind(Date.now()+60000,job.id,ROOT).run();
    gate.release();await step;
    assert.equal((await scan.scanStatus(env,job.id)).filesSeen,0);
    const row=await env.DB.prepare('SELECT * FROM books_scan_queue WHERE job_id=? AND folder_id=?').bind(job.id,ROOT).first();
    assert.equal(row.lease,'new-worker');assert.equal(row.status,'working');
    assert.equal((await query(env.DB,'SELECT * FROM books_manifest WHERE parent_id=?',ROOT)).length,0);
  }finally{env.DB.close();}
});

test('pausing an in-flight page then resuming rejects the old response and imports it only once',async()=>{
  const {env}=await connectedEnv();try{
    assert.equal(typeof scan.pauseScan,'function','Persistent pause must be implemented');
    const job=await scan.startScan(env),gate=deferredList(env,ROOT);
    const step=scan.stepScan(env,job.id);await gate.started;
    await scan.pauseScan(env,job.id);await scan.resumeScan(env,job.id);gate.restore();gate.release();await step;
    assert.equal((await scan.scanStatus(env,job.id)).filesSeen,0);
    const done=await finish(env,job.id);assert.equal(done.filesSeen,7);assert.equal(done.booksSeen,1);
  }finally{env.DB.close();}
});

test('catalogue failure rolls back the entire final page and retry does not double count',async()=>{
  const {env}=await connectedEnv();try{
    const job=await scan.startScan(env);await untilBookFolder(env,job.id);
    await scan.stepScan(env,job.id); // first two files, final OPF is on the next page
    const before=await scan.scanStatus(env,job.id);
    await env.DB.exec("CREATE TRIGGER reject_book BEFORE INSERT ON books_catalogue BEGIN SELECT RAISE(ABORT,'synthetic write failure'); END");
    await assert.rejects(()=>scan.stepScan(env,job.id),/synthetic write failure/);
    assert.equal((await scan.scanStatus(env,job.id)).filesSeen,before.filesSeen,'Failed page must not increment item count');
    assert.equal((await query(env.DB,'SELECT * FROM books_manifest WHERE file_id=?',OPF)).length,0);
    assert.equal((await query(env.DB,'SELECT * FROM books_catalogue')).length,0);
    await env.DB.exec('DROP TRIGGER reject_book');
    const done=await finish(env,job.id);assert.equal(done.filesSeen,7);assert.equal(done.booksSeen,1);
    assert.equal((await query(env.DB,'SELECT * FROM books_files')).length,2);
  }finally{env.DB.close();}
});

test('resuming a scan for an old library root is refused without starting another job',async()=>{
  const {env}=await connectedEnv();try{
    assert.equal(typeof scan.resumeScan,'function','Persistent resume must be implemented');
    const job=await scan.startScan(env);await scan.pauseScan(env,job.id);
    await env.DB.prepare("UPDATE books_connections SET root_id='different_root_001'").run();
    await assert.rejects(()=>scan.resumeScan(env,job.id),e=>e.code==='root_changed');
    assert.equal((await scan.scanStatus(env,job.id)).status,'paused');
  }finally{env.DB.close();}
});

test('100,000-item scan limit is enforced before a page can exceed it',async()=>{
  const {env}=await connectedEnv();try{
    const job=await scan.startScan(env);await env.DB.prepare('UPDATE books_scan_jobs SET files_seen=99999 WHERE id=?').bind(job.id).run();
    await assert.rejects(()=>scan.stepScan(env,job.id),e=>e.code==='scan_limit');
    assert.equal((await scan.scanStatus(env,job.id)).filesSeen,99999);
    assert.equal((await query(env.DB,'SELECT * FROM books_manifest WHERE parent_id=?',ROOT)).length,0);
  }finally{env.DB.close();}
});

test('expired leases are reclaimable and completed scans remain unchanged on retry',async()=>{
  const {env}=await connectedEnv();try{
    const job=await scan.startScan(env);await env.DB.prepare("UPDATE books_scan_queue SET status='working',lease='dead-worker',locked_until=0 WHERE job_id=?").bind(job.id).run();
    const done=await finish(env,job.id);assert.equal(done.filesSeen,7);assert.equal(done.booksSeen,1);
    assert.deepEqual(await scan.stepScan(env,job.id),done);
    assert.match(done.warnings.join(' '),/Shortcuts/);
  }finally{env.DB.close();}
});

test('pause and resume API actions preserve owner-only and same-origin boundaries',async()=>{
  const {env}=await connectedEnv();try{
    const app=testHandler(),job=await scan.startScan(env);
    const call=(action,user='zachary',origin='https://guannan.party')=>app.fetch(new Request(`https://guannan.party/api/hq/books/scan/${job.id}/${action}`,{method:'POST',headers:{'x-test-user':user,origin,'content-type':'application/json'},body:'{}'}),env,{});
    assert.equal((await call('pause','guannan')).status,403);
    assert.equal((await call('pause','zachary','https://outside.test')).status,403);
    const pause=await call('pause');assert.equal(pause.status,200);assert.equal((await pause.json()).status,'paused');
    const resume=await call('resume');assert.equal(resume.status,200);assert.equal((await resume.json()).status,'running');
  }finally{env.DB.close();}
});

test('a moved OPF sidecar is not downloaded outside the currently scanned folder',async()=>{
  const {env,data,calls}=await connectedEnv();try{
    const job=await scan.startScan(env);await untilBookFolder(env,job.id);await scan.stepScan(env,job.id);
    const original=env.BOOKS_FETCH;
    env.BOOKS_FETCH=async(input,options)=>{const response=await original(input,options),url=new URL(input);
      if(url.pathname==='/drive/v3/files'&&url.searchParams.get('q')?.startsWith(`'${BOOK}'`))data.get(OPF).parents=['outside_documents'];
      return response;};
    const before=calls.length;await scan.stepScan(env,job.id);
    assert.ok(!calls.slice(before).some(c=>c.url.includes('/files/'+OPF)&&c.url.includes('alt=media')),'No bytes may be fetched from the moved sidecar');
    assert.match((await scan.scanStatus(env,job.id)).warnings.join(' '),/metadata.opf/);
  }finally{env.DB.close();}
});

test('an omitted empty files array finishes an empty folder without losing the warning',async()=>{
  const {env}=await connectedEnv();try{
    const original=env.BOOKS_FETCH;env.BOOKS_FETCH=async(input,options)=>new URL(input).pathname==='/drive/v3/files'?Response.json({}):original(input,options);
    const job=await scan.startScan(env);const done=await finish(env,job.id);
    assert.equal(done.status,'empty');assert.equal(done.filesSeen,0);assert.match(done.warnings.join(' '),/No books were visible/);
  }finally{env.DB.close();}
});

test('source changes after a final-page response stop further OPF metadata reads',async()=>{
  const {env,calls}=await connectedEnv();try{
    const job=await scan.startScan(env);await untilBookFolder(env,job.id);await scan.stepScan(env,job.id);
    const gate=deferredList(env,BOOK),step=scan.stepScan(env,job.id);await gate.started;
    const before=calls.length;await env.DB.prepare("UPDATE books_connections SET root_id='different_root_001'").run();gate.release();await step;
    assert.equal(calls.length,before,'No more provider reads after the page loses its source authority');
    assert.equal((await query(env.DB,'SELECT * FROM books_catalogue')).length,0);
  }finally{env.DB.close();}
});

test('concurrent scan starts reuse one job without replacing its root checkpoint',async()=>{
  const {env}=await connectedEnv();try{
    // Model D1 serial transactions while permitting concurrent reads from two requests.
    const db=env.DB;let tail=Promise.resolve();env.DB={...db,batch(items){const next=tail.then(()=>db.batch(items));tail=next.catch(()=>{});return next;}};
    const [a,b]=await Promise.all([scan.startScan(env),scan.startScan(env)]);
    assert.equal(a.id,b.id);assert.equal((await query(env.DB,'SELECT * FROM books_scan_jobs')).length,1);
    assert.equal((await query(env.DB,'SELECT * FROM books_scan_queue')).length,1);
    assert.equal((await env.DB.prepare('SELECT seen_job FROM books_manifest WHERE file_id=?').bind(ROOT).first()).seen_job,a.id);
  }finally{env.DB.close();}
});
