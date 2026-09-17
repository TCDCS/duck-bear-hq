import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const hazards=fs.readFileSync(path.join(root,'unity/danao/Assets/Danao/Runtime/Arenas/ArenaHazards.cs'),'utf8');

test('non-host clients animate arena hazard props while only the host applies hazard physics',()=>{
  assert.doesNotMatch(hazards,/if\s*\(\s*!SimulationAuthority\s*\|\|/);
  assert.match(hazards,/CraneHook:[\s\S]{0,220}_prop\.localPosition[\s\S]{0,180}if\s*\(SimulationAuthority\)\s*ContactSphere/);
  assert.match(hazards,/PassingTrain:[\s\S]{0,220}_prop\.localPosition[\s\S]{0,180}if\s*\(SimulationAuthority\)\s*ContactBox/);
  assert.match(hazards,/ConveyorPuncher:[\s\S]{0,220}_prop\.localPosition[\s\S]{0,260}if\s*\(SimulationAuthority\)/);
});
