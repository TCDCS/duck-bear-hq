export const WEAPONS=Object.freeze([
 {id:'boxing-glove',name:'Boxing Glove',class:'melee',damage:8,knockback:6,cooldown:.35,shape:'sphere',colour:'#e84b4b'},
 {id:'spring-boxing-glove',name:'Spring Boxing Glove',class:'melee',damage:10,knockback:9,cooldown:.55,shape:'capsule',colour:'#f05d52'},
 {id:'inflatable-hammer',name:'Inflatable Hammer',class:'melee',damage:11,knockback:10,cooldown:.62,shape:'box',colour:'#f6c343'},
 {id:'rubber-chicken',name:'Rubber Chicken',class:'melee',damage:7,knockback:7,cooldown:.32,shape:'capsule',colour:'#f2d154'},
 {id:'pool-noodle',name:'Pool Noodle',class:'melee',damage:6,knockback:6,cooldown:.28,shape:'capsule',colour:'#45c9d0'},
 {id:'frying-pan',name:'Frying Pan',class:'melee',damage:12,knockback:9,cooldown:.58,shape:'cylinder',colour:'#5d6675'},
 {id:'folding-chair',name:'Folding Chair',class:'melee',damage:14,knockback:11,cooldown:.68,shape:'box',colour:'#9ea5ad'},
 {id:'mop',name:'Mop',class:'melee',damage:8,knockback:7,cooldown:.46,shape:'capsule',colour:'#75b6df'},
 {id:'baguette',name:'Baguette',class:'melee',damage:7,knockback:5,cooldown:.30,shape:'capsule',colour:'#d99a45'},
 {id:'giant-fish',name:'Giant Fish',class:'melee',damage:12,knockback:10,cooldown:.60,shape:'capsule',colour:'#56a6c5'},
 {id:'umbrella',name:'Umbrella',class:'melee',damage:9,knockback:8,cooldown:.45,shape:'cone',colour:'#8b64cf'},
 {id:'toy-guitar',name:'Toy Guitar',class:'melee',damage:13,knockback:10,cooldown:.63,shape:'box',colour:'#dd5b89'},
 {id:'silly-sausage',name:'Silly Sausage',class:'melee',damage:8,knockback:7,cooldown:.36,shape:'capsule',colour:'#c85a4f'},
 {id:'floppy-nonsense',name:'Floppy Nonsense',class:'melee',damage:10,knockback:12,cooldown:.52,shape:'capsule',colour:'#9b6ed5'},
 {id:'foam-blaster',name:'Foam Blaster',class:'ranged',damage:6,knockback:4,cooldown:.30,shape:'box',colour:'#49a9e8',ammo:12,projectileSpeed:18},
 {id:'water-blaster',name:'Water Blaster',class:'ranged',damage:4,knockback:3,cooldown:.24,shape:'box',colour:'#45cde4',ammo:16,projectileSpeed:19},
 {id:'suction-cup-launcher',name:'Suction Cup Launcher',class:'ranged',damage:7,knockback:6,cooldown:.45,shape:'cylinder',colour:'#e34f68',ammo:8,projectileSpeed:17},
 {id:'confetti-cannon',name:'Confetti Cannon',class:'ranged',damage:5,knockback:5,cooldown:.58,shape:'cylinder',colour:'#f0b638',ammo:6,projectileSpeed:16},
 {id:'bubble-cannon',name:'Bubble Cannon',class:'ranged',damage:4,knockback:3,cooldown:.34,shape:'cylinder',colour:'#70d5e7',ammo:10,projectileSpeed:15},
 {id:'tennis-ball-launcher',name:'Tennis Ball Launcher',class:'ranged',damage:7,knockback:5,cooldown:.36,shape:'box',colour:'#b8dc45',ammo:10,projectileSpeed:20},
 {id:'magnet-gun',name:'Magnet Gun',class:'ranged',damage:3,knockback:8,cooldown:.70,shape:'box',colour:'#7c75d9',ammo:5,projectileSpeed:14},
 {id:'plunger-launcher',name:'Plunger Launcher',class:'ranged',damage:8,knockback:7,cooldown:.48,shape:'cylinder',colour:'#df5449',ammo:8,projectileSpeed:17},
 {id:'party-popper-blaster',name:'Party Popper Blaster',class:'ranged',damage:5,knockback:5,cooldown:.42,shape:'cone',colour:'#f28bc2',ammo:8,projectileSpeed:16},
 {id:'cartoon-bazooka',name:'Cartoon Bazooka',class:'ranged',damage:24,knockback:16,cooldown:1.05,shape:'cylinder',colour:'#5b7a59',ammo:2,projectileSpeed:14},
 {id:'bowling-ball',name:'Bowling Ball',class:'heavy',damage:16,knockback:13,cooldown:.82,shape:'sphere',colour:'#46385d'},
 {id:'traffic-cone',name:'Traffic Cone',class:'heavy',damage:8,knockback:7,cooldown:.52,shape:'cone',colour:'#f07835'},
 {id:'bin',name:'Bin',class:'heavy',damage:15,knockback:12,cooldown:.86,shape:'cylinder',colour:'#52666b'},
 {id:'suitcase',name:'Suitcase',class:'heavy',damage:13,knockback:10,cooldown:.72,shape:'box',colour:'#a36f54'},
 {id:'kettle',name:'Kettle',class:'heavy',damage:10,knockback:8,cooldown:.56,shape:'sphere',colour:'#b0b7bd'},
 {id:'cushion',name:'Cushion',class:'heavy',damage:5,knockback:4,cooldown:.38,shape:'box',colour:'#e292b9'},
 {id:'foam-extinguisher',name:'Foam Extinguisher',class:'heavy',damage:11,knockback:10,cooldown:.62,shape:'cylinder',colour:'#e6e8ea'},
 {id:'anvil',name:'Anvil',class:'heavy',damage:22,knockback:15,cooldown:1.00,shape:'box',colour:'#414651'},
 {id:'giant-mango',name:'Giant Mango',class:'heavy',damage:17,knockback:12,cooldown:.78,shape:'sphere',colour:'#f29b2f'},
 {id:'wrestling-table',name:'Wrestling Table',class:'heavy',damage:18,knockback:14,cooldown:.92,shape:'box',colour:'#9a6a3f'},
 {id:'speaker',name:'Speaker',class:'heavy',damage:14,knockback:11,cooldown:.74,shape:'box',colour:'#30303b'},
 {id:'toy-crate',name:'Toy Crate',class:'heavy',damage:16,knockback:12,cooldown:.84,shape:'box',colour:'#4fa7a6'}
]);

function makeMaterial(BABYLON,scene,name,colour){
 const material=new BABYLON.StandardMaterial(name,scene);
 material.diffuseColor=BABYLON.Color3.FromHexString(colour);
 material.specularColor=new BABYLON.Color3(.06,.06,.07);
 material.emissiveColor=material.diffuseColor.scale(.08);
 return material;
}

function makeMesh(BABYLON,scene,definition,name){
 let mesh;
 if(definition.shape==='sphere')mesh=BABYLON.MeshBuilder.CreateSphere(name,{diameter:.72,segments:10},scene);
 else if(definition.shape==='cylinder')mesh=BABYLON.MeshBuilder.CreateCylinder(name,{height:1.05,diameter:.42,tessellation:12},scene);
 else if(definition.shape==='cone')mesh=BABYLON.MeshBuilder.CreateCylinder(name,{height:1.05,diameterTop:.12,diameterBottom:.72,tessellation:12},scene);
 else if(definition.shape==='capsule')mesh=BABYLON.MeshBuilder.CreateCapsule(name,{height:1.2,radius:.22,tessellation:10},scene);
 else mesh=BABYLON.MeshBuilder.CreateBox(name,{width:.72,height:.58,depth:.36},scene);
 mesh.material=makeMaterial(BABYLON,scene,`${name}-mat`,definition.colour);
 mesh.renderOutline=true;mesh.outlineWidth=.035;mesh.outlineColor=BABYLON.Color3.Black();
 return mesh;
}

function distanceToFighter(fighter,pickup){
 const p=fighter.body.translation(),q=pickup.mesh.getAbsolutePosition();
 return Math.hypot(p.x-q.x,p.z-q.z);
}

export function spawnWeapons({BABYLON,scene,positions,arenaId='arena'}){
 const seed=[...arenaId].reduce((n,c)=>(n+c.charCodeAt(0))%WEAPONS.length,0);
 return positions.map((position,index)=>{
  const definition=WEAPONS[(seed+index*5)%WEAPONS.length];
  const mesh=makeMesh(BABYLON,scene,definition,`weapon-${index}-${definition.id}`);
  mesh.position.set(position.x,position.y,position.z);
  mesh.rotation.y=index*.73;
  return{definition,mesh,available:true,holder:null,ammo:definition.ammo??null,home:{...position}};
 });
}

export function tryPickupWeapon(fighter,pickups,maxDistance=1.65){
 if(!fighter?.alive||fighter.heldWeapon)return null;
 let nearest=null,best=maxDistance;
 for(const pickup of pickups){
  if(!pickup.available)continue;
  const distance=distanceToFighter(fighter,pickup);
  if(distance<best){best=distance;nearest=pickup;}
 }
 if(!nearest)return null;
 nearest.available=false;nearest.holder=fighter;fighter.heldWeapon=nearest;
 nearest.mesh.parent=fighter.root;
 nearest.mesh.position.set(.62,1.05,.35);
 nearest.mesh.rotation.set(0,0,Math.PI*.22);
 nearest.mesh.scaling.setAll(.72);
 return nearest;
}

export function dropHeldWeapon(fighter,position=null){
 const pickup=fighter?.heldWeapon;if(!pickup)return null;
 const p=position||fighter.body.translation();
 pickup.mesh.setParent(null,true);
 pickup.mesh.position.set(p.x,p.y+.35,p.z);
 pickup.mesh.scaling.setAll(1);
 pickup.available=true;pickup.holder=null;fighter.heldWeapon=null;
 return pickup;
}

function projectileFlash({BABYLON,scene,definition,from,to}){
 const projectile=BABYLON.MeshBuilder.CreateSphere(`shot-${definition.id}`,{diameter:definition.id==='cartoon-bazooka'?.42:.22,segments:8},scene);
 projectile.material=makeMaterial(BABYLON,scene,`shot-${definition.id}-mat`,definition.colour);
 projectile.position.copyFromFloats(from.x,from.y+1.05,from.z);
 const target=new BABYLON.Vector3(to.x,to.y+.85,to.z),start=projectile.position.clone();
 let frame=0,frames=Math.max(4,Math.round(60*Math.hypot(to.x-from.x,to.z-from.z)/definition.projectileSpeed));
 const observer=scene.onBeforeRenderObservable.add(()=>{
  frame++;projectile.position=BABYLON.Vector3.Lerp(start,target,Math.min(1,frame/frames));
  if(frame>=frames){scene.onBeforeRenderObservable.remove(observer);projectile.material?.dispose();projectile.dispose();}
 });
}

export function throwHeldWeapon({BABYLON,scene,attacker,target,maxRange=7}){
 const pickup=attacker?.heldWeapon;if(!pickup||!attacker.alive)return{used:false,hit:false};
 const weapon=pickup.definition,start=attacker.body.translation(),targetPos=target?.body?.translation?.()||{x:start.x,z:start.z+4,y:start.y};
 const dx=targetPos.x-start.x,dz=targetPos.z-start.z,dist=Math.hypot(dx,dz)||.001,travel=Math.min(maxRange,Math.max(3,dist));
 const nx=dx/dist,nz=dz/dist,end={x:start.x+nx*travel,y:Math.max(.55,start.y),z:start.z+nz*travel};
 pickup.mesh.setParent(null,true);pickup.mesh.scaling.setAll(1);pickup.mesh.position.set(start.x,start.y+1,start.z);pickup.holder=null;pickup.available=false;attacker.heldWeapon=null;
 const hit=Boolean(target?.alive&&dist<=maxRange),damage=Math.max(3,Math.round(weapon.damage*.75)),force=Math.max(4,weapon.knockback*1.05);
 if(hit)target.applyDamage(damage,{x:nx*force,y:3.2,z:nz*force});
 const from=pickup.mesh.position.clone(),to=new BABYLON.Vector3(end.x,end.y+.3,end.z);let frame=0,frames=Math.max(10,Math.round(travel*5));
 const observer=scene.onBeforeRenderObservable.add(()=>{
  frame++;const t=Math.min(1,frame/frames),p=BABYLON.Vector3.Lerp(from,to,t);p.y+=Math.sin(Math.PI*t)*1.6;pickup.mesh.position.copyFrom(p);pickup.mesh.rotation.x+=.22;pickup.mesh.rotation.z+=.16;
  if(frame>=frames){scene.onBeforeRenderObservable.remove(observer);pickup.mesh.position.copyFrom(to);pickup.available=true;pickup.mesh.rotation.set(0,pickup.mesh.rotation.y,0);}
 });
 return{used:true,hit,weapon};
}

export function useHeldWeapon({BABYLON,scene,attacker,target}){
 const pickup=attacker?.heldWeapon;if(!pickup||!attacker.alive||!target?.alive)return{used:false,hit:false};
 const weapon=pickup.definition;if(attacker.attackCooldown>0)return{used:false,hit:false};
 const a=attacker.body.translation(),b=target.body.translation();
 const dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz)||.001;
 const maxRange=weapon.class==='ranged'?14:weapon.class==='heavy'?2.8:2.65;
 attacker.attackCooldown=weapon.cooldown;
 if(weapon.class==='ranged'){
  if((pickup.ammo??0)<=0){dropHeldWeapon(attacker);return{used:true,hit:false,depleted:true};}
  pickup.ammo--;projectileFlash({BABYLON,scene,definition:weapon,from:a,to:b});
 }
 const hit=dist<=maxRange;
 if(hit){
  const force=weapon.knockback;
  target.applyDamage(weapon.damage,{x:dx/dist*force,y:weapon.class==='heavy'?3.5:2.7,z:dz/dist*force});
 }
 const depleted=weapon.class==='ranged'&&pickup.ammo<=0;
 if(depleted)dropHeldWeapon(attacker,{x:a.x+.7,y:a.y,z:a.z+.3});
 return{used:true,hit,depleted,weapon};
}