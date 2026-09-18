import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('v0.10.8 touch action map follows Danao keyboard controls', async () => {
  const { TOUCH_ACTION_KEYS, actionKey } = await import('../public/games/danao/src/mobile/touch-controls.js');
  assert.deepEqual({ ...TOUCH_ACTION_KEYS }, {
    up: 'KeyW',
    left: 'KeyA',
    down: 'KeyS',
    right: 'KeyD',
    jump: 'Space',
    punch: 'KeyJ',
    grab: 'KeyK',
    dodge: 'KeyL',
  });
  assert.equal(actionKey('grab'), 'KeyK');
  assert.equal(actionKey('unknown'), null);
});

test('v0.10.8 virtual key state supports multi-touch and reference-counted releases', async () => {
  const { createVirtualKeyState } = await import('../public/games/danao/src/mobile/touch-controls.js');
  const events = [];
  const state = createVirtualKeyState((code, down) => events.push([code, down]));

  assert.equal(state.press(1, 'up'), true);
  assert.equal(state.press(2, 'left'), true);
  assert.equal(state.press(3, 'jump'), true);
  assert.equal(state.size, 3);
  assert.equal(state.isPressed('up'), true);

  state.release(2);
  assert.deepEqual(events.slice(0, 4), [
    ['KeyW', true],
    ['KeyA', true],
    ['Space', true],
    ['KeyA', false],
  ]);

  state.press(4, 'up');
  state.release(1);
  assert.equal(events.at(-1)[0] === 'KeyW' && events.at(-1)[1] === false, false);
  state.release(4);
  assert.deepEqual(events.at(-1), ['KeyW', false]);

  state.releaseAll();
  assert.deepEqual(events.at(-1), ['Space', false]);
  assert.equal(state.size, 0);
});

test('v0.10.8 touch shell releases input on pointer and browser interruptions', () => {
  const source = read('public/games/danao/src/mobile/touch-controls.js');
  for (const marker of [
    'pointerdown',
    'pointerup',
    'pointercancel',
    'lostpointercapture',
    'visibilitychange',
    'setPointerCapture',
    'releaseAll',
  ]) assert.ok(source.includes(marker), marker);
  assert.match(source, /addEventListener\?\.\('blur'/);
});

test('v0.10.8 touch CSS is mobile-first and safe-area aware', () => {
  const css = read('public/games/danao/src/mobile/touch-controls.css');
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(pointer: coarse\)/);
  assert.match(css, /orientation: portrait/);
  assert.match(css, /max-height: 470px/);
  assert.match(css, /\.danao-touch-shell\.force-visible\.is-active/);
});

test('v0.10.8 browser entry mounts touch controls for local and online matches', () => {
  const main = read('public/games/danao/src/main.js');
  const html = read('public/games/danao/index.html');
  assert.match(main, /import \{ mountTouchControls \} from '\.\/mobile\/touch-controls\.js'/);
  assert.ok((main.match(/touchControls\.setActive\(true\)/g) || []).length >= 2);
  assert.ok((main.match(/touchControls\.setActive\(false\)/g) || []).length >= 4);
  assert.match(main, /touchControls\.setPaused\(paused\)/);
  assert.match(main, /touchControls\.dispose\(\)/);
  assert.match(html, /src\/mobile\/touch-controls\.css/);
});

test('mobile touch release is Danao 0.10.8', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  assert.equal(release.version, '0.10.8');
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
