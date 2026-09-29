import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('illustrated homepage retains two direct solo setup links and the friends route',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.equal([...html.matchAll(/href="\/games\/wacky-races\/"/g)].length,2);
 assert.match(html,/href="\/games\/wacky-races\/\?friends=1"/);
 assert.doesNotMatch(html,/href="[^\"]*play=1/);
});
