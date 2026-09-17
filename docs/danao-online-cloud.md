# Dǎnào / 打闹 — online, cloud saves and web release

## Status

The Dǎnào Unity project has the online and cloud-save source layer needed for the Duck & Bear browser release. Repository/server checks run in GitHub Actions, and production WebGL builds are produced through Unity Build Automation.

Dǎnào is browser-only. Windows Micro may be used as the Unity cloud worker that compiles WebGL because it is cheaper than the previous Mac worker, but no Windows application is produced or published.

## Online rooms

Dǎnào uses its own Cloudflare Durable Objects. It does not share the Wacky Races room classes.

Public room entry points are:

- `GET /api/danao/version`
- `POST /api/danao/create`
- `POST /api/danao/join`
- `GET /api/danao/:code/socket?token=<room-pass>` for the WebSocket connection

Rooms support up to four players. The four-digit code is only a room locator. Each player receives a separate reconnect token and that token is never placed in an invitation link. Rooms expire after one hour. Create/join attempts and WebSocket traffic are bounded and rate-limited.

Browser requests are same-origin checked. The WebGL client uses the same-origin Dǎnào room service.

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

The WebGL build can use the existing Duck & Bear sign-in cookie for cloud profile sync.

## Website release

`/games/danao/` is the launch page. It checks WebGL 2, controller state and build availability before loading Unity. The games hub links to it using the Chinese title `打闹` and the romanised name `Dǎnào`.

Unity Web build files are not committed to Git. The release manifest points at `/game-builds/danao/web/current/*`. Those requests run through the Worker and are served from the existing R2 bucket under `danao/web/current/`.

The Unity workflows produce and monitor only WebGL artifacts. On `main`, the verified WebGL output is published to the current R2 channel. Generated Unity `Library`, temporary state and build folders remain ignored.

The production release workflow also verifies that the Unity Build Automation target uses Windows Micro before it is allowed to start a build and enforces the Dǎnào monthly Windows-minute safety guard.

## Verification

Repository verification command:

```sh
node --test tests/danao-*.test.mjs
```

The GitHub `Danao Unity` workflow also runs Worker syntax checks. Current source/server tests cover room capacity, token redaction, ready/start rules, host-only authority, snapshot bounds/sequences, host transfer, gateway behaviour, profile validation/conflicts, R2 build routing, website launcher contracts and the Unity online/cloud source contracts.

Production verification requires the Unity WebGL build to compile successfully, publish through the authenticated release path, and then load correctly through `/games/danao/` in a real browser.
