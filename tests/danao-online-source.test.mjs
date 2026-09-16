import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));

const online=[
 'unity/danao/Assets/Danao/Plugins/WebGL/DanaoWebSocket.jslib',
 'unity/danao/Assets/Danao/Runtime/Online/IOnlineSocket.cs',
 'unity/danao/Assets/Danao/Runtime/Online/WebGlSocket.cs',
 'unity/danao/Assets/Danao/Runtime/Online/DesktopSocket.cs',
 'unity/danao/Assets/Danao/Runtime/Online/OnlineProtocol.cs',
 'unity/danao/Assets/Danao/Runtime/Online/DanaoRoomClient.cs',
 'unity/danao/Assets/Danao/Runtime/Online/NetworkSnapshot.cs',
 'unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs',
 'unity/danao/Assets/Danao/Runtime/Save/DanaoProfile.cs',
 'unity/danao/Assets/Danao/Runtime/Save/DanaoSaveService.cs'
];

test('Unity Danao has WebGL and desktop online transports',()=>{
 for(const rel of online) assert.ok(exists(rel),`missing ${rel}`);
 assert.match(read(online[0]),/WebSocket/);
 assert.match(read(online[2]),/DllImport\("__Internal"\)/);
 assert.match(read(online[3]),/ClientWebSocket/);
});

test('room client uses dedicated Danao APIs and never puts the room pass in invites',()=>{
 const c=read('unity/danao/Assets/Danao/Runtime/Online/DanaoRoomClient.cs');
 assert.match(c,/\/api\/danao\/create/);
 assert.match(c,/\/api\/danao\/join/);
 assert.match(c,/\/api\/danao\//);
 assert.match(c,/InviteUrl/);
 assert.doesNotMatch(c,/InviteUrl[^\n]*token/i);
});

test('network bridge sends bounded host snapshots and non-host input frames',()=>{
 const b=read('unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs');
 const health=read('unity/danao/Assets/Danao/Runtime/Combat/FighterHealth.cs');
 assert.match(b,/SendInput/);
 assert.match(b,/SendHostState/);
 assert.match(b,/SnapshotReceived/);
 assert.match(b,/15f|20f/);
 assert.match(health,/ApplyNetworkState/);
});

test('non-host input traffic is rate-limited instead of sending every render frame',()=>{
 const b=read('unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs');
 assert.match(b,/InputRate\s*=\s*(30f|40f|45f|60f)/);
 assert.match(b,/_nextInput/);
 assert.match(b,/Time\.unscaledTime\s*<\s*_nextInput/);
 assert.match(b,/_nextInput\s*=\s*Time\.unscaledTime\s*\+\s*1f\s*\/\s*InputRate/);
});

test('save service keeps local saves independent from cloud availability',()=>{
 const s=read('unity/danao/Assets/Danao/Runtime/Save/DanaoSaveService.cs');
 assert.match(s,/PlayerPrefs/);
 assert.match(s,/\/api\/public\/session/);
 assert.match(s,/\/api\/danao\/profile/);
 assert.match(s,/409/);
 assert.match(s,/CaptureMatch/);
 assert.match(s,/CaptureOnlineRoom/);
});

test('game and arcade UI expose online play without replacing local couch play',()=>{
 const game=read('unity/danao/Assets/Danao/Runtime/DanaoGame.cs');
 const ui=read('unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs');
 assert.match(game,/DanaoRoomClient/);
 assert.match(game,/DanaoSaveService/);
 assert.match(game,/StartOnlineMatch/);
 assert.match(game,/NetworkMatchBridge/);
 assert.match(ui,/ONLINE PLAY/);
 assert.match(ui,/CREATE ROOM/);
 assert.match(ui,/JOIN ROOM/);
 assert.match(ui,/ROOM CODE/);
 assert.match(ui,/LOCAL PLAY/);
 assert.match(ui,/ApplyProfile/);
 assert.match(ui,/ProfileChanged/);
});

test('online objectives use stable network slots even after a player leaves and slots are sparse',()=>{
 const game=read('unity/danao/Assets/Danao/Runtime/DanaoGame.cs');
 const localMatch=read('unity/danao/Assets/Danao/Runtime/Core/LocalMatch.cs');
 const objective=read('unity/danao/Assets/Danao/Runtime/Objectives/ObjectiveController.cs');
 const bomb=read('unity/danao/Assets/Danao/Runtime/Objectives/HotBombObjective.cs');
 const king=read('unity/danao/Assets/Danao/Runtime/Objectives/KingOfRingObjective.cs');
 const heist=read('unity/danao/Assets/Danao/Runtime/Objectives/HeistObjective.cs');
 assert.match(game,/SpawnPoints\[p\.id\]/);
 assert.match(localMatch,/new Vector3\[4\]/);
 assert.match(localMatch,/fighter\.Slot\s*>=\s*arena\.SpawnPoints\.Count/);
 assert.match(localMatch,/_spawns\[fighter\.Slot\]\s*=\s*arena\.SpawnPoints\[fighter\.Slot\]/);
 assert.match(localMatch,/ResetFighter\(_spawns\[_fighters\[i\]\.Slot\]\)/);
 assert.match(objective,/FighterForSlot/);
 assert.match(bomb,/Fighters\[0\]\.Slot/);
 assert.match(bomb,/FighterForSlot\(_holder\)/);
 assert.match(king,/Fighters\[i\]\.Slot/);
 assert.match(heist,/_carrier\s*=\s*Fighters\[i\]\.Slot/);
});

test('party objectives are host-authoritative and survive snapshots and host transfer',()=>{
 const objective=read('unity/danao/Assets/Danao/Runtime/Objectives/ObjectiveController.cs');
 const localMatch=read('unity/danao/Assets/Danao/Runtime/Core/LocalMatch.cs');
 const snapshot=read('unity/danao/Assets/Danao/Runtime/Online/NetworkSnapshot.cs');
 const bridge=read('unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs');
 const mango=read('unity/danao/Assets/Danao/Runtime/Objectives/MangoGrabObjective.cs');
 const bomb=read('unity/danao/Assets/Danao/Runtime/Objectives/HotBombObjective.cs');
 const king=read('unity/danao/Assets/Danao/Runtime/Objectives/KingOfRingObjective.cs');
 const heist=read('unity/danao/Assets/Danao/Runtime/Objectives/HeistObjective.cs');
 assert.match(objective,/ObjectiveNetworkState/);
 assert.match(objective,/SimulationAuthority/);
 assert.match(localMatch,/CaptureObjectiveState/);
 assert.match(localMatch,/ApplyObjectiveState/);
 assert.match(localMatch,/SetSimulationAuthority/);
 assert.match(snapshot,/objectiveState/);
 assert.match(bridge,/CaptureObjectiveState/);
 assert.match(bridge,/ApplyObjectiveState/);
 for(const source of [mango,bomb,king,heist])assert.match(source,/SimulationAuthority/);
});

test('online results carry individual and team winners instead of guessing from survivors',()=>{
 const objective=read('unity/danao/Assets/Danao/Runtime/Objectives/ObjectiveController.cs');
 const localMatch=read('unity/danao/Assets/Danao/Runtime/Core/LocalMatch.cs');
 const protocol=read('unity/danao/Assets/Danao/Runtime/Online/OnlineProtocol.cs');
 const game=read('unity/danao/Assets/Danao/Runtime/DanaoGame.cs');
 assert.match(objective,/WinnerSlot/);
 assert.match(localMatch,/WinnerSlot/);
 assert.match(localMatch,/WinnerTeam/);
 assert.match(protocol,/winnerTeam/);
 assert.match(game,/winner\s*=\s*_match\.WinnerSlot/);
 assert.match(game,/winnerTeam\s*=\s*_match\.WinnerTeam/);
 assert.match(game,/DidLocalPlayerWin/);
});

test('host snapshots include the weapon currently carried by each fighter',()=>{
 const fighter=read('unity/danao/Assets/Danao/Runtime/Fighters/FighterController.cs');
 const snapshot=read('unity/danao/Assets/Danao/Runtime/Online/NetworkSnapshot.cs');
 assert.match(fighter,/public\s+FighterCombat\s+Combat/);
 assert.match(snapshot,/weaponId\s*=\s*fighter\.Combat/);
 assert.match(snapshot,/Held/);
 assert.match(snapshot,/Definition\.Kind/);
});

test('non-host clients predict movement but do not author combat damage or projectiles',()=>{
 const fighter=read('unity/danao/Assets/Danao/Runtime/Fighters/FighterController.cs');
 const bridge=read('unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs');
 assert.match(fighter,/CombatAuthority/);
 assert.match(fighter,/SetCombatAuthority/);
 assert.match(fighter,/if\s*\(_combatAuthority\)/);
 assert.match(bridge,/SetCombatAuthority\(_isHost\)/);
});

test('non-host clients cannot author HP or arena hazard forces',()=>{
 const health=read('unity/danao/Assets/Danao/Runtime/Combat/FighterHealth.cs');
 const hazards=read('unity/danao/Assets/Danao/Runtime/Arenas/ArenaHazards.cs');
 const wrestling=read('unity/danao/Assets/Danao/Runtime/Arenas/WrestlingArena.cs');
 const bridge=read('unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs');
 assert.match(health,/DamageAuthority/);
 assert.match(health,/SetDamageAuthority/);
 assert.match(health,/if\s*\(!_damageAuthority\)\s*return/);
 assert.match(hazards,/SimulationAuthority/);
 assert.match(wrestling,/SimulationAuthority/);
 assert.match(bridge,/SetDamageAuthority\(_isHost\)/);
 assert.match(bridge,/SetArenaAuthority/);
});
