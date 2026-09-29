export function bindInput(canvas,onAction,playing){
 let gesture=null;const abort=new AbortController(),options={signal:abort.signal};
 const key=e=>{if(e.repeat||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName))return;
  if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();onAction('toggle-pause');return;}
  if(!playing()||e.target?.tagName==='BUTTON'&&['Space','Enter'].includes(e.code))return;
  const a={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'jump',KeyW:'jump',Space:'jump'}[e.code];if(a){e.preventDefault();onAction(a);}
 };
 window.addEventListener('keydown',key,options);
 canvas.addEventListener('pointerdown',e=>{if(!playing()||!e.isPrimary)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);},options);
 canvas.addEventListener('pointerup',e=>{if(!gesture||e.pointerId!==gesture.id)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;if(!playing())return;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy))onAction(dx<0?'left':'right');else if(Math.hypot(dx,dy)<20)onAction('jump');},options);
 canvas.addEventListener('pointercancel',()=>{gesture=null;},options);canvas.addEventListener('lostpointercapture',()=>{gesture=null;},options);
 return {clear(){gesture=null;},destroy(){abort.abort();gesture=null;}};
}
