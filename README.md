# Duck & Bear

Public website and Wacky Races, with the existing private account behind Sign in.

**Website:** https://duck-bear-hq.zachary-chambers2.workers.dev/

**Play:** https://duck-bear-hq.zachary-chambers2.workers.dev/games/wacky-races/

The homepage, gift catalogue and game do not require an account. The top-right Sign in opens the private account for orders, points, memories and administration. The repository remains private; making the website public does not require exposing its source or bootstrap material.

## Wacky Races

Opening the game shows setup first, even from old `?play=1` links. Choose your level, vehicle, driver and settings, then press Start race. The left Race order panel shows first to last and can be collapsed. Seven vehicles maximum race at once; extra moving traffic is no longer added. See `docs/wacky-races-v4.1.md`.

Six fictional city circuits: London - Westminster Wobble, London - Camden Caper, London - Docklands Dash, London - Hyde Park Hustle, London - Regent Street Rush and Dublin - Liffey Lunacy. Race solo, play the six-track cup, try time trials or race friends online.

The cast uses square illustrated portraits, not the original photographs. Racing karts, police/Garda cars, ambulances and buses have country-themed liveries. Mangoes, chocolate ice cream, blueberries and strawberries provide bonuses; pizza and whiskey spills are hazards. Arcade handling includes grip, momentum, drifting, collisions and recovery. Keyboard, touch, gamepad and optional motion steering are supported.

For friends: choose **Play with friends**, create a room and share the four-digit code or the invitation link. Friends choose their driver, join and mark ready. The host starts the race. Share is available in the lobby and game Settings, with a copy-link fallback. Up to seven human drivers can join; computer drivers fill spare seats. The server owns positions, laps and results. Menus do not pause the other players. Temporary connection loss reserves the player slot; hosting passes to another connected player when needed.

Codes are convenient room locators, not private passwords. The host can lock the lobby once the group is present. Rooms expire after one hour. Invitations contain a code, never a player's reconnect pass. Room creation/join attempts and WebSocket messages are rate-limited.

## Public and private data

`src/game-routes.js` exposes only the game, the explicit public product catalogue and a signed-in boolean. Original account API and private R2 media handlers remain in `src/index.js`. No private bootstrap response, orders, points or memories are requested by the public homepage. Game API traffic, private API traffic and private media are excluded from service-worker caches.

Only use names or locally added images that you have permission to use. New local driver photos are not sent to multiplayer rooms. The game has no public chat and no online account leaderboard.

## Deployment and automatic checks

Existing route: GitHub `main` → Cloudflare Workers Builds → Worker, static assets, D1/R2 and the two SQLite Durable Object classes. Keep the existing resource bindings; no additional hosting provider is required.

`npm run deploy` runs the unit checks, deploys the Worker, applies the existing D1 migrations and deploys again. Do not rerun account bootstrap on an established site.

The GitHub regression workflow runs `npm test`, source/migration checks, a Wrangler dry build, native browser tests and seven separate WebSocket clients against the local Workers runtime. On production pushes it verifies the published file hashes and repeats the multiplayer/browser acceptance checks against the live website. Reports and real screenshots are retained as workflow artifacts for seven days. The seven-client test covers full/locked-room rejection without disconnecting the existing racers, independent inputs, authoritative shared updates and host transfer.

Useful commands for maintenance:

```sh
npm ci
npm test
npm run check
npm run dev
```

For the native browser suite, install Python Playwright and Chromium and set `BASE_URL` to the running site. The optional restricted fixture is not a substitute for the normal live transport check.

## Audio and performance

The built-in procedural music and effects do not need a music service. Optional external recordings are off by default, have in-game attribution and fall back to the original score if unavailable. Keep the music credits when redistributing.

The game is stylised browser 3D, not an Unreal Engine or photorealistic game. Automated Chromium uses WebGL through its software GPU. Mobile viewport and simulated sensor tests do not certify physical-device tilt feel, native share-sheet behaviour or frame rate on every handset.
