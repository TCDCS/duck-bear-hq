import test from 'node:test';
import assert from 'node:assert/strict';
import {seeded} from './api.test.mjs';
import * as state from '../../src/books/state.mjs';
test('a lost annotation response can be retried without another revision or false conflict',async()=>{
 const env=await seeded();try{
  const id=crypto.randomUUID(),input={fileId:'file_test',version:'v1',kind:'note',locator:{type:'pdf',page:2},note:'Keep this thought',revision:0};
  const saved=await state.saveAnnotation(env,{id:'zachary'},id,input);
  assert.deepEqual(await state.saveAnnotation(env,{id:'zachary'},id,input),saved);
  const deleted=await state.saveAnnotation(env,{id:'zachary'},id,{...input,revision:1,deleted:true});
  assert.deepEqual(await state.saveAnnotation(env,{id:'zachary'},id,{...input,revision:1,deleted:true}),deleted);
  await assert.rejects(()=>state.saveAnnotation(env,{id:'zachary'},id,{...input,note:'Different edit',revision:1}),e=>e.status===409&&e.code==='annotation_conflict'&&e.details.current.deleted);
 }finally{env.DB.close();}
});
