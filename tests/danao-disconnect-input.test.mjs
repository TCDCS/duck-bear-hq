import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const bridge=fs.readFileSync(path.join(root,'unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs'),'utf8');

test('host neutralises a disconnected fighter instead of replaying their last movement forever',()=>{
  assert.match(bridge,/OnRoomChanged\(RoomDto room\)[\s\S]{0,800}NeutraliseDisconnectedPlayers\(room\)/);
  assert.match(bridge,/private\s+void\s+NeutraliseDisconnectedPlayers\(RoomDto room\)/);
  assert.match(bridge,/!player\.connected/);
  assert.match(bridge,/new FighterInput\(Vector2\.zero,false,false,false,false,false,false,false\)/);
});
