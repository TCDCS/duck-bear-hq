import {LEVEL_IDS,LEVEL_META,COSTUMES,VERSION} from './content/catalog.mjs';
import {collectionTotal,equipCostume,equipAccessory,unlockedLevelIds} from './core/progress.mjs';
import {respawnPlayer} from './core/world.mjs';
import {LocalProfiles,DEFAULT_SETTINGS} from './platform/local.mjs';
import {CloudProfiles} from './platform/cloud.mjs';
import {InputState,bindInput,normaliseBindings,DEFAULT_BINDINGS} from './platform/input.mjs';
import {AudioBus} from './platform/audio.mjs';
import {SceneRenderer,drawThumbnail} from './render/scene.mjs';
import {drawCharacter} from './render/sprites.mjs';
import {GameSession} from './ui/session.mjs';
import * as views from './ui/views.mjs';
const $=id=>document.getElementById(id),menu=$('menu'),shell=$('gameShell');
let storage;try{storage=localStorage;}catch{}
const local=new LocalProfiles(storage),cloud=new CloudProfiles(local),session=new GameSession(local),audio=new AudioBus(),renderer=new SceneRenderer($('gameCanvas'));
let hasSavedSettings=false;try{hasSavedSettings=!!storage?.getItem('mango-mayhem-v1');}catch{}
if(!hasSavedSettings){
 try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)local.setSettings({...local.settings,reducedMotion:true});}catch{}
}
const input=new InputState({bindings:local.settings.bindings,padButtons:{jump:local.settings.padJump,spin:local.settings.padSpin}});
let view='title',returnView='title',pendingLevel=null,pendingBeginning=false,pendingIntent=null,editingProfile=null,gamepadName='',bindingAction=null,lastFrame=0,accumulator=0,visualTick=0,toastExpiry=0,lastError=null,previousHud='';
let settings=local.settings;
const profile=()=>{const p=local.get();return p&&(!p.cloud||p.cloud.ownerId===cloud.ownerId||cloud.status.startsWith('Cloud unavailable'))?p:null;};
function toast(text){$('toast').textContent=text;$('toast').hidden=false;toastExpiry=performance.now()+4600;}
function error(e){lastError=e instanceof Error?e.message:String(e);toast(lastError);}
function updateSaveStatus(){const p=profile();$('profileButton').textContent=p?`${views.AVATARS[p.avatarId]} ${p.nickname}`:'Choose player';
 const text=!local.persistent?'Device saving unavailable':!p?'Choose a player to save your adventure':!p.cloud?'Saved on this device':p.cloud.deleted?'Cloud copy removed · device copy kept':p.cloud.dirty?'Saved on device · waiting for cloud':cloud.ownerId===p.cloud.ownerId?'Cloud saved':'Device copy · sign in to sync';
 $('saveStatus').textContent=text;const element=$('cloudStatusText');if(element)element.textContent=cloud.status;
}
function drawPreviews(){for(const canvas of menu.querySelectorAll('canvas[data-scene]'))drawThumbnail(canvas,canvas.dataset.scene);
 for(const canvas of menu.querySelectorAll('canvas[data-character],canvas[data-figures]')){
  const c=canvas.getContext('2d'),ids=canvas.dataset.figures?.split(',')||[canvas.dataset.character],w=canvas.width,h=canvas.height;const scale=Math.min(h/173,w/(ids.length*104));c.clearRect(0,0,w,h);
  ids.forEach((id,i)=>drawCharacter(c,{id,x:w/2+(i-(ids.length-1)/2)*98*scale,y:h*.93,scale,tick:40,anim:'idle',costume:canvas.dataset.costume||'starter',accessory:canvas.dataset.accessory||null}));
 }
}
function focusMenu(){requestAnimationFrame(()=>{const first=menu.querySelector('[data-action="resume"],.button.primary,button:not([disabled]),input,a[href]');first?.focus({preventScroll:true});});}
function show(next,{back,focus=true}={}){
 if(view==='playing'&&next!=='playing')session.pause();
 if(back)returnView=back;else if(['settings','wardrobe','help','profiles'].includes(next)&&view!==next)returnView=['playing','paused','helper'].includes(view)?'paused':view==='results'?'results':'title';
 view=next;session.mode=next==='playing'?'playing':next;input.clear();accumulator=0;bindingAction=null;previousHud='';
 const p=profile();menu.hidden=next==='playing';$('hud').hidden=!['playing','paused','helper','results'].includes(next);$('bossHud').hidden=true;
 menu.className='menu '+(['paused','helper','results','story','level-choice','rename','delete'].includes(next)?'modal-menu':['title','playing'].includes(next)?'':'solid-menu');
 shell.classList.toggle('has-world',['playing','paused','helper','results'].includes(next));
 let html='';
 if(next==='title')html=views.titleView(p);
 if(next==='map')html=views.mapView(p);
 if(next==='wardrobe')html=views.wardrobeView(p);
 if(next==='settings')html=views.settingsView(settings,gamepadName);
 if(next==='profiles')html=views.profilesView(local,cloud);
 if(next==='help')html=views.helpView();
 if(next==='paused')html=views.pausedView(session);
 if(next==='helper')html=views.helperView(session.world.level.id);
 if(next==='results')html=views.resultsView(session.results);
 if(next==='story')html=views.storyView(pendingLevel);
 if(next==='level-choice')html=views.levelChoiceView(pendingLevel,p);
 if(next==='rename')html=views.renameView(local.get(editingProfile));
 if(next==='delete')html=views.deleteView(local.get(editingProfile),cloud);
 menu.innerHTML=html;menu.scrollTop=0;if(next!=='playing')drawPreviews();
 audio.setPaused(['paused','helper','story','level-choice','rename','delete','results'].includes(next));
 if(['title','map','wardrobe','profiles','settings','help'].includes(next))audio.setTrack('dublin');
 updateTouch();updateSaveStatus();if(focus&&next!=='playing')focusMenu();
}
function updateTouch(){const touch=settings.touch==='always'||settings.touch==='auto'&&(navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches);$('touchControls').hidden=!(view==='playing'&&touch);shell.classList.toggle('has-touch',touch&&view==='playing');}
function ensureProfile(intent){if(profile())return true;pendingIntent=intent;show('profiles');toast('Create or choose your player first.');return false;}
function chooseLevel(id,{beginning=false}={}){if(!ensureProfile({id,beginning}))return;const p=profile();if(!unlockedLevelIds(p.progress).includes(id))throw Error('Finish the previous level first.');pendingLevel=id;pendingBeginning=beginning;
 show(!beginning&&!p.progress.levels[id].cleared&&p.progress.levels[id].checkpointIndex>0?'level-choice':'story');
}
function begin(){session.start(pendingLevel,{fromBeginning:pendingBeginning});renderer.reset(session.world);audio.setTrack(pendingLevel);show('playing');audio.setPaused(false);$('gameCanvas').setAttribute('aria-label',`${LEVEL_META[pendingLevel].place} platform game. Move with arrows, jump with Space, spin with X. Escape pauses.`);}
function continueAdventure(){if(!ensureProfile('continue'))return;const p=profile(),id=LEVEL_IDS.find(id=>!p.progress.levels[id].cleared);if(!id){show('map');return;}chooseLevel(id);}
function resume(){session.mode=view==='helper'?'helper':'paused';session.resume();audio.setTrack(session.world.level.id,session.world.phase==='boss');show('playing');audio.setPaused(false);}
function pause(reason='The adventure is paused. Your collected mangos are kept.'){if(view!=='playing')return;session.pause(reason);cloud.flush();show('paused');}
function back(){if(bindingAction){bindingAction=null;show('settings',{back:returnView});return;}if(view==='playing'){pause();return;}if(view==='paused'){resume();return;}if(view==='helper'){resume();return;}if(['rename','delete'].includes(view)){show('profiles');return;}if(['story','level-choice'].includes(view)){show('map');return;}if(view==='title')return;const target=['settings','wardrobe','profiles','help'].includes(view)?returnView:'title';show(target==='playing'?'paused':target);}
function applySettings(next){local.setSettings(next);settings=local.settings;input.bindings=settings.bindings;input.padButtons={jump:settings.padJump,spin:settings.padSpin};input.clear();audio.setVolumes(settings.music,settings.effects);document.body.classList.toggle('reduced-motion',settings.reducedMotion);if(session.world)session.world.extraHelp=settings.extraHelp;updateTouch();}
function finishProfileChoice(){$('toast').hidden=true;if(pendingIntent){const intent=pendingIntent;pendingIntent=null;if(intent==='continue')continueAdventure();else if(intent==='wardrobe')show('wardrobe');else if(intent==='map')show('map');else chooseLevel(intent.id,{beginning:intent.beginning});}else show('profiles');}
const actions={
 continue:continueAdventure,map:()=>show('map'),title:()=>{cloud.flush();show('title');},wardrobe:()=>{if(ensureProfile('wardrobe'))show('wardrobe');},settings:()=>show('settings'),profiles:()=>show('profiles'),back,
 level:b=>chooseLevel(b.dataset.id),begin,
 'resume-checkpoint':()=>{pendingBeginning=false;begin();},'restart-level':b=>chooseLevel(b.dataset.id,{beginning:true}),
 resume,'restart-checkpoint':()=>{respawnPlayer(session.world,{full:true});renderer.reset(session.world);resume();},'leave-map':()=>{cloud.flush();show('map');},
 costume:b=>{const p=profile();if(!p)return;local.saveProgress(p.id,equipCostume(p.progress,b.dataset.id));show('wardrobe',{back:returnView,focus:false});cloud.flush();toast('Outfit on. Excellent judgement.');},
 accessory:b=>{const p=profile();if(!p)return;local.saveProgress(p.id,equipAccessory(p.progress,b.dataset.id==='none'?null:b.dataset.id));show('wardrobe',{back:returnView,focus:false});cloud.flush();},
 'wear-reward':()=>{const p=profile(),id=LEVEL_META[session.results.levelId].costume;local.saveProgress(p.id,equipCostume(p.progress,id));cloud.flush();toast(`${COSTUMES[id].name} equipped!`);},
 'next-level':()=>{const next=LEVEL_IDS[LEVEL_META[session.results.levelId].index+1];chooseLevel(next);},
 'select-profile':b=>{local.select(b.dataset.id);finishProfileChoice();},'rename-profile':b=>{editingProfile=b.dataset.id;show('rename');},'delete-profile':b=>{editingProfile=b.dataset.id;show('delete');},
 'confirm-delete':b=>{local.remove(b.dataset.id);show('profiles');},'confirm-delete-cloud':async b=>{await cloud.removeCloud(b.dataset.id);show('profiles');},
 'upload-profile':async()=>{await cloud.refresh();await cloud.upload(local.selectedId);show('profiles');},'download-profile':b=>{cloud.download(b.dataset.id);finishProfileChoice();},
 'refresh-cloud':async()=>{await cloud.refresh();await cloud.flush();show('profiles',{focus:false});},
 logout:async()=>{const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});if(!response.ok&&response.status!==401)throw Error('Sign-out could not be confirmed. Try again.');await cloud.refresh();session.world=null;show('profiles');},
 rebind:b=>{bindingAction=b.dataset.id;b.querySelector('kbd').textContent='Press a key…';toast('Press a key for '+bindingAction+'. Escape cancels.');},
 'reset-controls':()=>{applySettings({...settings,bindings:DEFAULT_BINDINGS,padJump:0,padSpin:2});show('settings',{back:returnView});toast('Default controls restored.');}
};
menu.addEventListener('click',async event=>{const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const action=actions[button.dataset.action];if(!action)return;
 audio.unlock();audio.play('menu');try{const result=action(button);if(result?.then){button.disabled=true;await result;}}catch(e){error(e);}finally{if(button.isConnected)button.disabled=false;}});
menu.addEventListener('submit',async event=>{event.preventDefault();const form=event.target,button=form.querySelector('button[type="submit"]'),data=new FormData(form);if(button)button.disabled=true;
 try{
  if(form.id==='createProfileForm'){local.create(data.get('nickname'),data.get('avatarId'));finishProfileChoice();}
  if(form.id==='renameProfileForm'){await cloud.rename(form.dataset.id,data.get('nickname'),data.get('avatarId'));show('profiles');}
  if(form.id==='loginForm'){
   const response=await fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:data.get('username'),password:data.get('password')})});
   const result=await response.json();form.querySelector('[name=password]').value='';if(!response.ok)throw Error(result.error||'Sign-in failed.');await cloud.refresh();show('profiles');
  }
 }catch(e){error(e);}finally{if(button?.isConnected)button.disabled=false;}
});
menu.addEventListener('input',event=>{const key=event.target.dataset.setting;if(!key)return;const element=event.target;let value=element.type==='checkbox'?element.checked:element.value;if(['music','effects'].includes(key))value=Number(value)/100;if(['padJump','padSpin'].includes(key))value=Number(value);if(key==='padJump'&&value===settings.padSpin||key==='padSpin'&&value===settings.padJump){toast('Jump and spin need different controller buttons.');element.value=String(settings[key]);return;}applySettings({...settings,[key]:value});if(key==='effects')audio.play('menu');});
window.addEventListener('keydown',event=>{if(!bindingAction)return;event.preventDefault();event.stopImmediatePropagation();if(event.code==='Escape'){bindingAction=null;show('settings',{back:returnView});return;}try{const bindings=normaliseBindings({...settings.bindings,[bindingAction]:event.code},{strict:true});applySettings({...settings,bindings});bindingAction=null;show('settings',{back:returnView});}catch(e){error(e);}},true);
const deviceInput=bindInput({target:document,buttons:document.querySelectorAll('[data-control]'),state:input,onPause:pause,onBack:back,playing:()=>view==='playing',onGamepad:pad=>{gamepadName=pad?.id||'';if(pad)toast('Controller connected. Ready for mango duty.');}});
$('profileButton').addEventListener('click',()=>show('profiles'));$('pauseButton').addEventListener('click',()=>pause());$('helpButton').addEventListener('click',()=>show('help'));
$('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();else throw Error('Fullscreen is not supported in this browser. Landscape mode still works.');}catch(e){toast(e.message||'Fullscreen is unavailable in this browser.');}});
document.addEventListener('fullscreenchange',()=>{$('fullscreenButton').setAttribute('aria-label',document.fullscreenElement?'Leave fullscreen':'Enter fullscreen');renderer.resize();});
const unlock=()=>{audio.unlock().then(ok=>{if(ok&&!['playing','paused','helper','story','results','level-choice'].includes(view))audio.setPaused(false);});};
document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
window.addEventListener('blur',()=>{input.clear();pause('The window lost focus. Choose Resume when you are ready.');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){input.clear();pause('The game was hidden. Choose Resume when you are ready.');audio.setPaused(true);}else if(view!=='playing')updateSaveStatus();});
window.addEventListener('resize',()=>{renderer.resize();updateTouch();});
window.addEventListener('online',async()=>{await cloud.refresh();await cloud.flush();updateSaveStatus();});
window.addEventListener('pagehide',()=>{local.persist();});
local.subscribe(updateSaveStatus);cloud.subscribe(updateSaveStatus);
session.subscribe(events=>{renderer.receive(events,{reducedMotion:settings.reducedMotion});for(const event of events){audio.play(event.type);if(event.type==='checkpoint'){toast('Checkpoint! Five hearts and a fresh start.');cloud.flush();}if(event.type==='boss-start'){audio.setTrack(session.world.level.id,true);toast(LEVEL_META[session.world.level.id].boss.hint);}if(event.type==='level-clear')cloud.flush();}});
function updateHud(){if(!$('hud').hidden&&session.world){const w=session.world,p=w.player,current=local.get(session.activeProfileId),mangoes=current?.progress.levels[w.level.id].mangoIds.length||0;const key=[p.hearts,mangoes,w.level.id,w.checkpointIndex,w.phase,w.boss.phase,w.boss.hp,p.shield,p.superTicks>0,p.magnetTicks>0].join('|');if(key===previousHud)return;previousHud=key;
  $('hearts').innerHTML=Array.from({length:5},(_,i)=>`<span class="${i<p.hearts?'':'empty'}" aria-hidden="true">♥</span>`).join('');$('hearts').setAttribute('aria-label',`${p.hearts} of five hearts`);$('mangoCount').textContent=String(mangoes);$('levelLabel').innerHTML=`${LEVEL_META[w.level.id].place}<small>${p.superTicks?'Super Mango!':p.shield?'Bubble shield':p.magnetTicks?'Mango magnet':w.checkpointIndex?'Checkpoint '+w.checkpointIndex:'Adventure awaits'}</small>`;
  $('bossHud').hidden=w.phase!=='boss'||view!=='playing';if(w.phase==='boss'){$('bossName').textContent=LEVEL_META[w.level.id].boss.name;$('bossPips').innerHTML=Array.from({length:w.boss.maxHp},(_,i)=>`<i class="${i<w.boss.hp?'':'empty'}"></i>`).join('');$('bossPips').setAttribute('aria-label',`${w.boss.hp} hits remaining`);$('bossCue').textContent=w.boss.phase==='vulnerable'?'GO! Jump or spin at the glowing switch.':w.boss.phase==='warn'?'Watch out! An attack is coming.':w.boss.phase==='hurt'?'BONK! Nicely done.':'Dodge the attack. Wait for the green switch.';$('bossHud').classList.toggle('open',w.boss.phase==='vulnerable');}
 }}
function frame(now){try{
 const delta=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;visualTick+=delta*60;deviceInput.poll(now);
 if(view==='playing'){
  accumulator+=delta;let steps=0;while(accumulator>=1/60&&steps++<5&&view==='playing'){
   const sampled=input.sample();if(sampled.pausePressed){pause();break;}session.step(sampled);accumulator-=1/60;
   if(session.mode!==view){show(session.mode);break;}
  }
  if(steps>=5)accumulator=0;
 }else accumulator=0;
 const p=['playing','paused','helper','results'].includes(view)?local.get(session.activeProfileId):profile();renderer.paint(session.world,{tick:visualTick,menu:!['playing','paused','helper','results'].includes(view),title:view==='title',reducedMotion:settings.reducedMotion,costume:p?.progress.equippedCostume||'starter',accessory:p?.progress.accessory||null,paused:view!=='playing'});updateHud();
 if(!$('toast').hidden&&now>toastExpiry)$('toast').hidden=true;
 }catch(e){lastError=e.message;console.error('Mango frame failed',e);if(view==='playing')pause('The game stopped unexpectedly. Your saved checkpoint is kept.');toast('The game needs a reload. Your saved progress is kept.');}
 requestAnimationFrame(frame);
}
applySettings(settings);show('title',{focus:false});requestAnimationFrame(frame);
cloud.refresh().then(()=>{updateSaveStatus();if(view==='title')show('title',{focus:false});});
setInterval(()=>{if(!document.hidden)cloud.flush();},15000);
// Read-only diagnostics, opt-in for browser acceptance checks. No game mutation or wins.
if(new URLSearchParams(location.search).get('verify')==='1')Object.defineProperty(window,'MangoMayhem',{value:Object.freeze({inspect(){return structuredClone({version:VERSION,view,world:session.world,progress:local.get(session.activeProfileId||local.selectedId)?.progress||null,eventHistory:session.history,settings,audio:audio.inspect(),render:renderer.measure(),saveStatus:$('saveStatus').textContent,lastError});}}),writable:false,configurable:false});
