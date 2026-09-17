import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const has=rel=>fs.existsSync(path.join(root,rel));

const arenaNames=['Wrestling Arena','Dublin Docks','London Underground','Mango Market','Temple Courtyard','Sichuan Tea House','Ice Festival','House Party','Toy Factory','Cruise Ship','Mad Circus'];

function assertId(html,id){assert.match(html,new RegExp(`id=["']${id}["']`),`missing #${id}`);}

test('Danao page is a native Babylon browser shell rather than a Unity startup shell',()=>{
 const html=read('public/games/danao/index.html');
 assert.match(html,/打闹/);
 assert.match(html,/Dǎnào/);
 assert.match(html,/type=["']module["'][^>]+game\.mjs|game\.mjs[^>]+type=["']module["']/);
 for(const id of ['main-menu','local-setup','game-hud','game-canvas','local-play','start-local','return-menu','arena-select','character-select','mode-select'])assertId(html,id);
 assert.doesNotMatch(html,/launcher\.mjs/);
 assert.doesNotMatch(html,/unity-canvas|createUnityInstance/i);
});

test('Babylon and Rapier runtime is pinned and uses fixed-step physics',()=>{
 assert.ok(has('public/games/danao/game.mjs'),'missing game.mjs');
 const game=read('public/games/danao/game.mjs');
 assert.match(game,/@babylonjs\/core@9\.26\.2/);
 assert.match(game,/@dimforge\/rapier3d-compat@0\.20\.0/);
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

test('Danao-only CSP allows pinned engine modules while retaining narrow wasm permission',()=>{
 const routes=read('src/game-routes.js');
 assert.match(routes,/wasm-unsafe-eval/);
 assert.match(routes,/cdn\.jsdelivr\.net/);
 assert.match(routes,/games\/danao/);
});
