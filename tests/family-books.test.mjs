import test from 'node:test';
import assert from 'node:assert/strict';
import {personFields,familyData,EVENT_TYPES} from '../src/hq/family-fields.mjs';
import * as genealogy from '../public/hq/family-genealogy.mjs';
const book=await import('../public/hq/family-book-model.mjs').catch(()=>({}));
const p=(id,extra={})=>({id,kind:'person',section:'family',data:{name:'Person '+id,entityType:'person',evidence:'family',...extra}});
const r=(id,from,to,type='parent')=>({id,kind:'relationship',section:'family',data:{from,to,type,evidence:'family'}});
const people=['root','mum','dad','grand','great','aunt','cousin','sibling','child','unrelated'].map(x=>p(x));
const edges=[r('1','mum','root'),r('2','dad','root'),r('3','grand','mum'),r('4','great','grand'),r('5','grand','aunt'),r('6','aunt','cousin'),r('7','mum','sibling'),r('8','root','child'),r('9','mum','dad','former-partner')];
test('person name details, uncertainty and approved child text are bounded and preserved',()=>{
 const d=personFields({nameOriginal:'أحمد',nameMeaning:'Much praised',nameMeaningSources:'Dictionary entry',nameStory:'Family recollection',storybookText:'A kind family story.',birthNote:'Registration quarter only',ancestryNotes:'Parents not identified'});
 assert.equal(d.nameOriginal,'أحمد');assert.equal(d.nameMeaning,'Much praised');assert.equal(d.storybookText,'A kind family story.');assert.equal(d.birthNote,'Registration quarter only');
 assert.throws(()=>personFields({nameMeaning:'x'.repeat(3001)}));assert.ok(EVENT_TYPES.includes('name-change'));
 assert.equal(personFields({religion:'private',allergies:['private']}).religion,undefined);
});
test('household details keep religion separate from inherited background and preserve allergies',()=>{
 const d=familyData('familyPrivate',{personId:'p',religion:'Islam / Muslim',religionContext:'family-background',religionNotes:'Family account only',allergies:['sesame','sesame'],allergyNotes:'Reported by parent; severity not recorded'});
 assert.equal(d.religion,'Islam / Muslim');assert.equal(d.religionContext,'family-background');assert.deepEqual(d.allergies,['sesame']);assert.throws(()=>familyData('familyPrivate',{personId:'p',allergies:['x'.repeat(201)]}));
});
test('extended family includes aunts, cousins and siblings only through actual relationships',()=>{
 assert.equal(typeof genealogy.extendedFamilyLayout,'function');
 const layout=genealogy.extendedFamilyLayout(people,edges,'root',{extendedFamily:true,generations:4});
 const ids=new Set(layout.nodes.map(n=>n.id));for(const id of ['aunt','cousin','sibling','child'])assert.ok(ids.has(id),id);assert.ok(!ids.has('unrelated'));assert.ok(!ids.has('great'));
 assert.equal(ids.size,layout.nodes.length);for(let i=0;i<layout.nodes.length;i++)for(const b of layout.nodes.slice(i+1)){const a=layout.nodes[i];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}
});
test('extended ancestry retains adoptive parents and stops loops',()=>{
 assert.equal(typeof genealogy.extendedFamilyLayout,'function');const all=[...edges,r('adopt','aunt','root','adoptive-parent'),r('cycle','root','great')];
 const l=genealogy.extendedFamilyLayout(people,all,'root',{extendedAncestry:true,generations:6});assert.ok(l.nodes.some(n=>n.id==='great'));assert.ok(l.edges.some(e=>e.type==='adoptive-parent'));assert.ok(l.nodes.length<=people.length);
});
test('storybook uses approved text, never raw notes, private addresses or allergies',()=>{
 assert.equal(typeof book.buildBook,'function');const records=[p('root',{isRoot:true,notes:'PRIVATE_RAW_NOTE',storybookText:'We shared apples.',nameMeaning:'A helpful name'}),{id:'sec',kind:'familyPrivate',data:{personId:'root',address:'PRIVATE_ADDRESS',allergies:['PRIVATE_ALLERGY'],religion:'Faith label',religionContext:'personal'}}];
 const b=book.buildBook(records,{mode:'child',includePrivate:true,includeFaith:true});const html=book.renderBookHtml(b);
 assert.ok(html.includes('We shared apples.'));assert.ok(html.includes('Faith label'));assert.ok(!html.includes('PRIVATE_RAW_NOTE'));assert.ok(!html.includes('PRIVATE_ADDRESS'));assert.ok(!html.includes('PRIVATE_ALLERGY'));
});
test('adult reference book can include every supplied record with explicit private appendix',()=>{
 assert.equal(typeof book.buildBook,'function');const records=[...people,...edges,{id:'health',kind:'familyPrivate',data:{personId:'root',address:'HOME',allergies:['ALLERGEN']}},{id:'event',kind:'lifeEvent',data:{personId:'root',eventType:'career',title:'Career',details:'Stored history'}},{id:'unknown',kind:'familyResearch',data:{title:'Uncertain ancestry',details:'Unproved parent'}}];
 const defaultText=book.renderBookHtml(book.buildBook(records,{mode:'reference'}));assert.ok(!defaultText.includes('ALLERGEN'));
 const b=book.buildBook(records,{mode:'reference',includePrivate:true});assert.equal(b.recordCount,records.length);const html=book.renderBookHtml(b);assert.ok(html.includes('ALLERGEN'));assert.ok(html.includes('Stored history'));assert.ok(html.includes('Unproved parent'));
});
test('book renderer escapes malicious text, uses no remote images and preserves Unicode',()=>{
 assert.equal(typeof book.buildBook,'function');const html=book.renderBookHtml(book.buildBook([p('x',{name:'<script>evil()</script> أحمد',storybookText:'One < two.',avatarId:'https://evil.invalid/track'})],{mode:'child'}));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('أحمد'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('src="https://evil.invalid'));assert.ok(html.includes('@page'));
});
test('story place stays a labelled story link and does not become a vital-record location',()=>{
 const data=personFields({storyMapPlace:'A story town',storyMapNote:'A recollection, not a birthplace.'});assert.equal(data.storyMapPlace,'A story town');assert.equal(data.birthPlace,undefined);
 const html=book.renderBookHtml(book.buildBook([p('p',data)]));assert.ok(html.includes('A place in this story'));assert.ok(html.includes('A story town'));assert.ok(!html.includes('Birthplace:'));
});
test('reference story pictures are printed, references link to the appropriate section',()=>{
 const b=book.buildBook([p('p'),{id:'s',kind:'story',data:{title:'Picture story',photos:[{assetId:'asset_test',caption:'A remembered day'}]}},{id:'ref',kind:'familySource',data:{title:'Document',sourceIds:['s']}}],{mode:'reference'});
 const html=book.renderBookHtml(b);assert.ok(html.includes('src="/api/hq/assets/asset_test/content"'));assert.ok(html.includes('href="#record-s"'));
});
