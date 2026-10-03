/** Durable queue logic. Storage transactions must atomically check the reader/epoch.
 * Keep in-flight payloads until acknowledged: an interrupted response is not proof
 * the server failed to save. No book text is sent by this module. */
export function createSyncQueue(store, {deviceId, operationId}) {
 const key=(user,type,id='')=>`${user}:${type}:${id}`;
 const progressKeys=(user,file)=>{
  const id=file.id+'@'+file.version;
  return {pending:key(user,'pending',id),state:key(user,'progress',id),flight:key(user,'progress-flight',id)};
 };
 const noteKeys=(user,id)=>({pending:key(user,'note-pending',id),state:key(user,'note',id),flight:key(user,'note-flight',id),conflict:key(user,'note-conflict',id)});
 const locks=new Map();
 function exclusive(name,fn){
  if(locks.has(name))return locks.get(name);
  const run=Promise.resolve().then(()=>store.exclusive(name,fn));locks.set(name,run);
  return run.finally(()=>{if(locks.get(name)===run)locks.delete(name);});
 }
 async function queueProgress(user,file,input){
  const k=progressKeys(user,file);
  return store.transaction(user,[k.pending,k.state],r=>{
   const revision=r[k.pending]?.payload.revision??r[k.state]?.revision??input.revision??0;
   const record={fileId:file.id,payload:{version:file.version,revision,locator:input.locator,progress:input.progress,deviceId:deviceId(),opId:operationId()}};
   r[k.pending]=record;r[k.state]={...input,revision,dirty:true};return record;
  });
 }
 function flushProgress(user,file,api,onConflict){
  const k=progressKeys(user,file);
  return exclusive(k.pending,async()=>{
   const epoch=await store.identity(user);let last=null;
   for(let sent=0;sent<50;sent++){
    const packet=await store.transaction(user,[k.pending,k.flight],r=>{
     const p=r[k.flight]||r[k.pending];if(p)r[k.flight]=p;return p;
    },epoch);
    if(!packet)return last;
    let saved;
    try{saved=await api(`/api/hq/books/files/${file.id}/progress`,{method:'PUT',data:packet.payload});}
    catch(error){
     if(error.status===409&&error.code==='progress_conflict'){
      const latest=await store.transaction(user,[k.pending,k.flight],r=>{delete r[k.flight];return r[k.pending]||packet;},epoch);
      onConflict?.(error.details.current,latest.payload);
     }
     throw error;
    }
    await store.transaction(user,[k.pending,k.state,k.flight],r=>{
     if(r[k.flight]?.payload.opId!==packet.payload.opId)return;
     delete r[k.flight];const latest=r[k.pending];
     if(latest?.payload.opId===packet.payload.opId){delete r[k.pending];r[k.state]=saved;}
     else if(latest){
      latest.payload.revision=saved.revision;
      r[k.state]={...r[k.state],revision:saved.revision,furthest:Math.max(r[k.state]?.furthest||0,saved.furthest||0),dirty:true};
     }
    },epoch);
    last=saved;
   }
   return last; // A continuously scrolling tab keeps its remaining queue, not a false acknowledgement.
  });
 }
 async function resolveProgress(user,file,choice,current){
  const k=progressKeys(user,file);
  return store.transaction(user,Object.values(k),r=>{
   delete r[k.flight];
   if(choice==='cloud'){delete r[k.pending];r[k.state]=current;return current;}
   const p=r[k.pending];
   if(p){p.payload.revision=current.revision;p.payload.opId=operationId();r[k.state]={...p.payload,fileId:file.id,dirty:true};return r[k.state];}
   return r[k.state]||current;
  });
 }
 async function saveLocalNote(user,note){
  const k=noteKeys(user,note.id);
  return store.transaction(user,[k.pending,k.state],r=>{
   const revision=r[k.pending]?.revision??r[k.state]?.revision??note.revision??0;
   r[k.state]={...note,revision};r[k.pending]=r[k.state];return r[k.state];
  });
 }
 function flushNotes(user,api){
  return exclusive(key(user,'notes-sync'),async()=>{
   const epoch=await store.identity(user);let firstError;
   for(const candidate of await store.all(user,'note-pending')){
    const k=noteKeys(user,candidate.id);
    try{
     for(let sent=0;sent<50;sent++){
      const packet=await store.transaction(user,[k.pending,k.flight,k.conflict],r=>{
       if(r[k.conflict])throw Object.assign(new Error('A note changed on another device. Choose which version to keep.'),{status:409,code:'annotation_conflict',details:{...r[k.conflict],id:candidate.id}});
       const p=r[k.flight]||r[k.pending];if(p)r[k.flight]=p;return p;
      },epoch);
      if(!packet)break;
      let saved;
      try{saved=await api('/api/hq/books/annotations/'+packet.id,{method:'PUT',data:packet});}
      catch(error){
       if(error.status===409&&error.code==='annotation_conflict'){
        await store.transaction(user,[k.flight,k.conflict],r=>{delete r[k.flight];r[k.conflict]={current:error.details?.current||null};},epoch);
        error.details={...error.details,id:packet.id};
       }
       throw error;
      }
      await store.transaction(user,[k.pending,k.state,k.flight],r=>{
       if(JSON.stringify(r[k.flight])!==JSON.stringify(packet))return;
       delete r[k.flight];const latest=r[k.pending];
       if(JSON.stringify(latest)===JSON.stringify(packet)){r[k.state]=saved;delete r[k.pending];}
       else if(latest){latest.revision=saved.revision;r[k.state]={...latest};}
      },epoch);
     }
    }catch(error){
     // Conflicts are local to one note. Authentication/network errors stop the batch.
     if(error.status!==409||error.code!=='annotation_conflict')throw error;
     firstError ||= error;
    }
   }
   if(firstError)throw firstError;
  });
 }
 async function resolveNote(user,id,choice,current){
  const k=noteKeys(user,id);
  return store.transaction(user,Object.values(k),r=>{
   delete r[k.flight];delete r[k.conflict];
   if(choice==='cloud'){delete r[k.pending];if(current)r[k.state]=current;else delete r[k.state];}
   else if(r[k.pending]){r[k.pending].revision=current?.revision||0;r[k.state]={...r[k.pending]};}
   return r[k.state];
  });
 }
 return {queueProgress,flushProgress,resolveProgress,saveLocalNote,flushNotes,resolveNote};
}
