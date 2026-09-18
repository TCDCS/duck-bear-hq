import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('v0.10.12 environment wear profiles escalate only from combat-scale events', async () => {
  const { environmentWearProfile, environmentWearMarker } =
    await import('../public/games/danao/src/art/environment-wear.js');

  assert.deepEqual(environmentWearProfile({ arenaId: 'ring', type: 'pickup' }), {
    arenaId: 'ring',
    severity: 0,
    breakState: 0,
  });
  assert.deepEqual(environmentWearProfile({ arenaId: 'courtyard', type: 'heavy-hit' }), {
    arenaId: 'courtyard',
    severity: 2,
    breakState: 0,
  });
  assert.deepEqual(environmentWearProfile({ arenaId: 'rooftop', type: 'prop-break' }), {
    arenaId: 'rooftop',
    severity: 3,
    breakState: 3,
  });
  assert.equal(environmentWearProfile({ arenaId: 'bad', type: 'ko' }).arenaId, 'courtyard');
  assert.equal(environmentWearMarker('ring'), 'danao-wear-ring-dent');
  assert.equal(environmentWearMarker('courtyard'), 'danao-wear-courtyard-crack');
  assert.equal(environmentWearMarker('rooftop'), 'danao-wear-rooftop-spark');
});

test('v0.10.12 adds persistent cosmetic wear states across every arena prop family', () => {
  const source = read('public/games/danao/src/art/environment-wear.js');
  for (const marker of [
    'danao-wear-ring-dent',
    'danao-wear-courtyard-crack',
    'danao-wear-rooftop-spark',
    'danao-wear-crack',
    'danao-wear-break-chip',
    'danao-wear-impact-spark',
    'danao-detail-trolley-handle',
    'danao-detail-produce-item',
    'danao-detail-gong',
    'danao-detail-drum-skin',
    'danao-detail-hanging-lantern',
    'danao-detail-rooftop-duct-rib',
    'danao-detail-rooftop-vent-slat',
    'danao-detail-rooftop-sign-light',
    'danao-detail-rooftop-aerial-bar',
    'danaoEnvironmentWearCount',
    'danaoEnvironmentWearHighestState',
  ]) assert.ok(source.includes(marker), marker);
});

test('v0.10.12 environment wear remains outside physics combat scoring and online authority', () => {
  const source = read('public/games/danao/src/art/environment-wear.js');
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

test('v0.10.12 environment props use surface-specific specular response', () => {
  const source = read('public/games/danao/src/art/environment-props.js');
  assert.match(source, /specularPower = 32/);
  assert.match(source, /danao-detail-store-metal'.*specular: 0\.4.*specularPower: 96/);
  assert.match(source, /danao-detail-courtyard-brass'.*specular: 0\.42.*specularPower: 104/);
  assert.match(source, /danao-detail-rooftop-duct-mat'.*specular: 0\.3.*specularPower: 82/);
  assert.match(source, /mat\.ambientColor = base\.scale\(ambient\)/);
});

test('v0.10.12 main applies the same wear presenter to local and relayed online feedback', () => {
  const main = read('public/games/danao/src/main.js');
  assert.match(main, /import \{ mountEnvironmentWear \} from '.\/art\/environment-wear\.js'/);
  assert.match(main, /environmentWear\?\.onFeedback\?\.\(event\)/);
  assert.match(main, /environmentWear = mountEnvironmentWear\(B, scene, arenaId\)/);
  assert.ok((main.match(/environmentWear = null/g) || []).length >= 5);
  assert.match(main, /environmentWear\?\.dispose\?\.\(\)/);
});

test('environment wear remains part of Danao 0.10.12 and later releases', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  const [major, minor, patch] = release.version.split('.').map(Number);
  const numericVersion = major * 1_000_000 + minor * 1_000 + patch;
  assert.ok(numericVersion >= 10_012, release.version);
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
