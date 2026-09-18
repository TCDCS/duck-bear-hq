import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('real Hero benchmark vendors the Quaternius female rig and lightweight support assets', () => {
  const files = [
    'public/games/danao/assets/characters/hero/hero-female.gltf',
    'public/games/danao/assets/characters/hero/hero-female.bin',
    'public/games/danao/assets/characters/hero/hero-eye-brown.png',
    'public/games/danao/assets/characters/hero/hero-hair-buns.glb',
    'public/games/danao/assets/licenses/QUATERNIUS-CC0.txt',
  ];
  for (const rel of files) assert.equal(fs.existsSync(path.join(root, rel)), true, rel);
  assert.ok(fs.statSync(path.join(root, files[1])).size > 900_000);
  assert.ok(fs.statSync(path.join(root, files[3])).size > 250_000);
  assert.match(read(files[4]), /CC0 1\.0 Universal/);
});

test('Hero source glTF is stripped to lightweight toon materials and local files only', () => {
  const gltf = JSON.parse(read('public/games/danao/assets/characters/hero/hero-female.gltf'));
  assert.equal(gltf.buffers[0].uri, 'hero-female.bin');
  assert.deepEqual(gltf.images.map((image) => image.uri), ['hero-eye-brown.png']);
  assert.equal(gltf.materials.length, 3);
  assert.equal(gltf.materials[2].name, 'Danao_Hero_Body');
  assert.equal(gltf.materials[2].normalTexture, undefined);
  assert.equal(gltf.materials[2].pbrMetallicRoughness.metallicRoughnessTexture, undefined);
});

test('Hero render loader uses a real skinned model with local fallback-safe GLTF loading', () => {
  const rel = 'public/games/danao/src/art/hero-model.js';
  assert.equal(fs.existsSync(path.join(root, rel)), true);
  const source = read(rel);
  for (const marker of [
    'mountHeroRenderModel',
    'babylonjs-loaders',
    'hero-female.gltf',
    'hero-hair-buns.glb',
    'Superhero_Female',
    'Hair_Buns',
    'VertexBuffer.ColorKind',
    'upperarm_l',
    'upperarm_r',
    'thigh_l',
    'thigh_r',
    'applyPose',
  ]) assert.ok(source.includes(marker), marker);
});

test('packaged visuals load the real Hero model and hide procedural geometry only after success', () => {
  const visuals = read('public/games/danao/src/game/visuals.js');
  assert.match(visuals, /mountHeroRenderModel/);
  assert.match(visuals, /proceduralHeroMeshes/);
  assert.match(visuals, /heroRig/);
  assert.match(visuals, /setEnabled\?\.\(false\)/);
  assert.match(visuals, /\.then\(\(heroRig\)/);
});

test('packaged runtime drives the skinned Hero rig from the existing combat pose model', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  assert.match(runtime, /parts\.heroRig\?\.applyPose/);
  for (const marker of ['stride', 'pose.punch', 'pose.recoil', 'pose.dodgeLean', 'pose.jumpTuck', 'fighter.attackKind']) {
    assert.ok(runtime.includes(marker), marker);
  }
});

test('real-character release patches remain reproducible through the Danao assembler', () => {
  const assembler = read('scripts/assemble-danao-v05.mjs');
  assert.match(assembler, /patchDanaoRealCharacterVisuals/);
  assert.match(assembler, /patchDanaoRealCharacterRuntime/);
  assert.match(assembler, /danao-real-character-visual-patch\.mjs/);
  assert.match(assembler, /danao-real-character-runtime-patch\.mjs/);
});
