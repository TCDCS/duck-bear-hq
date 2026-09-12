import {emptyProgress,normaliseProgress} from '../core/progress.mjs';
import {AVATAR_IDS} from '../content/catalog.mjs';
import {normaliseBindings,DEFAULT_BINDINGS} from './input.mjs';
const KEY='mango-mayhem-v1';
export function profileId(random=crypto){if(typeof random.randomUUID==='function')return random.randomUUID();const bytes=random.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export const DEFAULT_SETTINGS=Object.freeze({music:.35,effects:.65,reducedMotion:false,extraHelp:false,touch:'auto',bindings:DEFAULT_BINDINGS,padJump:0,padSpin:2});
export function cleanNickname(value){const s=String(value??'').replace(/[<>\x00-\x1f\x7f]/g,'').trim();if(!s||s.length>24)throw new TypeError('Use a nickname of 1–24 characters.');return s;}
export function cleanSettings(value={}){const fraction=(v,f)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):f;return {music:fraction(value.music,.35),effects:fraction(value.effects,.65),reducedMotion:!!value.reducedMotion,extraHelp:!!value.extraHelp,touch:['auto','always','off'].includes(value.touch)?value.touch:'auto',bindings:normaliseBindings(value.bindings),padJump:Number.isInteger(value.padJump)&&value.padJump>=0&&value.padJump<=7?value.padJump:0,padSpin:Number.isInteger(value.padSpin)&&value.padSpin>=0&&value.padSpin<=7?value.padSpin:2};}
const fresh=()=>({version:1,selectedId:null,profiles:[],settings:{...DEFAULT_SETTINGS}});
export class LocalProfiles{
 constructor(storage){this.storage=storage;this.persistent=true;this.notice='';this.data=fresh();this.listeners=new Set();let raw;
  try{raw=storage?.getItem(KEY);}catch{this.persistent=false;this.notice='Browser storage is unavailable. Progress is not being saved on this device.';}
  if(raw){try{
   const v=JSON.parse(raw);if(v.version!==1||!Array.isArray(v.profiles)||v.profiles.length>6)throw Error('Unknown save format');
   const ids=new Set();this.data.profiles=v.profiles.map(p=>{if(typeof p.id!=='string'||p.id.length>80||ids.has(p.id))throw Error('Bad profile');ids.add(p.id);
    const cloud=p.cloud&&typeof p.cloud.ownerId==='string'&&typeof p.cloud.id==='string'&&Number.isInteger(p.cloud.revision)?{ownerId:p.cloud.ownerId,id:p.cloud.id,revision:p.cloud.revision,dirty:!!p.cloud.dirty,deleted:!!p.cloud.deleted}:null;
    return {id:p.id,nickname:cleanNickname(p.nickname),avatarId:AVATAR_IDS.includes(p.avatarId)?p.avatarId:'mango',progress:normaliseProgress(p.progress,{strict:true}),cloud,updatedAt:typeof p.updatedAt==='string'?p.updatedAt:new Date().toISOString()};});
   this.data.selectedId=ids.has(v.selectedId)?v.selectedId:this.data.profiles[0]?.id||null;this.data.settings=cleanSettings(v.settings);
  }catch{this.data=fresh();this.notice='The saved file is unreadable or damaged. A backup has been kept where storage permits. Create a new profile to play.';try{storage.setItem(KEY+'-backup',raw);}catch{this.persistent=false;}}}
 }
 get selectedId(){return this.data.selectedId;}get settings(){return structuredClone(this.data.settings);}
 list(){return structuredClone(this.data.profiles);}get(id=this.selectedId){return structuredClone(this.data.profiles.find(p=>p.id===id)||null);}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 persist(){try{if(!this.storage)throw Error('No storage');this.storage.setItem(KEY,JSON.stringify(this.data));this.persistent=true;}catch{this.persistent=false;this.notice='Browser storage is full or unavailable. Your current progress is not being saved on this device.';}for(const fn of this.listeners)fn();}
 create(nickname,avatarId='mango'){if(this.data.profiles.length>=6)throw new Error('This device has six profiles. Remove one before adding another.');if(!AVATAR_IDS.includes(avatarId))throw new TypeError('Choose an available avatar.');const p={id:profileId(),nickname:cleanNickname(nickname),avatarId,progress:emptyProgress(),cloud:null,updatedAt:new Date().toISOString()};this.data.profiles.push(p);this.data.selectedId=p.id;this.persist();return structuredClone(p);}
 select(id){if(!this.data.profiles.some(p=>p.id===id))throw Error('Profile not found.');this.data.selectedId=id;this.persist();}
 update(id,fn){const i=this.data.profiles.findIndex(p=>p.id===id);if(i<0)throw Error('Profile not found.');this.data.profiles[i]=fn(this.data.profiles[i]);this.persist();return this.get(id);}
 saveProgress(id,progress){const safe=normaliseProgress(progress,{strict:true});return this.update(id,p=>({...p,progress:safe,updatedAt:new Date().toISOString(),cloud:p.cloud?{...p.cloud,dirty:true}:null}));}
 rename(id,nickname,avatarId){if(!AVATAR_IDS.includes(avatarId))throw Error('Invalid avatar.');return this.update(id,p=>({...p,nickname:cleanNickname(nickname),avatarId}));}
 remove(id){this.data.profiles=this.data.profiles.filter(p=>p.id!==id);if(this.data.selectedId===id)this.data.selectedId=this.data.profiles[0]?.id||null;this.persist();}
 link(id,cloud){return this.update(id,p=>({...p,cloud:{ownerId:cloud.ownerId,id:cloud.id,revision:cloud.revision,dirty:!!cloud.dirty,deleted:false}}));}
 cloudSaved(id,remote){return this.update(id,p=>({...p,nickname:remote.nickname??p.nickname,avatarId:remote.avatarId??p.avatarId,progress:normaliseProgress(remote.progress,{strict:true}),cloud:{...p.cloud,revision:remote.revision,dirty:false},updatedAt:remote.updatedAt||p.updatedAt}));}
 setSettings(settings){this.data.settings=cleanSettings(settings);this.persist();}
}
