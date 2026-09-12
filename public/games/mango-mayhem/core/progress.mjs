/** Pure, canonical progress shared by the browser and protected save API. */
import {LEVEL_IDS,COSTUME_IDS,MANGO_IDS,ACCESSORIES} from '../content/catalog.mjs';
const mangoSet=new Set(MANGO_IDS),levelSet=new Set(LEVEL_IDS),accessorySet=new Set(ACCESSORIES.map(a=>a.id));
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=message=>{throw new TypeError(message);};
export function emptyProgress(){return {schemaVersion:1,dataVersion:1,levels:Object.fromEntries(LEVEL_IDS.map(id=>[id,{cleared:false,checkpointIndex:0,mangoIds:[]}])),equippedCostume:'starter',accessory:null};}
export function unlockedLevelIds(p){let n=1;while(n<6&&p.levels[LEVEL_IDS[n-1]].cleared)n++;return LEVEL_IDS.slice(0,n);}
export function unlockedCostumeIds(p){return ['starter',...LEVEL_IDS.filter(id=>p.levels[id].cleared).map(id=>COSTUME_IDS[LEVEL_IDS.indexOf(id)+1])];}
export function collectionTotal(p){return LEVEL_IDS.reduce((n,id)=>n+p.levels[id].mangoIds.length,0);}
export function unlockedAccessories(p){const total=collectionTotal(p);return ACCESSORIES.filter(a=>total>=a.threshold).map(a=>a.id);}
export function normaliseProgress(value,{strict=false}={}){
 const out=emptyProgress();
 const check=(okay,message)=>{if(!okay&&strict)fail(message);return okay;};
 if(!check(plain(value),'Invalid progress object.'))return out;
 if(!check(value.schemaVersion===1&&value.dataVersion===1,'Unsupported save version.'))return out;
 check(Object.keys(value).every(k=>Object.hasOwn(out,k)),'Unknown progress field.');
 if(!check(plain(value.levels),'Invalid level progress.'))return out;
 check(Object.keys(value.levels).every(k=>levelSet.has(k)),'Unknown level.');
 let allPrevious=true;
 for(const id of LEVEL_IDS){
  const raw=value.levels[id],p=out.levels[id];
  if(!check(plain(raw),'Missing level progress.')){allPrevious=false;continue;}
  check(Object.keys(raw).every(k=>['cleared','checkpointIndex','mangoIds'].includes(k)),'Unknown level field.');
  check(typeof raw.cleared==='boolean','Invalid level clear flag.');
  if(raw.cleared===true){if(check(allPrevious,'Levels must be cleared in order; this level is locked.'))p.cleared=true;}
  allPrevious=allPrevious&&p.cleared;
  if(check(Number.isInteger(raw.checkpointIndex)&&raw.checkpointIndex>=0&&raw.checkpointIndex<=3,'Invalid checkpoint.'))p.checkpointIndex=raw.checkpointIndex;
  if(p.cleared)p.checkpointIndex=3;
  if(check(Array.isArray(raw.mangoIds)&&raw.mangoIds.length<=120,'Invalid mango collection.')){
   check(raw.mangoIds.every(m=>mangoSet.has(m)),'Unknown mango ID.');
   check(new Set(raw.mangoIds).size===raw.mangoIds.length,'Duplicate mango IDs.');
   p.mangoIds=[...new Set(raw.mangoIds.filter(m=>mangoSet.has(m)))].sort();
  }
 }
 if(check(COSTUME_IDS.includes(value.equippedCostume)&&unlockedCostumeIds(out).includes(value.equippedCostume),'Costume is unknown or locked.'))out.equippedCostume=value.equippedCostume;
 if(value.accessory===null)out.accessory=null;
 else if(check(accessorySet.has(value.accessory)&&unlockedAccessories(out).includes(value.accessory),'Accessory is unknown or locked.'))out.accessory=value.accessory;
 return out;
}
function copy(p,id){if(id!==undefined&&!levelSet.has(id))fail('Unknown level.');return structuredClone(p);}
export function recordPickup(p,id,mangoId){if(!mangoSet.has(mangoId))fail('Unknown mango.');const out=copy(p,id);if(!out.levels[id].mangoIds.includes(mangoId))out.levels[id].mangoIds.push(mangoId);out.levels[id].mangoIds.sort();return out;}
export function recordCheckpoint(p,id,index){if(!Number.isInteger(index)||index<0||index>3)fail('Invalid checkpoint.');const out=copy(p,id);out.levels[id].checkpointIndex=Math.max(index,out.levels[id].checkpointIndex);return out;}
export function clearLevel(p,id){if(!unlockedLevelIds(p).includes(id))fail('Level is locked.');const out=copy(p,id);out.levels[id].cleared=true;out.levels[id].checkpointIndex=3;return out;}
export function equipCostume(p,id){if(!unlockedCostumeIds(p).includes(id))fail('Costume is locked.');return {...p,equippedCostume:id};}
export function equipAccessory(p,id){if(id!==null&&!unlockedAccessories(p).includes(id))fail('Accessory is locked.');return {...p,accessory:id};}
export function mergeProgress(local,remote){
 const a=normaliseProgress(local,{strict:true}),b=normaliseProgress(remote,{strict:true}),out=emptyProgress();
 for(const id of LEVEL_IDS)out.levels[id]={cleared:a.levels[id].cleared||b.levels[id].cleared,checkpointIndex:Math.max(a.levels[id].checkpointIndex,b.levels[id].checkpointIndex),mangoIds:[...new Set([...a.levels[id].mangoIds,...b.levels[id].mangoIds])].sort()};
 out.equippedCostume=a.equippedCostume;out.accessory=a.accessory;
 return normaliseProgress(out,{strict:true});
}
