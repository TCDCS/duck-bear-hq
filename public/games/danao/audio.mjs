const SFX=Object.freeze(['Punch','WeaponHit','Grab','Throw','Squeak','Pop','Rocket','RocketBoom','TableBreak','Knockout','RoundStart','Victory','Empty','Bounce']);
const TITLE_SCALE=Object.freeze([293.66,349.23,440,523.25,659.25]);
const FIGHT_SCALE=Object.freeze([220,261.63,329.63,392,523.25]);
let context=null,master=null,musicBus=null,sfxBus=null,musicTimer=null,currentTheme='',beatIndex=0,nextBeat=0,muted=false;
let musicVolume=.34,sfxVolume=.78,masterVolume=1;

const AudioContextCtor=()=>globalThis.AudioContext||globalThis.webkitAudioContext||null;
const clamp=value=>Math.max(0,Math.min(1,Number(value)||0));
function setGain(node,value,when=context?.currentTime||0){if(node?.gain)node.gain.setValueAtTime(clamp(value),when);}

export async function unlockAudio(){
 if(!context){
  const Ctor=AudioContextCtor();if(!Ctor)return false;
  context=new Ctor();master=context.createGain();musicBus=context.createGain();sfxBus=context.createGain();musicBus.connect(master);sfxBus.connect(master);master.connect(context.destination);
  setGain(master,muted?0:masterVolume);setGain(musicBus,musicVolume);setGain(sfxBus,sfxVolume);
 }
 if(context.state==='suspended')try{await context.resume();}catch{}
 return context.state!=='closed';
}

export function setVolumes({master:masterLevel=masterVolume,music=musicVolume,sfx=sfxVolume}={}){
 masterVolume=clamp(masterLevel);musicVolume=clamp(music);sfxVolume=clamp(sfx);
 if(context){setGain(master,muted?0:masterVolume);setGain(musicBus,musicVolume);setGain(sfxBus,sfxVolume);}
 return{master:masterVolume,music:musicVolume,sfx:sfxVolume};
}

function oscillator(frequency,duration,volume=.2,type='sine',when=context.currentTime,endFrequency=null,bus=sfxBus){
 const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(Math.max(20,frequency),when);if(endFrequency)osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),when+duration);
 gain.gain.setValueAtTime(Math.max(.0001,volume),when);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);osc.connect(gain);gain.connect(bus);osc.start(when);osc.stop(when+duration+.02);
}
function noise(duration,volume=.2,when=context.currentTime,bus=sfxBus){
 const frames=Math.max(64,Math.ceil(context.sampleRate*duration)),buffer=context.createBuffer(1,frames,context.sampleRate),data=buffer.getChannelData(0);let seed=1428+frames;
 for(let i=0;i<frames;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/4294967295*2-1)*(1-i/frames);}
 const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.setValueAtTime(volume,when);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);source.connect(gain);gain.connect(bus);source.start(when);source.stop(when+duration+.02);
}
function gong(when=context.currentTime,volume=.13){oscillator(146.83,1.1,volume,'sine',when,null,musicBus);oscillator(220,1.0,volume*.35,'sine',when,null,musicBus);}
function kick(when,volume=.2){oscillator(82,.12,volume,'sine',when,48,musicBus);}
function hat(when,volume=.05){noise(.045,volume,when,musicBus);}

export function playSfx(id,volume=1){
 if(!context||muted||!SFX.includes(id))return false;const now=context.currentTime,v=Math.max(0,Math.min(1.2,Number(volume)||1));
 switch(id){
  case'Punch': noise(.11,.22*v,now);oscillator(92,.15,.24*v,'sine',now,72);break;
  case'WeaponHit': noise(.14,.24*v,now);oscillator(155,.18,.27*v,'triangle',now,118);break;
  case'Grab': oscillator(420,.12,.28*v,'sine',now,640);break;
  case'Throw': noise(.18,.12*v,now);oscillator(260,.22,.16*v,'sine',now,140);break;
  case'Squeak': oscillator(820,.32,.38*v,'square',now,1060);oscillator(610,.26,.12*v,'sine',now+.03,830);break;
  case'Pop': oscillator(640,.09,.34*v,'triangle',now,400);break;
  case'Rocket': noise(.3,.15*v,now);oscillator(110,.34,.2*v,'sawtooth',now,190);break;
  case'RocketBoom': noise(.48,.48*v,now);oscillator(54,.44,.3*v,'sine',now,34);break;
  case'TableBreak': noise(.31,.43*v,now);oscillator(138,.2,.18*v,'triangle',now,74);break;
  case'Knockout': oscillator(330,.62,.3*v,'sawtooth',now,150);oscillator(165,.5,.12*v,'sine',now+.04,90);break;
  case'RoundStart': oscillator(440,.2,.28*v,'square',now,440);oscillator(660,.24,.32*v,'square',now+.23,660);break;
  case'Victory': [523,659,784,1046].forEach((f,i)=>oscillator(f,.28,.24*v,'triangle',now+i*.18,null));break;
  case'Empty': oscillator(190,.08,.13*v,'square',now,160);break;
  case'Bounce': oscillator(190,.2,.24*v,'sine',now,550);break;
 }
 return true;
}

function scheduleMusic(){
 if(!context||muted||!currentTheme)return;const title=currentTheme==='title',scale=title?TITLE_SCALE:FIGHT_SCALE,beat=title?.30:.25,horizon=context.currentTime+.45;
 if(nextBeat<context.currentTime-.2)nextBeat=context.currentTime;
 while(nextBeat<horizon){
  const i=beatIndex++,note=scale[(i*2+Math.floor(i/3))%scale.length];oscillator(note,beat*.92,.12,'triangle',nextBeat,null,musicBus);if(i%2===0)kick(nextBeat,.17);hat(nextBeat,.045);if(i%(title?8:16)===0)gong(nextBeat,.11);nextBeat+=beat;
 }
}
function startTheme(theme){
 if(!context||muted)return false;if(currentTheme===theme&&musicTimer)return true;stopMusic();currentTheme=theme;beatIndex=0;nextBeat=context.currentTime+.04;scheduleMusic();musicTimer=setInterval(scheduleMusic,100);return true;
}
export function playTitleMusic(){return startTheme('title');}
export function playFightMusic(){return startTheme('fight');}
export function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}currentTheme='';}

function gameVisible(){const el=document.getElementById('game-screen');return Boolean(el&&!el.hidden);}
function chooseTheme(){if(!context||muted)return;if(gameVisible())playFightMusic();else playTitleMusic();}
function buttonState(){const button=document.getElementById('audio-toggle');if(!button)return;button.textContent=!context?'ENABLE SOUND':muted?'UNMUTE':'MUTE';button.setAttribute('aria-pressed',String(Boolean(context&&!muted)));}

async function enableFromGesture(){if(await unlockAudio()){muted=false;setGain(master,masterVolume);buttonState();chooseTheme();}}
function weaponImpactSfx(){const labels=[document.getElementById('p1-weapon')?.textContent||'',document.getElementById('p2-weapon')?.textContent||''].join(' ').toUpperCase();if(labels.includes('NOVELTY FLOPPY'))return'Squeak';if(labels.includes('BAZOOKA')||labels.includes('ROCKET'))return'RocketBoom';return'WeaponHit';}

function installUiAudio(){
 const toggle=document.getElementById('audio-toggle');buttonState();
 toggle?.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();if(!context){await enableFromGesture();return;}muted=!muted;setGain(master,muted?0:masterVolume);if(muted)stopMusic();else chooseTheme();buttonState();});
 document.addEventListener('pointerdown',event=>{if(event.target?.id!=='audio-toggle')void enableFromGesture();},{once:true,capture:true});
 document.addEventListener('keydown',()=>{void enableFromGesture();},{once:true,capture:true});
 const game=document.getElementById('game-screen'),round=document.getElementById('round-over'),hpEls=[document.getElementById('p1-hp'),document.getElementById('p2-hp')],weaponEls=[document.getElementById('p1-weapon'),document.getElementById('p2-weapon')];
 const lastHp=hpEls.map(el=>Number.parseInt(el?.textContent||'100',10)||100),lastWeapon=weaponEls.map(el=>el?.textContent||'FISTS');
 if(game)new MutationObserver(()=>{if(game.hidden)playTitleMusic();else{playFightMusic();playSfx('RoundStart');}}).observe(game,{attributes:true,attributeFilter:['hidden']});
 hpEls.forEach((el,index)=>{if(!el)return;new MutationObserver(()=>{const hp=Number.parseInt(el.textContent||'',10);if(Number.isFinite(hp)&&hp<lastHp[index])playSfx(hp<=0?'Knockout':weaponImpactSfx());lastHp[index]=Number.isFinite(hp)?hp:lastHp[index];}).observe(el,{childList:true,characterData:true,subtree:true});});
 weaponEls.forEach((el,index)=>{if(!el)return;new MutationObserver(()=>{const value=el.textContent||'FISTS';if(lastWeapon[index]==='FISTS'&&value!=='FISTS')playSfx('Grab');lastWeapon[index]=value;}).observe(el,{childList:true,characterData:true,subtree:true});});
 if(round)new MutationObserver(()=>{if(!round.hidden)playSfx('Victory');}).observe(round,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMusic();else chooseTheme();});
}

if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUiAudio,{once:true});else installUiAudio();}
