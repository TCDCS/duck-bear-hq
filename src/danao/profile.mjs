const CHARACTERS=new Set(['Hero','Stephen','Zachary','Mulan','Gaby','Sara','Mum','Dad']);
const COSTUMES=new Set(['Arcade','KungFu','Wrestler','Pyjamas','RubberDuck','Panda','Space','MangoHero']);
const ARENAS=new Set(['WrestlingArena','DublinDocks','LondonUnderground','MangoMarket','TempleCourtyard','SichuanTeaHouse','IceFestival','HouseParty','ToyFactory','CruiseShip','MadCircus']);
const MODES=new Set(['OneVsOne','TwoVsTwo','FreeForAll','TeamKnockout','RoyalRumble','MangoGrab','HotBomb','KingOfTheRing','KingOfRing','Heist']);
const MAX_COUNTER=1_000_000_000;
export class ProfileError extends Error{constructor(status,message,current=null,retryAfter=0){super(message);this.name='ProfileError';this.status=status;this.current=current;this.retryAfter=retryAfter;}}
const fail=(message,status=400)=>{throw new ProfileError(status,message)};
const bool=(v,name)=>{if(typeof v!=='boolean')fail(`Invalid ${name}.`);return v;};
const num=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(`Invalid ${name}.`);return v;};
const counter=(v,name)=>{if(!Number.isSafeInteger(v)||v<0||v>MAX_COUNTER)fail(`Invalid ${name}.`);return v;};
const enumValue=(v,set,name)=>{if(typeof v!=='string'||!set.has(v))fail(`Invalid ${name}.`);return v;};
const uniqueEnums=(v,set,name,max)=>{if(!Array.isArray(v)||v.length>max)fail(`Invalid ${name}.`);const out=[];for(const x of v){enumValue(x,set,name);if(!out.includes(x))out.push(x);}return out;};
export function defaultProfile(){return {version:1,settings:{healthDamage:true,visibleBruising:true,arenaHazards:true,masterVolume:1,musicVolume:.8,sfxVolume:1,screenShake:1,reducedMotion:false,vibration:true},unlockedCostumes:['Arcade'],unlockedArenas:['WrestlingArena'],selectedCharacter:'Hero',selectedCostume:'Arcade',preferredMode:'FreeForAll',preferredArena:'WrestlingArena',stats:{matches:0,wins:0,knockouts:0}};}
export function normaliseProfile(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('A Danao profile object is required.');
 const keys=new Set(['version','settings','unlockedCostumes','unlockedArenas','selectedCharacter','selectedCostume','preferredMode','preferredArena','stats']);for(const k of Object.keys(value))if(!keys.has(k))fail('Unknown profile field.');
 if(value.version!==1)fail('Unsupported Danao profile version.');const d=defaultProfile(),s=value.settings;if(!s||typeof s!=='object'||Array.isArray(s))fail('Invalid settings.');
 const sk=new Set(Object.keys(d.settings));for(const k of Object.keys(s))if(!sk.has(k))fail('Unknown settings field.');
 const settings={healthDamage:bool(s.healthDamage,'health damage'),visibleBruising:bool(s.visibleBruising,'visible bruising'),arenaHazards:bool(s.arenaHazards,'arena hazards'),masterVolume:num(s.masterVolume,0,1,'master volume'),musicVolume:num(s.musicVolume,0,1,'music volume'),sfxVolume:num(s.sfxVolume,0,1,'SFX volume'),screenShake:num(s.screenShake,0,1,'screen shake'),reducedMotion:bool(s.reducedMotion,'reduced motion'),vibration:bool(s.vibration,'vibration')};
 const stats=value.stats;if(!stats||typeof stats!=='object'||Array.isArray(stats))fail('Invalid stats.');for(const k of Object.keys(stats))if(!['matches','wins','knockouts'].includes(k))fail('Unknown stats field.');
 const out={version:1,settings,unlockedCostumes:uniqueEnums(value.unlockedCostumes,COSTUMES,'costume unlocks',COSTUMES.size),unlockedArenas:uniqueEnums(value.unlockedArenas,ARENAS,'arena unlocks',ARENAS.size),selectedCharacter:enumValue(value.selectedCharacter,CHARACTERS,'selected character'),selectedCostume:enumValue(value.selectedCostume,COSTUMES,'selected costume'),preferredMode:enumValue(value.preferredMode,MODES,'preferred mode'),preferredArena:enumValue(value.preferredArena,ARENAS,'preferred arena'),stats:{matches:counter(stats.matches,'matches'),wins:counter(stats.wins,'wins'),knockouts:counter(stats.knockouts,'knockouts')}};
 if(!out.unlockedCostumes.includes(out.selectedCostume))fail('Selected costume is not unlocked.');if(!out.unlockedArenas.includes(out.preferredArena))fail('Preferred arena is not unlocked.');return out;
}
export function createProfileRepository(db){
 if(!db?.prepare)throw new TypeError('D1 database binding is required.');
 const get=async owner=>{const row=await db.prepare('SELECT profile_json,revision,updated_at FROM danao_profiles WHERE owner_user_id=? LIMIT 1').bind(owner).first();if(!row)return {profile:defaultProfile(),revision:0,updatedAt:null};let profile;try{profile=normaliseProfile(JSON.parse(row.profile_json));}catch{profile=defaultProfile();}return {profile,revision:Number(row.revision)||0,updatedAt:row.updated_at||null};};
 const conflict=async owner=>{const current=await get(owner);throw new ProfileError(409,'This Danao profile changed on another device.',current);};
 return {
  get,
  async limit(owner){const now=new Date(),bucket=new Date(Math.floor(now.getTime()/60000)*60000).toISOString();const row=await db.prepare('SELECT window_start,writes FROM danao_profile_rate WHERE owner_user_id=? LIMIT 1').bind(owner).first();if(!row||row.window_start!==bucket){await db.prepare('INSERT INTO danao_profile_rate(owner_user_id,window_start,writes) VALUES(?,?,1) ON CONFLICT(owner_user_id) DO UPDATE SET window_start=excluded.window_start,writes=1').bind(owner,bucket).run();return;}const writes=Number(row.writes)||0;if(writes>=30)throw new ProfileError(429,'Too many cloud saves. Keep playing and try again in a minute.',null,60);await db.prepare('UPDATE danao_profile_rate SET writes=writes+1 WHERE owner_user_id=?').bind(owner).run();},
  async save(owner,body){const revision=body?.revision;if(!Number.isSafeInteger(revision)||revision<0)fail('Invalid profile revision.');const profile=normaliseProfile(body.profile);const text=JSON.stringify(profile);if(text.length>24000)fail('This Danao profile is too large.',413);const now=new Date().toISOString();
   if(revision===0){const r=await db.prepare('INSERT OR IGNORE INTO danao_profiles(owner_user_id,profile_json,revision,updated_at) VALUES(?,?,1,?)').bind(owner,text,now).run();if(Number(r.meta?.changes??r.changes??0)!==1)return conflict(owner);return {profile,revision:1,updatedAt:now};}
   const r=await db.prepare('UPDATE danao_profiles SET profile_json=?,revision=revision+1,updated_at=? WHERE owner_user_id=? AND revision=?').bind(text,now,owner,revision).run();if(Number(r.meta?.changes??r.changes??0)!==1)return conflict(owner);return {profile,revision:revision+1,updatedAt:now};
  }
 };
}
