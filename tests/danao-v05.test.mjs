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
  assert.equal(sha256('public/games/danao/src/game/runtime.js'), 'b803937f6c2f6f8162eaa746301ef7583420f773d3eb39b43353fe4064724209');
  assert.equal(sha256('public/games/danao/src/game/visuals.js'), 'aba427b2c9658e24887e2511f7769425f48c1b19d9a15830d7292642e7963a47');
  assert.equal(sha256('public/games/danao/src/ui/App.js'), 'c730de0d72c26a484c035b824a03a28c18f372375b403d9258498c454e093053');
  assert.equal(sha256('public/games/danao/src/styles.css'), '1df1da15140da03a84734fc0ea366abf35592a1c079c65b22a06673be2ad3f1b');
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
  assert.match(read('public/games/danao/release.json'), /"version": "0\.5\.1"/);
});

test('browser fighter select uses the complete Danao cast instead of generic stand-ins', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  const visuals = read('public/games/danao/src/game/visuals.js');
  const app = read('public/games/danao/src/ui/App.js');
  const css = read('public/games/danao/src/styles.css');
  const cast = [
    ['hero', 'Hero'], ['stephen', 'Stephen'], ['zachary', 'Zachary'], ['mulan', 'Mulan'],
    ['gaby', 'Gaby'], ['sara', 'Sara'], ['mum', 'Mum'], ['dad', 'Dad'],
  ];
  for (const [id, name] of cast) {
    assert.match(runtime, new RegExp(`id: '${id}'.*name: '${name}'`));
    assert.match(app, new RegExp(`id: '${id}'.*name: '${name}'`));
    assert.match(visuals, new RegExp(`style\\.id === '${id}'`));
    assert.match(css, new RegExp(`\\.fighter-${id}\\s*\\{`));
  }
  for (const [oldId, oldName] of [['tiger', 'Tiger'], ['crane', 'Crane'], ['monkey', 'Monkey'], ['ox', 'Ox']]) {
    assert.doesNotMatch(runtime, new RegExp(`id: '${oldId}'.*name: '${oldName}'`));
    assert.doesNotMatch(app, new RegExp(`id: '${oldId}'.*name: '${oldName}'`));
    assert.doesNotMatch(visuals, new RegExp(`style\\.id === '${oldId}'`));
  }
  assert.match(app, /fighterId: 'hero'/);
});
