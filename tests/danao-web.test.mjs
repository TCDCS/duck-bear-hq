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

test('GitHub can trigger Unity Build Automation directly without browser automation',()=>{
 const rel='.github/workflows/danao-uba-trigger.yml';
 assert.ok(has(rel),`missing ${rel}`);
 const workflow=read(rel);
 assert.match(workflow,/build-automation\.services\.api\.unity\.com\/v2/);
 assert.match(workflow,/UNITY_UBA_AUTH/);
 assert.match(workflow,/UNITY_UBA_ORG_ID/);
 assert.match(workflow,/UNITY_UBA_PROJECT_ID/);
 assert.match(workflow,/buildtargets/);
 assert.match(workflow,/Danao WebGL/);
 assert.match(workflow,/Danao Windows x64/);
 assert.match(workflow,/cloud-build-trigger\.json/);
});

test('Cloudflare sends Danao WebGL build requests through the Worker before static assets',()=>{
 const wrangler=JSON.parse(read('wrangler.jsonc'));
 assert.ok(wrangler.assets.run_worker_first.includes('/game-builds/danao/web/*'));
});
