import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');

test('Danao v0.6 is the physics-chaos build rather than the old ring-out prototype', () => {
  const runtime = read('public/games/danao/src/game/runtime.js');
  const app = read('public/games/danao/src/ui/App.js');
  for (const token of ['./items.js', './brawler.js', './interactions.js', './visuals.js', 'performGrab', 'heldPropId', 'grabbedFighterId', 'breakProp']) assert.match(runtime, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(app, /K grab\/throw/);
  assert.match(app, /Y grab\/throw/);
  assert.match(app, /HOLDING:/);
  assert.match(app, /HP/);
  assert.doesNotMatch(app, /EDGE!/);
});

test('Danao v0.6 release source is reconstructed byte-for-byte before tests and deploy', () => {
  assert.equal(sha256('public/games/danao/src/game/runtime.js'), '7e4f433225347badb7e51217792d278f1e1c84734e8d969d2439cb6ac7484d2a');
  assert.equal(sha256('public/games/danao/src/game/visuals.js'), '5b58adde9afeecda68d38436005029e42fc5dbf82fec9a9255246ffdd7c250f3');
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

test('Cloudflare deploy assembles the exact Danao v0.6 release before verification', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.deploy, /^npm run assemble:danao/);
  assert.equal(pkg.scripts['assemble:danao'], 'node scripts/assemble-danao-v05.mjs');
  assert.match(read('public/games/danao/release.json'), /"version": "0\.6\.0"/);
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

test('Danao v0.6 adds heavier impact feel, destruction feedback and a lower party camera', async () => {
  const { hitStopDuration } = await import('../public/games/danao/src/game/brawler.js');
  const { cameraFrameForPoints, partyCameraPlacement } = await import('../public/games/danao/src/game/runtimeMath.js');
  const { getItemDefinition } = await import('../public/games/danao/src/game/items.js');
  assert.equal(hitStopDuration(0, false), 0);
  assert.ok(hitStopDuration(14, true) > hitStopDuration(7, false));
  assert.ok(hitStopDuration(30, true) <= 95);
  assert.equal(getItemDefinition('chair').breakable, true);
  const frame = cameraFrameForPoints([{ x: -2, z: -1 }, { x: 2, z: 1 }]);
  const camera = partyCameraPlacement(frame);
  assert.ok(frame.distance <= 14);
  assert.ok(camera.y < frame.distance * 0.5 + 2.5);
  const runtime = read('public/games/danao/src/game/runtime.js');
  const visuals = read('public/games/danao/src/game/visuals.js');
  assert.match(runtime, /hitStopUntil/);
  assert.match(runtime, /spawnPropDebris/);
  assert.match(runtime, /updatePropHighlights/);
  assert.match(visuals, /export function spawnPropDebris/);
  assert.match(visuals, /announcer-desk/);
  assert.match(visuals, /ring-step/);
});
