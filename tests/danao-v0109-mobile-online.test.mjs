import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('v0.10.9 short landscape online lobby uses a compact two-column room layout', () => {
  const css = read('public/games/danao/src/online/online.css');
  assert.match(css, /orientation:landscape/);
  assert.match(css, /max-height:500px/);
  assert.match(css, /width:min\(720px,calc\(100vw - 24px\)\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.online-room-actions\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
});

test('v0.10.9 real-browser contract rejects mobile lobby scrolling', () => {
  const browser = read('tests/danao-online-browser.py');
  assert.match(browser, /mobile online lobby fits without vertical scrolling/);
  assert.match(browser, /mobile room actions are all visible without scrolling/);
  assert.match(browser, /mobile room roster uses two compact columns/);
  assert.match(browser, /panel\.scrollHeight <= panel\.clientHeight \+ 1/);
});

test('mobile online lobby polish remains part of Danao 0.10.9 and later releases', () => {
  const release = JSON.parse(read('public/games/danao/release.json'));
  const [major, minor, patch] = release.version.split('.').map(Number);
  const numericVersion = major * 1_000_000 + minor * 1_000 + patch;
  assert.ok(numericVersion >= 10_009, release.version);
  assert.equal(release.engine, 'Babylon.js + Rapier');
});
