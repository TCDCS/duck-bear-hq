function material(BABYLON,scene,name,colour){
 const mat=new BABYLON.StandardMaterial(name,scene);
 mat.diffuseColor=BABYLON.Color3.FromHexString(colour);
 mat.specularColor=new BABYLON.Color3(.08,.08,.08);
 mat.ambientColor=mat.diffuseColor.scale(.25);
 return mat;
}

export function createFighter({BABYLON,RAPIER,scene,world,definition,position,slot}){
 const root=new BABYLON.TransformNode(`fighter-${slot}`,scene);
 const bodyMat=material(BABYLON,scene,`fighter-${slot}-body`,definition.body);
 const accentMat=material(BABYLON,scene,`fighter-${slot}-accent`,definition.accent);
 const bodyMesh=BABYLON.MeshBuilder.CreateCapsule(`fighter-${slot}-body`,{height:1.65,radius:.48},scene);
 bodyMesh.parent=root;bodyMesh.position.y=.86;bodyMesh.material=bodyMat;bodyMesh.renderOutline=true;bodyMesh.outlineWidth=.05;bodyMesh.outlineColor=BABYLON.Color3.Black();
 const head=BABYLON.MeshBuilder.CreateSphere(`fighter-${slot}-head`,{diameter:.8,segments:12},scene);
 head.parent=root;head.position.y=1.75;head.material=accentMat;head.renderOutline=true;head.outlineWidth=.045;head.outlineColor=BABYLON.Color3.Black();
 const band=BABYLON.MeshBuilder.CreateBox(`fighter-${slot}-band`,{width:.9,height:.18,depth:.62},scene);
 band.parent=root;band.position.y=1.77;band.material=bodyMat;

 const desc=RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x,position.y,position.z).setLinearDamping(5.5).setAngularDamping(8);
 const body=world.createRigidBody(desc);
 body.setEnabledRotations(false,false,false,true);
 const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.65,.46).setFriction(.85).setRestitution(.08),body);
 const state={slot,definition,root,body,collider,hp:100,attackCooldown:0,alive:true,spawn:{...position},lastInput:{x:0,z:0,attack:false,dash:false}};

 state.update=(input,dt)=>{
  state.lastInput=input;
  state.attackCooldown=Math.max(0,state.attackCooldown-dt);
  if(!state.alive)return;
  const current=body.linvel();
  const magnitude=Math.hypot(input.x,input.z);
  const scale=magnitude>1?1/magnitude:1;
  const speed=input.dash?8.2:6.2;
  body.setLinvel({x:input.x*scale*speed,y:current.y,z:input.z*scale*speed},true);
  if(magnitude>.12)root.rotation.y=Math.atan2(input.x,input.z);
 };
 state.applyDamage=(amount,impulse)=>{
  if(!state.alive)return;
  state.hp=Math.max(0,state.hp-Math.max(0,amount));
  if(impulse)body.applyImpulse(impulse,true);
  bodyMat.emissiveColor=new BABYLON.Color3(.65,.08,.08);
  setTimeout(()=>{if(!bodyMat.isDisposed)bodyMat.emissiveColor=BABYLON.Color3.Black();},90);
  if(state.hp<=0)state.alive=false;
 };
 state.sync=()=>{
  const p=body.translation();const q=body.rotation();
  root.position.set(p.x,p.y-.84,p.z);
  if(Number.isFinite(q.w))root.rotationQuaternion=new BABYLON.Quaternion(q.x,q.y,q.z,q.w);
 };
 state.reset=()=>{
  state.hp=100;state.alive=true;state.attackCooldown=0;
  body.setTranslation(state.spawn,true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
 };
 state.dispose=()=>{try{world.removeRigidBody(body);}catch{} root.dispose(false,true);bodyMat.dispose();accentMat.dispose();};
 return state;
}
