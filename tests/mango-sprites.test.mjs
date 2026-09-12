import test from 'node:test';import assert from 'node:assert/strict';
import {poseFor,ANIMATIONS,CHARACTER_IDS} from '../public/games/mango-mayhem/render/sprites.mjs';
test('all eight animation poses remain finite across the clip',()=>{for(const anim of ANIMATIONS)for(let t=0;t<200;t++){const p=poseFor(anim,t,t*5);for(const key of ['bob','leftLeg','rightLeg','leftArm','rightArm','squash'])assert.ok(Number.isFinite(p[key]),`${anim}:${key}`);}});
test('all requested illustrated helpers and both parents are included',()=>{assert.deepEqual(CHARACTER_IDS,['guannan','stephen','gaby','zachary','sara','mulan','mum','dad']);});
