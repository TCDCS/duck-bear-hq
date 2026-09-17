import test from 'node:test';
import assert from 'node:assert/strict';
import {hazardRule} from '../public/games/danao/hazards.mjs';
import {tickArenaHazard,captureHazardState,hydrateHazardState} from '../public/games/danao/hazard-runtime.mjs';

function fighter(slot,{x=0,y=1,z=0,vx=0,vy=0,vz=0}={}){
 let pos={x,y,z},vel={x:vx,y:vy,z:vz};
 const damage=[],impulses=[];
 return{
  slot,alive:true,damage,impulses,
  body:{translation:()=>({...pos}),linvel:()=>({...vel}),setLinvel:value=>{vel={...value};},applyImpulse:value=>{impulses.push({...value});vel={x:vel.x+value.x,y:vel.y+value.y,z:vel.z+value.z};}},
  applyDamage:(amount,impulse)=>{damage.push(amount);if(impulse){impulses.push({...impulse});vel={x:vel.x+impulse.x,y:vel.y+impulse.y,z:vel.z+impulse.z};}},
  position:value=>{pos={...value};},velocity:()=>({...vel})
 };
}
function active(arenaId,fighters,{online=false,isHost=true,enabled=true}={}){
 return{arenaDef:{id:arenaId},fighters,online,isHost,hazardEnabled:enabled,hazardState:{kind:null,rule:hazardRule(arenaId),clock:0,nextPulse:0,nextContact:0,ropeCooldown:{},ropeTouch:{}}};
}
function assignKind(state,kind){state.hazardState.kind=kind;return state;}

test('online clients animate hazard time but cannot author hazard physics',()=>{
 const f=fighter(0,{x:0,y:1,z:0});const state=assignKind(active('cruise-ship',[f],{online:true,isHost:false}),'ShipSway');
 tickArenaHazard(state,.16);
 assert.equal(state.hazardState.clock,.16);
 assert.deepEqual(f.velocity(),{x:0,y:0,z:0});
 state.isHost=true;tickArenaHazard(state,.16);
 assert.notEqual(f.velocity().x,0);
});

test('contact hazards apply the Unity damage only on the authority',()=>{
 const f=fighter(0,{x:.13,y:2.21,z:0});const state=assignKind(active('dublin-docks',[f]),'CraneHook');
 tickArenaHazard(state,1/60);
 assert.deepEqual(f.damage,[7]);
 assert.ok(state.hazardState.nextContact>.3);
});

test('wrestling rope bounce fires on entry and waits for a fresh contact',()=>{
 const f=fighter(0,{x:5.65,y:1.4,z:0});const state=assignKind(active('wrestling-arena',[f]),'WrestlingRopes');
 tickArenaHazard(state,1/60);assert.equal(f.impulses.length,1);
 tickArenaHazard(state,.2);assert.equal(f.impulses.length,1,'standing in a rope must not retrigger every tick');
 f.position({x:4,y:1.4,z:0});tickArenaHazard(state,.02);
 f.position({x:5.65,y:1.4,z:0});tickArenaHazard(state,.02);assert.equal(f.impulses.length,2);
});

test('hazard clock and cooldowns survive host-transfer snapshots',()=>{
 const source=assignKind(active('house-party',[]),'SpeakerPulse');source.hazardState.clock=4.2;source.hazardState.nextPulse=6.4;source.hazardState.nextContact=3;source.hazardState.ropeCooldown={2:5};
 const snap=captureHazardState(source);const target=assignKind(active('house-party',[]),'SpeakerPulse');hydrateHazardState(target,snap);
 assert.equal(target.hazardState.clock,4.2);assert.equal(target.hazardState.nextPulse,6.4);assert.deepEqual(target.hazardState.ropeCooldown,{2:5});
});
