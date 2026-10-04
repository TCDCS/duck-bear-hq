import test from 'node:test';
import assert from 'node:assert/strict';
import {environment} from './fixtures.mjs';
import {testHandler} from './api.test.mjs';
import {exportBooksBackup,previewBooksRestore,stageBooksRestoreFile,applyBooksRestore} from '../../src/books/backup.mjs';
import {saveProgress,saveAnnotation,listAnnotations} from '../../src/books/state.mjs';
import {readZip} from '../../public/hq/zip.mjs';
const owner={id:'zachary'};
const hooks={requireOwner:async()=>{},readerIds:async()=>['zachary','guannan']};
async function sample(){
 const {env}=await environment();
 const response=await testHandler().fetch(new Request('https://guannan.party/api/hq/books/uploads?name=Recovery.pdf',{method:'PUT',headers:{'x-test-user':'zachary',origin:'https://guannan.party'},body:new TextEncoder().encode('%PDF-1.7\nSynthetic recovery publication.\n%%EOF')}),env,{});
 assert.equal(response.status,201);const {book}=await response.json();return {env,file:book.files[0]};
}
test('the longest accepted private note survives Books export and restore unchanged',async()=>{
 const {env,file}=await sample(),{env:target}=await environment();
 try{
  const note='N'.repeat(12000),id=crypto.randomUUID();
  await saveAnnotation(env,owner,id,{fileId:file.id,version:file.version,revision:0,kind:'note',locator:{type:'pdf',page:1},note});
  const entries=readZip(await(await exportBooksBackup(env,owner,hooks)).arrayBuffer());
  const manifest=JSON.parse(new TextDecoder().decode(entries.get('manifest.json')));
  const preview=await previewBooksRestore(target,owner,hooks,manifest);
  for(const f of manifest.objects)await stageBooksRestoreFile(target,owner,preview.jobId,f.fileId,new Request('https://guannan.party',{method:'PUT',body:entries.get(f.path)}));
  await applyBooksRestore(target,owner,hooks,preview.jobId,{confirm:'RESTORE BOOKS'});
  assert.equal((await listAnnotations(target,owner,file.id,file.version))[0].note,note);
 }finally{env.DB.close();target.DB.close();}
});
test('progress rejects an EPUB locator on a PDF before creating saved state',async()=>{
 const {env,file}=await sample();try{
  await assert.rejects(()=>saveProgress(env,owner,file.id,{version:file.version,revision:0,locator:{type:'epub',href:'chapter.xhtml',offset:0},progress:0.5,deviceId:'device-recovery',opId:crypto.randomUUID()}),e=>e.status===400&&e.code==='locator_format');
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM books_read_state').first()).n,0);
 }finally{env.DB.close();}
});
test('annotations reject mismatched locator formats without corrupting later backups',async()=>{
 const {env,file}=await sample();try{
  await assert.rejects(()=>saveAnnotation(env,owner,crypto.randomUUID(),{fileId:file.id,version:file.version,revision:0,kind:'bookmark',locator:{type:'epub',href:'chapter.xhtml',offset:0}}),e=>e.status===400&&e.code==='locator_format');
  assert.equal((await listAnnotations(env,owner,file.id,file.version)).length,0);
 }finally{env.DB.close();}
});
