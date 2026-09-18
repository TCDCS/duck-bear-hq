import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

test('inspect assembled Danao runtime feedback seams', () => {
  const source = fs.readFileSync(path.join(root, 'public/games/danao/src/game/runtime.js'), 'utf8');
  for (const [startTerm, endTerm] of [
    ['function performGrab', 'function syncHeldTargets'],
    ['function breakProp', 'function damageProp'],
    ['function recoverFromFall', 'function checkRingOuts'],
  ]) {
    const start = source.indexOf(startTerm);
    const end = source.indexOf(endTerm, Math.max(0, start + 1));
    console.log('\nDANAO_INSPECT_BLOCK', startTerm, start, end);
    if (start >= 0) console.log(source.slice(start, end > start ? end : start + 9000));
  }
});
