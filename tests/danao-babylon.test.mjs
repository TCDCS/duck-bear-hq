import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const has=rel=>fs.existsSync(path.join(root,rel));
const pkg=JSON.parse(read('package.json'));

const arenaNames=['Wrestling Arena','Dublin Docks','London Underground','Mango Market','Temple Courtyard','Sichuan Tea House','Ice Festival','House Party','Toy Factory','Cruise Ship','Mad Circus'];

function assertId(html,id){assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);}

test('Danao page is a native bundled browser shell rather than a Unity startup shell',()=>{
 const html=read('public/games/danao/index.html');
 assert.match(html,/打闹/);
 assert.match(html,/Dǎnào/);
 assert.match(html,/type=["']module["'][^>]+build\/game\.js|build\/game\.js[^>]+type=["']module["']/);
 assert.doesNotMatch(html,/cdn\.jsdelivr\.net|src=["'][^"']*game\.mjs/);
 for(const id of ['main-menu','local-setup','game-hud','game-canvas','local-play','start-local','return-menu','arena-select','character-select','mode-select'])assertId(html,id);
 assert.doesNotMatch(html,/launcher\.mjs/);
 assert.doesNotMatch(html,/unity-canvas|createUnityInstance/i);
});

test('Babylon and Rapier are pinned npm dependencies and bundled before dev/deploy',()=>{
 assert.equal(pkg.dependencies?.['@babylonjs/core'],'9.26.2');
 assert.equal(pkg.dependencies?.['@dimforge/rapier3d-compat'],'0.20.0');
 assert.equal(pkg.devDependencies?.esbuild,'0.28.2');
 assert.match(pkg.scripts?.['build:danao']||'',/build-danao\.mjs/);
 assert.match(pkg.scripts?.predev||'',/build:danao/);
 assert.match(pkg.scripts?.predeploy||'',/build:danao/);
 assert.ok(has('scripts/build-danao.mjs'),'missing Danao bundle build script');
 const build=read('scripts/build-danao.mjs');
 assert.match(build,/splitting:\s*true/);
 assert.match(build,/public\/games\/danao\/build/);
});

test('Danao source imports local package dependencies and uses fixed-step Rapier physics',()=>{
 assert.ok(has('public/games/danao/game.mjs'),'missing game.mjs');
 const game=read('public/games/danao/game.mjs');
 assert.match(game,/@babylonjs\/core/);
 assert.match(game,/@dimforge\/rapier3d-compat/);
 assert.doesNotMatch(game,/cdn\.jsdelivr\.net|https:\/\//);
 assert.match(game,/RAPIER\.init\s*\(/);
 assert.match(game,/FIXED_STEP\s*=\s*1\s*\/\s*60/);
 assert.match(game,/startLocalMatch/);
 assert.match(game,/stopMatch/);
 assert.match(game,/navigator\.getGamepads/);
 assert.match(game,/KeyW|ArrowUp/);
});

test('Danao data catalog keeps all planned arenas, eight characters and eight launch modes',()=>{
 assert.ok(has('public/games/danao/catalog.mjs'),'missing catalog.mjs');
 const catalog=read('public/games/danao/catalog.mjs');
 for(const name of arenaNames)assert.match(catalog,new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(catalog,/export const CHARACTERS\s*=\s*Object\.freeze\s*\(\s*\[/);
 assert.match(catalog,/export const MODES\s*=\s*Object\.freeze\s*\(\s*\[/);
 const characterCount=(catalog.match(/\bid:\s*'character-/g)||[]).length;
 const modeCount=(catalog.match(/\bid:\s*'mode-/g)||[]).length;
 assert.equal(characterCount,8);
 assert.equal(modeCount,8);
});

test('fighter runtime preserves 100 HP, attack cooldown and Rapier bodies',()=>{
 assert.ok(has('public/games/danao/fighter.mjs'),'missing fighter.mjs');
 const fighter=read('public/games/danao/fighter.mjs');
 assert.match(fighter,/hp:\s*100/);
 assert.match(fighter,/attackCooldown/);
 assert.match(fighter,/RigidBodyDesc\.dynamic/);
 assert.match(fighter,/setEnabledRotations\s*\(/);
 assert.match(fighter,/applyDamage/);
});

test('local round has CPU fallback and browser-native return-to-menu flow',()=>{
 assert.ok(has('public/games/danao/bot.mjs'),'missing bot.mjs');
 const bot=read('public/games/danao/bot.mjs');
 const game=read('public/games/danao/game.mjs');
 assert.match(bot,/createBotInput/);
 assert.match(game,/round-over|roundOver/i);
 assert.match(game,/return-menu/);
 assert.match(game,/stopMatch/);
});

test('Danao CSP keeps narrow wasm permission with no external engine host',()=>{
 const routes=read('src/game-routes.js');
 assert.match(routes,/wasm-unsafe-eval/);
 assert.doesNotMatch(routes,/cdn\.jsdelivr\.net/);
 assert.match(routes,/games\/danao/);
});
