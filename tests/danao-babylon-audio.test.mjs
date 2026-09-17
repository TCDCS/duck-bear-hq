import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('public/games/danao/index.html','utf8');
const audioPath='public/games/danao/audio.mjs';
const audio=await import('../public/games/danao/audio.mjs');

test('Danao browser ships original procedural audio with no external media dependency',()=>{
 assert.ok(fs.existsSync(audioPath));
 const src=fs.readFileSync(audioPath,'utf8');
 assert.doesNotMatch(src,/https?:\/\//i);
 assert.doesNotMatch(src,/\.mp3|\.ogg|\.wav|new Audio\(/i);
 for(const id of ['Punch','WeaponHit','Grab','Throw','Squeak','Pop','Rocket','RocketBoom','TableBreak','Knockout','RoundStart','Victory','Empty','Bounce'])assert.match(src,new RegExp(`['\"]${id}['\"]`),id);
 assert.match(src,/293\.66/);
 assert.match(src,/659\.25/);
 assert.match(src,/gong/i);
});

test('browser audio is gesture gated and exposes title fight and volume controls',()=>{
 const src=fs.readFileSync(audioPath,'utf8');
 assert.equal(typeof audio.unlockAudio,'function');
 assert.equal(typeof audio.playTitleMusic,'function');
 assert.equal(typeof audio.playFightMusic,'function');
 assert.equal(typeof audio.setVolumes,'function');
 assert.match(src,/AudioContext/);
 assert.match(src,/pointerdown|keydown/);
 assert.match(html,/id=["']audio-toggle["']/);
 assert.match(html,/audio\.mjs/);
});

test('audio follows menu fight pickup hit and result UI without coupling to the renderer',()=>{
 const src=fs.readFileSync(audioPath,'utf8');
 assert.match(src,/MutationObserver/);
 assert.match(src,/game-screen/);
 assert.match(src,/p1-hp/);
 assert.match(src,/p1-weapon/);
 assert.match(src,/round-over/);
});
