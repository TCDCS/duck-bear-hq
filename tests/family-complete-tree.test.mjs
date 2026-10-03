import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../public/hq/family-genealogy.mjs';
import {familyData} from '../src/hq/family-fields.mjs';
const p=(id,data={})=>({id,kind:'person',section:'family',data:{name:id,entityType:'person',evidence:'family',...data}});
const r=(id,from,to,type='parent',data={})=>({id,kind:'relationship',data:{from,to,type,evidence:'family',...data}});
const pp=['focus','mother','father','bio1','bio2','adopt1','adopt2','aunt','cousin','partner','former','child','formerParent','old1','old2'].map(id=>p(id));
const rr=[r('m','mother','focus'),r('f','father','focus'),r('bm','bio1','father'),r('bf','bio2','father'),r('am','adopt1','father','adoptive-parent'),r('af','adopt2','father','adoptive-parent'),r('a1','adopt1','aunt','adoptive-parent'),r('a2','adopt2','aunt','adoptive-parent'),r('c','aunt','cousin'),r('fp','father','mother','former-partner'),r('bp','bio1','bio2','partner'),r('ap','adopt1','adopt2','partner'),r('cur','focus','partner','partner'),r('old','focus','former','former-partner'),r('fc','focus','child'),r('mc','former','child'),r('op','formerParent','former'),r('o1','old1','adopt1'),r('o2','old2','adopt1'),r('gp','old1','old2','partner')];
function noOverlap(l){for(let i=0;i<l.nodes.length;i++)for(const b of l.nodes.slice(i+1)){const a=l.nodes[i];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${a.id} overlaps ${b.id}`);}}
function segments(points){return points.slice(1).map((b,i)=>[points[i],b]);}
function hits(a,b,n){const x=n.x+1,y=n.y+1,right=n.x+n.width-1,bottom=n.y+n.height-1;return a.x===b.x?a.x>x&&a.x<right&&Math.max(a.y,b.y)>y&&Math.min(a.y,b.y)<bottom:a.y===b.y&&a.y>y&&a.y<bottom&&Math.max(a.x,b.x)>x&&Math.min(a.x,b.x)<right;}
test('card dates preserve complete known birth/death dates rather than years',()=>{
 assert.ok(model.lifespan({birth:'1990-10-11',death:'2019-06-07'}).includes('11 Oct 1990'));
 assert.ok(model.lifespan({birth:'1990-10-11',death:'2019-06-07'}).includes('7 Jun 2019'));
 assert.equal(model.lifespan({birth:'1942',livingStatus:'unknown'}),'1942 – ?');
});
test('complete tree includes everyone once including pets, associates and unlinked records',()=>{
 assert.equal(typeof model.completeFamilyLayout,'function');
 const people=[...pp,p('pet',{entityType:'pet'}),p('witness',{entityType:'associate'}),p('unlinked')];
 const rel=[...rr,r('dog','focus','pet','pet'),r('friend','focus','witness','witness')];
 const before=JSON.stringify([people,rel]),l=model.completeFamilyLayout(people,rel,'focus');
 assert.deepEqual(new Set(l.nodes.map(n=>n.id)),new Set(people.map(n=>n.id)));assert.equal(l.nodes.length,people.length);noOverlap(l);
 assert.ok(l.unlinkedIds.includes('unlinked'));assert.ok(!l.edges.some(e=>e.from==='partner'&&e.to==='child'));assert.equal(JSON.stringify([people,rel]),before);
 for(const e of l.edges)assert.ok(rel.some(s=>s.id===e.id),'Every drawn relationship comes from a record');
});
test('extended ancestry includes ancestors of co-parents and does not interleave couples',()=>{
 const l=model.extendedFamilyLayout(pp,rr,'focus',{extendedFamily:true,extendedAncestry:true,generations:6});noOverlap(l);
 assert.ok(l.nodes.some(n=>n.id==='formerParent'),'co-parent ancestry included');
 for(const [a,b] of [['bio1','bio2'],['adopt1','adopt2'],['old1','old2']]){
  const x=l.nodes.find(n=>n.id===a),y=l.nodes.find(n=>n.id===b);assert.equal(x.y,y.y);assert.ok(Math.abs(x.x-y.x)<=x.width+50,`${a}/${b} are kept together`);
 }
});
test('family connection routes avoid every unrelated card and use explicit relationship types',()=>{
 const l=model.completeFamilyLayout(pp,rr,'focus');
 for(const e of l.edges){assert.ok(e.points?.length>=2);for(const [a,b] of segments(e.points)){assert.ok(a.x===b.x||a.y===b.y);for(const n of l.nodes)if(n.id!==e.from&&n.id!==e.to)assert.ok(!hits(a,b,n),`${e.id} crosses ${n.id}`);}}
 assert.ok(l.edges.some(e=>e.type==='adoptive-parent'));assert.ok(l.edges.some(e=>e.id==='cur'&&e.type==='partner'));assert.ok(!l.edges.some(e=>e.id==='cur'&&e.type==='marriage'));
});
test('whole-tree positions are stable for input ordering; bad graph cycles cannot hang',()=>{
 const l=model.completeFamilyLayout(pp,rr,'focus');const b=model.completeFamilyLayout([...pp].reverse(),[...rr].reverse(),'focus');assert.deepEqual(l,b);
 const c=model.completeFamilyLayout(pp,[...rr,r('bad','focus','old1')],'focus');assert.equal(c.nodes.length,pp.length);noOverlap(c);assert.ok(c.warnings.length);
});
test('private exact birth is validated separately from remembered text and overlaid only when supplied to authorised view',()=>{
 const secret=familyData('familyPrivate',{personId:'kid',birth:'A family description',birthDate:'2021-06-23'});assert.equal(secret.birthDate,'2021-06-23');
 assert.throws(()=>familyData('familyPrivate',{personId:'kid',birthDate:'2021-02-31'}));
 const people=[p('kid',{birth:'2021'})];const snapshot=JSON.stringify(people);const projected=model.withPrivateBirthDates(people,[{id:'private',data:{...secret,address:'PRIVATE_ADDRESS',allergies:['PRIVATE_HEALTH']}}]);
 assert.equal(projected[0].data.birth,'2021-06-23');assert.equal(projected[0].data.birthDatePrivacy,'household');assert.equal(JSON.stringify(people),snapshot);assert.ok(!JSON.stringify(projected).includes('PRIVATE_ADDRESS'));assert.ok(!JSON.stringify(projected).includes('PRIVATE_HEALTH'));assert.equal(model.withPrivateBirthDates(people,[])[0].data.birth,'2021');
});
test('siblings and cousins with their own descendants share the correct visual generation',()=>{
 const people=[...pp,p('maunt'),p('mcousin'),p('grandchild')],rel=[...rr,r('sister','mother','maunt','sibling'),r('ca','maunt','mcousin'),r('cc','focus','mcousin','cousin'),r('grand','mcousin','grandchild')];
 const l=model.completeFamilyLayout(people,rel,'focus'),node=id=>l.nodes.find(n=>n.id===id);
 assert.equal(node('mother').y,node('maunt').y);assert.equal(node('focus').y,node('mcousin').y);assert.equal(node('child').y,node('grandchild').y);
});

test('a partner connection never asserts marriage without a marriage record',async()=>{
 const {RELATION_LABELS}=await import('../public/hq/family-model.mjs');
 assert.equal(RELATION_LABELS.partner,'Partner');assert.equal(RELATION_LABELS['former-partner'],'Former partner');
});
