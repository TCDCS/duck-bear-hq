import test from 'node:test';
import assert from 'node:assert/strict';
let module={};try{module=await import('../../public/books/sync.mjs');}catch{}
const copy=v=>structuredClone(v),file={id:'file_1',version:'v1'},user='reader-a';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function fixture(){
 assert.equal(typeof module.createSyncQueue,'function','a durable sync queue must be implemented');
 const records=new Map();let epoch='session-1',active=user;
 const identity=async u=>{if(u!==active)throw Object.assign(new Error('Account changed'),{status:401,code:'identity_changed'});return epoch;};
 const store={
  identity,
  async transaction(u,keys,change,expected){await identity(u);if(expected!==undefined&&expected!==epoch)throw Object.assign(new Error('Account changed'),{status:401,code:'identity_changed'});const values=Object.fromEntries(keys.map(k=>[k,copy(records.get(k))]));const result=change(values);for(const k of keys){if(values[k]===undefined)records.delete(k);else records.set(k,copy(values[k]));}return copy(result);},
  async all(u,type){await identity(u);return [...records].filter(([k])=>k.startsWith(`${u}:${type}:`)).map(([,v])=>copy(v));},
  exclusive:async(_key,fn)=>fn()
 };
 const queue=module.createSyncQueue(store,{deviceId:()=> 'test-device-001',operationId:()=>crypto.randomUUID()});
 return {queue,records,switchUser(){records.clear();active='reader-b';epoch='session-2';}};
}
const state=(progress=0.1,revision=0)=>({revision,progress,locator:{type:'pdf',page:Math.round(progress*10)||1}});
const response=p=>({...p,revision:p.revision+1,furthest:p.progress});
const pending=`${user}:pending:file_1@v1`,position=`${user}:progress:file_1@v1`;
test('an edit arriving during sync is drained with the acknowledged revision',async()=>{
 const {queue,records}=fixture(),gate=deferred(),started=deferred(),sent=[];
 await queue.queueProgress(user,file,state(0.1));
 const syncing=queue.flushProgress(user,file,async(_path,{data})=>{sent.push(copy(data));if(sent.length===1){started.resolve();await gate.promise;}return response(data);});
 await started.promise;await queue.queueProgress(user,file,state(0.8));gate.resolve();await syncing;
 assert.deepEqual(sent.map(p=>[p.revision,p.progress]),[[0,0.1],[1,0.8]]);
 assert.equal(records.has(pending),false);assert.equal(records.get(position).progress,0.8);assert.equal(records.get(position).revision,2);assert.ok(!records.get(position).dirty);
});
test('a lost reply replays its exact operation before sending newer reading progress',async()=>{
 const {queue,records}=fixture(),sent=[],accepted=new Map();await queue.queueProgress(user,file,state(0.2));
 await assert.rejects(()=>queue.flushProgress(user,file,async(_path,{data})=>{sent.push(copy(data));accepted.set(data.opId,response(data));throw new TypeError('Connection lost after commit');}));
 await queue.queueProgress(user,file,state(0.7));
 await queue.flushProgress(user,file,async(_path,{data})=>{sent.push(copy(data));return accepted.get(data.opId)||response(data);});
 assert.deepEqual(sent[1],sent[0]);assert.equal(sent[2].revision,1);assert.equal(sent[2].progress,0.7);assert.equal(records.get(position).revision,2);
});
test('parallel flush callers share a single network save',async()=>{
 const {queue}=fixture();let count=0;await queue.queueProgress(user,file,state());
 const api=async(_,{data})=>{count++;await new Promise(r=>setTimeout(r,5));return response(data);};
 await Promise.all([queue.flushProgress(user,file,api),queue.flushProgress(user,file,api)]);assert.equal(count,1);
});
test('late sync after account switch cannot recreate the old account records',async()=>{
 const {queue,records,switchUser}=fixture(),gate=deferred(),started=deferred();await queue.queueProgress(user,file,state());
 const syncing=queue.flushProgress(user,file,async(_,{data})=>{started.resolve();await gate.promise;return response(data);});
 await started.promise;switchUser();gate.resolve();await assert.rejects(()=>syncing,e=>e.code==='identity_changed');assert.equal(records.size,0);
});
test('reading conflicts preserve the latest local position and allow an explicit cloud choice',async()=>{
 const {queue,records}=fixture(),cloud={...state(0.9,4),fileId:file.id,version:file.version};await queue.queueProgress(user,file,state(0.3));let conflict;
 await assert.rejects(()=>queue.flushProgress(user,file,async()=>{throw Object.assign(new Error('Conflict'),{status:409,code:'progress_conflict',details:{current:cloud}});},(current,local)=>{conflict={current,local};}),e=>e.code==='progress_conflict');
 assert.equal(records.get(pending).payload.progress,0.3);assert.equal(conflict.current.revision,4);assert.equal(conflict.local.progress,0.3);
 await queue.resolveProgress(user,file,'cloud',cloud);assert.equal(records.has(pending),false);assert.deepEqual(records.get(position),cloud);
});
test('keeping this device rebases and persists its position before retrying',async()=>{
 const {queue,records}=fixture();await queue.queueProgress(user,file,state(0.4));await queue.resolveProgress(user,file,'device',state(0.9,5));assert.equal(records.get(position).revision,5);
 await queue.flushProgress(user,file,async(_,{data})=>{assert.equal(data.revision,5);assert.equal(data.progress,0.4);return response(data);});assert.equal(records.get(position).revision,6);
});
const note={id:'note_test_123456',fileId:file.id,version:file.version,kind:'note',locator:{type:'pdf',page:2},note:'first',revision:0,deleted:false};
test('editing a note during its save preserves the edit and advances its base revision',async()=>{
 const {queue,records}=fixture(),gate=deferred(),started=deferred(),sent=[];await queue.saveLocalNote(user,note);
 const syncing=queue.flushNotes(user,async(_,{data})=>{sent.push(copy(data));if(sent.length===1){started.resolve();await gate.promise;}return {...data,revision:data.revision+1};});
 await started.promise;await queue.saveLocalNote(user,{...note,note:'second'});gate.resolve();await syncing;
 assert.deepEqual(sent.map(n=>[n.revision,n.note]),[[0,'first'],[1,'second']]);assert.equal(records.get(`${user}:note:${note.id}`).revision,2);assert.equal(records.has(`${user}:note-pending:${note.id}`),false);
});
test('note conflicts remain structured and both versions survive for resolution',async()=>{
 const {queue,records}=fixture(),current={...note,note:'other device',revision:3};await queue.saveLocalNote(user,note);
 await assert.rejects(()=>queue.flushNotes(user,async()=>{throw Object.assign(new Error('Note conflict'),{status:409,code:'annotation_conflict',details:{current}});}),e=>e.status===409&&e.details.current.note==='other device');
 assert.equal(records.get(`${user}:note:${note.id}`).note,'first');assert.equal(records.get(`${user}:note-conflict:${note.id}`).current.note,'other device');
 await queue.resolveNote(user,note.id,'cloud',current);assert.equal(records.get(`${user}:note:${note.id}`).note,'other device');assert.equal(records.has(`${user}:note-pending:${note.id}`),false);
});
test('lost note replies are replayed before a newer local note is submitted',async()=>{
 const {queue}=fixture(),sent=[];await queue.saveLocalNote(user,note);
 await assert.rejects(()=>queue.flushNotes(user,async(_,{data})=>{sent.push(copy(data));throw new TypeError('Lost reply');}));
 await queue.saveLocalNote(user,{...note,note:'newer'});
 await queue.flushNotes(user,async(_,{data})=>{sent.push(copy(data));return {...data,revision:data.revision+1};});
 assert.deepEqual(sent[1],sent[0]);assert.equal(sent[2].revision,1);assert.equal(sent[2].note,'newer');
});
test('one conflicting note does not block unrelated pending notes',async()=>{
 const {queue,records}=fixture();await queue.saveLocalNote(user,note);await queue.saveLocalNote(user,{...note,id:'note_other_123456'});
 await assert.rejects(()=>queue.flushNotes(user,async(_,{data})=>{if(data.id===note.id)throw Object.assign(new Error('Conflict'),{status:409,code:'annotation_conflict',details:{current:{...note,revision:2}}});return {...data,revision:1};}),e=>e.code==='annotation_conflict');
 assert.equal(records.has(`${user}:note-pending:note_other_123456`),false);assert.equal(records.get(`${user}:note:note_other_123456`).revision,1);
});
