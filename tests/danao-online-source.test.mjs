import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));

const online=[
 'unity/danao/Assets/Danao/Plugins/WebGL/DanaoWebSocket.jslib',
 'unity/danao/Assets/Danao/Runtime/Online/IOnlineSocket.cs',
 'unity/danao/Assets/Danao/Runtime/Online/WebGlSocket.cs',
 'unity/danao/Assets/Danao/Runtime/Online/DesktopSocket.cs',
 'unity/danao/Assets/Danao/Runtime/Online/OnlineProtocol.cs',
 'unity/danao/Assets/Danao/Runtime/Online/DanaoRoomClient.cs',
 'unity/danao/Assets/Danao/Runtime/Online/NetworkSnapshot.cs',
 'unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs',
 'unity/danao/Assets/Danao/Runtime/Save/DanaoProfile.cs',
 'unity/danao/Assets/Danao/Runtime/Save/DanaoSaveService.cs'
];

test('Unity Danao has WebGL and desktop online transports',()=>{
 for(const rel of online) assert.ok(exists(rel),`missing ${rel}`);
 assert.match(read(online[0]),/WebSocket/);
 assert.match(read(online[2]),/DllImport\("__Internal"\)/);
 assert.match(read(online[3]),/ClientWebSocket/);
});

test('room client uses dedicated Danao APIs and never puts the room pass in invites',()=>{
 const c=read('unity/danao/Assets/Danao/Runtime/Online/DanaoRoomClient.cs');
 assert.match(c,/\/api\/danao\/create/);
 assert.match(c,/\/api\/danao\/join/);
 assert.match(c,/\/api\/danao\//);
 assert.match(c,/InviteUrl/);
 assert.doesNotMatch(c,/InviteUrl[^\n]*token/i);
});

test('network bridge sends bounded host snapshots and non-host input frames',()=>{
 const b=read('unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs');
 assert.match(b,/SendInput/);
 assert.match(b,/SendHostState/);
 assert.match(b,/SnapshotReceived/);
 assert.match(b,/15f|20f/);
});

test('save service keeps local saves independent from cloud availability',()=>{
 const s=read('unity/danao/Assets/Danao/Runtime/Save/DanaoSaveService.cs');
 assert.match(s,/PlayerPrefs/);
 assert.match(s,/\/api\/public\/session/);
 assert.match(s,/\/api\/danao\/profile/);
 assert.match(s,/409/);
});
