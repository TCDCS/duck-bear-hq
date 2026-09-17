import test from 'node:test';
import assert from 'node:assert/strict';

const hazards=await import('../public/games/danao/hazards.mjs');
const {HAZARD_BY_ARENA,HAZARD_RULES,hazardPose,radialPulseEffects,environmentVelocityDelta,wrestlingRopeImpulse}=hazards;
const close=(actual,expected,epsilon=1e-6)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);

test('all eleven browser arenas keep their Unity hazard type',()=>{
 assert.deepEqual(HAZARD_BY_ARENA,{
  'dublin-docks':'CraneHook',
  'london-underground':'PassingTrain',
  'mango-market':'RollingFruit',
  'temple-courtyard':'GongPulse',
  'sichuan-tea-house':'SlidingScreens',
  'ice-festival':'IceSlip',
  'house-party':'SpeakerPulse',
  'toy-factory':'ConveyorPuncher',
  'cruise-ship':'ShipSway',
  'mad-circus':'CircusBounce',
  'wrestling-arena':'WrestlingRopes'
 });
});

test('contact hazard damage knockback and timing match Unity values',()=>{
 assert.deepEqual(HAZARD_RULES.CraneHook,{shape:'sphere',radius:1.1,damage:7,knockback:10,cooldown:.35});
 assert.deepEqual(HAZARD_RULES.PassingTrain,{shape:'box',half:[2.6,1.2,1.3],damage:13,knockback:14,cooldown:.4});
 assert.deepEqual(HAZARD_RULES.RollingFruit,{shape:'sphere',radius:1.25,damage:9,knockback:11,cooldown:.35});
 assert.deepEqual(HAZARD_RULES.SlidingScreens,{shape:'box',half:[.5,1.5,2.6],damage:8,knockback:10,cooldown:.4});
 assert.deepEqual(HAZARD_RULES.ConveyorPuncher,{shape:'box',half:[.8,.8,.8],damage:10,knockback:12,cooldown:.4});
 assert.deepEqual(HAZARD_RULES.WrestlingRopes,{knockback:5.5,up:.16,cooldown:.16});
});

test('animated hazard poses preserve the Unity motion formulas',()=>{
 let pose=hazardPose('dublin-docks',1);
 close(pose.x,Math.sin(1.15)*6);close(pose.y,2.2+Math.sin(2.3)*.35);close(pose.z,0);
 pose=hazardPose('london-underground',1);
 close(pose.x,((1*5+12)%24)-12);close(pose.y,1.2);close(pose.z,0);
 pose=hazardPose('mango-market',2);
 close(pose.x,Math.sin(1.6)*7);close(pose.y,1.2);close(pose.z,Math.cos(1.1)*4.5);
 pose=hazardPose('sichuan-tea-house',1);
 close(pose.x,Math.sin(1.25)*6);close(pose.y,1.5);close(pose.z,0);
 pose=hazardPose('toy-factory',1);
 close(pose.x,-6+5.5);close(pose.y,1.1);close(pose.z,0);
});

test('radial pulses use Unity falloff damage and knockback',()=>{
 const effects=radialPulseEffects([
  {slot:0,alive:true,x:0,y:1,z:3.8},
  {slot:1,alive:true,x:3.5,y:1,z:3.8},
  {slot:2,alive:true,x:9,y:1,z:3.8}
 ],{x:0,y:1,z:3.8},7,5,9);
 assert.equal(effects.length,2);
 assert.equal(effects[0].slot,0);assert.equal(effects[0].damage,5);close(effects[0].knockback,9);
 assert.equal(effects[1].slot,1);assert.equal(effects[1].damage,3);close(effects[1].knockback,4.5);
});

test('ice, conveyor, ship and circus environmental velocity changes match Unity',()=>{
 assert.deepEqual(environmentVelocityDelta('ice-festival',1,{x:0,z:0,vx:4,vz:-2}),{x:.1,y:0,z:-.05});
 assert.deepEqual(environmentVelocityDelta('toy-factory',1,{x:0,z:0,vx:0,vz:0}),{x:.11,y:0,z:0});
 assert.deepEqual(environmentVelocityDelta('toy-factory',1,{x:6,z:0,vx:0,vz:0}),{x:0,y:0,z:0});
 const sway=environmentVelocityDelta('cruise-ship',2,{x:0,z:0,vx:0,vz:0});close(sway.x,Math.sin(1.8)*.42);close(sway.y,0);close(sway.z,0);
 assert.deepEqual(environmentVelocityDelta('mad-circus',1,{x:1,z:1,vx:0,vz:0}),{x:0,y:.75,z:0});
 assert.deepEqual(environmentVelocityDelta('mad-circus',1,{x:3,z:0,vx:0,vz:0}),{x:0,y:0,z:0});
});

test('wrestling ropes kick inward with the Unity upward bias',()=>{
 const east=wrestlingRopeImpulse({x:5.65,y:2,z:0});
 assert.ok(east.x<0);assert.ok(east.y>0);close(Math.hypot(east.x,east.y,east.z),5.5);
 const north=wrestlingRopeImpulse({x:0,y:2,z:5.65});
 assert.ok(north.z<0);assert.ok(north.y>0);close(Math.hypot(north.x,north.y,north.z),5.5);
 assert.equal(wrestlingRopeImpulse({x:0,y:2,z:0}),null);
});
