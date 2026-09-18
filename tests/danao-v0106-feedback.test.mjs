import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('combat feedback style map gives distinct readable arcade reactions', async () => {
  const { feedbackStyleForEvent } = await import('../public/games/danao/src/art/combat-feedback.js');
  assert.equal(feedbackStyleForEvent({ type: 'light-hit' }).text, 'POW!');
  assert.equal(feedbackStyleForEvent({ type: 'heavy-hit' }).text, 'WHAM!');
  assert.equal(feedbackStyleForEvent({ type: 'grab' }).text, 'GRAB!');
  assert.equal(feedbackStyleForEvent({ type: 'fighter-throw' }).text, 'YEET!');
  assert.equal(feedbackStyleForEvent({ type: 'prop-break' }).text, 'CRASH!');
  assert.equal(feedbackStyleForEvent({ type: 'ko' }).text, 'K.O.!');
  assert.equal(feedbackStyleForEvent({ type: 'heavy-hit' }).ring, true);
  assert.equal(feedbackStyleForEvent({ type: 'light-hit' }).ring, false);
});

test('combat feedback presenter is scene-owned, bounded and self-disposing', () => {
  const source = read('public/games/danao/src/art/combat-feedback.js');
  for (const marker of [
    'combat-feedback-text',
    'combat-feedback-ring',
    'danaoFeedbackActive',
    'onBeforeRenderObservable',
    'disposeFeedback',
    '__DANAO_FEEDBACK_EVENTS',
    'strokeText',
    'useAlphaFromDiffuseTexture',
  ]) assert.match(source, new RegExp(marker));
  assert.doesNotMatch(source, /setInterval|setTimeout/);
  assert.match(source, /active >= 7 && event\.type === 'light-hit'/);
  assert.match(source, /active >= 10/);
});

test('assembled runtime emits cosmetic feedback from real authoritative combat seams', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  for (const marker of [
    "'heavy-hit' : 'light-hit'",
    "type: 'pickup'",
    "type: 'grab'",
    "type: 'prop-throw'",
    "type: 'fighter-throw'",
    "type: 'prop-break'",
    "type: 'fall-reset'",
    "type: 'ko'",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.match(runtime, /const onFeedback = callbacks\.onFeedback/);
});

test('0.10.6 feedback patch changes presentation only, not combat balance constants', () => {
  const patch = read('scripts/danao-v0106-feedback-runtime-patch.mjs');
  for (const forbidden of [
    'GAME_CONFIG.maxHealth =',
    'profile.damage =',
    'profile.knockback =',
    'cooldownMs =',
  ]) assert.equal(patch.includes(forbidden), false, forbidden);
  assert.match(patch, /onFeedback/);
});

test('browser main renders runtime feedback through the Babylon presentation layer', () => {
  const main = read('public/games/danao/src/main.js');
  assert.match(main, /import \{ showCombatFeedback \} from '.\/art\/combat-feedback\.js'/);
  assert.match(main, /onFeedback\(event\)/);
  assert.match(main, /showCombatFeedback\(B, scene, event\)/);
});

test('game-feel feedback remains part of Danao 0.10.6 and later releases', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  const [major, minor, patch] = release.version.split('.').map(Number);
  const numericVersion = major * 1_000_000 + minor * 1_000 + patch;
  assert.ok(numericVersion >= 10_006, release.version);
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
