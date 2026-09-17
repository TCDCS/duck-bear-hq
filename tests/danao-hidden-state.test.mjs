import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../public/games/danao/danao.css',import.meta.url),'utf8');

test('Danao CSS cannot override the HTML hidden state for loading and fatal overlays',()=>{
  assert.match(css,/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/i);
});
