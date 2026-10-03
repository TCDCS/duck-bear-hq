import test from 'node:test';
import assert from 'node:assert/strict';
let util={},metadata={},schema={};
try { util=await import('../../src/books/util.mjs'); } catch {}
try { metadata=await import('../../src/books/metadata.mjs'); } catch {}
try { schema=await import('../../src/books/schema.mjs'); } catch {}
const need=(m,k)=>{assert.equal(typeof m[k],'function',`${k} must be implemented`);return m[k];};
const env={GOOGLE_DRIVE_CLIENT_SECRET:'test-only-secret-not-a-real-google-credential-123456'};

test('Calibre sidecar preserves metadata without interpreting HTML or entities',()=>{
 const parse=need(metadata,'parseCalibreOpf');
 const b=parse(`<?xml version="1.0"?><package xmlns:dc="urn:test"><metadata>
 <dc:title>Sea &amp; Sky</dc:title><dc:creator>Test Author</dc:creator><dc:creator>Other Author</dc:creator>
 <dc:description>&lt;b&gt;A test.&lt;/b&gt;</dc:description><dc:language>eng</dc:language>
 <dc:identifier opf:scheme="uuid">demo-uuid</dc:identifier><dc:identifier opf:scheme="ISBN">9780000000002</dc:identifier>
 <dc:subject>Fiction</dc:subject><meta name="calibre:series" content="Seaside"/>
 <meta name="calibre:series_index" content="2"/><meta name="calibre:rating" content="8"/>
 </metadata></package>`);
 assert.equal(b.title,'Sea & Sky'); assert.deepEqual(b.authors,['Test Author','Other Author']);
 assert.equal(b.series,'Seaside');assert.equal(b.seriesIndex,2);assert.equal(b.importedRating,4);
 assert.equal(b.description,'A test.');assert.equal(b.identifiers.uuid,'demo-uuid');
 assert.throws(()=>parse('<!DOCTYPE x [<!ENTITY p SYSTEM "file:///secret">]><x/>'),/DTD|entity/i);
});
test('folder URL parser accepts Drive folders but not arbitrary URLs or sibling injection',()=>{
 const parse=need(util,'folderId');assert.equal(parse('https://drive.google.com/drive/folders/abcdefghijk_123?usp=drive_link'),'abcdefghijk_123');
 assert.throws(()=>parse('https://evil.example/drive/folders/abcdefghijk_123'));
 assert.throws(()=>parse("abc' or true"));assert.throws(()=>parse('https://drive.google.com/file/d/abcdefghijk_123'));
});
test('encrypted tokens cannot be read with a different key or after tampering',async()=>{
 const seal=need(util,'seal'),open=need(util,'unseal');const enc=await seal(env,{refresh_token:'not-real',scope:'test'});
 assert.ok(!enc.includes('not-real'));assert.equal((await open(env,enc)).refresh_token,'not-real');
 await assert.rejects(()=>open({...env,GOOGLE_DRIVE_CLIENT_SECRET:'different-client-secret-1234567890123'},enc));
 await assert.rejects(()=>open(env,enc.slice(0,-3)+'xxx'));
});
test('locators are content-based, bounded and versionable',()=>{
 const clean=need(util,'validateLocator');assert.deepEqual(clean({type:'epub',href:'OEBPS/ch1.xhtml',offset:130}),{type:'epub',href:'OEBPS/ch1.xhtml',offset:130});
 assert.deepEqual(clean({type:'pdf',page:5}),{type:'pdf',page:5});
 for(const x of [{type:'epub',href:'../secret',offset:0},{type:'epub',href:'https://evil.test',offset:0},{type:'epub',href:'x',offset:-3},{type:'pdf',page:0}])assert.throws(()=>clean(x));
});
test('content range parsing rejects malformed and multi-range requests',()=>{
 const range=need(util,'byteRange');assert.deepEqual(range('bytes=3-7',20),{start:3,end:7});
 assert.deepEqual(range('bytes=-5',20),{start:15,end:19});assert.deepEqual(range('bytes=12-',20),{start:12,end:19});
 assert.throws(()=>range('bytes=90-',20));assert.throws(()=>range('bytes=0-3,8-9',20));
});
test('XML and metadata size limits prevent unbounded parsing',()=>{
 const parse=need(metadata,'parseCalibreOpf');assert.throws(()=>parse('x'.repeat(1048577)),/large/i);
 const clean=need(metadata,'cleanMetadata'); const b=clean({title:'x',authors:['A'],description:'x'.repeat(99999)});assert.ok(b.description.length<=12000);
 assert.equal(clean({title:'x',seriesIndex:NaN}).seriesIndex,null);
});
test('schema uses only isolated tables and is idempotent on a real database',async()=>{
 const ensure=need(schema,'ensureBooksSchema');const {makeD1}=await import('../../tools/books/sqlite.mjs');
 const DB=makeD1();await DB.exec('CREATE TABLE users(id TEXT PRIMARY KEY, active INTEGER); INSERT INTO users VALUES(\'host-user\',1)');
 await ensure({DB});await ensure({DB});assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM users').first()).n,1);
 assert.ok((await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'books_%'").all()).results.length>=10);DB.close();
});
