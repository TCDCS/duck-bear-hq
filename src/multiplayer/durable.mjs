/* Cloudflare Durable Objects: atomic room allocation, expiring passes, authoritative WebSockets. */
import * as M from './room-state.mjs';
import {json} from './gateway.mjs';
const internal=(path,body)=>new Request('https://internal'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function fail(e){return json({error:e.status?e.message:'The room could not be updated. Please try again.'},e.status||503);}
export class WackyDirectory {
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.ready=ctx.blockConcurrencyWhile(async()=>{this.data=await ctx.storage.get('directory')||{codes:{},rates:{}};});}
  async fetch(request){
    await this.ready;
    if(new URL(request.url).pathname!=='/request'||request.method!=='POST')return json({error:'Not found.'},404);
    // Serialise reservation and persistence, including the cross-object create call.
    return this.ctx.blockConcurrencyWhile(async()=>{
      try{
        const q=await request.json(),now=Date.now();if(!/^[a-f\d]{64}$/.test(q.client||''))return json({error:'Invalid request.'},400);
        for(const [code,entry] of Object.entries(this.data.codes))if(entry.expiresAt<=now)delete this.data.codes[code];
        for(const [id,entry] of Object.entries(this.data.rates))if(now-entry.at>3600000)delete this.data.rates[id];
        const rate=this.data.rates[q.client]||{at:now,create:0,join:0};
        if(!['create','join'].includes(q.action))return json({error:'Not found.'},404);
        rate[q.action]++;this.data.rates[q.client]=rate;
        if(Object.keys(this.data.rates).length>5000)delete this.data.rates[Object.keys(this.data.rates)[0]];
        await this.ctx.storage.put('directory',this.data);
        if(rate.create>12||rate.join>90)return json({error:'Too many room attempts. Please wait before trying again.'},429);
        if(q.action==='join'){
          const entry=this.data.codes[q.code];if(!/^\d{4}$/.test(q.code||'')||!entry)return json({error:'Room not found or expired. Check the four-digit code.'},404);
          const stub=this.env.WACKY_ROOMS.get(this.env.WACKY_ROOMS.idFromName('wacky-v4:'+q.code));
          return await stub.fetch(internal('/join',q));
        }
        if(Object.keys(this.data.codes).length>=500)return json({error:'All room slots are busy. Try again shortly.'},503);
        let code;for(let i=0;i<100;i++){const n=crypto.getRandomValues(new Uint32Array(1))[0];if(n>=4294960000)continue;const candidate=String(n%10000).padStart(4,'0');if(!this.data.codes[candidate]){code=candidate;break;}}
        if(code===undefined)return json({error:'Could not reserve a room. Try again.'},503);
        this.data.codes[code]={expiresAt:now+M.ROOM_TTL};await this.ctx.storage.put('directory',this.data);
        const stub=this.env.WACKY_ROOMS.get(this.env.WACKY_ROOMS.idFromName('wacky-v4:'+code));const response=await stub.fetch(internal('/create',{...q,code}));
        if(!response.ok){delete this.data.codes[code];await this.ctx.storage.put('directory',this.data);}
        await this.ctx.storage.setAlarm(now+M.ROOM_TTL);return response;
      }catch(e){return fail(e);}
    });
  }
  async alarm(){await this.ready;const now=Date.now();for(const [code,entry] of Object.entries(this.data.codes))if(entry.expiresAt<=now)delete this.data.codes[code];for(const [key,r] of Object.entries(this.data.rates))if(now-r.at>=3600000)delete this.data.rates[key];await this.ctx.storage.put('directory',this.data);if(Object.keys(this.data.codes).length||Object.keys(this.data.rates).length)await this.ctx.storage.setAlarm(now+3600000);}
}
export class WackyRoom {
  constructor(ctx,env){
    this.ctx=ctx;this.env=env;this.loop=null;this.rate=new Map();this.sockets=new Map();this.lastSave=0;
    this.ready=ctx.blockConcurrencyWhile(async()=>{
      this.room=M.restoreRoom(await ctx.storage.get('room'));
      if(this.room){this.room.players.forEach(p=>p.connected=false);for(const ws of ctx.getWebSockets()){const a=ws.deserializeAttachment();if(a?.epoch===this.room.epoch&&this.room.players.some(p=>p.id===a.id)){this.sockets.set(a.id,ws);this.room.players.find(p=>p.id===a.id).connected=true;}else try{ws.close(4000,'Room expired');}catch{}}
        // Reconnect only after every live socket is marked. Enumeration order must not steal hosting.
        for(const id of this.sockets.keys())M.connect(this.room,id);
        if(this.room.phase==='race'&&this.sockets.size)this.startLoop();}
      else for(const ws of ctx.getWebSockets())try{ws.close(4000,'Race rules updated. Create a new seven-player room.');}catch{}
    });
    if(typeof WebSocketRequestResponsePair!=='undefined')ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
  }
  async save(){if(this.room)await this.ctx.storage.put('room',M.persistRoom(this.room));}
  send(ws,data){try{if((ws.bufferedAmount||0)>300000){ws.close(4002,'Connection too slow');return;}ws.send(typeof data==='string'?data:JSON.stringify(data));}catch{/* Close handler owns cleanup. */}}
  broadcast(data){const text=JSON.stringify(data);for(const ws of this.sockets.values())this.send(ws,text);}
  lobby(){if(this.room)this.broadcast({type:'room',room:M.publicRoom(this.room)});}
  async fetch(request){
    await this.ready;
    const url=new URL(request.url);
    try{
      if(url.pathname==='/create'&&request.method==='POST'){
        return await this.ctx.blockConcurrencyWhile(async()=>{
          const q=await request.json();if(this.room&&this.room.expiresAt>Date.now())return json({error:'Room slot is occupied. Create another room.'},409);
          this.stopLoop();for(const ws of this.sockets.values())try{ws.close(4000,'Room expired');}catch{}this.sockets.clear();
          this.room=M.makeRoom(q.code,q);await this.save();await this.ctx.storage.setAlarm(this.room.expiresAt);
          return json({room:M.publicRoom(this.room),id:0,token:this.room.players[0].token},201);
        });
      }
      M.checkRoom(this.room);
      if(url.pathname==='/join'&&request.method==='POST'){
        return await this.ctx.blockConcurrencyWhile(async()=>{
          // Expected join refusals must not escape this gate: Cloudflare resets
          // the object (and its live sockets) when the callback rejects.
          try{
            const now=Date.now();if(this.room.phase==='lobby')for(const p of [...this.room.players])if(!p.connected&&now-p.lastSeen>90000)M.leaveRoom(this.room,p.id,now);
            const p=M.joinRoom(this.room,await request.json(),now);await this.save();this.lobby();return json({room:M.publicRoom(this.room),id:p.id,token:p.token},201);
          }catch(e){if(e instanceof M.RoomError)return fail(e);throw e;}
        });
      }
      if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket required.'},426);
      const player=M.authenticate(this.room,url.searchParams.get('token'));
      const previous=this.sockets.get(player.id);if(previous)try{previous.close(4001,'Connected in another tab');}catch{}
      const [client,server]=Object.values(new WebSocketPair());
      server.serializeAttachment({id:player.id,epoch:this.room.epoch});this.ctx.acceptWebSocket(server,[String(player.id)]);this.sockets.set(player.id,server);M.connect(this.room,player.id);
      this.send(server,{type:'welcome',id:player.id,room:M.publicRoom(this.room)});this.lobby();const snap=M.snapshot(this.room);if(snap)this.send(server,snap);
      await this.save();if(this.room.phase==='race')this.startLoop();return new Response(null,{status:101,webSocket:client});
    }catch(e){return fail(e);}
  }
  async webSocketMessage(ws,message){
    await this.ready;
    const a=ws.deserializeAttachment();if(!a||a.epoch!==this.room?.epoch||this.sockets.get(a.id)!==ws){ws.close(4001,'Connection replaced');return;}
    try{
      M.checkRoom(this.room);
      if(typeof message!=='string'||message.length>1500){ws.close(1009,'Message too large');return;}
      const now=Date.now(),rate=this.rate.get(a.id)||{at:now,n:0};if(now-rate.at>1000){rate.at=now;rate.n=0;}rate.n++;this.rate.set(a.id,rate);if(rate.n>80){ws.close(1008,'Too many messages');return;}
      if(message==='ping'){this.send(ws,'pong');return;}
      let msg;try{msg=JSON.parse(message);}catch{throw new M.RoomError('Invalid message.');}if(!msg||typeof msg!=='object'||Array.isArray(msg))throw new M.RoomError('Invalid message.');
      if(msg.type==='input'){M.setControl(this.room,a.id,msg,now);return;}
      if(msg.type==='ready')M.setReady(this.room,a.id,msg.ready);
      else if(msg.type==='setup')M.configureRoom(this.room,a.id,msg);
      else if(msg.type==='start'){M.startRoom(this.room,a.id,now);this.startLoop();}
      else if(msg.type==='rematch')M.rematch(this.room,a.id);
      else if(msg.type==='leave'){M.leaveRoom(this.room,a.id,now);this.sockets.delete(a.id);ws.close(1000,'Left the room');if(!this.room.players.length){this.room.expiresAt=now;this.stopLoop();}}
      else throw new M.RoomError('Unknown room command.');
      await this.save();this.lobby();const snap=M.snapshot(this.room);if(snap)this.broadcast(snap);
    }catch(e){this.send(ws,{type:'error',message:e.status?e.message:'The room could not be updated.'});}
  }
  async webSocketClose(ws,code=1000,reason='Connection closed'){
    try{ws.close(code===1005?1000:code,reason);}catch{}
    await this.ready;const a=ws.deserializeAttachment();if(!a||this.sockets.get(a.id)!==ws)return;
    this.sockets.delete(a.id);this.rate.delete(a.id);M.disconnect(this.room,a.id);this.lobby();await this.save();
  }
  async webSocketError(ws){await this.webSocketClose(ws);try{ws.close(1011,'Connection interrupted');}catch{}}
  startLoop(){
    if(this.loop)return;this.lastTick=Date.now();this.accumulator=0;
    this.loop=setInterval(()=>{
      const now=Date.now();try{
        if(!this.room||this.room.expiresAt<=now){this.expire();return;}
        if(this.room.phase!=='race'){this.stopLoop();return;}
        if(!this.sockets.size){this.stopLoop();this.ctx.waitUntil(this.save());return;}
        this.accumulator+=Math.min(.25,(now-this.lastTick)/1000);this.lastTick=now;
        let advanced=false;while(this.accumulator>=1/30){M.tickRoom(this.room,1/30,now);this.accumulator-=1/30;advanced=true;}
        if(advanced&&this.room.sequence%2===0)this.broadcast(M.snapshot(this.room));
        if(now-this.lastSave>=5000){this.lastSave=now;this.ctx.waitUntil(this.save());}
        if(this.room.phase==='results'){this.broadcast(M.snapshot(this.room));this.lobby();this.stopLoop();this.ctx.waitUntil(this.save());}
      }catch{this.broadcast({type:'error',message:'Race connection interrupted. Rejoin using the same code.'});this.stopLoop();}
    },1000/30);
  }
  stopLoop(){if(this.loop){clearInterval(this.loop);this.loop=null;}}
  expire(){this.stopLoop();for(const ws of this.sockets.values())try{ws.close(4000,'Room expired');}catch{}this.sockets.clear();}
  async alarm(){await this.ready;if(!this.room||this.room.expiresAt<=Date.now()){this.expire();this.room=null;await this.ctx.storage.deleteAll();}else await this.ctx.storage.setAlarm(this.room.expiresAt);}
}