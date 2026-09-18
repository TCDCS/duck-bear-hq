import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('inspect assembled Danao runtime feedback seams', () => {
  const source = fs.readFileSync(path.join(root, 'public/games/danao/src/game/runtime.js'), 'utf8');
  const terms = [
    'heldItem',
    'grab',
    'throw',
    'pickup',
    'performAttack',
    'applyMovement',
    'updateItems',
    'itemVisual',
    'heldBy',
    'network',
  ];
  for (const term of terms) {
    const index = source.toLowerCase().indexOf(term.toLowerCase());
    console.log('\nDANAO_INSPECT', term, index);
    if (index >= 0) console.log(source.slice(Math.max(0, index - 1400), Math.min(source.length, index + 3600)));
  }
});
