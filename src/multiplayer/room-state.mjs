/* Pure room state. The Worker and the local integration server use this exact logic. */
import C from './core.mjs';
export const VERSION=4, CAPACITY=8, ROOM_TTL=60*60*1000, STALE_INPUT=900;
export class RoomError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const number=(n,f=0)=>Number.isFinite(n)?n:f;
const integer=(n,min,max,f=min)=>Number.isInteger(n)?C.clamp(n,min,max):f;
export function cleanName(value, fallback='Guest') {
  return typeof value==='string'?value.replace(/[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,24)||fallback:fallback;
}
function member(id,data,now){return {id,token:crypto.randomUUID(),name:cleanName(data.name,'Driver '+(id+1)),avatar:integer(data.avatar,0,7),vehicle:C.VEHICLES[data.vehicle]?data.vehicle:'kart',ready:id===0,connected:false,joined:now,lastSeen:now,lastSeq:-1};}
export function makeRoom(code,data={},now=Date.now()) {
  if(!/^\d{4}$/.test(code))throw new RoomError('Enter a four-digit room code.');
  return {version:VERSION,code,epoch:crypto.randomUUID(),created:now,expiresAt:now+ROOM_TTL,hostId:0,phase:'lobby',locked:false,track:integer(data.track,0,C.TRACKS.length-1,3),difficulty:['easy','normal','hard'].includes(data.difficulty)?data.difficulty:'normal',players:[member(0,data,now)],race:null,controls:{},firstFinish:null,sequence:0,round:0};
}
export function checkRoom(room,now=Date.now()) {if(!room||room.expiresAt<=now)throw new RoomError('This room has expired. Create a new room.',410);}
export function joinRoom(room,data={},now=Date.now()) {
  checkRoom(room,now);
  if(room.phase!=='lobby'||room.locked)throw new RoomError('This room has started or is locked. Ask the host to return to the lobby.',409);
  const id=Array.from({length:CAPACITY},(_,i)=>i).find(i=>!room.players.some(p=>p.id===i));
  if(id===undefined)throw new RoomError('This room is full (eight players).',409);
  const player=member(id,data,now);player.ready=false;if(!room.players.some(p=>p.id===room.hostId)){room.hostId=id;player.ready=true;}room.players.push(player);return player;
}
export function getPlayer(room,id) {const p=room.players.find(p=>p.id===id);if(!p)throw new RoomError('You are no longer in this room.',401);return p;}
export function authenticate(room,token,now=Date.now()) {checkRoom(room,now);if(typeof token!=='string'||!/^[a-f\d-]{36}$/.test(token))throw new RoomError('This room pass is invalid. Join again.',401);const p=room.players.find(p=>p.token===token);if(!p)throw new RoomError('This room pass is invalid. Join again.',401);return p;}
export function connect(room,id,now=Date.now()) {const p=getPlayer(room,id);p.connected=true;p.lastSeen=now;p.lastSeq=-1;if(!room.players.some(q=>q.id===room.hostId&&q.connected))room.hostId=id;if(room.race){const racer=room.race.racers.find(q=>q.id===id);if(racer&&!racer.finished)racer.ai=false;}return p;}
export function disconnect(room,id,now=Date.now()) {
  const p=room.players.find(p=>p.id===id);if(!p)return;p.connected=false;p.lastSeen=now;
  delete room.controls[id];
  if(room.hostId===id){const next=room.players.find(q=>q.connected&&q.id!==id);if(next)room.hostId=next.id;}
}
export function leaveRoom(room,id,now=Date.now()) {
  disconnect(room,id,now);
  if(room.race){const racer=room.race.racers.find(p=>p.id===id);if(racer)racer.ai=true;}
  room.players=room.players.filter(p=>p.id!==id);
  if(!room.players.some(p=>p.id===room.hostId))room.hostId=room.players.find(p=>p.connected)?.id??room.players[0]?.id??-1;
}
export function setReady(room,id,ready) {if(room.phase!=='lobby')throw new RoomError('Return to the lobby first.',409);getPlayer(room,id).ready=ready===true;}
export function configureRoom(room,id,data) {
  if(id!==room.hostId)throw new RoomError('Only the host can change the circuit.',403);
  if(room.phase!=='lobby')throw new RoomError('Wait until this race ends.',409);
  if(Number.isInteger(data.track))room.track=integer(data.track,0,C.TRACKS.length-1);
  if(['easy','normal','hard'].includes(data.difficulty))room.difficulty=data.difficulty;
  if(typeof data.locked==='boolean')room.locked=data.locked;
  room.players.forEach(p=>p.ready=p.id===room.hostId);
}
export function startRoom(room,id,now=Date.now()) {
  checkRoom(room,now);
  if(id!==room.hostId)throw new RoomError('Only the host can start the race.',403);
  if(room.phase!=='lobby')throw new RoomError('The race has already started.',409);
  const humans=room.players.filter(p=>p.connected);
  if(humans.length<2)throw new RoomError('Wait for at least one friend to join.',409);
  if(humans.some(p=>!p.ready))throw new RoomError('Wait until every connected player is ready.',409);
  room.race=C.newRace({track:room.track,mode:'race',driver:0,difficulty:room.difficulty,assist:true,seed:crypto.getRandomValues(new Uint32Array(1))[0]});
  room.race.multiplayer=true;room.race.inputs={};room.phase='race';room.round++;room.started=now;room.firstFinish=null;room.controls={};
  room.race.racers.forEach(p=>{const human=humans.find(q=>q.id===p.id);p.ai=!human;if(human)p.vehicle=human.vehicle;});
  return room.race;
}
export function setControl(room,id,data,now=Date.now()) {
  if(room.phase!=='race')return false;
  const p=getPlayer(room,id);
  if(!p.connected||!Number.isSafeInteger(data.seq)||data.seq<0||data.seq>2147483647||data.seq<=p.lastSeq)return false;
  p.lastSeq=data.seq;p.lastSeen=now;
  const old=room.controls[id]||{},reset=Boolean(data.reset)&&now-(old.lastReset??-Infinity)>4000;
  room.controls[id]={seq:data.seq,at:now,gas:C.clamp(number(data.gas),0,1),brake:C.clamp(number(data.brake),0,1),steer:C.clamp(number(data.steer),-1,1),drift:data.drift===true,use:data.use===true||old.use===true,reset:reset||old.reset===true,lastReset:reset?now:old.lastReset};
  return true;
}
export function tickRoom(room,dt,now=Date.now()) {
  if(room.phase!=='race'||!room.race)return;
  const r=room.race;
  for(const p of room.players){
    const racer=r.racers.find(q=>q.id===p.id);if(!racer)continue;
    if(!p.connected&&now-p.lastSeen>5000)racer.ai=true;
    const c=room.controls[p.id];
    r.inputs[p.id]=p.connected&&c&&now-c.at<STALE_INPUT?{...c}:{gas:0,brake:1,steer:0,drift:false};
    if(c){c.reset=false;c.use=false;}
  }
  C.stepRace(r,{},C.clamp(number(dt),0,.1));room.sequence++;
  const humans=room.players.map(p=>r.racers.find(q=>q.id===p.id)).filter(Boolean);
  if(humans.some(p=>p.finished)&&room.firstFinish===null)room.firstFinish=r.time;
  if((humans.length>0&&humans.every(p=>p.finished))||(room.firstFinish!==null&&r.time-room.firstFinish>=35)||now-room.started>15*60*1000){
    room.phase='results';r.phase='results';r.order=C.rank(r).map(p=>p.id);
  }
}
export function rematch(room,id) {
  if(id!==room.hostId)throw new RoomError('Only the host can return everyone to the lobby.',403);
  if(room.phase!=='results')throw new RoomError('Wait until the race is over.',409);
  room.phase='lobby';room.race=null;room.controls={};room.firstFinish=null;
  room.players=room.players.filter(p=>p.connected);room.players.forEach(p=>p.ready=p.id===room.hostId);
}
export function publicRoom(room) {
  return {version:VERSION,code:room.code,epoch:room.epoch,expiresAt:room.expiresAt,hostId:room.hostId,phase:room.phase,locked:room.locked,track:room.track,difficulty:room.difficulty,round:room.round,
    players:room.players.map(({id,name,avatar,vehicle,ready,connected})=>({id,name,avatar,vehicle,ready,connected}))};
}
export function snapshot(room) {
  const r=room.race;if(!r)return null;
  return {type:'snapshot',sequence:room.sequence,round:room.round,phase:room.phase,track:room.track,time:r.time,countdown:r.countdown,laps:r.laps,firstFinish:room.firstFinish,
    racers:r.racers.map(p=>({...p})),pickups:r.pickups.map(p=>({...p})),traps:r.traps.map(p=>({...p})),traffic:r.traffic.map(p=>({...p})),events:r.events.slice(-8),order:r.order||null};
}
export function persistRoom(room) {const copy={...room,controls:{}};if(room.race)copy.race={...room.race,track:{id:room.track},inputs:{}};return copy;}
export function restoreRoom(saved) {if(!saved||saved.version!==VERSION)return null;const room=saved;if(room.race){room.race.track=C.buildTrack(room.track);room.race.inputs={};}room.controls={};return room;}
export {C};
