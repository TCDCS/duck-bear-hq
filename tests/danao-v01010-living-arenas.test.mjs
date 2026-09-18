import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('v0.10.10 reaction profiles stay cosmetic and arena-specific', async () => {
  const { environmentReactionProfile } = await import('../public/games/danao/src/art/environment-reactions.js');
  assert.deepEqual(environmentReactionProfile({ arenaId: 'ring', type: 'pickup' }), {
    arenaId: 'ring',
    strength: 0.15,
    debrisCount: 0,
  });
  assert.equal(environmentReactionProfile({ arenaId: 'courtyard', type: 'heavy-hit' }).debrisCount, 5);
  assert.equal(environmentReactionProfile({ arenaId: 'rooftop', type: 'prop-break' }).debrisCount, 4);
  assert.equal(environmentReactionProfile({ arenaId: 'ring', type: 'ko' }).debrisCount, 6);
  assert.equal(environmentReactionProfile({ arenaId: 'bad', type: 'ko' }).arenaId, 'courtyard');
});

test('v0.10.10 living arenas include distinct ambient markers for all three arenas', () => {
  const source = read('public/games/danao/src/art/environment-reactions.js');
  for (const marker of [
    'danao-courtyard-petal',
    'danao-rooftop-steam',
    'danao-store-scan-glow',
    'danao-reactive-debris',
    'danao-reactive-puff',
    'danaoEnvironmentReactionCount',
    'onBeforeRenderObservable',
  ]) assert.ok(source.includes(marker), marker);
});

test('v0.10.10 environment reactions cannot change Danao combat authority', () => {
  const source = read('public/games/danao/src/art/environment-reactions.js');
  for (const forbidden of [
    'RAPIER',
    'setLinvel',
    'applyHit',
    'knockOut',
    'health =',
    'score =',
    'sendState',
    'setRemoteInput',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});

test('v0.10.10 main applies the same environment reaction presenter to local and relayed online feedback', () => {
  const main = read('public/games/danao/src/main.js');
  assert.match(main, /import \{ mountEnvironmentReactions \} from '.\/art\/environment-reactions\.js'/);
  assert.match(main, /environmentReaction\?\.onFeedback\?\.\(event\)/);
  assert.match(main, /environmentReaction = mountEnvironmentReactions\(B, scene, arenaId\)/);
  assert.ok((main.match(/polishActiveArena\(/g) || []).length >= 3);
});

test('living arena reaction release is Danao 0.10.10', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  assert.equal(release.version, '0.10.10');
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
