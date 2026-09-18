import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('v0.10.11 detailed environment reaction profiles are visual-only and bounded', async () => {
  const { environmentDetailProfile, environmentDetailMarker } =
    await import('../public/games/danao/src/art/environment-props.js');

  assert.deepEqual(environmentDetailProfile({ arenaId: 'ring', type: 'pickup' }), {
    arenaId: 'ring',
    strength: 0,
    radius: 0,
  });
  assert.equal(environmentDetailProfile({ arenaId: 'courtyard', type: 'heavy-hit' }).strength, 1);
  assert.equal(environmentDetailProfile({ arenaId: 'rooftop', type: 'prop-break' }).radius, 10.05);
  assert.equal(environmentDetailProfile({ arenaId: 'bad', type: 'ko' }).arenaId, 'courtyard');
  assert.equal(environmentDetailMarker('ring'), 'danao-detail-trolley-frame');
  assert.equal(environmentDetailMarker('courtyard'), 'danao-detail-gong');
  assert.equal(environmentDetailMarker('rooftop'), 'danao-detail-rooftop-duct');
});

test('v0.10.11 adds distinct high-detail props to all three arenas', () => {
  const source = read('public/games/danao/src/art/environment-props.js');
  for (const marker of [
    'danao-detail-trolley-frame',
    'danao-detail-trolley-wheel',
    'danao-detail-checkout-screen',
    'danao-detail-produce-crate',
    'danao-detail-gong',
    'danao-detail-drum',
    'danao-detail-hanging-lantern',
    'danao-detail-stone-lion',
    'danao-detail-rooftop-duct',
    'danao-detail-rooftop-vent-slat',
    'danao-detail-rooftop-pipe',
    'danao-detail-rooftop-sign-light',
    'danao-detail-rooftop-aerial-bar',
    'danaoEnvironmentDetailReactionCount',
    'onBeforeRenderObservable',
  ]) assert.ok(source.includes(marker), marker);
});

test('v0.10.11 environment detail cannot alter physics combat scoring or online authority', () => {
  const source = read('public/games/danao/src/art/environment-props.js');
  for (const forbidden of [
    'RAPIER',
    'setLinvel',
    'setTranslation',
    'applyHit',
    'knockOut',
    'health =',
    'score =',
    'sendState',
    'setRemoteInput',
    'roomClient',
    'snapshot',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});

test('v0.10.11 main presents detailed prop reactions for local and relayed online feedback', () => {
  const main = read('public/games/danao/src/main.js');
  assert.match(main, /import \{ mountEnvironmentDetails \} from '.\/art\/environment-props\.js'/);
  assert.match(main, /environmentDetails\?\.onFeedback\?\.\(event\)/);
  assert.match(main, /environmentDetails = mountEnvironmentDetails\(B, scene, arenaId\)/);
  assert.ok((main.match(/environmentDetails = null/g) || []).length >= 4);
  assert.match(main, /environmentDetails\?\.dispose\?\.\(\)/);
});

test('detailed arena props remain part of Danao 0.10.11 and later releases', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  const [major, minor, patch] = release.version.split('.').map(Number);
  const numericVersion = major * 1_000_000 + minor * 1_000 + patch;
  assert.ok(numericVersion >= 10_011, release.version);
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
