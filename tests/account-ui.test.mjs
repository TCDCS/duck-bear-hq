import test from 'node:test';
import assert from 'node:assert/strict';
import {select} from '../public/hq/client.mjs';
test('settings selects expose a stable accessible name independent of option text',()=>{
 const html=select('theme','Theme',[['paper','Paper & colour'],['night','Night notebook']],'night');
 assert.match(html,/<select name="theme" aria-label="Theme">/);
 assert.match(html,/<option value="night" selected>Night notebook<\/option>/);
 assert.match(select('x','A "quoted" <label>',[]),/aria-label="A &quot;quoted&quot; &lt;label&gt;"/);
});
