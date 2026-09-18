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
  assert.equal(sha256('public/games/danao/src/game/runtime.js'), '9480ec01feacdf7972c2ae77817ccebe53304a3d4b7596e74c6e20f285164d88');
  assert.equal(sha256('public/games/danao/src/game/visuals.js'), '06fe6956f08e588e53e86849110db8465ce0014ddb22089229c458fc5cc3fa31');
  assert.equal(sha256('public/games/danao/src/ui/App.js'), '98e729aa045e2094e06272ff91f183a994c069c757e0b46ba51feae7e186fa06');
  assert.equal(sha256('public/games/danao/src/styles.css'), 'c97800b4937d5f3b77dd83d4f4fe3166853f1718064a5ebe5191c407fa8bc725');
});

test('Checkout Chaos is the flagship showcase and carries supermarket brawler props', () => {
  const arena = read('public/games/danao/src/game/arena.js');
  const items = read('public/games/danao/src/game/items.js');
  assert.match(arena, /Checkout Chaos/);
  assert.match(arena, /supermarket/i);
  assert.match(arena, /baguette/);
  assert.match(arena, /crate/);
  assert.match(arena, /bin/);
  assert.match(arena, /cone/);
  assert.match(items, /frying-pan|pan/);
  assert.match(items, /baguette/);
});

test('Cloudflare deploy assembles the Danao v0.10.1 real-Hero benchmark before verification', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.deploy, /^npm run assemble:danao/);
  assert.equal(pkg.scripts['assemble:danao'], 'node scripts/assemble-danao-v05.mjs');
  assert.match(read('public/games/danao/release.json'), /"version": "0\.10\.1"/);
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
  assert.match(visuals, /supermarket-checkout/);
  assert.match(visuals, /supermarket-aisle-shelf/);
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
