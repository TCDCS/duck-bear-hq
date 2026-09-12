const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../src/kart-assets/audio.js.txt','utf8');
function setup(extra={}){const box={...extra};vm.runInNewContext(source,box);const a=new box.WackyAudio(()=>({settings:{sound:true}}));a.track=0;return {box,a};}
const settings={recordings:true,music:true,musicVolume:.5};
test('effects are safe before the first user gesture',()=>{const {a}=setup();for(const kind of ['hit','recover','coin','lap'])assert.doesNotThrow(()=>a.effect(kind));});
test('every course has a distinct built-in score and credited recording',()=>{const {box}=setup();assert.equal(box.WackyMusic.length,6);assert.equal(new Set(box.WackyMusic.map(c=>JSON.stringify(c.notes))).size,6);assert.equal(new Set(box.WackyMusic.map(c=>c.isrc)).size,6);});
test('missing media constructor cannot stop the racing frame',()=>{const {a}=setup();assert.doesNotThrow(()=>assert.equal(a.streamMusic(true,settings),false));assert.equal(a.failed,true);});
test('recording play rejection falls back without an uncaught promise',async()=>{class Audio{constructor(){this.paused=true;}addEventListener(){}play(){return Promise.reject(Error('offline'));}pause(){this.paused=true;}}const {a}=setup({Audio});assert.equal(a.streamMusic(true,settings),false);await Promise.resolve();assert.equal(a.failed,true);assert.match(a.status,/original score/i);});
test('disabled recording option does not create external media',()=>{let requests=0;class Audio{constructor(){requests++;}}const {a}=setup({Audio});assert.equal(a.streamMusic(true,{...settings,recordings:false}),false);assert.equal(requests,0);});
