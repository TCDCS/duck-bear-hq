import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const required = [
  'unity/danao/Packages/manifest.json',
  'unity/danao/ProjectSettings/ProjectVersion.txt',
  'unity/danao/Assets/Danao/Runtime/DanaoBootstrap.cs',
  'unity/danao/Assets/Danao/Runtime/DanaoGame.cs',
  'unity/danao/Assets/Danao/Runtime/Core/MatchSettings.cs',
  'unity/danao/Assets/Danao/Runtime/Core/MatchRules.cs',
  'unity/danao/Assets/Danao/Runtime/Fighters/FighterController.cs',
  'unity/danao/Assets/Danao/Runtime/Combat/FighterHealth.cs',
  'unity/danao/Assets/Danao/Runtime/Weapons/WeaponDefinition.cs',
  'unity/danao/Assets/Danao/Runtime/Arenas/ArenaCatalog.cs',
  'unity/danao/Assets/Danao/Runtime/Arenas/ArenaBuilder.cs',
  'unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs',
  'unity/danao/Assets/Danao/Runtime/Audio/ProceduralAudio.cs',
  'unity/danao/Assets/Danao/Editor/DanaoBuild.cs'
];

test('Unity 6 Danao project scaffold exists', () => {
  for (const rel of required) assert.ok(exists(rel), `missing ${rel}`);
  assert.match(read('unity/danao/ProjectSettings/ProjectVersion.txt'), /6000\.0\./);
  const manifest = JSON.parse(read('unity/danao/Packages/manifest.json'));
  assert.ok(manifest.dependencies['com.unity.inputsystem']);
  assert.ok(manifest.dependencies['com.unity.render-pipelines.universal']);
  assert.ok(manifest.dependencies['com.unity.test-framework']);
});

test('Unity Web Request built-in module is enabled for online and cloud save code', () => {
  const manifest = JSON.parse(read('unity/danao/Packages/manifest.json'));
  assert.equal(manifest.dependencies['com.unity.modules.unitywebrequest'], '1.0.0');
});

test('objective cleanup explicitly targets UnityEngine.Object in Unity 6', () => {
  const objective = read('unity/danao/Assets/Danao/Runtime/Objectives/ObjectiveController.cs');
  assert.match(objective, /UnityEngine\.Object\.Destroy\(go\)/);
});

test('health and presentation toggles are independent', () => {
  const settings = read('unity/danao/Assets/Danao/Runtime/Core/MatchSettings.cs');
  assert.match(settings, /StartingHp\s*=\s*100/);
  assert.match(settings, /HealthDamage\s*=\s*true/);
  assert.match(settings, /VisibleBruising\s*=\s*true/);
  assert.match(settings, /ArenaHazards\s*=\s*true/);
});

test('all launch match types are represented', () => {
  const rules = read('unity/danao/Assets/Danao/Runtime/Core/MatchRules.cs');
  for (const mode of ['OneVsOne','TwoVsTwo','FreeForAll','RoyalRumble','MangoGrab','HotBomb','KingOfRing','Heist']) {
    assert.match(rules, new RegExp(mode), `missing mode ${mode}`);
  }
});

test('full launch arena catalogue has all eleven themes', () => {
  const arenas = read('unity/danao/Assets/Danao/Runtime/Arenas/ArenaCatalog.cs');
  for (const id of ['DublinDocks','LondonUnderground','MangoMarket','TempleCourtyard','SichuanTeaHouse','IceFestival','HouseParty','ToyFactory','CruiseShip','MadCircus','WrestlingArena']) {
    assert.match(arenas, new RegExp(id), `missing arena ${id}`);
  }
  assert.match(arenas, /WeaponPool/);
});

test('full launch weapon catalogue has thirty-six formal weapons and props', () => {
  const weapons = read('unity/danao/Assets/Danao/Runtime/Weapons/WeaponDefinition.cs');
  const names = [
    'BoxingGlove','SpringBoxingGlove','InflatableHammer','RubberChicken','PoolNoodle','FryingPan','FoldingChair','Mop','Baguette','GiantFish','Umbrella','ToyGuitar','SillySausage','NoveltyFloppy',
    'FoamBlaster','WaterBlaster','SuctionCupLauncher','ConfettiCannon','BubbleCannon','TennisBallLauncher','MagnetGun','PlungerLauncher','PartyPopperBlaster','Bazooka',
    'BowlingBall','TrafficCone','Bin','Suitcase','Kettle','Cushion','FoamExtinguisher','Anvil','GiantMango','WrestlingTable','Speaker','ToyCrate'
  ];
  assert.equal(names.length, 36);
  for (const name of names) assert.match(weapons, new RegExp(name), `missing weapon ${name}`);
  assert.match(weapons, /Bazooka[^\n]*24/);
});

test('full cast and character selection contracts are present', () => {
  const chars = read('unity/danao/Assets/Danao/Runtime/Fighters/CharacterCatalog.cs');
  const ui = read('unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs');
  for (const name of ['Hero','Stephen','Zachary','Mulan','Gaby','Sara','Mum','Dad']) assert.match(chars, new RegExp(name));
  assert.match(ui, /Character/);
});

test('couch players deliberately join before match setup', () => {
  const ui = read('unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs');
  const input = read('unity/danao/Assets/Danao/Runtime/Input/LocalInputHub.cs');
  assert.match(ui, /ScreenState\s*\{[^}]*Join/s);
  assert.match(ui, /PRESS START/i);
  assert.match(input, /startButton\.wasPressedThisFrame/);
  assert.match(input, /JoinedCount/);
});

test('title, controller input, Web and Windows build targets are present', () => {
  const ui = read('unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs');
  const input = read('unity/danao/Assets/Danao/Runtime/Input/LocalInputHub.cs');
  const build = read('unity/danao/Assets/Danao/Editor/DanaoBuild.cs');
  assert.match(ui, /打闹/);
  assert.match(ui, /Dǎnào/);
  assert.match(input, /Gamepad\.all/);
  assert.match(build, /BuildTarget\.WebGL/);
  assert.match(build, /BuildTarget\.StandaloneWindows64/);
});

test('procedural audio contains no external media dependency', () => {
  const audio = read('unity/danao/Assets/Danao/Runtime/Audio/ProceduralAudio.cs');
  assert.match(audio, /AudioClip\.Create/);
  assert.match(audio, /Squeak/);
  assert.match(audio, /RocketBoom/);
  assert.doesNotMatch(audio, /Resources\.Load<\s*AudioClip/);
});
