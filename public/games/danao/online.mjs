const CREATE_URL='/api/danao/create';
const JOIN_URL='/api/danao/join';
const SOCKET_PREFIX='/api/danao/';
const STORE_CODE='danao.reconnect.code';
const STORE_TOKEN='danao.reconnect.token';

let connection=null;

async function requestRoom(url,payload){
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
 let data=null;try{data=await response.json();}catch{}
 if(!response.ok)throw new Error(data?.error||`Room request failed (${response.status}).`);
 if(!data?.room||!Number.isInteger(data.id)||typeof data.token!=='string')throw new Error('The room service returned an invalid response.');
 return data;
}

function cleanProfile(profile={}){
 const name=String(profile.name||'Player').trim().slice(0,32)||'Player';
 const character=String(profile.character||'Hero');
 const costume=String(profile.costume||'Arcade').slice(0,40)||'Arcade';
 return{name,character,costume};
}

export async function createRoom(profile){
 return requestRoom(CREATE_URL,cleanProfile(profile));
}

export async function joinRoom(code,profile){
 code=String(code||'').trim();
 if(!/^\d{4}$/.test(code))throw new Error('Enter exactly four digits, including any leading zero.');
 return requestRoom(JOIN_URL,{code,...cleanProfile(profile)});
}

function notify(name,...args){try{connection?.handlers?.[name]?.(...args);}catch(error){console.error(error);}}

export function connectRoom(joinResponse,handlers={}){
 disconnectSocket();
 if(!joinResponse?.room?.code||typeof joinResponse.token!=='string')throw new Error('A valid room session is required.');
 const scheme=location.protocol==='https:'?'wss:':'ws:';
 const url=`${scheme}//${location.host}${SOCKET_PREFIX}${encodeURIComponent(joinResponse.room.code)}/socket?token=${encodeURIComponent(joinResponse.token)}`;
 const socket=new WebSocket(url);
 connection={socket,room:joinResponse.room,id:joinResponse.id,token:joinResponse.token,handlers,connected:false,lastState:null};
 try{localStorage.setItem(STORE_CODE,joinResponse.room.code);localStorage.setItem(STORE_TOKEN,joinResponse.token);}catch{}
 socket.addEventListener('open',()=>{if(!connection||connection.socket!==socket)return;connection.connected=true;notify('onConnection',true);});
 socket.addEventListener('message',event=>{
  if(!connection||connection.socket!==socket||typeof event.data!=='string')return;
  if(event.data==='pong')return;
  let message;try{message=JSON.parse(event.data);}catch{return notify('onError','Ignored an invalid room message.');}
  if(!message?.type)return notify('onError','Ignored an invalid room message.');
  if(message.type==='welcome'){
   if(Number.isInteger(message.id))connection.id=message.id;
   if(message.room){connection.room=message.room;notify('onRoom',message.room);}
   if(message.state){connection.lastState=message.state;notify('onSnapshot',message.state);}
  }else if(message.type==='room'&&message.room){connection.room=message.room;notify('onRoom',message.room);}
  else if(message.type==='input'&&message.frame)notify('onInput',message.id,message.frame);
  else if(message.type==='snapshot'&&message.state){connection.lastState=message.state;notify('onSnapshot',message.state);}
  else if(message.type==='host'){if(connection.room)connection.room.hostId=message.hostId;if(message.state)connection.lastState=message.state;notify('onHost',message.hostId,message.state||null);}
  else if(message.type==='result')notify('onResult',message.result||null);
  else if(message.type==='error')notify('onError',message.message||'Room error.');
 });
 socket.addEventListener('close',event=>{if(!connection||connection.socket!==socket)return;connection.connected=false;notify('onConnection',false);if(event.code!==1000&&event.code!==1005)notify('onError',event.reason||'Online connection closed.');});
 socket.addEventListener('error',()=>notify('onError','Online connection error.'));
 return connection;
}

function send(message){
 if(!connection?.socket||connection.socket.readyState!==WebSocket.OPEN){notify('onError','Not connected to a Danao room.');return false;}
 connection.socket.send(JSON.stringify(message));return true;
}

export function sendReady(ready){return send({type:'ready',ready:Boolean(ready)});}
export function sendChoice(character,costume='Arcade'){return send({type:'choice',character,costume});}
export function sendSetup(settings){return send({type:'setup',mode:settings.mode,arena:settings.arena,healthDamage:Boolean(settings.healthDamage),visibleBruising:Boolean(settings.visibleBruising),arenaHazards:Boolean(settings.arenaHazards),friendlyFire:Boolean(settings.friendlyFire)});}
export function sendStart(){return send({type:'start'});}
export function sendInput(frame){return send({type:'input',seq:frame.seq,moveX:Math.max(-1,Math.min(1,Number(frame.moveX)||0)),moveY:Math.max(-1,Math.min(1,Number(frame.moveY)||0)),jump:Boolean(frame.jump),punch:Boolean(frame.punch),grab:Boolean(frame.grab),dodge:Boolean(frame.dodge),fire:Boolean(frame.fire),block:Boolean(frame.block)});}
export function sendHostState(state){return send({type:'state',state});}
export function sendResult(result){return send({type:'result',result});}
export function sendRematch(){return send({type:'rematch'});}
export function sendLocked(locked){return send({type:'lock',locked:Boolean(locked)});}

export function roomSession(){return connection;}
export function inviteUrl(){return connection?.room?.code?`${location.origin}/games/danao/?room=${connection.room.code}`:'';}

export function reconnectStored(handlers={}){
 let code='',token='';try{code=localStorage.getItem(STORE_CODE)||'';token=localStorage.getItem(STORE_TOKEN)||'';}catch{}
 if(!/^\d{4}$/.test(code)||token.length<16)return null;
 return connectRoom({room:{code},id:-1,token},handlers);
}

function disconnectSocket(){
 if(!connection?.socket)return;
 const socket=connection.socket;connection.socket=null;
 try{socket.close(1000,'Reconnecting');}catch{}
}

export function leaveRoom(){
 if(connection?.socket?.readyState===WebSocket.OPEN)try{connection.socket.send(JSON.stringify({type:'leave'}));}catch{}
 if(connection?.socket)try{connection.socket.close(1000,'Left the room');}catch{}
 connection=null;
 try{localStorage.removeItem(STORE_CODE);localStorage.removeItem(STORE_TOKEN);}catch{}
}
