# Wacky Races v3 — Duck & Bear

Built and checked on 12 September 2026. This is a single-player browser game with computer opponents. It is an original, stylised arcade game, not a recreation of the Wacky Races television series or a photorealistic simulator.

## Website integration

Safari & Fun → Games → Wacky Races → Play opens `/games/wacky-races/?play=1` as its own full-page race. The old `/games/proper-karted/` path remains supported. Pause, menu and results provide return links to Games.

The existing Duck & Bear session check still protects the game and its portrait assets. Game responses are private/no-store. The service worker does not cache game responses. No account, points, shop, order, media, database schema or main application code is changed. Existing profile names, colours and photos stay compatible. New records are separated by v3, vehicle, mode, difficulty and steering assistance.

## Circuits and vehicles

The six circuits are London - Westminster Wobble, London - Camden Caper, London - Docklands Dash, London - Hyde Park Hustle, London - Regent Street Rush, and Dublin - Liffey Lunacy. The Wacky Cup runs all six; quick race and three-lap time trial remain available. These are fictional layouts inspired by the cities, not accurate street maps.

Dublin includes the Spire, GPO, Georgian doors, Temple Bar, Ha'penny Bridge, Samuel Beckett Bridge, Poolbeg chimneys and Liffey-inspired quays. Shamrocks, sheep, buskers, a giant green hat and signs such as “Grand stretch in the lead” add the humour.

Choose a racing kart, police/Garda car, ambulance or double-decker. Service vehicles also appear as moving traffic in races and the cup. London and Dublin have different fictional liveries; London uses MPH and Dublin KM/H. No official police crests or operator logos are used. The supplied cast and portraits are retained.

## Handling, recovery and graphics

Custom road-relative arcade physics replace direct sideways movement: momentum, grip, steering response, braking, drag, off-road slowdown, drift boosts, mass-based vehicle collisions, and damped chassis pitch/roll/heave. Simulation uses substeps no larger than 1/120 second. This is not a general-purpose six-degree-of-freedom rigid-body engine.

Holding the accelerator while stuck triggers automatic recovery after roughly 1.6 seconds. Rescue or R also resets the vehicle onto a clear lane facing forward. Recovery does not increase course progress or grant a lap. Idle vehicles and braking do not trigger unwanted recovery.

Rounded vehicle bodies, smooth surface normals, brighter lighting and foliage, textured roads/buildings, procedural water/sky and static scenery shadows improve the native WebGL renderer. A lower-detail Canvas renderer keeps the game playable without WebGL. The graphics remain stylised; reference-image parity or award-level finish is not claimed.

## Bonuses and hazards

Mangoes add two snack points and a short turbo. Chocolate ice creams add one point and a shield. Blueberries add three points. Strawberries add one point and restore grip. Up to ten snack points give a small speed bonus. Mystery boxes supply mango turbo, chocolate shell, a pizza skid or a whiskey spill. Pizza slices and spilled bottles also appear as track hazards. There is no drinking mechanic. Time trials have no items or traffic.

## Mobile controls

Pause → Controls & sound → Enable tilt steering. Allow motion access when requested, hold the phone comfortably, then choose Calibrate centre. Sensitivity is adjustable. Buttons remain available and override tilt while held. Missing, denied or stale readings fall back safely to buttons. Portrait and both landscape orientation calculations are covered by tests. No motion data is uploaded or stored. Real-phone sensor feel remains to be checked.

## Music and sound

Six distinct original synthesised circuit scores and original effects are included: engine, tyres, impacts, pickups, recovery, lap cues and nearby sirens. Music and effects have independent volume controls. Sound is activated after user interaction and stops when paused.

Optional “Stream licensed recordings” plays the catalogue selections below from Incompetech. It is off by default, requires internet access and exposes a normal media request to the publisher. Unavailable or blocked recordings fall back to the built-in score. Recording files are not bundled or downloaded by this update. Live streamed playback has not been verified in this environment.

| Circuit | Recording by Kevin MacLeod | Source |
| --- | --- | --- |
| Westminster | Batty McFaddin | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200003 |
| Camden | Sneaky Snitch | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100772 |
| Docklands | Cipher | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100844 |
| Hyde Park | Carefree | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037 |
| Regent Street | Vivacity | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400052 |
| Dublin | Celtic Impulse | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100297 |

Recordings: Kevin MacLeod (incompetech.com), Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/. Attribution and source links are included in the game. Recordings are looped, not remixed. Keep these credits if redistributing. No Nintendo or television-series music, effects, characters or logos are included.

## Verification and limits

`node --test tests/*.cjs tests/*.mjs` passed 65 tests: 17 physics, 8 motion, 5 scene, 5 audio and 30 website integration checks. Integration uses mocked sessions/database and checks routing, access denial, failures, no-store headers, sensor/music policies, legacy links and imported assets.

33 local Chromium browser checks passed, including all six cup rounds, loaded portraits, Mulan driving a bus, directional input, manual recovery, pause, settings, audio activation, credits, touch cancellation and mobile layouts. The test browser could not initialise WebGL and used Compatibility 3D. The fixture used deterministic frame advancement; long simulation segments disabled drawing. Browser checks are not a live deployment or device-performance test. The local fixture used larger versions of the same supplied portraits; the website's original thumbnail asset is unchanged.

A separate off-screen EGL/GLES test compiled and linked the enhanced game shaders, rendered the Dublin scene (344,029 static triangles) and returned GL error 0. The off-screen preview is not a native browser GPU or physical-phone benchmark.

Outstanding release checks: hosted Worker build/deployment, authenticated live play, native browser GPU performance, Android/iPhone tilt calibration and sustained frame rate, and optional recording playback. No new paid service, cloud engine or game-library dependency is required by this implementation. Additional polish needs playtesting and art/handling iteration, not a claim of award readiness.
