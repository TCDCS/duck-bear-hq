// Visual correction regression coverage for the real-rig browser build.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('real human rigs lower their arms into the arcade guard instead of a raised T-pose', () => {
  for (const rel of [
    'public/games/danao/src/art/hero-model.js',
    'public/games/danao/src/art/cast-models.js',
  ]) {
    const source = read(rel);
    assert.match(source, /const armDrop = -1\.04;/, rel);
    assert.doesNotMatch(source, /const armDrop = 1\.04;/, rel);
  }
});

test('party camera stays close enough to read the fighters in Checkout Chaos', async () => {
  const { cameraFrameForPoints } = await import('../public/games/danao/src/game/runtimeMath.js');
  const frame = cameraFrameForPoints([
    { x: -7.2, z: -5.5 },
    { x: 7.2, z: -5.5 },
    { x: -7.2, z: 5.0 },
    { x: 7.2, z: 5.0 },
  ]);
  assert.deepEqual(frame.center, { x: 0, z: -0.25 });
  assert.ok(frame.distance >= 10);
  assert.ok(frame.distance < 18, `camera too distant: ${frame.distance}`);

  const clustered = cameraFrameForPoints([{ x: -1, z: -1 }, { x: 1, z: 1 }]);
  assert.equal(clustered.distance, 11.8);
});

test('online launcher is hidden for active local and online fights', () => {
  const source = read('public/games/danao/src/main.js');
  assert.match(source, /onlineRoot\.hidden = true;/);
  assert.match(source, /onlineRoot\.hidden = false;/);
  assert.ok(source.indexOf('onlineRoot.hidden = true;') < source.indexOf('await runtime.startMatch'));
});

test('presentation correction is released as Danao 0.10.3', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  assert.equal(release.version, '0.10.3');
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
