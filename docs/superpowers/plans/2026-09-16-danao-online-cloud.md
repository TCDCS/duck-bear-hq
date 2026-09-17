# Dǎnào Online + Cloud Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four-player online rooms and signed-in cloud profiles to the Unity Dǎnào project using the existing Duck & Bear Cloudflare Worker/Durable Object/D1 stack.

**Architecture:** Dǎnào gets separate `DanaoDirectory` and `DanaoRoom` Durable Object classes so Wacky Races stays isolated. The Worker is authoritative for membership, lobby settings, host identity, phase, rate limits and reconnect tokens; the connected Unity host is authoritative for PhysX simulation because reproducing Unity PhysX in a Worker would create two inconsistent physics engines. Non-host clients send compact input frames to the room, the room forwards them to the host, and the host broadcasts bounded state snapshots through the room. The latest host snapshot is retained so host transfer can resume from a known state. Signed-in cloud data is a single owner-scoped revisioned D1 record for settings, unlocks, cosmetic choices and aggregate stats; anonymous play keeps local PlayerPrefs data.

**Tech Stack:** Cloudflare Workers, Durable Objects, WebSockets, D1, Node tests, Unity 6, UnityWebRequest, browser `.jslib` WebSocket bridge for WebGL, `ClientWebSocket` for Windows.

**Spec:** `docs/superpowers/specs/2026-09-16-danao-unity-design.md`

## Global Constraints

- Online capacity: 4 players.
- Four-digit room codes are locators, not passwords.
- Room passes are UUID tokens and must never appear in invitation links.
- Rooms expire after one hour.
- Create/join and WebSocket traffic are rate-limited.
- Host-only messages: setup, start, authoritative state, result and rematch.
- Non-host clients never directly author HP/results for other clients.
- Health Damage, Visible Bruising, Arena Hazards, mode, arena, character and costume choices are represented in public room state.
- The latest accepted host snapshot must be bounded in size and sequence-monotonic.
- Cloud writes require an active signed-in Duck & Bear account, same-origin mutation, revision checks and no account/private data in public game responses.
- Wacky Races Durable Objects and Mango profiles remain unchanged.

---

### Task 1: Pure Dǎnào room state

**Files:**
- Create: `src/danao/room-state.mjs`
- Test: `tests/danao-room-state.test.mjs`

**Interfaces:**
- `makeRoom(code,data,now)`
- `joinRoom(room,data,now)`
- `authenticate(room,token,now)`
- `connect(room,id,now)` / `disconnect(room,id,now)` / `leaveRoom(room,id,now)`
- `setReady(room,id,value)`
- `configureRoom(room,id,data)`
- `startRoom(room,id,now)`
- `setInput(room,id,data,now)`
- `setHostState(room,id,data,now)`
- `finishRoom(room,id,data,now)`
- `rematch(room,id)`
- `publicRoom(room)` / `publicSnapshot(room)` / `persistRoom(room)` / `restoreRoom(saved)`

- [ ] Write failing tests for four-player capacity, host-only setup/start/state/result, ready gate, monotonic input/state sequences, bounded snapshots, host transfer and token redaction.
- [ ] Implement the pure state machine with no Worker-specific APIs except standard `crypto`.
- [ ] Run `node --test tests/danao-room-state.test.mjs` and require all tests to pass.

### Task 2: Durable Objects and public gateway

**Files:**
- Create: `src/danao/gateway.mjs`
- Create: `src/danao/durable.mjs`
- Modify: `src/game-routes.js`
- Modify: `src/worker-games.js`
- Modify: `wrangler.jsonc`
- Test: `tests/danao-gateway.test.mjs`

**Interfaces:**
- Public REST: `GET /api/danao/version`, `POST /api/danao/create`, `POST /api/danao/join`.
- WebSocket: `GET /api/danao/:code/socket?token=<uuid>`.
- Durable Objects: `DanaoDirectory`, `DanaoRoom`.

- [ ] Test same-origin enforcement, JSON/body limits, exact four-digit join validation and graceful unavailable-room responses.
- [ ] Implement a separate directory with per-IP-hash create/join windows and one-hour room reservations.
- [ ] Implement room WebSocket hibernation, reconnect attachments, host transfer, targeted input forwarding to the host, authoritative snapshot broadcast, result/rematch and bounded message/rate limits.
- [ ] Export both classes from `worker-games.js`, route `/api/danao/*` in `game-routes.js`, and add separate Durable Object bindings/migration tag in Wrangler.

### Task 3: Revisioned Dǎnào cloud profile

**Files:**
- Create: `migrations/0004_danao_profiles.sql`
- Create: `src/danao/profile.mjs`
- Create: `src/danao/api.mjs`
- Modify: `src/index.js`
- Test: `tests/danao-profile.test.mjs`
- Test: `tests/danao-api.test.mjs`

**Interfaces:**
- `GET /api/danao/profile`
- `PUT /api/danao/profile` with `{revision,profile}`.

- [ ] Define the D1 table with `owner_user_id` primary key, `profile_json`, revision and timestamps plus a dedicated save-rate table.
- [ ] Validate a bounded profile schema containing settings, unlocked costume/arena IDs, selected character/costume, aggregate matches/wins and version.
- [ ] Require same-origin active-user writes and optimistic revision matching; return current profile on 409 conflict.
- [ ] Add the authenticated route in `src/index.js` without exposing private account data.

### Task 4: Unity online transport and room client

**Files:**
- Create: `unity/danao/Assets/Danao/Plugins/WebGL/DanaoWebSocket.jslib`
- Create: `unity/danao/Assets/Danao/Runtime/Online/IOnlineSocket.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Online/WebGlSocket.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Online/DesktopSocket.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Online/DanaoRoomClient.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Online/OnlineProtocol.cs`
- Test: extend `tests/danao-source.test.mjs`

**Interfaces:**
- `DanaoRoomClient.CreateRoom(...)`, `JoinRoom(...)`, `Connect()`, `SendReady`, `SendSetup`, `SendInput`, `SendHostState`, `SendResult`, `SendRematch`, `Leave`.
- Events: `RoomChanged`, `InputReceived`, `SnapshotReceived`, `HostChanged`, `Error`.

- [ ] Add a browser WebSocket bridge for WebGL and `ClientWebSocket` standalone transport behind one interface.
- [ ] Use `UnityWebRequest` for create/join and validate all server payloads before use.
- [ ] Keep tokens in runtime memory/PlayerPrefs reconnect storage only; invitation URLs contain only the four-digit code.
- [ ] Add source tests for WebGL bridge, desktop socket, `/api/danao` paths and 4-player capacity.

### Task 5: Host-authoritative Unity online match bridge

**Files:**
- Create: `unity/danao/Assets/Danao/Runtime/Online/NetworkMatchBridge.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Online/NetworkSnapshot.cs`
- Modify: `unity/danao/Assets/Danao/Runtime/DanaoGame.cs`
- Modify: `unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs`

- [ ] Add Online Play/Create Room/Join Room menu flow with room code, ready state, host-only setup/start and reconnect status.
- [ ] Non-hosts send input frames at a bounded rate; host applies remote inputs to the existing fighter controllers.
- [ ] Host serialises fighter transforms, linear/angular velocity, HP/elimination, carried weapon IDs and match/objective phase into bounded snapshots at 15–20 Hz.
- [ ] Non-hosts interpolate remote snapshots and never decide match winners/other-player HP locally.
- [ ] On host transfer, the promoted client applies the latest server snapshot before becoming simulation authority.

### Task 6: Local + cloud profile client

**Files:**
- Create: `unity/danao/Assets/Danao/Runtime/Save/DanaoProfile.cs`
- Create: `unity/danao/Assets/Danao/Runtime/Save/DanaoSaveService.cs`
- Modify: `unity/danao/Assets/Danao/Runtime/DanaoGame.cs`
- Modify: `unity/danao/Assets/Danao/Runtime/UI/ArcadeUi.cs`

- [ ] Store the full profile locally as bounded JSON in PlayerPrefs so anonymous/offline play always works.
- [ ] Check `/api/public/session`; when signed in, GET the cloud profile and merge by revision/time-safe counters and unioned unlocks.
- [ ] PUT cloud changes with revision; on 409 merge the returned current profile and retry once, then retain a local dirty flag for later retry.
- [ ] Never let cloud-save failure block a match.

### Task 7: Verification and documentation

**Files:**
- Create: `docs/danao-online-cloud.md`
- Modify: `README.md`

- [ ] Run Dǎnào room/profile/API Node tests plus repository `npm test` where available.
- [ ] Check Wrangler dry configuration/schema checks without deploying.
- [ ] Document the host-authority trade-off, reconnect behaviour, profile contents and Unity-runner verification limits accurately.
