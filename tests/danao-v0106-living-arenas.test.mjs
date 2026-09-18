import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('living arenas add bounded visual reactions for all three environments', () => {
  const source = read('public/games/danao/src/art/world-reaction.js');
  for (const marker of [
    'danao-world-dust',
    'danao-world-impact-ring',
    'courtyard-reactive-petal',
    'rooftop-reactive-steam',
    'store-reactive-scan',
    'supermarket-trolley-wheel',
    'onBeforeRenderObservable',
    'danaoWorldReaction',
  ]) assert.match(source, new RegExp(marker));
  assert.doesNotMatch(source, /setInterval|setTimeout/);
});

test('living arena reactions remain presentation-only', () => {
  const source = read('public/games/danao/src/art/world-reaction.js');
  assert.doesNotMatch(source, /RAPIER|setLinvel|applyHit|knockOut|health\s*=|score\s*=/);
  assert.doesNotMatch(source, /from ['"]\.\.\/game\//);
});

test('local and online starts both mount the same living-world layer', () => {
  const source = read('public/games/danao/src/main.js');
  assert.match(source, /import \{ mountWorldReaction \} from '\.\/art\/world-reaction\.js'/);
  assert.match(source, /mountWorldReaction\(B, scene, arenaId\)/);
  assert.equal((source.match(/polishActiveArena\(/g) || []).length >= 3, true);
});

test('living arena release is Danao 0.10.6', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  assert.equal(release.version, '0.10.6');
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
