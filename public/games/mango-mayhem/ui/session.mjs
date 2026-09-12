import {createWorld,stepWorld} from '../core/world.mjs';
import {recordPickup,recordCheckpoint,clearLevel,unlockedLevelIds} from '../core/progress.mjs';
import {LEVELS} from '../content/levels/index.mjs';
export class GameSession{
 constructor(local){this.local=local;this.mode='title';this.world=null;this.reason='';this.listeners=new Set();this.history=[];this.activeProfileId=null;this.results=null;}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(events){for(const e of events)this.history.push({...e});if(this.history.length>240)this.history.splice(0,this.history.length-240);for(const fn of this.listeners)fn(events);}
 start(id,{fromBeginning=false}={}){const profile=this.local.get();if(!profile)throw Error('Choose a player first.');if(!LEVELS[id]||!unlockedLevelIds(profile.progress).includes(id))throw Error('This level is locked.');this.activeProfileId=profile.id;const p=profile.progress.levels[id];this.world=createWorld(LEVELS[id],{extraHelp:this.local.settings.extraHelp,checkpointIndex:fromBeginning||p.cleared?0:p.checkpointIndex,mangoIds:p.mangoIds});this.mode='playing';this.reason='';this.results=null;this.history=[];}
 pause(reason='Take your time'){if(this.mode!=='playing')return;this.mode='paused';this.reason=reason;}
 resume(){if(['paused','helper'].includes(this.mode))this.mode='playing';}
 step(input){if(this.mode!=='playing'||!this.world)return [];
  if(input.pausePressed){this.pause();return [];}
  const w=this.world;stepWorld(w,input);let profile=this.local.get(this.activeProfileId);if(!profile){this.mode='title';return [];}
  let progress=profile.progress,changed=false;
  for(const event of w.events){
   if(event.type==='pickup'){progress=recordPickup(progress,w.level.id,event.targetId);changed=true;}
   if(event.type==='checkpoint'){progress=recordCheckpoint(progress,w.level.id,event.checkpointIndex);changed=true;}
   if(event.type==='helper')this.mode='helper';
   if(event.type==='level-clear'){const first=!progress.levels[w.level.id].cleared;progress=clearLevel(progress,w.level.id);changed=true;this.mode='results';this.results={levelId:w.level.id,firstClear:first,mangoes:progress.levels[w.level.id].mangoIds.length};}
  }
  if(changed)this.local.saveProgress(profile.id,progress);this.emit(w.events);return w.events;
 }
}
