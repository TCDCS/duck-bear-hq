const byId=id=>document.getElementById(id);
const play=byId('play'),launchPanel=byId('launchPanel'),gamePanel=byId('gamePanel'),canvas=byId('unity-canvas'),loading=byId('loading'),meter=byId('meterFill'),loadingText=byId('loadingText'),compat=byId('compatibility'),fatal=byId('fatal'),fatalText=byId('fatalText'),retry=byId('retry'),fullscreen=byId('fullscreen'),padState=byId('padState'),invite=byId('invite');
let unityInstance=null,starting=false;

function hasWebGl2(){try{const c=document.createElement('canvas');return Boolean(c.getContext('webgl2',{failIfMajorPerformanceCaveat:false}));}catch{return false;}}
function updateController(){const pads=navigator.getGamepads?.()||[];const count=[...pads].filter(Boolean).length;padState.textContent=count?`CONTROLLER: ${count} READY`:'CONTROLLER: WAITING';padState.classList.toggle('ready',count>0);}
window.addEventListener('gamepadconnected',updateController);window.addEventListener('gamepaddisconnected',updateController);updateController();

const webglOk=hasWebGl2();compat.textContent=webglOk?'WEBGL 2 READY · CONTROLLERS RECOMMENDED':'WEBGL 2 IS NOT AVAILABLE IN THIS BROWSER';compat.className='compatibility '+(webglOk?'ok':'bad');play.disabled=!webglOk;
const room=new URL(location.href).searchParams.get('room');if(/^\d{4}$/.test(room||'')){invite.hidden=false;invite.textContent=`INVITE DETECTED · ROOM ${room} · START THE GAME THEN CHOOSE ONLINE PLAY → JOIN ROOM`;}

async function releaseInfo(){
 try{const r=await fetch('/games/danao/release.json',{cache:'no-store'});if(r.ok)return await r.json();}catch{}
 return {buildBase:'./Build',loader:'Danao.loader.js',data:'Danao.data',framework:'Danao.framework.js',wasm:'Danao.wasm',version:'development'};
}
function join(base,file){return `${String(base||'./Build').replace(/\/$/,'')}/${file}`;}
function addScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('The Dǎnào Web build is not published on this deployment yet.'));document.head.append(s);});}
function showFatal(message){starting=false;loading.hidden=true;fatal.hidden=false;fatalText.textContent=message||'The game could not start.';play.disabled=false;}

async function start(){
 if(starting||unityInstance)return;starting=true;play.disabled=true;fatal.hidden=true;launchPanel.hidden=true;gamePanel.hidden=false;loading.hidden=false;meter.style.width='0%';loadingText.textContent='Warming up the boxing gloves.';
 try{
  const release=await releaseInfo();const base=release.buildBase||'./Build';
  const loaderUrl=join(base,release.loader||'Danao.loader.js');
  // Local Unity exports also use ./Build/Danao.loader.js; production normally serves the same files from Cloudflare R2.
  if(typeof globalThis.createUnityInstance!=='function')await addScript(loaderUrl);
  if(typeof globalThis.createUnityInstance!=='function')throw new Error('The Dǎnào Web build is unavailable. The launcher loaded, but Unity did not publish its loader.');
  const config={dataUrl:join(base,release.data||'Danao.data'),frameworkUrl:join(base,release.framework||'Danao.framework.js'),codeUrl:join(base,release.wasm||'Danao.wasm'),streamingAssetsUrl:'StreamingAssets',companyName:'Duck & Bear',productName:'打闹 · Dǎnào',productVersion:release.version||'1.0.0',matchWebGLToCanvasSize:true,devicePixelRatio:Math.min(2,window.devicePixelRatio||1)};
  unityInstance=await globalThis.createUnityInstance(canvas,config,p=>{const pct=Math.round(p*100);meter.style.width=`${pct}%`;loadingText.textContent=p<.25?'Unfolding the wrestling chairs.':p<.55?'Inflating the boxing gloves.':p<.85?'Checking the bazooka is definitely a cartoon.':`Almost ready · ${pct}%`;});
  loading.hidden=true;starting=false;canvas.focus();
 }catch(err){const detail=typeof err==='string'?err:err?.message;showFatal(detail||'The Dǎnào Web build could not start. You can still use the Windows build when it is published.');}
}
play.addEventListener('click',start);retry.addEventListener('click',()=>{fatal.hidden=true;unityInstance=null;start();});
fullscreen.addEventListener('click',async()=>{try{if(unityInstance?.SetFullscreen){unityInstance.SetFullscreen(1);return;}if(gamePanel.requestFullscreen)await gamePanel.requestFullscreen();}catch{}});
window.addEventListener('resize',()=>{if(!unityInstance)return;canvas.style.width='100%';canvas.style.height='100%';});
