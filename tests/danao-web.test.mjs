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

test('Danao browser shell has WebGL checks, progress UI and browser-only fallback messaging',()=>{
 for(const rel of ['public/games/danao/index.html','public/games/danao/danao.css','public/games/danao/launcher.mjs','public/games/danao/release.json'])assert.ok(has(rel),`missing ${rel}`);
 const html=read('public/games/danao/index.html');const js=read('public/games/danao/launcher.mjs');
 assert.match(html,/打闹/);assert.match(html,/loading/i);assert.match(html,/fullscreen/i);assert.match(js,/webgl2/i);assert.match(js,/Build\/Danao\.loader\.js/);assert.match(js,/controller/i);assert.match(js,/not published|unavailable/i);
 assert.doesNotMatch(js,/Windows build|Windows x64/i);
});

test('Unity CI is browser-only: tests plus WebGL output with no Windows application build',()=>{
 const workflow=read('.github/workflows/danao-unity.yml');const ignore=read('.gitignore');
 assert.match(workflow,/WebGL/);assert.match(workflow,/runTests|testMode/);assert.match(workflow,/upload-artifact/);
 assert.doesNotMatch(workflow,/StandaloneWindows64|build-windows|danao-windows-x64/i);
 assert.match(ignore,/unity\/danao\/Build/);assert.match(ignore,/unity\/danao\/Library/);
});

test('Unity CI accepts either Personal license file or Pro serial and requires Unity credentials',()=>{
 const workflow=read('.github/workflows/danao-unity.yml');
 assert.match(workflow,/secrets\.UNITY_LICENSE/);
 assert.match(workflow,/secrets\.UNITY_SERIAL/);
 assert.match(workflow,/secrets\.UNITY_EMAIL/);
 assert.match(workflow,/secrets\.UNITY_PASSWORD/);
 assert.match(workflow,/UNITY_LICENSE_VALUE/);
 assert.match(workflow,/UNITY_SERIAL_VALUE/);
 assert.match(workflow,/UNITY_EMAIL_VALUE/);
 assert.match(workflow,/UNITY_PASSWORD_VALUE/);
});

test('Danao exposes a Unity Build Automation pre-export hook that creates the boot scene',()=>{
 const rel='unity/danao/Assets/Editor/DanaoCloudBuild.cs';
 assert.ok(has(rel),`missing ${rel}`);
 const cloud=read(rel);
 assert.match(cloud,/public\s+static\s+void\s+PreExport\s*\(/);
 assert.match(cloud,/Assets\/Danao\/Generated\/Boot\.unity/);
 assert.match(cloud,/EditorBuildSettings\.scenes/);
 assert.match(cloud,/DanaoProjectConfigurator\.EnsureProject/);
});

test('Danao editor build entry point is WebGL-only',()=>{
 const build=read('unity/danao/Assets/Danao/Editor/DanaoBuild.cs');
 assert.match(build,/BuildWeb\s*\(\)/);
 assert.match(build,/BuildTarget\.WebGL/);
 assert.doesNotMatch(build,/BuildWindows|StandaloneWindows64|Windows x64/);
});

test('GitHub can trigger Unity Build Automation directly for WebGL only',()=>{
 const rel='.github/workflows/danao-uba-trigger.yml';
 assert.ok(has(rel),`missing ${rel}`);
 const workflow=read(rel);
 assert.match(workflow,/build-automation\.services\.api\.unity\.com\/v2/);
 assert.match(workflow,/UNITY_UBA_AUTH/);
 assert.match(workflow,/UNITY_UBA_ORG_ID/);
 assert.match(workflow,/UNITY_UBA_PROJECT_ID/);
 assert.match(workflow,/buildtargets/);
 assert.match(workflow,/Danao WebGL/);
 assert.doesNotMatch(workflow,/Danao Windows x64|danao-windows-x64|StandaloneWindows64/);
 assert.match(workflow,/cloud-build-trigger\.json/);
});

test('GitHub can monitor the latest Unity cloud WebGL build and surface logs on failure',()=>{
 const rel='.github/workflows/danao-uba-status.yml';
 assert.ok(has(rel),`missing ${rel}`);
 const workflow=read(rel);
 assert.match(workflow,/danao-webgl/);
 assert.doesNotMatch(workflow,/danao-windows-x64|Danao Windows x64/);
 assert.match(workflow,/builds\?limit=1/);
 assert.match(workflow,/buildStatus/);
 assert.match(workflow,/success\|failure\|canceled\|unknown/);
 assert.match(workflow,/\/failures/);
 assert.match(workflow,/\/log/);
 assert.match(workflow,/cloud-build-status-trigger\.json/);
});

test('successful Unity cloud WebGL build is captured as a playable GitHub artifact',()=>{
 const workflow=read('.github/workflows/danao-uba-status.yml');
 for(const name of ['Danao WebGL.loader.js','Danao WebGL.data','Danao WebGL.framework.js','Danao WebGL.wasm']) assert.match(workflow,new RegExp(name.replaceAll('.', '\\.')));
 assert.match(workflow,/Authorization: \$UNITY_UBA_AUTH/);
 assert.match(workflow,/Danao\.loader\.js/);
 assert.match(workflow,/Danao\.data/);
 assert.match(workflow,/Danao\.framework\.js/);
 assert.match(workflow,/Danao\.wasm/);
 assert.match(workflow,/danao-webgl-playable/);
});

test('Cloudflare sends Danao WebGL build requests through the Worker before static assets',()=>{
 const wrangler=JSON.parse(read('wrangler.jsonc'));
 assert.ok(wrangler.assets.run_worker_first.includes('/game-builds/danao/web/*'));
});
