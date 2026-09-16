const MAX_PLAYERS=4;
export const ROOM_TTL_MS=60*60*1000;
export const MAX_SNAPSHOT_BYTES=24*1024;
const MAX_NAME=32;
const MODES=new Set(['OneVsOne','TwoVsTwo','FreeForAll','TeamKnockout','RoyalRumble','MangoGrab','HotBomb','KingOfTheRing','Heist']);
const ARENAS=new Set(['WrestlingArena','DublinDocks','LondonUnderground','MangoMarket','TempleCourtyard','SichuanTeaHouse','IceFestival','HouseParty','ToyFactory','CruiseShip','MadCircus']);
const CHARACTERS=new Set(['Hero','Stephen','Zachary','Mulan','Gaby','Sara','Mum','Dad']);

export class RoomError extends Error{constructor(status,message){super(message);this.name='RoomError';this.status=status;}}
const fail=(status,message)=>{throw new RoomError(status,message)};
const finite=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail(400,`Invalid ${name}.`);return v;};
const int=(v,min,max,name)=>{if(!Number.isInteger(v)||v<min||v>max)fail(400,`Invalid ${name}.`);return v;};
const cleanText=(v,max,name)=>{if(typeof v!=='string')fail(400,`Invalid ${name}.`);const s=v.trim();if(!s||s.length>max)fail(400,`Invalid ${name}.`);return s;};
const uuid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
function playerData(data,id,now,host=false){
 if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Player data is required.');
 const name=cleanText(data.name??'Player',MAX_NAME,'player name');
 const character=data.character??'Hero';if(!CHARACTERS.has(character))fail(400,'Unknown character.');
 const costume=cleanText(data.costume??'Arcade',40,'costume');
 return {id,token:uuid(),name,character,costume,ready:host,connected:false,joinedAt:now,lastSeen:now,disconnectedAt:null,inputSeq:-1,lastInput:null};
}
function getPlayer(room,id){const p=room.players.find(x=>x.id===id);if(!p)fail(404,'Player not found.');return p;}
function requireHost(room,id){if(room.hostId!==id)fail(403,'Only the host can do that.');return getPlayer(room,id);}
function ensureActive(room,now=Date.now()){if(!room||typeof room!=='object')fail(404,'Room not found.');if(now>room.expiresAt)fail(410,'Room expired.');}
function chooseHost(room){const next=room.players.filter(p=>p.connected).sort((a,b)=>a.id-b.id)[0]||room.players.sort((a,b)=>a.id-b.id)[0]||null;room.hostId=next?.id??null;if(next)next.ready=true;return next;}
export function makeRoom(code,data,now=Date.now()){
 if(!/^\d{4}$/.test(String(code)))fail(400,'Room code must be four digits.');
 const host=playerData(data,0,now,true);
 return {version:1,code:String(code),createdAt:now,updatedAt:now,expiresAt:now+ROOM_TTL_MS,phase:'lobby',locked:false,hostId:0,nextPlayerId:1,matchId:0,settings:{mode:'FreeForAll',arena:'WrestlingArena',healthDamage:true,visibleBruising:true,arenaHazards:true,friendlyFire:false},players:[host],latestState:null,result:null};
}
export function joinRoom(room,data,now=Date.now()){
 ensureActive(room,now);if(room.locked)fail(409,'Room is locked.');if(room.phase==='fight')fail(409,'Match already started.');if(room.players.length>=MAX_PLAYERS)fail(409,'Room is full.');
 const p=playerData(data,room.nextPlayerId++,now,false);room.players.push(p);room.updatedAt=now;return p;
}
export function authenticate(room,token,now=Date.now()){
 ensureActive(room,now);if(typeof token!=='string'||token.length<16||token.length>128)fail(401,'Invalid room pass.');const p=room.players.find(x=>x.token===token);if(!p)fail(401,'Invalid room pass.');p.lastSeen=now;return p;
}
export function connect(room,id,now=Date.now()){ensureActive(room,now);const p=getPlayer(room,id);p.connected=true;p.disconnectedAt=null;p.lastSeen=now;if(room.hostId==null)chooseHost(room);room.updatedAt=now;return p;}
export function disconnect(room,id,now=Date.now()){
 ensureActive(room,now);const p=getPlayer(room,id);p.connected=false;p.ready=false;p.disconnectedAt=now;p.lastSeen=now;
 if(room.hostId===id){chooseHost(room);if(room.phase==='fight'){room.phase='lobby';room.result={interrupted:true,reason:'host-disconnected'};for(const q of room.players)q.ready=q.id===room.hostId;}}
 room.updatedAt=now;return p;
}
export function leaveRoom(room,id,now=Date.now()){
 ensureActive(room,now);const ix=room.players.findIndex(p=>p.id===id);if(ix<0)fail(404,'Player not found.');room.players.splice(ix,1);if(room.hostId===id)chooseHost(room);if(room.players.length===0)room.phase='closed';room.updatedAt=now;return room;
}
export function setReady(room,id,value){if(room.phase==='fight')fail(409,'Cannot change ready state during a fight.');const p=getPlayer(room,id);p.ready=p.id===room.hostId?true:Boolean(value);return p.ready;}
export function setPlayerChoice(room,id,data){if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Choice data is required.');const p=getPlayer(room,id);if(data.character!==undefined){if(!CHARACTERS.has(data.character))fail(400,'Unknown character.');p.character=data.character;}if(data.costume!==undefined)p.costume=cleanText(data.costume,40,'costume');return p;}
export function setLocked(room,id,value){requireHost(room,id);if(room.phase==='fight')fail(409,'Cannot lock during a fight.');room.locked=Boolean(value);return room.locked;}
export function configureRoom(room,id,data){
 requireHost(room,id);if(room.phase==='fight')fail(409,'Cannot change setup during a fight.');if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Setup data is required.');
 const allowed=new Set(['mode','arena','healthDamage','visibleBruising','arenaHazards','friendlyFire']);for(const k of Object.keys(data))if(!allowed.has(k))fail(400,'Unknown setup field.');
 if(data.mode!==undefined){if(!MODES.has(data.mode))fail(400,'Unknown mode.');room.settings.mode=data.mode;}
 if(data.arena!==undefined){if(!ARENAS.has(data.arena))fail(400,'Unknown arena.');room.settings.arena=data.arena;}
 for(const k of ['healthDamage','visibleBruising','arenaHazards','friendlyFire'])if(data[k]!==undefined){if(typeof data[k]!=='boolean')fail(400,`Invalid ${k}.`);room.settings[k]=data[k];}
 return room.settings;
}
export function startRoom(room,id,now=Date.now()){
 ensureActive(room,now);requireHost(room,id);if(room.phase==='fight')fail(409,'Match already started.');const connected=room.players.filter(p=>p.connected);if(connected.length<2)fail(409,'At least two connected players are required.');if(connected.some(p=>!p.ready))fail(409,'All connected players must be ready.');
 room.phase='fight';room.matchId++;room.result=null;room.latestState=null;for(const p of room.players){p.inputSeq=-1;p.lastInput=null;}room.updatedAt=now;return room;
}
export function setInput(room,id,data,now=Date.now()){
 ensureActive(room,now);if(room.phase!=='fight')fail(409,'Match is not running.');const p=getPlayer(room,id);if(!p.connected)fail(409,'Player is not connected.');if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Input frame is required.');const seq=int(data.seq,0,2147483647,'input sequence');if(seq<=p.inputSeq)return false;
 const out={seq,moveX:finite(data.moveX??0,-1,1,'moveX'),moveY:finite(data.moveY??0,-1,1,'moveY')};for(const k of ['jump','punch','grab','dodge','fire','block'])out[k]=Boolean(data[k]);p.inputSeq=seq;p.lastInput=out;p.lastSeen=now;room.updatedAt=now;return true;
}
function byteLength(value){let text;try{text=JSON.stringify(value);}catch{fail(400,'Snapshot must be JSON serialisable.');}return new TextEncoder().encode(text).byteLength;}
export function setHostState(room,id,data,now=Date.now()){
 ensureActive(room,now);requireHost(room,id);if(room.phase!=='fight')fail(409,'Match is not running.');if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Host state is required.');if(byteLength(data)>MAX_SNAPSHOT_BYTES)fail(413,'Host snapshot is too large.');const seq=int(data.seq,0,2147483647,'state sequence');if(seq<=(room.latestState?.seq??-1))return false;
 if(data.fighters!==undefined){if(!Array.isArray(data.fighters)||data.fighters.length>MAX_PLAYERS)fail(400,'Invalid fighter snapshot.');for(const f of data.fighters){if(!f||typeof f!=='object')fail(400,'Invalid fighter snapshot.');if(f.slot!==undefined)int(f.slot,0,MAX_PLAYERS-1,'fighter slot');if(f.hp!==undefined)int(f.hp,0,100,'fighter HP');}}
 room.latestState=structuredClone(data);room.updatedAt=now;return true;
}
export function finishRoom(room,id,data,now=room.updatedAt){
 ensureActive(room,now);requireHost(room,id);if(room.phase!=='fight')fail(409,'Match is not running.');if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'Result is required.');if(byteLength(data)>4096)fail(413,'Result is too large.');if(data.winner!==undefined&&data.winner!==null)int(data.winner,0,MAX_PLAYERS-1,'winner');room.result=structuredClone(data);room.phase='results';room.updatedAt=now;return room.result;
}
export function rematch(room,id){requireHost(room,id);if(room.phase!=='results'&&room.phase!=='lobby')fail(409,'Rematch is not available.');room.phase='lobby';room.result=null;room.latestState=null;for(const p of room.players){p.ready=p.id===room.hostId;p.inputSeq=-1;p.lastInput=null;}return room;}
function publicPlayer(p){return {id:p.id,name:p.name,character:p.character,costume:p.costume,ready:Boolean(p.ready),connected:Boolean(p.connected)};}
export function publicRoom(room){return {version:room.version,code:room.code,phase:room.phase,locked:Boolean(room.locked),hostId:room.hostId,matchId:room.matchId,settings:{...room.settings},players:room.players.map(publicPlayer),result:room.result?structuredClone(room.result):null,expiresAt:room.expiresAt};}
export function publicSnapshot(room){return {...publicRoom(room),latestState:room.latestState?structuredClone(room.latestState):null};}
export function persistRoom(room){return structuredClone(room);}
export function restoreRoom(saved){if(!saved||typeof saved!=='object'||!/^\d{4}$/.test(String(saved.code))||!Array.isArray(saved.players))fail(400,'Invalid saved room.');return structuredClone(saved);}
export const LIMITS=Object.freeze({maxPlayers:MAX_PLAYERS,maxSnapshotBytes:MAX_SNAPSHOT_BYTES,roomTtlMs:ROOM_TTL_MS});
