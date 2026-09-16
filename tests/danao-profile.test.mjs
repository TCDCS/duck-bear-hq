import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultProfile,normaliseProfile,ProfileError} from '../src/danao/profile.mjs';

test('default Danao profile is bounded and starts with gameplay defaults',()=>{const p=defaultProfile();assert.equal(p.version,1);assert.equal(p.settings.healthDamage,true);assert.equal(p.settings.visibleBruising,true);assert.equal(p.settings.arenaHazards,true);assert.equal(p.stats.matches,0);});
test('profile validation removes duplicate unlocks and rejects unknown IDs',()=>{const p=normaliseProfile({...defaultProfile(),unlockedCostumes:['Arcade','Arcade','KungFu']});assert.deepEqual(p.unlockedCostumes,['Arcade','KungFu']);assert.throws(()=>normaliseProfile({...defaultProfile(),selectedCharacter:'Nobody'}),ProfileError);});
test('profile stats are safe non-negative integers',()=>{assert.throws(()=>normaliseProfile({...defaultProfile(),stats:{matches:-1,wins:0,knockouts:0}}),ProfileError);});
test('profile accepts the Unity KingOfRing preference used by local saves',()=>{const p=normaliseProfile({...defaultProfile(),preferredMode:'KingOfRing'});assert.equal(p.preferredMode,'KingOfRing');});
