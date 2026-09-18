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

test('Danao release source is reconstructed byte-for-byte before tests and deploy', () => {
  assert.equal(sha256('public/games/danao/src/game/runtime.js'), '00e76da6da5e30cad4cad40f748e29947f8949a0e29e706e1ccce3688b7cb7c0');
  assert.equal(sha256('public/games/danao/src/game/visuals.js'), '38344470446870e174188d8c2b260042199b1cd41fab96f6b00bf9bbfe752a57');
  assert.equal(sha256('public/games/danao/src/ui/App.js'), '02732a964fb06df125aea06e20d734507c460dd61521f84fd83f1646a9215268');
  assert.equal(sha256('public/games/danao/src/styles.css'), 'c97800b4937d5f3b77dd83d4f4fe3166853f1718064a5ebe5191c407fa8bc725');
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

test('Cloudflare deploy assembles the exact Danao v0.8 release before verification', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.deploy, /^npm run assemble:danao/);
  assert.equal(pkg.scripts['assemble:danao'], 'node scripts/assemble-danao-v05.mjs');
  assert.match(read('public/games/danao/release.json'), /"version": "0\.8\.0"/);
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


test('Danao fighters preserve the established Mango Mayhem visual identities', () => {
  const visuals = read('public/games/danao/src/game/visuals.js');
  const app = read('public/games/danao/src/ui/App.js');
  const css = read('public/games/danao/src/styles.css');

  assert.match(visuals, /const MANGO_IDENTITIES = Object\.freeze/);
  assert.match(visuals, /sourceId: 'guannan'/);
  for (const marker of [
    'hero-bun',
    'stephen-glasses',
    'gaby-sunglasses',
    'zachary-beard',
    'sara-long-hair',
    'mulan-dog-muzzle',
    'mum-bob-hair',
    'dad-glasses',
  ]) assert.match(visuals, new RegExp(marker));

  assert.match(app, /fighter-avatar fighter-avatar-\$\{fighter\.id\}/);
  assert.match(app, /hud-avatar fighter-avatar fighter-avatar-\$\{fighter\.id\}/);
  assert.match(css, /\.fighter-avatar-mulan/);
  assert.match(css, /\.fighter-avatar-stephen/);
  assert.match(css, /\.hud-avatar/);
});
