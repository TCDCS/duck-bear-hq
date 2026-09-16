# Dǎnào / 打闹 — online, cloud saves and web release

## Status

The Dǎnào Unity project now has the online and cloud-save source layer needed for the Duck & Bear release. The game remains on `feature/danao-unity` until a real Unity 6 CI build has compiled and tested the project. Repository/server checks are running in GitHub Actions; Unity EditMode/PlayMode, WebGL and Windows build jobs are intentionally skipped when the repository does not have a Unity licence secret.

## Online rooms

Dǎnào uses its own Cloudflare Durable Objects. It does not share the Wacky Races room classes.

Public room entry points are:

- `GET /api/danao/version`
- `POST /api/danao/create`
- `POST /api/danao/join`
- `GET /api/danao/:code/socket?token=<room-pass>` for the WebSocket connection

Rooms support up to four players. The four-digit code is only a room locator. Each player receives a separate reconnect token and that token is never placed in an invitation link. Rooms expire after one hour. Create/join attempts and WebSocket traffic are bounded and rate-limited.

Browser requests are same-origin checked. Native Unity requests can omit the browser `Origin` header, which is required for the Windows build to use the same room service.

## Authority model

Cloudflare owns room membership, host identity, lobby settings, ready state, phase, reconnect tokens and message validation. The current Unity host owns the live PhysX simulation. This avoids trying to reproduce Unity physics inside a Worker.

Non-host players send compact input frames. The room forwards those inputs only to the current host. The host sends bounded snapshots at 15 Hz containing fighter transform, velocity, HP/elimination and objective state. The Durable Object retains the latest accepted snapshot.

If the host disconnects, authority transfers to the lowest connected player slot. The fight remains in progress. The promoted client applies the retained fighter and party-objective snapshot before it becomes simulation authority. If nobody remains connected, hosting is left vacant until a player reconnects.

Party objectives are included in the authoritative snapshot. Mango Grab sends scores and mango positions; Hot Bomb sends holder/timer state; King of the Ring sends accumulated hold times; Heist sends carrier, score and loot position. Clients do not advance these objectives independently.

## Local and cloud profile

Anonymous/offline play always uses a local `PlayerPrefs` JSON profile. The local profile contains gameplay toggles, audio/accessibility settings, selected character and costume, unlocked costumes/arenas, preferred mode/arena and aggregate match stats.

Signed-in Web players also use:

- `GET /api/danao/profile`
- `PUT /api/danao/profile`

Cloud records are owner-scoped in D1 and use an integer revision. A stale write receives `409` plus the current server copy. The Unity client merges unlocks/counters, retries once, and keeps the local copy dirty if cloud saving is unavailable. A cloud failure never blocks starting or finishing a match.

The schema is added by `migrations/0004_danao_profiles.sql`. Dǎnào profile APIs do not expose orders, points, memories, media or other private account data.

The WebGL build can use the existing Duck & Bear sign-in cookie. The native Windows build currently keeps the same local profile but does not yet have a desktop account-link flow, so cross-device cloud sync for the standalone build must not be described as complete until a secure device-link method is added.

## Website release

`/games/danao/` is the launch page. It checks WebGL 2, controller state and build availability before loading Unity. The games hub links to it using the Chinese title `打闹` and the romanised name `Dǎnào`.

Unity Web build files are not committed to Git. The release manifest points at `/game-builds/danao/web/current/*`. Those requests run through the Worker and are served from the existing R2 bucket under `danao/web/current/`.

The Unity workflow is prepared to produce both WebGL and Windows x64 artifacts. On `main`, if Unity and Cloudflare secrets are present, the WebGL output is copied to R2. Generated Unity `Library`, temporary state and build folders remain ignored.

## Verification

Repository verification command:

```sh
node --test tests/danao-*.test.mjs
```

The GitHub `Danao Unity` workflow also runs Worker syntax checks. Current source/server tests cover room capacity, token redaction, ready/start rules, host-only authority, snapshot bounds/sequences, host transfer, native-vs-browser gateway behaviour, profile validation/conflicts, R2 build routing, website launcher contracts and the Unity online/cloud source contracts.

Unity compilation, Unity Test Runner, PhysX feel, real controller hardware and generated Web/Windows binaries require a licensed Unity 6 runner. Until that runner succeeds, the source should be described as implemented but the final binary build should not be described as verified or released.
