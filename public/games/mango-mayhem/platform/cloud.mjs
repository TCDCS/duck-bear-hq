/** Owner-bound, revisioned sync. Dirty progress remains local during outages. */
import {mergeProgress} from '../core/progress.mjs';
const ROOT='/api/mango/profiles';
export class CloudProfiles{
 constructor(local,{fetch:fetcher=(...args)=>globalThis.fetch(...args),clock=()=>Date.now()}={}){this.local=local;this.fetch=fetcher;this.clock=clock;this.ownerId=null;this.remote=[];this.status='Checking cloud saves…';this.busy=false;this.retryAt=0;this.listeners=new Set();this.epoch=0;}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}notify(){for(const fn of this.listeners)fn();}
 async request(path='',method='GET',body){const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);try{
  const response=await this.fetch(ROOT+path,{method,credentials:'same-origin',cache:'no-store',signal:abort.signal,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({error:'Cloud response could not be read.'}));if(!response.ok){const error=new Error(data.error||'Cloud saving is unavailable.');Object.assign(error,{status:response.status,current:data.current,retryAfter:Number(response.headers.get('Retry-After'))||30});throw error;}return data;
 }finally{clearTimeout(timer);}}
 failure(error){if(error.status===401){this.ownerId=null;this.remote=[];this.status='Device saves ready. Sign in to save across devices.';}else if(error.status===429){this.retryAt=this.clock()+error.retryAfter*1000;this.status='Cloud saving is busy. Device progress is kept; a retry is queued.';}else if(error.status===404)this.status='This cloud profile was removed. Its device copy is still here.';else this.status='Cloud unavailable. Device progress is kept and will retry.';this.notify();}
 async refresh(){const epoch=++this.epoch;try{
  const data=await this.request();if(epoch!==this.epoch)return false;this.ownerId=data.ownerId;this.remote=data.profiles;
  for(const p of this.local.list().filter(p=>p.cloud?.ownerId===this.ownerId&&!p.cloud.deleted)){
   const remote=this.remote.find(r=>r.id===p.cloud.id);
   if(!remote){this.local.update(p.id,v=>({...v,cloud:{...v.cloud,deleted:true}}));continue;}
   if(p.cloud.dirty){const merged=mergeProgress(p.progress,remote.progress);this.local.update(p.id,v=>({...v,progress:merged,cloud:{...v.cloud,revision:remote.revision,dirty:true}}));}
   else if(remote.revision!==p.cloud.revision)this.local.cloudSaved(p.id,remote);
  }
  this.status='Signed in. Cloud profiles are ready.';this.notify();return true;
 }catch(e){if(epoch===this.epoch)this.failure(e);return false;}}
 async upload(localId){if(!this.ownerId)throw Error('Sign in using your existing Duck & Bear account first.');const p=this.local.get(localId);if(!p)throw Error('Profile not found.');if(p.cloud)throw Error('This profile is already linked to an account.');
  const owner=this.ownerId;let remote;try{remote=(await this.request('','POST',{nickname:p.nickname,avatarId:p.avatarId})).profile;}catch(e){this.failure(e);throw e;}
  if(owner!==this.ownerId)throw Error('The account changed. Refresh profiles before linking.');this.local.link(localId,{ownerId:owner,id:remote.id,revision:remote.revision,dirty:true});this.remote.push(remote);await this.flush();return this.local.get(localId);
 }
 download(remoteId){const remote=this.remote.find(p=>p.id===remoteId);if(!remote||!this.ownerId)throw Error('Refresh the cloud profile list first.');const existing=this.local.list().find(p=>p.cloud?.ownerId===this.ownerId&&p.cloud.id===remoteId);if(existing){this.local.select(existing.id);return existing;}
  const p=this.local.create(remote.nickname,remote.avatarId);this.local.saveProgress(p.id,remote.progress);this.local.link(p.id,{ownerId:this.ownerId,id:remote.id,revision:remote.revision,dirty:false});return this.local.get(p.id);
 }
 async flush(){if(this.busy||!this.ownerId||this.clock()<this.retryAt)return;this.busy=true;const owner=this.ownerId;
  try{for(const first of this.local.list()){
   if(first.cloud?.ownerId!==owner||!first.cloud.dirty||first.cloud.deleted)continue;
   for(let attempt=0;attempt<3;attempt++){
    const p=this.local.get(first.id);if(!p||p.cloud?.ownerId!==owner||this.ownerId!==owner||!p.cloud.dirty)break;
    const sent=JSON.stringify(p.progress);try{
     const {profile}=await this.request('/'+p.cloud.id+'/progress','PUT',{revision:p.cloud.revision,progress:p.progress});
     if(this.ownerId!==owner)break;const current=this.local.get(p.id);if(!current)break;
     const changed=JSON.stringify(current.progress)!==sent;
     this.local.update(p.id,v=>({...v,progress:changed?mergeProgress(v.progress,profile.progress):profile.progress,cloud:{...v.cloud,revision:profile.revision,dirty:changed},updatedAt:profile.updatedAt}));
     this.remote=this.remote.map(r=>r.id===profile.id?profile:r);this.status='Cloud saved';this.notify();if(!changed)break;
    }catch(e){
     if(e.status===409&&e.current){const current=this.local.get(p.id);if(!current)break;this.local.update(p.id,v=>({...v,progress:mergeProgress(v.progress,e.current.progress),cloud:{...v.cloud,revision:e.current.revision,dirty:true}}));continue;}
     if(e.status===404){await this.refresh();if(this.ownerId!==owner)break;}this.failure(e);break;
    }
   }
  }}finally{this.busy=false;this.notify();}
 }
 async rename(localId,nickname,avatarId){const p=this.local.get(localId);if(!p)throw Error('Profile not found.');if(!p.cloud){this.local.rename(localId,nickname,avatarId);return;}
  if(p.cloud.ownerId!==this.ownerId||p.cloud.deleted)throw Error('Sign in to the linked account to rename this cloud profile.');await this.flush();const latest=this.local.get(localId);
  try{const {profile}=await this.request('/'+latest.cloud.id,'PUT',{revision:latest.cloud.revision,nickname,avatarId});this.local.cloudSaved(localId,profile);await this.refresh();}catch(e){this.failure(e);throw e;}
 }
 async removeCloud(localId){const p=this.local.get(localId);if(!p?.cloud||p.cloud.ownerId!==this.ownerId)throw Error('Sign in to the linked account first.');await this.request('/'+p.cloud.id,'DELETE',{revision:p.cloud.revision});this.local.remove(localId);this.remote=this.remote.filter(r=>r.id!==p.cloud.id);this.notify();}
}
