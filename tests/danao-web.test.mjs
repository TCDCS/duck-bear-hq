import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const has=rel=>fs.existsSync(path.join(root,rel));

test('games hub links to the Chinese-titled Danao launch page',()=>{
 const hub=read('public/games/index.html');
 assert.match(hub,/\/games\/danao\//);
 assert.match(hub,/打闹/);
 assert.match(hub,/Dǎnào/);
});

test('Danao browser shell has WebGL checks, progress UI and a local fallback message',()=>{
 for(const rel of ['public/games/danao/index.html','public/games/danao/danao.css','public/games/danao/launcher.mjs','public/games/danao/release.json'])assert.ok(has(rel),`missing ${rel}`);
 const html=read('public/games/danao/index.html');const js=read('public/games/danao/launcher.mjs');
 assert.match(html,/打闹/);assert.match(html,/loading/i);assert.match(html,/fullscreen/i);assert.match(js,/webgl2/i);assert.match(js,/Build\/Danao\.loader\.js/);assert.match(js,/controller/i);assert.match(js,/not published|unavailable/i);
});

test('Unity CI defines tests plus WebGL and Windows build outputs without committing generated builds',()=>{
 const workflow=read('.github/workflows/danao-unity.yml');const ignore=read('.gitignore');
 assert.match(workflow,/WebGL/);assert.match(workflow,/StandaloneWindows64/);assert.match(workflow,/runTests|testMode/);assert.match(workflow,/upload-artifact/);
 assert.match(ignore,/unity\/danao\/Build/);assert.match(ignore,/unity\/danao\/Library/);
});
