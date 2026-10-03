import test from 'node:test';
import assert from 'node:assert/strict';
import {NAV,resolveRoute} from '../public/hq/routes.mjs';
const mod=await import('../public/hq/family-genealogy.mjs').catch(()=>({}));
const person=(id,data={})=>({id,kind:'person',data:{name:id,livingStatus:'unknown',...data}});
const event=(id,personId,eventType,placeId='',more={})=>({id,kind:'lifeEvent',data:{title:id,personId,eventType,placeId,start:'2000',...more}});
const rel=(from,to,type='parent')=>({id:from+to+type,kind:'relationship',data:{from,to,type,evidence:'family'}});
const place=(id,data={})=>({id,kind:'familyPlace',data:{title:id,latitude:53,longitude:-6,precision:'town',...data}});
test('family navigation contains only the core genealogy sections',()=>{
 const nav=NAV.find(x=>x.section==='family');
 assert.deepEqual(nav.items.map(x=>x[0]),['Tree','People','Timeline','Locations','Stories','Sources']);
 for(const [old,target] of [['events','timeline'],['places','map'],['research','sources']])assert.equal(resolveRoute('/family-tree/'+old+'/').path,'/family-tree/'+target+'/');
});
test('genealogy timeline removes careers, achievements and miscellaneous records without mutating records',()=>{
 assert.equal(typeof mod.genealogyTimeline,'function');
 const pp=[person('a',{birth:'1990'})],ev=[event('career','a','career'),event('award','a','achievement'),event('wedding','a','marriage'),event('move','a','migration'),event('misc','a','other')],before=JSON.stringify(ev);
 assert.deepEqual(mod.genealogyTimeline(pp,ev).map(e=>e.id),['a-birth','move','wedding']);assert.equal(JSON.stringify(ev),before);
});
test('birth and death fact dates are deduplicated; family participants remain linked',()=>{
 const rows=mod.genealogyTimeline([person('a',{birth:'1990'}),person('b',{birth:'2020'})],[event('birth','b','birth','',{start:'2020',participants:['a']})]);
 assert.equal(rows.length,2);assert.ok(rows.find(x=>x.id==='a-birth'));assert.ok(rows.find(x=>x.id==='birth').people.includes('a'));
});
test('locations are exactly birth, death and explicitly current residence, never the full place catalogue',()=>{
 assert.equal(typeof mod.genealogyLocations,'function');
 const pp=[person('a',{birthPlaceId:'birth',deathPlaceId:'death',currentPlaceId:'now',livingStatus:'living'})];
 const ev=[event('work','a','career','office'),event('married','a','marriage','venue'),event('past','a','residence','old')];
 const result=mod.genealogyLocations(pp,ev,['birth','death','now','office','venue','old','unlinked'].map(x=>place(x)));
 assert.deepEqual(result.map(x=>x.id).sort(),['birth','death','now']);assert.deepEqual(result.flatMap(x=>x.associations.map(a=>a.type)).sort(),['birth','current','death']);
});
test('a deceased person never has a current-residence pin, and a residence event is not current evidence',()=>{
 const pp=[person('a',{death:'2019',currentPlaceId:'old'}),person('b')];
 assert.deepEqual(mod.genealogyLocations(pp,[event('past','b','residence','old')],[place('old')]),[]);
});
test('birth/death events fill missing subject locations but never assign the birthplace to participants',()=>{
 const pp=[person('a'),person('child')];const result=mod.genealogyLocations(pp,[event('born','child','birth','hospital',{participants:['a']})],[place('hospital')]);
 assert.equal(result.length,1);assert.deepEqual(result[0].associations.map(x=>x.personId),['child']);
});
test('unmapped text locations remain readable without inventing coordinates; household addresses are never consumed',()=>{
 const result=mod.genealogyLocations([person('a',{birthPlace:'Unmapped village',currentPlace:'Unknown',address:'DO-NOT-USE'})],[],[]);
 assert.equal(result.length,1);assert.equal(result[0].title,'Unmapped village');assert.equal(result[0].latitude,null);assert.ok(!JSON.stringify(result).includes('DO-NOT-USE'));
});
test('known profile location wins over an inconsistent birth event, and zero coordinates remain valid',()=>{
 const result=mod.genealogyLocations([person('a',{birthPlaceId:'known'})],[event('born','a','birth','other')],[place('known',{latitude:0,longitude:0}),place('other')]);
 assert.deepEqual(result.map(x=>x.id),['known']);assert.equal(result[0].latitude,0);
});
function noOverlap(layout){for(let i=0;i<layout.nodes.length;i++)for(let j=i+1;j<layout.nodes.length;j++){const a=layout.nodes[i],b=layout.nodes[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`Overlap ${a.id} / ${b.id}`);}}
test('pedigree puts focus on the left, keeps both adoption branches and excludes cousin/friend clutter',()=>{
 assert.equal(typeof mod.pedigreeLayout,'function');const pp=['root','mum','dad','adopt-mum','adopt-dad','grandparent','friend'].map(x=>person(x));
 const rr=[rel('mum','root'),rel('dad','root'),rel('adopt-mum','dad','adoptive-parent'),rel('adopt-dad','dad','adoptive-parent'),rel('grandparent','dad'),rel('root','friend','witness')];
 const l=mod.pedigreeLayout(pp,rr,'root',4);noOverlap(l);assert.equal(l.nodes.length,6);assert.ok(l.edges.some(x=>x.type==='adoptive-parent'));
 const map=new Map(l.nodes.map(x=>[x.key,x]));for(const e of l.edges)assert.ok(map.get(e.from).x>map.get(e.to).x);
});
test('shared ancestors are repeated only as distinct chart occurrences and do not create overlap or infinite loops',()=>{
 const pp=['root','mum','dad','shared'].map(x=>person(x));const rr=[rel('mum','root'),rel('dad','root'),rel('shared','mum'),rel('shared','dad'),rel('root','shared')];
 const l=mod.pedigreeLayout(pp,rr,'root',6);noOverlap(l);assert.ok(l.nodes.length<20);assert.equal(new Set(l.nodes.map(n=>n.key)).size,l.nodes.length);assert.equal(l.nodes.filter(n=>n.id==='shared').length,2);
});
test('family view shows parents, partners and children with no fabricated parent connections',()=>{
 assert.equal(typeof mod.immediateFamilyLayout,'function');const pp=['root','mum','dad','wife','partner','child','friend'].map(x=>person(x));const rr=[rel('mum','root'),rel('dad','root'),rel('root','wife','former-partner'),rel('root','partner','partner'),rel('root','child'),rel('wife','child'),rel('root','friend','witness')];
 const l=mod.immediateFamilyLayout(pp,rr,'root');noOverlap(l);assert.equal(l.nodes.length,6);assert.ok(!l.edges.some(e=>e.from==='partner'&&e.to==='child'));
 const map=new Map(l.nodes.map(x=>[x.key,x]));for(const e of l.edges.filter(e=>e.type==='parent'))assert.ok(map.get(e.from).y<map.get(e.to).y);
});
test('layout is stable for input ordering and an absent focus safely picks the main person',()=>{
 const pp=[person('main',{isRoot:true}),person('p1'),person('p2')],rr=[rel('p1','main'),rel('p2','main')];
 assert.deepEqual(mod.pedigreeLayout(pp,rr,'bad'),mod.pedigreeLayout([...pp].reverse(),[...rr].reverse(),'bad'));
 assert.deepEqual(mod.pedigreeLayout([],[],'none').nodes,[]);
});

test('initial chart view keeps readable cards and focus visible on phones and large trees',()=>{
 assert.equal(typeof mod.initialTreeViewport,'function');
 const pp=['root','mum','dad','adopt1','adopt2','grand1','grand2'].map(x=>person(x));
 const rr=[rel('mum','root'),rel('dad','root'),rel('adopt1','dad','adoptive-parent'),rel('adopt2','dad','adoptive-parent'),rel('grand1','dad'),rel('grand2','dad')];
 for(const size of [[360,520],[760,560],[1200,650]])for(const l of [mod.pedigreeLayout(pp,rr,'root',6),mod.immediateFamilyLayout(pp,rr,'root')]){
  const v=mod.initialTreeViewport(l,...size),n=l.nodes.find(x=>x.id===l.root);
  assert.ok(v.scale>=.9&&v.scale<=1,'Readable starting scale');
  assert.ok(n.x*v.scale+v.x>=12,'Focus left visible');
  assert.ok((n.x+n.width)*v.scale+v.x<=size[0]-12,'Focus right visible');
  assert.ok(n.y*v.scale+v.y>=12,'Focus top visible');
  assert.ok((n.y+n.height)*v.scale+v.y<=size[1]-48,'Focus bottom visible');
 }
});
