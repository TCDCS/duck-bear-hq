/** One input contract for keyboard, independent touch pointers and gamepads. */
export const DEFAULT_BINDINGS=Object.freeze({left:'ArrowLeft',right:'ArrowRight',jump:'Space',spin:'KeyX'});
const actions=['left','right','jump','spin'];
export function normaliseBindings(value,{strict=false}={}){
 const out={...DEFAULT_BINDINGS};if(!value||typeof value!=='object')return out;
 for(const action of actions){const code=value[action];if(typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right)|Control(Left|Right))$/.test(code))out[action]=code;else if(strict)throw new TypeError('Choose a letter, arrow, Space, Shift or Control.');}
 if(new Set(Object.values(out)).size!==4){if(strict)throw new TypeError('Each action needs a different key.');return {...DEFAULT_BINDINGS};}return out;
}
export class InputState{
 constructor({bindings=DEFAULT_BINDINGS,padButtons={jump:0,spin:2}}={}){this.bindings=normaliseBindings(bindings);this.padButtons=padButtons;this.keys=new Set();this.pointers=new Map();this.gamepad=null;this.previous={jump:false,spin:false,pause:false};this.pending={jump:false,spin:false,pause:false};}
 action(action){const b=this.bindings[action],aliases={left:['KeyA'],right:['KeyD'],jump:['KeyW','ArrowUp'],spin:['ShiftLeft','ShiftRight']};return this.keys.has(b)||(b===DEFAULT_BINDINGS[action]&&(aliases[action]||[]).some(k=>this.keys.has(k)))||[...this.pointers.values()].includes(action);}
 held(){const p=this.gamepad,pressed=i=>Boolean(p?.buttons?.[i]?.pressed),a=Number(p?.axes?.[0])||0;const horizontal=Math.abs(a)>.2?a:0;
  return {axis:Math.max(-1,Math.min(1,(this.action('right')?1:0)-(this.action('left')?1:0)+(pressed(15)?1:0)-(pressed(14)?1:0)+horizontal)),jump:this.action('jump')||pressed(this.padButtons.jump),spin:this.action('spin')||pressed(this.padButtons.spin),pause:this.keys.has('Escape')||this.keys.has('KeyP')||pressed(9)};
 }
 capture(){const h=this.held();for(const a of ['jump','spin','pause']){if(h[a]&&!this.previous[a])this.pending[a]=true;this.previous[a]=h[a];}}
 key(code,down){if(down)this.keys.add(code);else this.keys.delete(code);this.capture();}
 touch(action,pointerId,down){if(down)this.pointers.set(pointerId,action);else this.pointers.delete(pointerId);this.capture();}
 pad(pad){this.gamepad=pad?.connected?pad:null;this.capture();}
 sample(){const h=this.held(),out={axis:h.axis,jumpPressed:this.pending.jump,jumpHeld:h.jump,spinPressed:this.pending.spin,pausePressed:this.pending.pause};this.pending={jump:false,spin:false,pause:false};return out;}
 clear(){this.keys.clear();this.pointers.clear();this.gamepad=null;this.previous={jump:false,spin:false,pause:false};this.pending={jump:false,spin:false,pause:false};}
}
export function bindInput({target,buttons,state,onPause,onGamepad,onBack,playing=()=>false}){
 let wasConnected=false,lastNavigation=0,oldPadButtons=[];const cleanups=[];
 const listen=(el,type,fn,options)=>{el.addEventListener(type,fn,options);cleanups.push(()=>el.removeEventListener(type,fn,options));};
 listen(target,'keydown',e=>{if(e.target.closest?.('input,select,textarea')||e.isComposing)return;
  if(['Escape','KeyP',...Object.values(state.bindings),'KeyA','KeyD','KeyW','ArrowUp','ShiftLeft','ShiftRight'].includes(e.code)&&playing()){e.preventDefault();state.key(e.code,true);}
  else if(e.code==='Escape'&&!e.repeat)onBack?.();
 });
 listen(target,'keyup',e=>state.key(e.code,false));
 for(const button of buttons){
  listen(button,'pointerdown',e=>{e.preventDefault();if(!playing())return;button.setPointerCapture?.(e.pointerId);state.touch(button.dataset.control,e.pointerId,true);button.classList.add('pressed');});
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])listen(button,kind,e=>{state.touch(button.dataset.control,e.pointerId,false);button.classList.remove('pressed');});
 }
 function poll(now){
  let pads=[];try{pads=navigator.getGamepads?.()||[];}catch{}
  const p=[...pads].find(x=>x?.connected)||null;
  if(Boolean(p)!==wasConnected){if(!p&&wasConnected){state.clear();if(playing())onPause?.('Controller disconnected');}wasConnected=Boolean(p);onGamepad?.(p);}
  if(playing()){state.pad(p);oldPadButtons=(p?.buttons||[]).map(b=>b.pressed);return;}
  state.pad(null);if(!p){oldPadButtons=[];return;}
  const bs=p.buttons.map(b=>b.pressed),edge=i=>bs[i]&&!oldPadButtons[i];
  if(edge(1)||edge(9))onBack?.();
  const focusable=[...target.querySelectorAll('button:not([disabled]),a[href],input,select')].filter(x=>x.getClientRects().length&&!x.closest('[hidden]'));
  if((edge(0)||edge(2))&&target.activeElement?.tagName!=='INPUT')target.activeElement?.click?.();
  const move=(bs[13]||bs[15]||(p.axes[1]||0)>.55||(p.axes[0]||0)>.55)?1:(bs[12]||bs[14]||(p.axes[1]||0)<-.55||(p.axes[0]||0)<-.55)?-1:0;
  if(move&&now-lastNavigation>230&&focusable.length){const i=focusable.indexOf(target.activeElement);focusable[(i+move+focusable.length)%focusable.length].focus();lastNavigation=now;}
  oldPadButtons=bs;
 }
 return {poll,destroy(){cleanups.forEach(fn=>fn());state.clear();}};
}
