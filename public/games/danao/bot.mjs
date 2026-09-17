export function createBotInput(fighter,target,now=performance.now()/1000){
 if(!fighter?.alive||!target?.alive)return{x:0,z:0,attack:false,dash:false};
 const a=fighter.body.translation(),b=target.body.translation();
 const dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz)||1;
 const wobble=Math.sin(now*2.4+fighter.slot)*.18;
 return{
  x:dist>1.75?dx/dist+wobble:-dz/dist*.35,
  z:dist>1.75?dz/dist-wobble:dx/dist*.35,
  attack:dist<2.2,
  dash:dist>5.5
 };
}
