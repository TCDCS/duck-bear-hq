import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');

test('Danao v0.5 is the physics-chaos build rather than the old ring-out prototype', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  const app = read('public/games/danao/src/ui/App.js');
  for (const token of ['./items.js', './brawler.js', './interactions.js', './visuals.js', 'performGrab', 'heldPropId', 'grabbedFighterId', 'breakProp']) assert.match(runtime, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(app, /K grab\/throw/);
  assert.match(app, /Y grab\/throw/);
  assert.match(app, /HOLDING:/);
  assert.match(app, /HP/);
  assert.doesNotMatch(app, /EDGE!/);
});

test('Danao v0.5 release source is reconstructed byte-for-byte before tests and deploy', () => {
  assert.equal(sha256('public/games/danao/src/game/runtime.js'), '921b5438c5defc1f569c1e30a744b43daa52990687f7770020b793f9d3d4ee69');
  assert.equal(sha256('public/games/danao/src/game/visuals.js'), '886d4f23c29db01d8ced5d8232ab506fce1cad318ffc9c762e48315d7dae5cf1');
});

test('Wrestling Hall is the default showcase and carries actual brawler props', () => {
  const arena = read('public/games/danao/src/game/arena.js');
  const items = read('public/games/danao/src/game/items.js');
  assert.match(arena, /Wrestling Hall/);
  assert.match(arena, /folding-chair|chair/);
  assert.match(arena, /table/);
  assert.match(arena, /crate/);
  assert.match(items, /frying-pan|pan/);
  assert.match(items, /baguette/);
  assert.match(items, /mallet/);
});

test('Cloudflare deploy assembles the exact Danao v0.5 release before verification', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.deploy, /^npm run assemble:danao/);
  assert.equal(pkg.scripts['assemble:danao'], 'node scripts/assemble-danao-v05.mjs');
  assert.match(read('public/games/danao/release.json'), /"version": "0\.5\.0"/);
});

test('browser fighter select uses the complete Danao cast instead of generic stand-ins', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  const visuals = read('public/games/danao/src/game/visuals.js');
  const app = read('public/games/danao/src/ui/App.js');
  const cast = [
    ['hero', 'Hero'], ['stephen', 'Stephen'], ['zachary', 'Zachary'], ['mulan', 'Mulan'],
    ['gaby', 'Gaby'], ['sara', 'Sara'], ['mum', 'Mum'], ['dad', 'Dad'],
  ];
  for (const [id, name] of cast) {
    assert.match(runtime, new RegExp(`id: '${id}'.*name: '${name}'`));
    assert.match(app, new RegExp(`id: '${id}'.*name: '${name}'`));
    assert.match(visuals, new RegExp(`style\\.id === '${id}'`));
  }
  for (const [oldId, oldName] of [['tiger', 'Tiger'], ['crane', 'Crane'], ['monkey', 'Monkey'], ['ox', 'Ox']]) {
    assert.doesNotMatch(runtime, new RegExp(`id: '${oldId}'.*name: '${oldName}'`));
    assert.doesNotMatch(app, new RegExp(`id: '${oldId}'.*name: '${oldName}'`));
    assert.doesNotMatch(visuals, new RegExp(`style\\.id === '${oldId}'`));
  }
  assert.match(app, /fighterId: 'hero'/);
});
