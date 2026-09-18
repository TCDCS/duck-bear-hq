import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('rigged Hero uses a real skinned Quaternius female glTF with combat animations', () => {
  const rel = 'public/games/danao/assets/characters/hero-casual.gltf';
  assert.equal(fs.existsSync(path.join(root, rel)), true, 'missing rigged Hero glTF');
  const gltf = JSON.parse(read(rel));
  assert.ok((gltf.skins || []).length >= 1, 'Hero must contain a skeleton skin');
  assert.ok((gltf.skins?.[0]?.joints || []).length >= 50, 'Hero skeleton must be a real humanoid rig');
  const clips = new Set((gltf.animations || []).map((clip) => clip.name));
  for (const name of ['Idle', 'Run', 'Punch_Left', 'Punch_Right', 'HitRecieve', 'Roll']) {
    assert.equal(clips.has(name), true, `missing Hero animation ${name}`);
  }
});

test('rigged Hero asset keeps Quaternius CC0 provenance in the Danao tree', () => {
  const notice = read('public/games/danao/assets/characters/QUATERNIUS-ULTIMATE-MODULAR-WOMEN-LICENSE.txt');
  assert.match(notice, /CC0|Creative Commons Zero/i);
  const credits = read('public/games/danao/assets/characters/ASSETS.md');
  assert.match(credits, /Quaternius/);
  assert.match(credits, /Ultimate Modular Women/);
  assert.match(credits, /Casual\.gltf/);
});

test('Babylon runtime loads glTF support before rigged Danao fighter assets', () => {
  const deps = read('public/games/danao/src/game/dependencies.js');
  assert.match(deps, /BABYLON_LOADERS_URLS/);
  assert.match(deps, /babylonjs-loaders@9\.26\.2/);
  const runtime = read('public/games/danao/src/game/runtime.js');
  assert.match(runtime, /loadBabylonLoaders/);
  assert.match(runtime, /upgradeRiggedFighters/);
  assert.match(runtime, /syncRiggedFighterAnimation/);
});

test('rigged Hero integration hides the primitive anatomy but preserves Danao physics root and held anchor', () => {
  const assets = read('public/games/danao/src/game/rigged-fighters.js');
  for (const marker of [
    'hero-casual.gltf',
    'primitiveParts',
    'heldAnchor',
    'ImportMeshAsync',
    "'Idle'",
    "'Run'",
    "'Punch_Left'",
    "'Punch_Right'",
    "'HitRecieve'",
    "'Roll'",
  ]) assert.ok(assets.includes(marker), marker);
  assert.match(assets, /rigRoot\.scaling\.setAll\(1\.4\)/);
  assert.match(assets, /rigRoot\.position\.y\s*=\s*-1\.17/);
});
