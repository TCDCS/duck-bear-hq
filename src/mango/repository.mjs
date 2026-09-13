import {emptyProgress,normaliseProgress} from '../../public/games/mango-mayhem/core/progress.mjs';
import {AVATAR_IDS} from '../../public/games/mango-mayhem/content/catalog.mjs';
export class SaveError extends Error{constructor(status,message,current=null,retryAfter=null){super(message);this.status=status;this.current=current;this.retryAfter=retryAfter;}}
export function validateName(name){if(typeof name!=='string'||!name.trim()||name.trim().length>24||/[<>\x00-\x1f\x7f]/.test(name))throw new SaveError(400,'Use a nickname of 1–24 characters.');return name.trim();}
function validateAvatar(id){if(!AVATAR_IDS.includes(id))throw new SaveError(400,'Choose an available avatar.');return id;}
function revision(v){if(!Number.isSafeInteger(v)||v<0)throw new SaveError(400,'A valid save revision is required.');return v;}
function progress(v){try{return normaliseProgress(v,{strict:true});}catch(e){throw new SaveError(400,e.message);}}
function safe(row){return row?{id:row.id,slot:row.slot,nickname:row.nickname,avatarId:row.avatar_id,progress:progress(JSON.parse(row.progress_json)),revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at}:null;}
export function createProfileRepository(db,{clock=()=>Date.now(),id=()=>`mg_${crypto.randomUUID()}`}={}){
 const now=()=>new Date(clock()).toISOString();
 const get=async(ownerId,profileId)=>safe(await db.prepare('SELECT id,slot,nickname,avatar_id,progress_json,revision,created_at,updated_at FROM mango_profiles WHERE owner_user_id=? AND id=?').bind(ownerId,profileId).first());
 async function conflict(ownerId,profileId){const current=await get(ownerId,profileId);throw current?new SaveError(409,'This profile changed on another device. Refresh and merge before saving.',current):new SaveError(404,'This profile is no longer available.');}
 return {
  async list(ownerId){const result=await db.prepare('SELECT id,slot,nickname,avatar_id,progress_json,revision,created_at,updated_at FROM mango_profiles WHERE owner_user_id=? ORDER BY slot').bind(ownerId).all();return result.results.map(safe);},get,
  async create(ownerId,body){const nickname=validateName(body.nickname),avatarId=validateAvatar(body.avatarId),profileId=id(),t=now();
   // D1 limits compound SELECTs to five terms. A two-term recursive CTE generates all six slots atomically.
   for(let attempt=0;attempt<6;attempt++){
    try{const result=await db.prepare(`WITH RECURSIVE slots(n) AS (VALUES(0) UNION ALL SELECT n+1 FROM slots WHERE n<5)
      INSERT INTO mango_profiles(id,owner_user_id,slot,nickname,avatar_id,progress_json,revision,created_at,updated_at)
      SELECT ?,?,slots.n,?,?,?,0,?,? FROM slots
      WHERE NOT EXISTS(SELECT 1 FROM mango_profiles p WHERE p.owner_user_id=? AND p.slot=slots.n) ORDER BY slots.n LIMIT 1`).bind(profileId,ownerId,nickname,avatarId,JSON.stringify(emptyProgress()),t,t,ownerId).run();
     if(!result.meta.changes)throw new SaveError(409,'This account has six profiles. Remove one before adding another.');return await get(ownerId,profileId);
    }catch(e){if(e instanceof SaveError)throw e;if(!/unique/i.test(String(e))||attempt===5)throw e;}
   }
  },
  async save(ownerId,profileId,body){const p=progress(body.progress),v=revision(body.revision);const result=await db.prepare('UPDATE mango_profiles SET progress_json=?,revision=revision+1,updated_at=? WHERE owner_user_id=? AND id=? AND revision=?').bind(JSON.stringify(p),now(),ownerId,profileId,v).run();if(!result.meta.changes)return conflict(ownerId,profileId);return get(ownerId,profileId);},
  async rename(ownerId,profileId,body){const name=validateName(body.nickname),avatarId=validateAvatar(body.avatarId),v=revision(body.revision);const result=await db.prepare('UPDATE mango_profiles SET nickname=?,avatar_id=?,revision=revision+1,updated_at=? WHERE owner_user_id=? AND id=? AND revision=?').bind(name,avatarId,now(),ownerId,profileId,v).run();if(!result.meta.changes)return conflict(ownerId,profileId);return get(ownerId,profileId);},
  async remove(ownerId,profileId,body){const result=await db.prepare('DELETE FROM mango_profiles WHERE owner_user_id=? AND id=? AND revision=?').bind(ownerId,profileId,revision(body.revision)).run();if(!result.meta.changes)return conflict(ownerId,profileId);return {deleted:true};},
  async limit(ownerId,kind){const duration=kind==='create'?3600000:60000,max=kind==='create'?10:60,t=clock(),windowStart=Math.floor(t/duration)*duration;
   const row=await db.prepare(`INSERT INTO mango_rate_limits(owner_user_id,kind,window_start,hits) VALUES(?,?,?,1)
    ON CONFLICT(owner_user_id,kind) DO UPDATE SET hits=CASE WHEN mango_rate_limits.window_start=excluded.window_start THEN MIN(mango_rate_limits.hits+1,1000) ELSE 1 END,window_start=excluded.window_start RETURNING hits`).bind(ownerId,kind,windowStart).first();
   if(row.hits>max)throw new SaveError(429,'Too many save requests. Your game can continue; cloud saving will retry shortly.',null,Math.ceil((windowStart+duration-t)/1000));
  }
 };
}
