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
  'unity/danao/Assets/Danao/Runtime/Arenas/WrestlingArena.cs',
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

test('health and presentation toggles are independent', () => {
  const settings = read('unity/danao/Assets/Danao/Runtime/Core/MatchSettings.cs');
  assert.match(settings, /StartingHp\s*=\s*100/);
  assert.match(settings, /HealthDamage\s*=\s*true/);
  assert.match(settings, /VisibleBruising\s*=\s*true/);
  assert.match(settings, /ArenaHazards\s*=\s*true/);
});

test('required local match types are represented', () => {
  const rules = read('unity/danao/Assets/Danao/Runtime/Core/MatchRules.cs');
  assert.match(rules, /OneVsOne/);
  assert.match(rules, /TwoVsTwo/);
  assert.match(rules, /FreeForAll/);
  assert.match(rules, /RoyalRumble/);
});

test('first playable has all eight representative weapons and sane damage', () => {
  const weapons = read('unity/danao/Assets/Danao/Runtime/Weapons/WeaponDefinition.cs');
  for (const name of ['BoxingGlove','FoldingChair','FryingPan','NoveltyFloppy','FoamBlaster','Bazooka','BowlingBall','WrestlingTable']) {
    assert.match(weapons, new RegExp(name));
  }
  const damageNumbers = [...weapons.matchAll(/New(?:Ranged)?\([^\n]*?,\s*(\d+)\s*,/g)].map(m => Number(m[1]));
  assert.ok(damageNumbers.length >= 8);
  assert.ok(damageNumbers.every(n => n > 0 && n < 100));
  assert.match(weapons, /Bazooka[^\n]*24/);
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
