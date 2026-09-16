import * as R from './room-state.mjs';
import {json} from './gateway.mjs';
const internal=(path,body)=>new Request('https://internal'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const fail=e=>json({error:e?.status?e.message:'The Danao room could not be updated.'},e?.status||503);

export class DanaoDirectory{
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.ready=ctx.blockConcurrencyWhile(async()=>{this.data=await ctx.storage.get('directory')||{codes:{},rates:{}};});}
 async fetch(request){
  await this.ready;if(new URL(request.url).pathname!=='/request'||request.method!=='POST')return json({error:'Not found.'},404);
  return this.ctx.blockConcurrencyWhile(async()=>{try{
   const q=await request.json(),now=Date.now();if(!/^[a-f\d]{64}$/.test(q.client||''))return json({error:'Invalid request.'},400);if(!['create','join'].includes(q.action))return json({error:'Not found.'},404);
   for(const [code,e] of Object.entries(this.data.codes))if(e.expiresAt<=now)delete this.data.codes[code];
   for(const [key,r] of Object.entries(this.data.rates))if(now-r.at>=3600000)delete this.data.rates[key];
   let rate=this.data.rates[q.client];if(!rate||now-rate.at>=3600000)rate={at:now,create:0,join:0};rate[q.action]++;this.data.rates[q.client]=rate;
   if(Object.keys(this.data.rates).length>5000)delete this.data.rates[Object.keys(this.data.rates)[0]];
   if(rate.create>10||rate.join>80){await this.ctx.storage.put('directory',this.data);return json({error:'Too many room attempts. Please wait before trying again.'},429);}
   if(q.action==='join'){
    if(!/^\d{4}$/.test(q.code||'')||!this.data.codes[q.code]){await this.ctx.storage.put('directory',this.data);return json({error:'Room not found or expired. Check the four-digit code.'},404);}
    await this.ctx.storage.put('directory',this.data);const stub=this.env.DANAO_ROOMS.get(this.env.DANAO_ROOMS.idFromName('danao-v1:'+q.code));return await stub.fetch(internal('/join',q));
   }
   if(Object.keys(this.data.codes).length>=1000)return json({error:'All Danao room slots are busy. Try again shortly.'},503);
   let code;for(let i=0;i<100;i++){const n=crypto.getRandomValues(new Uint32Array(1))[0];if(n>=4294960000)continue;const candidate=String(n%10000).padStart(4,'0');if(!this.data.codes[candidate]){code=candidate;break;}}
   if(code===undefined)return json({error:'Could not reserve a room. Try again.'},503);
   this.data.codes[code]={expiresAt:now+R.ROOM_TTL_MS};await this.ctx.storage.put('directory',this.data);
   const stub=this.env.DANAO_ROOMS.get(this.env.DANAO_ROOMS.idFromName('danao-v1:'+code));const response=await stub.fetch(internal('/create',{...q,code}));if(!response.ok){delete this.data.codes[code];await this.ctx.storage.put('directory',this.data);}await this.ctx.storage.setAlarm(now+R.ROOM_TTL_MS);return response;
  }catch(e){return fail(e);}});
 }
 async alarm(){await this.ready;const now=Date.now();for(const [code,e] of Object.entries(this.data.codes))if(e.expiresAt<=now)delete this.data.codes[code];for(const [key,r] of Object.entries(this.data.rates))if(now-r.at>=3600000)delete this.data.rates[key];await this.ctx.storage.put('directory',this.data);if(Object.keys(this.data.codes).length||Object.keys(this.data.rates).length)await this.ctx.storage.setAlarm(now+3600000);}
}

export class DanaoRoom{
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.sockets=new Map();this.rate=new Map();this.lastSnapshotSave=0;
  this.ready=ctx.blockConcurrencyWhile(async()=>{
   const saved=await ctx.storage.get('room');this.room=saved?R.restoreRoom(saved):null;
   if(this.room){for(const p of this.room.players)p.connected=false;for(const ws of ctx.getWebSockets()){const a=ws.deserializeAttachment();const p=this.room.players.find(x=>x.id===a?.id);if(p){this.sockets.set(p.id,ws);p.connected=true;}else try{ws.close(4000,'Room expired');}catch{}}
    if(this.room.hostId==null||!this.room.players.some(p=>p.id===this.room.hostId&&p.connected)){const first=[...this.sockets.keys()].sort((a,b)=>a-b)[0];if(first!==undefined)this.room.hostId=first;}
   }else for(const ws of ctx.getWebSockets())try{ws.close(4000,'Room expired');}catch{}
  });
  if(typeof WebSocketRequestResponsePair!=='undefined')ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
 }
 async save(){if(this.room)await this.ctx.storage.put('room',R.persistRoom(this.room));}
 send(ws,data){try{if((ws.bufferedAmount||0)>350000){ws.close(4002,'Connection too slow');return;}ws.send(typeof data==='string'?data:JSON.stringify(data));}catch{}}
 broadcast(data,except=null){const text=typeof data==='string'?data:JSON.stringify(data);for(const [id,ws] of this.sockets)if(id!==except)this.send(ws,text);}
 lobby(){if(this.room)this.broadcast({type:'room',room:R.publicRoom(this.room)});}
 hostChanged(previous){if(this.room&&previous!==this.room.hostId)this.broadcast({type:'host',hostId:this.room.hostId,state:this.room.latestState||null});}
 async fetch(request){
  await this.ready;const url=new URL(request.url);
  try{
   if(url.pathname==='/create'&&request.method==='POST')return await this.ctx.blockConcurrencyWhile(async()=>{const q=await request.json(),now=Date.now();if(this.room&&this.room.expiresAt>now)return json({error:'Room slot is occupied. Create another room.'},409);for(const ws of this.sockets.values())try{ws.close(4000,'Room replaced');}catch{}this.sockets.clear();this.room=R.makeRoom(q.code,q,now);await this.save();await this.ctx.storage.setAlarm(this.room.expiresAt);return json({room:R.publicRoom(this.room),id:0,token:this.room.players[0].token},201);});
   if(!this.room)return json({error:'Room not found or expired.'},404);
   if(url.pathname==='/join'&&request.method==='POST')return await this.ctx.blockConcurrencyWhile(async()=>{try{const now=Date.now();if(this.room.phase==='lobby')for(const p of [...this.room.players])if(!p.connected&&p.id!==this.room.hostId&&now-p.lastSeen>90000)R.leaveRoom(this.room,p.id,now);const p=R.joinRoom(this.room,await request.json(),now);await this.save();this.lobby();return json({room:R.publicRoom(this.room),id:p.id,token:p.token},201);}catch(e){return fail(e);}});
   if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket required.'},426);
   const p=R.authenticate(this.room,url.searchParams.get('token'),Date.now());const previous=this.sockets.get(p.id);if(previous)try{previous.close(4001,'Connected somewhere else');}catch{}
   const [client,server]=Object.values(new WebSocketPair());server.serializeAttachment({id:p.id});this.ctx.acceptWebSocket(server,[String(p.id)]);this.sockets.set(p.id,server);const oldHost=this.room.hostId;R.connect(this.room,p.id,Date.now());this.send(server,{type:'welcome',id:p.id,room:R.publicRoom(this.room),state:this.room.latestState||null});this.lobby();this.hostChanged(oldHost);await this.save();return new Response(null,{status:101,webSocket:client});
  }catch(e){return fail(e);}
 }
 async webSocketMessage(ws,message){
  await this.ready;const a=ws.deserializeAttachment();if(!this.room||!a||this.sockets.get(a.id)!==ws){try{ws.close(4001,'Connection replaced');}catch{}return;}
  try{
   if(typeof message!=='string'||message.length>R.MAX_SNAPSHOT_BYTES+4096){ws.close(1009,'Message too large');return;}
   const now=Date.now(),rate=this.rate.get(a.id)||{at:now,n:0};if(now-rate.at>=1000){rate.at=now;rate.n=0;}rate.n++;this.rate.set(a.id,rate);if(rate.n>120){ws.close(1008,'Too many messages');return;}
   if(message==='ping'){this.send(ws,'pong');return;}let msg;try{msg=JSON.parse(message);}catch{throw new R.RoomError(400,'Invalid message.');}if(!msg||typeof msg!=='object'||Array.isArray(msg))throw new R.RoomError(400,'Invalid message.');
   const previousHost=this.room.hostId;let save=true,broadcastRoom=true;
   if(msg.type==='input'){
    const accepted=R.setInput(this.room,a.id,msg,now);if(accepted&&a.id!==this.room.hostId){const host=this.sockets.get(this.room.hostId);if(host)this.send(host,{type:'input',id:a.id,frame:this.room.players.find(p=>p.id===a.id)?.lastInput});}save=false;broadcastRoom=false;
   }else if(msg.type==='state'){
    if(R.setHostState(this.room,a.id,msg.state||msg,now)){this.broadcast({type:'snapshot',state:this.room.latestState},a.id);if(now-this.lastSnapshotSave>=750){this.lastSnapshotSave=now;this.ctx.waitUntil(this.save());}}save=false;broadcastRoom=false;
   }else if(msg.type==='ready')R.setReady(this.room,a.id,msg.ready);
   else if(msg.type==='choice')R.setPlayerChoice(this.room,a.id,msg);
   else if(msg.type==='lock')R.setLocked(this.room,a.id,msg.locked);
   else if(msg.type==='setup')R.configureRoom(this.room,a.id,msg);
   else if(msg.type==='start')R.startRoom(this.room,a.id,now);
   else if(msg.type==='result'){R.finishRoom(this.room,a.id,msg.result||msg,now);this.broadcast({type:'result',result:this.room.result});}
   else if(msg.type==='rematch')R.rematch(this.room,a.id);
   else if(msg.type==='leave'){R.leaveRoom(this.room,a.id,now);this.sockets.delete(a.id);try{ws.close(1000,'Left the room');}catch{}if(!this.room.players.length)this.room.expiresAt=now;}
   else throw new R.RoomError(400,'Unknown room command.');
   if(save)await this.save();if(broadcastRoom)this.lobby();this.hostChanged(previousHost);
  }catch(e){this.send(ws,{type:'error',message:e?.status?e.message:'The room could not be updated.'});}
 }
 async webSocketClose(ws,code=1000,reason='Connection closed'){
  try{ws.close(code===1005?1000:code,reason);}catch{}await this.ready;const a=ws.deserializeAttachment();if(!this.room||!a||this.sockets.get(a.id)!==ws)return;const previousHost=this.room.hostId;this.sockets.delete(a.id);this.rate.delete(a.id);R.disconnect(this.room,a.id,Date.now());this.lobby();this.hostChanged(previousHost);await this.save();
 }
 async webSocketError(ws){await this.webSocketClose(ws,1011,'Connection interrupted');}
 async alarm(){await this.ready;if(!this.room||this.room.expiresAt<=Date.now()){for(const ws of this.sockets.values())try{ws.close(4000,'Room expired');}catch{}this.sockets.clear();this.room=null;await this.ctx.storage.deleteAll();}else await this.ctx.storage.setAlarm(this.room.expiresAt);}
}
