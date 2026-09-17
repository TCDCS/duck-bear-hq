import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const has=rel=>fs.existsSync(path.join(root,rel));

test('games hub links to the Chinese-titled Danao launch page without stale Unity claims',()=>{
 const hub=read('public/games/index.html');
 assert.match(hub,/\/games\/danao\//);
 assert.match(hub,/打闹/);
 assert.match(hub,/Dǎnào/);
 assert.match(hub,/Babylon\.js \+ Rapier/);
 assert.doesNotMatch(hub,/Unity 6/);
 assert.doesNotMatch(hub,/2–4 ONLINE/);
});

test('Danao browser shell ships the Babylon and Rapier game directly as static modules',()=>{
 const required=[
  'public/games/danao/index.html',
  'public/games/danao/src/main.js',
  'public/games/danao/src/styles.css',
  'public/games/danao/src/ui/App.js',
  'public/games/danao/src/game/runtime.js',
  'public/games/danao/src/game/dependencies.js',
 ];
 for(const rel of required)assert.ok(has(rel),`missing ${rel}`);
 const html=read('public/games/danao/index.html');
 const deps=read('public/games/danao/src/game/dependencies.js');
 assert.match(html,/大闹|打闹/);
 assert.match(html,/src\/main\.js/);
 assert.match(deps,/babylonjs@9\.26\.2/);
 assert.match(deps,/rapier3d-compat@0\.20\.0/);
 const legacy=read('public/games/danao/launcher.mjs');
 assert.doesNotMatch(legacy,/createUnityInstance|Danao\.loader|unity/i);
 assert.match(read('public/games/danao/release.json'),/Babylon\.js \+ Rapier/);
});

test('Danao and its retired WebGL build path bypass the old game Worker launcher',()=>{
 const wrangler=JSON.parse(read('wrangler.jsonc'));
 const routes=wrangler.assets.run_worker_first;
 assert.equal(routes.includes('/games/*'),false);
 assert.equal(routes.includes('/game-builds/danao/web/*'),false);
 for(const route of ['/games/wacky-races','/games/wacky-races/*','/games/proper-karted','/games/proper-karted/*'])assert.ok(routes.includes(route),`missing ${route}`);
});

test('Danao detaches the restrictive site CSP and declares its own pinned engine policy',()=>{
 const headers=read('public/_headers');
 const block=headers.match(/\/games\/danao\/\*\s*\n((?:  .*\n?)*)/)?.[1]||'';
 assert.match(block,/! Content-Security-Policy/);
 assert.doesNotMatch(block,/^  Content-Security-Policy:/m);
 const html=read('public/games/danao/index.html');
 assert.match(html,/http-equiv="Content-Security-Policy"/);
 for(const host of ['https://cdn.jsdelivr.net','https://unpkg.com','https://esm.sh'])assert.ok(html.includes(host),`missing ${host}`);
 assert.match(html,/'wasm-unsafe-eval'/);
 assert.doesNotMatch(html,/(?:^|\s)'unsafe-eval'(?:\s|;|$)/);
});
