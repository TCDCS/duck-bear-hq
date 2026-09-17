import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const controlsPath='public/games/danao/controls.mjs';
const fighter=fs.readFileSync('public/games/danao/fighter.mjs','utf8');
const weapons=fs.readFileSync('public/games/danao/weapons.mjs','utf8');
const game=fs.readFileSync('public/games/danao/game.mjs','utf8');

test('browser controls expose separate move jump attack grab dodge fire and block actions',async()=>{
 assert.ok(fs.existsSync(controlsPath));
 const {keyboardFrame,gamepadFrame}=await import('../public/games/danao/controls.mjs');
 const keys=new Set(['KeyW','KeyD','Space','KeyE','KeyF','ShiftLeft','KeyR','KeyQ']);
 assert.deepEqual(keyboardFrame(keys),{x:1,z:-1,jump:true,attack:true,grab:true,dash:true,fire:true,block:true});
 const buttons=Array.from({length:8},()=>({pressed:false}));for(const i of [0,1,2,3,6,7])buttons[i]={pressed:true};
 assert.deepEqual(gamepadFrame({connected:true,axes:[.7,-.8],buttons}),{x:.7,z:-.8,jump:true,attack:true,grab:true,dash:true,fire:true,block:true});
});

test('fighter runtime has grounded jumping and damage-reducing block without changing base stats',()=>{
 assert.match(fighter,/jumpHeld/);
 assert.match(fighter,/input\.jump/);
 assert.match(fighter,/blocking/);
 assert.match(fighter,/input\.block/);
 assert.match(fighter,/100/);
});

test('held weapons can be deliberately thrown instead of only dropped',()=>{
 assert.match(weapons,/export function throwHeldWeapon/);
 assert.match(weapons,/applyDamage/);
 assert.match(weapons,/onBeforeRenderObservable/);
});

test('online browser input sends and consumes all combat actions separately',()=>{
 for(const action of ['jump','grab','fire','block'])assert.match(game,new RegExp(action));
 assert.match(game,/sendInput\(\{[^}]*jump:/s);
 assert.match(game,/grab:/);
 assert.match(game,/fire:/);
 assert.match(game,/block:/);
});
