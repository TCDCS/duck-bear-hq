import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('homepage hero links to Games and Shop while Wacky Races stays in the games catalogue',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/<a class="button secondary" href="\/games\/">Play Games →<\/a>/);
 assert.match(html,/<a class="button secondary" href="\/shop\/">Shop →<\/a>/);
 assert.equal([...html.matchAll(/href="\/games\/wacky-races\/"/g)].length,1);
 assert.match(html,/href="\/games\/wacky-races\/\?friends=1"/);
 assert.doesNotMatch(html,/welcome-tags/);
 assert.doesNotMatch(html,/✦ Free games|♡ Private memories|☀ Small adventures/);
 assert.doesNotMatch(html,/href="[^"]*play=1/);
});
