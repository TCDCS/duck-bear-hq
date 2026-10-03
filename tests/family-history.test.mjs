import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/hq-fixture.mjs';
import {initialise} from '../src/hq/schema.mjs';
import {createRecord,getRecord,listRecords,updateRecord,validate} from '../src/hq/records.mjs';
const owner={id:'owner',role:'admin'},guest={id:'guest',role:'member'};
async function ready(){const f=await fixture();await initialise(f.env,owner);return f;}

test('family profile preserves portrait, type, source evidence and broad locations',async()=>{const f=await ready();try{
const p=await createRecord(f.env,owner,'person',{name:'Example Person',entityType:'person',birth:'1929-12-02',death:'2023-12-30',currentPlace:'A town',birthPlace:'A hospital',isRoot:true,evidence:'family',sourceNotes:'Family confirmation',aliases:['Earlier Name'],confidence:'confirmed'});
assert.equal(p.data.isRoot,true);assert.equal(p.data.evidence,'family');assert.equal(p.data.currentPlace,'A town');assert.deepEqual(p.data.aliases,['Earlier Name']);
}finally{f.close();}});
test('events support partial dates without fabricated day precision',async()=>{const f=await ready();try{
const p=await createRecord(f.env,owner,'person',{name:'Example'});
const e=await createRecord(f.env,owner,'lifeEvent',{personId:p.id,title:'Joined employer',eventType:'career',start:'2010-01',end:'2013-05',evidence:'family'});
assert.equal(e.data.start,'2010-01');assert.equal(e.data.end,'2013-05');
await assert.rejects(createRecord(f.env,owner,'lifeEvent',{personId:p.id,title:'Invalid day',start:'2019-02-30'}),/date/i);
}finally{f.close();}});
test('family access does not expose household-only family details',async()=>{const f=await ready();try{
const p=await createRecord(f.env,owner,'person',{name:'Child',birth:'Year awaiting confirmation'});
const privateRow=await createRecord(f.env,owner,'familyPrivate',{personId:p.id,title:'Household details',address:'Private home supplied by owner',birth:'2001 or 2021 — unresolved'});
assert.equal(privateRow.section,'intimate');
await f.env.DB.prepare("INSERT INTO hq_grants(user_id,section,role,can_export,updated_by,updated_at) VALUES('guest','family','read',1,'owner','2026-10-03')").run();
await assert.rejects(getRecord(f.env,guest,privateRow.id),/access|private/i);
await assert.rejects(listRecords(f.env,guest,{kind:'familyPrivate'}),/access|private/i);
const visible=await listRecords(f.env,guest,{});assert.equal(JSON.stringify(visible).includes('Private home'),false);
}finally{f.close();}});
test('map places reject invalid coordinates and missing coordinate pairs',async()=>{const f=await ready();try{
await assert.rejects(createRecord(f.env,owner,'familyPlace',{title:'Bad place',latitude:999,longitude:3}),/coordinate|latitude/i);
await assert.rejects(createRecord(f.env,owner,'familyPlace',{title:'Incomplete place',latitude:2}),/coordinate|together/i);
const p=await createRecord(f.env,owner,'familyPlace',{title:'Unknown village',precision:'unmapped',notes:'District not yet identified'});assert.equal(p.data.latitude,null);
}finally{f.close();}});
test('research records remain separate from person-parent facts; sources reject script links',async()=>{const f=await ready();try{
const r=await createRecord(f.env,owner,'familyResearch',{title:'Earlier parentage',status:'open',details:'Unconnected candidate household'});assert.equal(r.kind,'familyResearch');
await assert.rejects(createRecord(f.env,owner,'familySource',{title:'Bad link',url:'javascript:alert(1)'}),/https|link/i);
}finally{f.close();}});
