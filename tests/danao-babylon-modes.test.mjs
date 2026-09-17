import test from 'node:test';
import assert from 'node:assert/strict';

const modes=await import('../public/games/danao/modes.mjs');
const {
 MODE_RULES,OBJECTIVE_RULES,normaliseModeKind,onlineModeKind,createModeState,resolveElimination,
 collectMango,tickKingOfRing,passHotBomb,tickHotBomb,tickHeist
}=modes;

const fighter=(slot,{alive=true,x=0,z=0,team=slot%2}={})=>({slot,alive,x,z,team});

test('browser mode rules preserve all eight Danao launch modes',()=>{
 assert.deepEqual(Object.keys(MODE_RULES),['OneVsOne','TwoVsTwo','FreeForAll','RoyalRumble','MangoGrab','HotBomb','KingOfRing','Heist']);
 for(const kind of ['OneVsOne','TwoVsTwo','FreeForAll','RoyalRumble'])assert.equal(MODE_RULES[kind].elimination,true,kind);
 for(const kind of ['MangoGrab','HotBomb','KingOfRing','Heist']){
  assert.equal(MODE_RULES[kind].objective,true,kind);
  assert.equal(MODE_RULES[kind].respawnSeconds,2.2,kind);
 }
 assert.equal(MODE_RULES.TwoVsTwo.teams,true);
 assert.equal(MODE_RULES.RoyalRumble.ringOut,true);
});

test('King of the Ring keeps Unity local/save naming while translating the online protocol name',()=>{
 assert.equal(normaliseModeKind('KingOfRing'),'KingOfRing');
 assert.equal(normaliseModeKind('KingOfTheRing'),'KingOfRing');
 assert.equal(normaliseModeKind('TeamKnockout'),'TwoVsTwo');
 assert.equal(onlineModeKind('KingOfRing'),'KingOfTheRing');
 assert.equal(onlineModeKind('TwoVsTwo'),'TwoVsTwo');
 assert.equal(createModeState('KingOfTheRing',[0,1]).kind,'KingOfRing');
});

test('browser objective targets match the Unity rules exactly',()=>{
 assert.deepEqual(OBJECTIVE_RULES,{
  mangoTarget:10,
  kingTargetSeconds:30,
  kingRadius:3.1,
  heistTarget:3,
  hotBombTarget:3,
  hotBombSeconds:8,
  heistPickupRadius:1.2,
  heistHomeRadius:1.6
 });
});

test('elimination resolves individual and team winners without guessing',()=>{
 assert.deepEqual(resolveElimination('OneVsOne',[fighter(0),fighter(1,{alive:false})]),{finished:true,winnerSlot:0,winnerTeam:-1});
 assert.deepEqual(resolveElimination('FreeForAll',[fighter(0,{alive:false}),fighter(1),fighter(2,{alive:false})]),{finished:true,winnerSlot:1,winnerTeam:-1});
 assert.deepEqual(resolveElimination('TwoVsTwo',[fighter(0),fighter(1,{alive:false}),fighter(2),fighter(3,{alive:false})]),{finished:true,winnerSlot:-1,winnerTeam:0});
 assert.equal(resolveElimination('TwoVsTwo',[fighter(0),fighter(1),fighter(2,{alive:false}),fighter(3,{alive:false})]).finished,false);
});

test('Mango Grab scores to ten and reports the winning slot',()=>{
 const state=createModeState('MangoGrab',[0,1]);
 for(let i=0;i<9;i++)collectMango(state,1);
 assert.equal(state.finished,false);
 collectMango(state,1);
 assert.equal(state.scores[1],10);
 assert.equal(state.finished,true);
 assert.equal(state.winnerSlot,1);
});

test('King of the Ring only counts uncontested centre time',()=>{
 const state=createModeState('KingOfRing',[0,1]);
 tickKingOfRing(state,[fighter(0,{x:0,z:0}),fighter(1,{x:8,z:0})],12);
 assert.equal(state.seconds[0],12);
 tickKingOfRing(state,[fighter(0,{x:0,z:0}),fighter(1,{x:1,z:0})],10);
 assert.equal(state.seconds[0],12,'contested centre must not score');
 tickKingOfRing(state,[fighter(0,{x:0,z:0}),fighter(1,{x:8,z:0})],18);
 assert.equal(state.finished,true);
 assert.equal(state.winnerSlot,0);
});

test('Hot Bomb passes on a holder hit and awards explosion points to the next alive fighter',()=>{
 const state=createModeState('HotBomb',[0,1,2]);
 assert.equal(state.holder,0);
 passHotBomb(state,0,2);
 assert.equal(state.holder,2);
 assert.ok(state.timer>=2.5);
 tickHotBomb(state,[fighter(0),fighter(1),fighter(2)],9);
 assert.equal(state.scores[0],1,'next alive slot wraps from holder two to slot zero');
 assert.equal(state.holder,0);
 assert.equal(state.timer,8);
});

test('Heist picks up centre loot and scores only after returning it home',()=>{
 const state=createModeState('Heist',[0,1],{loot:{x:0,z:0},homes:{0:{x:-5,z:0},1:{x:5,z:0}}});
 tickHeist(state,[fighter(0,{x:0.5,z:0}),fighter(1,{x:5,z:0})]);
 assert.equal(state.carrier,0);
 tickHeist(state,[fighter(0,{x:-4.2,z:0}),fighter(1,{x:5,z:0})]);
 assert.equal(state.scores[0],1);
 assert.equal(state.carrier,-1);
 assert.deepEqual(state.loot,{x:0,z:0});
});
