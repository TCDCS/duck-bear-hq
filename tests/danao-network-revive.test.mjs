import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const bridge=fs.readFileSync(path.join(root,'unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs'),'utf8');

test('non-host remote fighters stay suppressed and kinematic after a network revive snapshot',()=>{
  assert.match(bridge,/ApplyNetworkState\(state\.hp,state\.eliminated\)[\s\S]{0,300}if\s*\(!\s*_isHost\s*&&\s*fighter\.Slot\s*!=\s*_localSlot\s*\)\s*\{[\s\S]{0,200}SetControlSuppressed\(true\)[\s\S]{0,120}Body\.isKinematic\s*=\s*true/);
});
