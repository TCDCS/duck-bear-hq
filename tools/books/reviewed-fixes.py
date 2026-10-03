"""Apply exact locally tested review fixes, then remove this temporary development tool."""
from pathlib import Path
from hashlib import sha256

def edit(path, changes, expected, append=''):
 p=Path(path);s=p.read_text()
 for a,b in changes:
  assert s.count(a)==1,(path,a[:80])
  s=s.replace(a,b,1)
 s+=append
 assert sha256(s.encode()).hexdigest()==expected,path
 p.write_text(s)

edit('src/books/google.mjs',[
 ('verifyFileInLibrary(env,id){','verifyFileInLibrary(env,id,expectedVersion=null){'),
 ("fields:'id,parents,trashed,mimeType',supportsAllDrives:true","fields:'id,parents,trashed,mimeType,md5Checksum,modifiedTime,size',supportsAllDrives:true"),
 ("if(file.trashed||file.mimeType==='application/vnd.google-apps.shortcut')","if(n===0&&expectedVersion!==null){const actual=plain(file.md5Checksum||`${file.modifiedTime||'unknown'}:${file.size||0}`,200);if(actual!==expectedVersion)fail(409,'This book changed in Google Drive. Rescan the library before opening it; your previous reading position is preserved.','version_changed');}if(file.trashed||file.mimeType==='application/vnd.google-apps.shortcut')")
 ],'f09f0a99256910a5e6eab7790db7bea6cf3928f3d6110071e287e7f267746f60')
edit('src/books/api.mjs',[('verifyFileInLibrary(env,f.source_id);','verifyFileInLibrary(env,f.source_id,f.version);')],'1978413e15ac572ca599559750f678423f23829e133bad9705becc607e58fb7a')
edit('public/books/reader.mjs',[
 ("import {prepareEpub} from './publication.mjs';","import {prepareEpub,openPreparedEpub} from './publication.mjs';"),
 ("this.epub=ePub(prepared.bytes,{openAs:'epub',replacements:'blobUrl'});await this.epub.ready;","this.epub=await openPreparedEpub(prepared.bytes);")
 ],'b56cb391c419216b81ddda5616831d11daffb39d73d7219af75d9b3b59d39f99')
edit('public/books/publication.mjs',[],'7a047824c339a7844be9b346c81e315b2e511733742eb0a82abf7bd15a5398e4',"""
export async function openPreparedEpub(bytes){
 const book=ePub(undefined,{replacements:'blobUrl'});
 let timer;
 try {
  await Promise.race([(async()=>{await book.open(bytes,'binary');await book.ready;})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('This EPUB could not be opened within the reader time limit.')),20000);})]);
  return book;
 }catch(error){book.destroy();throw error;}
 finally{clearTimeout(timer);}
}
""")
edit('tests/books/google.test.mjs',[],'ac878ed6a2e02fe9179024a2890da69effa2b7d7c10e745ca7a6447719b66637',"""

test('changed Drive bytes are rejected before they can use the old reading version',async()=>{const {env,data,calls}=await connectedEnv();const job=await scan.startScan(env);for(let n=0;n<30;n++){const s=await scan.stepScan(env,job.id);if(s.status==='complete')break;}data.get(FILE).md5Checksum='checksum-new';const before=calls.length;await assert.rejects(()=>google.verifyFileInLibrary(env,FILE,'checksum1'),e=>e.status===409&&e.code==='version_changed');assert.ok(calls.slice(before).every(c=>!c.url.includes('alt=media')));env.DB.close();});
""")
edit('tests/books/reader-contract.test.mjs',[],'47c0439109981b3a82c5089669da32ff20ca1ba902c1e0c067f021726bc231a2',"""
test('EPUB bytes are opened as binary, not mistaken for a URL',async()=>{const publication=await import('../../public/books/publication.mjs');assert.equal(typeof publication.openPreparedEpub,'function');const original=globalThis.ePub;const bytes=new ArrayBuffer(8);let input,mode;const book={ready:Promise.resolve(),async open(value,type){input=value;mode=type;},destroy(){}};globalThis.ePub=(url)=>{assert.equal(url,undefined);return book;};try{assert.equal(await publication.openPreparedEpub(bytes),book);assert.equal(input,bytes);assert.equal(mode,'binary');}finally{globalThis.ePub=original;}});
test('failed EPUB opening releases the reader rather than hanging on ready',async()=>{const publication=await import('../../public/books/publication.mjs');assert.equal(typeof publication.openPreparedEpub,'function');const original=globalThis.ePub;let closed=false;globalThis.ePub=()=>({ready:new Promise(()=>{}),open:async()=>{throw new Error('Invalid book');},destroy(){closed=true;}});try{await assert.rejects(()=>publication.openPreparedEpub(new ArrayBuffer(1)),/Invalid book/);assert.equal(closed,true);}finally{globalThis.ePub=original;}});
""")
p=Path('tools/books/browser_test.py');s=p.read_text();s=s.replace("page=ctx.new_page();errors=[];external=[]","page=ctx.new_page();errors=[];external=[];console=[]\n ctx.tracing.start(screenshots=True,snapshots=True,sources=True)\n page.on('console',lambda m:console.append({'type':m.type,'text':m.text}))\n page.on('requestfailed',lambda r:console.append({'type':'requestfailed','url':r.url,'failure':r.failure}))")
a=s.index(" page.goto(base+'/books/')");b=s.index(' browser.close()',a);body=s[a:b]
s=s[:a]+" try:\n"+''.join(' '+line+'\n' for line in body.splitlines())+" finally:\n  (root/'verification/browser-console.json').write_text(json.dumps({'pageErrors':errors,'console':console,'external':external},indent=2))\n  page.screenshot(path=str(root/'verification/last-browser-screen.png'),full_page=True)\n  (root/'verification/last-browser-page.html').write_text(page.content())\n  ctx.tracing.stop(path=str(root/'verification/browser-trace.zip'))\n"+s[b:]
assert sha256(s.encode()).hexdigest()=='8bf03c652b933cbee0e3748795f71cff99749fa3ac3dc5a49f4df23bb8fa64c3';p.write_text(s)
