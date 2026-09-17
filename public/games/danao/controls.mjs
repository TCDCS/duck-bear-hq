const dead=value=>Math.abs(Number(value)||0)<.16?0:Number(value)||0;
const pressed=(buttons,index)=>Boolean(buttons?.[index]?.pressed);

export function keyboardFrame(keys=new Set()){
 return{
  x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),
  z:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),
  jump:keys.has('KeyE'),
  attack:keys.has('Space'),
  grab:keys.has('KeyF'),
  dash:keys.has('ShiftLeft')||keys.has('ShiftRight'),
  fire:keys.has('KeyR'),
  block:keys.has('KeyQ')
 };
}

export function gamepadFrame(pad){
 if(!pad?.connected)return null;
 let x=dead(pad.axes?.[0]),z=dead(pad.axes?.[1]);
 if(pressed(pad.buttons,14))x=-1;if(pressed(pad.buttons,15))x=1;if(pressed(pad.buttons,12))z=-1;if(pressed(pad.buttons,13))z=1;
 return{x,z,jump:pressed(pad.buttons,0),attack:pressed(pad.buttons,2),grab:pressed(pad.buttons,3),dash:pressed(pad.buttons,1),fire:pressed(pad.buttons,7),block:pressed(pad.buttons,6)};
}

export function mergeFrames(primary,secondary){
 if(!primary)return secondary;if(!secondary)return primary;
 return{
  x:Math.abs(primary.x)>Math.abs(secondary.x)?primary.x:secondary.x,
  z:Math.abs(primary.z)>Math.abs(secondary.z)?primary.z:secondary.z,
  jump:primary.jump||secondary.jump,attack:primary.attack||secondary.attack,grab:primary.grab||secondary.grab,dash:primary.dash||secondary.dash,fire:primary.fire||secondary.fire,block:primary.block||secondary.block
 };
}

export const ZERO_FRAME=Object.freeze({x:0,z:0,jump:false,attack:false,grab:false,dash:false,fire:false,block:false});
