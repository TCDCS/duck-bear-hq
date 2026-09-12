/** Test-only input driver. It never changes world state, hearts, bosses or positions. */
export function pilotInput(w,memory={}){
 const p=w.player,level=w.level;
 let axis=1,jump=false,spin=false;
 if(memory.lastJump===undefined)memory.lastJump=false;
 if(w.phase==='boss'){
  const b=w.boss;
  if(b.phase==='vulnerable'){
   axis=Math.abs(b.x-p.x)<24?0:Math.sign(b.x-p.x);
   if(p.grounded&&Math.abs(b.x-p.x)<185)jump=true;
   if(p.spinCooldownTicks===0&&Math.hypot(p.x-b.x,(p.y-35)-(b.y-34))<86)spin=true;
  }else{
   const safe=b.arena.x+160;
   axis=Math.abs(safe-p.x)<20?0:Math.sign(safe-p.x);
   if(p.grounded&&(w.projectiles.some(q=>Math.abs(q.x-p.x)<170&&q.y>p.y-100)||b.phase==='attack'&&Math.abs(b.x-p.x)<170))jump=true;
  }
 }else{
  const current=level.surfaces.find(s=>s.id===p.supportId);
  if(p.grounded&&current){
   const edge=current.x+current.w-p.x;
   const next=level.surfaces.filter(s=>s.main&&s.x>=current.x+current.w-.1).sort((a,b)=>a.x-b.x)[0];
   if(next&&edge<95&&next.x>current.x+current.w+1)jump=true;
   if(next&&edge<95&&next.y<(current.endY??current.y)-12)jump=true;
  }
  if(p.grounded&&level.hazards.some(h=>!h.disabledByHelper&&h.x-p.x>0&&h.x-p.x<145))jump=true;
  if(p.grounded&&w.enemies.some(e=>!e.dead&&e.x-p.x>0&&e.x-p.x<145&&e.y>p.y-90))jump=true;
  if(p.spinCooldownTicks===0&&w.enemies.some(e=>!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<85))spin=true;
 }
 const input={axis,jumpPressed:jump&&!memory.lastJump,jumpHeld:jump||!p.grounded,spinPressed:spin,pausePressed:false};
 memory.lastJump=jump;return input;
}
