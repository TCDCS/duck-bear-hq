/** Original procedural score. No recordings, streams or external music services. */
const MELODIES={
 dublin:[0,4,7,9,7,4,2,0,2,4,7,4,9,7,4,2,0,2,4,7,12,9,7,4,2,4,7,2,4,2,0,-1],
 london:[0,3,7,10,7,5,3,0,2,5,9,12,10,9,5,2,3,7,10,14,12,10,7,3,2,5,9,5,3,2,0,-1],
 taj:[0,2,4,7,9,12,9,7,4,2,4,7,9,7,4,2,0,4,7,9,14,12,9,7,4,7,9,4,2,4,0,-1],
 sichuan:[0,3,5,7,10,7,5,3,0,5,7,12,10,7,5,3,5,7,10,12,15,12,10,7,5,3,0,3,5,3,0,-1],
 neimenggu:[7,9,12,14,12,9,7,4,2,4,7,9,7,4,2,0,4,7,9,12,16,14,12,9,7,4,2,4,7,2,0,-1],
 liaoning:[0,4,7,12,9,7,4,2,0,4,9,12,14,12,9,7,4,7,12,16,14,12,9,7,4,2,4,7,9,7,0,-1]
};
export function scoreFor(id='dublin',boss=false){const melody=MELODIES[id]||MELODIES.dublin,root=id==='london'?60:id==='taj'?62:id==='sichuan'?60:id==='neimenggu'?57:60;const beat=boss ? .29 : .38;
 const notes=[];for(let bar=0;bar<4;bar++)for(let i=0;i<32;i++){
  const m=melody[(i+bar*8)%32];if(m>=0)notes.push({at:(bar*32+i)*.5,midi:root+m+(bar===2?12:0),duration:i%4===3?.75:.36,gain:.14,voice:'melody'});
  if(i%4===0)notes.push({at:(bar*32+i)*.5,midi:Math.max(36,root-24+[0,5,7,0][Math.floor(i/8)]),duration:.85,gain:.13,voice:'bass'});
  if(i%4===2)for(const interval of [0,4,7])notes.push({at:(bar*32+i)*.5,midi:root-12+[0,5,7,0][Math.floor(i/8)]+interval,duration:.22,gain:.04,voice:'chord'});
 }return {beat:boss ? .29 : beat,beats:64,notes};}
const effects={
 pickup:[[81,.04,0],[88,.10,.055]],jump:[[61,.05,0],[69,.07,.035]],spin:[[53,.07,0],[60,.08,.04],[76,.11,.09]],
 hit:[[48,.1,0],[43,.14,.07]],'enemy-defeat':[[60,.06,0],[72,.1,.05]],checkpoint:[[72,.09,0],[76,.09,.09],[79,.14,.18],[84,.2,.3]],
 'power-up':[[64,.08,0],[69,.08,.07],[76,.13,.15],[81,.22,.25]],'shield-break':[[79,.07,0],[72,.1,.06],[60,.12,.12]],
 spring:[[55,.05,0],[67,.06,.045],[79,.16,.09]],'boss-hit':[[45,.08,0],[57,.09,.06],[69,.14,.12]],
 'boss-start':[[48,.15,0],[55,.15,.18],[60,.22,.36]],'level-clear':[[72,.13,0],[76,.13,.14],[79,.13,.28],[84,.2,.45],[79,.13,.7],[84,.5,.86]],
 menu:[[76,.045,0]],respawn:[[60,.09,0],[64,.09,.1],[67,.16,.2]]
};
export class AudioBus{
 constructor({createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)()}={}){this.createContext=createContext;this.context=null;this.available=null;this.music=.35;this.effects=.65;this.track='dublin';this.boss=false;this.paused=true;this.timer=null;this.sequence=0;this.nextAt=0;this.activeNodes=new Set();this.count=0;}
 async unlock(){if(this.available===false)return false;try{
  if(!this.context){this.context=this.createContext();const c=this.context;this.musicGain=c.createGain();this.sfxGain=c.createGain();const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=14;limiter.ratio.value=5;this.musicGain.connect(limiter);this.sfxGain.connect(limiter);limiter.connect(c.destination);this.setVolumes(this.music,this.effects);this.timer=setInterval(()=>this.schedule(),80);}
  await this.context.resume();this.available=true;return true;
 }catch{this.available=false;return false;}}
 setVolumes(music,effects){this.music=Math.max(0,Math.min(1,Number(music)||0));this.effects=Math.max(0,Math.min(1,Number(effects)||0));if(this.context){this.musicGain.gain.setTargetAtTime(this.music*.55,this.context.currentTime,.03);this.sfxGain.gain.setTargetAtTime(this.effects*.4,this.context.currentTime,.02);}}
 setTrack(id,boss=false){if(id===this.track&&boss===this.boss)return;this.track=id;this.boss=boss;this.sequence=0;this.nextAt=this.context?.currentTime||0;this.stopMusic();}
 stopMusic(){for(const n of this.activeNodes)if(n.music){try{n.osc.stop();}catch{}this.activeNodes.delete(n);}}
 setPaused(paused){this.paused=paused;if(paused)this.stopMusic();else{this.sequence=0;this.nextAt=(this.context?.currentTime||0)+.05;}}
 note(midi,duration,when,gain,voice='melody',isMusic=false){const c=this.context;if(!c||this.activeNodes.size>80)return;
  const osc=c.createOscillator(),volume=c.createGain();osc.type=voice==='bass'?'sine':voice==='chord'?'sine':'triangle';osc.frequency.setValueAtTime(440*2**((midi-69)/12),when);volume.gain.setValueAtTime(0,when);volume.gain.linearRampToValueAtTime(gain,when+.008);volume.gain.exponentialRampToValueAtTime(.0001,when+duration+.08);osc.connect(volume);volume.connect(isMusic?this.musicGain:this.sfxGain);const item={osc,music:isMusic};this.activeNodes.add(item);osc.onended=()=>{osc.disconnect();volume.disconnect();this.activeNodes.delete(item);};osc.start(when);osc.stop(when+duration+.1);this.count++;
 }
 schedule(){if(!this.context||this.context.state!=='running'||this.paused||this.music===0)return;const score=scoreFor(this.track,this.boss),c=this.context;if(this.nextAt<c.currentTime-.4){this.sequence=0;this.nextAt=c.currentTime+.03;}
  while(this.nextAt<c.currentTime+.16){const beat=this.sequence*.5;for(const n of score.notes)if(n.at===beat)this.note(n.midi,n.duration*score.beat,this.nextAt,n.gain,n.voice,true);this.sequence=(this.sequence+1)%128;this.nextAt+=score.beat*.5;}
 }
 play(name){if(!this.context||this.context.state!=='running'||this.effects===0)return;for(const [m,d,t] of effects[name]||[])this.note(m,d,this.context.currentTime+t,.25,'melody',false);}
 inspect(){return {unlocked:!!this.context,available:this.available,contextState:this.context?.state||'not-started',notesPlayed:this.count,music:this.music,effects:this.effects};}
 destroy(){clearInterval(this.timer);for(const n of this.activeNodes)try{n.osc.stop();}catch{}this.activeNodes.clear();this.context?.close();}
}
