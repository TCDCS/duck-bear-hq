import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('inspect assembled Danao runtime feedback seams', () => {
  const source = fs.readFileSync(path.join(root, 'public/games/danao/src/game/runtime.js'), 'utf8');
  const terms = [
    'function applyFighterHit',
    'function performAttack',
    'function performGrab',
    'function throwHeldProp',
    'function throwHeldFighter',
    'function syncHeldTargets',
    'function updatePropImpacts',
    'function releaseEverything',
    'function knockOut',
    'function respawn',
    'return { startMenuAudio',
  ];
  for (const term of terms) {
    const index = source.indexOf(term);
    console.log('\nDANAO_INSPECT', term, index);
    if (index >= 0) console.log(source.slice(Math.max(0, index - 800), Math.min(source.length, index + 5200)));
  }
});
