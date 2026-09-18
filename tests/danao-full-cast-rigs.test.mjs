import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('full cast vendors shared male and accessory rigs plus a real animated Mulan dog', () => {
  const files = [
    'public/games/danao/assets/characters/cast/male/male.gltf',
    'public/games/danao/assets/characters/cast/male/male.bin',
    'public/games/danao/assets/characters/cast/male/male-eye-brown.png',
    'public/games/danao/assets/characters/cast/hair/parted.glb',
    'public/games/danao/assets/characters/cast/hair/buzzed.glb',
    'public/games/danao/assets/characters/cast/hair/buzzed-female.glb',
    'public/games/danao/assets/characters/cast/hair/long.glb',
    'public/games/danao/assets/characters/cast/hair/beard.glb',
    'public/games/danao/assets/characters/cast/mulan/mulan-dog.glb',
  ];
  for (const rel of files) assert.equal(fs.existsSync(path.join(root, rel)), true, rel);
  assert.ok(fs.statSync(path.join(root, files[1])).size > 650_000);
  assert.ok(fs.statSync(path.join(root, files[8])).size > 450_000);
});

test('male shared glTF is local and stripped to lightweight toon materials', () => {
  const gltf = JSON.parse(read('public/games/danao/assets/characters/cast/male/male.gltf'));
  assert.equal(gltf.buffers[0].uri, 'male.bin');
  assert.deepEqual(gltf.images.map((image) => image.uri), ['male-eye-brown.png']);
  assert.equal(gltf.materials.length, 3);
  assert.equal(gltf.materials[2].name, 'Danao_Male_Body');
  assert.equal(gltf.materials[2].normalTexture, undefined);
  assert.equal(gltf.materials[2].pbrMetallicRoughness.metallicRoughnessTexture, undefined);
});

test('cast loader maps every established Mango fighter to a real render rig', () => {
  const source = read('public/games/danao/src/art/cast-models.js');
  for (const fighter of ['hero', 'stephen', 'zachary', 'mulan', 'gaby', 'sara', 'mum', 'dad']) {
    assert.match(source, new RegExp(`\\b${fighter}:\\s*Object\\.freeze`), fighter);
  }
  for (const marker of [
    'mountCastRenderModel',
    'mountMulanDogModel',
    'Superhero_Male',
    'Superhero_Female',
    'ShibaInu',
    'AnimalArmature|Idle',
    'AnimalArmature|Gallop',
    'AnimalArmature|Attack',
    'parted.glb',
    'buzzed.glb',
    'long.glb',
    'beard.glb',
  ]) assert.ok(source.includes(marker), marker);
});

test('packaged visuals replace procedural anatomy for every fighter after its real rig loads', () => {
  const visuals = read('public/games/danao/src/game/visuals.js');
  assert.match(visuals, /mountCastRenderModel/);
  assert.match(visuals, /mountMulanDogModel/);
  assert.match(visuals, /proceduralBaseMeshes/);
  assert.match(visuals, /root\.metadata\.castRig/);
  assert.match(visuals, /style\.id === 'mulan'/);
  assert.match(visuals, /setEnabled\?\.\(false\)/);
});

test('packaged runtime drives every real rig from the existing Danao pose model', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  assert.match(runtime, /parts\.castRig\?\.applyPose/);
  for (const marker of ['pose.stride', 'pose.punch', 'pose.recoil', 'pose.dodgeLean', 'pose.jumpTuck', 'fighter.attackKind']) {
    assert.ok(runtime.includes(marker), marker);
  }
});

test('visual QA requires the four default fight slots to use real rigs', () => {
  const workflow = read('.github/workflows/danao-visual-qa.yml');
  for (const marker of [
    'cast-rig-stephen',
    'cast-rig-zachary',
    'cast-rig-mulan',
    'allDefaultRigsLoaded',
    'proceduralStephenEnabled',
    'proceduralZacharyEnabled',
    'proceduralMulanEnabled',
  ]) assert.ok(workflow.includes(marker), marker);
});

test('full-cast release patches remain reproducible through the Danao assembler', () => {
  const assembler = read('scripts/assemble-danao-v05.mjs');
  assert.match(assembler, /patchDanaoFullCastVisuals/);
  assert.match(assembler, /patchDanaoFullCastRuntime/);
  assert.match(assembler, /danao-full-cast-visual-patch\.mjs/);
  assert.match(assembler, /danao-full-cast-runtime-patch\.mjs/);
});
